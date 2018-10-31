'use strict';

const fs = require('fs');
const path = require('path');
var util = require('util');

const config = require('./config');

// TODO: move these options to the config file
const COLOR = true;
const LOCATION = true;
const LOG_LOCATION = __dirname + '/logs/server.log';
if (config.logging && config.logging.logToFile) {
	ensureDirectoryExistence(LOG_LOCATION);
	var logFile = fs.createWriteStream(LOG_LOCATION, { flags: 'w' }); // TODO: rotate by day
}

process.stdout.write('LOG FILE CREATED ' + LOG_LOCATION + '\n');

function ensureDirectoryExistence(filePath) {
	var dirname = path.dirname(filePath);
	if (fs.existsSync(dirname)) {
		return true;
	}
	ensureDirectoryExistence(dirname);
	fs.mkdirSync(dirname);
}

exports.log = function (accountId, ...messages) {
	let timestamp = (new Date()).getTime(); // process.hrtime() * 1000 + hrTime[1] / 1000000;
	let location = new Error().stack.split('\n')[2];
	accountId = accountId ? accountId : 'N/A';

	process.stdout.write(timestamp + '\t');
	process.stdout.write(accountId + '\t');
	if (COLOR) {
		for (let i = 0; i < messages.length; i++) {
			process.stdout.write(`\x1b[32m${util.format(messages[i])}\x1b[0m\t`);
		}
		process.stdout.write(`\x1b[34m${location}\x1b[0m\n`);
	} else {
		for (let i = 0; i < messages.length; i++) {
			process.stdout.write(`${util.format(messages[i])}\t`);
		}
		process.stdout.write(location + '\n');
	}

	if (config.logging && config.logging.logToFile) {
		logFile.write(timestamp + '\t');
		logFile.write(accountId + '\t');
		if (COLOR) {
			for (let i = 0; i < messages.length; i++) {
				logFile.write(`\x1b[32m${util.format(messages[i])}\x1b[0m\t`);
			}
			logFile.write(`\x1b[34m${location}\x1b[0m\n`);
		} else {
			for (let i = 0; i < messages.length; i++) {
				logFile.write(`${util.format(messages[i])}\t`);
			}
			logFile.write(location + '\n');
		}
	}

}

