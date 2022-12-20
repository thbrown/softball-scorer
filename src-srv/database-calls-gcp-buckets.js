const DatabaseCallsAbstractBlob = require('./database-calls-abstract-blob');
const { BlobLocation } = require('./database-calls-abstract-blob-types');
const SharedLib = require('../shared-lib');
const TLSchemas = SharedLib.schemaValidation.default.TLSchemas;
const logger = require('./logger.js');

const { Storage } = require('@google-cloud/storage');

const fs = require('fs');
const path = require('path');

let databaseCallsGcpBuckets = class DatabaseCallsGcpBuckets extends DatabaseCallsAbstractBlob {
  constructor(data, emailLookup, tokenLookup, publicIdLookup) {
    super();
    // CODE=FILE_NO_UPLOAD? FILE_NO_UPLOAD_DELETE?
    this.storage = new Storage({
      autoRetry: true,
      idempotencyStrategy: 'RetryAlways',
    });
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
    await this._writeBlob(
      accountId,
      location,
      blobName,
      content,
      generation,
      0
    );
  }

  async _writeBlob(accountId, location, blobName, content, generation, retry) {
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
        validation: 'md5',
        resumable: false,
        metadata: {
          cacheControl: 'no-cache',
        },
      });
    } catch (e) {
      // These error codes mean that the content written to the bucket has a different checksum than the file that was uploaded.
      // It's really bad for us because the file either gets deleted to preserve data integrity (FILE_NO_UPLOAD) or the file
      // fails to get delete and we get potentially corrupted data (FILE_NO_UPLOAD_DELETE). So we will re-try and if that
      // doesn't work, we will dump the write content to the file system so we can restore it manually later. This is not an
      // API error so it's not covered by the Storage library's automatic retry.
      if (
        retry <= 0 &&
        (e.code === 'FILE_NO_UPLOAD' || e.code === 'FILE_NO_UPLOAD_DELETE')
      ) {
        logger.error(
          accountId,
          'Write checksum did not match. Attempting re-try.'
        );
        try {
          // TODO, wait first??
          await this._writeBlob(
            accountId,
            location,
            blobName,
            content,
            generation,
            retry + 1
          );
        } catch (e) {
          // Something is still wrong, dump the file to the file system
          var stack = new Error().stack;
          logger.error(
            accountId,
            'BAD: write checksum did not match and retry failed. File to restore has been persisted to file system.',
            stack,
            this.blobMap[location].name,
            blobName,
            content.length
          );
          // Save the file to the local file system for manual restoration
          fs.writeFileSync(
            path.join(
              __dirname,
              `/emergency-dump-${this.blobMap[location].name}-${blobName}.json`
            ),
            JSON.stringify(content)
          );
          throw e;
        }
      }

      // Storage library does not give a good stack, print the one we care about here
      var stack = new Error().stack;
      logger.error(
        accountId,
        'Write Error',
        stack,
        this.blobMap[location].name,
        blobName,
        content.length
      );
      throw e;
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
        fileContent = JSON.parse(
          await file.download({
            validation: 'md5',
          })
        );
      } catch (e) {
        logger.warn(
          accountId,
          'Failed to read file, it might not exist',
          blobName,
          e.statusCode
        );
        // Caller checks fof 404
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
      // Storage library does not give a good stack, print the one we care about here
      var stack = new Error().stack;
      if (e.code !== 404) {
        logger.error(
          accountId,
          'Read Error',
          this.blobMap[location].name,
          blobName,
          stack
        );
      } else {
        logger.warn(
          accountId,
          'Read Error - 404',
          this.blobMap[location].name,
          blobName,
          stack
        );
      }
      throw e;
    }
  }

  async deleteBlob(accountId, location, blobName) {
    try {
      // Map location to file
      let targetBucket = this.blobMap[location];
      // Now delete the actual file
      const file = targetBucket.file(blobName);
      await file.delete();
    } catch (e) {
      if (e.code === 404) {
        return; // Already deleted, or never existed
      }
      logger.error(accountId, 'Error on delete');
      throw e;
    }
  }

  async exists(accountId, location, blobName) {
    try {
      // Map location to file
      let targetBucket = this.blobMap[location];
      // Now delete the actual file
      const file = targetBucket.file(blobName);
      let result = await file.exists();
      return result[0];
    } catch (e) {
      logger.log(accountId, 'Error on delete');
      throw e;
    }
  }
};
module.exports = databaseCallsGcpBuckets;
