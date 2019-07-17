/*eslint no-process-exit:*/
'use strict';

const configAccessor = require('./config-accessor');
const objectHash = require('object-hash');
const got = require('got');

const CacheCallsLocal = require('../cache-calls-local');
const ComputeLocal = require('./compute-local');
const SoftballServer = require('../softball-server');
const MockDb = require('./database-calls-mock');
const utils = require('./test-utils.js');

describe('sync', () => {
  beforeAll(async () => {
    const port = configAccessor.getAppServerPort();

    this.mockDb = new MockDb();
    this.cache = configAccessor.getCacheService();
    this.compute = configAccessor.getComputeService();
    this.server = new SoftballServer(
      port,
      this.mockDb,
      this.cache,
      this.compute
    );
    this.server.start();
    this.sessionId = await utils.login('brutongaster@softball.app', 'pizza');
  });

  beforeEach(() => {
    this.mockDb.reset();
  });

  afterAll(() => {
    this.server.stop();
  });

  test('Test sync of fresh data results in the same hash on the server and the client', async () => {
    let state = {
      players: [],
      teams: [
        {
          games: [
            {
              plateAppearances: [],
              id: '3KpWNATXYZk4YqDwq22BNI',
              opponent: 'TestGame',
              date: 1540166400,
              park: 'Stazio',
              lineup: [],
            },
          ],
          id: '4KpWNATXYZk4YqDwq22BNI',
          name: 'TestTeam',
        },
      ],
    };

    let expectedHash = utils.getMd5(state);

    this.mockDb.setState(state);

    let serverMd5;
    const response = await utils.sync(this.sessionId, '-', {});
    serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(expectedHash);
    expect(serverMd5).toEqual('jVBQly9W0N1pfUASFpRmPg');
  });
});
