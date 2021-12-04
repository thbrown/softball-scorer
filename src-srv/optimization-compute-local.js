const fs = require('fs');

const logger = require('./logger.js');
const SharedLib = require('../shared-lib').default;

var https = require('https');

const optimizationCompleteEmailHtml = require('./email/optimization-complete-email-html');

const ROOT = __dirname + '/optimizations-temp';
const STATS_PATH = ROOT + '/stats';
const RESULTS_PATH = ROOT + '/results';
const CTRL_FLAGS = ROOT + '/ctrl';

const JAR_FILE_PATH = ROOT + '/softball-sim.jar';

module.exports = class OptimizationComputeLocal {
  constructor(databaseCalls, emailService) {
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

    logger.log('sys', 'Creating directory finished!!', ROOT);

    this.download = function (url, dest, skipExistenceCheck) {
      if (fs.existsSync(JAR_FILE_PATH) && !skipExistenceCheck) {
        logger.log(
          'sys',
          'Optimization jar already exists on file system. Will not download.'
        );
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        var file = fs.createWriteStream(dest);
        https
          .get(
            url,
            async function (response) {
              if (response.statusCode == 302) {
                logger.log(null, 'Handling redirect');
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
            logger.log(null, 'Error downloading jar ' + err);
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            reject(err.message);
          });
      });
    };

    this.javaversion = function () {
      return new Promise((resolve, reject) => {
        const spawn = require('child_process').spawn('java', ['-version']);
        spawn.on('error', function (err) {
          return reject(err);
        });
        spawn.stderr.on('data', function (data) {
          data = data.toString().split('\n')[0];
          let javaVersion = /(java|openjdk) version/.test(data)
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
  }

  async start(accountId, optimizationId, stats, options) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Starting local optimization');

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
      'https://github.com/thbrown/softball-sim/releases/download/v1.2/softball-sim.jar',
      JAR_FILE_PATH
    );

    // Convert options map to an array of args that can be passed to the cli
    let optionsArray = [];
    for (let option in options) {
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

    // Verify java version
    let javaVersion = await this.javaversion();
    logger.log(accountId, 'Java version is ' + javaVersion);

    let versionArray = javaVersion.split('.');
    if (versionArray[0] < 11) {
      logger.warn(
        accountId,
        `WARNING: installed version of Java (${javaVersion}) may not be compatible with jar build`
      );
    }

    logger.log(accountId, 'Invoking optimization jar');

    // Enable file logging for the process we are about to start
    // TODO: why doesn't this work?
    //process.env.APP_WRITE_LOG_TO_FILE = true;

    // Start the jar
    let process = require('child_process').spawn(
      'java',
      [
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
      ].concat(optionsArray),
      {
        // We must 'ignore' output (in particular stdout) or else some buffer will fill up
        // and prevent the jvm from writing to stdout during logging. This causes the
        // execution to pause indefinitely, this took forever to figure out
        // https://stackoverflow.com/questions/5843809/system-out-println-eventually-blocks
        // stdin, stdout, and stderr
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    process.stderr.on('data', function (data) {
      logger.error(accountId, data.toString());
    });
    process.stdout.on('data', function (data) {
      logger.log(accountId, data.toString());
    });

    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
    );
  }

  async pause(accountId, optimizationId) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Pausing local optimization');

    // Set the control flag to "HALT"
    fs.writeFileSync(CTRL_FLAGS + '/' + optimizationId, 'HALT');

    // Set optimization status to PAUSING
    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSING
    );

    /*
    // FIXME: this is a bit sketchy, what if it fails to terminate? Doesn't matter much for local compute though.
    // Give it about 10 seconds to terminate then set the status to paused
    setTimeout(
      function () {
        this.databaseCalls.setOptimizationStatus(
          accountId,
          optimizationId,
          SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSED
        );
      }.bind(this),
      10000
    );
    */
  }

  async query(accountId, optimizationId) {
    try {
      logger.log(accountId, 'Querying for result');
      let content = fs.readFileSync(RESULTS_PATH + '/' + optimizationId, {
        encoding: 'utf8',
      });
      return content;
    } catch (e) {
      logger.warn(accountId, 'No result available for ', optimizationId);
      return null;
    }
  }

  async estimate(accountId, optimizationId) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Pausing local optimization');

    // This works only in node 15?
    optimizationProcess.abort();

    // Set optimization status to PAUSED
    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSED
    );
  }
};
