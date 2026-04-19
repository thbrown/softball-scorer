// Prevent @testing-library/react from unmounting renders between tests so that
// tests sharing a wrapper across beforeAll/it blocks continue to work.
process.env['RTL_SKIP_AUTO_CLEANUP'] = 'true';

import { beforeEach } from 'vitest';

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

// happy-dom's requestAnimationFrame doesn't guard against undefined callbacks either.
(global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
  if (typeof cb === 'function') setTimeout(cb, 0);
  return 0;
};

global.NoSleep = class NoSleepPolyfill {
  enable() {}
  disable() {}
};

// window location - origin is used by network.js
delete (global as any).window.location;
(global as any).window.location = {
  origin: `http://localhost:8888`,
  pathname: '/',
};

// happy-dom dispatches popstate on history mutations (replaceState / pushState).
// actions/route.ts registers window.onpopstate = () => setRoute(pathname), which
// resets the React router state whenever the optimization card calls editQueryObject
// (accordion open/close triggers replaceState for query-param tracking).
// Routing in this app is driven by expose.set_state('router'), not browser history,
// so we can safely make replaceState a no-op and suppress popstate entirely.
// Must run in beforeEach so it re-applies after each test's module-level side-effects.
beforeEach(() => {
  // Suppress popstate so replaceState-based query tracking doesn't reset the route.
  (global as any).window.onpopstate = () => {};
  // Also neutralize replaceState itself — it's only used for accordion query params
  // which are not relevant in the test environment.
  if ((global as any).window.history?.replaceState) {
    (global as any).window.history.replaceState = () => {};
  }
});

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
