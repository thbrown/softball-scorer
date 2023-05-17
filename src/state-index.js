import * as jsonPointer from 'jsonpointer';

/**
 * This class keeps track of a bunch of maps so that it's easy to lookup related objects in the global state.
 * The maps are of the form {id -> jsonPointer}
 * The json pointer points to the place in the state object where an object with the id existed the last time the index was built.
 *
 * By using json pointers instead of references to the object itself we can detect if an object has been removed from the state by
 * finding either an undefined entry or (in the case of an array) an entry whose id doesn't match the expected id. In these cases, we can
 * re-build the index and try again.
 *
 * This is built a little bit for perf reasons, but mostly to clean all the redundant loops out of the global state functions.
 */
export default class StateIndex {
  constructor(state) {
    this.state = state;
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
  }

  static buildJsonPointer = function (...path) {
    return '/' + path.join('/');
  };

  getFromIndex(id, index, validationIndex, secondTry) {
    if (id === undefined) {
      throw new Error('Undefined input id');
    }
    //console.warn('POINTER', index[id], index, id);
    const result =
      index[id] === undefined
        ? undefined
        : jsonPointer.get(this.state, index[id]);
    //console.warn('RESULT', result);

    // Determine what part of the index needs to be updated
    /*
    if (index[id] !== undefined) {
      const split = index[id].split('/');
      console.warn('TESTING!!!!', split, split.length);

      for (let i = 0; i < split.length - 1; i++) {
        let sliced = split.slice(1, split.length - i).join('/');
        console.warn(
          i,
          StateIndex.buildJsonPointer(sliced),
          jsonPointer.get(this.state, StateIndex.buildJsonPointer(sliced))
        );
      }
    }
    */

    const expectedResultId =
      result && validationIndex
        ? jsonPointer.get(this.state, validationIndex[result.id])?.id
        : id;

    if (result === undefined || result.id !== expectedResultId) {
      if (secondTry === true) {
        return undefined;
      } else {
        // Cache miss
        this.buildIndex();
        return this.getFromIndex(id, index, validationIndex, true);
      }
    } else {
      return result;
    }
  }

  buildIndex() {
    console.log('REBUILDING STATE INDEX');

    // Index team tree
    for (let [teamIndex, team] of this.state.teams.entries()) {
      this.teamLookup[team.id] = StateIndex.buildJsonPointer(
        'teams',
        teamIndex
      );
      for (let [gameIndex, game] of team.games.entries()) {
        this.gameLookup[game.id] = StateIndex.buildJsonPointer(
          'teams',
          teamIndex,
          'games',
          gameIndex
        );
        this.gameTeamLookup[game.id] = this.teamLookup[team.id];
        for (let [paIndex, pa] of game.plateAppearances.entries()) {
          this.paLookup[pa.id] = StateIndex.buildJsonPointer(
            'teams',
            teamIndex,
            'games',
            gameIndex,
            'plateAppearances',
            paIndex
          );
          this.paGameLookup[pa.id] = this.gameLookup[game.id];
          this.paTeamLookup[pa.id] = this.teamLookup[team.id];
        }
      }
    }

    // Index optimizations
    for (let [
      optimizationIndex,
      optimization,
    ] of this.state.optimizations.entries()) {
      this.optimizationLookup[optimization.id] = StateIndex.buildJsonPointer(
        'optimizations',
        optimizationIndex
      );
      for (let playerId in optimization.overrideData) {
        for (let [paIndex, pa] of optimization.overrideData[
          playerId
        ].entries()) {
          this.paOptimizationLookup[pa.id] = StateIndex.buildJsonPointer(
            'optimizations',
            optimizationIndex
          );
          this.paLookupTwo[pa.id] = StateIndex.buildJsonPointer(
            'optimizations',
            optimizationIndex,
            'overrideData',
            playerId,
            paIndex
          );
        }
      }
    }

    // Index players
    for (let [playerIndex, player] of this.state.players.entries()) {
      this.playerLookup[player.id] = StateIndex.buildJsonPointer(
        'players',
        playerIndex
      );
    }
  }

  getTeam(teamId) {
    return this.getFromIndex(teamId, this.teamLookup);
  }

  getPlayer(playerId) {
    return this.getFromIndex(playerId, this.playerLookup);
  }

  getOptimization(optimizationId) {
    return this.getFromIndex(optimizationId, this.optimizationLookup);
  }

  getGame(gameId) {
    return this.getFromIndex(gameId, this.gameLookup);
  }

  getTeamForGame(gameId) {
    return this.getFromIndex(gameId, this.gameTeamLookup, this.teamLookup);
  }

  getPa(paId) {
    return this.getFromIndex(paId, this.paLookup);
  }

  getPaFromOptimization(paId) {
    return this.getFromIndex(paId, this.paLookupTwo);
  }

  getTeamForPa(paId) {
    return this.getFromIndex(paId, this.paTeamLookup, this.teamLookup);
  }

  getGameForPa(paId) {
    return this.getFromIndex(paId, this.paGameLookup, this.gameLookup);
  }

  getOptimizationForPa(paId) {
    return this.getFromIndex(
      paId,
      this.paOptimizationLookup,
      this.optimizationLookup
    );
  }
}
