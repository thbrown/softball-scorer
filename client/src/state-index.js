import * as JsonPointer from 'jsonpointer';
import { findLastIndex } from 'utils/functions';

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
  constructor(stateContainer) {
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

  static _buildJsonPointer = function (...path) {
    return '/' + path.join('/');
  };

  static _splitJsonPointer = function (jsonPtr) {
    return jsonPtr.split('/');
  };

  static _getAny = function (arr) {
    return arr[0];
  };

  _getFromIndex(id, index, validationIndex, secondTry) {
    if (id === undefined) {
      throw new Error('Undefined input id ');
    }
    const jsonPointer = index[id];
    //console.log('Getting from', jsonPointer);

    const result =
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
          console.warn("Couldn't find", id, 'in', Object.keys(index), index);
          console.warn('teams', this.teamLookup);
          console.warn('games', this.gameLookup);
        } else {
          console.warn(
            "Couldn't find",
            id,
            'it has been moved or deleted. Old location',
            index[id],
            'in',
            Object.keys(index)
          );
        }

        this._buildIndex(index[id]);
        return this._getFromIndex(id, index, validationIndex, true);
      }
    } else {
      if (secondTry) {
        console.warn('FOUND ON INDEX REBUILD', jsonPointer);
      }
      return { value: result, jsonPointer };
    }
  }

  _buildIndex(location) {
    console.log(
      'REBUILDING STATE INDEX',
      location === undefined ? 'FULL' : location
    );
    const startTime = Date.now();
    if (new Error().stack.match(/_buildIndex/g).length > 1) {
      console.log(new Error().stack);
      throw new Error('Detected recursion during index building');
    }
    if (location !== undefined) {
      // Determine what part of the index needs to be updated
      // TODO this is not ready to be used, ideally we can use it to update a smaller part of the state
      const split = StateIndex._splitJsonPointer(location);
      for (let i = 0; i < split.length - 1; i++) {
        let sliced = split.slice(1, split.length - i).join('/');
        /*
        console.warn(
          i,
          StateIndex._buildJsonPointer(sliced),
          JsonPointer.get(this.stateContainer.get(), StateIndex._buildJsonPointer(sliced))
        );*/
      }
    }
    // TODO: we can pass an index into "findLastIndex" when rebuilding the entire index to improve re-build perf

    // Index team tree
    for (let team of this.stateContainer.get().teams) {
      this.addTeam(team.id);
      for (let game of team.games) {
        this.addGame(game.id, team.id);
        for (let pa of game.plateAppearances) {
          this.addPlateAppearance(pa.id, team.id, game.id);
        }
      }
    }

    // Index optimizations
    for (let optimization of this.stateContainer.get().optimizations) {
      this.addOptimization(optimization.id);
      for (let playerId in optimization.overrideData) {
        for (let pa of optimization.overrideData[playerId]) {
          this.addPaToOptimization(pa.id, playerId, optimization.id);
        }
      }
    }

    // Index players
    for (let player of this.stateContainer.get().players) {
      this.addPlayer(player.id);
    }

    console.log('REBUILDING TOOK', Date.now() - startTime, 'ms');
  }

  // =============== | ADDERS | ===================
  addPlayer(playerId) {
    this.playerLookup[playerId] = StateIndex._buildJsonPointer(
      'players',
      findLastIndex(this.stateContainer.get().players, (v) => v.id === playerId)
    );
  }

  addTeam(teamId) {
    this.teamLookup[teamId] = StateIndex._buildJsonPointer(
      'teams',
      findLastIndex(this.stateContainer.get().teams, (v) => v.id === teamId)
    );
  }

  addGame(gameId, teamId) {
    this.gameLookup[gameId] = StateIndex._buildJsonPointer(
      'teams',
      this.getTeamIndex(teamId),
      'games',
      findLastIndex(this.getTeam(teamId).games, (v) => v.id === gameId)
    );
    this.gameTeamLookup[gameId] = this.teamLookup[teamId];
  }

  addPlateAppearance(paId, teamId, gameId) {
    this.paLookup[paId] = StateIndex._buildJsonPointer(
      'teams',
      this.getTeamIndex(teamId),
      'games',
      this.getGameIndex(gameId),
      'plateAppearances',
      findLastIndex(this.getGame(gameId).plateAppearances, (v) => v.id === paId)
    );
    this.paGameLookup[paId] = this._getGame(gameId);
    this.paTeamLookup[paId] = this._getTeam(teamId);
  }

  addOptimization(optimizationId) {
    this.optimizationLookup[optimizationId] = StateIndex._buildJsonPointer(
      'optimizations',
      findLastIndex(
        this.stateContainer.get().optimizations,
        (v) => v.id === optimizationId
      )
    );
  }

  addPaToOptimization(paId, playerId, optimizationId) {
    // Lookup a optimization given a PA
    this.paOptimizationLookup[paId] = StateIndex._buildJsonPointer(
      'optimizations',
      this.getOptimizationIndex(optimizationId)
    );
    // Look up a particular pa that lives in an override
    this.paLookupTwo[paId] = StateIndex._buildJsonPointer(
      'optimizations',
      this.getOptimizationIndex(optimizationId),
      'overrideData',
      playerId,
      findLastIndex(
        this.getOptimization(optimizationId).overrideData[playerId],
        (v) => v.id === paId
      )
    );
  }

  // =============== | GETTERS | ==================

  getTeam(teamId) {
    return this._getFromIndex(teamId, this.teamLookup)?.value;
  }

  getPlayer(playerId) {
    return this._getFromIndex(playerId, this.playerLookup)?.value;
  }

  getOptimization(optimizationId) {
    return this._getFromIndex(optimizationId, this.optimizationLookup)?.value;
  }

  getGame(gameId) {
    //console.log(gameId, this.gameLookup);
    return this._getFromIndex(gameId, this.gameLookup)?.value;
  }

  getTeamForGame(gameId) {
    return this._getFromIndex(gameId, this.gameTeamLookup, this.teamLookup)
      ?.value;
  }

  getPa(paId) {
    return this._getFromIndex(paId, this.paLookup)?.value;
  }

  getPaFromOptimization(paId) {
    return this._getFromIndex(paId, this.paLookupTwo)?.value;
  }

  getTeamForPa(paId) {
    return this._getFromIndex(paId, this.paTeamLookup, this.teamLookup)?.value;
  }

  getGameForPa(paId) {
    return this._getFromIndex(paId, this.paGameLookup, this.gameLookup)?.value;
  }

  getOptimizationForPa(paId) {
    return this._getFromIndex(
      paId,
      this.paOptimizationLookup,
      this.optimizationLookup
    )?.value;
  }

  // =============== | INDEX GETTERS | ==================

  getTeamIndex(teamId) {
    const team = this._getTeam(teamId);
    if (team === undefined) return undefined;
    return StateIndex._splitJsonPointer(team).at(-1);
  }

  getPlayerIndex(playerId) {
    const player = this._getPlayer(playerId);
    if (player === undefined) return undefined;
    return StateIndex._splitJsonPointer(player).at(-1);
  }

  getOptimizationIndex(optimizationId) {
    const optimization = this._getOptimization(optimizationId);
    if (optimization === undefined) return undefined;
    return StateIndex._splitJsonPointer(optimization).at(-1);
  }

  getGameIndex(gameId) {
    const game = this._getGame(gameId);
    if (game === undefined) return undefined;
    return StateIndex._splitJsonPointer(game).at(-1);
  }

  getPaIndex(paId) {
    const pa = this._getPa(paId);
    if (pa === undefined) return undefined;
    return StateIndex._splitJsonPointer(pa).at(-1);
  }

  getPaFromOptimizationIndex(paId) {
    const pa = this._getPaFromOptimization(paId);
    if (pa === undefined) return undefined;
    return StateIndex._splitJsonPointer(pa).at(-1);
  }

  // =============== | POINTER GETTERS (internal) | ==================

  _getTeam(teamId) {
    return this._getFromIndex(teamId, this.teamLookup)?.jsonPointer;
  }

  _getPlayer(playerId) {
    return this._getFromIndex(playerId, this.playerLookup)?.jsonPointer;
  }

  _getOptimization(optimizationId) {
    return this._getFromIndex(optimizationId, this.optimizationLookup)
      ?.jsonPointer;
  }

  _getGame(gameId) {
    return this._getFromIndex(gameId, this.gameLookup)?.jsonPointer;
  }

  _getTeamForGame(gameId) {
    return this._getFromIndex(gameId, this.gameTeamLookup, this.teamLookup)
      ?.value;
  }

  _getPa(paId) {
    return this._getFromIndex(paId, this.paLookup)?.jsonPointer;
  }

  _getPaFromOptimization(paId) {
    return this._getFromIndex(paId, this.paLookupTwo)?.jsonPointer;
  }

  _getTeamForPa(paId) {
    return this._getFromIndex(paId, this.paTeamLookup, this.teamLookup)
      ?.jsonPointer;
  }

  _getGameForPa(paId) {
    return this._getFromIndex(paId, this.paGameLookup, this.gameLookup)
      ?.jsonPointer;
  }

  _getOptimizationForPa(paId) {
    return this._getFromIndex(
      paId,
      this.paOptimizationLookup,
      this.optimizationLookup
    )?.jsonPointer;
  }
}
