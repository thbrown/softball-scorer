/**
 * This is the server side configuration template. To add your own configuration, please copy this file and rename it to 'config.js'
 **/
module.exports = {
  database: {
    host: undefined,
    port: undefined,
    username: undefined,
    password: undefined
  },

  cache: {
    host: undefined,
    port: undefined,
    username: undefined,
    password: undefined
  },

  session: {
    secretkey: undefined
  },

  recapcha: {
    secretkey: undefined
  },

  logging: {
    logToFile: false
  },

  email: {
    apiKey: undefined,
    domain: undefined,
    allowAllDomains: false
  }
};
