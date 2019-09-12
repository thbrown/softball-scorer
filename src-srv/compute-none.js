const ip = require('ip');

const logger = require('./logger.js');

/**
 * This compute implementation does not start the optimization, instead it waits
 * for the Java optimization client to be started on some remote server on the
 * network. It prints the arguments that should be supplied to that jar.
 */
module.exports = class ComputeNone {
  constructor() {}

  async start(accountId, optimizationId) {
    logger.warn(
      accountId,
      'Start optimization Java on remote machine with args:',
      ip.address(),
      optimizationId
    );
  }

  async retry(accountId, optimizationId) {
    logger.warn(accountId, 'Attempting retry');
    return this.start(accountId, optimizationId);
  }

  async cleanup(accountId, optimizationId) {
    // no cleanup necessary for none compute
  }
};
