import DatabaseCallsAbstractBlob from './database-calls-abstract-blob';
import BlobLocation from './database-calls-abstract-blob-types';
import logger from './logger';
import GcpOps from './gcp-bucket-ops';
import { Storage } from '@google-cloud/storage';

export default class DatabaseCallsGcpBuckets extends DatabaseCallsAbstractBlob {
  storage: Storage;
  dataBucketName: string;
  emailLookupBucketName: string;
  tokenLookupBucketName: string;
  publicIdLookupBucketName: string;
  blobMap: { [key: number]: any };

  constructor(
    data: any,
    emailLookup: string,
    tokenLookup: string,
    publicIdLookup: string
  ) {
    super();
    // CODE=FILE_NO_UPLOAD? FILE_NO_UPLOAD_DELETE?
    this.storage = new Storage({
      autoRetry: true,
      // This appears to do nothing:
      // Object literal may only specify known properties, and 'idempotencyStrategy' does not exist in type 'StorageOptions'
      idempotencyStrategy: 'RetryAlways',
    } as any);
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
    accountId: string,
    location: string,
    blobName: string,
    content: any,
    schemaToValidate: unknown,
    generation: string | null
  ) {
    const targetBucket = this.blobMap[location];
    await GcpOps.writeBlob(
      accountId,
      targetBucket,
      blobName,
      content,
      schemaToValidate,
      generation
    );
  }

  async readBlob(
    accountId: string,
    location: string,
    blobName: string,
    schemaToValidate: unknown
  ) {
    const targetBucket = this.blobMap[location];
    return await GcpOps.readBlob(
      accountId,
      targetBucket,
      blobName,
      schemaToValidate
    );
  }

  async deleteBlob(accountId: string, location: string, blobName: string) {
    const targetBucket = this.blobMap[location];
    await GcpOps.deleteBlob(accountId, targetBucket, blobName);
  }

  async exists(accountId: string, location: string, blobName: string) {
    const targetBucket = this.blobMap[location];
    return await GcpOps.exists(accountId, targetBucket, blobName);
  }
}
