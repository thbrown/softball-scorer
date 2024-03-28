import { promisify } from 'util';
import redis from 'redis';
import RedisStore from 'connect-redis';
import zlib from 'zlib';
import logger from './logger';
import { CacheService } from './service-types';

const LOCK_EXPIRATION_SEC = 20;
const CACHE_TTL_SEC = 8 * 24 * 60 * 60; // 8 days, should cover weekly usage

/**
 * This cache implementation uses redis to store sessions and data that must be shared between app servers
 *
 * Key format:
 *
 * sess:<session_id> - Session data persisted by express session redis module
 * cache:acct:<account_id>:* - Cached data scoped to an account (keys are invalidated manually during db writes)
 * ancestor:acct:<account_id>:sess:<session_id> - Save state tree holduing the last data this client received. Used to send diffs the the client to minimize network traffic.
 * lock:* - Lock on some object, the object then the objects id will be supplied
 */
export default class CacheCalls implements CacheService {
  client: any; // redis client

  hgetAsync: any;
  hsetAsync: any;
  hsetnxAsync: any;
  hdelAsync: any;
  setAsync: any;
  getAsync: any;
  expireAsync: any;
  delAsync: any;
  evalAsync: any;
  setexAsync: any;

  constructor(host: string, port: number, password: string) {
    this.client = redis.createClient({
      port: port,
      host: host,
      password: password,
      retry_strategy: function (options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          // End reconnecting on a specific error and flush all commands with
          // a individual error
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          // End reconnecting after a specific timeout and flush all commands
          // with a individual error
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          // End reconnecting with built in error
          return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      },
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

    this.client.on('error', function (err) {
      logger.error('sys', 'Redis Error - ' + err);
      process.exit(1);
    });

    this.client.on('ready', function () {
      logger.log('sys', 'Redis Ready');
    });

    this.client.on('connect', function () {
      logger.log('sys', 'Redis Connect');
    });

    this.client.on('reconnecting', function () {
      logger.warn('sys', 'Redis Reconnecting');
    });

    this.client.on('end', function () {
      logger.warn('sys', 'Redis End');
    });

    this.client.on('warning', function (warn) {
      logger.warn('sys', 'Redis Warning - ' + warn);
    });

    this.hgetAsync = promisify(this.client.hget).bind(this.client);
    this.hsetAsync = promisify(this.client.hset).bind(this.client);
    this.hsetnxAsync = promisify(this.client.hsetnx).bind(this.client);
    this.hdelAsync = promisify(this.client.hdel).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.expireAsync = promisify(this.client.expire).bind(this.client);
    this.evalAsync = promisify(this.client.eval).bind(this.client);
    this.setexAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  async init() {
    // Test
    await this.hsetnxAsync('0', '0', '0');
  }

  /**
   * We want an account lock that expires after some period of time just in case some event
   * (unaccounted for error condition, app server shutdown, etc..) doesn't leave the accoutn
   *  in a perminantly locked getGlobalState().
   */
  async lockAccount(accountId) {
    // This redis function (lua)
    // 1) Returns true if the key corresponding to the account id doesn't exist and puts the key in the cache
    // 2) Returns false if the key corresponding to the account id exists
    const result = await this.evalAsync(
      "local value = redis.call('get', KEYS[1]); if not value then redis.call('set', KEYS[1], 1, 'EX', ARGV[1]) return true else return false end",
      '1', // # of keys
      'lock:account:' + accountId, // KEYS[1]
      LOCK_EXPIRATION_SEC // ARGS[1]
    );
    return result ? true : false;
  }

  async unlockAccount(accountId) {
    await this.delAsync('lock:account:' + accountId);
  }

  async lockOptimization(optimizationId, serverId, ttl) {
    // This redis function (lua) either
    // 1) Takes the lock if nobody else has it (returns true)
    // 2) Extends the lock ttl if the lock is already held by the server requesting it (returns true) or
    // 3) Returns false if the lock is owned by another server
    const result = await this.evalAsync(
      "local value = redis.call('get', KEYS[1]); if not value then redis.call('set', KEYS[1], ARGV[1], 'EX', ARGV[2]) return true elseif (value == ARGV[1]) then redis.call('expire', KEYS[1], ARGV[2]) return true else return false end",
      '1', // # of keys
      'lock:optimization' + optimizationId, // KEYS[1]
      serverId, // ARGS[1]
      ttl // ARGS[2]
    );
    return result ? true : false;
  }

  async getAncestor(accountId, sessionId) {
    const stringData = await this.getAsync(
      `ancestor:acct:${accountId}:sess:${sessionId}`
    );
    if (stringData) {
      const inflated = zlib
        .inflateSync(Buffer.from(stringData, 'base64'))
        .toString();
      return JSON.parse(inflated);
    }
    return null;
  }

  async setAncestor(accountId, sessionId, ancestor) {
    const deflated = zlib
      .deflateSync(JSON.stringify(ancestor))
      .toString('base64');
    await this.setAsync(
      `ancestor:acct:${accountId}:sess:${sessionId}`,
      deflated
    );
  }

  async setCache(value, key, secondKey) {
    key = 'cache:' + key;
    if (secondKey) {
      // TODO: make this one command with lua or multi
      await this.hsetAsync(key, secondKey, value);
      await this.expireAsync(key, CACHE_TTL_SEC);
    } else {
      await this.setAsync(key, value, 'EX', CACHE_TTL_SEC);
    }
  }

  async getCache(key, secondKey) {
    key = 'cache:' + key;
    if (secondKey) {
      return await this.hgetAsync(key, secondKey);
    } else {
      return await this.getAsync(key);
    }
  }

  async deleteCache(key, secondKey) {
    key = 'cache:' + key;
    if (secondKey) {
      return await this.hdelAsync(key, secondKey);
    } else {
      return await this.delAsync(key);
    }
  }

  async resetCacheTTL(key) {
    key = 'cache:' + key;
    const result = await this.expireAsync(key, CACHE_TTL_SEC);
    return result;
  }

  async putDataTTL(key, ttl, value) {}

  // Intended for these to be private methods
  async getData(accountId, field) {}

  async putData(accountId, field, value) {}

  async deleteData(key, field) {}

  getSessionStore() {
    return new RedisStore({
      client: this.client,
    });
  }
}
