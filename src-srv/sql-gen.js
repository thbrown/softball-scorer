const TimSort = require("timsort");

const HandledError = require("./handled-error.js");
const idUtils = require("../id-utils.js");
const logger = require("./logger.js");

/*
 *  This class contains the logic for translating the json structure applicationData on client side to sql statements on the server. It's a hot mess.
 */

// Map json names to db table names.
const tableReferences = [
  "teams",
  "players",
  "plateAppearances",
  "games",
  "lineup",
  "optimizations"
];
const tableNames = [
  "teams",
  "players",
  "plate_appearances",
  "games",
  "players_games",
  "optimization"
];

// Specify what order we should execute sql statements in for inserts/updates (deletes are done in reverse order)
const tableSortOrder = [
  "players",
  "optimization",
  "teams",
  "games",
  "players_games",
  "plate_appearances"
];
let tableOrdering = {}; // map for efficient lookup
for (let i = 0; i < tableSortOrder.length; i++) {
  tableOrdering[tableSortOrder[i]] = i;
}

const JSON_BLOB_MAX_CHARS = 5000;
const JSON_LIST_MAX_CHARS = 500; // Can hold just under 30 ids (TODO: this is too small for game list, and maybe too small for team list)

// These words show up in the patch object. We need to identify which parts of the patch object are not id's, to do so we reference this list.
// Do all these need to not be 14 chars?
const keywords = tableReferences
  .concat([
    "type",
    "customData",
    "overrideData",
    "status",
    "resultData",
    "statusMessage",
    "teamList",
    "playerList",
    "gameList",
    "sendEmail",
    "lineupType"
  ]) // optimization columns
  .concat([
    "date",
    "opponent",
    "park",
    "scoreUs",
    "scoreThem" /* lineupType already present */
  ]) // game columns
  .concat(["result", "location", "x", "y"]) // plate_appearance columns
  .concat(["name", "gender", "picture", "song_link", "song_start"]) // player columns
  .concat(["date", "opponent", "park"]) // team columns
  .concat([
    /* name already present */
  ]); // teams columns

let getSqlFromPatch = function(patch, accountId) {
  logger.log(accountId, "PATCH", JSON.stringify(patch, null, 2));
  let result = [];
  getSqlFromPatchInternal(patch, [], result, accountId);

  // Order sql statements by the table it affects to prevent foreign key violations
  const STATEMENT_TYPE_REGEX = /DELETE|UPDATE|INSERT/;
  const STATEMENT_TABLE_REGEX = /teams|games|players_games|plate_appearances|players|optimization/;

  // This requires a stable sorting algorithm. Keeping the statments of a single table in their previous order is important!
  // TODO: Yikes hitting this lib issue sometimes (https://github.com/mziccard/node-timsort/issues/14) may need to switch implementations
  TimSort.sort(result, function(a, b) {
    // TODO: it would be more efficient to save these results instead of running the regexes each time
    let aOp = a.query.match(STATEMENT_TYPE_REGEX)[0];
    let bOp = b.query.match(STATEMENT_TYPE_REGEX)[0];

    // Order the sql statements by the table they affect
    let aTable = a.query.match(STATEMENT_TABLE_REGEX)[0];
    let bTable = b.query.match(STATEMENT_TABLE_REGEX)[0];
    if (aOp && bOp) {
      let tableSort = 0;
      if (aOp === "DELETE") {
        // DELETEs need to be in reverse order
        tableSort = tableOrdering[bTable] - tableOrdering[aTable];
      } else {
        // INSERTs and UPDATEs need to be in forward order
        tableSort = tableOrdering[aTable] - tableOrdering[bTable];
      }
      if (tableSort || tableSort === 0) {
        return tableSort;
      } else {
        throw new HandledError(
          500,
          "Internal Server Error",
          `Unable to compare these tables: ${aTable} ${bTable}. Please add them to the tableSortOrder constant.`
        );
      }
    } else {
      throw new HandledError(
        500,
        "Internal Server Error",
        `Could not detemine op of these statements ${a.query} ${b.query}`
      );
    }
  });
  return result;
};

let getSqlFromPatchInternal = function(patch, path, result, accountId) {
  if (accountId === undefined) {
    throw new HandledError(
      500,
      "Internal Server Error",
      "Tried to generate sql while accountId was undefined (no account logged in, or at least no data was stored in the session)"
    );
  }
  let keys = Object.keys(patch);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = patch[key];
    if (isRoot(value)) {
      let applicableTableReference = getTableReferenceFromPath(path, value.key);
      let applicableTable = getTableFromReference(applicableTableReference);
      let op = value.op;

      if (op === "Delete") {
        // We have to delete references first
        if (applicableTable === "teams") {
          result.push({
            // We need to do the subquery here because we don't have the game id available in the path
            query:
              "DELETE FROM players_games WHERE game_id IN (SELECT id FROM games WHERE team_id IN ($1) AND account_id IN ($2)) AND account_id IN ($2)",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId
            ]
          });
          result.push({
            query:
              "DELETE FROM plate_appearances WHERE team_id IN ($1) AND account_id IN ($2)",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId
            ]
          });
          result.push({
            query:
              "DELETE FROM games WHERE team_id IN ($1) AND account_id IN ($2)",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId
            ]
          });
        }

        if (applicableTable === "games") {
          result.push({
            query:
              "DELETE FROM players_games WHERE game_id IN ($1) AND account_id IN ($2)",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId
            ]
          });
          result.push({
            query:
              "DELETE FROM plate_appearances WHERE game_id IN ($1) AND account_id IN ($2)",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId
            ]
          });
        }

        if (applicableTable === "players_games") {
          result.push({
            query:
              "UPDATE players_games SET lineup_index = lineup_index - 1 WHERE lineup_index >= (SELECT lineup_index FROM players_games WHERE game_id = $2 AND player_id = $1 AND account_id = $3) AND game_id = $2 AND account_id = $3",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              idUtils.clientIdToServerId(
                getIdFromPath(path, "games"),
                accountId
              ),
              accountId
            ]
          });
          result.push({
            query:
              "DELETE FROM players_games WHERE player_id IN ($1) AND game_id IN ($2) AND account_id IN ($3)",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              idUtils.clientIdToServerId(
                getIdFromPath(path, "games"),
                accountId
              ),
              accountId
            ]
          });
        } else {
          result.push({
            query:
              "DELETE FROM " +
              applicableTable +
              " WHERE id IN ($1) AND account_id IN ($2)",
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId
            ]
          });
        }
      } else if (op === "ArrayAdd") {
        // We need to add the key back to the object
        let insertObject = {};
        insertObject[applicableTableReference] = JSON.parse(value.param1);

        // Get the parent ids from the path
        let parents = {};
        if (applicableTableReference == "games") {
          parents.teamId = path[1];
        } else if (applicableTableReference == "plateAppearances") {
          parents.teamId = path[1];
          parents.gameId = path[3];
        } else if (applicableTableReference == "lineup") {
          parents.gameId = path[3];
          insertObject.position = value.param2; // lineup is not based on primary key ordering so we need to specify a position
        }
        printInsertStatementsFromPatch(
          insertObject,
          parents,
          result,
          accountId
        );
      } else if (op === "ReOrder") {
        let oldOrder = JSON.parse(value.param1);
        let newOrder = JSON.parse(value.param2);

        if (applicableTable != "players_games") {
          throw "Something unexpected was reordered!" + applicableTable; // The only thing that should be re-orederable is the lineup, other things are all ordered by creation time (i.e. created_at timestamp and serial_counter columns).
        }

        /**
         * This is a complicated looking sql statement that simply swaps the indicies of the players in the oldOrder with the indicies of the player's counterpart in the newOrder.
         * We need to do this swap (instead of just assigning the players_games row to be the index of the player's location in the array) because when adding players to a linep and
         * reordering them in the same sync request, the reorder command's parameters will only contain the players that were originally in the lineup (before any additions or subtractions).
         */
        let reOrderQuery = `UPDATE players_games AS pg SET lineup_index = c.lineup_index FROM (values`;
        let values = [
          idUtils.clientIdToServerId(getIdFromPath(path, "games"), accountId),
          accountId
        ];
        for (let entry = 0; entry < oldOrder.length; entry++) {
          reOrderQuery += `($1, $${entry * 2 +
            3}, (SELECT lineup_index FROM players_games WHERE player_id = $${entry *
            2 +
            4} AND game_id = $1 AND account_id = $2))`;
          if (entry !== oldOrder.length - 1) {
            reOrderQuery += ",";
          }
          values.push(idUtils.clientIdToServerId(newOrder[entry], accountId));
          values.push(idUtils.clientIdToServerId(oldOrder[entry], accountId));
        }
        reOrderQuery += `) AS c(game_id, player_id, lineup_index) WHERE uuid(c.player_id) = pg.player_id AND uuid(c.game_id) = pg.game_id AND account_id = $2;`;

        result.push({
          query: reOrderQuery,
          values: values
        });
      } else if (op === "Edit") {
        if (
          applicableTable === "games" &&
          getColNameFromJSONValue(value.key) === "date"
        ) {
          result.push({
            query:
              "UPDATE games SET date = to_timestamp($1) WHERE id IN ($2) AND account_id IN ($3);",
            values: [
              value.param2,
              idUtils.clientIdToServerId(getIdFromPath(path), accountId),
              accountId
            ]
          });
        } else {
          let columnName = getColNameFromJSONValue(value.key);
          let limit = undefined; // defaults to 50 chars

          // customData, snapshtotData, teams, games, players, and results fields on the optimization table contain potentially longer stringified JSON
          if (applicableTable === "optimization") {
            if (
              columnName === "custom_data" ||
              columnName === "override_data" ||
              columnName === "result_data"
            ) {
              limit = JSON_BLOB_MAX_CHARS;
            } else if (
              columnName === "team_list" ||
              columnName === "game_list" ||
              columnName === "player_list"
            ) {
              limit = JSON_LIST_MAX_CHARS;
            }
          }

          // TODO: This can update any field on the applicable table, limit this to exposed fields only. Make getColNameFromJSONValue only return editable fields.
          result.push({
            query:
              "UPDATE " +
              applicableTable +
              " SET " +
              columnName +
              " = $1 WHERE id IN ($2) AND account_id IN ($3);",
            values: [
              value.param2,
              idUtils.clientIdToServerId(getIdFromPath(path), accountId),
              accountId
            ],
            limits: {
              1: limit
            }
          });
        }
      } else if (op === "Add") {
        // we can't add things to a table that aren't defined in the schema. That's okay because we shouldn't get these anyways.
        logger.log(accountId, "WARNING: skipped add");
      } else {
        throw new HandledError(
          400,
          "The request specified an invalid operation. Try again.",
          "Unrecognized operation: " +
            op +
            " " +
            (patch ? JSON.stringify(patch[key]) : patch)
        );
      }
    } else if (hasProperties(value)) {
      path.push(key);
      getSqlFromPatchInternal(patch[key], path, result, accountId);
      path.pop(key);
    } else {
      logger.log(accountId, "Warning: don't know what to do with this");
    }
  }
};

let printInsertStatementsFromPatch = function(obj, parents, result, accountId) {
  if (accountId === undefined) {
    throw new HandledError(
      500,
      "Internal Server Error",
      "Tried to generate sql while accountId was undefined (no account logged in, or at least data was not stored in the session)"
    );
  }
  if (obj.players) {
    result.push({
      query:
        "INSERT INTO players (id, name, gender, song_link, song_start, account_id) VALUES($1, $2, $3, $4, $5, $6)",
      values: [
        idUtils.clientIdToServerId(obj.players.id, accountId),
        obj.players.name,
        obj.players.gender,
        obj.players.song_link,
        obj.players.song_start,
        accountId
      ]
    });
  }
  if (obj.optimizations) {
    result.push({
      query:
        "INSERT INTO optimization (id, name, type, custom_data, override_data, status, result_data, status_message, send_email, team_list, game_list, player_list, lineup_type, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
      values: [
        idUtils.clientIdToServerId(obj.optimizations.id, accountId),
        obj.optimizations.name,
        obj.optimizations.type,
        obj.optimizations.customData,
        obj.optimizations.overrideData,
        obj.optimizations.status,
        obj.optimizations.resultData,
        obj.optimizations.statusMessage,
        obj.optimizations.sendEmail,
        obj.optimizations.teamList,
        obj.optimizations.gameList,
        obj.optimizations.playerList,
        obj.optimizations.lineupType,
        accountId
      ],
      limits: {
        4: JSON_BLOB_MAX_CHARS,
        5: JSON_BLOB_MAX_CHARS,
        7: JSON_BLOB_MAX_CHARS,
        10: JSON_LIST_MAX_CHARS,
        11: JSON_LIST_MAX_CHARS,
        12: JSON_LIST_MAX_CHARS
      }
    });
  }
  if (obj.teams) {
    result.push({
      query: "INSERT INTO teams (id, name, account_id) VALUES($1, $2, $3)",
      values: [
        idUtils.clientIdToServerId(obj.teams.id, accountId),
        obj.teams.name,
        accountId
      ]
    });
    if (obj.teams.games) {
      let insertObject = {};
      insertObject.games = obj.teams.games;

      parents.teamId = obj.teams.id;

      printInsertStatementsFromRaw(insertObject, parents, result, accountId);
      parents.teamId = undefined;
    }
  }

  if (obj.games) {
    result.push({
      query:
        "INSERT INTO games (id, date, opponent, park, score_us, score_them, team_id, lineup_type, account_id) VALUES($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9)",
      values: [
        idUtils.clientIdToServerId(obj.games.id, accountId),
        obj.games.date,
        obj.games.opponent,
        obj.games.park,
        obj.games.scoreUs,
        obj.games.scoreThem,
        idUtils.clientIdToServerId(parents.teamId, accountId),
        obj.games.lineupType,
        accountId
      ]
    });
    if (obj.games.plateAppearances) {
      let insertObject = {};
      insertObject.plateAppearances = obj.games.plateAppearances;

      parents.gameId = obj.games.id;
      printInsertStatementsFromRaw(insertObject, parents, result, accountId);
      parents.gameId = undefined;
    }
    if (obj.games.lineup) {
      let insertObject = {};
      insertObject.lineup = obj.games.lineup;

      parents.gameId = obj.games.id;
      printInsertStatementsFromRaw(insertObject, parents, result, accountId);
      parents.gameId = undefined;
    }
  }

  if (obj.lineup) {
    // Order of these statments is enforced by opSortOrder (update before insert)
    result.push({
      query:
        "UPDATE players_games SET lineup_index = lineup_index + 1 WHERE lineup_index >= $1 AND game_id = $2 AND account_id = $3",
      values: [
        obj.position + 1, // lineup oredering starts at 1 not 0
        idUtils.clientIdToServerId(parents.gameId, accountId),
        accountId
      ]
    });
    result.push({
      query:
        "INSERT INTO players_games (player_id, game_id, lineup_index, account_id) VALUES($1, $2, $3, $4)",
      values: [
        idUtils.clientIdToServerId(obj.lineup, accountId),
        idUtils.clientIdToServerId(parents.gameId, accountId),
        obj.position + 1, // lineup oredering starts at 1 not 0
        accountId
      ]
    });
  }

  if (obj.plateAppearances) {
    let x;
    let y;
    if (obj.plateAppearances.location) {
      x = obj.plateAppearances.location.x;
      y = obj.plateAppearances.location.y;
    }
    result.push({
      query:
        "INSERT INTO plate_appearances (id, result, player_id, game_id, team_id, hit_location_x, hit_location_y, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;",
      values: [
        idUtils.clientIdToServerId(obj.plateAppearances.id, accountId),
        obj.plateAppearances.result,
        idUtils.clientIdToServerId(obj.plateAppearances.player_id, accountId),
        idUtils.clientIdToServerId(parents.gameId, accountId),
        idUtils.clientIdToServerId(parents.teamId, accountId),
        x,
        y,
        accountId
      ]
    });
  }
};

let printInsertStatementsFromRaw = function(obj, parents, result, accountId) {
  if (!accountId) {
    throw new HandledError(
      500,
      "Internal Server Error",
      "Tried to generate sql while accountId was undefined (no account loged in)"
    );
  }
  if (obj.players) {
    for (let i = 0; i < obj.players.length; i++) {
      result.push({
        query:
          "INSERT INTO players (id, name, gender, song_link, song_start, account_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING id;",
        values: [
          idUtils.clientIdToServerId(obj.players[i].id, accountId),
          obj.players[i].name,
          obj.players[i].gender,
          obj.players[i].song_link,
          obj.players[i].song_start,
          accountId
        ]
      });
    }
  }

  // I'm not sure this will ever get called, optimizations can't be inserted raw (i.e. nested within another object). Same goes for teams I believe.
  if (obj.optimizations) {
    for (let i = 0; i < obj.players.length; i++) {
      result.push({
        query:
          "INSERT INTO optimization (id, name, type, custom_data, override_data, status, result_data, status_message, send_email, team_list, game_list, player_list, lineup_type, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id;",
        values: [
          idUtils.clientIdToServerId(obj.optimizations[i].id, accountId),
          obj.optimizations[i].name,
          obj.optimizations[i].type,
          obj.optimizations[i].customData,
          obj.optimizations[i].overrideData,
          obj.optimizations[i].status,
          obj.optimizations[i].resultData,
          obj.optimizations[i].statusMessage,
          obj.optimizations[i].sendEmail,
          obj.optimizations[i].teamList,
          obj.optimizations[i].gameList,
          obj.optimizations[i].playerList,
          obj.optimizations[i].lineupType,
          accountId
        ],
        limits: {
          4: JSON_BLOB_MAX_CHARS,
          5: JSON_BLOB_MAX_CHARS,
          7: JSON_BLOB_MAX_CHARS,
          10: JSON_LIST_MAX_CHARS,
          11: JSON_LIST_MAX_CHARS,
          12: JSON_LIST_MAX_CHARS
        }
      });
    }
  }

  if (obj.teams) {
    for (let i = 0; i < obj.teams.length; i++) {
      result.push({
        query:
          "INSERT INTO teams (id, name, account_id) VALUES($1, $2) RETURNING id;",
        values: [
          idUtils.clientIdToServerId(obj.teams[i].id, accountId),
          obj.teams[i].name,
          accountId
        ]
      });
      if (obj.teams[i].games) {
        let insertObject = {};
        insertObject.games = obj.teams[i].games;

        parents.teamId = obj.teams[i].id;
        printInsertStatementsFromRaw(insertObject, parents, result, accountId);
        parents.teamId = undefined;
      }
    }
  }

  if (obj.games && obj.games.length > 0) {
    for (let i = 0; i < obj.games.length; i++) {
      result.push({
        query:
          "INSERT INTO games (id, date, opponent, park, score_us, score_them, team_id, lineup_type, account_id) VALUES($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9) RETURNING id;",
        values: [
          idUtils.clientIdToServerId(obj.games[i].id, accountId),
          obj.games[i].date,
          obj.games[i].opponent,
          obj.games[i].park,
          obj.games[i].scoreUs,
          obj.games[i].scoreThem,
          idUtils.clientIdToServerId(parents.teamId, accountId),
          obj.games[i].lineupType,
          accountId
        ]
      });
      if (obj.games[i].plateAppearances) {
        let insertObject = {};
        insertObject.plateAppearances = obj.games[i].plateAppearances;

        parents.gameId = obj.games[i].id;
        printInsertStatementsFromRaw(insertObject, parents, result, accountId);
        parents.gameId = undefined;
      }
      if (obj.games[i].lineup) {
        let insertObject = {};
        insertObject.lineup = obj.games[i].lineup;

        parents.gameId = obj.games[i].id;
        printInsertStatementsFromRaw(insertObject, parents, result, accountId);
        parents.gameId = undefined;
      }
    }
  }

  if (obj.lineup && obj.lineup.length > 0) {
    for (let i = 0; i < obj.lineup.length; i++) {
      result.push({
        query:
          "INSERT INTO players_games (player_id, game_id, lineup_index, account_id) VALUES($1, $2, $3, $4)",
        values: [
          idUtils.clientIdToServerId(obj.lineup[i], accountId),
          idUtils.clientIdToServerId(parents.gameId, accountId),
          i + 1,
          accountId
        ]
      });
    }
  }

  if (obj.plateAppearances && obj.plateAppearances.length > 0) {
    for (let i = 0; i < obj.plateAppearances.length; i++) {
      let x;
      let y;
      if (obj.plateAppearances[i].location) {
        x = obj.plateAppearances[i].location.x;
        y = obj.plateAppearances[i].location.y;
      }
      result.push({
        query:
          "INSERT INTO plate_appearances (id, result, player_id, game_id, team_id, hit_location_x, hit_location_y, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;",
        values: [
          idUtils.clientIdToServerId(obj.plateAppearances[i].id, accountId),
          obj.plateAppearances[i].result,
          idUtils.clientIdToServerId(
            obj.plateAppearances[i].player_id,
            accountId
          ),
          idUtils.clientIdToServerId(parents.gameId, accountId),
          idUtils.clientIdToServerId(parents.teamId, accountId),
          x,
          y,
          accountId
        ]
      });
    }
  }
};

let getColNameFromJSONValue = function(value) {
  let map = {
    x: "hit_location_x",
    y: "hit_location_y",
    lineupType: "lineup_type",
    scoreUs: "score_us",
    scoreThem: "score_them",
    customData: "custom_data",
    resultData: "result_data",
    overrideData: "override_data",
    playerList: "player_list",
    teamList: "team_list",
    gameList: "game_list",
    sendEmail: "send_email"
  };
  if (map[value]) {
    return map[value];
  } else {
    if (value === "account_id") {
      // TODO: are there casing workarounds here?
      throw new HandledError(
        500,
        "Internal Server Error",
        `Security Issue. User attempted to modify row ownership.`
      );
    }
    return value;
  }
};

let getTableFromReference = function(reference) {
  return tableNames[tableReferences.indexOf(reference)];
};

// If 'key' is a table reference, it is returned. Otherwise, this function returns the latest value in the 'path' array that is a table reference.
let getTableReferenceFromPath = function(path, key) {
  // Map JSON names to db table names
  if (tableReferences.indexOf(key) >= 0) {
    return tableReferences[tableReferences.indexOf(key)];
  }
  for (let i = path.length - 1; i >= 0; i--) {
    if (tableReferences.indexOf(path[i]) >= 0) {
      return tableReferences[tableReferences.indexOf(path[i])];
    }
  }
  return null;
};

// Returns the id of type from the path. If no type is specified, returns latest id.
let getIdFromPath = function(path, type) {
  if (type) {
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i] === type) {
        return path[i + 1];
      }
    }
  } else {
    for (let i = path.length - 1; i >= 0; i--) {
      // TODO: sorting the keywords and binary searching through them would be better here
      if (!keywords.includes(path[i])) {
        logger.log(null, "Approved", `'${path[i]}'`);
        return path[i];
      } else {
        logger.log(null, "Rejected", `'${path[i]}'`);
      }
    }
  }
};

// returns true if the obj has any properties assigned
let hasProperties = function(obj) {
  if (Object.keys(obj).length > 0) {
    return true;
  } else {
    return false;
  }
};

// Returns true if none of the object's properties are objects themselves.
let isRoot = function(obj) {
  let keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (obj[key] !== null && typeof obj[key] === "object") {
      return false;
    }
  }
  return true;
};

module.exports = {
  getSqlFromPatch: getSqlFromPatch
};
