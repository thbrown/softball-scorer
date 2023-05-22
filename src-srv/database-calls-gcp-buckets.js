const DatabaseCallsAbstractBlob = require('./database-calls-abstract-blob');
const { BlobLocation } = require('./database-calls-abstract-blob-types');
const SharedLib = require('../shared-lib');
const TLSchemas = SharedLib.schemaValidation.default.TLSchemas;
const logger = require('./logger.js');
const GcpOps = require('./gcp-bucket-ops');

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

  async writeBlob(
    accountId,
    location,
    blobName,
    content,
    schemaToValidate,
    generation
  ) {
    let targetBucket = this.blobMap[location];
    await GcpOps.writeBlob(
      accountId,
      targetBucket,
      blobName,
      content,
      schemaToValidate,
      generation
    );
  }

  async readBlob(accountId, location, blobName, schemaToValidate) {
    const targetBucket = this.blobMap[location];
    return await GcpOps.readBlob(
      accountId,
      targetBucket,
      blobName,
      schemaToValidate
    );
  }

  async deleteBlob(accountId, location, blobName) {
    const targetBucket = this.blobMap[location];
    await GcpOps.deleteBlob(accountId, targetBucket, blobName);
  }

  async exists(accountId, location, blobName) {
    const targetBucket = this.blobMap[location];
    await GcpOps.exists(accountId, targetBucket, blobName);
  }
};
module.exports = databaseCallsGcpBuckets;
