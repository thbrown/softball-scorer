import network from 'network';
import SharedLib from 'shared-lib';
import results from 'plate-appearance-results';
import {
  getShallowCopy,
  autoCorrelation,
  isStatSig,
  reRender,
  getNextId,
  getNextName,
} from 'utils/functions';
import StateIndex from 'state-index';
import StateContainer from 'state-container';
import { LsMigrationError, LsSchemaVersionError } from 'state-errors';

import dialog from 'dialog';
import { LocalStorageStorage, InMemoryStorage } from 'state-storage';
const TLSchemas = SharedLib.schemaValidation.TLSchemas;

// CONSTANTS
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

const SYNC_DELAY_MS = 10000;
const SYNC_STATUS_ENUM = Object.freeze({
  COMPLETE: 1,
  ERROR: 2,
  IN_PROGRESS: 3,
  PENDING: 4,
  IN_PROGRESS_AND_PENDING: 5,
  UNKNOWN: 6,
});

const LINEUP_TYPE_ENUM = Object.freeze({
  NORMAL: 0,
  ALTERNATING_GENDER: 1,
  NO_CONSECUTIVE_FEMALES: 2,
  NO_CONSECUTIVE_FEMALES_AND_NO_THREE_CONSECUTIVE_MALES: 3,
});

/**
 * TODO: remove this
 * Returns a plate appearance with the game object it's from (or optimization if it's an optimization override PA).
 */
const decoratePlateAppearance = (pa, game) => ({
  ...pa,
  game,
  date: game?.date,
});

/*
 * NOTE: Because we want all changes to the state to be done via the functions in this class
 * (as opposed to mutating objects that were returned from getters) we should consider deep
 * copying all objects returned by the getters, then recursively freezing them so the app
 * will throw an error when updates are done outside of this class.
 */
export class GlobalState {
  constructor(
    stateContainer,
    index,
    storage = new LocalStorageStorage(),
    prohibitSync
  ) {
    // Application State - State that applies across windows/tabs. Stored in local storage and in memory.
    this.online = true;
    this.sessionValid = false;
    this.activeUser = null;

    // Window State - State saved in memory only
    this.addToHomescreenEvent = null;
    this.syncState = SYNC_STATUS_ENUM.UNKNOWN;
    this.syncTimer = null;
    this.syncTimerTimestamp = null;

    // Database State - Stored in memory, local storage, and persisted in the db (default values)
    if (stateContainer) {
      const stateString = JSON.stringify(stateContainer.get());
      const copyOfState = JSON.parse(stateString);
      SharedLib.schemaMigration.updateSchema(null, copyOfState, 'client');
      SharedLib.schemaValidation.validateSchema(copyOfState, TLSchemas.CLIENT);
      this.ANCESTOR_DB_STATE_CONT = new StateContainer(
        JSON.parse(JSON.stringify(copyOfState))
      );
      stateContainer.set(copyOfState);
      this.LOCAL_DB_STATE_CONT = stateContainer;
    } else {
      this.ANCESTOR_DB_STATE_CONT = new StateContainer(
        JSON.parse(JSON.stringify(INITIAL_STATE))
      );
      this.LOCAL_DB_STATE_CONT = new StateContainer(
        JSON.parse(JSON.stringify(INITIAL_STATE))
      );
    }

    // Index for quick relationship lookups
    if (index) {
      this.INDEX = index;
    } else {
      this.INDEX = new StateIndex(this.LOCAL_DB_STATE_CONT);
    }

    this.prohibitSync = prohibitSync;
    this.storage = storage;
  }

  getNewGame(opposingTeamName, lineup, lineupType) {
    const timestamp = Math.floor(new Date().getTime() / 1000); // Time in seconds not ms
    const id = getNextId();
    return {
      id: id,
      opponent: opposingTeamName,
      lineup: lineup ? lineup : [],
      date: timestamp,
      scoreUs: {},
      scoreThem: {},
      lineupType: lineupType ? lineupType : LINEUP_TYPE_ENUM.NORMAL,
      plateAppearances: [],
    };
  }

  getNewPlateAppearance(playerId) {
    const id = getNextId();
    return {
      id: id,
      playerId: playerId,
      result: null,
      location: {
        x: null,
        y: null,
      },
      runners: {},
    };
  }

  // SYNC

  syncStateToSyncStateName(syncState) {
    for (let i in SYNC_STATUS_ENUM) {
      if (syncState === SYNC_STATUS_ENUM[i]) {
        return i;
      }
    }
    return '';
  }

  // HTTP standard status codes plus:
  // -1 network issue
  // -2 failed on fullSync = false
  // -3 failed on fullSync = true
  async sync(fullSync) {
    console.log('[SYNC] Sync requested', fullSync ? 'full' : 'patchOnly');

    if (this.prohibitSync) {
      console.warn('[SYNC] Sync skipped because prohibitSync was enabled');
      return;
    }

    while (
      this.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS ||
      this.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
    ) {
      // Simultaneous syncs might be okay, but we'll still limit it to one at a time for clarity
      console.log(
        '[SYNC] waiting for in progress sync to finish ' + this.getSyncState()
      );
      await SharedLib.commonUtils.sleep(500); // TODO: debounce
    }
    // Kill any scheduled syncs
    clearTimeout(this.syncTimer);
    this.syncTimerTimestamp = null;
    this._setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS);
    try {
      // Save a deep copy of the local state
      let localStateCopyPreRequest = JSON.parse(
        JSON.stringify(this.getLocalState())
      );
      let localState = this.getLocalState();

      // Save the ancestor state so we can restore it if something goes wrong
      //let ancestorStateCopy = JSON.parse(
      //  JSON.stringify(this.getAncestorState())
      //);

      // Get the patch ready to send to the server
      let body = {
        checksum: SharedLib.commonUtils.getHash(localState),
        patch: SharedLib.objectMerge.diff(this.getAncestorState(), localState),
        type: fullSync ? 'full' : 'any',
      };

      // Ship it
      //console.log(this.getAncestorState(), localState);
      console.log('[SYNC] Syncing...');
      const response = await this.requestAuth(
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

        console.log('[SYNC] Local changes', localChangesDuringRequest);

        // Update the ancestor if updates were received from the server
        let tempAncestor = undefined;
        if (serverState.base) {
          // The entire state was sent, we can just save it directly
          tempAncestor = serverState.base;
        } else if (serverState.patch) {
          // Patch was sent, apply the patch to a copy of the local state
          console.log(`[SYNC] Applying patch (${serverState.patch.length})`);

          localStateCopyPreRequest = SharedLib.objectMerge.patch(
            localStateCopyPreRequest,
            serverState.patch
          );

          // The local state with the server updates is the new ancestor
          tempAncestor = localStateCopyPreRequest;
        } else {
          console.log('[SYNC] No updates received from server');
          tempAncestor = localStateCopyPreRequest;
        }

        // TODO: we want to always set the local state before the ancestor state to avoid deletion on partial execution.
        // TODO: Maybe we want partial sync to fail when updating objects that don't exist. Then for full sync we can merge the whole client state in.

        // Verify that the ancestor state (after updates) has the same hash as the server state
        let ancestorHash = SharedLib.commonUtils.getHash(tempAncestor);

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
              SharedLib.commonUtils.getHash(ancestorHash),
              'Server has',
              SharedLib.commonUtils.getHash(serverState.base)
            );

            console.log(JSON.stringify(ancestorHash, null, 2));
            console.log(SharedLib.commonUtils.getObjectString(ancestorHash));
            throw new Error(-3);
          } else {
            // Something went wrong with the patch-based sync, perhaps the server's cached data was incorrect
            // We should be able to repeat the request with type "full" so we'll get the whole state back, not just the patches
            console.warn(
              '[SYNC] Something went wrong while attempting patch sync'
            );
            console.warn(
              SharedLib.commonUtils.getHash(this.getLocalState()),
              serverState.checksum
            );

            console.warn(
              SharedLib.commonUtils.getObjectString(
                JSON.stringify(this.getLocalState(), null, 2)
              )
            );

            console.warn(
              SharedLib.commonUtils.getObjectString(this.getLocalState())
            );
            throw new Error(-2);
          }
        } else {
          console.log(
            '[SYNC] Sync was successful! (client and server checksums match)'
          );
        }

        // Copy
        let newLocalState = JSON.parse(JSON.stringify(tempAncestor));

        // Apply any changes that were made during the request to the new local state (Presumably this will be a no-op most times)
        newLocalState = SharedLib.objectMerge.patch(
          newLocalState,
          localChangesDuringRequest,
          true
        );

        // Set local state to a copy of ancestor state (w/ localChangesDuringRequest applied)
        this.setLocalStateNoSideEffects(newLocalState);

        // Now set the ancestor, it's important to do this last as having an updated ancestor but not an updated local state would cause
        // a patch with deletions possibly resulting in data loss.
        this.setAncestorState(tempAncestor);

        console.log(
          '[SYNC] local',
          this.getLocalStateChecksum(),
          'ancestor',
          this.getAncestorStateChecksum()
        );
        reRender();

        // Write the most updated data to local storage
        this.storage.saveDbState(this.getLocalState(), this.getAncestorState());
      } else {
        throw new Error(response.status);
      }

      if (this.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS) {
        this._setSyncState(SYNC_STATUS_ENUM.COMPLETE);
      } else if (
        this.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
      ) {
        this._setSyncState(SYNC_STATUS_ENUM.PENDING);
      } else {
        // Don't think this should be possible
        console.log('[SYNC] Invalid state transition');
        this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
      }

      return response.status;
    } catch (err) {
      // We might be able to re-try some problems, like if the network is temporarily out
      this._setSyncState(SYNC_STATUS_ENUM.PENDING); // Assume re-try
      if (
        (+err.message === -1 && !this.isOnline()) ||
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
        this._setSyncState(SYNC_STATUS_ENUM.ERROR);
      } else if (+err.message === 503 || +err.message === -1) {
        // Re-try later might work for
        // 1) Server rate limiting errors
        // 2) Weird network conditions
        console.warn(
          '[SYNC] Network issues or server is busy: retrying sync later'
        );
        this.scheduleSync();
      } else if (+err.message === -2) {
        // Issue with patch based sync, re-try with a full sync
        console.warn('[SYNC] Issue with patch sync: attempting full sync');
        return await this.sync(true);
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
        this._setSyncState(SYNC_STATUS_ENUM.ERROR);
      } else {
        // Other 500s, 400s are probably bugs :(, tell the user something is wrong
        console.warn(`[SYNC] Probable bug encountered ${err}`);
        console.warn(err.stack);
        dialog.show_notification(
          'Auto sync failed with message "' +
            err.message +
            `". App will continue to function, but your data won't be synced with the server. Consider backing up your data from the main menu to avoid data loss. Details: ` +
            err,
          () => {}
        );
        console.warn(err.stack);
        this._setSyncState(SYNC_STATUS_ENUM.ERROR);
      }
      return err.message;
    }
  }

  resetSyncState() {
    this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
  }

  resetState() {
    this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN);

    this.online = true;
    this.sessionValid = false;
    this.activeUser = null;

    console.log('Resetting state');

    this.LOCAL_DB_STATE_CONT.set(JSON.parse(JSON.stringify(INITIAL_STATE)));
    this.ANCESTOR_DB_STATE_CONT.set(JSON.parse(JSON.stringify(INITIAL_STATE)));

    this.storage.saveApplicationState(
      this.online,
      this.sessionValid,
      this.activeUser
    );
    this.storage.saveDbState(this.getLocalState(), this.getAncestorState());
  }

  deleteAllData() {
    this.LOCAL_DB_STATE_CONT.set(JSON.parse(JSON.stringify(INITIAL_STATE)));
    this._onEdit();
  }

  getLocalState() {
    return this.LOCAL_DB_STATE_CONT.get();
  }

  getLocalStateChecksum() {
    return SharedLib.commonUtils.getHash(this.getLocalState());
  }

  setLocalState(newState) {
    SharedLib.schemaValidation.validateSchema(newState, TLSchemas.CLIENT);
    this.LOCAL_DB_STATE_CONT.set(newState);
    this._onEdit();
  }

  setLocalStateNoSideEffects(newState) {
    SharedLib.schemaValidation.validateSchema(newState, TLSchemas.CLIENT);
    this.LOCAL_DB_STATE_CONT.set(newState);
  }

  getAncestorState() {
    return this.ANCESTOR_DB_STATE_CONT.get();
  }

  setAncestorState(s) {
    this.ANCESTOR_DB_STATE_CONT.set(s);
  }

  getAncestorStateChecksum() {
    return SharedLib.commonUtils.getHash(this.getAncestorState());
  }

  hasAnythingChanged() {
    // TODO: It's probably faster just to compare these directly
    return (
      SharedLib.commonUtils.getHash(this.getLocalState()) !==
      SharedLib.commonUtils.getHash(INITIAL_STATE)
    );
  }

  // TEAM
  getTeam(teamId) {
    const team = this.INDEX.getTeam(teamId);
    return team === undefined ? undefined : { ...team };
  }

  getAllTeams() {
    return getShallowCopy(this.getLocalState().teams);
  }

  addTeam(teamName) {
    const localState = this.getLocalState();
    const team = {
      id: getNextId(),
      name: teamName,
      games: [],
    };
    localState.teams.push(team);
    this.INDEX.addTeam(team.id);
    this._onEdit();
    return team;
  }

  replaceTeam(oldTeamId, newTeam) {
    const localState = this.getLocalState();
    const oldTeamIndex = this.INDEX.getTeamIndex(oldTeamId);
    localState.teams[oldTeamIndex] = newTeam;
    this._onEdit();
  }

  removeTeam(teamId) {
    const localState = this.getLocalState();
    const teamIndex = this.INDEX.getTeamIndex(teamId);
    localState.teams.splice(teamIndex, 1);
    this._onEdit();
  }

  // PLAYER
  getPlayer(playerId) {
    const player = this.INDEX.getPlayer(playerId);
    return player === undefined ? undefined : { ...player };
  }

  getAllPlayers() {
    return getShallowCopy(this.getLocalState().players);
  }

  getAllPlayersAlphabetically() {
    const playerNameComparator = function (a, b) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    };
    return this.getAllPlayers().sort(playerNameComparator);
  }

  addPlayer(playerName, gender) {
    const id = getNextId();
    let newState = this.getLocalState();
    let player = {
      id: id,
      name: playerName,
      gender: gender,
      songLink: null,
      songStart: null,
    };
    newState.players.push(player);
    this.INDEX.addPlayer(player.id);
    this._onEdit();
    return player;
  }

  replacePlayer(playerId, newPlayer) {
    const localState = this.getLocalState();
    const oldPlayerIndex = this.INDEX.getPlayerIndex(playerId);
    localState.players[oldPlayerIndex] = newPlayer;
    this._onEdit();
  }

  removePlayer(playerId) {
    if (
      this.getGamesWithPlayerInLineup(playerId).length === 0 &&
      this.getGamesWherePlayerHasPlateAppearances(playerId).length === 0
    ) {
      const localState = this.getLocalState();
      const playerIndex = this.INDEX.getPlayerIndex(playerId);
      localState.players.splice(playerIndex, 1);
      this._onEdit();
      return true;
    } else {
      return false;
    }
  }

  // OPTIMIZATION
  getOptimization(optimizationId) {
    const opt = this.INDEX.getOptimization(optimizationId);
    return opt === undefined ? undefined : { ...opt };
  }

  getAllOptimizations() {
    return getShallowCopy(this.getLocalState().optimizations);
  }

  addOptimization(name, playerList, teamList, lineupType) {
    const id = getNextId();
    let localState = this.getLocalState();
    let optimization = {
      id: id,
      name: name,
      customOptionsData: {},
      overrideData: {},
      resultData: {},
      statusMessage: null,
      sendEmail: false,
      teamList: teamList ? teamList : this.getAllTeams().map((t) => t.id),
      gameList: [],
      playerList: playerList ? playerList : [],
      lineupType: lineupType === undefined ? 0 : lineupType,
      optimizerType:
        SharedLib.constants.OPTIMIZATION_TYPE_ENUM.MONTE_CARLO_ADAPTIVE,
      inputSummaryData: {},
    };
    localState.optimizations.push(optimization);
    this.INDEX.addOptimization(optimization.id);
    this._onEdit();
    return optimization;
  }

  replaceOptimization(optimizationId, newOptimization) {
    const localState = this.getLocalState();
    const oldOptimizationIndex =
      this.INDEX.getOptimizationIndex(optimizationId);
    localState.optimizations[oldOptimizationIndex] = newOptimization;
    this._onEdit();
  }

  removeOptimization(optimizationId) {
    const localState = this.getLocalState();
    const optIndex = this.INDEX.getOptimizationIndex(optimizationId);
    localState.optimizations.splice(optIndex, 1);
    this._onEdit();
  }

  getUsedOptimizers() {
    return Array.from(
      this.getLocalState().optimizations.map(
        (optimization) => optimization.optimizerType
      )
    );
  }

  // Set a field on the specified optimization object
  setOptimizationField(optimizationId, fieldName, fieldValue) {
    const optimization = this.INDEX.getOptimization(optimizationId);
    optimization[fieldName] = fieldValue;
    this._onEdit();
  }

  // Set a field on the customOptions field
  setOptimizationCustomOptionsDataField(optimizationId, fieldName, fieldValue) {
    const optimization = this.INDEX.getOptimization(optimizationId);
    const customOptionsData = optimization.customOptionsData;
    if (fieldValue === undefined) {
      delete customOptionsData[fieldName];
    } else {
      customOptionsData[fieldName] = fieldValue;
    }
    optimization.customOptionsData = customOptionsData;
    this._onEdit();
  }

  getOptimizationOverridesForPlayer(optimizationId, playerId) {
    const optimization = this.getOptimization(optimizationId);
    if (optimization.overrideData) {
      const allOverrides = optimization.overrideData;
      return allOverrides[playerId] ? allOverrides[playerId] : [];
    } else {
      return [];
    }
  }

  getOptimizationCustomOptionsDataField(optimizationId, fieldName) {
    const optimization = this.getOptimization(optimizationId);
    const customOptionsData = optimization.customOptionsData;
    return customOptionsData[fieldName];
  }

  duplicateOptimization(optimizationId) {
    const toDuplicate = this.getOptimization(optimizationId);
    const localState = this.getLocalState();
    const duplicatedOptimization = JSON.parse(JSON.stringify(toDuplicate));

    // Reset the any status fields and de-duplicate unique fields
    duplicatedOptimization.id = getNextId();

    const newName = getNextName(duplicatedOptimization.name);
    duplicatedOptimization.name = newName.substring(0, 49); // Prevent the name form being too long
    duplicatedOptimization.resultData = {};
    duplicatedOptimization.statusMessage = null;
    duplicatedOptimization.inputSummaryData = {};

    // Read-only fields
    delete duplicatedOptimization.status;
    delete duplicatedOptimization.pause;

    localState.optimizations.push(duplicatedOptimization);
    this._onEdit();
  }

  // OPTIMIZATION OVERRIDES - Plate appearances that supersede historical hitting data while running the optimization

  getOptimizationOverridePlateAppearance(paId) {
    return { ...this.INDEX.getPaFromOptimization(paId) };
  }

  addOptimizationOverridePlateAppearance(optimizationId, playerId) {
    const optimization = this.INDEX.getOptimization(optimizationId);
    const allOverrides = optimization.overrideData;

    const playerOverrides = allOverrides[playerId];
    const addedPa = this.getNewPlateAppearance(playerId);

    if (!playerOverrides) {
      allOverrides[playerId] = [addedPa];
    } else {
      allOverrides[playerId].push(addedPa);
    }

    optimization.overrideData = allOverrides;
    this.INDEX.addPaToOptimization(addedPa.id, playerId, optimization.id);
    this._onEdit();
    return { ...addedPa };
  }

  removeOptimizationOverridePlateAppearance(optimizationId, playerId, paId) {
    const optimization = this.INDEX.getOptimization(optimizationId);
    const allOverrides = optimization.overrideData;

    const playerOverrides = allOverrides[playerId];
    const paIndex = this.INDEX.getPaFromOptimizationIndex(paId);

    playerOverrides.splice(paIndex, 1);

    // Remove the player entry if the array is empty
    if (playerOverrides.length === 0) {
      delete allOverrides[playerId];
    }
    this._onEdit();
  }

  replaceOptimizationOverridePlateAppearance(
    optimizationId,
    playerId,
    paId,
    paToAdd
  ) {
    const optimization = this.INDEX.getOptimization(optimizationId);
    const allOverrides = optimization.overrideData;
    const playerOverrides = allOverrides[playerId];

    const paIndex = this.INDEX.getOptimizationIndex(paId);
    playerOverrides[paIndex] = paToAdd;
    this._onEdit();
  }

  // GAME

  addGame(teamId, opposingTeamName) {
    const newState = this.getLocalState();
    const team = this.getTeam(teamId, newState);
    let lastLineup = [];
    let lastLineupType = 0;
    if (team.games.length) {
      let lastGame = team.games[team.games.length - 1];
      lastLineupType = lastGame.lineupType;
      lastLineup = lastGame.lineup.slice();
    }
    const game = this.getNewGame(opposingTeamName, lastLineup, lastLineupType);
    team.games.push(game);
    this.INDEX.addGame(game.id, team.id);
    this._onEdit();
    return game;
  }

  replaceGame(oldGameId, teamId, newGame) {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForGame(oldGameId);
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    const oldGameIndex = this.INDEX.getGameIndex(oldGameId);
    localState.teams[teamIndex].games[oldGameIndex] = newGame;
    this._onEdit();
  }

  getGameObjects(gameId) {
    const game = this.getGame(gameId);
    if (game === undefined) {
      return undefined;
    }
    const team = this.INDEX.getTeamForGame(gameId);
    return { game, team };
  }

  getGame(gameId) {
    const game = this.INDEX.getGame(gameId);
    return game === undefined ? undefined : { ...game };
  }

  _getMutableGame(gameId) {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForGame(gameId);
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    const gameIndex = this.INDEX.getGameIndex(gameId);
    return localState.teams[teamIndex].games[gameIndex];
  }

  getGamesWithPlayerInLineup(playerId, state) {
    let games = [];
    let localState = state || this.getLocalState();
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
  }

  getGamesWherePlayerHasPlateAppearances(playerId, state) {
    const games = [];
    const localState = state || this.getLocalState();
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
  }

  getInningScores(gameId) {
    const pas = this.getPlateAppearancesForGame(gameId);

    const result = [];
    let outs = 0;
    let score = 0;
    for (let pa of pas) {
      const runsInPa = pa.runners.scored?.length ?? 0;
      const outsInPa = pa.runners.out?.length ?? 0;
      score += runsInPa;
      outs += outsInPa;
      if (outsInPa > 0 && outs % 3 === 0) {
        // Inning ending PA
        result.push(score);
        score = 0;
      }
    }

    // The last inning might not have 3 yet, add it.
    result.push(score);

    return result;
  }

  setGameLineup(gameId, newLineup) {
    const game = this._getMutableGame(gameId);
    game.lineup = newLineup;
    this._onEdit();
  }

  addPlayerToLineup(gameId, playerId) {
    const game = this._getMutableGame(gameId);
    game.lineup.push(playerId);
    this._onEdit();
  }

  updateLineup(gameId, playerId, newIndex) {
    const game = this._getMutableGame(gameId);
    const playerIndex = game.lineup.indexOf(playerId);
    game.lineup.splice(playerIndex, 1);
    game.lineup.splice(newIndex, 0, playerId);
    this._onEdit();
  }

  removePlayerFromLineup(gameId, playerId) {
    const game = this._getMutableGame(gameId);
    const index = game.lineup.indexOf(playerId);
    game.lineup.splice(index, 1);
    this._onEdit();
  }

  removeGame(gameId) {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForGame(gameId);
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    const gameIndex = this.INDEX.getGameIndex(gameId);
    localState.teams[teamIndex].games.splice(gameIndex, 1);
    this._onEdit();
  }

  setScoreAdjustment(game, inning, increment, scoreKey) {
    let teamScoreObj = game[scoreKey];
    if (teamScoreObj[inning] !== undefined) {
      teamScoreObj[inning] += increment;
    } else {
      teamScoreObj[inning] = increment;
    }
    if (teamScoreObj[inning] === 0) {
      delete teamScoreObj[inning];
    }

    this._onEdit();
    return game;
  }

  // PLATE APPEARANCE

  addPlateAppearance(playerId, gameId) {
    const { game, team } = this.getGameObjects(gameId);
    const plateAppearances = game.plateAppearances;
    const plateAppearance = this.getNewPlateAppearance(playerId);
    plateAppearances.push(plateAppearance);
    this.INDEX.addPlateAppearance(plateAppearance.id, team.id, game.id);
    this._onEdit();
    return plateAppearance;
  }

  replacePlateAppearance(plateAppearanceId, gameId, teamId, newPa) {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForPa(plateAppearanceId);
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    const game = this.INDEX.getGameForPa(plateAppearanceId);
    const gameIndex = this.INDEX.getGameIndex(game.id);
    const paIndex = this.INDEX.getPaIndex(plateAppearanceId);
    localState.teams[teamIndex].games[gameIndex].plateAppearances[paIndex] =
      newPa;
    this._onEdit();
  }

  getPlateAppearance(paId) {
    const pa = this.INDEX.getPa(paId);
    return pa === undefined ? undefined : { ...pa };
  }

  getNextPlateAppearance(paId) {
    const game = this.INDEX.getGameForPa(paId);
    const paIndex = this.INDEX.getPaIndex(paId);
    return paIndex === game.lineup.length
      ? undefined
      : { ...game.plateAppearances[paIndex + 1] };
  }

  getPreviousPlateAppearance(paId) {
    const game = this.INDEX.getGameForPa(paId);
    const paIndex = this.INDEX.getPaIndex(paId);
    return paIndex === 0
      ? undefined
      : { ...game.plateAppearances[paIndex - 1] };
  }

  getPlateAppearanceObjects(paId) {
    const pa = this.INDEX.getPa(paId);
    const game = this.INDEX.getGameForPa(paId);
    const team = this.INDEX.getTeamForPa(paId);
    if (pa === undefined) {
      return undefined;
    }
    return { pa, game, team };
  }

  getAllPlateAppearancesForPlayer(playerId) {
    let allPAs = [];
    let allTeams = this.getAllTeams();
    for (let team of allTeams) {
      let playerPAsOnTeam = this.getPlateAppearancesForPlayerOnTeam(
        playerId,
        team.id
      );
      for (let pa of playerPAsOnTeam) {
        allPAs.push(pa);
      }
    }
    return allPAs;
  }

  getPlateAppearancesForGame(gameId) {
    const game = this.getGame(gameId);
    if (!game) {
      return null;
    }
    return game.plateAppearances;
  }

  getPlateAppearancesForPlayerInGame(playerId, game_id) {
    const game = this.getGame(game_id);
    const player = this.getPlayer(playerId);
    if (!game || !player) {
      return null;
    }
    return game.plateAppearances.filter((pa) => pa.playerId === playerId);
  }

  /**
   * `paRunnerOverride` can be used to replace the runners of the paId for last inning calc purposes.
   * This is useful when you want the outs of the the current PA to affect the calculation but the PA
   * hasn't yet been saved to the global getGlobalState().
   */
  isLastPaOfInning(paId, paOrigin, paRunnerOverride) {
    if (paOrigin === 'optimization') {
      return false; // TODO
    }
    const outsFromGame = this.getOutsAtPa(paId, paOrigin);
    let outsAtPa = outsFromGame;
    let outsInPa = undefined;
    if (paRunnerOverride) {
      const outsFromThisSavedPa =
        this.getPlateAppearance(paId).runners.out?.length ?? 0;
      outsInPa = paRunnerOverride.out?.length ?? 0;
      outsAtPa = outsFromGame - outsFromThisSavedPa + outsInPa;
    } else {
      outsInPa = this.getPlateAppearance(paId).runners.out?.length ?? 0;
    }
    return outsAtPa % 3 === 0 && outsInPa > 0;
  }

  didPlayerScoreThisInning(paId) {
    const pa = this.getPlateAppearance(paId);
    const player = this.INDEX.getPlayer(pa.playerId);
    const game = this.INDEX.getGameForPa(paId);
    const gamePas = game.plateAppearances;

    // Find this pa in game
    let paIndex = undefined;
    for (let i = 0; i < gamePas.length; i++) {
      if (paId === gamePas[i].id) {
        paIndex = i;
        break;
      }
    }

    // Look to see if the player scored in this or subsequent PAs in this inning
    for (let i = paIndex; i < gamePas.length; i++) {
      if (gamePas[i].runners.scored) {
        if (gamePas[i].runners.scored.includes(player.id)) {
          return true;
        }
      }
      if (this.isLastPaOfInning(gamePas[i].id, 'game')) {
        return false;
      }
    }
    return false;
  }

  getUsScoreAtPa(paId, paOrigin) {
    let pas = undefined;
    if (paOrigin === 'optimization') {
      return 0;
      // TODO
      const pa = this.INDEX.getPaFromOptimization(paId);
      pas = this.getOptimizationOverridesForPlayer(
        pa.optimization.id,
        pa.playerId
      );
    } else if (paOrigin === 'game') {
      const pa = this.getPlateAppearance(paId);
      const game = this.INDEX.getGameForPa(paId);
      pas = this.getPlateAppearancesForGame(game.id);
    } else {
      throw new Error('Invalid origin ' + paOrigin);
    }
    let scoreUs = 0;
    for (let pa of pas) {
      scoreUs += pa.runners['scored']?.length ?? 0;
      if (pa.id === paId) {
        break;
      }
    }
    // TODO: account for overrides in each inning
    return scoreUs;
  }

  getOutsAtPa(paId, paOrigin) {
    let pas = undefined;
    if (paOrigin === 'optimization') {
      const pa = this.INDEX.getPaFromOptimization(paId);
      pas = this.getOptimizationOverridesForPlayer(
        this.INDEX.getOptimizationForPa(pa.id).id,
        pa.playerId
      );
    } else if (paOrigin === 'game') {
      const game = this.INDEX.getGameForPa(paId);
      pas = this.getPlateAppearancesForGame(game.id);
    } else {
      throw new Error('Invalid origin ' + paOrigin);
    }

    let outs = 0;
    for (let pa of pas) {
      outs += pa.runners['out']?.length ?? 0;
      if (pa.id === paId) {
        break;
      }
    }
    return outs;
  }

  getDecoratedPlateAppearancesForPlayerOnTeam(playerId, team_id, state) {
    const team =
      typeof team_id === 'string' ? this.getTeam(team_id, state) : team_id;
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
  }

  getPlateAppearancesForPlayerOnTeam(playerId, team_id, state) {
    const team =
      typeof team_id === 'string' ? this.getTeam(team_id, state) : team_id;
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
  }

  getPlateAppearancesForPlayerInGameOrOnTeam(
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
        this.getPlateAppearancesForPlayerOnTeam(playerId, teamIds[i], state)
      );
    }
    for (let i = 0; i < gameIds.length; i++) {
      plateAppearances = plateAppearances.concat(
        this.getPlateAppearancesForPlayerInGame(playerId, gameIds[i], state)
      );
    }
    return plateAppearances;
  }

  getPlateAppearancesForPlayer(playerId, state) {
    let localState = state || this.getLocalState();
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
  }

  getDecoratedPlateAppearancesForPlayer(playerId, state) {
    let localState = state || this.getLocalState();
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
  }

  getDecoratedPlateAppearancesForGame(game, state) {
    return game.plateAppearances.map((pa) => decoratePlateAppearance(pa, game));
  }
  updatePlateAppearanceResult(plateAppearance, result) {
    plateAppearance.result = result;
    this._onEdit();
  }

  updatePlateAppearanceLocation(plateAppearance, location) {
    plateAppearance.location = {};
    plateAppearance.location.x = Math.floor(location[0]);
    plateAppearance.location.y = Math.floor(location[1]);
    this._onEdit();
  }

  removePlateAppearance(plateAppearanceId, gameId) {
    const pa = this.getPlateAppearance(plateAppearanceId);
    if (pa === undefined) {
      throw new Error(
        'Attempted to delete a plate appearance that does not exist'
      );
    }
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForPa(plateAppearanceId);
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    const game = this.INDEX.getGameForPa(plateAppearanceId);
    const gameIndex = this.INDEX.getGameIndex(game.id);
    const paIndex = this.INDEX.getPaIndex(plateAppearanceId);

    localState.teams[teamIndex].games[gameIndex].plateAppearances.splice(
      paIndex,
      1
    );

    this._onEdit();
  }

  getAccountOptimizersList() {
    if (this.getLocalState().account) {
      return this.getLocalState().account.optimizers;
    } else {
      return [];
    }
  }

  isEmailValidated() {
    if (this.getLocalState().account) {
      return this.getLocalState().account.emailConfirmed;
    } else {
      return false;
    }
  }

  setAccountOptimizersList(newOptimizersArray) {
    if (this.getLocalState().account) {
      this.getLocalState().account.optimizers = newOptimizersArray;
      this._onEdit();
    }
  }

  // NOT SURE THIS IS THE RIGHT PLACE FOR THESE. MOVE TO SOME OTHER UTIL?

  getQueryObj() {
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
  }

  editQueryObject(fieldName, value) {
    let queryObject = this.getQueryObj();
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
  }

  /**
   * You'll get more stats if you pass in decorated plate appearances
   */
  buildStatsObject(plateAppearances, playerId) {
    const player =
      typeof playerId === 'string' ? this.getPlayer(playerId) : playerId;

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
    stats.runs = 0; // We can't calculate this without getting more PAs
    stats.rbi = 0;
    stats.doublePlays = 0;
    stats.hitsWithRunnersOn_000 = 0;
    stats.hitsWithRunnersOn_001 = 0;
    stats.hitsWithRunnersOn_100 = 0;
    stats.hitsWithRunnersOn_010 = 0;
    stats.hitsWithRunnersOn_110 = 0;
    stats.hitsWithRunnersOn_101 = 0;
    stats.hitsWithRunnersOn_011 = 0;
    stats.hitsWithRunnersOn_111 = 0;
    stats.missesWithRunnersOn_000 = 0;
    stats.missesWithRunnersOn_001 = 0;
    stats.missesWithRunnersOn_100 = 0;
    stats.missesWithRunnersOn_010 = 0;
    stats.missesWithRunnersOn_110 = 0;
    stats.missesWithRunnersOn_101 = 0;
    stats.missesWithRunnersOn_011 = 0;
    stats.missesWithRunnersOn_111 = 0;

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
        if (
          ['E', 'FC', 'Out', 'TP', 'DP', 'K', 'Ʞ', 'SAC'].includes(pa.result)
        ) {
          count++;
        } else if (['1B', '2B', '3B', 'HRi', 'HRo'].includes(pa.result)) {
          count++;
          hits++;
        }
      });
      avgList.push(hits / count);
    });
    let autoCorResult = autoCorrelation(avgList, 1);
    stats.gameAutocorrelation = isStatSig(autoCorResult, avgList.length)
      ? autoCorResult.toFixed(2)
      : '-';

    // Per PA stats
    plateAppearances.forEach((pa) => {
      if (pa.result) {
        stats.plateAppearances++;

        if (!results.getNoAtBatResults().includes(pa.result)) {
          stats.atBats++;
        }
        if (results.getHitResults().includes(pa.result)) {
          stats.hits++;
        }

        // RBIs don't count for double plays (TODO: they shouldn't count on errors either but we don't track that)
        if (pa.result !== 'DP') {
          stats.rbi += pa.runners.scored?.length ?? 0;
        }

        if (pa.result === 'BB') {
          stats.walks++; // Boo!
        } else if (pa.result === 'E') {
          stats.reachedOnError++;
        } else if (pa.result === 'FC') {
          stats.FCs++;
        } else if (pa.result === 'DP') {
          stats.directOuts++;
          stats.doublePlays++;
        } else if (pa.result === 'Out' || pa.result === 'TP') {
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

        // Runners on base avg - this uses the state object which might be an issue if we want this to eventually be in a web worker
        const previousPa = this.getPreviousPlateAppearance(pa.id);
        const prevRunners = previousPa?.runners;
        const dateWeStartedTrackingRunners = this.getPlateAppearanceObjects(
          pa.id
        ).game.date;
        const isInvalidEntry = dateWeStartedTrackingRunners < 1672531200;
        if (results.getHitResults().includes(pa.result)) {
          if (isInvalidEntry) {
            // We don't care about PAs before we started tracking base runners
          } else if (prevRunners === undefined) {
            stats.hitsWithRunnersOn_000++;
          } else if (
            previousPa.runners['1B'] &&
            previousPa.runners['2B'] &&
            previousPa.runners['3B']
          ) {
            stats.hitsWithRunnersOn_111++;
          } else if (previousPa.runners['1B'] && previousPa.runners['2B']) {
            stats.hitsWithRunnersOn_110++;
          } else if (previousPa.runners['2B'] && previousPa.runners['3B']) {
            stats.hitsWithRunnersOn_011++;
          } else if (previousPa.runners['1B'] && previousPa.runners['3B']) {
            stats.hitsWithRunnersOn_101++;
          } else if (previousPa.runners['1B']) {
            stats.hitsWithRunnersOn_100++;
          } else if (previousPa.runners['2B']) {
            stats.hitsWithRunnersOn_010++;
          } else if (previousPa.runners['3B']) {
            stats.hitsWithRunnersOn_001++;
          } else {
            stats.hitsWithRunnersOn_000++;
          }
        } else if (results.getNoHitResults().includes(pa.result)) {
          if (isInvalidEntry) {
            // We don't care about PAs before we started tracking base runners
          } else if (prevRunners === undefined) {
            stats.hitsWithRunnersOn_000++;
          } else if (
            previousPa.runners['1B'] &&
            previousPa.runners['2B'] &&
            previousPa.runners['3B']
          ) {
            stats.missesWithRunnersOn_111++;
          } else if (previousPa.runners['1B'] && previousPa.runners['2B']) {
            stats.missesWithRunnersOn_110++;
          } else if (previousPa.runners['2B'] && previousPa.runners['3B']) {
            stats.missesWithRunnersOn_011++;
          } else if (previousPa.runners['1B'] && previousPa.runners['3B']) {
            stats.missesWithRunnersOn_101++;
          } else if (previousPa.runners['1B']) {
            stats.missesWithRunnersOn_100++;
          } else if (previousPa.runners['2B']) {
            stats.missesWithRunnersOn_010++;
          } else if (previousPa.runners['3B']) {
            stats.missesWithRunnersOn_001++;
          } else {
            stats.missesWithRunnersOn_000++;
          }
        }
      }
    });

    if (stats.atBats === 0) {
      stats.battingAverage = '-';
      stats.sluggingPercentage = '-';
    } else {
      stats.battingAverage = SharedLib.commonUtils.calculateFormattedAverage(
        stats.hits,
        stats.atBats
      );
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
        (stats.plateAppearances - (stats.hits + stats.walks)) /
        Object.keys(gamesLookup).length
      ).toFixed(2);
    }

    // Derived stats
    stats.outs = stats.atBats - stats.hits;
    stats.homeruns = stats.insideTheParkHRs + stats.outsideTheParkHRs;

    return stats;
  }

  /**
   * Gets stats to be used in the optimization for each playerId passed in.
   * Respects any stats overrides.
   * The result is a map of playerId to stats object and there will be
   * no entries for players that have been deleted.
   */
  getActiveStatsForAllPlayers(overrideData, playerIds, teamIds) {
    let activeStats = {};
    for (let i = 0; i < playerIds.length; i++) {
      let player = this.getPlayer(playerIds[i]);
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
        plateAppearances = this.getPlateAppearancesForPlayerInGameOrOnTeam(
          player.id,
          teamIds,
          null // TODO: gameIds
        );
      }

      // Gather the stats required for the optimization
      let fullStats = this.buildStatsObject(plateAppearances, player.id);
      activeStats[player.id] = fullStats;
    }
    return activeStats;
  }

  // WINDOW STATE FUNCTIONS

  getTimeTillSync() {
    if (this.syncTimerTimestamp === null) {
      return null;
    }
    return SYNC_DELAY_MS - (Date.now() - this.syncTimerTimestamp);
  }

  // APPLICATION STATE FUNCTIONS

  isOnline() {
    return this.online;
  }

  isSessionValid() {
    return this.sessionValid;
  }

  getActiveUser() {
    return this.activeUser;
  }

  setOffline() {
    this.online = false;
    this.storage.saveApplicationState(
      this.online,
      this.sessionValid,
      this.activeUser
    );
  }

  setActiveUser(user) {
    this.activeUser = user;
    this.storage.saveApplicationState(
      this.online,
      this.sessionValid,
      this.activeUser
    );
  }

  loadLocalState(loadState = true, loadApplicationState = true) {
    try {
      if (loadState) {
        const savedState = this.storage.getDbState();
        if (savedState?.local && savedState?.ancestor) {
          this.LOCAL_DB_STATE_CONT.set(savedState.local);
          this.ANCESTOR_DB_STATE_CONT.set(savedState.ancestor);
        }
      }
    } catch (e) {
      if (e instanceof LsSchemaVersionError) {
        console.warn(e);
        this.storage.clearStorage();
        this.storage.saveDbState(this.getLocalState(), this.getAncestorState());
        this.storage.saveApplicationState(
          this.online,
          this.sessionValid,
          this.activeUser
        );
      } else if (e instanceof LsMigrationError) {
        // We have bad data in ls, delete it all
        console.warn('Error loading state from localstorage', e);
        console.warn(e);
        this.storage.clearStorage();
      } else {
        throw e;
      }
    }

    if (loadApplicationState) {
      const applicationState = this.storage.getApplicationState();
      if (applicationState) {
        this.online = applicationState.online ? applicationState.online : true;
        this.sessionValid = applicationState.sessionValid
          ? applicationState.sessionValid
          : false;
        this.activeUser = applicationState.activeUser
          ? applicationState.activeUser
          : null;
      } else {
        console.log('Tried to load null, falling back to defaults');
        this.online = true;
        this.sessionValid = false;
        this.activeUser = null;
      }
    }

    reRender();
  }

  setStatusBasedOnHttpResponse(code, isAuthRequest) {
    if (code >= 200 && code < 300) {
      // If this request required authentication and it succeeded, we know the session is valid
      if (isAuthRequest) {
        this.sessionValid = true;
      }
      this.online = true;
      // Sync might have been failing for network reasons, give it another shot
      if (this.getSyncState() === SYNC_STATUS_ENUM.ERROR) {
        this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
        this.scheduleSync();
      }
    } else if (code === 403 || code === 401) {
      this.sessionValid = false;
      this.online = true;
    } else if (code === -1) {
      this.online = false;
    }
    this.storage.saveApplicationState(
      this.online,
      this.sessionValid,
      this.activeUser
    );
  }

  setAddToHomescreenPrompt(e) {
    this.addToHomescreenEvent = e;
    reRender();
  }

  getAddToHomescreenPrompt() {
    return this.addToHomescreenEvent;
  }

  scheduleSync(time = SYNC_DELAY_MS) {
    const currentState = this.getSyncState();
    if (currentState === SYNC_STATUS_ENUM.ERROR) {
      console.warn('[SYNC] Sync skipped, in error state');
      return;
    } else if (
      currentState === SYNC_STATUS_ENUM.IN_PROGRESS ||
      currentState === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
    ) {
      this._setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING);
    } else {
      this._setSyncState(SYNC_STATUS_ENUM.PENDING);
    }

    console.log('[SYNC] Sync scheduled');
    clearTimeout(this.syncTimer);
    this.syncTimerTimestamp = Date.now();

    this.syncTimer = setTimeout(() => {
      if (
        this.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS ||
        currentState === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
      ) {
        console.log('[SYNC] There is already a sync in progress');
        this.scheduleSync(SYNC_DELAY_MS);
        return;
      }
      this.sync();
    }, time);
  }

  getSyncState() {
    return this.syncState;
  }

  getSyncStateEnum() {
    return SYNC_STATUS_ENUM;
  }

  setPreventScreenLock(value) {
    this.preventScreenLock = value;
    reRender();
  }

  getPreventScreenLock() {
    return this.preventScreenLock;
  }

  _onEdit() {
    reRender();
    try {
      this.storage.saveDbState(this.getLocalState(), this.getAncestorState());
    } catch (e) {
      console.warn('Could not persist edit locally, restoring. ', e);
      this.loadLocalState(true, false);
      reRender();
    }
    this.scheduleSync();
  }

  _setSyncState(newState, skipRender) {
    // Skip unnecessary renders
    if (this.syncState !== newState) {
      const origStateName = this.syncStateToSyncStateName(this.syncState);
      const newStateName = this.syncStateToSyncStateName(newState);
      //console.log(
      //  `[SYNC] Sync state updated from ${origStateName} (${syncState}) to ${newStateName} (${newState})`
      //);
      this.syncState = newState;
      if (!skipRender) {
        reRender();
      }
    }
  }

  /**
   * Perform a network request (internal - use requestAuth or request outside of this class).
   * Updates application state based on status code of the response
   */
  async _request(method, url, body, controller, overrideTimeout, isAuth) {
    try {
      let response = await network.request(
        method,
        url,
        body,
        controller,
        overrideTimeout
      );
      this.setStatusBasedOnHttpResponse(response.status, isAuth);
      return response;
    } catch (err) {
      console.log('Encountered an error during network request');
      console.log(err);
      this.setOffline();
      // We'll just return -1 to say that something went wrong with the network
      const response = {};
      response.status = -1;
      response.body = {};
      response.body.message = err;
      return response;
    }
  }

  getLocalStorageUsage() {
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
      system:
        ((total - teams * 2 - players * 2 - optimizations * 2) / 1024) * 2,
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
  }

  /**
   * Perform a network request.
   * Will update the state's "isOnline" variable based on the call's success or failure
   * Will update the state's "isSessionValid" variable based on the call's success or failure
   */
  async requestAuth(method, url, body, controller, overrideTimeout) {
    return await this._request(
      method,
      url,
      body,
      controller,
      overrideTimeout,
      true
    );
  }

  /**
   * Perform a network request.
   * Will update the state's "isOnline" variable based on the call's success or failure
   */
  async request(method, url, body, controller, overrideTimeout) {
    return await this._request(
      method,
      url,
      body,
      controller,
      overrideTimeout,
      true
    );
  }
}

const defaultState = new GlobalState();
let activeGlobalState = defaultState;
export const getGlobalState = () => {
  return activeGlobalState;
};
export const setGlobalState = (inputData) => {
  const stateContainer =
    inputData == null ? null : new StateContainer(inputData);
  activeGlobalState = new GlobalState(
    stateContainer,
    undefined,
    new InMemoryStorage(),
    true
  );
  console.log('[GLOBAL_STATE] setting global state' /*, activeGlobalState*/);
};
export const setGlobalStateRaw = (globalStateObject) => {
  activeGlobalState = globalStateObject;
  console.log(
    '[GLOBAL_STATE] setting global state raw' /*, activeGlobalState*/
  );
};
export const resetGlobalState = () => {
  activeGlobalState = defaultState;
};
