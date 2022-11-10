const DatabaseCallsAbstractBlob = require('./database-calls-abstract-blob');
const { BlobLocation } = require('./database-calls-abstract-blob-types');
const SharedLib = require('../shared-lib').default;
const logger = require('./logger.js');
const TLSchemas = SharedLib.schemaValidation.TLSchemas;

const { Storage } = require('@google-cloud/storage');

let databaseCallsGcpBuckets = class DatabaseCallsGcpBuckets extends DatabaseCallsAbstractBlob {
  constructor(data, emailLookup, tokenLookup, publicIdLookup) {
    super();
    this.storage = new Storage();
    this.dataBucketName = data;
    this.emailLookupBucketName = emailLookup;
    this.tokenLookupBucketName = tokenLookup;
    this.publicIdLookupBucketName = publicIdLookup;
  }

  async init() {
    // Make data bucket (if it doesn't exist)
    if (!(await this.storage.bucket(this.dataBucketName).exists())[0]) {
      logger.log('sys', 'Creating bucket', this.dataBucketName);
      await this.storage.createBucket(this.dataBucketName);
    }

    // Make email-lookup bucket (if it doesn't exist)
    if (!(await this.storage.bucket(this.emailLookupBucketName).exists())[0]) {
      logger.log('sys', 'Creating bucket', this.emailLookupBucketName);
      await this.storage.createBucket(this.emailLookupBucketName);
    }

    // Make token-lookup bucket (if it doesn't exist)
    if (!(await this.storage.bucket(this.tokenLookupBucketName).exists())[0]) {
      logger.log('sys', 'Creating bucket', this.tokenLookupBucketName);
      await this.storage.createBucket(this.tokenLookupBucketName);
    }
    // Make public-id-lookup bucket (if it doesn't exist)
    if (
      !(await this.storage.bucket(this.publicIdLookupBucketName).exists())[0]
    ) {
      logger.log('sys', 'Creating bucket', this.publicIdLookupBucketName);
      await this.storage.createBucket(this.publicIdLookupBucketName);
    }

    // Create a lookup table for these locations
    this.blobMap = {};
    this.blobMap[BlobLocation.DATA] = this.storage.bucket(this.dataBucketName);
    this.blobMap[BlobLocation.EMAIL_LOOKUP] = this.storage.bucket(
      this.emailLookupBucketName
    );
    this.blobMap[BlobLocation.TOKEN_LOOKUP] = this.storage.bucket(
      this.tokenLookupBucketName
    );
    this.blobMap[BlobLocation.PUBLIC_ID_LOOKUP] = this.storage.bucket(
      this.publicIdLookupBucketName
    );
  }

  async writeBlob(accountId, location, blobName, content, generation) {
    try {
      // Map location to file
      let targetBucket = this.blobMap[location];

      // Validate schema before write
      if (location === BlobLocation.DATA) {
        SharedLib.schemaValidation.validateSchema(content, TLSchemas.FULL);
      }

      // Now write the actual file
      const file = targetBucket.file(blobName);
      await file.save(JSON.stringify(content), {
        generation: generation,
        metadata: {
          cacheControl: 'no-cache',
        },
      });
    } catch (e) {
      // Storage library doe snot give a good stack, print the one we care about here
      var stack = new Error().stack;
      logger.error(accountId, 'Write Error', stack);
    }
  }

  async readBlob(accountId, location, blobName) {
    try {
      // Map location to file
      let targetBucket = this.blobMap[location];

      // Read the file content
      let fileContent;
      let generation;
      try {
        let file = (await targetBucket.file(blobName).get())[0];
        generation = file.metadata.generation;
        fileContent = JSON.parse(await file.download());
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
      if (location === BlobLocation.DATA) {
        let result = SharedLib.schemaMigration.updateSchema(
          accountId,
          fileContent,
          'full',
          logger
        );

        if (result === 'UPDATED') {
          // Check if a schema update is needed, if the schema has been upgraded, write the new data before progressing
          await this.writeBlob(
            accountId,
            location,
            blobName,
            fileContent,
            null
          );
          logger.log(accountId, 'Updated schema write-back successful');
        }

        // Validate schema after read
        SharedLib.schemaValidation.validateSchema(fileContent, TLSchemas.FULL);
      }

      return {
        content: fileContent,
        generation: generation,
      };
    } catch (e) {
      if (e.code !== 404) {
        // Storage library doe snot give a good stack, print the one we care about here
        var stack = new Error().stack;
        logger.error(accountId, 'Read Error', stack);
      }
      throw e;
    }
  }

  async deleteBlob(accountId, location, blobName) {
    // Map location to file
    let targetBucket = this.blobMap[location];
    // Now delete the actual file
    const file = targetBucket.file(blobName);
    await file.delete();
  }

  async exists(accountId, location, blobName) {
    // Map location to file
    let targetBucket = this.blobMap[location];
    // Now delete the actual file
    const file = targetBucket.file(blobName);
    let result = await file.exists();
    logger.dev(accountId, 'EXISTS', result);
    return result;
  }
};
module.exports = databaseCallsGcpBuckets;
