import SharedLib from 'shared-lib';
const TLSchemas = SharedLib.schemaValidation.TLSchemas;
import { Storage } from '@google-cloud/storage';
import logger from './logger';
import BucketSessionStore from 'gcp-bucket-session-store';
import GcpOps from './gcp-bucket-ops';
import { CacheService } from './service-types';

/**
 * This cache implementation just stores cached info in a gcp bucket
 *
 * https://googleapis.dev/nodejs/storage/latest/
 */
export default class CacheCallsGcpBuckets implements CacheService {
  sessionBucket: string;
  ancestorBucket: string;
  storage: Storage;
  constructor(sessionBucket: string, ancestorBucket: string) {
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

  async getAncestor(accountId: string, sessionId: string) {
    const blobName = 'ancestor-' + sessionId;
    try {
      const { content } = await GcpOps.readBlob(
        accountId,
        this.storage.bucket(this.ancestorBucket),
        blobName,
        TLSchemas.CLIENT
      );
      return content;
    } catch (e) {
      if (e.code === 404) {
        logger.log(accountId, 'Ancestor not found');
      } else {
        logger.error(accountId, 'Error retrieving ancestor', e);
      }
      return undefined;
    }
  }

  async setAncestor(accountId: string, sessionId: string, ancestor: string) {
    const blobName = 'ancestor-' + sessionId;
    try {
      await GcpOps.writeBlob(
        accountId,
        this.storage.bucket(this.ancestorBucket),
        blobName,
        ancestor,
        TLSchemas.CLIENT,
        null
      );
    } catch (e) {
      // Storage library does not give a good stack, print the one we care about here
      const stack = new Error().stack;
      logger.warn(accountId, 'Error writing ancestor', e, stack);
    }
  }

  getSessionStore() {
    return new BucketSessionStore({ bucketName: this.sessionBucket });
  }

  async lockOptimization(optimizationId, serverId, ttl) {}

  async setCache(value, key, secondKey) {
    // TODO
    return undefined;
  }

  async getCache(key, secondKey) {
    // TODO
    return undefined;
  }

  async deleteCache(key, secondKey) {
    // TODO
    return undefined;
  }

  async resetCacheTTL(key) {
    // TODO
    return undefined;
  }

  async putDataTTL(key, ttl, value) {}

  // Intended for these to be private methods
  async getData(accountId, field) {}

  async putData(accountId, field, value) {}

  async deleteData(key, field) {}
}
