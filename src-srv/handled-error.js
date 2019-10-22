const logger = require('./logger');

const HandledError = class HandledError extends Error {
  constructor(accountId, statusCode, external, internal) {
    super(external);
    this.accountId = accountId;
    this.statusCode = statusCode;
    this.external = external;
    this.internal = internal;
  }

  getStatusCode() {
    return this.statusCode ? this.statusCode : 500;
  }

  getExternalMessage() {
    return this.external ? this.external : 'No error message available';
  }

  getInternalMessage() {
    return this.internal;
  }

  print() {
    logger.error(
      this.accountId,
      `HANDLED ERROR WITH INTERNAL MESSAGE\nSTATUS: ${this.getStatusCode()}\nEXTERNAL: ${this.getExternalMessage()}\nINTERNAL: ${this.getInternalMessage()}\nTRACE: ${
        this.stack
      }`
    );
  }
};

// Node only
module.exports = HandledError;
