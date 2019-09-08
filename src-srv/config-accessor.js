const DatabaseCallsPostgres = require('./database-calls-postgres');
const DatabaseCallsStatic = require('./database-calls-static');
const CacheCallsRedis = require('./cache-calls-redis');
const CacheCallsLocal = require('./cache-calls-local');
const ComputeGCP = require('./compute-gcp');
const ComputeLocal = require('./compute-local');
const ComputeNone = require('./compute-none');
const EmailLogOnly = require('./email-log-only');
const EmailMailgun = require('./email-mailgun');

const logger = require('./logger');

const crypto = require('crypto');

let config = null;
try {
  config = require('./config.js');
} catch (e) {
  console.log('Error: No ./src-srv/config.js file is present.');
  process.exit(1);
}

// Services are singletons, mutliple calls should return the same service (TODO: evaluate - we are relying on require returning a singleton)
let database;
let cache;
let email;
let compute;

/**
 * Accessor utility for config values. This is responsible for setting defaults and handling nested json extraction.
 */
module.exports.getDatabaseService = function() {
  if (database) {
    return database;
  }
  const {
    host: pghost,
    port: pgport,
    username: pgusername,
    password: pgpassword,
    database: pgdatabase,
  } = config.database || {};
  if (pghost && pgport && pgusername && pgpassword) {
    database = new DatabaseCallsPostgres(
      pghost,
      pgport,
      pgusername,
      pgpassword,
      pgdatabase,
      err => {
        if (err) {
          logger.log('sys', 'Encountered an error connecting to db', err);
          process.exit(1);
        }
        logger.log('sys', 'Connected to db.');
      }
    );
  } else {
    logger.warn('sys', 'Warning: running without database connection');
    database = new DatabaseCallsStatic();
  }
  return database;
};

module.exports.getCacheService = function() {
  if (cache) {
    return cache;
  }
  const { host: redisHost, port: redisPort, password: redisPassword } =
    config.cache || {};
  if (redisHost && redisPort && redisPassword) {
    cache = new CacheCallsRedis(redisHost, redisPort, redisPassword);
  } else {
    logger.warn(null, 'Warning: running with local in-memory cache');
    cache = new CacheCallsLocal();
  }
  return cache;
};

module.exports.getEmailService = function() {
  if (email) {
    return email;
  }

  if (config.email && config.email.apiKey && config.email.domain) {
    if (config.email.restrictEmailsToDomain === false) {
      // If you want to allow emails to be sent outside of the softball.app domain, you must spicifically supply false in the config
      email = new EmailMailgun(config.email.apiKey, config.email.domain, false);
    } else if (config.email.restrictEmailsToDomain) {
      email = new EmailMailgun(
        config.email.apiKey,
        config.email.domain,
        config.email.restrictEmailsToDomain
      );
    } else {
      // Default to only allowing emails to softball.app
      email = new EmailMailgun(
        config.email.apiKey,
        config.email.domain,
        'softball.app'
      );
    }
  } else {
    email = new EmailLogOnly();
  }

  return email;
};

module.exports.getComputeService = function() {
  if (compute) {
    return compute;
  }

  const computeMode = config.compute ? config.compute.mode : null;
  if (computeMode === 'local' || !computeMode) {
    logger.warn(null, 'Warning: running with local compute');
    compute = new ComputeLocal();
  } else if (computeMode === 'none') {
    logger.warn(null, 'Warning: running with no-op compute');
    compute = new ComputeNone();
  } else if (computeMode === 'gcp') {
    const gcpParams = config.compute.params;
    compute = new ComputeGCP(gcpParams);
  } else {
    throw new Error(
      `Invalid compute mode specified in src-srv/config.js: ${compute}`
    );
  }
  return compute;
};

module.exports.getAppServerPort = function() {
  return (config.app && config.app.port) || 8888;
};

module.exports.getOptimizationServerPort = function() {
  return (config.optimization && config.optimization.port) || 8414;
};

module.exports.getRecapchaSecretKey = function() {
  return (config && config.recapcha && config.recapcha.secretkey) || null;
};

module.exports.getSessionSecretKey = function() {
  return (
    (config.session && config.session.secretkey) ||
    crypto.randomBytes(20).toString('hex')
  );
};

module.exports.getAppOptimizationLockTTL = function() {
  return (config && config.app && config.app.optimizationLockTTL) || 30;
};

module.exports.getAppOptimizationSweeperPeriod = function() {
  return (config && config.app && config.app.optimizationSweeperPeriod) || 120;
};

// Logger must access the config directly because it we can't require modules that use the logger beofre the logger is configured
/*
module.exports.getToFile = function() {
  return (config.logging && config.logging.toFile) || false;
};

module.exports.getColorOff = function() {
  return (config.logging && config.logging.colorOff) || true;
};
*/
