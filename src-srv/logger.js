'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const SharedLib = require('../shared-lib').default;

const config = require('./config.js');

const COLOR_OFF = (config.logging && config.logging.colorOff) || false;
const LOG_TO_FILE = (config.logging && config.logging.toFile) || false;
const LOG_LOCATION = __dirname + '/../logs/';
const LOG_NAME = 'server.log';
const LOG_FULL_PATH = LOG_LOCATION + LOG_NAME;
const OVERFLOW_ENABLED = true;
const OVERFLOW_LOG_PREFIX = 'server-too-long';
const OVERFLOW_LOG_LIMIT = 1000; // Log lines larger than this will be written to a file

if (LOG_TO_FILE) {
  ensureDirectoryExistence(LOG_LOCATION);
  var logFile = fs.createWriteStream(LOG_FULL_PATH, { flags: 'w' }); // TODO: rotate by day
  process.stdout.write('LOG FILE CREATED ' + LOG_FULL_PATH + '\n');
}

function ensureDirectoryExistence(filePath) {
  //var dirname = path.dirname(filePath);
  if (fs.existsSync(filePath)) {
    process.stdout.write('LOG EXISTS' + filePath + '\n');
    return true;
  }
  //ensureDirectoryExistence(dirname);
  fs.mkdirSync(filePath);
}

let logColor = async function (accountId, color, ...messages) {
  let timestamp = new Date().getTime(); // process.hrtime() * 1000 + hrTime[1] / 1000000;
  let location = new Error().stack.split('\n')[3];
  accountId = accountId ? accountId : 'N/A';

  process.stdout.write(timestamp + '\t');
  process.stdout.write(accountId + '\t');

  // Extra long log lines are written to the file system
  if (OVERFLOW_ENABLED) {
    // Concatenate all the messages
    let wholeMessage = '';
    for (let i = 0; i < messages.length; i++) {
      wholeMessage = `${wholeMessage}${messages[i]}\t`;
    }
    if (wholeMessage.length > OVERFLOW_LOG_LIMIT) {
      let filePathAccountId = accountId.replace(/[^a-z0-9]/gi, '_');
      let overflowFileName = `${OVERFLOW_LOG_PREFIX}-${filePathAccountId}-${timestamp}.log`;

      // Truncate the log
      let truncated = wholeMessage.substring(0, OVERFLOW_LOG_LIMIT);
      messages = [truncated];

      // Write the whole thing to the file system  (async, no need to wait for it)
      if (LOG_TO_FILE) {
        fs.writeFile(
          LOG_LOCATION + overflowFileName,
          wholeMessage,
          function (err) {
            if (err) {
              process.stdout.write(
                `Logging was unable to write to the file system\t`
              );
              process.stdout.write(err.toString());
            }
          }
        );
        // Indicate that this log has been truncated
        messages.push(
          `This log line has been truncated. The full log line will be written to file system at ${overflowFileName}`
        );
      } else {
        // Indicate that this log has been truncated
        messages.push(
          `This log line has been truncated. Enable file logging ('logging: { toFile: true }') in the server config to dump large logs to the file system ${overflowFileName}`
        );
      }
    }
  }

  if (COLOR_OFF) {
    for (let i = 0; i < messages.length; i++) {
      process.stdout.write(`${util.format(messages[i])}\t`);
    }
    process.stdout.write(location + '\n');
  } else {
    for (let i = 0; i < messages.length; i++) {
      process.stdout.write(`\x1b[${color}${util.format(messages[i])}\x1b[0m\t`);
    }
    process.stdout.write(`\x1b[34m${location}\x1b[0m\n`);
  }

  if (LOG_TO_FILE) {
    logFile.write(timestamp + '\t');
    logFile.write(accountId + '\t');
    // Color escape sequence in the log file are messy, lets just log it regular
    for (let i = 0; i < messages.length; i++) {
      logFile.write(`${util.format(messages[i])}\t`);
    }
    logFile.write(location + '\n');
  }
};

exports.log = function (accountId, ...messages) {
  // Green
  logColor(accountId, '32m', ...messages);
};

exports.warn = function (accountId, ...messages) {
  // Yellow
  logColor(accountId, '33m', ...messages);
};

exports.error = function (accountId, ...messages) {
  // Red
  logColor(accountId, '31m', ...messages);
};

exports.dev = function (...messages) {
  // Cyan
  logColor('dev', '36m', ...messages);
};
