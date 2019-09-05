const https = require('https');
const fs = require('fs');

const ip = require('ip');

const logger = require('./logger.js');

const FILE_NAME = 'softball-sim.jar';

/**
 * This compute implementation runs the simulation on just a the local maching.
 * TODO: automatically handle jar updates
 */
module.exports = class ComputeLocal {
  constructor() {
    this.download = function(url, dest, skipExistenceCheck) {
      if (fs.existsSync(FILE_NAME) && !skipExistenceCheck) {
        logger.log(
          null,
          'Optimization jar already exists on file system. Will not download.'
        );
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        var file = fs.createWriteStream(dest);
        https
          .get(
            url,
            async function(response) {
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
                file.on('finish', function() {
                  file.close(function() {
                    logger.log(null, 'Jar succesfully downloaded');
                    resolve();
                  });
                });
              }
            }.bind(this)
          )
          .on('error', function(err) {
            logger.log(null, 'Error downloading jar ' + err);
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            reject(err.message);
          });
      });
    };

    this.javaversion = function() {
      return new Promise((resolve, reject) => {
        var spawn = require('child_process').spawn('java', ['-version']);
        spawn.on('error', function(err) {
          return reject(err);
        });
        spawn.stderr.on('data', function(data) {
          data = data.toString().split('\n')[0];
          var javaVersion = new RegExp('java version').test(data)
            ? data.split(' ')[2].replace(/"/g, '')
            : false;
          if (javaVersion != false) {
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

  async start(accountId, optimizationId, onError) {
    logger.log(null, 'Starting simulation locally');

    // Get the optimization jar if necessary
    await this.download(
      'https://github.com/thbrown/softball-sim/releases/download/v0.5/softball-sim.jar',
      FILE_NAME
    );

    // Verify java version
    let javaVersion = await this.javaversion();
    logger.log(accountId, 'Java version is ' + javaVersion);

    let versionArray = javaVersion.split('.');
    if (versionArray[1] < 8 || versionArray[0] !== '1') {
      logger.warn(
        accountId,
        `WARNING: installed version of Java (${javaVersion}) may not be compatible with jar build`
      );
    }

    logger.log(accountId, 'Invoking optimization jar');

    // Start the jar
    var spawn = require('child_process').spawn(
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
        FILE_NAME,
        'NETWORK',
        ip.address(),
        optimizationId,
      ],
      {
        // We must 'ignore' stdout or else some buffer will fill up and prevent the jvm from writing to stdout during logging.
        // This causes the execution to pause indefinitely, this took forever to figure out
        // https://stackoverflow.com/questions/5843809/system-out-println-eventually-blocks
        stdio: ['ignore', 'ignore', 'pipe'],
      }
    );
    spawn.on('error', function(err) {
      logger.warn(accountId, 'Error encountered');
      return Promise.reject(err);
    });
    spawn.stderr.on('data', function(data) {
      // TODO: find some way to group multiple messages from std error. Currently only the latest one gets persisted (usually a stack trace)
      logger.warn(accountId, 'Optimization client stderr', data.toString());
      //return Promise.reject(data.toString()); // This would be an unhandled rejection
    });
    return Promise.resolve();
  }

  async retry(accountId, optimizationId) {
    return this.start(accountId, optimizationId);
  }

  async cleanup(accountId, optimizationId) {
    // no cleanup necessary
  }
};
