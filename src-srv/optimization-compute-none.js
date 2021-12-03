const logger = require('./logger.js');
const { google } = require('googleapis');
const compute = google.compute('v1');

/**
 * The optimization compute service that doesn't do anything.
 *
 * And if you ask it to do anything, it'll just tell you that it doesn't do anything.
 */
module.exports = class OptimizationComputeGcp {
  constructor() {}

  async start(accountId, optimizationId) {
    // We don't do anything
    logger.log(
      accountId,
      "Optimization compute service not running 'start' because it's configured not to"
    );
  }

  async pause(accountId, optimizationId) {
    // We don't do anything
    logger.log(
      accountId,
      "Optimization compute service not running 'pause' because it's configured not to"
    );
  }

  async query() {
    // We don't do anything
    logger.log(
      accountId,
      "Optimization compute service not running 'query' because it's configured not to"
    );
  }
};
