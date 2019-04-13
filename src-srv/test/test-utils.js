const got = require("got");
const hasher = require("object-hash");

exports.signup = async function(email, password, reCapcha) {
  try {
    const response = await got.post(
      "http://localhost:8888/server/account/signup",
      {
        body: {
          email: email,
          password: password,
          reCAPCHA: reCapcha ? reCapcha : "0"
        },
        json: true
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
      "http://localhost:8888/server/account/login",
      {
        body: {
          email: email,
          password: password
        },
        json: true
      }
    );
  } catch (error) {
    throw error;
  }
  // Return the session id
  return response.headers["set-cookie"][0].split(";")[0];
};

exports.deleteAccount = async function(sessionId) {
  try {
    const response = await got.delete("http://localhost:8888/server/account", {
      headers: {
        cookie: sessionId
      },
      json: true
    });
    return response;
  } catch (error) {
    throw error;
  }
};

exports.sync = async function(sessionId, checksum, patch) {
  try {
    const response = await got.post("http://localhost:8888/server/sync", {
      headers: {
        cookie: sessionId
      },
      body: {
        md5: checksum,
        patch: patch
      },
      json: true
    });
    return response;
  } catch (error) {
    throw error;
  }
};

exports.randomId = function(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

exports.getMd5 = function(data) {
  let checksum = hasher(data, {
    algorithm: "md5",
    excludeValues: false,
    respectFunctionProperties: false,
    respectFunctionNames: false,
    respectType: false,
    encoding: "base64"
  });
  return checksum.slice(0, -2); // Remove trailing '=='
};

exports.getInitialState = function() {
  return { teams: [], players: [], optimizations: [] };
};
