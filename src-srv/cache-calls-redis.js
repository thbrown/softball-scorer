const { promisify } = require("util");
const redis = require("redis");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);

/**
 * This cache implementation uses redis to store sessions and data that must be shared between different sessions of the same account (e.g. account locking data).
 * It's used primarally to keep sessions alive between server restarts and to enable future horizontal app server scaling.
 */
module.exports = class CacheCalls {
  constructor(host, port, password) {
    this.client = redis.createClient({
      port: port,
      host: host,
      password: password,
      retry_strategy: function(options) {
        if (options.error && options.error.code === "ECONNREFUSED") {
          // End reconnecting on a specific error and flush all commands with
          // a individual error
          return new Error("The server refused the connection");
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          // End reconnecting after a specific timeout and flush all commands
          // with a individual error
          return new Error("Retry time exhausted");
        }
        if (options.attempt > 10) {
          // End reconnecting with built in error
          return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      }
      // optional, if using SSL
      // use `fs.readFile[Sync]` or another method to bring these values in
      /*
      tls: {
        key: stringValueOfKeyFile,
        cert: stringValueOfCertFile,
        ca: [stringValueOfCaCertFile]
      }
      */
    });

    this.hgetAsync = promisify(this.client.hget).bind(this.client);
    this.hsetAsync = promisify(this.client.hset).bind(this.client);
    this.hsetnxAsync = promisify(this.client.hsetnx).bind(this.client);
    this.hdelAsync = promisify(this.client.hdel).bind(this.client);
  }

  async lockAccount(accountId) {
    return await this.hsetnxAsync(accountId, "locked", true);
  }

  async unlockAccount(accountId) {
    await this.hdelAsync(accountId, "locked");
  }

  async getPatches(accountId) {
    return JSON.parse(await this.hgetAsync(accountId, "stateRecentPatches"));
  }

  async setPatches(accountId, stateRecentPatches) {
    await this.hsetAsync(
      accountId,
      "stateRecentPatches",
      JSON.stringify(stateRecentPatches)
    );
  }

  async getStateMd5(accountId) {
    return await this.hgetAsync(accountId, "stateMd5");
  }

  async setStateMd5(accountId, stateMd5) {
    await this.hsetAsync(accountId, "stateMd5", stateMd5);
  }

  getSessionStore() {
    return new RedisStore({
      client: this.client
    });
  }
};
