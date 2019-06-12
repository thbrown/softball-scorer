/*eslint no-process-exit:*/

let config = null;

try {
  config = require('./config.js');
} catch (e) {
  console.log('Error: No ./config.js present.');
  process.exit(1);
}

const DatabaseCallsPostgres = require('./database-calls-postgres');
const DatabaseCallsStatic = require('./database-calls-static');
const SoftballServer = require('./softball-server');
const CacheCallsRedis = require('./cache-calls-redis');
const CacheCallsLocal = require('./cache-calls-local');

process.on('SIGINT', function() {
  console.log('SIGINT');
  process.exit(0);
});
process.on('SIGTERM', function() {
  console.log('SIGTERM');
  process.exit(0);
});
process.on('exit', function() {
  process.stdout.write('Bye\n');
});

function startServer(databaseCalls, cacheCalls) {
  const softballServer = new SoftballServer(databaseCalls, cacheCalls);
  softballServer.start();
}

const {
  host: pghost,
  port: pgport,
  username: pgusername,
  password: pgpassword
} = config.database || {};
let databaseCalls = null;
if (pghost && pgport && pgusername && pgpassword) {
  databaseCalls = new DatabaseCallsPostgres(
    pghost,
    pgport,
    pgusername,
    pgpassword,
    err => {
      if (err) {
        console.log('Encountered an error connecting to db', err);
        process.exit(1);
      }
      console.log('Connected to db.');
    }
  );
} else {
  console.log('Warning: running without database connection');
  databaseCalls = new DatabaseCallsStatic();
}

const { host: redisHost, port: redisPort, password: redisPassword } =
  config.cache || {};
let cacheCalls = null;
if (redisHost && redisPort && redisPassword) {
  cacheCalls = new CacheCallsRedis(redisHost, redisPort, redisPassword);
} else {
  console.log('Warning: running with local in memory cache');
  cacheCalls = new CacheCallsLocal();
}
asdf
startServer(databaseCalls, cacheCalls);
