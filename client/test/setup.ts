// Setup for jest tests - provide node implementations for browser apis

// const configAccessor = require('../src/config-accessor.js');

// localstorage - https://stackoverflow.com/questions/32911630/how-do-i-deal-with-localstorage-in-jest-tests
class LocalStorageMock {
  store = {};

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

if (global.localStorage === undefined) {
  (global as any).localStorage = new LocalStorageMock();
}

// crypto - https://stackoverflow.com/questions/52612122/how-to-use-jest-to-test-functions-using-crypto-or-window-mscrypto
// const crypto = require('crypto');
import crypto from 'crypto';
Object.defineProperty(global.self, 'crypto', {
  value: {
    // web crypto overrides the passed in array, node crypto returns a random array of the passed in length
    getRandomValues: function (arr) {
      const randomArray = new Uint8Array(crypto.randomBytes(arr.length));
      for (let i = 0; i < arr.length; i++) {
        arr[i] = randomArray[i];
      }
    },
  },
});

// authentication - allow tests to specify a sessionId that should be used for all fetch requests
// There are two session IDs required for authentication. One is stored in an HTTPonly cookie to provide additional security against XSS.
// The other is stored in a javascript accessible cookie and it's used so we can logout when the user is offline (which is not possible with HTTP only cookies).
let authCookies = null;
global.authenticate = function (inputAuthCookies) {
  authCookies = inputAuthCookies;
};

// fetch - use node-fetch module but make sure to augment requests with headers auth info is included if specified
global.fetch = function (url, opts) {
  if (authCookies) {
    if (!opts.headers) {
      opts.headers = {};
    }
    opts.headers.cookie = authCookies;
  }
  const nodeFetch = require('node-fetch');

  const fetch = nodeFetch(url, opts);
  return fetch;
};

global.NoSleep = class NoSleepPolyfill {
  enable() {}
  disable() {}
};

// window location - origin is used by network.js
delete (global as any).window.location;
(global as any).window.location = {
  origin: `http://localhost:8888`,
};

// Webworkers - we'll need to actually make this fully featured to test web workers
class MockWorker {
  url = '';
  onmessage = () => {};
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }

  postMessage(msg) {
    //this.onmessage(msg);
  }

  terminate() {
    // Okay... I terminated
  }
}
(global as any).Worker = MockWorker;
