/*eslint no-process-exit:*/
'use strict';

const configAccessor = require('../config-accessor');
const SoftballServer = require('../softball-server');
const testUtils = require('./test-utils.js');
const state = require('../../src/getGlobalState().js').default;
const context = require('../context');
const SharedLib = require('../../shared-lib');
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
  let sessionCookies;
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

    let email = `syncTest${testUtils.randomId(10)}@softball.app`;
    let accountPassword = 'pizza';
    await testUtils.signup(email, accountPassword);

    sessionCookies = await testUtils.login(email, accountPassword);
    authenticate(sessionCookies); // global, see jest-setup.js
    done();
  });

  afterAll(async (done) => {
    try {
      await testUtils.deleteAccount(sessionCookies);
      await server.stop();

      // This isn't currently working for some reason (is this causing the open file handles after tests run?)
      await databaseCalls.disconnect();
    } catch (err) {
      console.error(`Something went wrong in afterAll ${err} ${err.stack}`);
      throw err;
    }
    done();
  });

  let performAndValidateSync = async function (activeState) {
    let beforeSyncCopy = JSON.stringify(
      getGlobalState().getLocalState(),
      null,
      2
    );
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
    let afterSyncCopy = JSON.stringify(
      getGlobalState().getLocalState(),
      null,
      2
    );

    if (clientChecksum !== serverChecksum) {
      // Checksums don't care about ordering, so they are the definitive answer
      // If those don't match, we'll compare the strings to see what's actually different
      console.log('Pre', beforeSyncCopy);
      console.log('Post', afterSyncCopy);
      console.log('Checksums', serverChecksum, clientChecksum);
      expect(utils.sortJson(JSON.parse(afterSyncCopy))).toEqual(
        utils.sortJson(JSON.parse(beforeSyncCopy))
      );
    }

    console.log('Sync assertions successful');
  };

  test('Sync - Players', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(state);

    // Create
    let player = getGlobalState().addPlayer(`Mary`, 'F');
    await performAndValidateSync(state);

    // Edit
    let updatedPlayer = JSON.parse(JSON.stringify(player));
    updatedPlayer.name = 'HailMary';
    getGlobalState().replacePlayer(player.id, updatedPlayer);
    await performAndValidateSync(state);

    // Delete
    getGlobalState().removePlayer(updatedPlayer.id);
    await performAndValidateSync(state);
  });

  test('Sync - Team', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(state);

    // Create
    let team = getGlobalState().addTeam('BigTeam');
    await performAndValidateSync(state);

    // Edit
    let updatedTeam = JSON.parse(JSON.stringify(team));
    updatedTeam.name = 'ReallyBigTeam';
    getGlobalState().replaceTeam(team.id, updatedTeam);
    await performAndValidateSync(state);

    // Delete
    getGlobalState().removeTeam(updatedTeam.id);
    await performAndValidateSync(state);
  });

  test('Sync - Game', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(state);

    // Create
    let team = getGlobalState().addTeam('BigTeam');
    let game = getGlobalState().addGame(team.id, 'BadGuys');

    // Edit
    let updatedGame = JSON.parse(JSON.stringify(game));
    updatedGame.opponent = 'ActuallyTheseBadGuys';
    getGlobalState().replaceGame(updatedGame.id, team.id, updatedGame);
    await performAndValidateSync(state);

    // Delete
    getGlobalState().removeGame(updatedGame.id);
    await performAndValidateSync(state);
  });

  test('Sync - Lineups', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(state);

    let players = [];

    // Create
    let team = getGlobalState().addTeam('BigTeam');
    let game = getGlobalState().addGame(team.id, 'BadGuys');
    for (let i = 0; i < 10; i++) {
      let player = getGlobalState().addPlayer(`player${i}`, 'F');
      getGlobalState().addPlayerToLineup(game.id, player.id);
      players.push(player);
    }

    // Edit -> remove players
    getGlobalState().removePlayerFromLineup(game.id, players[2].id);
    getGlobalState().removePlayerFromLineup(game.id, players[4].id);
    getGlobalState().removePlayerFromLineup(game.id, players[5].id);
    getGlobalState().removePlayerFromLineup(game.id, players[9].id);
    await performAndValidateSync(state);

    // Edit -> add players
    for (let i = 0; i < 4; i++) {
      let player = getGlobalState().addPlayer(`addedPlayer${i}`, 'F');
      getGlobalState().addPlayerToLineup(game.id, player.id);
      getGlobalState().updateLineup(game.id, player.id, i * 2);
    }
    await performAndValidateSync(state);

    // Edit -> re-order
    getGlobalState().updateLineup(game.id, players[0].id, 1);
    getGlobalState().updateLineup(game.id, players[1].id, 3);
    getGlobalState().updateLineup(game.id, players[3].id, 4);
    getGlobalState().updateLineup(game.id, players[6].id, 5);
    getGlobalState().updateLineup(game.id, players[7].id, 6);
    await performAndValidateSync(state);
  });

  test('Sync - Plate Appearances', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(state);

    let players = [];
    let pas = [];

    // Create
    let team = getGlobalState().addTeam('BigTeam');
    let game = getGlobalState().addGame(team.id, 'BadGuys');
    for (let i = 0; i < 5; i++) {
      let player = getGlobalState().addPlayer(`player${i}`, 'F');
      getGlobalState().addPlayerToLineup(game.id, player.id);
      players.push(player);
      for (let j = 0; j < 2; j++) {
        let pa = getGlobalState().addPlateAppearance(player.id, game.id);
        pa.result = 'Out';
        pa.location = {
          x: 12141,
          y: 12141,
        };
        pas.push(pa);
      }
    }
    await performAndValidateSync(state);

    // Edit
    let replacementPa = JSON.parse(
      JSON.stringify(getGlobalState().getPlateAppearance(pas[1].id))
    );
    replacementPa.result = '2B';
    getGlobalState().replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );

    replacementPa = JSON.parse(
      JSON.stringify(getGlobalState().getPlateAppearance(pas[2].id))
    );
    replacementPa.result = null;
    getGlobalState().replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );

    replacementPa = JSON.parse(
      JSON.stringify(getGlobalState().getPlateAppearance(pas[3].id))
    );
    replacementPa.location = {
      x: null,
      y: null,
    };
    getGlobalState().replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );

    replacementPa = JSON.parse(
      JSON.stringify(getGlobalState().getPlateAppearance(pas[6].id))
    );
    replacementPa.location = {
      x: 1000,
      y: 3000,
    };
    getGlobalState().replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );
    await performAndValidateSync(state);

    // Delete
    getGlobalState().removePlateAppearance(pas[8].id, game.id);
    await performAndValidateSync(state);
  });

  // TODO: Optimizations
  /*
  test("Sync - Optimizations", async () => {

  });
  */

  test('Ordering - This query includes both deletes and and insert, this tests to makes sure the resulting querys are sorted and performed in the right order', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(state);

    // Add a bunch of initial data
    let team = getGlobalState().addTeam('BigTeam');
    let game = getGlobalState().addGame(team.id, 'BadGuys');
    let players = [];
    for (let i = 0; i < 5; i++) {
      let player = getGlobalState().addPlayer(`player${i}`, 'F');
      getGlobalState().addPlayerToLineup(game.id, player.id);
      players.push(player);
    }

    await performAndValidateSync(state);

    // Blow away the old data for some new data
    getGlobalState().removeGame(game.id);
    getGlobalState().removeTeam(team.id);
    for (let i = 0; i < 5; i++) {
      getGlobalState().removePlayer(players[i].id);
    }
    getGlobalState().addTeam('Actually this team');
    await performAndValidateSync(state);
  });
});
