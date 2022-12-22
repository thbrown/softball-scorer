import expose from 'expose';
import network from 'network';
import SharedLib from 'shared-lib';
import results from 'plate-appearance-results';
import { getShallowCopy, autoCorrelation, isStatSig } from 'utils/functions';

import dialog from 'dialog';
const TLSchemas = SharedLib.schemaValidation.TLSchemas;

const exp = {};

/*
 * NOTE: Because we want all changes to the state to be done via the functions in this class
 * (as opposed to mutating objects that were returned from getters) we should consider deep
 * copying all objects returned by the getters, then recursively freezing them so the app
 * will throw an error when updates are done outside of this class.
 */

// Constants
const INITIAL_STATE = {
  account: {
    optimizers: [0, 1, 2],
  },
  teams: [],
  players: [],
  optimizations: [],
  metadata: {
    scope: 'client',
    version: SharedLib.schemaMigration.CURRENT_VERSION,
  },
};

const CURRENT_LS_SCHEMA_VERSION = '7';
const SYNC_DELAY_MS = 10000;
const SYNC_STATUS_ENUM = Object.freeze({
  COMPLETE: 1,
  ERROR: 2,
  IN_PROGRESS: 3,
  PENDING: 4,
  IN_PROGRESS_AND_PENDING: 5,
  UNKNOWN: 6,
});

exp.LINEUP_TYPE_ENUM = Object.freeze({
  NORMAL: 0,
  ALTERNATING_GENDER: 1,
  NO_CONSECUTIVE_FEMALES: 2,
  NO_CONSECUTIVE_FEMALES_AND_NO_THREE_CONSECUTIVE_MALES: 3,
});
exp.LINEUP_ORDER_ENUM = Object.freeze({
  StandardBattingLineup: 'StandardBattingLineup',
  AlternatingBattingLineup: 'AlternatingBattingLineup',
});

// Database State - Stored in memory, local storage, and persisted in the db
let ANCESTOR_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
let LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));

// Application State - State that applies across windows/tabs. Stored in local storage and in memory.
let online = true;
let sessionValid = false;
let activeUser = null;

// Window State - State saved in memory only
let addToHomescreenEvent = null;
let syncState = SYNC_STATUS_ENUM.UNKNOWN;
let syncTimer = null;
let syncTimerTimestamp = null;

const state = exp;

// New objects shapes
exp.getNewTeam = function (teamName) {
  const id = getNextId();
  return {
    id: id,
    name: teamName,
    games: [],
  };
};

exp.getNewGame = function (opposingTeamName, lineup, lineupType) {
  const timestamp = Math.floor(new Date().getTime() / 1000); // Time in seconds not ms
  const id = getNextId();
  return {
    id: id,
    opponent: opposingTeamName,
    lineup: lineup ? lineup : [],
    date: timestamp,
    scoreUs: 0,
    scoreThem: 0,
    lineupType: lineupType ? lineupType : exp.LINEUP_TYPE_ENUM.NORMAL,
    plateAppearances: [],
  };
};

exp.getNewPlateAppearance = function (playerId) {
  const id = getNextId();
  return {
    id: id,
    playerId: playerId,
    result: null,
    location: {
      x: null,
      y: null,
    },
  };
};

// SYNC

exp.syncStateToSyncStateName = function (syncState) {
  for (let i in SYNC_STATUS_ENUM) {
    if (syncState === SYNC_STATUS_ENUM[i]) {
      return i;
    }
  }
  return '';
};

// HTTP standard status codes plus:
// -1 network issue
// -2 failed on fullSync = false
// -3 failed on fullSync = true
exp.sync = async function (fullSync) {
  console.log('[SYNC] Sync requested', fullSync ? 'full' : 'patchOnly');

  while (
    exp.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS ||
    exp.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
  ) {
    // Simultaneous syncs might be okay, but we'll still limit it to one at a time for clarity
    console.log(
      '[SYNC] waiting for in progress sync to finish ' + exp.getSyncState()
    );
    await sleep(500); // TODO: debounce
  }
  // Kill any scheduled syncs
  clearTimeout(syncTimer);
  syncTimerTimestamp = null;
  setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS);
  try {
    // Save a deep copy of the local state
    let localStateCopyPreRequest = JSON.parse(
      JSON.stringify(state.getLocalState())
    );
    let localState = state.getLocalState();

    // Save the ancestor state so we can restore it if something goes wrong
    let ancestorStateCopy = JSON.parse(
      JSON.stringify(state.getAncestorState())
    );

    // Get the patch ready to send to the server
    let body = {
      checksum: SharedLib.commonUtils.getHash(localState),
      patch: SharedLib.objectMerge.diff(state.getAncestorState(), localState),
      type: fullSync ? 'full' : 'any',
    };

    // Ship it
    console.log(state.getAncestorState(), localState);
    console.log('[SYNC] Syncing...', body);
    const response = await state.requestAuth(
      'POST',
      'server/sync',
      JSON.stringify(body)
    );

    if (response.status === 200) {
      let serverState = response.body;

      // First gather any changes that were made locally while the request was still working
      let localChangesDuringRequest = SharedLib.objectMerge.diff(
        localStateCopyPreRequest,
        localState
      );

      // Update the ancestor if updates were received from the server
      if (serverState.base) {
        // The entire state was sent, we can just save it directly
        state.setAncestorState(serverState.base);
      } else if (serverState.patch) {
        // Patch was sent, apply the patch to a copy of the local state
        console.log(`[SYNC] Applying patch (${serverState.patch.length})`);

        localStateCopyPreRequest = SharedLib.objectMerge.patch(
          localStateCopyPreRequest,
          serverState.patch
        );

        // The local state with the server updates is the new ancestor
        state.setAncestorState(localStateCopyPreRequest);
      } else {
        console.log('[SYNC] No updates received from server');
        state.setAncestorState(localStateCopyPreRequest);
      }

      // Verify that the ancestor state (after updates) has the same hash as the server state
      let ancestorHash = state.getAncestorStateChecksum();
      console.log(
        '[SYNC] CLIENT: ',
        ancestorHash,
        ' SERVER: ',
        serverState.checksum
      );
      if (ancestorHash !== serverState.checksum) {
        if (fullSync) {
          // Something went wrong after trying a full sync, we probably can't do anything about it!
          // serverState.base should have contained a verbatim copy of what the server has, so this is weird.
          console.log(
            '[SYNC] Yikes! Something went wrong while attempting full sync'
          );
          console.log(
            'Client calculated',
            SharedLib.commonUtils.getHash(state.getAncestorState()),
            'Server has',
            SharedLib.commonUtils.getHash(serverState.base)
          );

          console.log(JSON.stringify(state.getAncestorState(), null, 2));
          console.log(
            SharedLib.commonUtils.getObjectString(state.getAncestorState())
          );

          // Set the state back to what it was when we first did a sync
          state.setAncestorState(ancestorStateCopy);
          throw new Error(-3);
        } else {
          // Something went wrong with the patch-based sync, perhaps the server's cached data was incorrect
          // We should be able to repeat the request with type "full" so we'll get the whole state back, not just the patches
          console.warn(
            '[SYNC] Something went wrong while attempting patch sync'
          );
          console.warn(
            SharedLib.commonUtils.getHash(state.getLocalState()),
            serverState.checksum
          );

          console.warn(
            SharedLib.commonUtils.getObjectString(
              JSON.stringify(state.getLocalState(), null, 2)
            )
          );

          // Set the state back to what it was when we first did a sync
          state.setAncestorState(ancestorStateCopy);
          throw new Error(-2);
        }
      } else {
        console.log(
          '[SYNC] Sync was successful! (client and server checksums match)'
        );
      }

      // Copy
      let newLocalState = JSON.parse(JSON.stringify(state.getAncestorState()));

      // Apply any changes that were made during the request to the new local state (Presumably this will be a no-op most times)
      newLocalState = SharedLib.objectMerge.patch(
        newLocalState,
        localChangesDuringRequest,
        true
      );

      // Set local state to a copy of ancestor state (w/ localChangesDuringRequest applied)
      setLocalStateNoSideEffects(newLocalState);
      reRender();

      // Write the most updated data to local storage
      exp.saveDbStateToLocalStorage();
    } else {
      throw new Error(response.status);
    }

    if (exp.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS) {
      setSyncState(SYNC_STATUS_ENUM.COMPLETE);
    } else if (
      exp.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
    ) {
      setSyncState(SYNC_STATUS_ENUM.PENDING);
    } else {
      // Don't think this should be possible
      console.log('[SYNC] Invalid state transition');
      setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
    }

    return response.status;
  } catch (err) {
    // We might be able to re-try some problems, like if the network is temporarily out
    setSyncState(SYNC_STATUS_ENUM.PENDING); // Assume re-try
    if (
      (+err.message === -1 && !exp.isOnline()) ||
      +err.message === 403 ||
      +err.message === 401 ||
      +err.message === 502
    ) {
      // Pause future syncs but don't sound the alert alarm for these cases (not bugs) for
      // 1) User is not signed in
      // 2) App is in offline mode
      console.log(
        '[SYNC] Auth problem or offline mode is active: retrying sync later'
      );
      setSyncState(SYNC_STATUS_ENUM.ERROR);
    } else if (+err.message === 503 || +err.message === -1) {
      // Re-try later might work for
      // 1) Server rate limiting errors
      // 2) Weird network conditions
      console.warn(
        '[SYNC] Network issues or server is busy: retrying sync later'
      );
      exp.scheduleSync();
    } else if (+err.message === -2) {
      // Issue with patch based sync, re-try with a full sync
      console.warn('[SYNC] Issue with patch sync: attempting full sync');
      return await exp.sync(true);
    } else if (+err.message === 400) {
      console.warn('[SYNC] Issue with sync 400');
      dialog.show_notification(
        'Auto sync failed with message "' +
          err.message +
          '". Try refreshing the page, the app may have been updated. Details: ' +
          err,
        () => {}
      );
      console.log(err);
      setSyncState(SYNC_STATUS_ENUM.ERROR);
    } else {
      // Other 500s, 400s are probably bugs :(, tell the user something is wrong
      console.warn(`[SYNC] Probable bug encountered ${err}`);
      dialog.show_notification(
        'Auto sync failed with message "' +
          err.message +
          `". App will continue to function, but your data won't be synced with the server. Consider backing up your data from the main menu to avoid data loss. Details: ` +
          err,
        () => {}
      );
      console.log(err);
      setSyncState(SYNC_STATUS_ENUM.ERROR);
    }
    return err.message;
  }
};

exp.resetSyncState = function () {
  setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
};

exp.resetState = function () {
  setSyncState(SYNC_STATUS_ENUM.UNKNOWN);

  online = true;
  sessionValid = false;
  activeUser = null;

  LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
  ANCESTOR_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));

  exp.saveApplicationStateToLocalStorage();
  exp.saveDbStateToLocalStorage();
};

exp.deleteAllData = function () {
  LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
  onEdit();
};

exp.getLocalState = function () {
  return LOCAL_DB_STATE;
};

exp.getLocalStateChecksum = function () {
  return SharedLib.commonUtils.getHash(LOCAL_DB_STATE);
};

exp.setLocalState = function (newState) {
  SharedLib.schemaValidation.validateSchema(newState, TLSchemas.CLIENT);
  LOCAL_DB_STATE = newState;
  onEdit();
};

let setLocalStateNoSideEffects = function (newState) {
  SharedLib.schemaValidation.validateSchema(newState, TLSchemas.CLIENT);
  LOCAL_DB_STATE = newState;
};

exp.getAncestorState = function () {
  return ANCESTOR_DB_STATE;
};

exp.setAncestorState = function (s) {
  ANCESTOR_DB_STATE = s;
};

exp.getAncestorStateChecksum = function () {
  return SharedLib.commonUtils.getHash(ANCESTOR_DB_STATE);
};

exp.hasAnythingChanged = function () {
  // TODO: It's probably faster just to compare these directly
  return (
    SharedLib.commonUtils.getHash(LOCAL_DB_STATE) !==
    SharedLib.commonUtils.getHash(INITIAL_STATE)
  );
};

// TEAM

exp.getTeam = function (team_id, state) {
  return (state || LOCAL_DB_STATE).teams.reduce((prev, curr) => {
    return curr.id === team_id ? curr : prev;
  }, null);
};

exp.addTeam = function (teamName) {
  let localState = exp.getLocalState();
  let team = exp.getNewTeam(teamName);
  localState.teams.push(team);
  onEdit();
  return team;
};

exp.replaceTeam = function (oldTeamId, newTeam) {
  let localState = exp.getLocalState();
  let oldTeam = exp.getTeam(oldTeamId);
  let oldTeamIndex = localState.teams.indexOf(oldTeam);
  localState.teams[oldTeamIndex] = newTeam;
  onEdit();
};

exp.removeTeam = function (team_id) {
  let new_state = exp.getLocalState();
  new_state.teams = new_state.teams.filter((team) => {
    return team.id !== team_id;
  });
  onEdit();
};

exp.getAllTeams = function () {
  return getShallowCopy(exp.getLocalState().teams);
};

// PLAYER

exp.getPlayer = function (playerId, state) {
  return (state || LOCAL_DB_STATE).players.reduce((prev, curr) => {
    return curr.id === playerId ? curr : prev;
  }, null);
};

exp.replacePlayer = function (playerId, newPlayer) {
  let localState = exp.getLocalState();
  let oldPlayer = exp.getPlayer(playerId, localState);

  let oldPlayerIndex = localState.players.indexOf(oldPlayer);
  localState.players[oldPlayerIndex] = newPlayer;
  onEdit();
};

exp.getAllPlayers = function () {
  return getShallowCopy(exp.getLocalState()).players;
};

exp.getAllPlayersAlphabetically = function () {
  let playerNameComparator = function (a, b) {
    if (a.name.toLowerCase() < b.name.toLowerCase()) {
      return -1;
    }
    if (a.name.toLowerCase() > b.name.toLowerCase()) {
      return 1;
    }
    return 0;
  };

  // Make sure we don't re-order the original array, this will result in sync issues
  return getShallowCopy(exp.getLocalState().players).sort(playerNameComparator);
};

exp.removePlayer = function (playerId) {
  if (
    exp.getGamesWithPlayerInLineup(playerId).length === 0 &&
    exp.getGamesWherePlayerHasPlateAppearances(playerId).length === 0
  ) {
    let localState = exp.getLocalState();
    localState.players = localState.players.filter((player) => {
      return player.id !== playerId;
    });
    onEdit();
    return true;
  } else {
    return false;
  }
};

exp.addPlayer = function (playerName, gender) {
  const id = getNextId();
  let new_state = exp.getLocalState();
  let player = {
    id: id,
    name: playerName,
    gender: gender,
    songLink: null,
    songStart: null,
  };
  new_state.players.push(player);
  onEdit();
  return player;
};

// OPTIMIZATION

exp.getOptimization = function (optimizationId) {
  return LOCAL_DB_STATE.optimizations.reduce((prev, curr) => {
    return curr.id === optimizationId ? curr : prev;
  }, null);
};

exp.getAllOptimizations = function () {
  return getShallowCopy(exp.getLocalState().optimizations);
};

exp.replaceOptimization = function (optimizationId, newOptimization) {
  const localState = exp.getLocalState();
  const oldOptimization = exp.getOptimization(optimizationId);

  const oldOptimizationIndex =
    localState.optimizations.indexOf(oldOptimization);
  localState.optimizations[oldOptimizationIndex] = newOptimization;
  onEdit();
};

exp.getUsedOptimizers = function () {
  let optimizers = new Set();
  exp.getLocalState().optimizations.forEach((optimization) => {
    optimizers.add(optimization.optimizerType);
  });
  return Array.from(optimizers);
};

// Set a field on the specified optimization object
exp.setOptimizationField = function (optimizationId, fieldName, fieldValue) {
  const optimization = exp.getOptimization(optimizationId);
  optimization[fieldName] = fieldValue;
  onEdit();
};

// Set a field on the customOptions field
exp.setOptimizationCustomOptionsDataField = function (
  optimizationId,
  fieldName,
  fieldValue
) {
  const optimization = exp.getOptimization(optimizationId);
  const customOptionsData = optimization.customOptionsData;
  if (fieldValue === undefined) {
    delete customOptionsData[fieldName];
  } else {
    customOptionsData[fieldName] = fieldValue;
  }
  optimization.customOptionsData = customOptionsData;
  onEdit();
};

exp.getOptimizationOverridesForPlayer = function (optimizationId, playerId) {
  let optimization = exp.getOptimization(optimizationId);
  // TODO: do we consistently protect against undefined ?
  if (optimization.overrideData) {
    let allOverrides = optimization.overrideData;
    return allOverrides[playerId] ? allOverrides[playerId] : [];
  } else {
    return [];
  }
};

exp.getOptimizationOverridePlateAppearance = function (
  optimizationId,
  playerId,
  paId
) {
  let pas = exp.getOptimizationOverridesForPlayer(optimizationId, playerId);
  let result = pas.find((pa) => {
    return pa.id === paId;
  });
  return result;
};

exp.addOptimizationOverridePlateAppearance = function (
  optimizationId,
  playerId
) {
  let optimization = exp.getOptimization(optimizationId);
  let allOverrides = optimization.overrideData;

  let playerOverrides = allOverrides[playerId];
  let addedPa = this.getNewPlateAppearance(playerId);

  if (!playerOverrides) {
    allOverrides[playerId] = [addedPa];
  } else {
    allOverrides[playerId].push(addedPa);
  }

  optimization.overrideData = allOverrides;
  onEdit();
  return addedPa;
};

exp.removeOptimizationOverridePlateAppearance = function (
  optimizationId,
  playerId,
  paId
) {
  let optimization = exp.getOptimization(optimizationId);
  let allOverrides = optimization.overrideData;

  let playerOverrides = allOverrides[playerId];

  allOverrides[playerId] = playerOverrides.filter((pa) => {
    return pa.id !== paId;
  });

  // Remove the player entry if the array is empty
  if (playerOverrides.length === 0) {
    delete allOverrides[playerId];
  }

  optimization.overrideData = allOverrides;
  onEdit();
};

exp.replaceOptimizationOverridePlateAppearance = function (
  optimizationId,
  playerId,
  paId,
  paToAdd
) {
  let optimization = exp.getOptimization(optimizationId);
  let allOverrides = optimization.overrideData;
  let playerOverrides = allOverrides[playerId];

  for (let i = 0; i < playerOverrides.length; i++) {
    const pa = playerOverrides[i];
    if (pa.id === paId) {
      playerOverrides.splice(i, 1, paToAdd);
      break;
    }
  }
  optimization.overrideData = allOverrides;
  onEdit();
};

exp.getOptimizationCustomOptionsDataField = function (
  optimizationId,
  fieldName
) {
  const optimization = exp.getOptimization(optimizationId);
  const customOptionsData = optimization.customOptionsData;
  return customOptionsData[fieldName];
};

exp.duplicateOptimization = function (optimizationId) {
  const toDuplicate = exp.getOptimization(optimizationId);
  let localState = exp.getLocalState();
  let duplicatedOptimization = JSON.parse(JSON.stringify(toDuplicate));

  // Reset the any status fields and de-duplicate unique fields
  duplicatedOptimization.id = getNextId();

  let newName = 'Duplicate of ' + duplicatedOptimization.name;
  try {
    // Try fancy renaming - like windows does when you copy a file
    let regex = /\([\d]+\)$/; // There is a minor bug here with leading zeros
    let matches = regex.exec(duplicatedOptimization.name);
    console.log(matches);
    if (matches?.length > 0) {
      let nextNumber = parseInt(matches[0].slice(1, -1)) + 1;
      let slicedOriginal = duplicatedOptimization.name.slice(
        0,
        -matches[0].length
      );
      newName = `${slicedOriginal}(${nextNumber})`;
    } else {
      newName = `${duplicatedOptimization.name} (2)`;
    }
  } catch (e) {
    console.warn('regex failure', e);
  }
  duplicatedOptimization.name = newName.substring(0, 49); // Prevent the name form being too long
  duplicatedOptimization.resultData = {};
  duplicatedOptimization.statusMessage = null;
  duplicatedOptimization.inputSummaryData = {};
  duplicatedOptimization.name;
  // Read-only fields
  delete duplicatedOptimization.status;
  delete duplicatedOptimization.pause;

  localState.optimizations.push(duplicatedOptimization);
  onEdit();
};

exp.removeOptimization = function (optimizationId) {
  const localState = exp.getLocalState();
  localState.optimizations = localState.optimizations.filter((optimization) => {
    return optimization.id !== optimizationId;
  });
  onEdit();
};

exp.addOptimization = function (name, playerList, teamList, lineupType) {
  const id = getNextId();
  let new_state = exp.getLocalState();
  let optimization = {
    id: id,
    name: name,
    customOptionsData: {},
    overrideData: {},
    resultData: {},
    statusMessage: null,
    sendEmail: false,
    teamList: teamList ? teamList : exp.getAllTeams().map((t) => t.id),
    gameList: [],
    playerList: playerList ? playerList : [],
    lineupType: lineupType === undefined ? 0 : lineupType,
    optimizerType:
      SharedLib.constants.OPTIMIZATION_TYPE_ENUM.MONTE_CARLO_ADAPTIVE,
    inputSummaryData: {},
  };
  new_state.optimizations.push(optimization);
  onEdit();
  return optimization;
};

// GAME

exp.addGame = function (teamId, opposingTeamName) {
  let new_state = exp.getLocalState();
  const team = exp.getTeam(teamId, new_state);
  let lastLineup = [];
  let lastLineupType = 0;
  if (team.games.length) {
    let lastGame = team.games[team.games.length - 1];
    lastLineupType = lastGame.lineupType;
    lastLineup = lastGame.lineup.slice();
  }
  let game = exp.getNewGame(opposingTeamName, lastLineup, lastLineupType);
  team.games.push(game);
  onEdit();
  return game;
};

exp.replaceGame = function (oldGameId, teamId, newGame) {
  const localState = exp.getLocalState();
  const oldGame = exp.getGame(oldGameId);

  const team = exp.getTeam(teamId);
  const teamIndex = localState.teams.indexOf(team);

  const oldGameIndex = localState.teams[teamIndex].games.indexOf(oldGame);
  localState.teams[teamIndex].games[oldGameIndex] = newGame;
  onEdit();
};

exp.getGame = function (game_id, state) {
  for (let team of (state || LOCAL_DB_STATE).teams) {
    for (let game of team.games) {
      if (game.id === game_id) {
        return game;
      }
    }
  }

  return null;
};

exp.getGamesWithPlayerInLineup = function (playerId, state) {
  let games = [];
  let localState = state || exp.getLocalState();
  for (let team of localState.teams) {
    for (let game of team.games) {
      for (let i = 0; i < game.lineup.length; i++) {
        if (game.lineup[i] === playerId) {
          games.push(game);
          break;
        }
      }
    }
  }
  return games;
};

exp.getGamesWherePlayerHasPlateAppearances = function (playerId, state) {
  const games = [];
  const localState = state || exp.getLocalState();
  for (let team of localState.teams) {
    for (let game of team.games) {
      for (let pa of game.plateAppearances) {
        if (pa.id === playerId) {
          games.push(game);
          break;
        }
      }
    }
  }
  return games;
};

exp.setGameLineup = function (gameId, newLineup) {
  const game = exp.getGame(gameId);
  game.lineup = newLineup; // Do we need to do a deep copy here?
  onEdit();
};

exp.addPlayerToLineup = function (lineup, playerId) {
  lineup.push(playerId);
  onEdit();
};

exp.updateLineup = function (lineup, playerId, newIndex) {
  const ind = lineup.indexOf(playerId);
  lineup.splice(ind, 1);
  lineup.splice(newIndex, 0, playerId);
  onEdit();
};

exp.removePlayerFromLineup = function (lineup, playerId) {
  const index = lineup.indexOf(playerId);
  lineup.splice(index, 1);
  onEdit();
};

exp.removeGame = function (game_id, team_id) {
  const new_state = exp.getLocalState();
  const team = exp.getTeam(team_id);
  const index = new_state.teams.indexOf(team);

  team.games = team.games.filter((game) => {
    return game.id !== game_id;
  });

  if (index > -1) {
    new_state.teams[index] = team;
  } else {
    console.log('Game not found ' + game_id);
  }
  onEdit();
};

exp.setScore = function ({ scoreUs, scoreThem }, gameId) {
  const game = exp.getGame(gameId);
  game.scoreUs = scoreUs === undefined ? game.scoreUs : scoreUs;
  game.scoreThem = scoreThem === undefined ? game.scoreThem : scoreThem;
  if (game.scoreUs < 0) {
    game.scoreUs = 0;
  }
  if (game.scoreThem < 0) {
    game.scoreThem = 0;
  }
  onEdit();
  return game;
};

// PLATE APPEARANCE

exp.addPlateAppearance = function (playerId, gameId) {
  const game = exp.getGame(gameId);
  const plateAppearances = game.plateAppearances;
  const plateAppearance = exp.getNewPlateAppearance(playerId);
  plateAppearances.push(plateAppearance);
  onEdit();
  return plateAppearance;
};

exp.replacePlateAppearance = function (paId, gameId, teamId, newPa) {
  const localState = exp.getLocalState();

  const team = exp.getTeam(teamId);
  const teamIndex = localState.teams.indexOf(team);

  const game = exp.getGame(gameId);
  const gameIndex = localState.teams[teamIndex].games.indexOf(game);

  const appearances =
    localState.teams[teamIndex].games[gameIndex].plateAppearances;

  let i = 0;
  for (i = 0; i < appearances.length; i++) {
    const pa = appearances[i];
    if (pa.id === paId) {
      break;
    }
  }
  appearances.splice(i, 1, {
    id: newPa.id,
    playerId: newPa.playerId,
    result: newPa.result,
    location: {
      x: newPa?.location?.x,
      y: newPa?.location?.y,
    },
  });
  onEdit();
};

// TODO: allow for passing team and game ids to improve perf
exp.getPlateAppearance = function (pa_id, state) {
  for (let team of (state || LOCAL_DB_STATE).teams) {
    for (let game of team.games) {
      for (let pa of game.plateAppearances) {
        if (pa.id === pa_id) {
          return pa;
        }
      }
    }
  }
  return null;
};

exp.getAllPlateAppearancesForPlayer = function (playerId) {
  let allPAs = [];
  let allTeams = state.getAllTeams();
  for (let team of allTeams) {
    let playerPAsOnTeam = exp.getPlateAppearancesForPlayerOnTeam(
      playerId,
      team.id
    );
    for (let pa of playerPAsOnTeam) {
      allPAs.push(pa);
    }
  }
  return allPAs;
};

exp.getPlateAppearancesForGame = function (gameId, state) {
  const game = exp.getGame(gameId, state);
  if (!game) {
    return null;
  }
  return game.plateAppearances;
};

exp.getPlateAppearancesForPlayerInGame = function (playerId, game_id, state) {
  const game = exp.getGame(game_id, state);
  const player = exp.getPlayer(playerId, state);
  if (!game || !player) {
    return null;
  }
  return game.plateAppearances.filter((pa) => pa.playerId === playerId);
};

/**
 * Returns a plate appearance with the game object it's from.
 */
const decoratePlateAppearance = (pa, game) => ({
  ...pa,
  game,
  date: game.date,
});

exp.getDecoratedPlateAppearancesForPlayerOnTeam = function (
  playerId,
  team_id,
  state
) {
  const team =
    typeof team_id === 'string' ? exp.getTeam(team_id, state) : team_id;
  let plateAppearances = [];

  if (team && team.games) {
    team.games.forEach((game) => {
      if (game.plateAppearances) {
        const plateAppearancesThisGame = game.plateAppearances
          .filter((pa) => playerId === pa.playerId)
          .map((pa) => {
            return decoratePlateAppearance(pa, game);
          });
        plateAppearances = plateAppearances.concat(plateAppearancesThisGame);
      }
    });
  }
  return plateAppearances;
};

exp.getPlateAppearancesForPlayerOnTeam = function (playerId, team_id, state) {
  const team =
    typeof team_id === 'string' ? exp.getTeam(team_id, state) : team_id;
  let plateAppearances = [];

  if (team && team.games) {
    team.games.forEach((game) => {
      if (game.plateAppearances) {
        const plateAppearancesThisGame = game.plateAppearances.filter(
          (pa) => playerId === pa.playerId
        );
        plateAppearances = plateAppearances.concat(plateAppearancesThisGame);
      }
    });
  }
  return plateAppearances;
};

exp.getPlateAppearancesForPlayerInGameOrOnTeam = function (
  playerId,
  teamIds,
  gameIds,
  state
) {
  if (!teamIds) {
    teamIds = [];
  }
  if (!gameIds) {
    gameIds = [];
  }
  let plateAppearances = [];
  for (let i = 0; i < teamIds.length; i++) {
    plateAppearances = plateAppearances.concat(
      exp.getPlateAppearancesForPlayerOnTeam(playerId, teamIds[i], state)
    );
  }
  for (let i = 0; i < gameIds.length; i++) {
    plateAppearances = plateAppearances.concat(
      exp.getPlateAppearancesForPlayerInGame(playerId, gameIds[i], state)
    );
  }
  return plateAppearances;
};

exp.getPlateAppearancesForPlayer = function (playerId, state) {
  let localState = state || exp.getLocalState();
  let teams = localState.teams;
  let plateAppearances = [];

  if (teams) {
    teams.forEach((team) => {
      if (team.games) {
        team.games.forEach((game) => {
          if (game.plateAppearances) {
            const plateAppearancesThisGame = game.plateAppearances.filter(
              (pa) => playerId === pa.playerId
            );
            plateAppearances = plateAppearances.concat(
              plateAppearancesThisGame
            );
          }
        });
      }
    });
  }
  return plateAppearances;
};

exp.getDecoratedPlateAppearancesForPlayer = function (playerId, state) {
  let localState = state || exp.getLocalState();
  let teams = localState.teams;
  let plateAppearances = [];

  if (teams) {
    teams.forEach((team) => {
      if (team.games) {
        team.games.forEach((game) => {
          if (game.plateAppearances) {
            const plateAppearancesThisGame = game.plateAppearances
              .filter((pa) => playerId === pa.playerId)
              .map((pa) => {
                return decoratePlateAppearance(pa, game);
              });
            plateAppearances = plateAppearances.concat(
              plateAppearancesThisGame
            );
          }
        });
      }
    });
  }
  return plateAppearances;
};

exp.getDecoratedPlateAppearancesForGame = function (game, state) {
  return game.plateAppearances.map((pa) => decoratePlateAppearance(pa, game));
};

exp.updatePlateAppearanceResult = function (plateAppearance, result) {
  plateAppearance.result = result;
  onEdit();
};

exp.updatePlateAppearanceLocation = function (plateAppearance, location) {
  plateAppearance.location = {};
  plateAppearance.location.x = Math.floor(location[0]);
  plateAppearance.location.y = Math.floor(location[1]);
  onEdit();
};

exp.removePlateAppearance = function (plateAppearance_id, game_id) {
  //exp.getLocalState();
  let game = exp.getGame(game_id);

  game.plateAppearances = game.plateAppearances.filter((pa) => {
    return pa.id !== plateAppearance_id;
  });
  onEdit();
};

exp.getAccountOptimizersList = function () {
  if (exp.getLocalState().account) {
    return exp.getLocalState().account.optimizers;
  } else {
    return [];
  }
};

exp.isEmailValidated = function () {
  if (exp.getLocalState().account) {
    return exp.getLocalState().account.emailConfirmed;
  } else {
    return false;
  }
};

exp.setAccountOptimizersList = function (newOptimizersArray) {
  if (exp.getLocalState().account) {
    exp.getLocalState().account.optimizers = newOptimizersArray;
    onEdit();
  }
};

// LOCAL STORAGE
exp.saveDbStateToLocalStorage = function () {
  if (typeof Storage !== 'undefined') {
    /*
    // Disable compression for now
    let compressedLocalState = LZString.compress(
      JSON.stringify(LOCAL_DB_STATE)
    );
    let compressedAncestorState = LZString.compress(
      JSON.stringify(ANCESTOR_DB_STATE)
    );

    localStorage.setItem("SCHEMA_VERSION", CURRENT_LS_SCHEMA_VERSION);
    localStorage.setItem("LOCAL_DB_STATE", compressedLocalState);
    localStorage.setItem("ANCESTOR_DB_STATE", compressedAncestorState);
    */
    SharedLib.schemaValidation.validateSchema(LOCAL_DB_STATE, TLSchemas.CLIENT);

    localStorage.setItem('SCHEMA_VERSION', CURRENT_LS_SCHEMA_VERSION);
    localStorage.setItem('LOCAL_DB_STATE', JSON.stringify(LOCAL_DB_STATE));
    localStorage.setItem(
      'ANCESTOR_DB_STATE',
      JSON.stringify(ANCESTOR_DB_STATE)
    );
  }
};

exp.saveApplicationStateToLocalStorage = function () {
  if (typeof Storage !== 'undefined') {
    localStorage.setItem('SCHEMA_VERSION', CURRENT_LS_SCHEMA_VERSION);
    let applicationState = {
      online: online,
      sessionValid: sessionValid,
      activeUser: activeUser,
    };
    localStorage.setItem('APPLICATION_STATE', JSON.stringify(applicationState));
  }
};

exp.loadStateFromLocalStorage = function (loadState = true, loadApp = true) {
  if (typeof Storage !== 'undefined') {
    // These statements define local storage schema migrations
    if (localStorage.getItem('SCHEMA_VERSION') !== CURRENT_LS_SCHEMA_VERSION) {
      console.log(
        `Removing invalid localStorage data ${localStorage.getItem(
          'SCHEMA_VERSION'
        )}`
      );
      exp.clearLocalStorage();
      exp.saveDbStateToLocalStorage();
      exp.saveApplicationStateToLocalStorage();
    }

    // Retrieve, update, and validate state. Do nothing if anything in this process fails.
    if (loadState) {
      try {
        let localDbState = JSON.parse(localStorage.getItem('LOCAL_DB_STATE'));
        if (localDbState) {
          SharedLib.schemaMigration.updateSchema(null, localDbState, 'client');
          SharedLib.schemaValidation.validateSchema(
            localDbState,
            TLSchemas.CLIENT
          );
        }

        let ancestorDbState = JSON.parse(
          localStorage.getItem('ANCESTOR_DB_STATE')
        );
        if (ancestorDbState) {
          SharedLib.schemaMigration.updateSchema(
            null,
            ancestorDbState,
            'client'
          );
          SharedLib.schemaValidation.validateSchema(
            ancestorDbState,
            TLSchemas.CLIENT
          );
        }

        // Apply changes if there were no errors - we want both of them to update or none of them
        if (localDbState && ancestorDbState) {
          LOCAL_DB_STATE = localDbState;
          ANCESTOR_DB_STATE = ancestorDbState;
        }
      } catch (e) {
        // We have bad data in ls, delete it all
        console.warn('Error loading state from localstorage', e);
        console.warn('Clearing ls');
        exp.clearLocalStorage();
      }
    }

    if (loadApp) {
      let applicationState = JSON.parse(
        localStorage.getItem('APPLICATION_STATE')
      );
      if (applicationState) {
        online = applicationState.online ? applicationState.online : true;
        sessionValid = applicationState.sessionValid
          ? applicationState.sessionValid
          : false;
        activeUser = applicationState.activeUser
          ? applicationState.activeUser
          : null;
      } else {
        console.log('Tried to load null, falling back to defaults');
        online = true;
        sessionValid = false;
        activeUser = null;
      }
    }
  }

  reRender();
};

exp.clearLocalStorage = function () {
  console.log('Clearing ls ');
  localStorage.clear();
};

// HELPERS

function onEdit() {
  reRender();
  try {
    exp.saveDbStateToLocalStorage();
  } catch (e) {
    console.warn('Could not persist edit locally, restoring. ', e);
    exp.loadStateFromLocalStorage(true, false);
    reRender();
  }
  exp.scheduleSync();
}

function reRender() {
  expose.set_state('main', {
    render: true,
  });
}

// An async sleep function
async function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(ms);
    }, ms);
  });
}

// TODO: don't go through hex, just go dec to base62
function dec2hex(dec) {
  return ('0' + dec.toString(16)).substr(-2);
}

function getNextId() {
  let len = 20;
  var arr = new Uint8Array((len || 40) / 2);
  crypto.getRandomValues(arr);
  let hex = Array.from(arr, dec2hex).join('');
  return SharedLib.idUtils.hexToBase62(hex).padStart(14, '0');
}

// NOT SURE THIS IS THE RIGHT PLACE FOR THESE. MOVE TO SOME OTHER UTIL?

exp.getQueryObj = function () {
  let queryString = window.location.search || '';
  if (queryString[0] === '?') {
    queryString = queryString.slice(1);
  }
  let params = {},
    queries,
    temp,
    i,
    l;
  queries = queryString.split('&');
  for (i = 0, l = queries.length; i < l; i++) {
    temp = queries[i].split('=');
    params[temp[0]] = temp[1];
  }
  return params;
};

exp.editQueryObject = function (fieldName, value) {
  let queryObject = exp.getQueryObj();
  queryObject[fieldName] = value;
  let queryString = '';
  let keys = Object.keys(queryObject);
  let separationChar = '?';
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] && queryObject[keys[i]]) {
      queryString =
        queryString + separationChar + keys[i] + '=' + queryObject[keys[i]];
      separationChar = '&';
    }
  }
  window.history.replaceState(
    {},
    '',
    window.location.origin + window.location.pathname + queryString
  );
};

/**
 * You'll get more stats if you pass in decorated plate appearances
 */
exp.buildStatsObject = function (plateAppearances, playerId) {
  const player =
    typeof playerId === 'string' ? state.getPlayer(playerId) : playerId;

  const stats = {};
  stats.id = player ? player.id : undefined;
  stats.name = player ? player.name : undefined;
  stats.plateAppearances = 0;
  stats.totalBasesByHit = 0;
  stats.atBats = 0;
  stats.hits = 0;
  stats.singles = 0;
  stats.doubles = 0;
  stats.triples = 0;
  stats.insideTheParkHRs = 0;
  stats.outsideTheParkHRs = 0;
  stats.reachedOnError = 0;
  stats.walks = 0;
  stats.FCs = 0;
  stats.SACs = 0;
  stats.strikeouts = 0;
  stats.directOuts = 0;
  stats.gameAutocorrelation = '-';
  stats.paAutocorrelation = '-';
  stats.paPerGame = 0;
  stats.outsPerGame = 0;

  // Serial correlation for plate appearances
  let hitOrNoHit = [];
  plateAppearances.forEach((pa) => {
    if (['E', 'FC', 'Out', 'TP', 'DP', 'K', 'Ʞ', 'SAC'].includes(pa.result)) {
      hitOrNoHit.push(0);
    } else if (['1B', '2B', '3B', 'HRi', 'HRo'].includes(pa.result)) {
      hitOrNoHit.push(1);
    }
  });
  let paAutoCorResult = autoCorrelation(hitOrNoHit, 1);
  stats.paAutocorrelation = isStatSig(paAutoCorResult, hitOrNoHit.length)
    ? paAutoCorResult.toFixed(2)
    : '-';

  if (isStatSig(paAutoCorResult, hitOrNoHit.length)) {
    console.log(
      stats.name,
      isStatSig(paAutoCorResult, hitOrNoHit.length),
      hitOrNoHit
    );
  }

  // Serial correlation for games
  // TODO: we want this sorted by date right?
  let gamesLookup = {};
  plateAppearances.forEach((pa) => {
    if (pa?.game?.id) {
      if (gamesLookup[pa.game.id]) {
        gamesLookup[pa.game.id].push(pa);
      } else {
        gamesLookup[pa.game.id] = [];
      }
    }
  });
  let avgList = [];
  Object.keys(gamesLookup).forEach((gameId) => {
    let count = 0;
    let hits = 0;
    gamesLookup[gameId].forEach((pa) => {
      if (['E', 'FC', 'Out', 'TP', 'DP', 'K', 'Ʞ', 'SAC'].includes(pa.result)) {
        count++;
      } else if (['1B', '2B', '3B', 'HRi', 'HRo'].includes(pa.result)) {
        count++;
        hits++;
      }
    });
    avgList.push(hits / count);
  });
  let autoCorResult = autoCorrelation(avgList, 1);
  if (isStatSig(autoCorResult, avgList.length)) {
    console.log(stats.name, isStatSig(autoCorResult, avgList.length), avgList);
  }
  stats.gameAutocorrelation = isStatSig(autoCorResult, avgList.length)
    ? autoCorResult.toFixed(2)
    : '-';

  plateAppearances.forEach((pa) => {
    if (pa.result) {
      stats.plateAppearances++;

      if (pa.result && !results.getNoAtBatResults().includes(pa.result)) {
        stats.atBats++;
      }
      if (results.getHitResults().includes(pa.result)) {
        stats.hits++;
      }

      if (pa.result === 'BB') {
        stats.walks++; // Boo!
      } else if (pa.result === 'E') {
        stats.reachedOnError++;
      } else if (pa.result === 'FC') {
        stats.FCs++;
      } else if (
        pa.result === 'Out' ||
        pa.result === 'TP' ||
        pa.result === 'DP'
      ) {
        stats.directOuts++;
      } else if (pa.result === 'SAC') {
        stats.SACs++;
      } else if (pa.result === 'K' || pa.result === 'Ʞ') {
        stats.strikeouts++;
      } else if (pa.result === '1B') {
        stats.singles++;
        stats.totalBasesByHit++;
      } else if (pa.result === '2B') {
        stats.doubles++;
        stats.totalBasesByHit += 2;
      } else if (pa.result === '3B') {
        stats.triples++;
        stats.totalBasesByHit += 3;
      } else if (pa.result === 'HRi') {
        stats.insideTheParkHRs++;
        stats.totalBasesByHit += 4;
      } else if (pa.result === 'HRo') {
        stats.outsideTheParkHRs++;
        stats.totalBasesByHit += 4;
      } else {
        console.log(
          'WARNING: unrecognized batting result encountered and ignored for stats calculations',
          pa.result
        );
      }
    }
  });

  if (stats.atBats === 0) {
    stats.battingAverage = '-';
    stats.sluggingPercentage = '-';
  } else {
    if (stats.hits === stats.atBats) {
      stats.battingAverage = '1.000';
    } else {
      stats.battingAverage = (stats.hits / stats.atBats).toFixed(3).substr(1);
    }
    stats.sluggingPercentage = (stats.totalBasesByHit / stats.atBats).toFixed(
      3
    );
  }

  if (gamesLookup && Object.keys(gamesLookup).length > 0) {
    stats.paPerGame = (
      stats.plateAppearances / Object.keys(gamesLookup).length
    ).toFixed(2);
  }

  if (gamesLookup && Object.keys(gamesLookup).length > 0) {
    stats.outsPerGame = (
      (stats.plateAppearances - stats.hits) /
      Object.keys(gamesLookup).length
    ).toFixed(2);
  }

  // Derived stats
  stats.outs = stats.atBats - stats.hits;
  stats.homeruns = stats.insideTheParkHRs + stats.outsideTheParkHRs;

  return stats;
};

/**
 * Gets stats to be used in the optimization for each playerId passed in.
 * Respects any stats overrides.
 * The result is a map of playerId to stats object and there will be
 * no entries for players that have been deleted.
 */
exp.getActiveStatsForAllPlayers = function (overrideData, playerIds, teamIds) {
  let activeStats = {};
  for (let i = 0; i < playerIds.length; i++) {
    let player = exp.getPlayer(playerIds[i]);
    if (!player) {
      continue; // Player may have been deleted
    }

    let plateAppearances = [];
    let existingOverride = overrideData[player.id];
    if (existingOverride && existingOverride.length !== 0) {
      // If there are stats overrides, use those
      plateAppearances = existingOverride;
    } else {
      // Otherwise use the historical hitting data
      plateAppearances = exp.getPlateAppearancesForPlayerInGameOrOnTeam(
        player.id,
        teamIds,
        null // TODO: gameIds
      );
    }

    // Gather the stats required for the optimization
    let fullStats = exp.buildStatsObject(plateAppearances, player.id);
    activeStats[player.id] = fullStats;
  }
  return activeStats;
};

// WINDOW STATE FUNCTIONS

exp.getTimeTillSync = function () {
  if (syncTimerTimestamp === null) {
    return null;
  }
  return SYNC_DELAY_MS - (Date.now() - syncTimerTimestamp);
};

// APPLICATION STATE FUNCTIONS

exp.isOnline = function () {
  return online;
};

exp.isSessionValid = function () {
  return sessionValid;
};

exp.getActiveUser = function () {
  return activeUser;
};

exp.setOffline = function () {
  online = false;
  exp.saveApplicationStateToLocalStorage();
};

exp.setActiveUser = function (user) {
  activeUser = user;
  exp.saveApplicationStateToLocalStorage();
};

exp.setStatusBasedOnHttpResponse = function (code, isAuthRequest) {
  if (code >= 200 && code < 300) {
    // If this request required authentication and it succeeded, we know the session is valid
    if (isAuthRequest) {
      sessionValid = true;
    }
    online = true;
    // Sync might have been failing for network reasons, give it another shot
    if (exp.getSyncState() === SYNC_STATUS_ENUM.ERROR) {
      setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
      exp.scheduleSync();
    }
  } else if (code === 403 || code === 401) {
    sessionValid = false;
    online = true;
  } else if (code === -1) {
    online = false;
  }
  exp.saveApplicationStateToLocalStorage();
};

exp.setAddToHomescreenPrompt = function (e) {
  addToHomescreenEvent = e;
  reRender();
};

exp.getAddToHomescreenPrompt = function () {
  return addToHomescreenEvent;
};

exp.scheduleSync = function (time = SYNC_DELAY_MS) {
  let currentState = exp.getSyncState();
  if (currentState === SYNC_STATUS_ENUM.ERROR) {
    console.warn('[SYNC] Sync skipped, in error state');
    return;
  } else if (
    currentState === SYNC_STATUS_ENUM.IN_PROGRESS ||
    currentState === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
  ) {
    setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING);
  } else {
    setSyncState(SYNC_STATUS_ENUM.PENDING);
  }

  console.log('[SYNC] Sync scheduled');
  clearTimeout(syncTimer);
  syncTimerTimestamp = Date.now();

  syncTimer = setTimeout(function () {
    if (
      exp.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS ||
      currentState === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
    ) {
      console.log('[SYNC] There is already a sync in progress');
      exp.scheduleSync(SYNC_DELAY_MS);
      return;
    }
    exp.sync();
  }, time);
};

let setSyncState = function (newState, skipRender) {
  // Skip unnecessary renders
  if (syncState !== newState) {
    const origStateName = exp.syncStateToSyncStateName(syncState);
    const newStateName = exp.syncStateToSyncStateName(newState);
    //console.log(
    //  `[SYNC] Sync state updated from ${origStateName} (${syncState}) to ${newStateName} (${newState})`
    //);
    syncState = newState;
    if (!skipRender) {
      reRender();
    }
  }
};

exp.getSyncState = function () {
  return syncState;
};

exp.getSyncStateEnum = function () {
  return SYNC_STATUS_ENUM;
};

exp.setPreventScreenLock = function (value) {
  this.preventScreenLock = value;
  reRender();
};

exp.getPreventScreenLock = function () {
  return this.preventScreenLock;
};

exp.getLocalStorageUsage = function () {
  let total = 0;
  let players = 0;
  let teams = 0;
  let optimizations = 0;
  let xLen = 0;
  let x = 0;
  for (x in localStorage) {
    if (!localStorage.hasOwnProperty(x)) {
      continue;
    }
    xLen = (localStorage[x].length + x.length) * 2;

    if (x === 'LOCAL_DB_STATE') {
      let appState = JSON.parse(localStorage['LOCAL_DB_STATE']);
      for (let y in appState) {
        let yLen = (JSON.stringify(appState[y]).length + y.length) * 2;
        if (y === 'players') {
          players += yLen;
        } else if (y === 'teams') {
          teams += yLen;
        } else if (y === 'optimizations') {
          optimizations += yLen;
        }
      }
    }
    total += xLen;
    //console.log(x.substr(0, 50) + ' = ' + (xLen / 1024).toFixed(2) + ' KB');
  }

  // We multiply by 2 twice because:
  // 1) UTF-16 requires 2 bytes per character
  // 2) We need to store each character twice, both in local an ancestor
  return {
    players: (players / 1024) * 2,
    teams: (teams / 1024) * 2,
    optimizations: (optimizations / 1024) * 2,
    system: ((total - teams * 2 - players * 2 - optimizations * 2) / 1024) * 2,
    total: (total / 1024) * 2,
  };
  /*
  console.log('Playe = ' + ((players / 1024) * 2).toFixed(2) + ' KB');
  console.log('Teams = ' + ((teams / 1024) * 2).toFixed(2) + ' KB');
  console.log('Optim = ' + ((optimizations / 1024) * 2).toFixed(2) + ' KB');
  console.log(
    'Syste = ' +
      (
        ((total - teams * 2 - players * 2 - optimizations * 2) / 1024) *
        2
      ).toFixed(2) +
      ' KB'
  );
  console.log('Total = ' + (total / 1024).toFixed(2) + ' KB');
  */
};

/**
 * Perform a network request (internal - use requestAuth or request outside of this class).
 * Updates application state based on status code of the response
 */
let _request = async function (
  method,
  url,
  body,
  controller,
  overrideTimeout,
  isAuth
) {
  try {
    let response = await network.request(
      method,
      url,
      body,
      controller,
      overrideTimeout
    );
    state.setStatusBasedOnHttpResponse(response.status, isAuth);
    return response;
  } catch (err) {
    console.log('Encountered an error during network request');
    console.log(err);
    state.setOffline();
    // We'll just return -1 to say that something went wrong with the network
    const response = {};
    response.status = -1;
    response.body = {};
    response.body.message = err;
    return response;
  }
};

/**
 * Perform a network request.
 * Will update the state's "isOnline" variable based on the call's success or failure
 * Will update the state's "isSessionValid" variable based on the call's success or failure
 */
exp.requestAuth = async function (
  method,
  url,
  body,
  controller,
  overrideTimeout
) {
  return await _request(method, url, body, controller, overrideTimeout, true);
};

/**
 * Perform a network request.
 * Will update the state's "isOnline" variable based on the call's success or failure
 */
exp.request = async function (method, url, body, controller, overrideTimeout) {
  return await _request(method, url, body, controller, overrideTimeout, true);
};

window.state = exp;
export default exp;
