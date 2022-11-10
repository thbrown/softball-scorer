/*eslint no-process-exit:*/
'use strict';

const configAccessor = require('../config-accessor.js');
const SoftballServer = require('../softball-server');
const utils = require('./test-utils.js');

describe('sync', () => {
  let databaseCalls;
  let compute;
  let cache;
  let server;

  beforeAll(async (done) => {
    const port = configAccessor.getAppServerPort();
    cache = configAccessor.getCacheService();
    databaseCalls = await configAccessor.getDatabaseService(cache);
    compute = configAccessor.getOptimizationComputeService();
    server = new SoftballServer(port, databaseCalls, cache, compute);
    server.start();
    done();
  });

  afterAll(async (done) => {
    await server.stop();
    await databaseCalls.disconnect();
    done();
  });

  test('Test account lifecycle', async () => {
    let email = `lifecycleTest${utils.randomId(10)}@softball.app`;
    let password = 'pizza';

    // Signup
    await utils.signup(email, password);

    // Login
    let sessionId = await utils.login(email, password);

    // Delete
    await utils.deleteAccount(sessionId);
  });
});
