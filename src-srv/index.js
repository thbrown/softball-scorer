/*eslint no-process-exit:*/
"use strict";

let config = null;

try {
  config = require("./config.js");
} catch (e) {
  console.log("Error: No ./config.js present.");
  process.exit(1);
}

const DatabaseCallsPostgres = require("./database-calls-postgres");
const DatabaseCallsStatic = require("./database-calls-static");
const SoftballServer = require("./softball-server");
const CacheCallsRedis = require("./cache-calls-redis");
const CacheCallsLocal = require("./cache-calls-local");
const ComputeLocal = require("./compute-local");

const logger = require("./logger.js");

process.on("SIGINT", function() {
  logger.log("sys", "SIGINT");
  process.exit(0);
});
process.on("SIGTERM", function() {
  logger.log("sys", "SIGTERM");
  process.exit(0);
});
process.on("exit", function() {
  process.stdout.write("Bye\n");
});

// Inject the database service based on config values
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
        logger.log("sys", "Encountered an error connecting to db", err);
        process.exit(1);
      }
      logger.log("sys", "Connected to db.");
    }
  );
} else {
  logger.warn("sys", "Warning: running without database connection");
  databaseCalls = new DatabaseCallsStatic();
}

// Inject the cache service based on config values
const { host: redisHost, port: redisPort, password: redisPassword } =
  config.cache || {};
let cacheCalls = null;
if (redisHost && redisPort && redisPassword) {
  cacheCalls = new CacheCallsRedis(redisHost, redisPort, redisPassword);
} else {
  logger.warn(null, "Warning: running with local in-memory cache");
  cacheCalls = new CacheCallsLocal();
}

// Inject the compute service (for running optimizations)
let compute = new ComputeLocal();

// Start the server!
const softballServer = new SoftballServer(databaseCalls, cacheCalls, compute);
softballServer.start();
