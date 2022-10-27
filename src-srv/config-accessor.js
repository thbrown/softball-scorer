const DatabaseCallsPostgres = require('./database-calls-postgres');
const DatabaseCallsStatic = require('./database-calls-static');
const DatabaseCallsFileSystem = require('./database-calls-file-system');

const CacheCallsRedis = require('./cache-calls-redis');
const CacheCallsLocal = require('./cache-calls-local');

const OptimizationComputeLocal = require('./optimization-compute-local');
const OptimizationComputeGcp = require('./optimization-compute-gcp');

const EmailLogOnly = require('./email-log-only');
const EmailMailgun = require('./email-mailgun');

const logger = require('./logger');

const crypto = require('crypto');
const e = require('express');

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
let optimizationCompute;

/**
 * Accessor utility for config values. This is responsible for setting defaults and handling nested json extraction.
 */
module.exports.getDatabaseService = function (cacheService) {
  if (database) {
    return database;
  }
  const mode = config.database.mode;

  if (!mode || mode === 'FileSystem') {
    database = new DatabaseCallsFileSystem('./database');
    return database;
  } else if (mode === 'Postgres') {
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
        cacheService,
        (err) => {
          if (err) {
            logger.error('sys', 'Encountered an error connecting to db', err);
            process.exit(1);
          }
          logger.log('sys', 'Connected to db.');
        }
      );
      return database;
    }
  }

  logger.warn('sys', 'Warning: running without database connection');
  database = new DatabaseCallsStatic();

  return database;
};

module.exports.getCacheService = function () {
  if (cache) {
    return cache;
  }
  const {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
  } = config.cache || {};
  if (redisHost && redisPort && redisPassword) {
    cache = new CacheCallsRedis(redisHost, redisPort, redisPassword);
  } else {
    logger.warn(null, 'Warning: running with local in-memory cache');
    cache = new CacheCallsLocal();
  }
  return cache;
};

module.exports.getEmailService = function () {
  if (email) {
    return email;
  }

  if (config.email && config.email.apiKey && config.email.domain) {
    if (config.email.restrictEmailsToDomain === false) {
      // If you want to allow emails to be sent outside of the softball.app domain, you must specifically supply false in the config
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

module.exports.getOptimizationComputeService = function (
  databaseService,
  emailService
) {
  if (optimizationCompute) {
    return optimizationCompute;
  }

  const computeMode = config.optimizationCompute
    ? config.optimizationCompute.mode
    : null;
  if (computeMode === 'local' || !computeMode) {
    logger.warn(
      null,
      'Warning: running with local optimization compute ' + computeMode
    );
    optimizationCompute = new OptimizationComputeLocal(
      databaseService,
      emailService
    );
  } else if (computeMode === 'gcp') {
    const gcpParams = config.optimizationCompute.params;
    optimizationCompute = new OptimizationComputeGcp(
      databaseService,
      emailService,
      gcpParams
    );
  } else {
    throw new Error(
      `Invalid optimizationCompute mode specified in src-srv/config.js: ${compute}`
    );
  }
  return optimizationCompute;
};

module.exports.getAppServerPort = function () {
  return (config.app && config.app.port) || 8888;
};

module.exports.getRecapchaSecretKey = function () {
  return (config && config.recapcha && config.recapcha.secretkey) || null;
};

module.exports.getSessionSecretKey = function () {
  return (
    (config.session && config.session.secretkey) ||
    crypto.randomBytes(20).toString('hex')
  );
};

module.exports.getOptimizerDefinitionUrl = function (optimizerId) {
  let url =
    (config.optimizerGallery && config.optimizerGallery.definitionsUrl) ||
    'https://optimizers.softball.app/definitions';
  return url + '/' + optimizerId + '.json';
};

module.exports.getYoutubeApiKey = function () {
  return (config && config.youtube && config.youtube.apikey) || undefined;
};

// Unused
module.exports.getAppOptimizationLockTTL = function () {
  return (config && config.app && config.app.optimizationLockTTL) || 30;
};

// Unused
module.exports.getAppOptimizationSweeperPeriod = function () {
  return (config && config.app && config.app.optimizationSweeperPeriod) || 120;
};

// Logger must access the config directly because it we can't require modules that use the logger before the logger is configured
/*
module.exports.getToFile = function() {
  return (config.logging && config.logging.toFile) || false;
};

module.exports.getColorOff = function() {
  return (config.logging && config.logging.colorOff) || true;
};
*/
