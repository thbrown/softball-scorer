const configAccessor = require("./config-accessor");

/**
 * This cache implementation just stores cached data in local memory. It will not scale past one process.
 */
module.exports = class CacheCalls {
  constructor() {
    this.cache = {};
    this.timers = {};
  }
  async lockAccount(accountId) {
    let lockStatus = this.getData(accountId, "locked");
    if (lockStatus) {
      return false;
    } else {
      this.putData(accountId, "locked", true);
      return true;
    }
  }

  async unlockAccount(accountId) {
    this.deleteData(accountId, "locked");
  }

  async lockOptimization(optimizationId, serverId, ttl) {
    let key = "optlock:" + optimizationId;
    let value = this.cache[key];
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
    this.getData(accountId, "ancestor" + sessionId);
  }

  async setAncestor(accountId, sessionId, ancestor) {
    this.putData(accountId, "ancestor" + sessionId, ancestor);
  }

  // Intended for these to be private methods
  getData(accountId, field) {
    if (this.cache[accountId]) {
      return this.cache[accountId][field];
    } else {
      return undefined;
    }
  }

  putDataTTL(key, ttl, value) {
    this.cache[key] = value;

    if (this.timers[key]) {
      console.log("clearign timeout", key, value);
      clearTimeout(this.timers[key]);
    }
    this.timers[key] = setTimeout(
      function() {
        console.log("keyHasExpired", key, value);
        delete this.cache[key];
      }.bind(this),
      ttl * 1000
    );
  }

  putData(key, field, value) {
    if (!this.cache[key]) {
      this.cache[key] = {};
    }
    this.cache[key][field] = value;
  }

  deleteData(key, field) {
    if (!this.cache[key]) {
      return true;
    }
    return delete this.cache[key][field];
  }

  getSessionStore() {
    // Use the default in-memory store
    return undefined;
  }
};
