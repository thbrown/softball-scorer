/*eslint no-process-exit:*/
"use strict";

const SoftballServer = require("./softball-server");
const ComputeLocal = require("./compute-local");

const configAccessor = require("./config-accessor");
const logger = require("./logger.js");

// Log on inturruptions
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
const databaseCalls = configAccessor.getDatabaseService();

// Inject the cache service based on config values
const cacheCalls = configAccessor.getCacheService();

// Inject the compute service (for running optimizations)
const compute = new ComputeLocal();

// Specify the ports
let appPort = configAccessor.getAppServerPort();
let optPort = configAccessor.getOptimizationServerPort();

// Start the server!
const softballServer = new SoftballServer(
  appPort,
  optPort,
  databaseCalls,
  cacheCalls,
  compute
);
softballServer.start();
