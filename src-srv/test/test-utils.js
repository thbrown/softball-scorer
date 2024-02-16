const got = require('got');
const configAccessor = require('../config-accessor');

let port = configAccessor.getAppServerPort();

exports.signup = async function (email, password, reCapcha) {
  try {
    const response = await got.post(
      `http://localhost:${port}/server/account/signup`,
      {
        json: {
          email: email,
          password: password,
          reCAPCHA: reCapcha ? reCapcha : '0',
        },
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

exports.login = async function (email, password) {
  try {
    var response = await got.post(
      `http://localhost:${port}/server/account/login`,
      {
        json: {
          email: email,
          password: password,
        },
      }
    );
  } catch (error) {
    throw error;
  }
  // Return the cookies (two of which are required for authentication)
  // Example auth cookies:
  // nonHttpOnlyToken=c452105f-03e0-443c-b38f-4e9fdb2b3948; Path=/; Expires=Fri, 31 Dec 9999 23:46:40 GMT,
  // softball.sid=s%3AJsEPB3GsIFVhuqimV10B4KPZy08EZ4gi.yJOYkNbRvEBQ3xvLKKzJSfzQJCBbzavz0QzVXBeD9BE; Path=/; Expires=Fri, 31 Dec 9999 23:46:40 GMT; HttpOnly; SameSite=Lax
  let cookies = response.headers['set-cookie'];

  return cookies[0].split(';')[0] + '; ' + cookies[1].split(';')[0];
};

exports.deleteAccount = async function (sessionCookies) {
  try {
    const response = await got.delete(
      `http://localhost:${port}/server/account`,
      {
        headers: {
          cookie: sessionCookies,
        },
        json: {
          nothing: '', // Can we remove this?
        },
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

exports.sync = async function (sessionCookies, checksum, patch) {
  try {
    const response = await got.post(`http://localhost:${port}/server/sync`, {
      headers: {
        cookie: sessionCookies,
      },
      json: {
        checksum: checksum,
        patch: patch,
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

exports.performAndValidateSync = async function (activeState) {
  let beforeSyncCopy = JSON.stringify(activeState.getLocalState(), null, 2);
  let clientChecksum = activeState.getLocalStateChecksum();
  let responseStatus = await activeState.sync();
  expect(responseStatus).toEqual(200);

  // Strip server-side generated fields
  let teams = activeState.getLocalState().teams;
  if (teams) {
    for (let i = 0; i < teams.length; i++) {
      delete teams[i].publicId;
    }
  }
  delete activeState.getLocalState().account.accountId;
  delete activeState.getLocalState().account.balance;
  delete activeState.getLocalState().account.email;
  delete activeState.getLocalState().account.emailConfirmed;

  let serverChecksum = activeState.getLocalStateChecksum();
  let afterSyncCopy = JSON.stringify(activeState.getLocalState(), null, 2);

  if (clientChecksum !== serverChecksum) {
    // Checksums don't care about ordering, so they are the definitive answer
    // If those don't match, we'll compare the strings to see what's actually different
    console.log('Pre', beforeSyncCopy);
    console.log('Post', afterSyncCopy);
    console.log('Checksums', serverChecksum, clientChecksum);
    expect(exports.sortJson(JSON.parse(afterSyncCopy))).toEqual(
      exports.sortJson(JSON.parse(beforeSyncCopy))
    );
  }

  console.log('Sync assertions successful');
};

exports.randomId = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

exports.getInitialState = function () {
  return { account: {}, teams: [], players: [], optimizations: [] };
};

exports.randomTestName = () => {
  const words = [
    'apple',
    'happy',
    'cloud',
    'dream',
    'music',
    'tiger',
    'lucky',
    'dance',
    'grape',
    'smile',
    'beach',
    'magic',
    'jazz',
    'laugh',
    'swift',
    'zebra',
    'toast',
    'wings',
    'piano',
    'fairy',
  ];

  // Select three random words from the array
  const randomWords = Array.from(
    { length: 3 },
    () => words[Math.floor(Math.random() * words.length)]
  );

  // Join the selected words with "-"
  const randomName = randomWords.join('-');

  return randomName;
};
