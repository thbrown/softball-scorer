const { Storage } = require('@google-cloud/storage');
const SharedLib = require('../shared-lib');
const TLSchemas = SharedLib.schemaValidation.default.TLSchemas;
const logger = require('./logger.js');
const BucketSessionStore = require('gcp-bucket-session-store');
const { BlobLocation } = require('./database-calls-abstract-blob-types');
const GcpOps = require('./gcp-bucket-ops');

/**
 * This cache implementation just stores cached info in a gcp bucket
 *
 * https://googleapis.dev/nodejs/storage/latest/
 */
module.exports = class CacheCallsGcpBuckets {
  constructor(sessionBucket, ancestorBucket) {
    this.sessionBucket = sessionBucket;
    this.ancestorBucket = ancestorBucket;
    this.storage = new Storage();
  }

  async init() {
    // Make data bucket (if it doesn't exist)
    if (!(await this.storage.bucket(this.sessionBucket).exists())[0]) {
      logger.log('sys', 'Creating bucket', this.sessionBucket);
      await this.storage.createBucket(this.sessionBucket);
    }

    if (!(await this.storage.bucket(this.ancestorBucket).exists())[0]) {
      logger.log('sys', 'Creating bucket', this.ancestorBucket);
      await this.storage.createBucket(this.ancestorBucket);
    }
  }

  // No need for locking with gcp bucket database
  async lockAccount(accountId) {
    return true;
  }

  // No need for locking with gcp bucket database
  async unlockAccount(accountId) {
    return true;
  }

  async getAncestor(accountId, sessionId) {
    let blobName = 'ancestor-' + sessionId;
    try {
      const { fileContent, generation } = await GcpOps.readBlob(
        accountId,
        this.storage.bucket(this.ancestorBucket),
        blobName,
        TLSchemas.CLIENT
      );
      return fileContent;
    } catch (e) {
      if (e.code === 404) {
        logger.log(accountId, 'Ancestor not found');
      } else {
        logger.error(accountId, 'Error retrieving ancestor', e);
      }
      return undefined;
    }
  }

  async setAncestor(accountId, sessionId, ancestor) {
    let blobName = 'ancestor-' + sessionId;
    try {
      await GcpOps.writeBlob(
        accountId,
        this.storage.bucket(this.ancestorBucket),
        blobName,
        ancestor,
        TLSchemas.CLIENT
      );
    } catch (e) {
      // Storage library does not give a good stack, print the one we care about here
      var stack = new Error().stack;
      logger.warn(accountId, 'Error writing ancestor', e, stack);
    }
  }

  getSessionStore() {
    return new BucketSessionStore({ bucketName: this.sessionBucket });
  }
};
