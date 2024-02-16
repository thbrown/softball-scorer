/*eslint no-process-exit:*/
'use strict';

const configAccessor = require('../config-accessor.js');
const SoftballServer = require('../softball-server.js');
const {
  performAndValidateSync,
  randomId,
  signup,
  login,
  deleteAccount,
  randomTestName,
} = require('./test-utils.js');
const context = require('../context.js');
const SharedLib = require('../../shared-lib.js');
const {
  setGlobalStateRaw,
  getGlobalState,
  setGlobalState,
} = require('../../src/state.js');
const utils = SharedLib.commonUtils;

/**
 * This test requires an attached postgres database.
 * It runs through common sync cases to make sure there are no regressions prior to release.
 */
describe('sync', () => {
  let databaseCalls;
  let cache;
  let compute;
  let server;
  const sessionCookies = [];
  const sessionState = [];
  const NUM_SESSIONS = 1;
  beforeAll(async (done) => {
    const port = configAccessor.getAppServerPort();
    cache = await configAccessor.getCacheService();
    databaseCalls = await configAccessor.getDatabaseService(cache);
    compute = configAccessor.getOptimizationComputeService();
    server = new SoftballServer(port, databaseCalls, cache, compute);
    context.setServer(server);
    server.start();

    // Wait for services to start up (TODO: fix this)
    await new Promise((resolve) => setTimeout(resolve, 500));

    let email = `syncTest${randomId(10)}@softball.app`;
    let accountPassword = 'pizza';
    await signup(email, accountPassword);

    // Sign into that account several times
    for (let i = 0; i < NUM_SESSIONS; i++) {
      sessionCookies.push(await login(email, accountPassword));
    }

    done();
  });

  afterAll(async (done) => {
    try {
      await deleteAccount(sessionCookies[0]);
      await server.stop();

      // This isn't currently working for some reason (is this causing the open file handles after tests run?)
      await databaseCalls.disconnect();
    } catch (err) {
      console.error(`Something went wrong in afterAll ${err} ${err.stack}`);
      throw err;
    }
    done();
  });

  function chooseOperation() {
    const options = [
      'AddTeam',
      'AddGame',
      'AddPa',
      'AddPlayer',
      'RemoveTeam',
      'RemoveGame',
      'RemovePa',
      'RemovePlayer',
    ];

    // Adjust the weights based on your requirements
    const weights = [2, 11, 21, 4, 1, 10, 20, 1];

    // Calculate the total weight
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // Generate a random number within the total weight range
    const randomValue = Math.random() * totalWeight;

    // Find the corresponding option based on the random value
    let cumulativeWeight = 0;
    for (let i = 0; i < options.length; i++) {
      cumulativeWeight += weights[i];
      if (randomValue <= cumulativeWeight) {
        return options[i];
      }
    }

    // This should not happen, but return a default option if needed
    return options[0];
  }

  test.skip('Stochastic sync test', async () => {
    const teamIds = [];
    const playerIds = [];
    const gameIds = [];
    const paIds = [];
    const activeSession = 0;
    //const optIds = [];

    // Build list of cookies and state for each sessions
    for (let i = 0; i < NUM_SESSIONS; i++) {
      // eslint-disable-next-line no-undef
      authenticate(sessionCookies[i]); // global, see jest-setup.js
      //setGlobalState(null);
      await performAndValidateSync(getGlobalState());
      sessionState.push(getGlobalState());
    }

    for (let i = 0; i < 500; i++) {
      // Pick a random session to make the changes
      const sessionIndex = Math.floor(Math.random() * NUM_SESSIONS);
      // eslint-disable-next-line no-undef
      authenticate(sessionCookies[sessionIndex]); // global, see jest-setup.js
      setGlobalStateRaw(sessionState[sessionIndex]);

      // For debug
      await utils.sleep(1000);

      // Now pick what we are going to do
      const op = chooseOperation();
      switch (op) {
        case 'AddPlayer':
          console.log('Adding a player...');
          let player = getGlobalState().addPlayer(randomTestName(), 'F');
          playerIds.push(player.id);
          break;
        case 'AddTeam':
          console.log('Adding a team...');
          let team = getGlobalState().addTeam(randomTestName());
          teamIds.push(team.id);
          break;
        case 'AddGame':
          if (teamIds.length !== 0) {
            const rand = Math.random() * teamIds.length;
            const randomTeamId =
              teamIds[Math.floor(Math.random() * teamIds.length)];
            console.log('Adding a game...', randomTeamId, teamIds, rand);

            let game = getGlobalState().addGame(randomTeamId, randomTestName());
            gameIds.push(game.id);
          }
          break;
        case 'AddPa':
          if (gameIds.length !== 0 && playerIds.length !== 0) {
            const randomGameId =
              gameIds[Math.floor(Math.random() * gameIds.length)];
            const randomPlayerId =
              playerIds[Math.floor(Math.random() * playerIds.length)];
            console.log('Adding a PA...', randomGameId, randomPlayerId);
            getGlobalState().addPlateAppearance(randomPlayerId, randomGameId);
          }
          break;
        case 'RemoveTeam':
          //console.log('Removing a team...');
          // Add your logic for RemoveTeam here
          break;

        case 'RemoveGame':
          //console.log('Removing a game...');
          // Add your logic for RemoveGame here
          break;

        case 'RemovePa':
          //console.log('Removing a PA...');
          // Add your logic for RemovePa here
          break;

        default:
          //console.log('Invalid operation');
          // Add your default logic here if needed
          break;
      }

      // Maybe do a sync
      if (Math.random() < 0.2) {
        await performAndValidateSync(getGlobalState());
      }
    }

    // Sync all sessions
    for (let i = 0; i < NUM_SESSIONS; i++) {
      // eslint-disable-next-line no-undef
      authenticate(sessionCookies[i]); // global, see jest-setup.js
      setGlobalStateRaw(sessionState[i]);
      await performAndValidateSync(getGlobalState());
      sessionState.push(getGlobalState());
    }

    await performAndValidateSync(getGlobalState());

    console.log(
      'FINAL STATE',
      JSON.stringify(getGlobalState().LOCAL_DB_STATE_CONT, null, 2)
    );
  });
});
