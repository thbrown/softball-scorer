const { promisify } = require("util");
const redis = require("redis");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const zlib = require("zlib");

const configAccessor = require("./config-accessor");
const logger = require("./logger");

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

    this.client.on("error", function(err) {
      logger.error("sys", "Redis Error - " + err);
      process.exit(1);
    });

    this.client.on("ready", function() {
      logger.log("sys", "Redis Ready");
    });

    this.client.on("connect", function() {
      logger.log("sys", "Redis Connect");
    });

    this.client.on("reconnecting", function() {
      logger.warn("sys", "Redis Reconnecting");
    });

    this.client.on("end", function() {
      logger.warn("sys", "Redis End");
    });

    this.client.on("warning", function(warn) {
      logger.warn("sys", "Redis Warning - " + warn);
    });

    this.hgetAsync = promisify(this.client.hget).bind(this.client);
    this.hsetAsync = promisify(this.client.hset).bind(this.client);
    this.hsetnxAsync = promisify(this.client.hsetnx).bind(this.client);
    this.hdelAsync = promisify(this.client.hdel).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.evalAsync = promisify(this.client.eval).bind(this.client);
  }

  async init() {
    // Test
    await this.hsetnxAsync("0", "0", "0");
  }

  async lockAccount(accountId) {
    return await this.hsetnxAsync(accountId, "locked", true);
  }

  async unlockAccount(accountId) {
    await this.hdelAsync(accountId, "locked");
  }

  async lockOptimization(optimizationId, serverId, ttl) {
    // This redis function (lua) either
    // 1) Takes the lock if nobody else has it (returns true)
    // 2) Extends the lock ttl if the lock is already held by the server requesting it (returns true) or
    // 3) Returns false if the lock is owned by another server
    let result = await this.evalAsync(
      "local value = redis.call('get', KEYS[1]); if not value then redis.call('set', KEYS[1], ARGV[1], 'EX', ARGV[2]) return true elseif (value == ARGV[1]) then redis.call('expire', KEYS[1], ARGV[2]) return true else return false end",
      "1",
      "optlock:" + optimizationId,
      serverId,
      ttl
    );
    return result ? true : false;
  }

  async getAncestor(accountId, sessionId) {
    let stringData = await this.hgetAsync(accountId, "ancestor:" + sessionId);
    if (stringData) {
      var inflated = zlib
        .inflateSync(new Buffer(stringData, "base64"))
        .toString();
      return JSON.parse(inflated);
    }
    return null;
  }

  async setAncestor(accountId, sessionId, ancestor) {
    var deflated = zlib
      .deflateSync(JSON.stringify(ancestor))
      .toString("base64");
    this.hsetAsync(accountId, "ancestor:" + sessionId, deflated);
  }

  getSessionStore() {
    return new RedisStore({
      client: this.client
    });
  }
};
