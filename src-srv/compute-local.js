const https = require('https');
const fs = require('fs');

const ip = require('ip');

const logger = require('./logger.js');

/**
 * This compute implementation runs the simulation on just a the local machine.
 * TODO: automatically handle jar updates
 */
module.exports = class ComputeLocal {
  constructor() {}

  async start(accountId, optimizationId) {}

  async pause() {}

  async cleanup(accountId, optimizationId) {
    // no cleanup necessary for local compute
  }
};
