import DatabaseCallsFileSystem from './database-calls-file-system';
import DatabaseCallsGcpBuckets from './database-calls-gcp-buckets';
import CacheCallsRedis from './cache-calls-redis';
import CacheCallsMemory from './cache-calls-memory';
import CacheCallsGcpBuckets from './cache-calls-gcp-buckets';
import CacheCallsFileSystem from './cache-calls-file-system';
import OptimizationComputeLocal from './optimization-compute-local';
import OptimizationComputeGcp from './optimization-compute-gcp';
import EmailLogOnly from './email-log-only';
import { EmailMailGun } from './email-mailgun';
import logger from './logger';
import crypto from 'crypto';
import {
  CacheService,
  DatabaseService,
  EmailService,
  OptimizationComputeService,
} from './service-types';
import fs from 'fs';
import stripJsonComments from 'strip-json-comments';
import path from 'path';

export interface Config {
  app: {
    port: null | number;
    optimizationSweeperPeriod: null | number;
    optimizationLockTTL: null | number;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    mode?: 'FileSystem' | 'GcpBuckets';
    bucketNames?: any;
  };
  cache: {
    host: null | string;
    port: null | number;
    password: null | string;
    mode: 'FileSystem' | 'GcpBuckets' | 'Redis' | 'Memory';
    bucketNames?: any;
  };
  session: {
    secretkey: null | string;
  };
  recapcha: {
    secretkey: null | string;
  };
  logging: {
    toFile: boolean;
    colorOff: boolean;
  };
  email: {
    apiKey: null | string;
    domain: null | string;
    restrictEmailsToDomain: null | false | string;
  };
  optimization: {
    port: null | number;
  };
  optimizationCompute: {
    mode: 'local' | string;
    params: null | any;
  };
  youtube: {
    apikey: null | string;
  };
  optimizerGallery: {
    definitionsUrl: null | string;
  };
}

// Services are singletons, multiple calls should return the same service
let database: DatabaseService | null = null;
let cache: CacheService | null = null;
let email: EmailService | null = null;
let optimizationCompute: OptimizationComputeService | null = null;

let _config: Config | null = null;

export const loadConfig = function () {
  const configPath = path.resolve(__dirname, '../config.json');
  try {
    _config = JSON.parse(
      stripJsonComments(fs.readFileSync(configPath).toString())
    );
  } catch (e) {
    console.error(e);
    console.log(`Error: No ${configPath} file is present.`);
    process.exit(1);
  }
};

export const getConfig = function (): Config {
  if (!_config) {
    loadConfig();
  }
  return _config as Config;
};

/**
 * Accessor utility for config values. This is responsible for setting defaults and handling nested json extraction.
 */
export const getDatabaseService = async function () {
  if (database) {
    return database;
  }
  const mode = getConfig()?.database?.mode;
  if (mode === 'FileSystem') {
    return new DatabaseCallsFileSystem('./database');
  } else if (mode === 'GcpBuckets') {
    const { data, emailLookup, tokenLookup, publicIdLookup } =
      getConfig().database.bucketNames;
    database = new DatabaseCallsGcpBuckets(
      data,
      emailLookup,
      tokenLookup,
      publicIdLookup
    );
    await database.init();
  } else {
    logger.warn(
      '',
      'Warning: undefined config, running with local filesystem database'
    );
    return new DatabaseCallsFileSystem('./database');
  }
  return database;
};

export const getCacheService = async function () {
  if (cache) {
    return cache;
  }

  const config = getConfig();

  const mode = config?.cache?.mode;
  if (mode === 'GcpBuckets') {
    const { session, ancestor } = config.cache.bucketNames;
    cache = new CacheCallsGcpBuckets(session, ancestor);
    await cache.init();
  } else if (mode === 'Redis') {
    const {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
    } = config.cache || {};
    if (redisHost && redisPort && redisPassword) {
      cache = new CacheCallsRedis(redisHost, redisPort, redisPassword);
    } else {
      throw new Error('Missing required redis config info');
    }
  } else if (mode === 'Memory') {
    cache = new CacheCallsMemory();
  } else {
    cache = new CacheCallsFileSystem();
    logger.warn(
      '',
      'Warning: undefined config, running with file-system cache'
    );
  }

  return cache;
};

export const getEmailService = async function () {
  if (email) {
    return email;
  }

  const config = getConfig();

  if (config.email && config.email.apiKey && config.email.domain) {
    if (config.email.restrictEmailsToDomain === false) {
      // If you want to allow emails to be sent outside of the softball.app domain, you must specifically supply false in the config
      email = new EmailMailGun(config.email.apiKey, config.email.domain, '');
    } else if (config.email.restrictEmailsToDomain) {
      email = new EmailMailGun(
        config.email.apiKey,
        config.email.domain,
        config.email.restrictEmailsToDomain
      );
    } else {
      // Default to only allowing emails to softball.app
      email = new EmailMailGun(
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

export const getOptimizationComputeService = async function (
  databaseService: DatabaseService,
  emailService: EmailService
) {
  if (optimizationCompute) {
    return optimizationCompute;
  }

  const config = getConfig();

  const computeMode = config?.optimizationCompute?.mode;
  if (computeMode === 'local' || !computeMode) {
    logger.warn(
      '',
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
      `Invalid optimizationCompute mode specified in config.json: ${computeMode}`
    );
  }
  return optimizationCompute;
};

export const getUpdateUrl = function () {
  return (
    getConfig().optimizationCompute?.params?.updateUrl ||
    `http://localhost:${getAppServerPort()}/server/update-optimization`
  );
};

export const getOptParams = function () {
  return getConfig().optimizationCompute?.params || {};
};

export const getAppServerPort = function () {
  return (getConfig().app && getConfig().app.port) || 8888;
};

export const getRecapchaSecretKey = function () {
  return getConfig().recapcha.secretkey || null;
};

export const getSessionSecretKey = function () {
  return (
    getConfig().session.secretkey || crypto.randomBytes(20).toString('hex')
  );
};

export const getOptimizerDefinitionUrl = function (optimizerId) {
  const url =
    getConfig().optimizerGallery.definitionsUrl ||
    'https://optimizers.softball.app/definitions';
  return url + '/' + optimizerId + '.json';
};

export const getYoutubeApiKey = function () {
  return getConfig().youtube.apikey || undefined;
};

// Unused
export const getAppOptimizationLockTTL = function () {
  return getConfig().app.optimizationLockTTL || 30;
};

// Unused
export const getAppOptimizationSweeperPeriod = function () {
  return getConfig().app.optimizationSweeperPeriod || 120;
};

// Logger must access the config directly because it we can't require modules that use the logger before the logger is configured
/*
export const getToFile = function() {
  return (config.logging && config.logging.toFile) || false;
};

export const getColorOff = function() {
  return (config.logging && config.logging.colorOff) || true;
};
*/
