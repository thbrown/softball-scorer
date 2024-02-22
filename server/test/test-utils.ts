import got from 'got';
import * as configAccessor from '../src/config-accessor';
import { expect } from 'vitest';
import { SoftballServer } from '../src/softball-server';
import * as context from '../src/context';

const port = configAccessor.getAppServerPort();

export const signup = async function (
  email: string,
  password: string,
  reCapcha?: string
) {
  //eslint-disable-next-line no-useless-catch
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

export const login = async function (email, password) {
  let response: any;
  //eslint-disable-next-line no-useless-catch
  try {
    response = await got.post(`http://localhost:${port}/server/account/login`, {
      json: {
        email: email,
        password: password,
      },
    });
  } catch (error) {
    throw error;
  }
  // Return the cookies (two of which are required for authentication)
  // Example auth cookies:
  // nonHttpOnlyToken=c452105f-03e0-443c-b38f-4e9fdb2b3948; Path=/; Expires=Fri, 31 Dec 9999 23:46:40 GMT,
  // softball.sid=s%3AJsEPB3GsIFVhuqimV10B4KPZy08EZ4gi.yJOYkNbRvEBQ3xvLKKzJSfzQJCBbzavz0QzVXBeD9BE; Path=/; Expires=Fri, 31 Dec 9999 23:46:40 GMT; HttpOnly; SameSite=Lax
  const cookies = response.headers['set-cookie'];

  return cookies[0].split(';')[0] + '; ' + cookies[1].split(';')[0];
};

export const deleteAccount = async function (sessionCookies) {
  //eslint-disable-next-line no-useless-catch
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

export const sync = async function (
  sessionCookies: any,
  checksum: any,
  patch: any
) {
  //eslint-disable-next-line no-useless-catch
  try {
    const response = await got.post<any>(
      `http://localhost:${port}/server/sync`,
      {
        headers: {
          cookie: sessionCookies,
        },
        json: {
          checksum: checksum,
          patch: patch,
        },
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const performAndValidateSync = async function (activeState) {
  const beforeSyncCopy = JSON.stringify(activeState.getLocalState(), null, 2);
  const clientChecksum = activeState.getLocalStateChecksum();
  const responseStatus = await activeState.sync();
  expect(responseStatus).toEqual(200);

  // Strip server-side generated fields
  const teams = activeState.getLocalState().teams;
  if (teams) {
    for (let i = 0; i < teams.length; i++) {
      delete teams[i].publicId;
    }
  }
  delete activeState.getLocalState().account.accountId;
  delete activeState.getLocalState().account.balance;
  delete activeState.getLocalState().account.email;
  delete activeState.getLocalState().account.emailConfirmed;

  const serverChecksum = activeState.getLocalStateChecksum();
  const afterSyncCopy = JSON.stringify(activeState.getLocalState(), null, 2);

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

export const randomId = function (length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export const getInitialState = function () {
  return { account: {}, teams: [], players: [], optimizations: [] };
};

export const randomTestName = () => {
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

export const startServer = async () => {
  const port = configAccessor.getAppServerPort();
  const cache = await configAccessor.getCacheService();
  const email = await configAccessor.getEmailService();
  const databaseCalls = await configAccessor.getDatabaseService();
  const compute = await configAccessor.getOptimizationComputeService(
    databaseCalls,
    email
  );
  const server = new SoftballServer(port, databaseCalls, cache, compute);
  context.setServer(server);
  server.start();
};

export const stopServer = async () => {
  await context.getServer().stop();
  (await configAccessor.getDatabaseService()).disconnect();
};
