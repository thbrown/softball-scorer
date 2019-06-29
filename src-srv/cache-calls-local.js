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
