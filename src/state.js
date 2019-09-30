import expose from 'expose';
import objectMerge from '../object-merge';
import network from 'network';
import idUtils from '../id-utils';
import results from 'plate-appearance-results';
import commonUtils from '../common-utils';
import { getShallowCopy } from 'utils/functions';

import dialog from 'dialog';

const exp = {};

// Constants
const INITIAL_STATE = { teams: [], players: [], optimizations: [] };
const CURRENT_LS_SCHEMA_VERSION = '6';
const SYNC_DELAY_MS = 10000;
const SYNC_STATUS_ENUM = Object.freeze({
  COMPLETE: 1,
  ERROR: 2,
  IN_PROGRESS: 3,
  PENDING: 4,
  IN_PROGRESS_AND_PENDING: 5,
  UNKNOWN: 6,
});
exp.OPTIMIZATION_STATUS_ENUM = Object.freeze({
  NOT_STARTED: 0,
  ALLOCATING_RESOURCES: 1,
  IN_PROGRESS: 2,
  COMPLETE: 3,
  PAUSED: 4,
  ERROR: 5,
  PAUSING: 6,
});
const OPTIMIZATION_TYPE_ENUM = Object.freeze({
  MONTE_CARLO_EXAUSTIVE: 0,
});
exp.LINEUP_TYPE_ENUM = Object.freeze({
  NORMAL: 1,
  ALTERNATING_GENDER: 2,
  NO_CONSECUTIVE_FEMALES: 3,
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

const state = exp;

const getClientPlateAppearance = (pa, game) => ({
  ...pa,
  game,
  date: game.date,
});

exp.syncStateToSyncStateName = function(syncState) {
  for (let i in SYNC_STATUS_ENUM) {
    if (syncState === SYNC_STATUS_ENUM[i]) {
      return i;
    }
  }
  return '';
};

exp.getServerUrl = function(path) {
  return window.location.href + path;
};

// HTTP standard status codes plus:
// -1 network issue
// -2 failed on fullSync = false
// -3 failed on fullSync = true
exp.sync = async function(fullSync) {
  console.log('[SYNC] Sync requested', fullSync ? 'full' : 'patchOnly');

  while (
    exp.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS ||
    exp.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
  ) {
    // Simultaneous syncs might be okay, but we'll still limit it to one at a time for clarity
    console.log(
      '[SYNC] waiting for in progress sync to finish ' + exp.getSyncState()
    );
    await sleep(500);
  }
  // Kill any scheduled syncs
  clearTimeout(syncTimer);
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
      checksum: commonUtils.getHash(localState),
      patch: objectMerge.diff(state.getAncestorState(), localState),
      type: fullSync ? 'full' : 'any',
    };

    // Ship it
    console.log('[SYNC] Syncing...', body);
    let response = await network.request(
      'POST',
      'server/sync',
      JSON.stringify(body)
    );

    if (response.status === 200) {
      let serverState = response.body;

      // First gather any changes that were made locally while the request was still working
      let localChangesDuringRequest = objectMerge.diff(
        localStateCopyPreRequest,
        localState
      );

      // Update the ancestor if updates were received from the server
      if (serverState.base) {
        // The entire state was sent, we can just save it directly
        state.setAncestorState(serverState.base);
      } else if (serverState.patches) {
        // Patches were sent, apply all patches to a copy of the local state
        console.log(`[SYNC] Applying patches `);

        serverState.patches.forEach(patch => {
          objectMerge.patch(localStateCopyPreRequest, patch);
        });
        // The local state with the server updates is the new ancestor
        state.setAncestorState(localStateCopyPreRequest);
      } else {
        console.log('[SYNC] No updates recieved from server');
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
          // Something went wrong after trying a full sync, we probaly can't do anything about it!
          // serverState.base should have contained a verbatium copy of what the server has, so this is weird.
          console.log(
            '[SYNC] Yikes! Something went wrong while attempting full sync'
          );
          console.log(
            commonUtils.getHash(state.getAncestorState()),
            commonUtils.getHash(serverState.base)
          );

          console.log(commonUtils.getObjectString(state.getAncestorState()));
          console.log(commonUtils.getObjectString(serverState.base));

          // Set the state back to what it was when we first did a sync
          state.setAncestorState(ancestorStateCopy);
          throw new Error(-3);
        } else {
          // Something went wrong with the patch based sync, perhaps the server's cached data was incorrect
          // We should be able to repeat the request with type "full" so we'll get the whole state back, not just the patches
          console.log(
            '[SYNC] Something went wrong while attempting patch sync'
          );
          console.log(
            commonUtils.getHash(state.getLocalState),
            serverState.checksum
          );

          console.log(commonUtils.getObjectString(state.getLocalState));

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
      objectMerge.patch(newLocalState, localChangesDuringRequest, true);

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
    // We might be able to re-try some problems, like if the network is temporarally out
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
      console.warn('[SYNC] Issue with patch sync: attemtping full sync');
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
      console.warn('[SYNC] Probable bug encountered');
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

exp.resetSyncState = function() {
  setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
};

exp.resetState = function() {
  setSyncState(SYNC_STATUS_ENUM.UNKNOWN);

  online = true;
  sessionValid = false;
  activeUser = null;

  LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
  ANCESTOR_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));

  exp.saveApplicationStateToLocalStorage();
  exp.saveDbStateToLocalStorage();
};

exp.deleteAllLocalData = function() {
  LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
  onEdit();
};

exp.getLocalState = function() {
  return LOCAL_DB_STATE;
};

exp.getLocalStateChecksum = function() {
  return commonUtils.getHash(LOCAL_DB_STATE);
};

exp.setLocalState = function(newState) {
  LOCAL_DB_STATE = newState;
  onEdit();
};

let setLocalStateNoSideEffects = function(newState) {
  LOCAL_DB_STATE = newState;
};

exp.getAncestorState = function() {
  return ANCESTOR_DB_STATE;
};

exp.setAncestorState = function(s) {
  ANCESTOR_DB_STATE = s;
};

exp.getAncestorStateChecksum = function() {
  return commonUtils.getHash(ANCESTOR_DB_STATE);
};

exp.hasAnythingChanged = function() {
  // TODO: It's probaby faster just to comare these directly
  return (
    commonUtils.getHash(LOCAL_DB_STATE) !== commonUtils.getHash(INITIAL_STATE)
  );
};

// TEAM

exp.getTeam = function(team_id, state) {
  return (state || LOCAL_DB_STATE).teams.reduce((prev, curr) => {
    return curr.id === team_id ? curr : prev;
  }, null);
};

exp.addTeam = function(team_name) {
  const id = getNextId();
  let new_state = exp.getLocalState();
  let team = {
    id: id,
    name: team_name,
    games: [],
  };
  new_state.teams.push(team);
  onEdit();
  return team;
};

exp.replaceTeam = function(oldTeamId, newTeam) {
  let localState = exp.getLocalState();
  let oldTeam = exp.getTeam(oldTeamId);
  let oldTeamIndex = localState.teams.indexOf(oldTeam);
  localState.teams[oldTeamIndex] = newTeam;
  onEdit();
};

exp.removeTeam = function(team_id) {
  let new_state = exp.getLocalState();
  new_state.teams = new_state.teams.filter(team => {
    return team.id !== team_id;
  });
  onEdit();
};

exp.setTeamPublicIdEnabled = function(teamId, isEnabled) {
  const team = exp.getTeam(teamId);
  team.publicIdEnabled = isEnabled;
  onEdit();
};

// PLAYER

exp.getPlayer = function(player_id, state) {
  return (state || LOCAL_DB_STATE).players.reduce((prev, curr) => {
    return curr.id === player_id ? curr : prev;
  }, null);
};

exp.replacePlayer = function(playerId, newPlayer) {
  let localState = exp.getLocalState();
  let oldPlayer = exp.getPlayer(playerId, localState);

  let oldPlayerIndex = localState.players.indexOf(oldPlayer);
  localState.players[oldPlayerIndex] = newPlayer;
  onEdit();
};

exp.getAllPlayers = function(state) {
  return (state || exp.getLocalState()).players;
};

exp.getAllPlayersAlphabetically = function() {
  let playerNameComparator = function(a, b) {
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

exp.removePlayer = function(playerId) {
  if (
    exp.getGamesWithPlayerInLineup(playerId).length === 0 &&
    exp.getGamesWherePlayerHasPlateAppearances(playerId).length === 0
  ) {
    let localState = exp.getLocalState();
    localState.players = localState.players.filter(player => {
      return player.id !== playerId;
    });
    onEdit();
    return true;
  } else {
    return false;
  }
};

exp.addPlayer = function(playerName, gender) {
  const id = getNextId();
  let new_state = exp.getLocalState();
  let player = {
    id: id,
    name: playerName,
    gender: gender,
    song_link: null,
    song_start: null,
  };
  new_state.players.push(player);
  onEdit();
  return player;
};

// OPTIMIZATION

exp.getOptimization = function(optimizationId) {
  return LOCAL_DB_STATE.optimizations.reduce((prev, curr) => {
    return curr.id === optimizationId ? curr : prev;
  }, null);
};

exp.getAllOptimizations = function() {
  return exp.getLocalState().optimizations;
};

exp.replaceOptimization = function(optimizationId, newOptimization) {
  let localState = exp.getLocalState();
  let oldOptimization = exp.getOptimization(optimizationId);

  let oldOptimizationIndex = localState.optimizations.indexOf(oldOptimization);
  localState.optimizations[oldOptimizationIndex] = newOptimization;
  onEdit();
};

// TODO: can this be merged with setOptimizationField?
exp.setOptimizationCustomDataField = function(
  optimizationId,
  fieldName,
  fieldValue
) {
  let optimization = exp.getOptimization(optimizationId);
  let customData = JSON.parse(optimization.customData);
  if (fieldValue) {
    customData[fieldName] = fieldValue;
  } else {
    delete customData[fieldName];
  }
  optimization.customData = JSON.stringify(customData);
  onEdit();
};

exp.setOptimizationField = function(
  optimizationId,
  fieldName,
  fieldValue,
  isJson
) {
  console.log('Setting field', fieldName, fieldValue);

  let optimization = exp.getOptimization(optimizationId);
  if (isJson) {
    optimization[fieldName] = JSON.stringify(fieldValue);
  } else {
    optimization[fieldName] = fieldValue;
  }
  onEdit();
};

exp.getOptimizationCustomDataField = function(optimizationId, fieldName) {
  let optimization = exp.getOptimization(optimizationId);
  let customData = JSON.parse(optimization.customData);
  return customData[fieldName];
};

exp.removeOptimization = function(optimizationId) {
  let localState = exp.getLocalState();
  localState.optimizations = localState.optimizations.filter(optimization => {
    return optimization.id !== optimizationId;
  });
  onEdit();
};

exp.addOptimization = function(name) {
  const id = getNextId();
  let new_state = exp.getLocalState();
  let optimization = {
    id: id,
    name: name,
    type: OPTIMIZATION_TYPE_ENUM.MONTE_CARLO_EXAUSTIVE,
    customData: JSON.stringify({
      innings: 7,
      iterations: 10000,
    }),
    overrideData: JSON.stringify({}),
    status: exp.OPTIMIZATION_STATUS_ENUM.NOT_STARTED,
    resultData: null,
    statusMessage: null,
    sendEmail: false,
    teamList: JSON.stringify([]),
    gameList: JSON.stringify([]),
    playerList: JSON.stringify([]),
    lineupType: 1,
    executionData: null,
  };
  new_state.optimizations.push(optimization);
  onEdit();
  return optimization;
};

// GAME

exp.addGame = function(team_id, opposing_team_name) {
  let new_state = exp.getLocalState();
  const id = getNextId();
  const team = exp.getTeam(team_id, new_state);
  const timestamp = Math.floor(new Date().getTime() / 1000); // Postgres expects time in seconds not ms
  let lastLineup = [];
  let lastLineupType = 0;
  if (team.games.length) {
    let lastGame = team.games[team.games.length - 1];
    lastLineupType = lastGame.lineupType;
    lastLineup = lastGame.lineup.slice();
  }
  let game = {
    id: id,
    opponent: opposing_team_name,
    lineup: lastLineup ? lastLineup : [],
    date: timestamp,
    park: null,
    lineupType: lastLineupType ? lastLineupType : exp.LINEUP_TYPE_ENUM.NORMAL,
    plateAppearances: [],
  };
  team.games.push(game);
  onEdit();
  return game;
};

exp.replaceGame = function(oldGameId, teamId, newGame) {
  let localState = exp.getLocalState();
  let oldGame = exp.getGame(oldGameId);

  let team = exp.getTeam(teamId);
  let teamIndex = localState.teams.indexOf(team);

  let oldGameIndex = localState.teams[teamIndex].games.indexOf(oldGame);
  localState.teams[teamIndex].games[oldGameIndex] = newGame;
  onEdit();
};

exp.getGame = function(game_id, state) {
  for (let team of (state || LOCAL_DB_STATE).teams) {
    for (let game of team.games) {
      if (game.id === game_id) {
        return game;
      }
    }
  }

  return null;
};

exp.getGamesWithPlayerInLineup = function(playerId, state) {
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

exp.getGamesWherePlayerHasPlateAppearances = function(playerId, state) {
  let games = [];
  let localState = state || exp.getLocalState();
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

exp.addPlayerToLineup = function(lineup, player_id) {
  lineup.push(player_id);
  onEdit();
};

exp.updateLineup = function(lineup, playerId, newIndex) {
  let ind = lineup.indexOf(playerId);
  lineup.splice(ind, 1);
  lineup.splice(newIndex, 0, playerId);
  onEdit();
};

exp.removePlayerFromLineup = function(lineup, player_id) {
  let index = lineup.indexOf(player_id);
  lineup.splice(index, 1);
  onEdit();
};

exp.removeGame = function(game_id, team_id) {
  const new_state = exp.getLocalState();
  const team = exp.getTeam(team_id);
  const index = new_state.teams.indexOf(team);

  team.games = team.games.filter(game => {
    return game.id !== game_id;
  });

  if (index > -1) {
    new_state.teams[index] = team;
  } else {
    console.log('Game not found ' + game_id);
  }
  onEdit();
};

// PLATE APPEARANCE

exp.addPlateAppearance = function(player_id, game_id) {
  let game = exp.getGame(game_id);
  let plateAppearances = game.plateAppearances;
  let id = getNextId();
  let plateAppearance = {
    id: id,
    player_id: player_id,
    result: null,
    location: {
      x: null,
      y: null,
    },
  };
  plateAppearances.push(plateAppearance);
  onEdit();
  return plateAppearance;
};

exp.replacePlateAppearance = function(paId, gameId, teamId, newPa) {
  let localState = exp.getLocalState();
  let oldPa = exp.getPlateAppearance(paId);

  let team = exp.getTeam(teamId);
  let teamIndex = localState.teams.indexOf(team);

  let game = exp.getGame(gameId);
  let gameIndex = localState.teams[teamIndex].games.indexOf(game);

  let oldPaIndex = localState.teams[teamIndex].games[
    gameIndex
  ].plateAppearances.indexOf(oldPa);
  localState.teams[teamIndex].games[gameIndex].plateAppearances[
    oldPaIndex
  ] = newPa;
  onEdit();
};

// TODO: allow for passing team and game ids to improve perf
exp.getPlateAppearance = function(pa_id, state) {
  for (let team of (state || LOCAL_DB_STATE).teams) {
    for (let game of team.games) {
      for (let pa of game.plateAppearances) {
        if (pa.id === pa_id) {
          return getClientPlateAppearance(pa, game);
        }
      }
    }
  }
  return null;
};

exp.getPlateAppearancesForGame = function(gameId, state) {
  const game = exp.getGame(gameId, state);
  if (!game) {
    return null;
  }
  return game.plateAppearances.map(pa => getClientPlateAppearance(pa, game));
};

exp.getPlateAppearancesForPlayerInGame = function(player_id, game_id, state) {
  const game = exp.getGame(game_id, state);
  const player = exp.getPlayer(player_id, state);
  if (!game || !player) {
    return null;
  }
  return game.plateAppearances.filter(pa => pa.player_id === player_id);
};

exp.getPlateAppearancesForPlayerOnTeam = function(player_id, team_id, state) {
  const team =
    typeof team_id === 'string' ? exp.getTeam(team_id, state) : team_id;
  let plateAppearances = [];

  if (team && team.games) {
    team.games.forEach(game => {
      if (game.plateAppearances) {
        const plateAppearancesThisGame = game.plateAppearances
          .filter(pa => player_id === pa.player_id)
          .map(pa => {
            return getClientPlateAppearance(pa, game);
          });
        plateAppearances = plateAppearances.concat(plateAppearancesThisGame);
      }
    });
  }
  return plateAppearances;
};

exp.getPlateAppearancesForPlayerInGameOrOnTeam = function(
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

exp.getPlateAppearancesForPlayer = function(player_id, state) {
  let localState = state || exp.getLocalState();
  let teams = localState.teams;
  let plateAppearances = [];

  if (teams) {
    teams.forEach(team => {
      if (team.games) {
        team.games.forEach(game => {
          if (game.plateAppearances) {
            const plateAppearancesThisGame = game.plateAppearances
              .filter(pa => player_id === pa.player_id)
              .map(pa => {
                return getClientPlateAppearance(pa, game);
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

exp.updatePlateAppearanceResult = function(plateAppearance, result) {
  plateAppearance.result = result;
  onEdit();
};

exp.updatePlateAppearanceLocation = function(plateAppearance, location) {
  plateAppearance.location = {};
  plateAppearance.location.x = Math.floor(location[0]);
  plateAppearance.location.y = Math.floor(location[1]);
  onEdit();
};

exp.removePlateAppearance = function(plateAppearance_id, game_id) {
  exp.getLocalState();
  let game = exp.getGame(game_id);

  game.plateAppearances = game.plateAppearances.filter(pa => {
    return pa.id !== plateAppearance_id;
  });
  onEdit();
};

// LOCAL STORAGE

exp.saveDbStateToLocalStorage = function() {
  if (typeof Storage !== 'undefined') {
    /*
    // Disable compression for now
    let compressedLocalState = LZString.compress(
      JSON.stringify(LOCAL_DB_STATE)
    );
    let compressedAncesorState = LZString.compress(
      JSON.stringify(ANCESTOR_DB_STATE)
    );

    localStorage.setItem("SCHEMA_VERSION", CURRENT_LS_SCHEMA_VERSION);
    localStorage.setItem("LOCAL_DB_STATE", compressedLocalState);
    localStorage.setItem("ANCESTOR_DB_STATE", compressedAncesorState);
    */

    localStorage.setItem('SCHEMA_VERSION', CURRENT_LS_SCHEMA_VERSION);
    localStorage.setItem('LOCAL_DB_STATE', JSON.stringify(LOCAL_DB_STATE));
    localStorage.setItem(
      'ANCESTOR_DB_STATE',
      JSON.stringify(ANCESTOR_DB_STATE)
    );
  }
};

exp.saveApplicationStateToLocalStorage = function() {
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

exp.loadStateFromLocalStorage = function() {
  if (typeof Storage !== 'undefined') {
    // These statements define local storage schema migrations
    // TODO: this logic also needs to be executed when importing a file
    if (localStorage.getItem('SCHEMA_VERSION') === '5') {
      // Added optimizations
      console.log('Upgrading localstorage from version 5 to version 6');
      let localState = JSON.parse(localStorage.getItem('LOCAL_DB_STATE'));
      localState['optimizations'] = [];
      let ancestorState = JSON.parse(localStorage.getItem('ANCESTOR_DB_STATE'));
      ancestorState['optimizations'] = [];
      localStorage.setItem('SCHEMA_VERSION', '6');
      localStorage.setItem('LOCAL_DB_STATE', JSON.stringify(localState));
      localStorage.setItem('ANCESTOR_DB_STATE', JSON.stringify(ancestorState));
    }

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

    let localDbState = localStorage.getItem('LOCAL_DB_STATE');
    if (localDbState) {
      // LOCAL_DB_STATE = JSON.parse(LZString.decompress(localDbState));
      LOCAL_DB_STATE = JSON.parse(localDbState);
    }

    let ancestorDbState = localStorage.getItem('ANCESTOR_DB_STATE');
    if (ancestorDbState) {
      // ANCESTOR_DB_STATE = JSON.parse(LZString.decompress(ancestorDbState));
      ANCESTOR_DB_STATE = JSON.parse(ancestorDbState);
    }

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

  reRender();
};

exp.clearLocalStorage = function() {
  console.log('Clearing ls ');
  localStorage.clear();
};

// HELPERS

function onEdit() {
  reRender();
  exp.saveDbStateToLocalStorage();
  exp.scheduleSync();
}

function reRender() {
  expose.set_state('main', {
    render: true,
  });
}

// An async sleep function
async function sleep(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
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
  return idUtils.hexToBase62(hex).padStart(14, '0');
}

// NOT SURE THIS IS THE RIGHT PLACE FOR THESE. MOVE TO SOME OTHER UTIL?

exp.getQueryObj = function() {
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

exp.editQueryObject = function(fieldName, value) {
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

exp.buildStatsObject = function(playerId, plateAppearances) {
  const player =
    typeof playerId === 'string' ? state.getPlayer(playerId) : playerId;

  const stats = {};
  stats.id = player.id;
  stats.name = player.name;
  stats.plateAppearances = 0;
  stats.totalBasesByHit = 0;
  stats.atBats = 0;
  stats.hits = 0;
  stats.singles = 0;
  stats.doubles = 0;
  stats.triples = 0;
  stats.insideTheParkHR = 0;
  stats.outsideTheParkHR = 0;
  stats.reachedOnError = 0;
  stats.walks = 0;
  stats.fieldersChoice = 0;

  plateAppearances.forEach(pa => {
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
        stats.fieldersChoice++;
      } else if (
        pa.result === 'Out' ||
        pa.result === 'SAC' ||
        pa.result === 'K'
      ) {
        // Intentionally blank
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
        stats.insideTheParkHR++;
        stats.totalBasesByHit += 4;
      } else if (pa.result === 'HRo') {
        stats.outsideTheParkHR++;
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

  return stats;
};

// APPLICATION STATE FUNCTIONS

exp.isOnline = function() {
  return online;
};

exp.isSessionValid = function() {
  return sessionValid;
};

exp.getActiveUser = function() {
  return activeUser;
};

exp.setOffline = function() {
  online = false;
  exp.saveApplicationStateToLocalStorage();
};

exp.setActiveUser = function(user) {
  activeUser = user;
  exp.saveApplicationStateToLocalStorage();
};

// This assumes all routes are behind login
exp.setStatusBasedOnHttpResponse = function(code) {
  if (code >= 200 && code < 300) {
    sessionValid = true;
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

exp.setAddToHomescreenPrompt = function(e) {
  addToHomescreenEvent = e;
  reRender();
};

exp.getAddToHomescreenPrompt = function() {
  return addToHomescreenEvent;
};

exp.scheduleSync = function(time = SYNC_DELAY_MS) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

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

  syncTimer = setTimeout(function() {
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

let setSyncState = function(newState, skipRender) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Skip unnecessary renders
  if (syncState !== newState) {
    const origStateName = exp.syncStateToSyncStateName(syncState);
    const newStateName = exp.syncStateToSyncStateName(newState);
    console.log(
      `[SYNC] Sync state updated from ${origStateName} (${syncState}) to ${newStateName} (${newState})`
    );
    syncState = newState;
    if (!skipRender) {
      reRender();
    }
  }
};

exp.getSyncState = function() {
  return syncState;
};

exp.getSyncStateEnum = function() {
  return SYNC_STATUS_ENUM;
};

exp.setPreventScreenLock = function(value) {
  console.log('setting value', value);
  this.preventScreenLock = value;
  reRender();
};

exp.getPreventScreenLock = function() {
  return this.preventScreenLock;
};

// Flip enums for reverse lookups
let optStatuses = Object.keys(exp.OPTIMIZATION_STATUS_ENUM);
exp.OPTIMIZATION_STATUS_ENUM_INVERSE = {};
for (let i = 0; i < optStatuses.length; i++) {
  let englishValue = optStatuses[i];
  exp.OPTIMIZATION_STATUS_ENUM_INVERSE[
    exp.OPTIMIZATION_STATUS_ENUM[englishValue]
  ] = englishValue;
}

/*
let lineupTypes = Object.keys(exp.LINEUP_TYPE_ENUM);
exp.LINEUP_TYPE_ENUM_INVERSE = {};
for (let i = 0; i < lineupTypes.length; i++) {
  let englishValue = lineupTypes[i];
  exp.LINEUP_TYPE_ENUM_INVERSE[
    exp.LINEUP_TYPE_ENUM[englishValue]
  ] = englishValue;
}
*/

window.state = exp;
export default exp;
