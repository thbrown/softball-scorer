"use strict";

const expose = require("expose");
const objectMerge = require("../object-merge.js");
const network = require("network.js");
const idUtils = require("../id-utils.js");

const hasher = require("object-hash");

// For versioning localstorage
const CURRENT_LS_SCHEMA_VERSION = "5";

// Database State - Stored in memory, local storage, and persisted in the db
const INITIAL_STATE = { teams: [], players: [] };
let ANCESTOR_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
let LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));

// Application State - State that applies across windows. Stored in local storage and in memory.
let online = true;
let sessionValid = false;
let activeUser = null;

// Window State - State saved in memory only
let addToHomescreenEvent = null;
// TODO: simulation caching would go here

const state = exports;

exports.getServerUrl = function(path) {
  return window.location.href + path;
};

exports.sync = async function(fullSync) {
  console.log("Sync requested", fullSync ? "full" : "patchOnly");

  // TODO: do we want to cancel any in_progress syncs?

  // Save a deep copy of the local state
  let localStateCopy = JSON.parse(JSON.stringify(state.getLocalState()));
  let localState = state.getLocalState();

  // Save the ancestor state so we can restore it if something goes wrong
  let ancestorStateCopy = JSON.parse(JSON.stringify(state.getAncestorState()));

  // Get the patch ready to send to the server
  let ancestorChecksum = state.getAncestorStateChecksum() || "";
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
    console.log("Pre", localStateCopy, localState);
    let localChangesDuringRequest = objectMerge.diff(
      localStateCopy,
      localState
    );
    console.log("localChangesDuringRequest", localChangesDuringRequest);

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
          // Something went wrong and we can't do anything about it!
          // serverState.base should have contained a verbatium copy of what the server has, so this is weird.
          console.log("Yikes");
          console.log(state.getAncestorState(), serverState.base);
          // Set the state back to what it was when we first did a sync
          state.setLocalState(localStateCopy);
          state.setAncestorState(ancestorStateCopy);
          return;
        } else {
          // Something bad happened, repeat the request with type "full" so we'll get the whole state back
          console.log("Something went wrong -- Attempting full sync");
          console.log(state.getAncestorState(), serverState.base);
          console.log(
            objectMerge.diff(state.getAncestorState(), serverState.base)
          );

          let A = getMd5(state.getAncestorState());
          let B = getMd5(serverState.base);
          console.log(A, B);

          // Set the state back to what it was when we first did a sync (we might lose some intermediate changes here, but it't better then syncing bad state)
          state.setLocalState(localStateCopy);
          state.setAncestorState(ancestorStateCopy);
          await exports.sync(true);
          return;
        }
      } else {
        console.log("Sync was successful! (client and server checksums match)");
      }
    }
    // Copy
    let newLocalState = JSON.parse(JSON.stringify(state.getAncestorState()));

    // Apply any changes that were made during the request to the new local state (Presumably this will be a no-op most times)
    objectMerge.patch(newLocalState, localChangesDuringRequest, true);

    // Set local state to a copy of ancestor state (w/ localChangesDuringRequest applied)
    exports.setLocalState(newLocalState);

    // Write the most updated data to local storage
    exports.saveDbStateToLocalStorage();
  }
  return response.status;
};

exports.clearDbState = function() {
  LOCAL_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
  ANCESTOR_DB_STATE = JSON.parse(JSON.stringify(INITIAL_STATE));
  exports.saveDbStateToLocalStorage();
};

exports.clearApplicationState = function() {
  online = true;
  sessionValid = false;
  activeUser = null;
  exports.saveApplicationStateToLocalStorage();
};

exports.getLocalState = function() {
  return LOCAL_DB_STATE;
};

exports.setLocalState = function(newState) {
  LOCAL_DB_STATE = newState;
  reRenderAndWriteDbStateToLs();
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
  reRenderAndWriteDbStateToLs();
  return team;
};

exports.replaceTeam = function(oldTeamId, newTeam) {
  let localState = exports.getLocalState();
  let oldTeam = exports.getTeam(oldTeamId);
  let oldTeamIndex = localState.teams.indexOf(oldTeam);
  localState.teams[oldTeamIndex] = newTeam;
  reRenderAndWriteDbStateToLs();
};

exports.removeTeam = function(team_id) {
  let new_state = exports.getLocalState();
  new_state.teams = new_state.teams.filter(team => {
    return team.id !== team_id;
  });
  reRenderAndWriteDbStateToLs();
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
  reRenderAndWriteDbStateToLs();
};

exports.getAllPlayers = function() {
  return exports.getLocalState().players;
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
    return true;
  } else {
    return false;
  }
};

exports.addPlayer = function(player_name, gender) {
  const id = getNextId();
  let new_state = exports.getLocalState();
  let player = {
    id: id,
    name: player_name,
    gender: gender,
    song_link: null,
    song_start: null
  };
  new_state.players.push(player);
  reRenderAndWriteDbStateToLs();
  return player;
};

// GAME

exports.addGame = function(team_id, opposing_team_name) {
  let new_state = exports.getLocalState();
  const id = getNextId();
  const team = exports.getTeam(team_id, new_state);
  const timestamp = Math.floor(new Date().getTime() / 1000); // Postgres expects time in seconds not ms
  let last_lineup = [];
  if (team.games.length) {
    let last_game = team.games[team.games.length - 1];
    last_lineup = last_game.lineup.slice();
  }
  let game = {
    id: id,
    opponent: opposing_team_name,
    lineup: last_lineup,
    date: timestamp,
    park: "Stazio",
    scoreUs: 0,
    scoreThem: 0,
    lineupType: 2,
    plateAppearances: []
  };
  team.games.push(game);
  reRenderAndWriteDbStateToLs();
  return game;
};

exports.replaceGame = function(oldGameId, teamId, newGame) {
  let localState = exports.getLocalState();
  let oldGame = exports.getGame(oldGameId);

  let team = exports.getTeam(teamId);
  let teamIndex = localState.teams.indexOf(team);

  let oldGameIndex = localState.teams[teamIndex].games.indexOf(oldGame);
  localState.teams[teamIndex].games[oldGameIndex] = newGame;
  reRenderAndWriteDbStateToLs();
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
  reRenderAndWriteDbStateToLs();
};

exports.updateLineup = function(lineup, player_id, position_index) {
  let ind = lineup.indexOf(player_id);
  lineup.splice(ind, 1);
  lineup.splice(position_index, 0, player_id);
  reRenderAndWriteDbStateToLs();
  return lineup;
};

exports.removePlayerFromLineup = function(lineup, player_id) {
  let index = lineup.indexOf(player_id);
  lineup.splice(index, 1);
  reRenderAndWriteDbStateToLs();
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
  reRenderAndWriteDbStateToLs();
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
  reRenderAndWriteDbStateToLs();
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
  reRenderAndWriteDbStateToLs();
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
  reRenderAndWriteDbStateToLs();
};

exports.updatePlateAppearanceLocation = function(plateAppearance, location) {
  plateAppearance.location = {};
  plateAppearance.location.x = Math.floor(location[0]);
  plateAppearance.location.y = Math.floor(location[1]);
  reRenderAndWriteDbStateToLs();
};

exports.removePlateAppearance = function(plateAppearance_id, game_id) {
  exports.getLocalState();
  let game = exports.getGame(game_id);

  game.plateAppearances = game.plateAppearances.filter(pa => {
    return pa.id !== plateAppearance_id;
  });
  reRenderAndWriteDbStateToLs();
};

// LOCAL STORAGE

exports.saveDbStateToLocalStorage = function() {
  if (typeof Storage !== "undefined") {
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
    /*
		if(localStorage.getItem("SCHEMA_VERSION") === "1") {
			// Example
			let version2 = JSON.parse(localStorage.getItem("LOCAL_DB_STATE"));
			version2.doSomeConversion();
			let version2anc = JSON.parse(localStorage.getItem("ANCESTOR_DB_STATE"));
			version2anc.doSomeConversion();
			localStorage.setItem("SCHEMA_VERSION", "2");
		}
		if(localStorage.getItem("SCHEMA_VERSION") === "2") {
			// Example
			let version3 = JSON.parse(localStorage.getItem("LOCAL_DB_STATE"));
			version3.doSomeConversion();
			let version3anc = JSON.parse(localStorage.getItem("ANCESTOR_DB_STATE"));
			version3anc.doSomeConversion();
			localStorage.setItem("SCHEMA_VERSION", "3");
		}
		*/

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
      LOCAL_DB_STATE = JSON.parse(localDbState);
    }

    let ancestorDbState = localStorage.getItem("ANCESTOR_DB_STATE");
    if (ancestorDbState) {
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

function reRenderAndWriteDbStateToLs() {
  reRender();
  exports.saveDbStateToLocalStorage();
}

function reRender() {
  expose.set_state("main", {
    render: true
  });
}

// TODO: don't go through hex, jsut go dec to base62
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

// CANDIDATES FOR REMOVAL

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
};

// This assumes all routes are behind login
exports.setStatusBasedOnHttpResponse = function(code) {
  //console.log(`OLD -- Online: ${online} SessionValid: ${sessionValid}`);
  if (code >= 200 && code < 300) {
    sessionValid = true;
    online = true;
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
};

exports.getAddToHomescreenPrompt = function() {
  return addToHomescreenEvent;
};
