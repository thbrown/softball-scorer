/**
 * This is the server side configuration template. To add your own configuration, please copy this file and rename it to 'config.js'
 **/
module.exports = {
  app: {
    port: undefined,
    optimizationSweeperPeriod: undefined,
    optimizationLockTTL: undefined,
  },

  database: {
    host: null,
    port: null,
    username: null,
    password: null,
    database: null,
  },

  cache: {
    host: null,
    port: null,
    password: null,
  },

  session: {
    secretkey: null,
  },

  recapcha: {
    secretkey: null,
  },

  logging: {
    toFile: false,
    colorOff: false,
  },

  email: {
    apiKey: undefined,
    domain: undefined,
    restrictEmailsToDomain: undefined,
  },

  optimization: {
    port: undefined,
  },

  compute: {
    mode: 'local',
    params: null,
  },

  youtube: {
    apikey: undefined,
  },
};
