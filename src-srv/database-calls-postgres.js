const { Pool } = require('pg');

const HandledError = require('./handled-error.js');
const logger = require('./logger.js');
const sqlGen = require('./sql-gen.js');
const SharedLib = require('../shared-lib').default;

/**
 * This implementation uses postgres db as the persistance layer. Connection info and credentials can be supplied in the server side config.
 *
 * During reads, results are ordered first by their created_at timestamps then by a separate counter variable (since records inserted quickly may have duplicated timestamps).
 * If the counter fields ever overflows, it's not a big deal (unless somebody is inserting 2 billion + records in the same timestamp).
 */
module.exports = class DatabaseCalls {
  constructor(url, port, user, password, database, cacheService, cb) {
    logger.log('sys', 'Connecting to pg', url);
    this.cacheService = cacheService;
    this.pool = new Pool({
      user: user,
      host: url,
      database: database || 'Softball',
      password: password,
      port: port,
    });

    // We don't ever anticipate storing numeric values larger than the javascript maximum safe integer size
    // (9,007,199,254,740,991) so we'll instruct pg to return all bigints from the database as javascript numbers.
    // See https://github.com/brianc/node-pg-types
    var types = require('pg').types;
    types.setTypeParser(20, function (val) {
      return parseInt(val);
    });

    throw new Error();

    // Verify connection
    this.pool.connect(function (err) {
      if (err) {
        logger.error(
          'sys',
          'There was a problem getting the db connection:',
          err
        );
        if (cb) {
          cb(err);
        }
      } else {
        logger.log('sys', 'Postgres Connected');
        if (cb) {
          cb(null);
        }
      }
    });

    this.pool.on('error', (error) => {
      logger.error(null, `Postgres error: ${error}`);
    });

    this.processAccount = function (account) {
      if (account.length === 1) {
        let outputAccount = {};
        outputAccount.optimizers = JSON.stringify(account[0].optimizers_list);
        outputAccount.balance = account.balance;
        return outputAccount;
      } else {
        logger.error('sys', account);
        throw new Error('An incorrect number of accounts were returned');
      }
    };

    this.processPlayers = function (players) {
      for (let i = 0; i < players.length; i++) {
        players[i].id = SharedLib.idUtils.serverIdToClientId(players[i].id);
        players[i].song_link = players[i].song_link
          ? players[i].song_link
          : null;
        players[i].song_start = players[i].song_start
          ? players[i].song_start
          : null;
      }
      return players;
    };

    this.processOptimizations = function (optimizations) {
      let outputOptimizations = [];
      for (let i = 0; i < optimizations.length; i++) {
        outputOptimizations.push({});
        outputOptimizations[i].id = SharedLib.idUtils.serverIdToClientId(
          optimizations[i].id
        );

        outputOptimizations[i].name = optimizations[i].name;
        outputOptimizations[i].customOptionsData = optimizations[i]
          .custom_options_data
          ? JSON.stringify(optimizations[i].custom_options_data)
          : '{}';
        outputOptimizations[i].overrideData = optimizations[i].override_data
          ? JSON.stringify(optimizations[i].override_data)
          : '{}';
        outputOptimizations[i].status = optimizations[i].status;
        outputOptimizations[i].resultData = optimizations[i].result_data
          ? JSON.stringify(optimizations[i].result_data)
          : '{}';
        outputOptimizations[i].statusMessage = optimizations[i].status_message;
        outputOptimizations[i].sendEmail = optimizations[i].send_email;
        outputOptimizations[i].teamList = optimizations[i].team_list
          ? JSON.stringify(optimizations[i].team_list)
          : '[]';
        outputOptimizations[i].gameList = optimizations[i].game_list
          ? JSON.stringify(optimizations[i].game_list)
          : '[]';
        outputOptimizations[i].playerList = optimizations[i].player_list
          ? JSON.stringify(optimizations[i].player_list)
          : '[]';
        outputOptimizations[i].lineupType = optimizations[i].lineup_type;
        outputOptimizations[i].optimizerType = optimizations[i].optimizer_type;
        outputOptimizations[i].inputSummaryData = optimizations[i]
          .input_summary_data
          ? JSON.stringify(optimizations[i].input_summary_data)
          : '{}';
      }
      return outputOptimizations;
    };

    this.processTeams = function (plateAppearances) {
      let outputTeams = [];
      let parentIdLookupTable = { teamIndexCounter: 0 }; // Contains heterogeneous keys

      for (let i = 0; i < plateAppearances.length; i++) {
        let plateAppearance = plateAppearances[i];

        if (
          plateAppearance.team_id &&
          parentIdLookupTable[plateAppearance.team_id] === undefined
        ) {
          const newTeam = {};
          newTeam.games = [];
          newTeam.id = SharedLib.idUtils.serverIdToClientId(
            plateAppearance.team_id
          );
          newTeam.name = plateAppearance.team_name;
          newTeam.publicId = SharedLib.idUtils.hexToBase62(
            plateAppearance.public_id
          );
          newTeam.publicIdEnabled = plateAppearance.public_id_enabled;
          outputTeams.push(newTeam);
          parentIdLookupTable[plateAppearance.team_id] = {};
          parentIdLookupTable[plateAppearance.team_id].outputTeamsIndex =
            parentIdLookupTable.teamIndexCounter;
          parentIdLookupTable.teamIndexCounter++;
          parentIdLookupTable[
            plateAppearance.team_id
          ].outputGamesIndexCounter = 0;
        }

        if (
          plateAppearance.game_id &&
          parentIdLookupTable[plateAppearance.team_id][
            plateAppearance.game_id
          ] === undefined
        ) {
          var newGame = {};
          newGame.plateAppearances = [];
          newGame.id = SharedLib.idUtils.serverIdToClientId(
            plateAppearance.game_id
          );
          newGame.opponent = plateAppearance.game_opponent;
          newGame.date = plateAppearance.game_date;
          newGame.park = plateAppearance.game_park;
          newGame.lineupType = plateAppearance.lineup_type;
          newGame.scoreUs = plateAppearance.score_us;
          newGame.scoreThem = plateAppearance.score_them;
          if (plateAppearance.lineup) {
            newGame.lineup = plateAppearance.lineup
              .split(',')
              .map((v) => SharedLib.idUtils.serverIdToClientId(v.trim()));
          } else {
            newGame.lineup = [];
          }

          let team =
            outputTeams[
              parentIdLookupTable[plateAppearance.team_id].outputTeamsIndex
            ];
          team.games.push(newGame);

          parentIdLookupTable[plateAppearance.team_id][
            plateAppearance.game_id
          ] = {};
          parentIdLookupTable[plateAppearance.team_id][
            plateAppearance.game_id
          ].outputGamesIndex =
            parentIdLookupTable[
              plateAppearance.team_id
            ].outputGamesIndexCounter;

          parentIdLookupTable[plateAppearance.team_id]
            .outputGamesIndexCounter++;
        }

        if (plateAppearance.plate_appearance_id) {
          var newPlateAppearance = {};
          newPlateAppearance.id = SharedLib.idUtils.serverIdToClientId(
            plateAppearance.plate_appearance_id
          );
          newPlateAppearance.player_id = SharedLib.idUtils.serverIdToClientId(
            plateAppearance.player_id
          );
          newPlateAppearance.result = plateAppearance.result;
          newPlateAppearance.location = {
            x: plateAppearance.x,
            y: plateAppearance.y,
          };
          let team =
            outputTeams[
              parentIdLookupTable[plateAppearance.team_id].outputTeamsIndex
            ];

          let game =
            team.games[
              parentIdLookupTable[plateAppearance.team_id][
                plateAppearance.game_id
              ].outputGamesIndex
            ];
          game.plateAppearances.push(newPlateAppearance);
        }
      }
      return outputTeams;
    };
  }

  disconnect() {
    logger.log(null, 'disconnecting from postgres');
    return new Promise(
      function (resolve, reject) {
        this.pool
          .end()
          .then(() => resolve())
          .catch((err) => reject(err));
      }.bind(this)
    );
  }

  queryPromise(queryString) {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.pool.connect(function (err, client, done) {
        if (err) {
          logger.error(null, 'There was a problem getting db connection:');
          logger.error(err);
          reject(err);
        }

        client.query(queryString, function (err, result) {
          done();
          if (err) {
            logger.error(null, err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    });
  }

  parameterizedQueryPromise(queryString, values) {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.pool.connect(function (err, client, done) {
        if (err) {
          logger.error(null, 'There was a problem getting db connection:');
          logger.error(null, err);
          process.exit(1);
        }

        client.query(queryString, values, (err, result) => {
          done();
          if (err) {
            logger.error(null, err.stack);
            logger.error(null, 'GOT ERR', err.stack, queryString, values);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    });
  }

  getState(accountId) {
    if (accountId === undefined) {
      return { account: {}, players: [], optimizations: [], teams: [] };
    }
    return new Promise(
      function (resolve, reject) {
        let cacheStartTime = Date.now();
        // First check to see if the info we need exists in cache, if not look in db
        let cachedAccountProm = this.cacheService.getCache(
          `acct:${accountId}:account`
        );
        let cachedPlayersProm = this.cacheService.getCache(
          `acct:${accountId}:players`
        );
        let cachedOptimizationsProm = this.cacheService.getCache(
          `acct:${accountId}:optimizations`
        );
        let cachedTeamsProm = this.cacheService.getCache(
          `acct:${accountId}:teams`
        );

        Promise.all([
          cachedAccountProm,
          cachedPlayersProm,
          cachedOptimizationsProm,
          cachedTeamsProm,
        ]).then(
          function (values) {
            let cacheEndTime = Date.now();

            let cachedAccount = values[0];
            let account;
            if (cachedAccount) {
              account = Promise.resolve();
            } else {
              account = this.parameterizedQueryPromise(
                `
                SELECT 
                  optimizers_list as optimizers_list,
                  balance as balance
                FROM account
                WHERE account_id = $1
                `,
                [accountId]
              );
            }

            let cachedPlayers = values[1];
            let players;
            if (cachedPlayers) {
              players = Promise.resolve();
            } else {
              players = this.parameterizedQueryPromise(
                `
                SELECT 
                  id as id,
                  name as name,
                  gender as gender,
                  song_link as song_link,
                  song_start as song_start
                FROM players
                WHERE account_id = $1
                ORDER BY 
                  created_at ASC,
                  counter ASC
                `,
                [accountId]
              );
            }

            let cachedOptimizations = values[2];
            let optimizations;
            if (cachedOptimizations) {
              optimizations = Promise.resolve();
            } else {
              optimizations = this.parameterizedQueryPromise(
                `
                SELECT 
                  id as id,
                  name as name,
                  custom_options_data as custom_options_data,
                  override_data as override_data,
                  status as status,
                  result_data as result_data,
                  status_message as status_message,
                  send_email as send_email,
                  team_list as team_list,
                  game_list as game_list,
                  player_list as player_list,
                  lineup_type as lineup_type,
                  optimizer_type as optimizer_type,
                  input_summary_data as input_summary_data
                FROM optimization
                WHERE account_id = $1
                ORDER BY 
                  created_at ASC,
                  counter ASC
                `,
                [accountId]
              );
            }

            let cachedTeams = values[3];
            let teams;
            if (cachedTeams) {
              teams = Promise.resolve();
            } else {
              teams = this.parameterizedQueryPromise(
                `
                SELECT
                  teams.id as team_id, 
                  teams.name as team_name,
                  teams.public_id as public_id,
                  teams.public_id_enabled as public_id_enabled,
                  games.id as game_id,
                  extract (epoch from games.date) as game_date, 
                  games.opponent as game_opponent, 
                  games.park as game_park, 
                  games.score_us as score_us, 
                  games.score_them as score_them,
                  games.lineup_type as lineup_type,
                  plate_appearances.id as plate_appearance_id, 
                  plate_appearances.result as result,
                  plate_appearances.hit_location_x as x,
                  plate_appearances.hit_location_y as y,
                  plate_appearances.player_id as player_id,
                  sub_lineup.lineup as lineup
                FROM 
                  plate_appearances
                FULL JOIN games ON games.id=plate_appearances.game_id
                FULL JOIN (SELECT players_games.game_id as game_id, string_agg(players_games.player_id::text, ', ' order by players_games.lineup_index) as lineup
                  FROM players_games
                  WHERE players_games.account_id = $1
                  GROUP BY players_games.game_id) as sub_lineup ON sub_lineup.game_id=games.id
                FULL JOIN teams ON games.team_id=teams.id
                WHERE 
                  teams.account_id = $1
                ORDER BY
                  teams.created_at ASC,
                  teams.counter ASC,
                  games.created_at ASC,
                  games.counter ASC,
                  plate_appearances.created_at ASC,
                  plate_appearances.counter ASC;
                `,
                [accountId]
              );
            }

            Promise.all([account, players, optimizations, teams]).then(
              function (values) {
                var dbEndTime = Date.now();

                var state = {};

                // Account
                state.account = cachedAccount
                  ? JSON.parse(cachedAccount)
                  : this.processAccount(values[0].rows);

                // Players
                state.players = cachedPlayers
                  ? JSON.parse(cachedPlayers)
                  : this.processPlayers(values[1].rows);

                // Optimizations
                state.optimizations = cachedOptimizations
                  ? JSON.parse(cachedOptimizations)
                  : this.processOptimizations(values[2].rows);

                // Teams
                state.teams = cachedTeams
                  ? JSON.parse(cachedTeams)
                  : this.processTeams(values[3].rows);

                // Update the caches, or keep them hot
                if (cachedAccount) {
                  this.cacheService.resetCacheTTL(`acct:${accountId}:account`);
                } else {
                  this.cacheService.setCache(
                    JSON.stringify(state.account),
                    `acct:${accountId}:account`
                  );
                }

                if (cachedPlayers) {
                  this.cacheService.resetCacheTTL(`acct:${accountId}:players`);
                } else {
                  this.cacheService.setCache(
                    JSON.stringify(state.players),
                    `acct:${accountId}:players`
                  );
                }

                if (cachedOptimizations) {
                  this.cacheService.resetCacheTTL(
                    `acct:${accountId}:optimizations`
                  );
                } else {
                  this.cacheService.setCache(
                    JSON.stringify(state.optimizations),
                    `acct:${accountId}:optimizations`
                  );
                }

                if (cachedTeams) {
                  this.cacheService.resetCacheTTL(`acct:${accountId}:teams`);
                } else {
                  this.cacheService.setCache(
                    JSON.stringify(state.teams),
                    `acct:${accountId}:teams`
                  );
                }

                // For some reason the object hash changes before and after stringification. I couldn't quite figure out why this was happening
                // the objects with different hashes appear to be identical. So, I'll add this deep copy here for now so we are always hashing
                // the post-stringified object. This fixes the hash mismatching problem.
                state = JSON.parse(JSON.stringify(state));

                var dbProcessEndTime = Date.now();

                logger.log(
                  accountId,
                  `SYNC account=${cachedAccount ? 'CACHE' : 'DB'} players=${
                    cachedPlayers ? 'CACHE' : 'DB'
                  } teams=${cachedTeams ? 'CACHE' : 'DB'} optimizations=${
                    cachedOptimizations ? 'CACHE' : 'DB'
                  }`,
                  `CacheRetrieve: ${cacheEndTime - cacheStartTime}ms`,
                  `DbRetrieve: ${dbEndTime - cacheEndTime}ms`,
                  `Processing: ${dbProcessEndTime - dbEndTime}ms`,
                  `Total: ${dbProcessEndTime - cacheStartTime}ms`
                );

                resolve(state);
              }.bind(this)
            );
          }.bind(this)
        );
      }.bind(this)
    );
  }

  getStateForTeam(accountId, teamId) {
    if (accountId === undefined) {
      return { players: [], teams: [] };
    }
    let self = this;
    return new Promise(
      function (resolve, reject) {
        let cacheStartTime = Date.now();

        // First check to see if the info we need exists in cache, if not look in db
        let cachedPlayersProm = this.cacheService.getCache(
          `acct:${accountId}:players-for-team`,
          SharedLib.idUtils.serverIdToClientId(teamId)
        );
        let cachedTeamsProm = this.cacheService.getCache(
          `acct:${accountId}:team`,
          SharedLib.idUtils.serverIdToClientId(teamId)
        );

        Promise.all([cachedPlayersProm, cachedTeamsProm]).then(
          function (values) {
            let cacheEndTime = Date.now();

            let cachedPlayers = values[0];
            let players;
            if (cachedPlayers) {
              players = Promise.resolve();
            } else {
              players = self.parameterizedQueryPromise(
                `
                SELECT   
                id as id,
                name as name,
                gender as gender,
                song_link as song_link,
                song_start as song_start FROM players WHERE id IN 
                (SELECT DISTINCT player_id FROM players_games WHERE game_id IN 
                  (SELECT id FROM games WHERE team_id = $2)
                  )
                AND account_id = $1
                ORDER BY 
                players.created_at ASC,
                players.counter ASC
                `,
                [accountId, teamId]
              );
            }

            let cachedTeams = values[1];
            let teams;
            if (cachedTeams) {
              teams = Promise.resolve();
            } else {
              teams = self.parameterizedQueryPromise(
                `
                SELECT
                  teams.id as team_id, 
                  teams.name as team_name,
                  teams.public_id as public_id,
                  teams.public_id_enabled as public_id_enabled,
                  games.id as game_id,
                  extract (epoch from games.date) as game_date, 
                  games.opponent as game_opponent, 
                  games.park as game_park, 
                  games.score_us as score_us, 
                  games.score_them as score_them,
                  games.lineup_type as lineup_type,
                  plate_appearances.id as plate_appearance_id, 
                  plate_appearances.result as result,
                  plate_appearances.hit_location_x as x,
                  plate_appearances.hit_location_y as y,
                  plate_appearances.player_id as player_id,
                  sub_lineup.lineup as lineup
                FROM 
                  plate_appearances
                FULL JOIN games ON games.id=plate_appearances.game_id
                FULL JOIN (SELECT players_games.game_id as game_id, string_agg(players_games.player_id::text, ', ' order by players_games.lineup_index) as lineup
                  FROM players_games
                  WHERE players_games.account_id = $1
                  GROUP BY players_games.game_id) as sub_lineup ON sub_lineup.game_id=games.id
                FULL JOIN teams ON games.team_id=teams.id
                WHERE 
                  teams.account_id = $1 AND 
                  teams.id = $2
                ORDER BY
                  teams.created_at ASC,
                  teams.counter ASC,
                  games.created_at ASC,
                  games.counter ASC,
                  plate_appearances.created_at ASC,
                  plate_appearances.counter ASC;
                `,
                [accountId, teamId]
              );
            }

            Promise.all([players, teams]).then(
              function (values) {
                let dbEndTime = Date.now();
                var state = {};

                // Players
                state.players = cachedPlayers
                  ? JSON.parse(cachedPlayers)
                  : self.processPlayers(values[0].rows);

                // Teams
                state.teams = cachedTeams
                  ? JSON.parse(cachedTeams)
                  : self.processTeams(values[1].rows);

                // Update the caches, or keep them hot
                if (cachedPlayers) {
                  this.cacheService.resetCacheTTL(
                    `acct:${accountId}:players-for-team`
                  );
                } else {
                  this.cacheService.setCache(
                    JSON.stringify(state.players),
                    `acct:${accountId}:players-for-team`,
                    SharedLib.idUtils.serverIdToClientId(teamId)
                  );
                }

                if (cachedTeams) {
                  this.cacheService.resetCacheTTL(`acct:${accountId}:team`);
                } else {
                  this.cacheService.setCache(
                    JSON.stringify(state.teams),
                    `acct:${accountId}:team`,
                    SharedLib.idUtils.serverIdToClientId(teamId)
                  );
                }

                let dbProcessEndTime = Date.now();

                logger.log(
                  accountId,
                  `SYNC TEAM players=${cachedPlayers ? 'CACHE' : 'DB'} teams=${
                    cachedTeams ? 'CACHE' : 'DB'
                  }`,
                  `CacheRetrieve: ${cacheEndTime - cacheStartTime}ms`,
                  `DbRetrieve: ${dbEndTime - cacheEndTime}ms`,
                  `Processing: ${dbProcessEndTime - dbEndTime}ms`,
                  `Total: ${dbProcessEndTime - cacheStartTime}ms`
                );

                resolve(state);
              }.bind(this)
            );
          }.bind(this)
        );
      }.bind(this)
    );
  }

  // Postgres only for migration
  async getAllAccountIds() {
    let result = await this.parameterizedQueryPromise(
      `
        SELECT account_id, email, password_hash, password_token_hash, password_token_expiration, status, optimizers_list, balance, verified_email FROM
        account
      `,
      []
    );
    return result.rows;
  }

  async patchState(patch, accountId) {
    if (accountId === undefined) {
      throw new HandledError(accountId, 403, 'Please sign in first');
    }

    // Generate sql based off the patch
    let sqlToRun = sqlGen.getSqlFromPatch(patch, accountId);

    // Run the sql in a single transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET CONSTRAINTS ALL DEFERRED');

      let cachesToInvalidate = new Set();
      for (let i = 0; i < sqlToRun.length; i++) {
        // Check field length before saving
        for (var j = 0; j < sqlToRun[i].values.length; j++) {
          if (sqlToRun[i].values[j]) {
            // Default field limit is 50 characters unless otherwise overridden
            if (
              sqlToRun[i].limits !== undefined &&
              sqlToRun[i].limits[j + 1] !== undefined
            ) {
              if (sqlToRun[i].values[j].length > sqlToRun[i].limits[j + 1]) {
                throw new HandledError(
                  accountId,
                  400,
                  `Field was larger than overridden limit ${
                    sqlToRun[i].limits[j + 1]
                  } characters ${sqlToRun[i].values[j].length}`
                );
              }
            } else if (sqlToRun[i].values[j].length > 5000) {
              throw new HandledError(
                accountId,
                400,
                'Field was larger than 5000 characters ' +
                  sqlToRun[i].values[j] +
                  ' -- ' +
                  JSON.stringify(sqlToRun[i])
              );
            }
          }
        }

        // Run the query!
        logger.log(
          accountId,
          `Executing:`,
          sqlToRun[i].query,
          sqlToRun[i].values
        );
        await client.query(sqlToRun[i].query, sqlToRun[i].values);

        // Remember the caches we need to invalidate for this statement
        // NOTE: for a minor perf improvement we could only invalidate the cache if the query modifies rows
        sqlToRun[i].cache
          .map((item) => JSON.stringify(item))
          .forEach((item) => cachesToInvalidate.add(item));
      }

      // Invalidate the caches
      cachesToInvalidate.forEach(
        async function (cacheString) {
          logger.log(accountId, `Invalidating cache ${cacheString}`);
          let cache = JSON.parse(cacheString);
          if (cache.secondKey) {
            // This is a hash value
            await this.cacheService.deleteCache(cache.key, cache.secondKey);
          } else {
            // This is a string value
            await this.cacheService.deleteCache(cache.key);
          }
        }.bind(this)
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async signup(email, passwordHash, passwordTokenHash) {
    let result = await this.parameterizedQueryPromise(
      `
        INSERT INTO account (email, password_hash, password_token_hash, password_token_expiration, status, optimizers_list, balance)
        VALUES ($1, $2, $3, now() + interval '1' hour, 'TRIAL', '[0,1,2]', 0)
        RETURNING account_id, email
      `,
      [email, passwordHash, passwordTokenHash]
    );
    return result.rows[0];
  }

  async getAccountFromTokenHash(passwordTokenHash) {
    logger.log(null, 'Searching for', passwordTokenHash.trim());
    let results = await this.parameterizedQueryPromise(
      `
        SELECT account_id, email, password_hash, verified_email
        FROM account 
        WHERE password_token_hash = $1
        AND password_token_expiration >= now()
      `,
      [passwordTokenHash.trim()]
    );
    if (results.rowCount > 1) {
      throw new HandledError(
        'N/A',
        500,
        `An error occurred while retrieving account information`,
        `A strange number of accounts were returned: hash=${passwordTokenHash} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    } else if (results.rowCount === 1) {
      return results.rows[0];
    } else {
      return undefined;
    }
  }

  async confirmEmail(accountId) {
    await this.parameterizedQueryPromise(
      `
        UPDATE account 
        SET verified_email = TRUE 
        WHERE account_id = $1
      `,
      [accountId]
    );
  }

  async getAccountFromEmail(email) {
    let result = await this.parameterizedQueryPromise(
      'SELECT account_id, password_hash FROM account WHERE email = $1',
      [email]
    );
    if (result.rowCount === 1) {
      return result.rows[0];
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        'N/A',
        500,
        `An error occurred while retrieving account details`,
        `A strange number of accounts were returned: email=${email} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }

  async getAccountById(id) {
    let result = await this.parameterizedQueryPromise(
      'SELECT email, verified_email FROM account WHERE account_id = $1',
      [id]
    );
    if (result.rowCount === 1) {
      let object = result.rows[0];
      let newObject = {};
      newObject.email = object.email;
      newObject.verifiedEmail = object.verified_email;
      return newObject;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        'N/A',
        500,
        `An error occurred while retrieving account id information`,
        `A strange number of accounts were returned: id=${id} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }

  async getAccountAndTeamIdsByTeamPublicId(publicId) {
    publicId = SharedLib.idUtils.base62ToHex(publicId);
    const result = await this.parameterizedQueryPromise(
      'SELECT account_id, id AS team_id FROM teams WHERE public_id = $1 AND public_id_enabled = true',
      [publicId]
    );
    if (result.rowCount === 1) {
      const { account_id, team_id } = result.rows[0];
      return {
        accountId: account_id,
        teamId: team_id,
      };
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        'N/A',
        500,
        `An error occurred while retrieving team information`,
        `A strange number of teams were returned: public_id=${publicId} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }

  async setPasswordHashAndExpireToken(accountId, newPasswordHash) {
    await this.parameterizedQueryPromise(
      `
        UPDATE account 
        SET password_hash = $1, password_token_expiration = now()
        WHERE account_id = $2
      `,
      [newPasswordHash, accountId]
    );
  }

  async setPasswordTokenHash(accountId, newPasswordHash) {
    await this.parameterizedQueryPromise(
      `
        UPDATE account 
        SET password_token_hash = $1, password_token_expiration = now() + interval '24' hour
        WHERE account_id = $2
      `,
      [newPasswordHash, accountId]
    );
  }

  async deleteAccount(accountId) {
    logger.log(accountId, 'deleting');
    await this.parameterizedQueryPromise(
      `
        DELETE FROM account 
        WHERE account_id = $1
      `,
      [accountId]
    );
  }

  // The states ALLOCATING_RESOURCES, IN_PROGRESS, PAUSING, and PREEMPTED are considered in progress for this purpose
  async getNumberOfOptimizationsInProgress(accountId) {
    logger.log(accountId, 'getting optimization in progress count');
    let result = await this.parameterizedQueryPromise(
      `
      SELECT COUNT(*)
      FROM optimization
      WHERE account_id = $1 AND status IN (1,2,6,7);
      `,
      [accountId]
    );
    if (result.rowCount === 1) {
      return result.rows[0].count;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        accountId,
        500,
        `An error occurred while retrieving optimization information`,
        `A strange number of results were returned: accountId=${accountId} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }

  async setOptimizationStatus(
    accountId,
    optimizationId,
    newStatus,
    optionalMessage,
    optionalPreviousStatus
  ) {
    logger.log(
      accountId,
      'changing optimization status to ',
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM_INVERSE[newStatus],
      optionalMessage,
      optionalPreviousStatus
    );

    let result;
    if (optionalPreviousStatus === undefined) {
      result = await this.parameterizedQueryPromise(
        `
            UPDATE optimization
            SET status = $1, status_message = $4
            WHERE id = $2 AND account_id = $3
        `,
        [newStatus, optimizationId, accountId, optionalMessage]
      );
    } else {
      result = await this.parameterizedQueryPromise(
        `
            UPDATE optimization
            SET status = $1, status_message = $4
            WHERE id = $2 AND account_id = $3 AND status = $5
        `,
        [
          newStatus,
          optimizationId,
          accountId,
          optionalMessage,
          optionalPreviousStatus,
        ]
      );
    }
    if (result.rowCount === 1) {
      await this.cacheService.deleteCache(`acct:${accountId}:optimizations`);
      return true;
    } else if (result.rowCount === 0) {
      // The optimization may have been deleted by the user, paused by the user, or something weird is going on
      logger.warn(accountId, `No optimization rows were updated`);
      return false;
    } else {
      logger.error(
        accountId,
        `A strange number of rows were updated ${optimizationId} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
      return false;
    }
  }

  async setOptimizationResultData(accountId, optimizationId, newResults) {
    await this.parameterizedQueryPromise(
      `
        UPDATE optimization
        SET result_data = $1 
        WHERE id = $2 AND account_id = $3
      `,
      [newResults, optimizationId, accountId]
    );
    await this.cacheService.deleteCache(`acct:${accountId}:optimizations`);
  }

  async getOptimizationStatus(accountId, optimizationId) {
    let result = await this.parameterizedQueryPromise(
      `
        SELECT status
        FROM optimization
        WHERE id = $1 AND account_id = $2
      `,
      [optimizationId, accountId]
    );
    if (result.rowCount === 1) {
      return result.rows[0].status;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        accountId,
        500,
        `An error occurred while retrieving optimization status information`,
        `A strange number of optimization result datas were returned: ${optimizationId} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }

  async getOptimizationResultData(accountId, optimizationId) {
    let result = await this.parameterizedQueryPromise(
      `
        SELECT result_data
        FROM optimization
        WHERE id = $1 AND account_id = $2
      `,
      [optimizationId, accountId]
    );
    if (result.rowCount === 1) {
      return result.rows[0].result_data;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        accountId,
        500,
        `An error occurred while retrieving optimization result information`,
        `A strange number of optimization result datas were returned: ${optimizationId} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }

  async getOptimizationDetails(accountId, optimizationId) {
    let result = await this.parameterizedQueryPromise(
      `
        SELECT name, send_email, optimizer_type, player_list, lineup_type, override_data, optimizer_type, custom_options_data, team_list, input_summary_data
        FROM optimization
        WHERE id = $1 AND account_id = $2
      `,
      [optimizationId, accountId]
    );
    if (result.rowCount === 1) {
      let object = result.rows[0];
      let newObject = {};
      newObject.name = object.name;
      newObject.sendEmail = object.send_email;
      newObject.playerList = object.player_list;
      newObject.lineupType = object.lineup_type;
      newObject.overrideData = object.override_data;
      newObject.optimizerType = object.optimizer_type;
      newObject.customOptionsData = object.custom_options_data;
      newObject.teamList = object.team_list;
      newObject.inputSummaryData = object.input_summary_data;
      return newObject;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        accountId,
        500,
        `An error occurred while retrieving optimization detail information`,
        `A strange number of optimization result data were returned: ${optimizationId} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }

  /*
  async setOptimizationExecutionData(
    accountId,
    optimizationId,
    newExecutionData
  ) {
    await this.parameterizedQueryPromise(
      `
        UPDATE optimization
        SET execution_data = $1 
        WHERE id = $2 AND account_id = $3
      `,
      [newExecutionData, optimizationId, accountId]
    );
    // We don't need to invalidate cache here because
    // this information is not used by the client
  }
  */

  /*
  async getOptimizationExecutionData(accountId, optimizationId) {
    let result = await this.parameterizedQueryPromise(
      `
        SELECT execution_data
        FROM optimization
        WHERE id = $1 AND account_id = $2
      `,
      [optimizationId, accountId]
    );
    if (result.rowCount === 1) {
      return result.rows[0].execution_data;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        accountId,
        500,
        `An error occurred while retrieving optimization execution data information`,
        `A strange number of optimization execution datas were returned: ${optimizationId} rows=${JSON.stringify(
          result.rows,
          null,
          2
        )}`
      );
    }
    return undefined;
  }
  */
};
