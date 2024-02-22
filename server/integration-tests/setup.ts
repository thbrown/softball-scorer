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
