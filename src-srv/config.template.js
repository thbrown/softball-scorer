/**
 * This is the server side configuration template. To add your own configuration, please copy this file and rename it to 'config.js'
 **/
module.exports = {
  app: {
    port: undefined
  },

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
    toFile: false,
    colorOff: false
  },

  email: {
    apiKey: undefined,
    domain: undefined,
    restrictEmailsToDomain: undefined
  },

  optimization: {
    port: undefined
  }
};
