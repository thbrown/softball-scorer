import * as JsonPointer from 'jsonpointer';
import { findLastIndex } from './utils/functions';
import StateContainer from './state-container';
import type {
  Team,
  Game,
  PlateAppearance,
  Player,
  Optimization,
} from 'shared-lib';
import type {
  PlayerId,
  TeamId,
  GameId,
  PlateAppearanceId,
  OptimizationId,
} from './types/branded-ids';

// Type aliases
type JsonPointerString = string;
type LookupMap = Record<string, JsonPointerString>;

interface IndexResult<T> {
  value: T;
  jsonPointer: JsonPointerString;
}

/**
 * This class keeps track of a bunch of maps so that it's easy to lookup related objects in the global getGlobalState().
 * The maps are of the form {id -> jsonPointer}
 * The json pointer points to the place in the state object where an object with the id existed (it may have been deleted).
 *
 * Using json pointers instead of references to the object itself has a couple of benefits:
 * 1) The garbage collector doesn't keep deleted objects around just because they are in the index
 * 2) We can detect deletions without updating the index on each delete by finding either an undefined entry or (in the case of an array) an entry whose id doesn't match the input id. In these cases, we can
 * re-build the index and try again to be safe, but it probably means the thing you are looking for has been deleted.
 *
 * Rules for using:
 * Anytime something is added to the state, it needs to be added to the index as well. Call the appropriate add function immediately after adding it to the getGlobalState().
 * Anytime something is delete from the state, it DOES NOT need to be removed from the index.
 * Anytime something in the state is mutated, no changes are needed in the index.
 *
 * This is built a little bit for perf reasons, but mostly to clean all the redundant loops out of the global state functions.
 */
export default class StateIndex {
  private stateContainer: StateContainer;
  private teamLookup: LookupMap;
  private gameLookup: LookupMap;
  private gameTeamLookup: LookupMap;
  private paLookup: LookupMap;
  private paLookupTwo: LookupMap;
  private paGameLookup: LookupMap;
  private paTeamLookup: LookupMap;
  private paOptimizationLookup: LookupMap;
  private playerLookup: LookupMap;
  private optimizationLookup: LookupMap;

  constructor(stateContainer: StateContainer) {
    this.stateContainer = stateContainer;
    this.teamLookup = {};
    this.gameLookup = {};
    this.gameTeamLookup = {};
    this.paLookup = {};
    this.paLookupTwo = {};
    this.paGameLookup = {};
    this.paTeamLookup = {};
    this.paOptimizationLookup = {};
    this.playerLookup = {};
    this.optimizationLookup = {};
    this._buildIndex();
  }

  // =============== | PRIVATE HELPERS | ===================

  static _buildJsonPointer = function (
    ...path: (string | number | undefined)[]
  ): JsonPointerString {
    return '/' + path.join('/');
  };

  static _splitJsonPointer = function (jsonPtr: JsonPointerString): string[] {
    return jsonPtr.split('/');
  };

  static _getAny = function <T>(arr: T[]): T {
    return arr[0];
  };

  private _getFromIndex<T extends { id: string }>(
    id: string,
    index: LookupMap,
    validationIndex?: LookupMap,
    secondTry?: boolean
  ): IndexResult<T> | undefined {
    if (id === undefined) {
      throw new Error('Undefined input id ');
    }
    const jsonPointer = index[id];
    //console.log('Getting from', jsonPointer);

    const result: T | undefined =
      jsonPointer === undefined
        ? undefined
        : JsonPointer.get(this.stateContainer.get(), index[id]);
    //console.log('result', JSON.stringify(result)?.substring(0, 30));

    const expectedResultId =
      result && validationIndex
        ? JsonPointer.get(this.stateContainer.get(), validationIndex[result.id])
            ?.id
        : id;

    if (result === undefined || result.id !== expectedResultId) {
      if (secondTry === true) {
        return undefined;
      } else {
        // Cache miss
        if (index[id] === undefined) {
          //console.warn("Couldn't find", id, 'in', Object.keys(index), index);
          //console.warn('teams', this.teamLookup);
          //console.warn('games', this.gameLookup);
        } else {
          /*
          console.warn(
            "Couldn't find",
            id,
            'it has been moved or deleted. Old location',
            index[id],
            'in',
            Object.keys(index)
          );
          */
        }

        this._buildIndex(index[id]);
        return this._getFromIndex<T>(id, index, validationIndex, true);
      }
    } else {
      if (secondTry) {
        console.log('FOUND ON INDEX REBUILD', jsonPointer);
      }
      return { value: result, jsonPointer };
    }
  }

  private _buildIndex(location?: JsonPointerString): void {
    console.log(
      'REBUILDING STATE INDEX',
      location === undefined ? 'FULL' : location
    );
    const startTime = Date.now();
    if (new Error().stack!.match(/_buildIndex/g)!.length > 1) {
      console.log(new Error().stack);
      throw new Error('Detected recursion during index building');
    }
    if (location !== undefined) {
      // Determine what part of the index needs to be updated
      // TODO this is not ready to be used, ideally we can use it to update a smaller part of the state
      const split = StateIndex._splitJsonPointer(location);
      for (let i = 0; i < split.length - 1; i++) {
        /*
        const sliced = split.slice(1, split.length - i).join('/');

        console.warn(
          i,
          StateIndex._buildJsonPointer(sliced),
          JsonPointer.get(this.stateContainer.get(), StateIndex._buildJsonPointer(sliced))
        );*/
      }
    }
    // TODO: we can pass an index into "findLastIndex" when rebuilding the entire index to improve re-build perf

    // Index team tree
    for (const team of this.stateContainer.get().teams) {
      this.addTeam(team.id);
      for (const game of team.games) {
        this.addGame(game.id, team.id);
        for (const pa of game.plateAppearances) {
          this.addPlateAppearance(pa.id, team.id, game.id);
        }
      }
    }

    // Index optimizations
    for (const optimization of this.stateContainer.get().optimizations) {
      this.addOptimization(optimization.id);
      for (const playerId in optimization.overrideData) {
        for (const pa of optimization.overrideData[playerId]) {
          this.addPaToOptimization(pa.id, playerId, optimization.id);
        }
      }
    }

    // Index players
    for (const player of this.stateContainer.get().players) {
      this.addPlayer(player.id);
    }

    console.log('REBUILDING TOOK', Date.now() - startTime, 'ms');
  }

  // =============== | ADDERS | ===================
  addPlayer(playerId: string | PlayerId): void {
    this.playerLookup[playerId as string] = StateIndex._buildJsonPointer(
      'players',
      findLastIndex(this.stateContainer.get().players, (v) => v.id === playerId)
    );
  }

  addTeam(teamId: string | TeamId): void {
    this.teamLookup[teamId as string] = StateIndex._buildJsonPointer(
      'teams',
      findLastIndex(this.stateContainer.get().teams, (v) => v.id === teamId)
    );
  }

  addGame(gameId: string | GameId, teamId: string | TeamId): void {
    this.gameLookup[gameId as string] = StateIndex._buildJsonPointer(
      'teams',
      this.getTeamIndex(teamId as string),
      'games',
      findLastIndex(
        this.getTeam(teamId as string)!.games,
        (v) => v.id === gameId
      )
    );
    this.gameTeamLookup[gameId as string] = this.teamLookup[teamId as string];
  }

  addPlateAppearance(
    paId: string | PlateAppearanceId,
    teamId: string | TeamId,
    gameId: string | GameId
  ): void {
    this.paLookup[paId as string] = StateIndex._buildJsonPointer(
      'teams',
      this.getTeamIndex(teamId as string),
      'games',
      this.getGameIndex(gameId as string),
      'plateAppearances',
      findLastIndex(
        this.getGame(gameId as string)!.plateAppearances,
        (v) => v.id === paId
      )
    );
    this.paGameLookup[paId as string] = this._getGame(gameId as string)!;
    this.paTeamLookup[paId as string] = this._getTeam(teamId as string)!;
  }

  addOptimization(optimizationId: string | OptimizationId): void {
    this.optimizationLookup[optimizationId as string] =
      StateIndex._buildJsonPointer(
        'optimizations',
        findLastIndex(
          this.stateContainer.get().optimizations,
          (v) => v.id === optimizationId
        )
      );
  }

  addPaToOptimization(
    paId: string | PlateAppearanceId,
    playerId: string | PlayerId,
    optimizationId: string | OptimizationId
  ): void {
    // Lookup a optimization given a PA
    this.paOptimizationLookup[paId as string] = StateIndex._buildJsonPointer(
      'optimizations',
      this.getOptimizationIndex(optimizationId as string)
    );
    // Look up a particular pa that lives in an override
    this.paLookupTwo[paId as string] = StateIndex._buildJsonPointer(
      'optimizations',
      this.getOptimizationIndex(optimizationId as string),
      'overrideData',
      playerId as string,
      findLastIndex(
        this.getOptimization(optimizationId as string)!.overrideData[
          playerId as string
        ],
        (v) => v.id === paId
      )
    );
  }

  // =============== | GETTERS | ==================

  getTeam(teamId: TeamId): Team | undefined;
  getTeam(teamId: string): Team | undefined;
  getTeam(teamId: TeamId | string): Team | undefined {
    return this._getFromIndex<Team>(teamId as string, this.teamLookup)?.value;
  }

  getPlayer(playerId: PlayerId): Player | undefined;
  getPlayer(playerId: string): Player | undefined;
  getPlayer(playerId: PlayerId | string): Player | undefined {
    return this._getFromIndex<Player>(playerId as string, this.playerLookup)
      ?.value;
  }

  getOptimization(optimizationId: OptimizationId): Optimization | undefined;
  getOptimization(optimizationId: string): Optimization | undefined;
  getOptimization(
    optimizationId: OptimizationId | string
  ): Optimization | undefined {
    return this._getFromIndex<Optimization>(
      optimizationId as string,
      this.optimizationLookup
    )?.value;
  }

  getGame(gameId: GameId): Game | undefined;
  getGame(gameId: string): Game | undefined;
  getGame(gameId: GameId | string): Game | undefined {
    //console.log(gameId, this.gameLookup);
    return this._getFromIndex<Game>(gameId as string, this.gameLookup)?.value;
  }

  getTeamForGame(gameId: GameId): Team | undefined;
  getTeamForGame(gameId: string): Team | undefined;
  getTeamForGame(gameId: GameId | string): Team | undefined {
    return this._getFromIndex<Team>(
      gameId as string,
      this.gameTeamLookup,
      this.teamLookup
    )?.value;
  }

  getPa(paId: PlateAppearanceId): PlateAppearance | undefined;
  getPa(paId: string): PlateAppearance | undefined;
  getPa(paId: PlateAppearanceId | string): PlateAppearance | undefined {
    return this._getFromIndex<PlateAppearance>(paId as string, this.paLookup)
      ?.value;
  }

  getPaFromOptimization(paId: PlateAppearanceId): PlateAppearance | undefined;
  getPaFromOptimization(paId: string): PlateAppearance | undefined;
  getPaFromOptimization(
    paId: PlateAppearanceId | string
  ): PlateAppearance | undefined {
    return this._getFromIndex<PlateAppearance>(paId as string, this.paLookupTwo)
      ?.value;
  }

  getTeamForPa(paId: PlateAppearanceId): Team | undefined;
  getTeamForPa(paId: string): Team | undefined;
  getTeamForPa(paId: PlateAppearanceId | string): Team | undefined {
    return this._getFromIndex<Team>(
      paId as string,
      this.paTeamLookup,
      this.teamLookup
    )?.value;
  }

  getGameForPa(paId: PlateAppearanceId): Game | undefined;
  getGameForPa(paId: string): Game | undefined;
  getGameForPa(paId: PlateAppearanceId | string): Game | undefined {
    return this._getFromIndex<Game>(
      paId as string,
      this.paGameLookup,
      this.gameLookup
    )?.value;
  }

  getOptimizationForPa(paId: PlateAppearanceId): Optimization | undefined;
  getOptimizationForPa(paId: string): Optimization | undefined;
  getOptimizationForPa(
    paId: PlateAppearanceId | string
  ): Optimization | undefined {
    return this._getFromIndex<Optimization>(
      paId as string,
      this.paOptimizationLookup,
      this.optimizationLookup
    )?.value;
  }

  // =============== | INDEX GETTERS | ==================

  getTeamIndex(teamId: string | TeamId): string | undefined {
    const team = this._getTeam(teamId as string);
    if (team === undefined) return undefined;
    return StateIndex._splitJsonPointer(team).at(-1);
  }

  getPlayerIndex(playerId: string | PlayerId): string | undefined {
    const player = this._getPlayer(playerId as string);
    if (player === undefined) return undefined;
    return StateIndex._splitJsonPointer(player).at(-1);
  }

  getOptimizationIndex(
    optimizationId: string | OptimizationId
  ): string | undefined {
    const optimization = this._getOptimization(optimizationId as string);
    if (optimization === undefined) return undefined;
    return StateIndex._splitJsonPointer(optimization).at(-1);
  }

  getGameIndex(gameId: string | GameId): string | undefined {
    const game = this._getGame(gameId as string);
    if (game === undefined) return undefined;
    return StateIndex._splitJsonPointer(game).at(-1);
  }

  getPaIndex(paId: string | PlateAppearanceId): string | undefined {
    const pa = this._getPa(paId as string);
    if (pa === undefined) return undefined;
    return StateIndex._splitJsonPointer(pa).at(-1);
  }

  getPaFromOptimizationIndex(
    paId: string | PlateAppearanceId
  ): string | undefined {
    const pa = this._getPaFromOptimization(paId as string);
    if (pa === undefined) return undefined;
    return StateIndex._splitJsonPointer(pa).at(-1);
  }

  // =============== | POINTER GETTERS (internal) | ==================

  private _getTeam(teamId: string | TeamId): JsonPointerString | undefined {
    return this._getFromIndex<Team>(teamId as string, this.teamLookup)
      ?.jsonPointer;
  }

  private _getPlayer(
    playerId: string | PlayerId
  ): JsonPointerString | undefined {
    return this._getFromIndex<Player>(playerId as string, this.playerLookup)
      ?.jsonPointer;
  }

  private _getOptimization(
    optimizationId: string | OptimizationId
  ): JsonPointerString | undefined {
    return this._getFromIndex<Optimization>(
      optimizationId as string,
      this.optimizationLookup
    )?.jsonPointer;
  }

  private _getGame(gameId: string | GameId): JsonPointerString | undefined {
    return this._getFromIndex<Game>(gameId as string, this.gameLookup)
      ?.jsonPointer;
  }

  private _getTeamForGame(gameId: string | GameId): Team | undefined {
    return this._getFromIndex<Team>(
      gameId as string,
      this.gameTeamLookup,
      this.teamLookup
    )?.value;
  }

  private _getPa(
    paId: string | PlateAppearanceId
  ): JsonPointerString | undefined {
    return this._getFromIndex<PlateAppearance>(paId as string, this.paLookup)
      ?.jsonPointer;
  }

  private _getPaFromOptimization(
    paId: string | PlateAppearanceId
  ): JsonPointerString | undefined {
    return this._getFromIndex<PlateAppearance>(paId as string, this.paLookupTwo)
      ?.jsonPointer;
  }

  private _getTeamForPa(
    paId: string | PlateAppearanceId
  ): JsonPointerString | undefined {
    return this._getFromIndex<Team>(
      paId as string,
      this.paTeamLookup,
      this.teamLookup
    )?.jsonPointer;
  }

  private _getGameForPa(
    paId: string | PlateAppearanceId
  ): JsonPointerString | undefined {
    return this._getFromIndex<Game>(
      paId as string,
      this.paGameLookup,
      this.gameLookup
    )?.jsonPointer;
  }

  private _getOptimizationForPa(
    paId: string | PlateAppearanceId
  ): JsonPointerString | undefined {
    return this._getFromIndex<Optimization>(
      paId as string,
      this.paOptimizationLookup,
      this.optimizationLookup
    )?.jsonPointer;
  }
}
