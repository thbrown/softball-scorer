import { getGlobalState } from '../../../client/src/state';
import {
  performAndValidateSync,
  randomId,
  signup,
  login,
  startServer,
  stopServer,
  deleteAccount,
} from '../../test/test-utils';
import { afterAll, beforeAll, describe, test } from 'vitest';

/**
 * This test requires an attached postgres database.
 * It runs through common sync cases to make sure there are no regressions prior to release.
 */
describe('sync', () => {
  let sessionCookies;
  beforeAll(async () => {
    await startServer();

    // Wait for server to start up (TODO: fix this)
    await new Promise((resolve) => setTimeout(resolve, 500));

    const email = `syncTest${randomId(10)}@softball.app`;
    const accountPassword = 'pizza';
    await signup(email, accountPassword);

    sessionCookies = await login(email, accountPassword);
    // eslint-disable-next-line no-undef
    // authenticate(sessionCookies); // global, see jest-setup.js
  });

  afterAll(async () => {
    try {
      await deleteAccount(sessionCookies);
      await stopServer();
    } catch (err) {
      console.error(`Something went wrong in afterAll ${err} ${err.stack}`);
      throw err;
    }
  });

  test('Sync - Players', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Create
    const player = getGlobalState().addPlayer(`Mary`, 'F');
    await performAndValidateSync(getGlobalState());

    // Edit
    const updatedPlayer = JSON.parse(JSON.stringify(player));
    updatedPlayer.name = 'HailMary';
    getGlobalState().replacePlayer(player.id, updatedPlayer);
    await performAndValidateSync(getGlobalState());

    // Deconste
    getGlobalState().removePlayer(updatedPlayer.id);
    await performAndValidateSync(getGlobalState());
  });

  test('Sync - Team', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Create
    const team = getGlobalState().addTeam('BigTeam');
    await performAndValidateSync(getGlobalState());

    // Edit
    const updatedTeam = JSON.parse(JSON.stringify(team));
    updatedTeam.name = 'ReallyBigTeam';
    getGlobalState().replaceTeam(team.id, updatedTeam);
    await performAndValidateSync(getGlobalState());

    // Deconste
    getGlobalState().removeTeam(updatedTeam.id);
    await performAndValidateSync(getGlobalState());
  });

  test('Sync - Game', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Create
    const team = getGlobalState().addTeam('BigTeam');
    const game = getGlobalState().addGame(team.id, 'BadGuys');

    // Edit
    const updatedGame = JSON.parse(JSON.stringify(game));
    updatedGame.opponent = 'ActuallyTheseBadGuys';
    getGlobalState().replaceGame(updatedGame.id, team.id, updatedGame);
    await performAndValidateSync(getGlobalState());

    // Deconste
    getGlobalState().removeGame(updatedGame.id);
    await performAndValidateSync(getGlobalState());
  });

  test('Sync - Lineups', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    const players: any[] = [];

    // Create
    const team = getGlobalState().addTeam('BigTeam');
    const game = getGlobalState().addGame(team.id, 'BadGuys');
    for (let i = 0; i < 10; i++) {
      const player = getGlobalState().addPlayer(`player${i}`, 'F');
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
      const player = getGlobalState().addPlayer(`addedPlayer${i}`, 'F');
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

    const players: any[] = [];
    const pas: any[] = [];

    // Create
    const team = getGlobalState().addTeam('BigTeam');
    const game = getGlobalState().addGame(team.id, 'BadGuys');
    for (let i = 0; i < 5; i++) {
      const player = getGlobalState().addPlayer(`player${i}`, 'F');
      getGlobalState().addPlayerToLineup(game.id, player.id);
      players.push(player);
      for (let j = 0; j < 2; j++) {
        const pa: any = getGlobalState().addPlateAppearance(player.id, game.id);
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
    let replacementPa: any = JSON.parse(
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

    // Deconste
    getGlobalState().removePlateAppearance(pas[8].id, game.id);
    await performAndValidateSync(getGlobalState());
  });

  // TODO: Optimizations
  /*
  test("Sync - Optimizations", async () => {

  });
  */

  test('Ordering - This query includes both deconstes and and insert, this tests to makes sure the resulting querys are sorted and performed in the right order', async () => {
    getGlobalState().deleteAllData();
    await performAndValidateSync(getGlobalState());

    // Add a bunch of initial data
    const team = getGlobalState().addTeam('BigTeam');
    const game = getGlobalState().addGame(team.id, 'BadGuys');
    const players: any[] = [];
    for (let i = 0; i < 5; i++) {
      const player = getGlobalState().addPlayer(`player${i}`, 'F');
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
