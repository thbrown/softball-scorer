import fs from 'fs';
import util from 'util';
import { getConfig } from './config-accessor';

// Cloud Logging canonical severities. We don't use all of them; DEBUG/INFO/WARNING/ERROR
// cover everything the app emits today.
type Severity = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR';

const LOG_LOCATION = __dirname + '/../logs/';
const LOG_NAME = 'server.log';
const LOG_FULL_PATH = LOG_LOCATION + LOG_NAME;
const OVERFLOW_ENABLED = true;
const OVERFLOW_LOG_PREFIX = 'server-too-long';
const OVERFLOW_LOG_LIMIT = 1000; // Log lines larger than this will be written to a sidecar file

const COLOR_OFF = () =>
  (getConfig().logging && (getConfig().logging as any).colorOff) || false;
const LOG_TO_FILE = () =>
  (getConfig().logging && (getConfig().logging as any).toFile) || false;

// 'json' emits one structured JSON line per entry (Cloud Logging / Ops Agent friendly).
// 'text' emits the legacy tab-separated human-readable format (with optional ANSI colors).
// When unspecified we pick based on whether stdout is a TTY — dev terminals get 'text',
// anything else (systemd/screen-redirected-to-file/Docker) gets 'json'.
const LOG_FORMAT = (): 'json' | 'text' => {
  const cfg = getConfig().logging as any;
  if (cfg && cfg.format === 'json') return 'json';
  if (cfg && cfg.format === 'text') return 'text';
  return process.stdout.isTTY ? 'text' : 'json';
};

let logFile: fs.WriteStream | null = null;

export const initLogs = () => {
  if (LOG_TO_FILE()) {
    ensureDirectoryExistence(LOG_LOCATION);
    // Append instead of truncate so a restart doesn't discard recent log lines
    // that the log-shipping agent may not have read yet.
    logFile = fs.createWriteStream(LOG_FULL_PATH, { flags: 'a' });
    process.stdout.write('LOG FILE OPENED ' + LOG_FULL_PATH + '\n');
  }
};

function ensureDirectoryExistence(filePath: string) {
  if (fs.existsSync(filePath)) {
    return true;
  }
  fs.mkdirSync(filePath, { recursive: true });
}

interface SourceLocation {
  file?: string;
  line?: string;
  function?: string;
}

// Stack shape when we pull it from inside `emit`:
//   [0] "Error"
//   [1] "    at parseStackLocation (...)"
//   [2] "    at emit (...)"
//   [3] "    at log|warn|error|dev (...)"
//   [4] "    at <caller> (...)"  <-- the frame we want
function parseStackLocation(): SourceLocation | undefined {
  const stack = new Error().stack?.split('\n');
  if (!stack || stack.length < 5) return undefined;
  const frame = stack[4];
  if (!frame) return undefined;
  const withFn = frame.match(/at\s+(\S+)\s+\(([^:]+):(\d+):(\d+)\)/);
  if (withFn) return { function: withFn[1], file: withFn[2], line: withFn[3] };
  const noFn = frame.match(/at\s+([^:]+):(\d+):(\d+)/);
  if (noFn) return { file: noFn[1], line: noFn[2] };
  return undefined;
}

function joinMessages(messages: unknown[]): string {
  return messages.map((m) => util.format(m)).join(' ');
}

function handleOverflow(
  accountId: string,
  joined: string
): { joined: string; note?: string } {
  if (!OVERFLOW_ENABLED || joined.length <= OVERFLOW_LOG_LIMIT) {
    return { joined };
  }
  const filePathAccountId = accountId.replace(/[^a-z0-9]/gi, '_');
  const overflowFileName = `${OVERFLOW_LOG_PREFIX}-${filePathAccountId}-${Date.now()}.log`;
  let note: string;
  if (LOG_TO_FILE()) {
    fs.writeFile(LOG_LOCATION + overflowFileName, joined, (err) => {
      if (err) {
        process.stdout.write(
          `Logging was unable to write overflow file\t${err.toString()}\n`
        );
      }
    });
    note = `(truncated — full line at ${overflowFileName})`;
  } else {
    note = `(truncated — enable logging.toFile to dump full line)`;
  }
  return { joined: joined.substring(0, OVERFLOW_LOG_LIMIT), note };
}

function severityColor(severity: Severity): string {
  switch (severity) {
    case 'DEBUG':
      return '36m'; // cyan
    case 'INFO':
    case 'NOTICE':
      return '32m'; // green
    case 'WARNING':
      return '33m'; // yellow
    case 'ERROR':
      return '31m'; // red
  }
}

function emit(
  severity: Severity,
  accountId: string,
  messages: unknown[]
): void {
  accountId = accountId || 'N/A';
  const timestamp = new Date().toISOString();
  const location = parseStackLocation();
  const format = LOG_FORMAT();

  const rawJoined = joinMessages(messages);
  const { joined, note } = handleOverflow(accountId, rawJoined);
  const messageText = note ? `${joined} ${note}` : joined;

  if (format === 'json') {
    // Shape: Cloud Logging's jsonPayload. `severity` and `time` are special fields the
    // Ops Agent / Cloud Run log agent recognize; everything else lands in jsonPayload.
    // `logging.googleapis.com/sourceLocation` is picked up as structured source location.
    const entry: Record<string, unknown> = {
      severity,
      time: timestamp,
      accountId,
      message: messageText,
    };
    if (location) {
      entry['logging.googleapis.com/sourceLocation'] = location;
    }
    const line = JSON.stringify(entry) + '\n';
    process.stdout.write(line);
    if (LOG_TO_FILE() && logFile) {
      logFile.write(line);
    }
  } else {
    const locStr = location ? `${location.file}:${location.line}` : '';
    const plainParts = [timestamp, accountId, severity, messageText];
    const plain = plainParts.join('\t') + (locStr ? `\t${locStr}` : '') + '\n';
    if (COLOR_OFF()) {
      process.stdout.write(plain);
    } else {
      const color = severityColor(severity);
      const coloredBody = `\x1b[${color}${plainParts.join('\t')}\x1b[0m`;
      const coloredLoc = locStr ? `\t\x1b[34m${locStr}\x1b[0m` : '';
      process.stdout.write(coloredBody + coloredLoc + '\n');
    }
    // File log never gets color codes, for readability and to keep the line parse-clean.
    if (LOG_TO_FILE() && logFile) {
      logFile.write(plain);
    }
  }
}

export const log = function (accountId: string, ...messages: unknown[]) {
  emit('INFO', accountId, messages);
};

export const warn = function (accountId: string, ...messages: unknown[]) {
  emit('WARNING', accountId, messages);
};

export const error = function (accountId: string, ...messages: unknown[]) {
  emit('ERROR', accountId, messages);
};

export const dev = function (...messages: unknown[]) {
  emit('DEBUG', 'dev', messages);
};

export default {
  log,
  warn,
  error,
  dev,
};
