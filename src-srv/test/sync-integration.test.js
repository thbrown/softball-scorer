/*eslint no-process-exit:*/
'use strict';

const configAccessor = require('../config-accessor');
const SoftballServer = require('../softball-server');
const getGlobalState = require('../../src/state.js').getGlobalState;
const context = require('../context');
const SharedLib = require('../../shared-lib');
const utils = SharedLib.commonUtils;
const {
  performAndValidateSync,
  randomId,
  signup,
  login,
  deleteAccount,
  randomTestName,
} = require('./test-utils.js');

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

    // Wait for server to start up (TODO: fix this)
    await new Promise((resolve) => setTimeout(resolve, 500));

    let email = `syncTest${randomId(10)}@softball.app`;
    let accountPassword = 'pizza';
    await signup(email, accountPassword);

    sessionCookies = await login(email, accountPassword);
    // eslint-disable-next-line no-undef
    authenticate(sessionCookies); // global, see jest-setup.js
    done();
  });

  afterAll(async (done) => {
    try {
      await deleteAccount(sessionCookies);
      await server.stop();

      // This isn't currently working for some reason (is this causing the open file handles after tests run?)
      await databaseCalls.disconnect();
    } catch (err) {
      console.error(`Something went wrong in afterAll ${err} ${err.stack}`);
      throw err;
    }
    done();
  });

  test('Sync - Players', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Create
    let player = getGlobalState().addPlayer(`Mary`, 'F');
    await performAndValidateSync(getGlobalState());

    // Edit
    let updatedPlayer = JSON.parse(JSON.stringify(player));
    updatedPlayer.name = 'HailMary';
    getGlobalState().replacePlayer(player.id, updatedPlayer);
    await performAndValidateSync(getGlobalState());

    // Delete
    getGlobalState().removePlayer(updatedPlayer.id);
    await performAndValidateSync(getGlobalState());
  });

  test('Sync - Team', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Create
    let team = getGlobalState().addTeam('BigTeam');
    await performAndValidateSync(getGlobalState());

    // Edit
    let updatedTeam = JSON.parse(JSON.stringify(team));
    updatedTeam.name = 'ReallyBigTeam';
    getGlobalState().replaceTeam(team.id, updatedTeam);
    await performAndValidateSync(getGlobalState());

    // Delete
    getGlobalState().removeTeam(updatedTeam.id);
    await performAndValidateSync(getGlobalState());
  });

  test('Sync - Game', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Create
    let team = getGlobalState().addTeam('BigTeam');
    let game = getGlobalState().addGame(team.id, 'BadGuys');

    // Edit
    let updatedGame = JSON.parse(JSON.stringify(game));
    updatedGame.opponent = 'ActuallyTheseBadGuys';
    getGlobalState().replaceGame(updatedGame.id, team.id, updatedGame);
    await performAndValidateSync(getGlobalState());

    // Delete
    getGlobalState().removeGame(updatedGame.id);
    await performAndValidateSync(getGlobalState());
  });

  test('Sync - Lineups', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

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
    await performAndValidateSync(getGlobalState());

    // Edit -> add players
    for (let i = 0; i < 4; i++) {
      let player = getGlobalState().addPlayer(`addedPlayer${i}`, 'F');
      getGlobalState().addPlayerToLineup(game.id, player.id);
      getGlobalState().updateLineup(game.id, player.id, i * 2);
    }
    await performAndValidateSync(getGlobalState());

    // Edit -> re-order
    getGlobalState().updateLineup(game.id, players[0].id, 1);
    getGlobalState().updateLineup(game.id, players[1].id, 3);
    getGlobalState().updateLineup(game.id, players[3].id, 4);
    getGlobalState().updateLineup(game.id, players[6].id, 5);
    getGlobalState().updateLineup(game.id, players[7].id, 6);
    await performAndValidateSync(getGlobalState());
  });

  test('Sync - Plate Appearances', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

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
    await performAndValidateSync(getGlobalState());

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
    await performAndValidateSync(getGlobalState());

    // Delete
    getGlobalState().removePlateAppearance(pas[8].id, game.id);
    await performAndValidateSync(getGlobalState());
  });

  // TODO: Optimizations
  /*
  test("Sync - Optimizations", async () => {

  });
  */

  test('Ordering - This query includes both deletes and and insert, this tests to makes sure the resulting querys are sorted and performed in the right order', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Add a bunch of initial data
    let team = getGlobalState().addTeam('BigTeam');
    let game = getGlobalState().addGame(team.id, 'BadGuys');
    let players = [];
    for (let i = 0; i < 5; i++) {
      let player = getGlobalState().addPlayer(`player${i}`, 'F');
      getGlobalState().addPlayerToLineup(game.id, player.id);
      players.push(player);
    }

    await performAndValidateSync(getGlobalState());

    // Blow away the old data for some new data
    getGlobalState().removeGame(game.id);
    getGlobalState().removeTeam(team.id);
    for (let i = 0; i < 5; i++) {
      getGlobalState().removePlayer(players[i].id);
    }
    getGlobalState().addTeam('Actually this team');
    await performAndValidateSync(getGlobalState());
  });
});
