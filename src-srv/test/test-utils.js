const got = require('got');
const configAccessor = require('../config-accessor');

let port = configAccessor.getAppServerPort();

exports.signup = async function(email, password, reCapcha) {
  try {
    const response = await got.post(
      `http://localhost:${port}/server/account/signup`,
      {
        body: {
          email: email,
          password: password,
          reCAPCHA: reCapcha ? reCapcha : '0',
        },
        json: true,
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

exports.login = async function(email, password) {
  try {
    var response = await got.post(
      `http://localhost:${port}/server/account/login`,
      {
        body: {
          email: email,
          password: password,
        },
        json: true,
      }
    );
  } catch (error) {
    throw error;
  }
  // Return the cookies (two of which are required for authentication)
  return response.headers['set-cookie'];
};

exports.deleteAccount = async function(sessionId) {
  try {
    const response = await got.delete(
      `http://localhost:${port}/server/account`,
      {
        headers: {
          cookie: sessionId,
        },
        json: true,
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

exports.sync = async function(sessionId, checksum, patch) {
  try {
    const response = await got.post(`http://localhost:${port}/server/sync`, {
      headers: {
        cookie: sessionId,
      },
      body: {
        checksum: checksum,
        patch: patch,
      },
      json: true,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

exports.randomId = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

exports.getInitialState = function() {
  return { teams: [], players: [], optimizations: [] };
};
