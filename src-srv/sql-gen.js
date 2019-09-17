//const TimSort = require("timsort"); -- Buggy (https://github.com/mziccard/node-timsort/issues/14)
const stable = require('stable');

const HandledError = require('./handled-error.js');
const idUtils = require('../id-utils.js');
const logger = require('./logger.js');

/*
 * This class contains the logic for translating the json structure applicationData on client side to sql statements on the server. It's a hot mess.
 * One unfortunate requirement: All jsonValues must not be 14 chars, or they will be mistaken for ids.
 *
 * This generates a list of sql statments from a json diff. The objects that contain the sql have the following format:
 *  {
 *    query: <some_sql_query>
 *    values: [<substitutions for the query>]
 *    order: { // This determines the order in which the statment will be executed. This is importatnt to prevent foreign key violations.
 *      op: <DELETE or INSERT or UPDATE>,
 *      table: <some table name>,
 *    },
 *    limits: {
 *      <value_index> : <max length of that value, this is checked before the statement is executed, dafaults to 50 chars if not specified>
 *    }
 *    cache: <cache that should be invalidated when statement is executed>,
 */
const jsonValueToSqlTableName = {
  teams: 'teams',
  players: 'players',
  plateAppearances: 'plate_appearances',
  games: 'games',
  lineup: 'players_games',
  optimizations: 'optimization',
};

let jsonValueToSqlColName = {
  // optimization columns
  type: 'type',
  customData: 'custom_data',
  overrideData: 'override_data',
  status: 'status',
  resultData: 'result_data',
  statusMessage: 'statusMessage',
  teamList: 'team_list',
  playerList: 'player_list',
  gameList: 'game_list',
  sendEmail: 'send_email',
  lineupType: 'lineup_type',

  // games columns
  date: 'date',
  opponent: 'opponent',
  park: 'park',
  scoreUs: 'score_us',
  scoreThem: 'score_them',
  //lineupType already present

  // plate_appearances columns
  result: 'result',
  location: 'location',
  x: 'hit_location_x',
  y: 'hit_location_y',

  // players columns
  name: 'name',
  gender: 'gender',
  picture: 'picture',
  song_link: 'song_link',
  song_start: 'song_start',

  // teams columns
  opponent: 'opponent',
  park: 'park',
  publicId: 'public_id',
  publicIdEnabled: 'public_id_enabled',
  // name already present
  // date already present
};

// Keywords are jsonValues that correspond to db table names and the json values that correspond to db column names.
// These show up in the path object and are used to identify which parts of the patch object are not id's. To do so, we reference this list.
const keywords = new Set(
  Object.keys(jsonValueToSqlTableName).concat(
    Object.keys(jsonValueToSqlColName)
  )
);

// Specify what order we should execute sql statements in for inserts/updates (deletes are done in reverse order)
// This is importatnt because it prevents foreign key violations between tables, items at the top have are referenced by lower items
const tableSortOrder = [
  'players',
  'optimization',
  'teams',
  'games',
  'players_games',
  'plate_appearances',
];
let tableOrdering = {}; // map for efficient lookup
for (let i = 0; i < tableSortOrder.length; i++) {
  tableOrdering[tableSortOrder[i]] = i;
}

// Specify what order we should return sql statements that do delete, insert, and update
// This also prevents foreign key violations because we need to do delets in reverse order and inserts/updates in forward order (order per tableSortOrder)
const opSortOrder = ['DELETE', 'INSERT', 'UPDATE'];
let opOrdering = {}; // map for easy lookup
for (let i = 0; i < opSortOrder.length; i++) {
  opOrdering[opSortOrder[i]] = i;
}

const JSON_BLOB_MAX_CHARS = 5000;
const JSON_LIST_MAX_CHARS = 500; // Can hold just under 30 ids (TODO: this is too small for game list [which we haven't implemented yet], and maybe too small for team list [or maybe not? 30 teams is a lot])

let getSqlFromPatch = function(patch, accountId) {
  logger.log(accountId, 'Converting patch to sql');
  let result = [];
  getSqlFromPatchInternal(patch, [], result, accountId);

  // This requires a stable sorting algorithm. Keeping the statments of a single table in their previous order is important!
  stable.inplace(result, function(a, b) {
    // First order by operation
    let aOp = a.order.op;
    let bOp = b.order.op;

    if (aOp && bOp) {
      let opSort = opOrdering[aOp] - opOrdering[bOp];

      if (opSort === 0) {
        // Next order by table
        let aTable = a.order.table;
        let bTable = b.order.table;

        let tableSort = 0;
        if (aOp === 'DELETE') {
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
            'Internal Server Error',
            `Unable to compare these tables: ${aTable} ${bTable}. Please add them to the tableSortOrder constant.,
             ${JSON.stringify(a)},
             ${JSON.stringify(b)}`
          );
        }
      } else if (opSort) {
        return opSort;
      } else {
        throw new HandledError(
          500,
          'Internal Server Error',
          `Unable to compare these tables: ${opOrdering[aOp]} ${opOrdering[bOp]}. Please add them to the opSortOrder constant.`
        );
      }
    } else {
      throw new HandledError(
        500,
        'Internal Server Error',
        `Could not determine order of these statements ${a.query} ${b.query}. Add an order property to the query object.`
      );
    }
  });
  return result;
};

let getSqlFromPatchInternal = function(patch, path, result, accountId) {
  if (accountId === undefined) {
    throw new HandledError(
      500,
      'Internal Server Error',
      'Tried to generate sql while accountId was undefined (no account logged in, or at least no data was stored in the session)'
    );
  }
  let keys = Object.keys(patch);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = patch[key];
    if (isRoot(value)) {
      let applicableTable = getTableNameFromPath(path, value.key);
      let op = value.op;

      if (op === 'Delete') {
        if (applicableTable === 'teams') {
          // Preliminary step: To delete a team, we must delete everythign that references that team first (order is important)
          result.push({
            // We need to do the subquery here because we don't have the game id available in the path
            query:
              'DELETE FROM players_games WHERE game_id IN (SELECT id FROM games WHERE team_id IN ($1) AND account_id IN ($2)) AND account_id IN ($2)',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: 'players_games',
            },
            cache: getCacheFromTable('players_games'),
          });
          result.push({
            query:
              'DELETE FROM plate_appearances WHERE team_id IN ($1) AND account_id IN ($2)',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: 'plate_appearances',
            },
            cache: getCacheFromTable('plate_appearances'),
          });
          result.push({
            query:
              'DELETE FROM games WHERE team_id IN ($1) AND account_id IN ($2)',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: 'games',
            },
            cache: getCacheFromTable('games'),
          });
          // The team itself will be deleted at the end of this method
        }

        if (applicableTable === 'games') {
          // // Perliminary step: To delete a game, we must delete everything that references that game first (order is important)
          result.push({
            query:
              'DELETE FROM players_games WHERE game_id IN ($1) AND account_id IN ($2)',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: 'players_games',
            },
            cache: getCacheFromTable('players_games'),
          });
          result.push({
            query:
              'DELETE FROM plate_appearances WHERE game_id IN ($1) AND account_id IN ($2)',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: 'plate_appearances',
            },
            cache: getCacheFromTable('plate_appearances'),
          });
          // The game itself will be deleted at the end of this method
        }

        if (applicableTable === 'players_games') {
          // The players_games table indicates lineup order, we need to shift other players up the lineup if a player above them is removed from that lineup
          result.push({
            query:
              'UPDATE players_games SET lineup_index = lineup_index - 1 WHERE lineup_index >= (SELECT lineup_index FROM players_games WHERE game_id = $2 AND player_id = $1 AND account_id = $3) AND game_id = $2 AND account_id = $3',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              idUtils.clientIdToServerId(
                getIdFromPath(path, 'games'),
                accountId
              ),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: 'players_games',
            },
            cache: getCacheFromTable('players_games'),
          });
          result.push({
            query:
              'DELETE FROM players_games WHERE player_id IN ($1) AND game_id IN ($2) AND account_id IN ($3)',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              idUtils.clientIdToServerId(
                getIdFromPath(path, 'games'),
                accountId
              ),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: 'players_games',
            },
            cache: getCacheFromTable('players_games'),
          });
        } else {
          // Now
          result.push({
            query:
              'DELETE FROM ' +
              applicableTable + // Sanitized, this value must be on the ahrd coded list of tables in this class
              ' WHERE id IN ($1) AND account_id IN ($2)',
            values: [
              idUtils.clientIdToServerId(value.key, accountId),
              accountId,
            ],
            order: {
              op: 'DELETE',
              table: applicableTable,
            },
            cache: getCacheFromTable(applicableTable),
          });
        }
      } else if (op === 'ArrayAdd') {
        // We need to add the key back to the object
        let insertObject = {};
        insertObject[applicableTable] = JSON.parse(value.param1);

        // Get the parent ids from the path
        let parents = {};
        if (applicableTable === 'games') {
          parents.teamId = path[1];
        } else if (applicableTable === 'plateAppearances') {
          parents.teamId = path[1];
          parents.gameId = path[3];
        } else if (applicableTable === 'lineup') {
          parents.gameId = path[3];
          insertObject.position = value.param2; // lineup is not based on primary key ordering so we need to specify a position
        }
        printInsertStatementsFromPatch(
          insertObject,
          parents,
          result,
          accountId
        );
      } else if (op === 'ReOrder') {
        let oldOrder = JSON.parse(value.param1);
        let newOrder = JSON.parse(value.param2);

        if (applicableTable != 'players_games') {
          // The only thing that should be re-orederable is the lineup, other things are all ordered by creation time (i.e. created_at timestamp and serial_counter columns).
          logger.warn(
            accountId,
            'Something unexpected was reordered!' + applicableTable
          );
          continue; // TODO: add test for players reorder
        }

        /**
         * This is a complicated looking sql statement that simply swaps the indicies of the players in the oldOrder with the indicies of the player's counterpart in the newOrder.
         * We need to do this swap (instead of just assigning the players_games row to be the index of the player's location in the array) because when adding players to a linep and
         * reordering them in the same sync request, the reorder command's parameters will only contain the players that were originally in the lineup (before any additions or subtractions).
         */
        let reOrderQuery = `UPDATE players_games AS pg SET lineup_index = c.lineup_index FROM (values`;
        let values = [
          idUtils.clientIdToServerId(getIdFromPath(path, 'games'), accountId),
          accountId,
        ];
        for (let entry = 0; entry < oldOrder.length; entry++) {
          reOrderQuery += `($1, $${entry * 2 +
            3}, (SELECT lineup_index FROM players_games WHERE player_id = $${entry *
            2 +
            4} AND game_id = $1 AND account_id = $2))`;
          if (entry !== oldOrder.length - 1) {
            reOrderQuery += ',';
          }
          values.push(idUtils.clientIdToServerId(newOrder[entry], accountId));
          values.push(idUtils.clientIdToServerId(oldOrder[entry], accountId));
        }
        reOrderQuery += `) AS c(game_id, player_id, lineup_index) WHERE uuid(c.player_id) = pg.player_id AND uuid(c.game_id) = pg.game_id AND account_id = $2;`;

        result.push({
          query: reOrderQuery,
          values: values,
          order: {
            op: 'UPDATE',
            table: 'players_games',
          },
          cache: getCacheFromTable('players_games'),
        });
      } else if (op === 'Edit') {
        let columnName = getColNameFromJSONValue(value.key);
        if (!columnName) {
          // Read only field was edited - skipping, client will performe a full sync and will get what the server has
        } else if (applicableTable === 'games' && columnName === 'date') {
          // Special case: date field must be converted to a time before updateing
          result.push({
            query:
              'UPDATE games SET date = to_timestamp($1) WHERE id IN ($2) AND account_id IN ($3);',
            values: [
              value.param2,
              idUtils.clientIdToServerId(getIdFromPath(path), accountId),
              accountId,
            ],
            order: {
              op: 'UPDATE',
              table: 'games',
            },
            cache: getCacheFromTable('games'),
          });
        } else {
          let limit = undefined; // defaults to 50 chars

          // customData, snapshtotData, teams, games, players, and results fields on the optimization table contain potentially longer stringified JSON
          if (applicableTable === 'optimization') {
            if (
              columnName === 'custom_data' ||
              columnName === 'override_data' ||
              columnName === 'result_data'
            ) {
              limit = JSON_BLOB_MAX_CHARS;
            } else if (
              columnName === 'team_list' ||
              columnName === 'game_list' ||
              columnName === 'player_list'
            ) {
              limit = JSON_LIST_MAX_CHARS;
            }
          }

          // ApplicableTable and column name are both sanitized. They must be on the list of tables/columns in this class.
          result.push({
            query:
              'UPDATE ' +
              applicableTable +
              ' SET ' +
              columnName +
              ' = $1 WHERE id IN ($2) AND account_id IN ($3);',
            values: [
              value.param2,
              idUtils.clientIdToServerId(getIdFromPath(path), accountId),
              accountId,
            ],
            limits: {
              1: limit,
            },
            order: {
              op: 'UPDATE',
              table: applicableTable,
            },
            cache: getCacheFromTable(applicableTable),
          });
        }
      } else if (op === 'Add') {
        // we can't add things to a table that aren't defined in the schema. That's okay because we shouldn't get these anyways.
        logger.warn(accountId, 'WARNING: skipped add');
      } else {
        throw new HandledError(
          400,
          'The request specified an invalid operation. Try again.',
          'Unrecognized operation: ' +
            op +
            ' ' +
            (patch ? JSON.stringify(patch[key]) : patch)
        );
      }
    } else if (hasProperties(value)) {
      path.push(key);
      getSqlFromPatchInternal(patch[key], path, result, accountId);
      path.pop(key);
    } else {
      logger.warn(accountId, "Warning: don't know what to do with this");
    }
  }
};

let printInsertStatementsFromPatch = function(obj, parents, result, accountId) {
  if (accountId === undefined) {
    throw new HandledError(
      500,
      'Internal Server Error',
      'Tried to generate sql while accountId was undefined (no account logged in, or at least data was not stored in the session)'
    );
  }
  if (obj.players) {
    result.push({
      query:
        'INSERT INTO players (id, name, gender, song_link, song_start, account_id) VALUES($1, $2, $3, $4, $5, $6)',
      values: [
        idUtils.clientIdToServerId(obj.players.id, accountId),
        obj.players.name,
        obj.players.gender,
        obj.players.song_link,
        obj.players.song_start,
        accountId,
      ],
      order: {
        op: 'INSERT',
        table: 'players',
      },
      cache: getCacheFromTable('players'),
    });
  }
  if (obj.optimizations) {
    // Only allow inserting optimization in state 'PAUSED' or 'NOT_STARTED' or 'ERROR' (PAUSING, ALLOCATIING_RESOURCES, and IN_PROGRESS are not allowed.
    // Allowing these would prevent the user from running any more optimizations till they were deleted. They would never be updated by the server.
    let modifiedState = 'PAUSED';
    if (
      obj.optimizations.status === 'NOT_STARTED' ||
      obj.optimizations.status === 'ERROR'
    ) {
      modifiedState = obj.optimizations.status;
    }
    result.push({
      query:
        'INSERT INTO optimization (id, name, type, custom_data, override_data, status, result_data, status_message, send_email, team_list, game_list, player_list, lineup_type, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
      values: [
        idUtils.clientIdToServerId(obj.optimizations.id, accountId),
        obj.optimizations.name,
        obj.optimizations.type,
        obj.optimizations.customData,
        obj.optimizations.overrideData,
        modifiedState,
        obj.optimizations.resultData,
        obj.optimizations.statusMessage,
        obj.optimizations.sendEmail,
        obj.optimizations.teamList,
        obj.optimizations.gameList,
        obj.optimizations.playerList,
        obj.optimizations.lineupType,
        accountId,
      ],
      limits: {
        4: JSON_BLOB_MAX_CHARS,
        5: JSON_BLOB_MAX_CHARS,
        7: JSON_BLOB_MAX_CHARS,
        10: JSON_LIST_MAX_CHARS,
        11: JSON_LIST_MAX_CHARS,
        12: JSON_LIST_MAX_CHARS,
      },
      order: {
        op: 'INSERT',
        table: 'optimization',
      },
      cache: getCacheFromTable('optimization'),
    });
  }
  if (obj.teams) {
    result.push({
      query: 'INSERT INTO teams (id, name, account_id) VALUES($1, $2, $3)',
      values: [
        idUtils.clientIdToServerId(obj.teams.id, accountId),
        obj.teams.name,
        accountId,
      ],
      order: {
        op: 'INSERT',
        table: 'teams',
      },
      cache: getCacheFromTable('teams'),
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
        'INSERT INTO games (id, date, opponent, park, score_us, score_them, team_id, lineup_type, account_id) VALUES($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9)',
      values: [
        idUtils.clientIdToServerId(obj.games.id, accountId),
        obj.games.date,
        obj.games.opponent,
        obj.games.park,
        obj.games.scoreUs,
        obj.games.scoreThem,
        idUtils.clientIdToServerId(parents.teamId, accountId),
        obj.games.lineupType,
        accountId,
      ],
      order: {
        op: 'INSERT',
        table: 'games',
      },
      cache: getCacheFromTable('games'),
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
    result.push({
      query:
        'UPDATE players_games SET lineup_index = lineup_index + 1 WHERE lineup_index >= $1 AND game_id = $2 AND account_id = $3',
      values: [
        obj.position + 1, // lineup oredering starts at 1 not 0
        idUtils.clientIdToServerId(parents.gameId, accountId),
        accountId,
      ],
      order: {
        op: 'INSERT', // Run with the inserts, this and the next statement must be run one after the other
        table: 'players_games',
      },
      cache: getCacheFromTable('players_games'),
    });
    result.push({
      query:
        'INSERT INTO players_games (player_id, game_id, lineup_index, account_id) VALUES($1, $2, $3, $4)',
      values: [
        idUtils.clientIdToServerId(obj.lineup, accountId),
        idUtils.clientIdToServerId(parents.gameId, accountId),
        obj.position + 1, // lineup oredering starts at 1 not 0
        accountId,
      ],
      order: {
        op: 'INSERT',
        table: 'players_games',
      },
      cache: getCacheFromTable('players_games'),
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
        'INSERT INTO plate_appearances (id, result, player_id, game_id, team_id, hit_location_x, hit_location_y, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;',
      values: [
        idUtils.clientIdToServerId(obj.plateAppearances.id, accountId),
        obj.plateAppearances.result,
        idUtils.clientIdToServerId(obj.plateAppearances.player_id, accountId),
        idUtils.clientIdToServerId(parents.gameId, accountId),
        idUtils.clientIdToServerId(parents.teamId, accountId),
        x,
        y,
        accountId,
      ],
      order: {
        op: 'INSERT',
        table: 'plate_appearances',
      },
      cache: getCacheFromTable('plate_appearances'),
    });
  }
};

let printInsertStatementsFromRaw = function(obj, parents, result, accountId) {
  if (!accountId) {
    throw new HandledError(
      500,
      'Internal Server Error',
      'Tried to generate sql while accountId was undefined (no account loged in)'
    );
  }
  if (obj.players) {
    for (let i = 0; i < obj.players.length; i++) {
      result.push({
        query:
          'INSERT INTO players (id, name, gender, song_link, song_start, account_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING id;',
        values: [
          idUtils.clientIdToServerId(obj.players[i].id, accountId),
          obj.players[i].name,
          obj.players[i].gender,
          obj.players[i].song_link,
          obj.players[i].song_start,
          accountId,
        ],
        order: {
          op: 'INSERT',
          table: 'players',
        },
        cache: getCacheFromTable('players'),
      });
    }
  }

  // I'm not sure this will ever get called, optimizations can't be inserted raw (i.e. nested within another object). Same goes for teams I believe.
  if (obj.optimizations) {
    for (let i = 0; i < obj.players.length; i++) {
      result.push({
        query:
          'INSERT INTO optimization (id, name, type, custom_data, override_data, status, result_data, status_message, send_email, team_list, game_list, player_list, lineup_type, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id;',
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
          accountId,
        ],
        limits: {
          4: JSON_BLOB_MAX_CHARS,
          5: JSON_BLOB_MAX_CHARS,
          7: JSON_BLOB_MAX_CHARS,
          10: JSON_LIST_MAX_CHARS,
          11: JSON_LIST_MAX_CHARS,
          12: JSON_LIST_MAX_CHARS,
        },
        order: {
          op: 'INSERT',
          table: 'optimization',
        },
        cache: plate_appearances('optimization'),
      });
    }
  }

  if (obj.teams) {
    for (let i = 0; i < obj.teams.length; i++) {
      result.push({
        query:
          'INSERT INTO teams (id, name, account_id) VALUES($1, $2) RETURNING id;',
        values: [
          idUtils.clientIdToServerId(obj.teams[i].id, accountId),
          obj.teams[i].name,
          accountId,
        ],
        order: {
          op: 'INSERT',
          table: 'teams',
        },
        cache: getCacheFromTable('teams'),
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
          'INSERT INTO games (id, date, opponent, park, score_us, score_them, team_id, lineup_type, account_id) VALUES($1, to_timestamp($2), $3, $4, $5, $6, $7, $8, $9) RETURNING id;',
        values: [
          idUtils.clientIdToServerId(obj.games[i].id, accountId),
          obj.games[i].date,
          obj.games[i].opponent,
          obj.games[i].park,
          obj.games[i].scoreUs,
          obj.games[i].scoreThem,
          idUtils.clientIdToServerId(parents.teamId, accountId),
          obj.games[i].lineupType,
          accountId,
        ],
        order: {
          op: 'INSERT',
          table: 'games',
        },
        cache: getCacheFromTable('games'),
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
          'INSERT INTO players_games (player_id, game_id, lineup_index, account_id) VALUES($1, $2, $3, $4)',
        values: [
          idUtils.clientIdToServerId(obj.lineup[i], accountId),
          idUtils.clientIdToServerId(parents.gameId, accountId),
          i + 1,
          accountId,
        ],
        order: {
          op: 'INSERT',
          table: 'players_games',
        },
        cache: getCacheFromTable('players_games'),
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
          'INSERT INTO plate_appearances (id, result, player_id, game_id, team_id, hit_location_x, hit_location_y, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;',
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
          accountId,
        ],
        order: {
          op: 'INSERT',
          table: 'plate_appearances',
        },
        cache: getCacheFromTable('plate_appearances'),
      });
    }
  }
};

let getColNameFromJSONValue = function(value) {
  let dbColName = jsonValueToSqlColName[value];

  // READ ONLY FIELDS - Including a field here make it so it can not be updated, but it has no
  // effect on whether or not it can be inserted. To prevent insertion do not include that
  // field in the INSERT statements for it's parent object.
  let valueLowerCase = dbColName.toLowerCase();
  if (
    valueLowerCase === 'account_id' || // Don't let sombody assign an object to another account
    valueLowerCase === 'status' || // Don't let people change the status of their optimization (might allow them to run more than one optimization in parrelel)
    valueLowerCase === 'public_id' // Don't let people change their public link
  ) {
    logger.warn(
      `Security Notification. User attempted to modify read-only column: ${value}`
    );
    return undefined;
  }

  return dbColName;
};

// If 'key' is a jsonValue that references a db table, it's corresponding table name is returned. Otherwise, this function selects
// the latest json value in the 'path' array that is a table reference, converts it to table name and returns it;
let getTableNameFromPath = function(path, key) {
  let sqlTableName = jsonValueToSqlTableName[key];
  if (sqlTableName) {
    return sqlTableName;
  }
  for (let i = path.length - 1; i >= 0; i--) {
    sqlTableName = jsonValueToSqlTableName[path[i]];
    if (sqlTableName) {
      return sqlTableName;
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
      if (!keywords.has(path[i])) {
        //logger.log(null, 'Approved id', `'${path[i]}'`);
        return path[i];
      } else {
        //logger.log(null, 'Rejected id', `'${path[i]}'`);
      }
    }
  }
};

// Returns true if the obj has any properties assigned
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
    if (obj[key] !== null && typeof obj[key] === 'object') {
      return false;
    }
  }
  return true;
};

// TODO: Would object lookup be faster?
let getCacheFromTable = function(table) {
  if (table === 'optimization') {
    return 'optimizations';
  } else if (table === 'players') {
    return 'players';
  } else {
    return 'teams';
  }
};

module.exports = {
  getSqlFromPatch: getSqlFromPatch,
};
