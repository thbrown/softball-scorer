import network, { type NetworkResponse } from 'network';
import SharedLib from 'shared-lib';
import results, { type PlateAppearanceResult } from 'plate-appearance-results';
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
import { LsMigrationError, LsSchemaVersionError } from './state-errors';

import dialog from 'dialog';
import {
  IndexedDBStorage,
  InMemoryStorage,
  type StateStorage,
} from './state-storage';
import type {
  TopLevelClient,
  Game,
  Player,
  Team,
  PlateAppearance,
  Optimization,
} from 'shared-lib/types';
import {
  asPlayerId,
  asTeamId,
  asGameId,
  asPlateAppearanceId,
  asOptimizationId,
  type PlayerId,
  type TeamId,
  type GameId,
  type PlateAppearanceId,
  type OptimizationId,
} from './types/branded-ids';

const TLSchemas = SharedLib.schemaValidation.TLSchemas;

// CONSTANTS
const INITIAL_STATE: TopLevelClient = {
  account: {
    optimizers: [0, 1, 2],
  },
  teams: [],
  players: [],
  optimizations: [],
  metadata: {
    scope: 'client' as const,
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
const decoratePlateAppearance = (pa: PlateAppearance, game?: Game) => ({
  ...pa,
  game,
  date: game?.date,
});

export interface StatsObject {
  id?: string;
  name?: string;
  plateAppearances: number;
  atBats: number;
  hits: number;
  battingAverage: string;
  sluggingPercentage: string;
  singles: number;
  doubles: number;
  triples: number;
  insideTheParkHRs: number;
  outsideTheParkHRs: number;
  reachedOnError: number;
  walks: number;
  FCs: number;
  SACs: number;
  strikeouts: number;
  directOuts: number;
  gameAutocorrelation: string;
  paAutocorrelation: string;
  paPerGame: number | string;
  outsPerGame: number | string;
  runs: number;
  rbi: number;
  doublePlays: number;
  totalBasesByHit: number;
  hitsWithRunnersOn_000: number;
  hitsWithRunnersOn_001: number;
  hitsWithRunnersOn_100: number;
  hitsWithRunnersOn_010: number;
  hitsWithRunnersOn_110: number;
  hitsWithRunnersOn_101: number;
  hitsWithRunnersOn_011: number;
  hitsWithRunnersOn_111: number;
  missesWithRunnersOn_000: number;
  missesWithRunnersOn_001: number;
  missesWithRunnersOn_100: number;
  missesWithRunnersOn_010: number;
  missesWithRunnersOn_110: number;
  missesWithRunnersOn_101: number;
  missesWithRunnersOn_011: number;
  missesWithRunnersOn_111: number;
  outs: number;
  homeruns: number;
}

/*
 * NOTE: Because we want all changes to the state to be done via the functions in this class
 * (as opposed to mutating objects that were returned from getters) we should consider deep
 * copying all objects returned by the getters, then recursively freezing them so the app
 * will throw an error when updates are done outside of this class.
 */
export class GlobalState {
  // Application State
  online: boolean;
  sessionValid: boolean;
  activeUser: string | null;

  // Window State
  addToHomescreenEvent: Event | null;
  syncState: number;
  syncTimer: NodeJS.Timeout | null;
  syncTimerTimestamp: number | null;
  preventScreenLock: boolean;

  // Database State
  ANCESTOR_DB_STATE_CONT: StateContainer;
  LOCAL_DB_STATE_CONT: StateContainer;
  INDEX: StateIndex;
  prohibitSync: boolean;
  storage: StateStorage;

  constructor(
    stateContainer?: StateContainer,
    index?: StateIndex,
    storage: StateStorage = new IndexedDBStorage(),
    prohibitSync = false
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
    this.preventScreenLock = false;

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

  getNewGame(
    opposingTeamName: string,
    lineup?: PlayerId[],
    lineupType?: number
  ): Game {
    const timestamp = Math.floor(new Date().getTime() / 1000); // Time in seconds not ms
    const id = asGameId(getNextId());
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

  getNewPlateAppearance(playerId: PlayerId): PlateAppearance {
    const id = asPlateAppearanceId(getNextId());
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

  syncStateToSyncStateName(syncState: number): string {
    for (const i in SYNC_STATUS_ENUM) {
      if (syncState === SYNC_STATUS_ENUM[i as keyof typeof SYNC_STATUS_ENUM]) {
        return i;
      }
    }
    return '';
  }

  // HTTP standard status codes plus:
  // -1 network issue
  // -2 failed on fullSync = false
  // -3 failed on fullSync = true
  async sync(fullSync?: boolean): Promise<number | undefined> {
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
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimerTimestamp = null;
    this._setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS, false);
    try {
      // Save a deep copy of the local state
      let localStateCopyPreRequest = JSON.parse(
        JSON.stringify(this.getLocalState())
      );
      const localState = this.getLocalState();

      // Save the ancestor state so we can restore it if something goes wrong
      //let ancestorStateCopy = JSON.parse(
      //  JSON.stringify(this.getAncestorState())
      //);

      // Get the patch ready to send to the server
      const body = {
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
        const serverState = response.body as { base?: TopLevelClient; patch?: unknown[]; checksum: string };

        // First gather any changes that were made locally while the request was still working
        const localChangesDuringRequest = SharedLib.objectMerge.diff(
          localStateCopyPreRequest,
          localState
        );

        console.log('[SYNC] Local changes', localChangesDuringRequest);

        // Update the ancestor if updates were received from the server
        let tempAncestor: TopLevelClient | undefined = undefined;
        if (serverState.base) {
          // The entire state was sent, we can just save it directly
          tempAncestor = serverState.base;
        } else if (serverState.patch) {
          // Patch was sent, apply the patch to a copy of the local state
          console.log(`[SYNC] Applying patch (${serverState.patch.length})`);

          localStateCopyPreRequest = SharedLib.objectMerge.patch(
            localStateCopyPreRequest,
            serverState.patch as any
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
        const ancestorHash = SharedLib.commonUtils.getHash(tempAncestor);

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
            throw new Error('-3');
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
              SharedLib.commonUtils.insertNewlines(
                SharedLib.commonUtils.getObjectString(this.getLocalState())
              )
            );
            throw new Error('-2');
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
        if (tempAncestor) {
          this.setAncestorState(tempAncestor);
        }

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
        throw new Error(String(response.status));
      }

      if (this.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS) {
        this._setSyncState(SYNC_STATUS_ENUM.COMPLETE, false);
      } else if (
        this.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
      ) {
        this._setSyncState(SYNC_STATUS_ENUM.PENDING, false);
      } else {
        // Don't think this should be possible
        console.log('[SYNC] Invalid state transition');
        this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN, false);
      }

      return response.status;
    } catch (err) {
      // We might be able to re-try some problems, like if the network is temporarily out
      this._setSyncState(SYNC_STATUS_ENUM.PENDING, false); // Assume re-try
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        (+errorMessage === -1 && !this.isOnline()) ||
        +errorMessage === 403 ||
        +errorMessage === 401 ||
        +errorMessage === 502
      ) {
        // Pause future syncs but don't sound the alert alarm for these cases (not bugs) for
        // 1) User is not signed in
        // 2) App is in offline mode
        console.log(
          '[SYNC] Auth problem or offline mode is active: retrying sync later'
        );
        this._setSyncState(SYNC_STATUS_ENUM.ERROR, false);
      } else if (+errorMessage === 503 || +errorMessage === -1) {
        // Re-try later might work for
        // 1) Server rate limiting errors
        // 2) Weird network conditions
        console.warn(
          '[SYNC] Network issues or server is busy: retrying sync later'
        );
        this.scheduleSync();
      } else if (+errorMessage === -2) {
        // Issue with patch based sync, re-try with a full sync
        console.warn('[SYNC] Issue with patch sync: attempting full sync');
        return await this.sync(true);
      } else if (+errorMessage === 400) {
        console.warn('[SYNC] Issue with sync 400');
        dialog.show_notification(
          'Auto sync failed with message "' +
            errorMessage +
            '". Try refreshing the page, the app may have been updated. Details: ' +
            err,
          () => {}
        );
        console.log(err);
        this._setSyncState(SYNC_STATUS_ENUM.ERROR, false);
      } else {
        // Other 500s, 400s are probably bugs :(, tell the user something is wrong
        console.warn(`[SYNC] Probable bug encountered ${err}`);
        if (err instanceof Error) {
          console.warn(err.stack);
        }
        dialog.show_notification(
          'Auto sync failed with message "' +
            errorMessage +
            `". App will continue to function, but your data won't be synced with the server. Consider backing up your data from the main menu to avoid data loss. Details: ` +
            err,
          () => {}
        );
        if (err instanceof Error) {
          console.warn(err.stack);
        }
        this._setSyncState(SYNC_STATUS_ENUM.ERROR, false);
      }
      return +errorMessage;
    }
  }

  resetSyncState(): void {
    this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN, false);
  }

  resetState(): void {
    this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN, false);

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

  getLocalState(): TopLevelClient {
    return this.LOCAL_DB_STATE_CONT.get();
  }

  getLocalStateChecksum(): string {
    return SharedLib.commonUtils.getHash(this.getLocalState());
  }

  setLocalState(newState: TopLevelClient): void {
    SharedLib.schemaValidation.validateSchema(newState, TLSchemas.CLIENT);
    this.LOCAL_DB_STATE_CONT.set(newState);
    this._onEdit();
  }

  setLocalStateNoSideEffects(newState: TopLevelClient): void {
    SharedLib.schemaValidation.validateSchema(newState, TLSchemas.CLIENT);
    this.LOCAL_DB_STATE_CONT.set(newState);
  }

  getAncestorState(): TopLevelClient {
    return this.ANCESTOR_DB_STATE_CONT.get();
  }

  setAncestorState(s: TopLevelClient): void {
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
  getTeam(teamId: TeamId | string): Team | undefined {
    const team = this.INDEX.getTeam(teamId);
    return team === undefined ? undefined : { ...team };
  }

  getAllTeams(): Team[] {
    return getShallowCopy(this.getLocalState().teams);
  }

  addTeam(teamName: string): Team {
    const localState = this.getLocalState();
    const team: Team = {
      id: asTeamId(getNextId()),
      name: teamName,
      games: [],
    };
    localState.teams.push(team);
    this.INDEX.addTeam(team.id);
    this._onEdit();
    return team;
  }

  replaceTeam(oldTeamId: TeamId, newTeam: Team): void {
    const localState = this.getLocalState();
    const oldTeamIndex = this.INDEX.getTeamIndex(oldTeamId);
    if (oldTeamIndex === undefined) {
      throw new Error(`Team with id ${oldTeamId} not found`);
    }
    localState.teams[Number(oldTeamIndex)] = newTeam;
    this._onEdit();
  }

  removeTeam(teamId: TeamId): void {
    const localState = this.getLocalState();
    const teamIndex = this.INDEX.getTeamIndex(teamId);
    localState.teams.splice(Number(teamIndex), 1);
    this._onEdit();
  }

  // PLAYER
  getPlayer(playerId: PlayerId | string): Player | undefined {
    const player = this.INDEX.getPlayer(playerId);
    return player === undefined ? undefined : { ...player };
  }

  getAllPlayers(): Player[] {
    return getShallowCopy(this.getLocalState().players);
  }

  getAllPlayersAlphabetically(): Player[] {
    const playerNameComparator = function (a: Player, b: Player) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    };
    return this.getAllPlayers().sort(playerNameComparator);
  }

  addPlayer(playerName: string, gender: string): Player {
    const id = asPlayerId(getNextId());
    const newState = this.getLocalState();
    const player: Player = {
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

  replacePlayer(playerId: PlayerId, newPlayer: Player): void {
    const localState = this.getLocalState();
    const oldPlayerIndex = this.INDEX.getPlayerIndex(playerId);
    localState.players[Number(oldPlayerIndex)] = newPlayer;
    this._onEdit();
  }

  removePlayer(playerId: PlayerId): boolean {
    if (
      this.getGamesWithPlayerInLineup(playerId).length === 0 &&
      this.getGamesWherePlayerHasPlateAppearances(playerId).length === 0
    ) {
      const localState = this.getLocalState();
      const playerIndex = this.INDEX.getPlayerIndex(playerId);
      localState.players.splice(Number(playerIndex), 1);
      this._onEdit();
      return true;
    } else {
      return false;
    }
  }

  // OPTIMIZATION
  getOptimization(optimizationId: OptimizationId | string): Optimization | undefined {
    const opt = this.INDEX.getOptimization(optimizationId);
    return opt === undefined ? undefined : { ...opt };
  }

  getAllOptimizations(): Optimization[] {
    return getShallowCopy(this.getLocalState().optimizations);
  }

  addOptimization(
    name: string,
    playerList?: PlayerId[],
    teamList?: TeamId[],
    lineupType?: number
  ): Optimization {
    const id = asOptimizationId(getNextId());
    const localState = this.getLocalState();
    const optimization: Optimization = {
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

  replaceOptimization(
    optimizationId: OptimizationId,
    newOptimization: Optimization
  ): void {
    const localState = this.getLocalState();
    const oldOptimizationIndex =
      this.INDEX.getOptimizationIndex(optimizationId);
    localState.optimizations[Number(oldOptimizationIndex)] = newOptimization;
    this._onEdit();
  }

  removeOptimization(optimizationId: OptimizationId): void {
    const localState = this.getLocalState();
    const optIndex = this.INDEX.getOptimizationIndex(optimizationId);
    localState.optimizations.splice(Number(optIndex), 1);
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
  setOptimizationField(optimizationId: OptimizationId, fieldName: string, fieldValue: unknown): void {
    const optimization = this.INDEX.getOptimization(optimizationId);
    if (!optimization) {
      return;
    }
    (optimization as Record<string, unknown>)[fieldName] = fieldValue;
    this._onEdit();
  }

  // Set a field on the customOptions field
  setOptimizationCustomOptionsDataField(optimizationId: OptimizationId, fieldName: string, fieldValue: unknown): void {
    const optimization = this.INDEX.getOptimization(optimizationId);
    if (!optimization) {
      return;
    }
    const customOptionsData = optimization.customOptionsData;
    if (fieldValue === undefined) {
      delete customOptionsData[fieldName];
    } else {
      customOptionsData[fieldName] = fieldValue as string | number | boolean | unknown[] | null;
    }
    optimization.customOptionsData = customOptionsData;
    this._onEdit();
  }

  getOptimizationOverridesForPlayer(optimizationId: OptimizationId, playerId: PlayerId): PlateAppearance[] {
    const optimization = this.getOptimization(optimizationId);
    if (!optimization) {
      return [];
    }
    if (optimization.overrideData) {
      const allOverrides = optimization.overrideData;
      return allOverrides[playerId] ? allOverrides[playerId] : [];
    } else {
      return [];
    }
  }

  getOptimizationCustomOptionsDataField(optimizationId: OptimizationId, fieldName: string): unknown {
    const optimization = this.getOptimization(optimizationId);
    if (!optimization) {
      return undefined;
    }
    const customOptionsData = optimization.customOptionsData;
    return customOptionsData[fieldName];
  }

  duplicateOptimization(optimizationId: OptimizationId): void {
    const toDuplicate = this.getOptimization(optimizationId);
    if (!toDuplicate) {
      return;
    }
    const localState = this.getLocalState();
    const duplicatedOptimization = JSON.parse(JSON.stringify(toDuplicate));

    // Reset the any status fields and de-duplicate unique fields
    duplicatedOptimization.id = asOptimizationId(getNextId());

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

  getOptimizationOverridePlateAppearance(paId: PlateAppearanceId): PlateAppearance {
    const pa = this.INDEX.getPaFromOptimization(paId);
    if (!pa) {
      throw new Error(`Plate appearance ${paId} not found in optimization`);
    }
    return { ...pa };
  }

  addOptimizationOverridePlateAppearance(optimizationId: OptimizationId, playerId: PlayerId): PlateAppearance {
    const optimization = this.INDEX.getOptimization(optimizationId);
    if (!optimization) {
      throw new Error(`Optimization ${optimizationId} not found`);
    }
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

  removeOptimizationOverridePlateAppearance(optimizationId: OptimizationId, playerId: PlayerId, paId: PlateAppearanceId): void {
    const optimization = this.INDEX.getOptimization(optimizationId);
    if (!optimization) {
      return;
    }
    const allOverrides = optimization.overrideData;

    const playerOverrides = allOverrides[playerId];
    if (!playerOverrides) {
      return;
    }
    const paIndex = this.INDEX.getPaFromOptimizationIndex(paId);
    if (paIndex === undefined) {
      return;
    }

    playerOverrides.splice(Number(paIndex), 1);

    // Remove the player entry if the array is empty
    if (playerOverrides.length === 0) {
      delete allOverrides[playerId];
    }
    this._onEdit();
  }

  replaceOptimizationOverridePlateAppearance(
    optimizationId: OptimizationId,
    playerId: PlayerId,
    paId: PlateAppearanceId,
    paToAdd: PlateAppearance
  ): void {
    const optimization = this.INDEX.getOptimization(optimizationId);
    if (!optimization) {
      return;
    }
    const allOverrides = optimization.overrideData;
    const playerOverrides = allOverrides[playerId];
    if (!playerOverrides) {
      return;
    }

    const paIndex = this.INDEX.getPaFromOptimizationIndex(paId);
    if (paIndex === undefined) {
      return;
    }
    playerOverrides[Number(paIndex)] = paToAdd;
    this._onEdit();
  }

  // GAME

  addGame(teamId: TeamId, opposingTeamName: string): Game {
    const newState = this.getLocalState();
    const team = this.INDEX.getTeam(teamId);
    if (!team) {
      throw new Error(`Team with id ${teamId} not found`);
    }
    let lastLineup: PlayerId[] = [];
    let lastLineupType = 0;
    if (team.games.length) {
      const lastGame = team.games[team.games.length - 1];
      lastLineupType = lastGame.lineupType;
      lastLineup = lastGame.lineup.slice().map(asPlayerId);
    }
    const game = this.getNewGame(opposingTeamName, lastLineup, lastLineupType);
    team.games.push(game);
    this.INDEX.addGame(game.id, team.id);
    this._onEdit();
    return game;
  }

  replaceGame(oldGameId: GameId, teamId: TeamId, newGame: Game): void {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForGame(oldGameId);
    if (team === undefined) {
      const msg = `Failed to replaceGame, failed to get team for game id '${oldGameId}', the game does not exist`;
      console.error(msg);
      throw new Error(msg);
    }
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    const oldGameIndex = this.INDEX.getGameIndex(oldGameId);
    localState.teams[Number(teamIndex)].games[Number(oldGameIndex)] = newGame;
    this._onEdit();
  }

  getGameObjects(gameId: GameId): { game: Game; team: Team } | undefined {
    const game = this.getGame(gameId);
    if (game === undefined) {
      return undefined;
    }
    const team = this.INDEX.getTeamForGame(gameId);
    if (!team) {
      throw new Error(`Team not found for game ${gameId}`);
    }
    return { game, team };
  }

  getGame(gameId: GameId | string): Game | undefined {
    const game = this.INDEX.getGame(gameId);
    return game === undefined ? undefined : { ...game };
  }

  _getMutableGame(gameId: GameId): Game {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForGame(gameId);
    if (team === undefined) {
      const msg = `Failed to _getMutableGame, failed to get team for game id '${gameId}', the game does not exist`;
      console.error(msg);
      throw new Error(msg);
    }
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    if (teamIndex === undefined) {
      throw new Error(`Team index not found for team ${team.id}`);
    }
    const gameIndex = this.INDEX.getGameIndex(gameId);
    if (gameIndex === undefined) {
      throw new Error(`Game index not found for game ${gameId}`);
    }
    return localState.teams[Number(teamIndex)].games[Number(gameIndex)];
  }

  getGamesWithPlayerInLineup(
    playerId: PlayerId,
    state?: TopLevelClient
  ): Game[] {
    const games: Game[] = [];
    const localState = state || this.getLocalState();
    for (const team of localState.teams) {
      for (const game of team.games) {
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

  getGamesWherePlayerHasPlateAppearances(
    playerId: PlayerId,
    state?: TopLevelClient
  ): Game[] {
    const games: Game[] = [];
    const localState = state || this.getLocalState();
    for (const team of localState.teams) {
      for (const game of team.games) {
        for (const pa of game.plateAppearances) {
          if (pa.playerId === playerId) {
            games.push(game);
            break;
          }
        }
      }
    }
    return games;
  }

  getInningScores(gameId: GameId): number[] {
    const pas = this.getPlateAppearancesForGame(gameId);
    if (!pas) {
      return [];
    }

    const result: number[] = [];
    let outs = 0;
    let score = 0;
    for (const pa of pas) {
      const runsInPa = pa.runners?.scored?.length ?? 0;
      const outsInPa = pa.runners?.out?.length ?? 0;
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

  setGameLineup(gameId: GameId, newLineup: PlayerId[]): void {
    const game = this._getMutableGame(gameId);
    game.lineup = newLineup;
    this._onEdit();
  }

  addPlayerToLineup(gameId: GameId, playerId: PlayerId): void {
    const game = this._getMutableGame(gameId);
    game.lineup.push(playerId);
    this._onEdit();
  }

  updateLineup(gameId: GameId, playerId: PlayerId, newIndex: number): void {
    const game = this._getMutableGame(gameId);
    const playerIndex = game.lineup.indexOf(playerId);
    game.lineup.splice(playerIndex, 1);
    game.lineup.splice(newIndex, 0, playerId);
    this._onEdit();
  }

  removePlayerFromLineup(gameId: GameId, playerId: PlayerId): void {
    const game = this._getMutableGame(gameId);
    const index = game.lineup.indexOf(playerId);
    game.lineup.splice(index, 1);
    this._onEdit();
  }

  removeGame(gameId: GameId): void {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForGame(gameId);
    if (team === undefined) {
      const msg = `Failed to removeGame, failed to get team for game id '${gameId}', the game does not exist`;
      console.error(msg);
      throw new Error(msg);
    }
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    if (teamIndex === undefined) {
      throw new Error(`Team index not found for team ${team.id}`);
    }
    const gameIndex = this.INDEX.getGameIndex(gameId);
    if (gameIndex === undefined) {
      throw new Error(`Game index not found for game ${gameId}`);
    }
    localState.teams[Number(teamIndex)].games.splice(Number(gameIndex), 1);
    this._onEdit();
  }

  setScoreAdjustment(game: Game, inning: number, increment: number, scoreKey: 'scoreUs' | 'scoreThem'): Game {
    const teamScoreObj = game[scoreKey];
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

  addPlateAppearance(playerId: PlayerId, gameId: GameId): PlateAppearance {
    const gameObjects = this.getGameObjects(gameId);
    if (!gameObjects) {
      throw new Error(`Game with id ${gameId} not found`);
    }
    const { game, team } = gameObjects;
    const plateAppearances = game.plateAppearances;
    const plateAppearance = this.getNewPlateAppearance(playerId);
    plateAppearances.push(plateAppearance);
    this.INDEX.addPlateAppearance(plateAppearance.id, team.id, game.id);
    this._onEdit();
    return plateAppearance;
  }

  replacePlateAppearance(
    plateAppearanceId: PlateAppearanceId,
    gameId: GameId,
    teamId: TeamId,
    newPa: PlateAppearance
  ): void {
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForPa(plateAppearanceId);
    if (!team) {
      throw new Error(
        `Team not found for plate appearance ${plateAppearanceId}`
      );
    }
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    const game = this.INDEX.getGameForPa(plateAppearanceId);
    if (!game) {
      throw new Error(
        `Game not found for plate appearance ${plateAppearanceId}`
      );
    }
    const gameIndex = this.INDEX.getGameIndex(game.id);
    const paIndex = this.INDEX.getPaIndex(plateAppearanceId);
    localState.teams[Number(teamIndex)].games[
      Number(gameIndex)
    ].plateAppearances[Number(paIndex)] = newPa;
    this._onEdit();
  }

  getPlateAppearance(paId: PlateAppearanceId | string): PlateAppearance | undefined {
    const pa = this.INDEX.getPa(paId);
    return pa === undefined ? undefined : { ...pa };
  }

  getNextPlateAppearance(paId: PlateAppearanceId): PlateAppearance | undefined {
    const game = this.INDEX.getGameForPa(paId);
    const paIndex = this.INDEX.getPaIndex(paId);
    if (game === undefined || paIndex === undefined) {
      return undefined;
    }
    return Number(paIndex) === game.lineup.length
      ? undefined
      : { ...game.plateAppearances[Number(paIndex) + 1] };
  }

  getPreviousPlateAppearance(
    paId: PlateAppearanceId
  ): PlateAppearance | undefined {
    const game = this.INDEX.getGameForPa(paId);
    const paIndex = this.INDEX.getPaIndex(paId);
    if (game === undefined || paIndex === undefined) {
      return undefined;
    }
    return Number(paIndex) === 0
      ? undefined
      : { ...game.plateAppearances[Number(paIndex) - 1] };
  }

  getPlateAppearanceObjects(
    paId: PlateAppearanceId
  ): { pa: PlateAppearance; game: Game; team: Team } | undefined {
    const pa = this.INDEX.getPa(paId);
    const game = this.INDEX.getGameForPa(paId);
    const team = this.INDEX.getTeamForPa(paId);
    if (pa === undefined || game === undefined || team === undefined) {
      return undefined;
    }
    return { pa, game, team };
  }

  getAllPlateAppearancesForPlayer(playerId: PlayerId): PlateAppearance[] {
    const allPAs: PlateAppearance[] = [];
    const allTeams = this.getAllTeams();
    for (const team of allTeams) {
      const playerPAsOnTeam = this.getPlateAppearancesForPlayerOnTeam(
        playerId,
        team.id
      );
      for (const pa of playerPAsOnTeam) {
        allPAs.push(pa);
      }
    }
    return allPAs;
  }

  getPlateAppearancesForGame(gameId: GameId): PlateAppearance[] | null {
    const game = this.getGame(gameId);
    if (!game) {
      return null;
    }
    return game.plateAppearances;
  }

  getPlateAppearancesForPlayerInGame(
    playerId: PlayerId,
    game_id: GameId
  ): PlateAppearance[] | null {
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
  isLastPaOfInning(
    paId: PlateAppearanceId,
    paOrigin: 'game' | 'optimization',
    paRunnerOverride?: { out?: PlayerId[] }
  ): boolean {
    if (paOrigin === 'optimization') {
      return false; // TODO
    }
    const outsFromGame = this.getOutsAtPa(paId, paOrigin);
    let outsAtPa = outsFromGame;
    let outsInPa = 0;
    if (paRunnerOverride) {
      const pa = this.getPlateAppearance(paId);
      if (!pa) {
        return false;
      }
      const outsFromThisSavedPa = pa.runners?.out?.length ?? 0;
      outsInPa = paRunnerOverride.out?.length ?? 0;
      outsAtPa = outsFromGame - outsFromThisSavedPa + outsInPa;
    } else {
      const pa = this.getPlateAppearance(paId);
      if (!pa) {
        return false;
      }
      outsInPa = pa.runners?.out?.length ?? 0;
    }
    return outsAtPa % 3 === 0 && outsInPa > 0;
  }

  didPlayerScoreThisInning(paId: PlateAppearanceId): boolean {
    const pa = this.getPlateAppearance(paId);
    if (!pa) {
      return false;
    }
    const player = this.INDEX.getPlayer(pa.playerId);
    if (!player) {
      return false;
    }
    const game = this.INDEX.getGameForPa(paId);
    if (!game) {
      return false;
    }
    const gamePas = game.plateAppearances;

    // Find this pa in game
    let paIndex: number | undefined = undefined;
    for (let i = 0; i < gamePas.length; i++) {
      if (paId === gamePas[i].id) {
        paIndex = i;
        break;
      }
    }

    if (paIndex === undefined) {
      return false;
    }

    // Look to see if the player scored in this or subsequent PAs in this inning
    for (let i = paIndex; i < gamePas.length; i++) {
      if (gamePas[i].runners?.scored) {
        if (gamePas[i].runners?.scored?.includes(player.id)) {
          return true;
        }
      }
      if (this.isLastPaOfInning(gamePas[i].id, 'game')) {
        return false;
      }
    }
    return false;
  }

  getUsScoreAtPa(paId: PlateAppearanceId, paOrigin: 'game' | 'optimization'): number {
    let pas: PlateAppearance[] | null = null;
    if (paOrigin === 'optimization') {
      return 0;
      // TODO
      //const pa = this.INDEX.getPaFromOptimization(paId);
      //pas = this.getOptimizationOverridesForPlayer(
      //  pa.optimization.id,
      //  pa.playerId
      //);
    } else if (paOrigin === 'game') {
      // Calculate scored runs
      const game = this.INDEX.getGameForPa(paId);
      if (!game) {
        return 0;
      }
      pas = this.getPlateAppearancesForGame(game.id);

      // TODO: how does 'score them' do this?
    } else {
      throw new Error('Invalid origin ' + paOrigin);
    }
    if (!pas) {
      return 0;
    }
    let scoreUs = 0;
    for (const pa of pas) {
      scoreUs += pa.runners?.['scored']?.length ?? 0;
      if (pa.id === paId) {
        break;
      }
    }
    return scoreUs + this.getOverrideRunsAtPa(paId, paOrigin).us;
  }

  getOverrideRunsAtPa(paId: PlateAppearanceId, paOrigin: 'game' | 'optimization'): { us: number; them: number } {
    let resultUs = 0;
    let resultThem = 0;
    const outs = this.getOutsAtPa(paId, paOrigin);

    if (paOrigin === 'optimization') {
      throw new Error('Score for optimization PAs not implemented');
    } else if (paOrigin === 'game') {
      const game = this.INDEX.getGameForPa(paId);
      if (!game) {
        return { us: 0, them: 0 };
      }
      const innings = outs === 0 ? 1 : Math.ceil(outs / 3);
      for (const inning of Object.keys(game.scoreUs)) {
        if (parseInt(inning) <= innings) {
          resultUs += game.scoreUs[inning];
        }
      }
      for (const inning of Object.keys(game.scoreThem)) {
        if (parseInt(inning) <= innings) {
          resultThem += game.scoreThem[inning];
        }
      }
      return { us: resultUs, them: resultThem };
    } else {
      throw new Error('Invalid origin ' + paOrigin);
    }
  }

  getOutsAtPa(paId: PlateAppearanceId, paOrigin: 'game' | 'optimization'): number {
    let pas: PlateAppearance[] | null = null;
    if (paOrigin === 'optimization') {
      const pa = this.INDEX.getPaFromOptimization(paId);
      if (!pa) {
        return 0;
      }
      const optimization = this.INDEX.getOptimizationForPa(pa.id);
      if (!optimization) {
        return 0;
      }
      pas = this.getOptimizationOverridesForPlayer(optimization.id, pa.playerId);
    } else if (paOrigin === 'game') {
      const game = this.INDEX.getGameForPa(paId);
      if (!game) {
        return 0;
      }
      pas = this.getPlateAppearancesForGame(game.id);
    } else {
      throw new Error('Invalid origin ' + paOrigin);
    }

    if (!pas) {
      return 0;
    }

    let outs = 0;
    for (const pa of pas) {
      outs += pa.runners?.['out']?.length ?? 0;
      if (pa.id === paId) {
        break;
      }
    }
    return outs;
  }

  getDecoratedPlateAppearancesForPlayerOnTeam(
    playerId: PlayerId,
    team_id: TeamId | Team,
    state?: TopLevelClient
  ): (PlateAppearance & { game?: Game; date?: number })[] {
    const team =
      typeof team_id === 'string' ? this.getTeam(team_id) : team_id;
    let plateAppearances: (PlateAppearance & { game?: Game; date?: number })[] = [];

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

  getPlateAppearancesForPlayerOnTeam(
    playerId: PlayerId,
    team_id: TeamId | Team,
    state?: TopLevelClient
  ): PlateAppearance[] {
    const team =
      typeof team_id === 'string' ? this.getTeam(team_id) : team_id;
    let plateAppearances: PlateAppearance[] = [];

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
    playerId: PlayerId,
    teamIds?: TeamId[] | null,
    gameIds?: GameId[] | null,
    state?: TopLevelClient
  ): PlateAppearance[] {
    if (!teamIds) {
      teamIds = [];
    }
    if (!gameIds) {
      gameIds = [];
    }
    let plateAppearances: PlateAppearance[] = [];
    for (let i = 0; i < teamIds.length; i++) {
      plateAppearances = plateAppearances.concat(
        this.getPlateAppearancesForPlayerOnTeam(playerId, teamIds[i], state)
      );
    }
    for (let i = 0; i < gameIds.length; i++) {
      const pas = this.getPlateAppearancesForPlayerInGame(playerId, gameIds[i]);
      if (pas) {
        plateAppearances = plateAppearances.concat(pas);
      }
    }
    return plateAppearances;
  }

  getPlateAppearancesForPlayer(playerId: PlayerId, state?: TopLevelClient): PlateAppearance[] {
    const localState = state || this.getLocalState();
    const teams = localState.teams;
    let plateAppearances: PlateAppearance[] = [];

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

  getDecoratedPlateAppearancesForPlayer(
    playerId: PlayerId,
    state?: TopLevelClient
  ): (PlateAppearance & { game?: Game; date?: number })[] {
    const localState = state || this.getLocalState();
    const teams = localState.teams;
    let plateAppearances: (PlateAppearance & { game?: Game; date?: number })[] = [];

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

  getDecoratedPlateAppearancesForGame(
    game: Game,
    state?: TopLevelClient
  ): (PlateAppearance & { game?: Game; date?: number })[] {
    return game.plateAppearances.map((pa) => decoratePlateAppearance(pa, game));
  }

  updatePlateAppearanceResult(plateAppearance: PlateAppearance, result: string | null): void {
    plateAppearance.result = result;
    this._onEdit();
  }

  updatePlateAppearanceLocation(plateAppearance: PlateAppearance, location: [number, number]): void {
    plateAppearance.location = {
      x: Math.floor(location[0]),
      y: Math.floor(location[1])
    };
    this._onEdit();
  }

  removePlateAppearance(plateAppearanceId: PlateAppearanceId): void {
    const pa = this.getPlateAppearance(plateAppearanceId);
    if (pa === undefined) {
      throw new Error(
        'Attempted to delete a plate appearance that does not exist'
      );
    }
    const localState = this.getLocalState();
    const team = this.INDEX.getTeamForPa(plateAppearanceId);
    if (!team) {
      throw new Error(`Team not found for plate appearance ${plateAppearanceId}`);
    }
    const teamIndex = this.INDEX.getTeamIndex(team.id);
    if (teamIndex === undefined) {
      throw new Error(`Team index not found for team ${team.id}`);
    }
    const game = this.INDEX.getGameForPa(plateAppearanceId);
    if (!game) {
      throw new Error(`Game not found for plate appearance ${plateAppearanceId}`);
    }
    const gameIndex = this.INDEX.getGameIndex(game.id);
    if (gameIndex === undefined) {
      throw new Error(`Game index not found for game ${game.id}`);
    }
    const paIndex = this.INDEX.getPaIndex(plateAppearanceId);
    if (paIndex === undefined) {
      throw new Error(`PA index not found for plate appearance ${plateAppearanceId}`);
    }

    localState.teams[Number(teamIndex)].games[Number(gameIndex)].plateAppearances.splice(
      Number(paIndex),
      1
    );

    this._onEdit();
  }

  getAccountOptimizersList(): number[] {
    if (this.getLocalState().account) {
      return this.getLocalState().account.optimizers as number[];
    } else {
      return [];
    }
  }

  isEmailValidated(): boolean {
    if (this.getLocalState().account) {
      return this.getLocalState().account.emailConfirmed ?? false;
    } else {
      return false;
    }
  }

  setAccountOptimizersList(newOptimizersArray: number[]): void {
    if (this.getLocalState().account) {
      this.getLocalState().account.optimizers = newOptimizersArray;
      this._onEdit();
    }
  }

  // NOT SURE THIS IS THE RIGHT PLACE FOR THESE. MOVE TO SOME OTHER UTIL?

  getQueryObj(): Record<string, string> {
    let queryString = window.location.search || '';
    if (queryString[0] === '?') {
      queryString = queryString.slice(1);
    }
    const params: Record<string, string> = {};
    const queries = queryString.split('&');
    let temp: string[];
    let i: number;
    let l: number;
    for (i = 0, l = queries.length; i < l; i++) {
      temp = queries[i].split('=');
      params[temp[0]] = temp[1];
    }
    return params;
  }

  editQueryObject(fieldName: string, value: string): void {
    const queryObject = this.getQueryObj();
    queryObject[fieldName] = value;
    let queryString = '';
    const keys = Object.keys(queryObject);
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
  buildStatsObject(
    plateAppearances: PlateAppearance[],
    playerId?: PlayerId | Player | string
  ): StatsObject {
    const player =
      typeof playerId === 'string'
        ? this.getPlayer(playerId as PlayerId)
        : playerId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: StatsObject = {} as any;
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
    const hitOrNoHit: number[] = [];
    plateAppearances.forEach((pa) => {
      if (['E', 'FC', 'Out', 'TP', 'DP', 'K', 'Ʞ', 'SAC'].includes(pa.result as string)) {
        hitOrNoHit.push(0);
      } else if (['1B', '2B', '3B', 'HRi', 'HRo'].includes(pa.result as string)) {
        hitOrNoHit.push(1);
      }
    });
    const paAutoCorResult = autoCorrelation(hitOrNoHit, 1);
    stats.paAutocorrelation = isStatSig(paAutoCorResult, hitOrNoHit.length)
      ? paAutoCorResult.toFixed(2)
      : '-';

    // Serial correlation for games
    // TODO: we want this sorted by date right?
    const gamesLookup: Record<string, PlateAppearance[]> = {};
    plateAppearances.forEach((pa) => {
      const decoratedPa = pa as PlateAppearance & { game?: Game };
      if (decoratedPa?.game?.id) {
        if (gamesLookup[decoratedPa.game.id]) {
          gamesLookup[decoratedPa.game.id].push(pa);
        } else {
          gamesLookup[decoratedPa.game.id] = [pa];
        }
      }
    });
    const avgList: number[] = [];
    Object.keys(gamesLookup).forEach((gameId) => {
      let count = 0;
      let hits = 0;
      gamesLookup[gameId].forEach((pa) => {
        if (
          pa.result && ['E', 'FC', 'Out', 'TP', 'DP', 'K', 'Ʞ', 'SAC'].includes(pa.result)
        ) {
          count++;
        } else if (pa.result && ['1B', '2B', '3B', 'HRi', 'HRo'].includes(pa.result)) {
          count++;
          hits++;
        }
      });
      avgList.push(hits / count);
    });
    const autoCorResult = autoCorrelation(avgList, 1);
    stats.gameAutocorrelation = isStatSig(autoCorResult, avgList.length)
      ? autoCorResult.toFixed(2)
      : '-';

    // Per PA stats
    plateAppearances.forEach((pa) => {
      if (pa.result) {
        stats.plateAppearances++;

        if (!results.getNoAtBatResults().includes(pa.result as PlateAppearanceResult)) {
          stats.atBats++;
        }
        if (results.getHitResults().includes(pa.result as PlateAppearanceResult)) {
          stats.hits++;
        }

        // RBIs don't count for double plays (TODO: they shouldn't count on errors either but we don't track that)
        if (pa.result !== 'DP') {
          stats.rbi += pa.runners?.scored?.length ?? 0;
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
        if (previousPa !== undefined) {
          // PAs in optimization overrides are don't have previous PAs
          const prevRunners = previousPa?.runners;
          const paObjects = this.getPlateAppearanceObjects(pa.id);
          const dateWeStartedTrackingRunners = paObjects?.game?.date ?? 0;
          const isInvalidEntry = dateWeStartedTrackingRunners < 1672531200;
          if (results.getHitResults().includes(pa.result as PlateAppearanceResult)) {
            if (isInvalidEntry) {
              // We don't care about PAs before we started tracking base runners
            } else if (prevRunners === undefined) {
              stats.hitsWithRunnersOn_000++;
            } else if (
              prevRunners['1B'] &&
              prevRunners['2B'] &&
              prevRunners['3B']
            ) {
              stats.hitsWithRunnersOn_111++;
            } else if (prevRunners['1B'] && prevRunners['2B']) {
              stats.hitsWithRunnersOn_110++;
            } else if (prevRunners['2B'] && prevRunners['3B']) {
              stats.hitsWithRunnersOn_011++;
            } else if (prevRunners['1B'] && prevRunners['3B']) {
              stats.hitsWithRunnersOn_101++;
            } else if (prevRunners['1B']) {
              stats.hitsWithRunnersOn_100++;
            } else if (prevRunners['2B']) {
              stats.hitsWithRunnersOn_010++;
            } else if (prevRunners['3B']) {
              stats.hitsWithRunnersOn_001++;
            } else {
              stats.hitsWithRunnersOn_000++;
            }
          } else if (results.getNoHitResults().includes(pa.result as PlateAppearanceResult)) {
            if (isInvalidEntry) {
              // We don't care about PAs before we started tracking base runners
            } else if (prevRunners === undefined) {
              stats.hitsWithRunnersOn_000++;
            } else if (
              prevRunners['1B'] &&
              prevRunners['2B'] &&
              prevRunners['3B']
            ) {
              stats.missesWithRunnersOn_111++;
            } else if (prevRunners['1B'] && prevRunners['2B']) {
              stats.missesWithRunnersOn_110++;
            } else if (prevRunners['2B'] && prevRunners['3B']) {
              stats.missesWithRunnersOn_011++;
            } else if (prevRunners['1B'] && prevRunners['3B']) {
              stats.missesWithRunnersOn_101++;
            } else if (prevRunners['1B']) {
              stats.missesWithRunnersOn_100++;
            } else if (prevRunners['2B']) {
              stats.missesWithRunnersOn_010++;
            } else if (prevRunners['3B']) {
              stats.missesWithRunnersOn_001++;
            } else {
              stats.missesWithRunnersOn_000++;
            }
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

    return stats as StatsObject;
  }

  /**
   * Gets stats to be used in the optimization for each playerId passed in.
   * Respects any stats overrides.
   * The result is a map of playerId to stats object and there will be
   * no entries for players that have been deleted.
   */
  getActiveStatsForAllPlayers(
    overrideData: Record<string, PlateAppearance[]>,
    playerIds: PlayerId[],
    teamIds: TeamId[]
  ): Record<string, StatsObject> {
    const activeStats: Record<string, StatsObject> = {};
    for (let i = 0; i < playerIds.length; i++) {
      const player = this.getPlayer(playerIds[i]);
      if (!player) {
        continue; // Player may have been deleted
      }

      let plateAppearances: PlateAppearance[] = [];
      const existingOverride = overrideData[player.id];
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
      const fullStats = this.buildStatsObject(plateAppearances, player.id);
      activeStats[player.id] = fullStats;
    }
    return activeStats;
  }

  // WINDOW STATE FUNCTIONS

  getTimeTillSync(): number | null {
    if (this.syncTimerTimestamp === null) {
      return null;
    }
    return SYNC_DELAY_MS - (Date.now() - this.syncTimerTimestamp);
  }

  // APPLICATION STATE FUNCTIONS

  isOnline(): boolean {
    return this.online;
  }

  isSessionValid(): boolean {
    return this.sessionValid;
  }

  getActiveUser(): string | null {
    return this.activeUser;
  }

  setOffline(): void {
    this.online = false;
    this.storage.saveApplicationState(
      this.online,
      this.sessionValid,
      this.activeUser
    );
  }

  setActiveUser(user: string | null): void {
    this.activeUser = user;
    this.storage.saveApplicationState(
      this.online,
      this.sessionValid,
      this.activeUser
    );
  }

  async loadLocalState(loadState = true, loadApplicationState = true): Promise<void> {
    try {
      if (loadState) {
        const savedState = await this.storage.getDbState();
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
        console.warn('Error loading state from storage', e);
        this.storage.clearStorage();
      } else {
        throw e;
      }
    }

    if (loadApplicationState) {
      const applicationState = await this.storage.getApplicationState();
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

  setStatusBasedOnHttpResponse(code: number, isAuthRequest?: boolean): void {
    if (code >= 200 && code < 300) {
      // If this request required authentication and it succeeded, we know the session is valid
      if (isAuthRequest) {
        this.sessionValid = true;
      }
      this.online = true;
      // Sync might have been failing for network reasons, give it another shot
      if (this.getSyncState() === SYNC_STATUS_ENUM.ERROR) {
        this._setSyncState(SYNC_STATUS_ENUM.UNKNOWN, false);
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

  setAddToHomescreenPrompt(e: Event | null): void {
    this.addToHomescreenEvent = e;
    reRender();
  }

  getAddToHomescreenPrompt(): Event | null {
    return this.addToHomescreenEvent;
  }

  scheduleSync(time = SYNC_DELAY_MS): void {
    const currentState = this.getSyncState();
    if (currentState === SYNC_STATUS_ENUM.ERROR) {
      console.warn('[SYNC] Sync skipped, in error state');
      return;
    } else if (
      currentState === SYNC_STATUS_ENUM.IN_PROGRESS ||
      currentState === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
    ) {
      this._setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING, false);
    } else {
      this._setSyncState(SYNC_STATUS_ENUM.PENDING, false);
    }

    console.log('[SYNC] Sync scheduled');
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimerTimestamp = Date.now();

    this.syncTimer = setTimeout(() => {
      const stateAtFire = this.getSyncState();
      if (
        stateAtFire === SYNC_STATUS_ENUM.IN_PROGRESS ||
        stateAtFire === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
      ) {
        console.log('[SYNC] There is already a sync in progress');
        this.scheduleSync(SYNC_DELAY_MS);
        return;
      }
      this.sync();
    }, time);
  }

  getSyncState(): number {
    return this.syncState;
  }

  getSyncStateEnum(): typeof SYNC_STATUS_ENUM {
    return SYNC_STATUS_ENUM;
  }

  setPreventScreenLock(value: boolean): void {
    this.preventScreenLock = value;
    reRender();
  }

  getPreventScreenLock(): boolean {
    return this.preventScreenLock;
  }

  _onEdit(): void {
    reRender();
    this.storage.saveDbState(this.getLocalState(), this.getAncestorState());
    this.scheduleSync();
  }

  _setSyncState(newState: number, skipRender: boolean): void {
    // Skip unnecessary renders
    if (this.syncState !== newState) {
      // Debug logging commented out to avoid unused variables
      //const origStateName = this.syncStateToSyncStateName(this.syncState);
      //const newStateName = this.syncStateToSyncStateName(newState);
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
  async _request<T = unknown>(
    method: string,
    url: string,
    body?: string,
    controller?: AbortController,
    overrideTimeout?: number,
    isAuth?: boolean
  ): Promise<NetworkResponse<T>> {
    try {
      const response = await network.request<T>(
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
      const response: NetworkResponse<T> = {
        status: -1,
        body: {
          message: err,
        } as T,
      };
      return response;
    }
  }

  getStorageUsage(): { players: number; teams: number; optimizations: number; system: number; total: number } {
    const state = this.getLocalState();

    const playersJson = JSON.stringify(state.players);
    const teamsJson = JSON.stringify(state.teams);
    const optimizationsJson = JSON.stringify(state.optimizations);
    const totalJson = JSON.stringify(state);

    const players = playersJson.length * 2;
    const teams = teamsJson.length * 2;
    const optimizations = optimizationsJson.length * 2;
    const total = totalJson.length * 2;
    const system = total - players - teams - optimizations;

    // We multiply by 2 because we store both local and ancestor copies
    return {
      players: (players / 1024) * 2,
      teams: (teams / 1024) * 2,
      optimizations: (optimizations / 1024) * 2,
      system: (system / 1024) * 2,
      total: (total / 1024) * 2,
    };
  }

  /**
   * Perform a network request.
   * Will update the state's "isOnline" variable based on the call's success or failure
   * Will update the state's "isSessionValid" variable based on the call's success or failure
   */
  async requestAuth<T = unknown>(
    method: string,
    url: string,
    body?: string,
    controller?: AbortController,
    overrideTimeout?: number
  ): Promise<NetworkResponse<T>> {
    return await this._request<T>(
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
   * Will update the state's "isOnline" variable based on the call's success or failure.
   * Does NOT treat 401/403 as session-invalidating — use requestAuth for authenticated endpoints.
   */
  async request<T = unknown>(
    method: string,
    url: string,
    body?: string,
    controller?: AbortController,
    overrideTimeout?: number
  ): Promise<NetworkResponse<T>> {
    return await this._request<T>(
      method,
      url,
      body,
      controller,
      overrideTimeout,
      false
    );
  }
}

const defaultState = new GlobalState();
let activeGlobalState = defaultState;
export const getGlobalState = (): GlobalState => {
  return activeGlobalState;
};
export const setGlobalState = (inputData: TopLevelClient | null): void => {
  const stateContainer =
    inputData == null ? undefined : new StateContainer(inputData);
  activeGlobalState = new GlobalState(
    stateContainer,
    undefined,
    new InMemoryStorage(),
    true
  );
  console.log('[GLOBAL_STATE] setting global state' /*, activeGlobalState*/);
};
export const setGlobalStateRaw = (globalStateObject: GlobalState): void => {
  activeGlobalState = globalStateObject;
  console.log(
    '[GLOBAL_STATE] setting global state raw' /*, activeGlobalState*/
  );
};
export const resetGlobalState = (): void => {
  activeGlobalState = defaultState;
};
