// Setup for jest tests - provide node implementations for browser apis

const configAccessor = require('../config-accessor.js');

// localstorage - https://stackoverflow.com/questions/32911630/how-do-i-deal-with-localstorage-in-jest-tests
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = value.toString();
  }

  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();

// crypto - https://stackoverflow.com/questions/52612122/how-to-use-jest-to-test-functions-using-crypto-or-window-mscrypto
const crypto = require('crypto');
Object.defineProperty(global.self, 'crypto', {
  value: {
    // web crypto overrides the passed in array, node crypto returns a random array of the passed in length
    getRandomValues: function(arr) {
      let randomArray = new Uint8Array(crypto.randomBytes(arr.length));
      for (let i = 0; i < arr.length; i++) {
        arr[i] = randomArray[i];
      }
    },
  },
});

// authentication - allow tests to specify a sessionId that should be used for all fetch requests
let sessionCookie = null;
global.authenticate = function(sessionId) {
  sessionCookie = sessionId;
};

// fetch - use node-fetch module but make sure to augment requests with headers auth info is included if specified
global.fetch = function(url, opts) {
  if (sessionCookie) {
    if (!opts.headers) {
      opts.headers = {};
    }
    opts.headers.cookie = sessionCookie;
  }
  let nodeFetch = require('node-fetch');

  let fetch = nodeFetch(url, opts);
  return fetch;
};

// window location - origin is used by network.js
delete global.window.location;
global.window = Object.create(window);
global.window.location = {
  origin: `http://localhost:${configAccessor.getAppServerPort()}`,
};
