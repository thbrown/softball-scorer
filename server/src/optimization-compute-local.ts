import fs from 'fs';
import https from 'https';
import logger from './logger';
import SharedLib from 'shared-lib';
import * as configAccessor from './config-accessor';
import {
  DatabaseService,
  EmailService,
  OptimizationComputeService,
} from './service-types';
import { spawn } from 'child_process';

const ROOT = __dirname + '/optimizations-temp';
const STATS_PATH = ROOT + '/stats';
const RESULTS_PATH = ROOT + '/results';
const CTRL_FLAGS = ROOT + '/ctrl';

const JAR_FILE_PATH = ROOT + '/softball-sim.jar';

export default class OptimizationComputeLocal
  implements OptimizationComputeService
{
  databaseCalls: DatabaseService;
  emailService: EmailService;

  constructor(databaseCalls: DatabaseService, emailService: EmailService) {
    this.databaseCalls = databaseCalls;
    this.emailService = emailService;

    // Make sure appropriate directories exist
    if (!fs.existsSync(ROOT)) {
      fs.mkdirSync(ROOT);
      logger.log('sys', 'Creating directory', ROOT);
    }
    if (!fs.existsSync(STATS_PATH)) {
      fs.mkdirSync(STATS_PATH);
      logger.log('sys', 'Creating directory', STATS_PATH);
    }
    if (!fs.existsSync(RESULTS_PATH)) {
      fs.mkdirSync(RESULTS_PATH);
      logger.log('sys', 'Creating directory', RESULTS_PATH);
    }
    if (!fs.existsSync(CTRL_FLAGS)) {
      fs.mkdirSync(CTRL_FLAGS);
      logger.log('sys', 'Creating directory', CTRL_FLAGS);
    }

    logger.log('sys', 'Creating directories for local compute complete.', ROOT);
  }

  download = function (url: string, dest: string, skipExistenceCheck: boolean) {
    if (fs.existsSync(JAR_FILE_PATH) && !skipExistenceCheck) {
      logger.log(
        'sys',
        'Optimization jar already exists on file system. Will not download.'
      );
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https
        .get(
          url,
          async function (response: any) {
            if (response.statusCode == 302) {
              logger.log('', 'Handling redirect');
              try {
                await this.download(response.headers.location, dest, true); // TODO: avoid infinite loop here
                return resolve();
              } catch (error) {
                return reject();
              }
            } else {
              response.pipe(file);
              file.on('finish', function () {
                file.close(function () {
                  logger.log(
                    'sys',
                    'Optimizations Jar successfully downloaded'
                  );
                  resolve();
                });
              });
            }
          }.bind(this)
        )
        .on('error', function (err) {
          logger.log('', 'Error downloading jar ' + err);
          fs.unlink(dest, () => void 0); // Delete the file async. (But we don't check the result)
          reject(err.message);
        });
    });
  };

  javaversion = function () {
    return new Promise((resolve, reject) => {
      const s = spawn('java', ['-version']);
      s.on('error', function (err) {
        return reject(err);
      });
      s.stderr.on('data', function (data) {
        data = data.toString().split('\n')[0];
        const javaVersion = /(java|openjdk) version/.test(data)
          ? data.split(' ')[2].replace(/"/g, '')
          : false;

        if (javaVersion !== false) {
          return resolve(javaVersion);
        } else {
          return reject(
            'WARNING: Java is not installed or is not on the PATH! Optimizations will not work'
          );
        }
      });
    });
  };

  doCommonProcessing = async function (
    accountId: string,
    optimizationId: string,
    stats,
    options
  ) {
    // Write to stats file system
    fs.writeFileSync(STATS_PATH + '/' + optimizationId, JSON.stringify(stats));

    // Clear any ctrl flags and options files
    if (fs.existsSync(CTRL_FLAGS + '/' + optimizationId)) {
      fs.unlinkSync(CTRL_FLAGS + '/' + optimizationId);
    }

    // Clear any results flags and options files
    if (fs.existsSync(RESULTS_PATH + '/' + optimizationId)) {
      fs.unlinkSync(RESULTS_PATH + '/' + optimizationId);
    }

    // Get the optimization jar if necessary
    await this.download(
      'https://github.com/thbrown/softball-sim/releases/download/v1.3/softball-sim.jar',
      JAR_FILE_PATH
    );

    // Verify java version
    const javaVersion = await this.javaversion();
    logger.log(accountId, 'Java version is ' + javaVersion);

    const versionArray = javaVersion.split('.');
    if (versionArray[0] < 11) {
      logger.warn(
        accountId,
        `WARNING: installed version of Java (${javaVersion}) may not be compatible with jar build`
      );
    }

    // Convert options map to an array of args that can be passed to the cli
    const optionsArray: any[] = [];
    for (const option in options) {
      if (options[option] === false) {
        // Add nothing
      } else if (options[option] === true) {
        // Boolean flag, add only the flag
        optionsArray.push(option);
      } else {
        // Value flag, add the flag and the value
        optionsArray.push(option);
        optionsArray.push(options[option]);
      }
    }
    return optionsArray;
  };

  async start(accountId: string, optimizationId: string, stats, options) {
    // Add additional flags to json body
    options['-u'] = configAccessor.getUpdateUrl();
    options['-b'] = JSON.stringify({
      optimizationId: optimizationId,
      accountId: accountId,
      // apiKey: this?.configParams?.apiKey, // What is this?
    }); // stuff (which is the account id in our case)

    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Starting local optimization');

    const optionsArray = await this.doCommonProcessing(
      accountId,
      optimizationId,
      stats,
      options
    );

    logger.log(accountId, 'Invoking optimization jar', optionsArray.join(' '));

    // Enable file logging for the process we are about to start
    // TODO: why doesn't this work?
    //process.env.APP_WRITE_LOG_TO_FILE = true;

    const argsArray = [
      '-XX:+HeapDumpOnOutOfMemoryError',
      // Specify mem usage
      //"-Xms2048m",
      //"-Xmx2048m",
      // For remote debug (prevents running more than 1 optimization at a time because of conflicts on debug port)
      //'-Xdebug',
      //'-Xrunjdwp:transport=dt_socket,address=8889,server=y,suspend=n',
      '-jar',
      JAR_FILE_PATH,
      '-p',
      STATS_PATH + '/' + optimizationId,
      '-x',
      CTRL_FLAGS + '/' + optimizationId,
      '-z',
      RESULTS_PATH + '/' + optimizationId,
    ].concat(optionsArray);

    logger.log(accountId, argsArray);

    // Start the jar
    const process = spawn('java', argsArray, {
      // We must 'ignore' or 'pipe' output (in particular stdout) or else some buffer will fill up
      // and prevent the jvm from writing to stdout during logging. This causes the
      // execution to pause indefinitely, this took forever to figure out
      // https://stackoverflow.com/questions/5843809/system-out-println-eventually-blocks
      // stdin, stdout, and stderr
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    process.stderr.on(
      'data',
      async function (data) {
        logger.error(accountId, data.toString());
        await this.databaseCalls.setOptimizationStatus(
          accountId,
          optimizationId,
          SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ERROR,
          null,
          false
        );
      }.bind(this)
    );
    process.stdout.on('data', function (data) {
      logger.log(accountId, data.toString());
    });

    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
    );

    return true;
  }

  async pause(accountId: string, optimizationId: string) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Pausing local optimization');

    // Set the control flag to "HALT"
    fs.writeFileSync(CTRL_FLAGS + '/' + optimizationId, 'HALT');

    // Set optimization to pause, don't change the status (TODO: rename the status change function)
    const PAUSEABLE_STATUSES = SharedLib.constants.invertOptStatusSet(
      SharedLib.constants.TERMINAL_OPTIMIZATION_STATUSES_ENUM
    );

    // Set optimization pausing field (which is different from status)
    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      null,
      null,
      true,
      PAUSEABLE_STATUSES
    );
  }

  async query(accountId: string, optimizationId: string) {
    try {
      logger.log(accountId, 'Querying for result');
      const content = fs.readFileSync(RESULTS_PATH + '/' + optimizationId, {
        encoding: 'utf8',
      });
      return content;
    } catch (e) {
      logger.warn(accountId, 'No result available for ', optimizationId);
      return null;
    }
  }

  async estimate(accountId: string, optimizationId: string, stats, options) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Starting local optimization estimate');

    // Run common stuff
    const optionsArray = await this.doCommonProcessing(
      accountId,
      optimizationId,
      stats,
      options
    );

    const argsArray = [
      '-XX:+HeapDumpOnOutOfMemoryError',
      '-jar',
      JAR_FILE_PATH,
      '-p',
      STATS_PATH + '/' + optimizationId,
      '-x',
      CTRL_FLAGS + '/' + optimizationId,
      '-z',
      RESULTS_PATH + '/' + optimizationId,
    ].concat(optionsArray);
    logger.log(
      accountId,
      'Starting local optimization estimate',
      argsArray.join(' ')
    );

    // Start the jar
    const self = this;
    return await new Promise((resolve, reject) => {
      const process = spawn('java', argsArray, {
        // We must 'ignore' or 'pipe' output (otherwise full buffer will block execution)
        // stdin, stdout, and stderr
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      process.stderr.on(
        'data',
        async function (data) {
          const err = data.toString();
          logger.error(accountId, err);
          reject(err);
        }.bind(this)
      );

      process.stdout.on('data', function (data) {
        logger.log(accountId, data.toString());
      });

      process.on('close', function (code) {
        // Result of the estimate has been written to the file system, read that out and return it
        const result = self.query(accountId, optimizationId);
        resolve(result);
      });
    });
  }
}
