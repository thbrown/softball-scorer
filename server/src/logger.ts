import fs from 'fs';
import util from 'util';
import { getConfig } from './config-accessor';

const COLOR_OFF = () =>
  (getConfig().logging && getConfig().logging.colorOff) || false;
const LOG_TO_FILE = () =>
  (getConfig().logging && getConfig().logging.toFile) || false;
const LOG_LOCATION = __dirname + '/../logs/';
const LOG_NAME = 'server.log';
const LOG_FULL_PATH = LOG_LOCATION + LOG_NAME;
const OVERFLOW_ENABLED = true;
const OVERFLOW_LOG_PREFIX = 'server-too-long';
const OVERFLOW_LOG_LIMIT = 1000; // Log lines larger than this will be written to a file

let logFile: fs.WriteStream | null = null;

export const initLogs = () => {
  if (LOG_TO_FILE()) {
    ensureDirectoryExistence(LOG_LOCATION);
    logFile = fs.createWriteStream(LOG_FULL_PATH, { flags: 'w' }); // TODO: rotate by day
    process.stdout.write('LOG FILE CREATED ' + LOG_FULL_PATH + '\n');
  }
};

function ensureDirectoryExistence(filePath: string) {
  //var dirname = path.dirname(filePath);
  if (fs.existsSync(filePath)) {
    process.stdout.write('LOG EXISTS' + filePath + '\n');
    return true;
  }
  //ensureDirectoryExistence(dirname);
  fs.mkdirSync(filePath);
}
const logColor = async function (
  accountId: string,
  color: string,
  ...messages: unknown[]
) {
  const timestamp = new Date().getTime(); // process.hrtime() * 1000 + hrTime[1] / 1000000;
  const location = new Error().stack?.split('\n')[3];
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
      const filePathAccountId = accountId.replace(/[^a-z0-9]/gi, '_');
      const overflowFileName = `${OVERFLOW_LOG_PREFIX}-${filePathAccountId}-${timestamp}.log`;

      // Truncate the log
      const truncated = wholeMessage.substring(0, OVERFLOW_LOG_LIMIT);
      messages = [truncated];

      // Write the whole thing to the file system  (async, no need to wait for it)
      if (LOG_TO_FILE()) {
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

  if (COLOR_OFF()) {
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

  if (LOG_TO_FILE() && logFile) {
    logFile.write(timestamp + '\t');
    logFile.write(accountId + '\t');
    // Color escape sequence in the log file are messy, lets just log it regular
    for (let i = 0; i < messages.length; i++) {
      logFile.write(`${util.format(messages[i])}\t`);
    }
    logFile.write(location + '\n');
  }
};

export const log = function (accountId: string, ...messages: unknown[]) {
  // Green
  logColor(accountId, '32m', ...messages);
};

export const warn = function (accountId: string, ...messages: unknown[]) {
  // Yellow
  logColor(accountId, '33m', ...messages);
};

export const error = function (accountId: string, ...messages: unknown[]) {
  // Red
  logColor(accountId, '31m', ...messages);
};

export const dev = function (...messages: unknown[]) {
  // Cyan
  logColor('dev', '36m', ...messages);
};

export default {
  log,
  warn,
  error,
  dev,
};
