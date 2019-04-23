"use strict";

const expose = require("expose");
const objectMerge = require("../object-merge.js");
const network = require("network.js");
const idUtils = require("../id-utils.js");

const LZString = require("lz-string");
const hasher = require("object-hash");

// Constants
const INITIAL_STATE = { teams: [], players: [], optimizations: [] };
const CURRENT_LS_SCHEMA_VERSION = "6";
const SYNC_DELAY_MS = 10000;
const SYNC_STATUS_ENUM = Object.freeze({
  COMPLETED: 1,
  ERROR: 2,
  IN_PROGRESS: 3,
  PENDING: 4,
  IN_PROGRESS_AND_PENDING: 5,
  UNKNOWN: 6
});
const OPTIMIZATION_STATUS_ENUM = Object.freeze({
  NOT_STARTED: 0,
  STARTING: 1,
  IN_PROGRESS: 2,
  COMPLETE: 3,
  PAUSED: 4
});
const OPTIMIZATION_TYPE_ENUM = Object.freeze({
  MONTE_CARLO_EXAUSTIVE: 0
});
const LINEUP_TYPE_ENUM = Object.freeze({
  NORMAL: 0,
  ALTERNATING_GENDER: 1,
  NO_CONSECUTIVE_FEMALES: 2
});

// Database State - Stored in memory, local storage, and persisted in the db
let ANCESTOR_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
let LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));

// Application State - State that applies across windows. Stored in local storage and in memory.
let online = true;
let sessionValid = false;
let activeUser = null;

// Window State - State saved in memory only
let addToHomescreenEvent = null;
let syncState = SYNC_STATUS_ENUM.UNKNOWN;
let syncTimer = null;

const state = exports;

exports.getServerUrl = function(path) {
  return window.location.href + path;
};

// HTTP Standard Status codes plus:
// -1 network issue
// -2 failed on fullSync = false
// -3 failed on fullSync = true
exports.sync = async function(fullSync) {
  console.log("Sync requested", fullSync ? "full" : "patchOnly");
  while (
    exports.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS ||
    exports.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
  ) {
    // Simultanious syncs might be okay, but we'll still limit it to one at a time for clarity
    console.log(
      "waiting for in progress sync to finish" + exports.getSyncState()
    );
    await sleep(500);
  }
  setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS);
  try {
    // Save a deep copy of the local state
    let localStateCopy = JSON.parse(JSON.stringify(state.getLocalState()));
    let localState = state.getLocalState();

    // Save the ancestor state so we can restore it if something goes wrong
    let ancestorStateCopy = JSON.parse(
      JSON.stringify(state.getAncestorState())
    );

    // Get the patch ready to send to the server
    let ancestorChecksum = state.getAncestorStateChecksum();
    let body = {
      md5: ancestorChecksum,
      patch: objectMerge.diff(state.getAncestorState(), localState),
      type: fullSync ? "full" : "any"
    };

    // Ship it
    console.log("SENDING SYNC", body);
    let response = await network.request(
      "POST",
      "server/sync",
      JSON.stringify(body)
    );

    if (response.status === 200) {
      let serverState = response.body;
      console.log("Received", serverState);

      // First gather any changes that were made locally while the request was still working
      let localChangesDuringRequest = objectMerge.diff(
        localStateCopy,
        localState
      );

      // Update the ancestor if updates were received from server
      if (serverState.base) {
        // The entire state was sent, we can just save it directly
        state.setAncestorState(serverState.base);
      } else if (serverState.patches) {
        // Patches were sent, apply all patches to ancestor state
        let ancestorState = state.getAncestorState();
        if (serverState.patches) {
          console.log(
            `Applying ${serverState.patches.length} patches `,
            serverState.patches
          );
          serverState.patches.forEach(patch => {
            objectMerge.patch(ancestorState, patch);
          });
        }
      } else {
        console.log("No updates recieved from server");
      }

      // If the server state changed, verify the ancesor state (after updates) has the same hash as the server state
      if (serverState.base || serverState.patches) {
        // Verify checksum
        let ancestorHash = getMd5(state.getAncestorState());
        console.log("CLIENT: ", ancestorHash, " SERVER: ", serverState.md5);
        if (ancestorHash !== serverState.md5) {
          if (fullSync) {
            // Something went wrong after trying a full sync, we probaly can't do anything about it!
            // serverState.base should have contained a verbatium copy of what the server has, so this is weird.
            console.log(
              "Yikes! Something went wrong while attempting full sync"
            );
            console.log(state.getAncestorState(), serverState.base);
            // Set the state back to what it was when we first did a sync
            state.setAncestorState(ancestorStateCopy);
            throw new Error(-3);
          } else {
            // Something bad happened with a patch based sync, we may be able to repeat the request with type "full" so we'll get the whole state back, not just the patches
            console.log("Something went wrong while attempting patch sync");
            console.log(state.getAncestorState(), serverState.base);
            console.log(
              objectMerge.diff(state.getAncestorState(), serverState.base)
            );

            let A = getMd5(state.getAncestorState());
            let B = getMd5(serverState.base);
            console.log(A, B);

            // Set the state back to what it was when we first did a sync
            state.setAncestorState(ancestorStateCopy);
            throw new Error(-2);
          }
        } else {
          console.log(
            "Sync was successful! (client and server checksums match)"
          );
        }
      }
      // Copy
      let newLocalState = JSON.parse(JSON.stringify(state.getAncestorState()));

      // Apply any changes that were made during the request to the new local state (Presumably this will be a no-op most times)
      objectMerge.patch(newLocalState, localChangesDuringRequest, true);

      // Set local state to a copy of ancestor state (w/ localChangesDuringRequest applied)
      setLocalStateNoSideEffects(newLocalState);
      reRender();

      // Write the most updated data to local storage
      exports.saveDbStateToLocalStorage();
    } else {
      console.log(response.status);
      throw new Error(response.status);
    }

    if (exports.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS) {
      setSyncState(SYNC_STATUS_ENUM.COMPLETE);
    } else if (
      exports.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
    ) {
      setSyncState(SYNC_STATUS_ENUM.PENDING);
    } else {
      // Don't think this should be possible
      console.log("Invalid state transition");
      setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
    }

    return response.status;
  } catch (err) {
    // We might be able to re-try some problems, like if the network is temporarally out
    setSyncState(SYNC_STATUS_ENUM.PENDING); // Assume re-try
    if (
      (err.message == -1 && !exports.isOnline()) ||
      err.message == 403 ||
      err.message == 401 ||
      err.message == 502
    ) {
      // Pause future syncs but don't sound the alert alarm for these cases (not bugs) for
      // 1) User is not signed in
      // 2) App is in offline mode
      console.log(
        "Auth problem or offline mode is active: retrying sync later"
      );
      setSyncState(SYNC_STATUS_ENUM.ERROR);
    } else if (err.message == 503 || err.message == -1) {
      // Re-try later might work for
      // 1) Server rate limiting errors
      // 2) Weird network conditions
      console.log("Network issues or server is busy: retrying sync later");
      scheduleSync();
    } else if (err.message == -2) {
      // Issue with patch based sync, re-try with a full sync
      console.log("Issue with patch sync: attemtping full sync");
      await exports.sync(true);
    } else {
      // Other 500s, 400s are probably bugs :(, tell the user something is wrong
      console.log("Probable bug encountered");
      alert(
        "Auto sync failed with status " +
          err.message +
          ". App will continue to function, but your data won't be synced with the server. Consider backing up your data from the main menu to avoid data loss. Details: " +
          err
      );
      console.log(err);
      setSyncState(SYNC_STATUS_ENUM.ERROR);
    }
    return err.message;
  }
};

exports.resetSyncState = function() {
  setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
};

exports.resetState = function() {
  setSyncState(SYNC_STATUS_ENUM.UNKNOWN);

  online = true;
  sessionValid = false;
  activeUser = null;

  LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
  ANCESTOR_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));

  exports.saveApplicationStateToLocalStorage();
  exports.saveDbStateToLocalStorage();
};

exports.getLocalState = function() {
  return LOCAL_DB_STATE;
};

exports.setLocalState = function(newState) {
  LOCAL_DB_STATE = newState;
  onEdit();
};

let setLocalStateNoSideEffects = function(newState) {
  LOCAL_DB_STATE = newState;
};

exports.getAncestorState = function() {
  return ANCESTOR_DB_STATE;
};

exports.setAncestorState = function(s) {
  ANCESTOR_DB_STATE = s;
};

exports.getAncestorStateChecksum = function() {
  return getMd5(ANCESTOR_DB_STATE);
};

exports.hasAnythingChanged = function() {
  return getMd5(LOCAL_DB_STATE) !== getMd5(INITIAL_STATE);
};

// TEAM

exports.getTeam = function(team_id, state) {
  return (state || LOCAL_DB_STATE).teams.reduce((prev, curr) => {
    return curr.id === team_id ? curr : prev;
  }, null);
};

exports.addTeam = function(team_name) {
  const id = getNextId();
  let new_state = exports.getLocalState();
  let team = {
    id: id,
    name: team_name,
    games: []
  };
  new_state.teams.push(team);
  onEdit();
  return team;
};

exports.replaceTeam = function(oldTeamId, newTeam) {
  let localState = exports.getLocalState();
  let oldTeam = exports.getTeam(oldTeamId);
  let oldTeamIndex = localState.teams.indexOf(oldTeam);
  localState.teams[oldTeamIndex] = newTeam;
  onEdit();
};

exports.removeTeam = function(team_id) {
  let new_state = exports.getLocalState();
  new_state.teams = new_state.teams.filter(team => {
    return team.id !== team_id;
  });
  onEdit();
};

// PLAYER

exports.getPlayer = function(player_id, state) {
  return (state || LOCAL_DB_STATE).players.reduce((prev, curr) => {
    return curr.id === player_id ? curr : prev;
  }, null);
};

exports.replacePlayer = function(playerId, newPlayer) {
  let localState = exports.getLocalState();
  let oldPlayer = exports.getPlayer(playerId, localState);

  let oldPlayerIndex = localState.players.indexOf(oldPlayer);
  localState.players[oldPlayerIndex] = newPlayer;
  onEdit();
};

exports.getAllPlayers = function() {
  return exports.getLocalState().players;
};

exports.getAllPlayersAlphabetically = function() {
  // Make sure we don't re-order the original array, this will result in sync issues
  let copy = exports.getLocalState().players.slice(0);
  return copy.sort(this.playerNameComparator);
};

this.playerNameComparator = function(a, b) {
  if (a.name.toLowerCase() < b.name.toLowerCase()) {
    return -1;
  }
  if (a.name.toLowerCase() > b.name.toLowerCase()) {
    return 1;
  }
  return 0;
};

exports.removePlayer = function(playerId) {
  if (
    exports.getGamesWithPlayerInLineup(playerId).length === 0 &&
    exports.getGamesWherePlayerHasPlateAppearances(playerId).length === 0
  ) {
    let localState = exports.getLocalState();
    localState.players = localState.players.filter(player => {
      return player.id !== playerId;
    });
    onEdit();
    return true;
  } else {
    return false;
  }
};

exports.addPlayer = function(playerName, gender) {
  const id = getNextId();
  let new_state = exports.getLocalState();
  let player = {
    id: id,
    name: playerName,
    gender: gender,
    song_link: null,
    song_start: null
  };
  new_state.players.push(player);
  onEdit();
  return player;
};

// OPTIMIZATION

exports.getOptimization = function(optimizationId) {
  return LOCAL_DB_STATE.optimizations.reduce((prev, curr) => {
    return curr.id === optimizationId ? curr : prev;
  }, null);
};

exports.replaceOptimization = function(optimizationId, newOptimization) {
  let localState = exports.getLocalState();
  let oldOptimization = exports.getOptimization(optimizationId);

  let oldOptimizationIndex = localState.optimizations.indexOf(oldOptimization);
  localState.optimizations[oldOptimizationIndex] = newOptimization;
  onEdit();
};

// Pass in null or undefined to delete
exports.putOptimizationPlayerOverride = function(
  optimizationId,
  playerId,
  override
) {
  let optimization = exports.getOptimization(optimizationId);
  let deserializedInclusions = JSON.parse(optimization.inclusions);
  if (override) {
    deserializedInclusions.overrides[playerId] = override;
  } else {
    delete deserializedInclusions.overrides[playerId];
  }
  optimization.inclusions = JSON.stringify(deserializedInclusions);
};

// TODO: can we assume that staging is always set?
exports.putOptimizationPlayers = function(optimizationId, players) {
  let optimization = exports.getOptimization(optimizationId);
  let deserializedInclusions = JSON.parse(optimization.inclusions);
  if (Array.isArray(players)) {
    deserializedInclusions.staging.players = players;
  } else if (!players) {
    deserializedInclusions.staging.players = [];
  } else {
    throw new Error(
      "Players argument must either be an array or falsy (null, undefined, etc.) but was " +
        players +
        " of type " +
        typeof players +
        " is array? " +
        Array.isArray(players)
    );
  }
  optimization.inclusions = JSON.stringify(deserializedInclusions);
};

exports.putOptimizationTeams = function(optimizationId, players) {
  let optimization = exports.getOptimization(optimizationId);
  let deserializedInclusions = JSON.parse(optimization.inclusions);
  if (Array.isArray(players)) {
    deserializedInclusions.staging.teams = teams;
  } else if (!players) {
    deserializedInclusions.staging.teams = [];
  } else {
    throw new Error(
      "Teams argument must either be an array or falsy (null, undefined, etc.) but was " +
        players +
        " of type " +
        typeof players +
        " is array? " +
        Array.isArray(players)
    );
  }
  optimization.inclusions = JSON.stringify(deserializedInclusions);
};

exports.getAllOptimizations = function() {
  return exports.getLocalState().optimizations;
};

exports.removeOptimization = function(optimizationId) {
  let localState = exports.getLocalState();
  localState.optimizations = localState.optimizations.filter(optimization => {
    return optimization.id !== optimizationId;
  });
  onEdit();
};

exports.addOptimization = function(name, details, inclusions) {
  const id = getNextId();
  if (!inclusions) {
    inclusions = JSON.stringify({
      staging: {
        players: [],
        teams: [],
        games: [],
        overrides: {}
      }
    });
  }

  if (!details) {
    details = JSON.stringify({
      innings: 7,
      iterations: 1000000,
      completedLineups: 0,
      totalLineups: 0,
      histogram: {},
      max: 0,
      min: 0,
      mean: 0
    });
  }

  let new_state = exports.getLocalState();
  let optimization = {
    id: id,
    name: name,
    type: OPTIMIZATION_TYPE_ENUM.MONTE_CARLO_EXAUSTIVE,
    inclusions: inclusions,
    details: details,
    status: OPTIMIZATION_STATUS_ENUM.NOT_STARTED
  };
  new_state.optimizations.push(optimization);
  onEdit();
  return optimization;
};

// GAME

exports.addGame = function(team_id, opposing_team_name) {
  let new_state = exports.getLocalState();
  const id = getNextId();
  const team = exports.getTeam(team_id, new_state);
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
    park: "Stazio",
    scoreUs: 0,
    scoreThem: 0,
    lineupType: lastLineupType ? lastLineupType : LINEUP_TYPE_ENUM.NORMAL,
    plateAppearances: []
  };
  team.games.push(game);
  onEdit();
  return game;
};

exports.replaceGame = function(oldGameId, teamId, newGame) {
  let localState = exports.getLocalState();
  let oldGame = exports.getGame(oldGameId);

  let team = exports.getTeam(teamId);
  let teamIndex = localState.teams.indexOf(team);

  let oldGameIndex = localState.teams[teamIndex].games.indexOf(oldGame);
  localState.teams[teamIndex].games[oldGameIndex] = newGame;
  onEdit();
};

exports.getGame = function(game_id, state) {
  for (let team of (state || LOCAL_DB_STATE).teams) {
    for (let game of team.games) {
      if (game.id === game_id) {
        return game;
      }
    }
  }

  return null;
};

exports.getGamesWithPlayerInLineup = function(playerId) {
  let games = [];
  let localState = exports.getLocalState();
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

exports.getGamesWherePlayerHasPlateAppearances = function(playerId) {
  let games = [];
  let localState = exports.getLocalState();
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

exports.addPlayerToLineup = function(lineup, player_id) {
  lineup.push(player_id);
  onEdit();
};

exports.updateLineup = function(lineup, player_id, position_index) {
  let ind = lineup.indexOf(player_id);
  lineup.splice(ind, 1);
  lineup.splice(position_index, 0, player_id);
  onEdit();
  return lineup;
};

exports.removePlayerFromLineup = function(lineup, player_id) {
  let index = lineup.indexOf(player_id);
  lineup.splice(index, 1);
  onEdit();
};

exports.removeGame = function(game_id, team_id) {
  const new_state = exports.getLocalState();
  const team = exports.getTeam(team_id);
  const index = new_state.teams.indexOf(team);

  team.games = team.games.filter(game => {
    return game.id !== game_id;
  });

  if (index > -1) {
    new_state.teams[index] = team;
  } else {
    console.log("Game not found " + game_id);
  }
  onEdit();
};

// PLATE APPEARANCE

exports.addPlateAppearance = function(player_id, game_id) {
  let game = exports.getGame(game_id);
  let plateAppearances = game.plateAppearances;
  let id = getNextId();
  let plateAppearance = {
    id: id,
    player_id: player_id,
    result: null,
    location: {
      x: null,
      y: null
    }
  };
  plateAppearances.push(plateAppearance);
  onEdit();
  return plateAppearance;
};

exports.replacePlateAppearance = function(paId, gameId, teamId, newPa) {
  let localState = exports.getLocalState();
  let oldPa = exports.getPlateAppearance(paId);

  let team = exports.getTeam(teamId);
  let teamIndex = localState.teams.indexOf(team);

  let game = exports.getGame(gameId);
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
exports.getPlateAppearance = function(pa_id, state) {
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

exports.getPlateAppearancesForGame = function(gameId) {
  let game = exports.getGame(gameId);
  if (!game) {
    return null;
  }
  return game.plateAppearances;
};

exports.getPlateAppearancesForPlayerInGame = function(player_id, game_id) {
  let game = exports.getGame(game_id);
  let player = exports.getPlayer(player_id);
  if (!game || !player) {
    return null;
  }
  return game.plateAppearances.filter(pa => pa.player_id === player_id);
};

exports.getPlateAppearancesForPlayerOnTeam = function(player_id, team_id) {
  let team = exports.getTeam(team_id);
  let plateAppearances = [];

  if (team.games) {
    team.games.forEach(game => {
      if (game.plateAppearances) {
        const plateAppearancesThisGame = game.plateAppearances.filter(
          pa => player_id === pa.player_id
        );
        plateAppearances = plateAppearances.concat(plateAppearancesThisGame);
      }
    });
  }
  return plateAppearances;
};

exports.getPlateAppearancesForPlayer = function(player_id) {
  let localState = exports.getLocalState();
  let teams = localState.teams;
  let plateAppearances = [];

  if (teams) {
    teams.forEach(team => {
      if (team.games) {
        team.games.forEach(game => {
          if (game.plateAppearances) {
            const plateAppearancesThisGame = game.plateAppearances.filter(
              pa => player_id === pa.player_id
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

exports.updatePlateAppearanceResult = function(plateAppearance, result) {
  plateAppearance.result = result;
  onEdit();
};

exports.updatePlateAppearanceLocation = function(plateAppearance, location) {
  plateAppearance.location = {};
  plateAppearance.location.x = Math.floor(location[0]);
  plateAppearance.location.y = Math.floor(location[1]);
  onEdit();
};

exports.removePlateAppearance = function(plateAppearance_id, game_id) {
  exports.getLocalState();
  let game = exports.getGame(game_id);

  game.plateAppearances = game.plateAppearances.filter(pa => {
    return pa.id !== plateAppearance_id;
  });
  onEdit();
};

// LOCAL STORAGE

exports.saveDbStateToLocalStorage = function() {
  if (typeof Storage !== "undefined") {
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

    localStorage.setItem("SCHEMA_VERSION", CURRENT_LS_SCHEMA_VERSION);
    localStorage.setItem("LOCAL_DB_STATE", JSON.stringify(LOCAL_DB_STATE));
    localStorage.setItem(
      "ANCESTOR_DB_STATE",
      JSON.stringify(ANCESTOR_DB_STATE)
    );
  }
};

exports.saveApplicationStateToLocalStorage = function() {
  if (typeof Storage !== "undefined") {
    localStorage.setItem("SCHEMA_VERSION", CURRENT_LS_SCHEMA_VERSION);
    let applicationState = {
      online: online,
      sessionValid: sessionValid,
      activeUser: activeUser
    };
    localStorage.setItem("APPLICATION_STATE", JSON.stringify(applicationState));
  }
};

exports.loadStateFromLocalStorage = function() {
  if (typeof Storage !== "undefined") {
    // These statements define local storage schema migrations
    if (localStorage.getItem("SCHEMA_VERSION") === "5") {
      // Added optimizations
      console.log("Upgrading localstorage from version 5 to version 6");
      let localState = JSON.parse(localStorage.getItem("LOCAL_DB_STATE"));
      localState["optimizations"] = [];
      let ancestorState = JSON.parse(localStorage.getItem("ANCESTOR_DB_STATE"));
      ancestorState["optimizations"] = [];
      localStorage.setItem("SCHEMA_VERSION", "6");
      localStorage.setItem("LOCAL_DB_STATE", JSON.stringify(localState));
      localStorage.setItem("ANCESTOR_DB_STATE", JSON.stringify(ancestorState));
    }

    if (localStorage.getItem("SCHEMA_VERSION") !== CURRENT_LS_SCHEMA_VERSION) {
      console.log(
        `Removing invalid localStorage data ${localStorage.getItem(
          "SCHEMA_VERSION"
        )}`
      );
      exports.clearLocalStorage();
      exports.saveDbStateToLocalStorage();
      exports.saveApplicationStateToLocalStorage();
    }

    let localDbState = localStorage.getItem("LOCAL_DB_STATE");
    if (localDbState) {
      // LOCAL_DB_STATE = JSON.parse(LZString.decompress(localDbState));
      LOCAL_DB_STATE = JSON.parse(localDbState);
    }

    let ancestorDbState = localStorage.getItem("ANCESTOR_DB_STATE");
    if (ancestorDbState) {
      // ANCESTOR_DB_STATE = JSON.parse(LZString.decompress(ancestorDbState));
      ANCESTOR_DB_STATE = JSON.parse(ancestorDbState);
    }

    let applicationState = JSON.parse(
      localStorage.getItem("APPLICATION_STATE")
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
      console.log("Tried to load null, falling back to defaults");
      online = true;
      sessionValid = false;
      activeUser = null;
    }
  }

  reRender();
};

exports.clearLocalStorage = function() {
  console.log("Clearing ls ");
  localStorage.clear();
};

// HELPERS

function onEdit() {
  reRender();
  exports.saveDbStateToLocalStorage();
  exports.scheduleSync();
}

function reRender() {
  expose.set_state("main", {
    render: true
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
  return ("0" + dec.toString(16)).substr(-2);
}

function getNextId() {
  let len = 20;
  var arr = new Uint8Array((len || 40) / 2);
  window.crypto.getRandomValues(arr);
  let hex = Array.from(arr, dec2hex).join("");
  return idUtils.hexToBase62(hex).padStart(14, "0");
}

function getMd5(data) {
  let checksum = hasher(data, {
    algorithm: "md5",
    excludeValues: false,
    respectFunctionProperties: false,
    respectFunctionNames: false,
    respectType: false,
    encoding: "base64"
  });
  return checksum.slice(0, -2); // Remove trailing '=='
}

// NOT SURE IF THIS IS THE RIGHT PLACE FOR THIS. MOVE TO SOME OTHER UTIL?

exports.getQueryObj = function() {
  let queryString = window.location.search || "";
  if (queryString[0] === "?") {
    queryString = queryString.slice(1);
  }
  let params = {},
    queries,
    temp,
    i,
    l;
  queries = queryString.split("&");
  for (i = 0, l = queries.length; i < l; i++) {
    temp = queries[i].split("=");
    params[temp[0]] = temp[1];
  }
  return params;
};

window.state = exports;

// APPLICATION STATE FUNCTIONS

exports.isOnline = function() {
  return online;
};

exports.isSessionValid = function() {
  return sessionValid;
};

exports.getActiveUser = function() {
  return activeUser;
};

exports.setOffline = function() {
  online = false;
  exports.saveApplicationStateToLocalStorage();
};

exports.setActiveUser = function(user) {
  activeUser = user;
  exports.saveApplicationStateToLocalStorage();
};

// This assumes all routes are behind login
exports.setStatusBasedOnHttpResponse = function(code) {
  //console.log(`OLD -- Online: ${online} SessionValid: ${sessionValid}`);
  if (code >= 200 && code < 300) {
    sessionValid = true;
    online = true;
    // Sync might have been failing for network reasons, give it another shot
    if (exports.getSyncState() === SYNC_STATUS_ENUM.ERROR) {
      setSyncState(SYNC_STATUS_ENUM.UNKNOWN);
      exports.scheduleSync();
    }
  } else if (code === 403 || code === 401) {
    sessionValid = false;
    online = true;
  } else if (code === -1) {
    online = false;
  }
  exports.saveApplicationStateToLocalStorage();
  //console.log(`NEW -- Online: ${online} SessionValid: ${sessionValid}`);
};
exports.setAddToHomescreenPrompt = function(e) {
  addToHomescreenEvent = e;
  reRender();
};

exports.getAddToHomescreenPrompt = function() {
  return addToHomescreenEvent;
};

exports.scheduleSync = function(time = SYNC_DELAY_MS) {
  let currentState = exports.getSyncState();
  if (currentState === SYNC_STATUS_ENUM.ERROR) {
    console.log("Sync skipped, in error state");
    return;
  } else if (
    currentState === SYNC_STATUS_ENUM.IN_PROGRESS ||
    currentState === SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING
  ) {
    setSyncState(SYNC_STATUS_ENUM.IN_PROGRESS_AND_PENDING);
  } else {
    setSyncState(SYNC_STATUS_ENUM.PENDING);
  }

  console.log("sync scheduled");
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(function() {
    if (exports.getSyncState() === SYNC_STATUS_ENUM.IN_PROGRESS) {
      console.log("There is already a sync in progress");
      exports.scheduleSync(SYNC_DELAY_MS);
      return;
    }
    exports.sync();
  }, time);
};

let setSyncState = function(newState) {
  syncState = newState;
  reRender();
};

exports.getSyncState = function() {
  return syncState;
};

exports.getSyncStateEnum = function() {
  return SYNC_STATUS_ENUM;
};

exports.setPreventScreenLock = function(value) {
  console.log("setting value", value);
  this.preventScreenLock = value;
  reRender();
};

exports.getPreventScreenLock = function() {
  return this.preventScreenLock;
};
