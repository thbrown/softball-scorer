/**
 * This is the server side configuration template. To use a custom configuration, please copy this file and rename it to 'config.js'
 * If there is no config.js file present during the build, the build porocess will copy this one for you.
 **/
module.exports = {
  app: {
    port: null,
    optimizationSweeperPeriod: null,
    optimizationLockTTL: null,
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

  // If you enable redis, but don't reset this, your sessions wont persist across app server restarts
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
    apiKey: null,
    domain: null,
    restrictEmailsToDomain: null,
  },

  optimization: {
    port: null,
  },

  optimizationCompute: {
    mode: 'local',
    params: null,
  },

  youtube: {
    apikey: null,
  },

  optimizerGallery: {
    definitionsUrl: null,
  },
};
