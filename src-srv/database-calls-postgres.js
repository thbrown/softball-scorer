const { Pool } = require('pg');

const HandledError = require('./handled-error.js');
const idUtils = require('../id-utils.js');
const logger = require('./logger.js');
const sqlGen = require('./sql-gen.js');

/**
 * This implementation uses postgres db as the persistance layer. Connection info and credentials can be supplied in the server side config.
 *
 * During reads, results are ordered first by their created_at timestamps then by a separate counter variable (since records inserted quickly may have duplicated timestamps).
 * If the coutner fields ever overflows, it's not a big deal (unless sombody is inserting 2 billion + records in the same timestamp).
 */
module.exports = class DatabaseCalls {
  constructor(url, port, user, password, database, cb) {
    logger.log('sys', 'Connecting to pg', url);
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
    types.setTypeParser(20, function(val) {
      return parseInt(val);
    });

    // Verify connection
    this.pool.connect(function(err) {
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

    this.pool.on('error', error => {
      logger.error(null, `Postgres error: ${error}`);
    });
  }

  disconnect() {
    logger.log(null, 'disconnecting from posrgres');
    return new Promise(
      function(resolve, reject) {
        this.pool
          .end()
          .then(() => resolve())
          .catch(err => reject(err));
      }.bind(this)
    );
  }

  queryPromise(queryString) {
    let self = this;
    return new Promise(function(resolve, reject) {
      self.pool.connect(function(err, client, done) {
        if (err) {
          logger.error(null, 'There was a problem getting db connection:');
          logger.error(err);
          reject(err);
        }

        client.query(queryString, function(err, result) {
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
    return new Promise(function(resolve, reject) {
      self.pool.connect(function(err, client, done) {
        if (err) {
          logger.error(null, 'There was a problem getting db connection:');
          logger.error(null, err);
          process.exit(1);
        }

        client.query(queryString, values, (err, result) => {
          done();
          if (err) {
            logger.log(null, err.stack);
            logger.log(null, 'GOT ERR', err.stack, queryString, values);
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
      return { players: [], optimizations: [], teams: [] };
    }
    let self = this;
    return new Promise(function(resolve, reject) {
      var players = self.parameterizedQueryPromise(
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

      var optimizations = self.parameterizedQueryPromise(
        `
        SELECT 
          id as id,
          name as name,
          type as type,
          custom_data as custom_data,
          override_data as override_data,
          status as status,
          result_data as result_data,
          status_message as status_message,
          send_email as send_email,
          team_list as team_list,
          game_list as game_list,
          player_list as player_list,
          lineup_type as lineup_type
        FROM optimization
        WHERE account_id = $1
        ORDER BY 
          created_at ASC,
          counter ASC
        `,
        [accountId]
      );

      var teams = self.parameterizedQueryPromise(
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

      Promise.all([players, optimizations, teams]).then(function(values) {
        var milliseconds = new Date().getTime();

        var state = {};

        // Players
        state.players = [];
        state.players = values[0].rows;
        for (let i = 0; i < state.players.length; i++) {
          state.players[i].id = idUtils.serverIdToClientId(state.players[i].id);
          state.players[i].song_link = state.players[i].song_link
            ? state.players[i].song_link
            : null;
          state.players[i].song_start = state.players[i].song_start
            ? state.players[i].song_start
            : null;
        }

        // Optimizations
        state.optimizations = [];
        let optimizations = values[1].rows;
        for (let i = 0; i < optimizations.length; i++) {
          state.optimizations.push({});
          state.optimizations[i].id = idUtils.serverIdToClientId(
            optimizations[i].id
          );

          state.optimizations[i].name = optimizations[i].name;
          state.optimizations[i].type = optimizations[i].type;

          state.optimizations[i].customData = optimizations[i].custom_data
            ? JSON.stringify(optimizations[i].custom_data)
            : '{}';
          state.optimizations[i].overrideData = optimizations[i].override_data
            ? JSON.stringify(optimizations[i].override_data)
            : '{}';
          state.optimizations[i].status = optimizations[i].status;
          state.optimizations[i].resultData = optimizations[i].result_data
            ? JSON.stringify(optimizations[i].result_data)
            : '{}';
          state.optimizations[i].statusMessage =
            optimizations[i].status_message;
          state.optimizations[i].sendEmail = optimizations[i].send_email;
          state.optimizations[i].teamList = optimizations[i].team_list
            ? JSON.stringify(optimizations[i].team_list)
            : '[]';
          state.optimizations[i].gameList = optimizations[i].game_list
            ? JSON.stringify(optimizations[i].game_list)
            : '[]';
          state.optimizations[i].playerList = optimizations[i].player_list
            ? JSON.stringify(optimizations[i].player_list)
            : '[]';
          state.optimizations[i].lineupType = optimizations[i].lineup_type;
        }

        // Teams
        let plateAppearances = values[2].rows;
        let teamIdSet = new Set();
        let gameIdSet = new Set();
        let teams = [];

        for (let i = 0; i < plateAppearances.length; i++) {
          let plateAppearance = plateAppearances[i];

          if (
            plateAppearance.team_id &&
            !teamIdSet.has(plateAppearance.team_id)
          ) {
            teamIdSet.add(plateAppearance.team_id);
            const newTeam = {};
            newTeam.games = [];
            newTeam.id = idUtils.serverIdToClientId(plateAppearance.team_id);
            newTeam.name = plateAppearance.team_name;
            newTeam.publicId = idUtils.hexToBase62(plateAppearance.public_id);
            newTeam.publicIdEnabled = plateAppearance.public_id_enabled;
            teams.push(newTeam);
          }

          if (
            plateAppearance.game_id &&
            !gameIdSet.has(plateAppearance.game_id)
          ) {
            gameIdSet.add(plateAppearance.game_id);
            var newGame = {};
            newGame.plateAppearances = [];
            newGame.id = idUtils.serverIdToClientId(plateAppearance.game_id);
            newGame.opponent = plateAppearance.game_opponent;
            newGame.date = plateAppearance.game_date;
            newGame.park = plateAppearance.game_park;
            newGame.lineupType = plateAppearance.lineup_type;
            if (plateAppearance.lineup) {
              newGame.lineup = plateAppearance.lineup
                .split(',')
                .map(v => idUtils.serverIdToClientId(v.trim()));
            } else {
              newGame.lineup = [];
            }
            let team = teams.find(
              element =>
                element.id ===
                idUtils.serverIdToClientId(plateAppearance.team_id)
            );
            team.games.push(newGame);
          }

          if (plateAppearance.plate_appearance_id) {
            var newPlateAppearance = {};
            newPlateAppearance.id = idUtils.serverIdToClientId(
              plateAppearance.plate_appearance_id
            );
            newPlateAppearance.player_id = idUtils.serverIdToClientId(
              plateAppearance.player_id
            );
            newPlateAppearance.result = plateAppearance.result;
            newPlateAppearance.location = {
              x: plateAppearance.x,
              y: plateAppearance.y,
            };
            let team = teams.find(
              element =>
                element.id ===
                idUtils.serverIdToClientId(plateAppearance.team_id)
            );
            let game = team.games.find(
              element =>
                element.id ===
                idUtils.serverIdToClientId(plateAppearance.game_id)
            );
            game.plateAppearances.push(newPlateAppearance);
          }
        }
        state.teams = teams;

        // For some reason the object hash changes before and after stringification. I couldn't quite figure out why this was happening
        // the objects with different hashes appear to be identical. So, I'll add this deep copy here for now so we are always hashing the post-stringified object.
        state = JSON.parse(JSON.stringify(state));

        logger.log(
          accountId,
          `SYNC_PULL took ${new Date().getTime() - milliseconds}ms`
        );

        resolve(state);
      });
    });
  }

  async patchState(patch, accountId) {
    if (accountId === undefined) {
      throw new HandledError(403, 'Please sign in first');
    }

    // Generate sql based off the patch
    let sqlToRun = sqlGen.getSqlFromPatch(patch, accountId);

    // Run the sql in a single transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET CONSTRAINTS ALL DEFERRED');

      for (let i = 0; i < sqlToRun.length; i++) {
        // Check field length before saving
        for (var j = 0; j < sqlToRun[i].values.length; j++) {
          if (sqlToRun[i].values[j]) {
            // Default field limit is 50 characters unless otherwise overriden
            if (
              sqlToRun[i].limits !== undefined &&
              sqlToRun[i].limits[j + 1] !== undefined
            ) {
              if (sqlToRun[i].values[j].length > sqlToRun[i].limits[j + 1]) {
                throw new HandledError(
                  400,
                  `Field was larger than overriden limit ${
                    sqlToRun.limits[i + 1]
                  } characters ${sqlToRun[i].values[j]} -- ${JSON.stringify(
                    sqlToRun[i]
                  )}`
                );
              }
            } else if (sqlToRun[i].values[j].length > 50) {
              throw new HandledError(
                400,
                'Field was larger than 50 characters ' +
                  sqlToRun[i].values[j] +
                  ' -- ' +
                  JSON.stringify(sqlToRun[i])
              );
            }
          }
        }

        // Run the query!
        logger.log(accountId, `Executing:`, sqlToRun[i]);
        await client.query(sqlToRun[i].query, sqlToRun[i].values);
      }
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
        INSERT INTO account (email, password_hash, password_token_hash, password_token_expiration, status)
        VALUES ($1, $2, $3, now() + interval '1' hour, 'TRIAL')
        RETURNING account_id, email
      `,
      [email, passwordHash, passwordTokenHash]
    );
    return result.rows[0];
  }

  async getAccountFromTokenHash(passwordTokenHash) {
    logger.log(null, 'Seraching for', passwordTokenHash.trim());
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
        500,
        `A strange number of accounts were returned: hash=${passwordTokenHash} results=${results}`
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
        500,
        `A strange number of accounts were returned: email=${email} result=${result}`
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
        500,
        `A strange number of accounts were returned: id=${id} result=${result}`
      );
    }
    return undefined;
  }

  async getAccountAndTeamByTeamPublicId(publicId) {
    publicId = idUtils.base62ToHex(publicId);
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
        500,
        `A strange number of accounts were returned: public_id=${publicId} result=${result}`
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

  // TODO: tie the states that count as 'in progress' to the enum in state.java so we don't have two sources of truth
  // The states ALLOCATING_RESOURCES, IN_PROGRESS, and PAUSING are considered in progress for this purpose
  async getNumberOfOptimizationsInProgress(accountId) {
    logger.log(accountId, 'getting optimization in progress count');
    let result = await this.parameterizedQueryPromise(
      `
      SELECT COUNT(*)
      FROM optimization
      WHERE account_id = $1 AND status IN (1,2,6);
      `,
      [accountId]
    );
    if (result.rowCount === 1) {
      return result.rows[0].count;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        500,
        `A strange number of results were returned: accountId=${accountId} result=${result}`
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
      newStatus,
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
      return true;
    } else if (result.rowCount === 0) {
      // The optimization may have been deleted by the user, paused by the user, or something weird is going on
      logger.warn(accountId, `No optimization rows were updated`);
      return false;
    } else {
      logger.error(
        accountId,
        `A strange number of rows were updated ${result.rowCount} ${optimizationId}`
      );
      return false;
    }
  }

  async setOptimizationResultData(accountId, optimizationId, newResults) {
    logger.log(accountId, 'setting optimization results');
    await this.parameterizedQueryPromise(
      `
        UPDATE optimization
        SET result_data = $1 
        WHERE id = $2 AND account_id = $3
      `,
      [newResults, optimizationId, accountId]
    );
  }

  async getOptimizationResultData(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization results data', optimizationId);
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
        500,
        `A strange number of optimization result datas were returned: ${optimizationId} ${result}`
      );
    }
    return undefined;
  }

  async getOptimizationDetails(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization results data', optimizationId);
    let result = await this.parameterizedQueryPromise(
      `
        SELECT name, send_email
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
      return newObject;
    } else if (result.rowCount !== 0) {
      throw new HandledError(
        500,
        `A strange number of optimization result datas were returned: ${optimizationId} ${result}`
      );
    }
    return undefined;
  }

  async setOptimizationExecutionData(
    accountId,
    optimizationId,
    newExecutionData
  ) {
    logger.log(
      accountId,
      'setting optimization execution data ',
      optimizationId
    );
    await this.parameterizedQueryPromise(
      `
        UPDATE optimization
        SET execution_data = $1 
        WHERE id = $2 AND account_id = $3
      `,
      [newExecutionData, optimizationId, accountId]
    );
  }

  async getOptimizationExecutionData(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization execution data');
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
        500,
        `A strange number of optimizatio execution datas were returned: ${optimizationId} ${result}`
      );
    }
    return undefined;
  }
};
