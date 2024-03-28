import logger from './logger';

const HandledError = class HandledError extends Error {
  accountId: string;
  statusCode: number;
  external: string;
  internal: string;
  constructor(
    accountId: string,
    statusCode: number,
    external?: string,
    internal?: string
  ) {
    super(external);
    this.accountId = accountId;
    this.statusCode = statusCode;
    this.external = external ?? '';
    this.internal = internal ?? '';
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

export default HandledError;
