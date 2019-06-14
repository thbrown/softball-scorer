/**
 * This cache implementation just stores cached data in local memory. It will not scale past one process.
 */
module.exports = class CacheCalls {
  constructor() {
    this.cache = {};
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

  async getPatches(accountId) {
    this.getData(accountId, "stateRecentPatches");
  }

  async setPatches(accountId, stateRecentPatches) {
    this.putData(accountId, "stateRecentPatches", stateRecentPatches);
  }

  async getStateMd5(accountId) {
    this.getData(accountId, "stateMd5");
  }

  async setStateMd5(accountId, stateMd5) {
    this.putData(accountId, "stateMd5", stateMd5);
  }

  async clearStateMd5(accountId) {
    this.deleteData(accountId, "stateMd5");
  }

  // Intended for these to be private methods
  getData(accountId, field) {
    if (this.cache[accountId]) {
      return this.cache[accountId][field];
    } else {
      return undefined;
    }
  }

  putData(accountId, field, value) {
    if (!this.cache[accountId]) {
      this.cache[accountId] = {};
    }
    this.cache[accountId][field] = value;
  }

  deleteData(accountId, field) {
    if (!this.cache[accountId]) {
      return true;
    }
    return delete this.cache[accountId][field];
  }

  getSessionStore() {
    // Use the default in-memory store
    return undefined;
  }
};
