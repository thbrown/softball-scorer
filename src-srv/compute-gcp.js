const logger = require('./logger.js');
const { google } = require('googleapis');
const compute = google.compute('v1');

const CPU_CORES = 4; // Must be a power of 2 between 2 and 64 inclusive OR 96

module.exports = class ComputeGCP {
  constructor(gcpParams) {
    this.stopInstance = function (name) {};

    this.deleteInstance = function (name) {};
  }

  async pause(accountId, name) {
    // Write to flags file
    logger.log(accountId, 'Stopping simulation on gcp - NOT IMPLEMENTED');
  }

  async queryResult() {}
};
