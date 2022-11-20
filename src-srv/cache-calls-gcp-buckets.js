const { Storage } = require('@google-cloud/storage');
const SharedLib = require('../shared-lib').default;
const TLSchemas = SharedLib.schemaValidation.TLSchemas;
const logger = require('./logger.js');
const BucketSessionStore = require('gcp-bucket-session-store');

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
    let targetBucket = this.storage.bucket(this.ancestorBucket);
    try {
      // Read the file content
      let fileContent;
      let generation;
      try {
        let file = (await targetBucket.file(blobName).get())[0];
        generation = file.metadata.generation;
        fileContent = JSON.parse(await file.download({ validation: 'md5' }));
      } catch (e) {
        logger.warn(
          accountId,
          'Failed to read file, it might not exist',
          blobName,
          e.statusCode
        );
        // We check for 404 in the parent class
        throw e;
      }

      // Schema validation for data blob.
      let result = SharedLib.schemaMigration.updateSchema(
        accountId,
        fileContent,
        'client',
        logger
      );

      if (result === 'UPDATED') {
        // Check if a schema update is needed, if the schema has been upgraded, write the new data before progressing
        SharedLib.schemaValidation.validateSchema(
          fileContent,
          TLSchemas.CLIENT
        );
        await this.writeBlob(accountId, location, blobName, fileContent, null);
        logger.log(accountId, 'Updated schema write-back successful');
      }

      // Validate schema after read
      SharedLib.schemaValidation.validateSchema(fileContent, TLSchemas.CLIENT);

      /*
      return {
        content: fileContent,
        generation: generation,
      };
      */
      return fileContent;
    } catch (e) {
      if (e.code === 404) {
        logger.log(accountId, 'Ancestor not found');
      } else {
        logger.warn(accountId, 'Error retrieving ancestor', e);
      }
      return undefined;
    }
  }

  async setAncestor(accountId, sessionId, ancestor) {
    let blobName = 'ancestor-' + sessionId;

    try {
      // Validate schema before write
      SharedLib.schemaValidation.validateSchema(ancestor, TLSchemas.CLIENT);
      let targetBucket = this.storage.bucket(this.ancestorBucket);

      // Now write the actual file
      const file = targetBucket.file(blobName);
      await file.save(JSON.stringify(ancestor), {
        validation: 'md5',
        resumable: false,
        metadata: {
          cacheControl: 'no-cache',
        },
      });
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
