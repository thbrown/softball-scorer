/*eslint no-process-exit:*/
'use strict';

const configAccessor = require('../config-accessor.js');
const SoftballServer = require('../softball-server');
const utils = require('./test-utils.js');
const objectMerge = require('../../object-merge.js');

describe('sync', () => {
  let databaseCalls;
  let compute;
  let cache;
  let server;

  beforeAll(async () => {
    const port = configAccessor.getAppServerPort();
    const optPort = configAccessor.getOptimizationServerPort();
    cache = configAccessor.getCacheService();
    databaseCalls = configAccessor.getDatabaseService(cache);
    compute = configAccessor.getComputeService();
    server = new SoftballServer(port, optPort, databaseCalls, cache, compute);
    server.start();
  });

  afterAll(() => {
    server.stop();
    databaseCalls.disconnect();
  });

  test('Test account lifecycle', async () => {
    let email = `lifecycleTest${utils.randomId(10)}@softball.app`;
    let password = 'pizza';

    // Signup
    await utils.signup(email, password);

    // Login
    let sessionId = await utils.login(email, password);

    console.log(sessionId);

    // Delete
    await utils.deleteAccount(sessionId);
  });
});
