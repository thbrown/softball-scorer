import FileSystemSessionStore from './file-system-session-store';
import { CacheService } from './service-types';

/**
 * This cache implementation just stores cached data in the file system.
 *
 * TODO: this uses the file system for the sessions but not for other cache functions (it just uses in-memory)
 * Persisting other cache stuff to the file system probably doesn't matter much so this is low priority
 */
export default class CacheCallsFileSystem implements CacheService {
  cache: Record<string, any>;
  timers: Record<string, NodeJS.Timeout>;
  constructor() {
    this.cache = {};
    this.timers = {};
  }
  async init() {}

  async lockAccount(accountId) {
    const lockStatus = this.getData(accountId, 'locked');
    if (lockStatus) {
      return false;
    } else {
      this.putData(accountId, 'locked', true);
      return true;
    }
  }

  async unlockAccount(accountId) {
    this.deleteData(accountId, 'locked');
  }

  async lockOptimization(optimizationId, serverId, ttl) {
    const key = 'optlock: ' + optimizationId;
    const value = this.cache[key];
    if (!value) {
      // Nobody currently holds the lock, lock it
      this.putDataTTL(key, ttl, serverId);
      return true;
    } else if (value === serverId) {
      // This server currently holds the lock, extend it
      this.putDataTTL(key, ttl, serverId);
      return true;
    } else {
      // Another server owns the lock, fail the call
      this.putDataTTL(key, ttl, serverId);
      return false;
    }
  }

  async getAncestor(accountId, sessionId) {
    return this.getData(accountId, 'ancestor' + sessionId);
  }

  async setAncestor(accountId, sessionId, ancestor) {
    this.putData(accountId, 'ancestor' + sessionId, ancestor);
  }

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

  async putDataTTL(key, ttl, value) {
    this.cache[key] = value;

    if (this.timers[key]) {
      console.log('clearing timeout', key, value);
      clearTimeout(this.timers[key]);
    }
    this.timers[key] = setTimeout(
      function () {
        console.log('keyHasExpired', key, value);
        delete this.cache[key];
      }.bind(this),
      ttl * 1000
    );
  }

  // Intended for these to be private methods
  getData(accountId, field) {
    if (this.cache[accountId]) {
      return this.cache[accountId][field];
    } else {
      return undefined;
    }
  }

  async putData(accountId, field, value) {
    if (!this.cache[accountId]) {
      this.cache[accountId] = {};
    }
    this.cache[accountId][field] = value;
  }

  async deleteData(key, field) {
    if (!this.cache[key]) {
      return true;
    }
    return delete this.cache[key][field];
  }

  getSessionStore() {
    return new FileSystemSessionStore();
  }
}
