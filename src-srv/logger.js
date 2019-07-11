"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");

const config = require("./config.js");

const COLOR_OFF = (config.logging && config.logging.colorOff) || false;
const LOG_TO_FILE = (config.logging && config.logging.toFile) || false;
const LOG_LOCATION = __dirname + "/logs/server.log";

if (LOG_TO_FILE) {
  ensureDirectoryExistence(LOG_LOCATION);
  var logFile = fs.createWriteStream(LOG_LOCATION, { flags: "w" }); // TODO: rotate by day
}

process.stdout.write("LOG FILE CREATED " + LOG_LOCATION + "\n");

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

let logColor = function(accountId, color, ...messages) {
  let timestamp = new Date().getTime(); // process.hrtime() * 1000 + hrTime[1] / 1000000;
  let location = new Error().stack.split("\n")[3];
  accountId = accountId ? accountId : "N/A";

  process.stdout.write(timestamp + "\t");
  process.stdout.write(accountId + "\t");
  if (COLOR_OFF) {
    for (let i = 0; i < messages.length; i++) {
      process.stdout.write(`${util.format(messages[i])}\t`);
    }
    process.stdout.write(location + "\n");
  } else {
    for (let i = 0; i < messages.length; i++) {
      process.stdout.write(`\x1b[${color}${util.format(messages[i])}\x1b[0m\t`);
    }
    process.stdout.write(`\x1b[34m${location}\x1b[0m\n`);
  }

  if (LOG_TO_FILE) {
    logFile.write(timestamp + "\t");
    logFile.write(accountId + "\t");
    if (COLOR_OFF) {
      for (let i = 0; i < messages.length; i++) {
        logFile.write(`${util.format(messages[i])}\t`);
      }
      logFile.write(location + "\n");
    } else {
      for (let i = 0; i < messages.length; i++) {
        logFile.write(`\x1b[${color}${util.format(messages[i])}\x1b[0m\t`);
      }
      logFile.write(`\x1b[34m${location}\x1b[0m\n`);
    }
  }
};

exports.log = function(accountId, ...messages) {
  // Green
  logColor(accountId, "32m", ...messages);
};

exports.warn = function(accountId, ...messages) {
  // Yellow
  logColor(accountId, "33m", ...messages);
};

exports.error = function(accountId, ...messages) {
  // Red
  logColor(accountId, "31m", ...messages);
};
