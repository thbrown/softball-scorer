/*eslint no-process-exit:*/
'use strict';

const configAccessor = require('../config-accessor');
const SoftballServer = require('../softball-server');
const utils = require('./test-utils.js');
const state = require('../../src/state.js');

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
    server.start();

    // Wait for services to start up (TODO: fix this)
    await new Promise((resolve) => setTimeout(resolve, 500));

    let email = `syncTest${utils.randomId(10)}@softball.app`;
    let accountPassword = 'pizza';
    await utils.signup(email, accountPassword);

    sessionCookies = await utils.login(email, accountPassword);
    authenticate(sessionCookies); // global, see jest-setup.js
    done();
  });

  afterAll(async (done) => {
    try {
      await utils.deleteAccount(sessionCookies);
      await server.stop();

      // This isn't currently working for some reason (is this causing the open file handles after tests run?)
      await databaseCalls.disconnect();
    } catch (err) {
      console.log(`Something went wrong in afterAll ${err}`);
      throw err;
    }
    done();
  });

  let performAndValidateSync = async function (activeState) {
    let beforeSyncCopy = JSON.stringify(state.getLocalState(), null, 2);
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

    let serverChecksum = activeState.getLocalStateChecksum();
    let afterSyncCopy = JSON.stringify(state.getLocalState(), null, 2);

    if (clientChecksum !== serverChecksum) {
      // Checksums don't care about ordering, so they are the definitive answer
      // If those don't match, we'll compare the strings because they are much easier to debug
      /*
      console.log(
        'Pre',
        beforeSyncCopy,
        serverChecksum,
        'Post Sync',
        afterSyncCopy,
        clientChecksum
      );
      */
      expect(afterSyncCopy).toEqual(beforeSyncCopy);
    }

    console.log('Sync assertions successful');
  };

  test('Sync - Players', async () => {
    state.deleteAllData();
    await performAndValidateSync(state);

    // Create
    let player = state.addPlayer(`Mary`, 'F');
    await performAndValidateSync(state);

    // Edit
    let updatedPlayer = JSON.parse(JSON.stringify(player));
    updatedPlayer.name = 'HailMary';
    state.replacePlayer(player.id, updatedPlayer);
    await performAndValidateSync(state);

    // Delete
    state.removePlayer(updatedPlayer.id);
    await performAndValidateSync(state);
  });

  test('Sync - Team', async () => {
    state.deleteAllData();
    await performAndValidateSync(state);

    // Create
    let team = state.addTeam('BigTeam');
    await performAndValidateSync(state);

    // Edit
    let updatedTeam = JSON.parse(JSON.stringify(team));
    updatedTeam.name = 'ReallyBigTeam';
    state.replaceTeam(team.id, updatedTeam);
    await performAndValidateSync(state);

    // Delete
    state.removeTeam(updatedTeam.id);
    await performAndValidateSync(state);
  });

  test('Sync - Game', async () => {
    state.deleteAllData();
    await performAndValidateSync(state);

    // Create
    let team = state.addTeam('BigTeam');
    let game = state.addGame(team.id, 'BadGuys');

    // Edit
    let updatedGame = JSON.parse(JSON.stringify(game));
    updatedGame.opponent = 'ActuallyTheseBadGuys';
    state.replaceGame(updatedGame.id, team.id, updatedGame);
    await performAndValidateSync(state);

    // Delete
    state.removeGame(updatedGame.id, team.id);
    await performAndValidateSync(state);
  });

  test('Sync - Lineups', async () => {
    state.deleteAllData();
    await performAndValidateSync(state);

    let players = [];

    // Create
    let team = state.addTeam('BigTeam');
    let game = state.addGame(team.id, 'BadGuys');
    let lineup = game.lineup;
    for (let i = 0; i < 10; i++) {
      let player = state.addPlayer(`player${i}`, 'F');
      state.addPlayerToLineup(lineup, player.id);
      players.push(player);
    }

    // Edit -> remove players
    lineup = state.getGame(game.id).lineup;
    state.removePlayerFromLineup(lineup, players[2].id);
    state.removePlayerFromLineup(lineup, players[4].id);
    state.removePlayerFromLineup(lineup, players[5].id);
    state.removePlayerFromLineup(lineup, players[9].id);
    await performAndValidateSync(state);

    // Edit -> add players

    lineup = state.getGame(game.id).lineup;
    for (let i = 0; i < 4; i++) {
      let player = state.addPlayer(`addedPlayer${i}`, 'F');
      state.addPlayerToLineup(lineup, player.id);
      state.updateLineup(lineup, player.id, i * 2);
    }
    await performAndValidateSync(state);

    // Edit -> re-order
    lineup = state.getGame(game.id).lineup;
    state.updateLineup(lineup, players[0].id, 1);
    state.updateLineup(lineup, players[1].id, 3);
    state.updateLineup(lineup, players[3].id, 4);
    state.updateLineup(lineup, players[6].id, 5);
    state.updateLineup(lineup, players[7].id, 6);
    await performAndValidateSync(state);
  });

  test('Sync - Plate Appearances', async () => {
    state.deleteAllData();
    await performAndValidateSync(state);

    let players = [];
    let pas = [];

    // Create
    let team = state.addTeam('BigTeam');
    let game = state.addGame(team.id, 'BadGuys');
    let lineup = game.lineup;
    for (let i = 0; i < 5; i++) {
      let player = state.addPlayer(`player${i}`, 'F');
      state.addPlayerToLineup(lineup, player.id);
      players.push(player);
      for (let j = 0; j < 2; j++) {
        let pa = state.addPlateAppearance(player.id, game.id);
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
      JSON.stringify(state.getPlateAppearance(pas[1].id))
    );
    replacementPa.result = '2B';
    state.replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );

    replacementPa = JSON.parse(
      JSON.stringify(state.getPlateAppearance(pas[2].id))
    );
    replacementPa.result = null;
    state.replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );

    replacementPa = JSON.parse(
      JSON.stringify(state.getPlateAppearance(pas[3].id))
    );
    replacementPa.location = {
      x: null,
      y: null,
    };
    state.replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );

    replacementPa = JSON.parse(
      JSON.stringify(state.getPlateAppearance(pas[6].id))
    );
    replacementPa.location = {
      x: 1000,
      y: 3000,
    };
    state.replacePlateAppearance(
      replacementPa.id,
      game.id,
      team.id,
      replacementPa
    );
    await performAndValidateSync(state);

    // Delete
    state.removePlateAppearance(pas[8].id, game.id);
    await performAndValidateSync(state);
  });

  // TODO: Optimizations
  /*
  test("Sync - Optimizations", async () => {

  });
  */

  test('Ordering - This query includes both deletes and and insert, this tests to makes sure the resulting querys are sorted and performed in the right order', async () => {
    state.deleteAllData();
    await performAndValidateSync(state);

    // Add a bunch of initial data
    let team = state.addTeam('BigTeam');
    let game = state.addGame(team.id, 'BadGuys');
    let players = [];
    for (let i = 0; i < 5; i++) {
      let player = state.addPlayer(`player${i}`, 'F');
      state.addPlayerToLineup(game.lineup, player.id);
      players.push(player);
    }

    await performAndValidateSync(state);

    // Blow away the old data for some new data
    state.removeGame(game.id, team.id);
    state.removeTeam(team.id);
    for (let i = 0; i < 5; i++) {
      state.removePlayer(players[i].id);
    }
    state.addTeam('Actually this team');
    await performAndValidateSync(state);
  });
});
