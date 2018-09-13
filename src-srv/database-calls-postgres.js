const { Pool } = require( 'pg' );

const objectMerge = require( '../object-merge.js' );
const sqlGen = require( './sql-gen.js' );
const idUtils = require( '../id-utils.js' );
const HandledError = require( './handled-error.js' );

module.exports = class DatabaseCalls {

	constructor(url, port, user, password) {
		console.log( 'Connecting to pg', url );
		this.pool = new Pool( {
			user: user,
			host: url,
			database: 'Softball',
			password: password,
			port: port,
		} );

		// Test connection
		this.pool.connect( function( err ) {
			if ( err ) {
				console.log( "There was a problem getting db connection:" );
				console.log( err );
				reject( err );
			}
		} );

		// We don't ever anticipate storing numeric values larger than the javascript maximum safe integer size
		// (9,007,199,254,740,991) so we'll instruct pg to return all bigints from the database as javascript numbers. 
		// See https://github.com/brianc/node-pg-types
		var types = require('pg').types
		types.setTypeParser(20, function(val) {
		  return parseInt(val);
		})
	}

	queryPromise( queryString ) {
		let self = this;
		return new Promise( function( resolve, reject ) {
			self.pool.connect( function( err, client, done ) {
				if ( err ) {
					console.log( "There was a problem getting db connection:" );
					console.log( err );
					reject( err );
				}

				client.query( queryString, function( err, result ) {
					done();
					if ( err ) {
						console.log( err );
						reject( err );
					} else {
						resolve( result );
					}
				} );
			} );
		} );
	}

	parameterizedQueryPromise( queryString, values ) {
		let self = this;
		return new Promise( function( resolve, reject ) {
			self.pool.connect( function( err, client, done ) {
				if ( err ) {
					console.log( "There was a problem getting db connection:" );
					console.log( err );
					process.exit( 1 );
				}

				client.query(queryString, values, ( err , result ) => {
					done();
					if (err) {
						console.log(err.stack);
						reject( err );
					} else {
						resolve( result );
					}
				})
			} );
		} );
	}

	getState( accountId ) {
		console.log("Accessing data of account", accountId, accountId === undefined);
		if(accountId === undefined) {
			return {"players":[], "teams":[]};
		}
		let self = this;
		return new Promise( function( resolve, reject ) {
			var players = self.parameterizedQueryPromise( `
				SELECT 
				  id as id,
				  name as name,
				  gender as gender
				FROM players
				WHERE account_id = $1
				ORDER BY counter ASC
			`, [accountId]);

			var teams = self.parameterizedQueryPromise( `
				SELECT
				  teams.id as team_id, 
				  teams.name as team_name,
				  games.id as game_id,
				  extract (epoch from games.date) as game_date, 
				  games.opponent as game_opponent, 
				  games.park as game_park, 
				  games.score_us as scoreUs, 
				  games.score_them as scoreThem,
				  games.lineup_type as lineupType,
				  plate_appearances.id as plate_appearance_id, 
				  plate_appearances.result as result,
				  plate_appearances.hit_location_x as x,
				  plate_appearances.hit_location_y as y,
				  plate_appearances.index_in_game as index,
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
				  team_id ASC,
				  game_id ASC,
				  teams.counter ASC,
				  games.counter ASC,
				  index ASC;
			`, [accountId]);

			Promise.all( [ players, teams ] ).then( function( values ) {
				var milliseconds = (new Date).getTime();

				var state = {};

				// Players
				state.players = [];
				state.players = values[ 0 ].rows;
				for( let i = 0; i < state.players.length; i++) {
					state.players[i].id = idUtils.hexUuidToBase62(state.players[i].id);
				}

				// Teams
				let plateAppearances = values[ 1 ].rows;
				let teamIdSet = new Set();
				let gameIdSet = new Set();
				let teams = [];

				for ( let i = 0; i < plateAppearances.length; i++ ) {
					let plateAppearance = plateAppearances[ i ];

					if ( plateAppearance.team_id && !teamIdSet.has( plateAppearance.team_id ) ) {
						teamIdSet.add( plateAppearance.team_id );
						var newTeam = {};
						newTeam.games = [];
						newTeam.id = idUtils.hexUuidToBase62(plateAppearance.team_id);
						newTeam.name = plateAppearance.team_name;
						teams.push( newTeam );
					}

					if ( plateAppearance.game_id && !gameIdSet.has( plateAppearance.game_id ) ) {
						gameIdSet.add( plateAppearance.game_id );
						var newGame = {};
						newGame.plateAppearances = [];
						newGame.id = idUtils.hexUuidToBase62(plateAppearance.game_id);
						newGame.opponent = plateAppearance.game_opponent;
						newGame.date = plateAppearance.game_date;
						newGame.park = plateAppearance.game_park;
						newGame.score_us = plateAppearance.score_us;
						newGame.score_them = plateAppearance.score_them;
						newGame.lineup_type = plateAppearance.lineup_type;
						if ( plateAppearance.lineup ) {
							newGame.lineup = plateAppearance.lineup.split( ',' ).map( v => idUtils.hexUuidToBase62(v.trim()) );
						} else {
							newGame.lineup = [];
						}
						newTeam.games.push( newGame );
					}

					if ( plateAppearance.plate_appearance_id ) {
						var newPlateAppearance = {};
						newPlateAppearance.id = idUtils.hexUuidToBase62(plateAppearance.plate_appearance_id);
						newPlateAppearance.player_id = idUtils.hexUuidToBase62(plateAppearance.player_id);
						newPlateAppearance.result = plateAppearance.result;
						newPlateAppearance.location = {
							"x": plateAppearance.x,
							"y": plateAppearance.y
						}
						newPlateAppearance.plateAppearanceIndex = plateAppearance.index;
						newGame.plateAppearances.push( newPlateAppearance );
					}
				}
				state.teams = teams;

				// For some reason the object hash changes before and after stringification. I couldn't quite figure
				// out why this was happening so I'll add here for now so we are always hashing the post-stringified object. 
				state = JSON.parse(JSON.stringify(state));

				console.log("SYNC_PULL", (new Date).getTime() - milliseconds);

				resolve( state );
			} );
		} );
	}

	async patchState( patch, accountId ) {
		if(accountId === undefined)  {
			throw new HandledError(403, "Please sign in first");
		}

		// Generate sql based off the patch
		let sqlToRun = sqlGen.getSqlFromPatch(patch, accountId);

		// Run the sql in a single transaction
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			await client.query('SET CONSTRAINTS ALL DEFERRED');

			for(let i = 0; i < sqlToRun.length; i++) {
				
				// Don't save fields longer than 50 characters
				for(var j = 0; j < sqlToRun[i].values.length; j++) {
					if(sqlToRun[i].values[j].length > 50) {
						throw new HandledError(400, "Field was larger than 50 characters " + sqlToRun[i].values[j]);
					}
				}

				// Run the query!
				console.log(`Executing:`, sqlToRun[i]);
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
		let result = await this.parameterizedQueryPromise( `
				INSERT INTO account (email, password_hash, password_token_hash, password_token_expiration, status)
				VALUES ($1, $2, $3, now() + interval '1' hour, 'TRIAL')
				RETURNING account_id, email
			`, [email, passwordHash, passwordTokenHash]);
		return result.rows[0];
	}

	async getAccountFromTokenHash(passwordTokenHash) {
		console.log("Seraching for", passwordTokenHash.trim());
		let results =  await this.parameterizedQueryPromise( `
				SELECT account_id, email, password_hash, verified_email
				FROM account 
				WHERE password_token_hash = $1
				AND password_token_expiration >= now()
			`, [passwordTokenHash.trim()]);
		if(results.rowCount > 1) {
			throw new HandledError(500,`A strange number of accounts were returned: ${passwordTokenHash} ${result}`);
		} else if (results.rowCount === 1) {
			return results.rows[0];
		} else {
			return undefined;
		}
	}

	async confirmEmail(accountId) {
		await this.parameterizedQueryPromise( `
				UPDATE account 
				SET verified_email = TRUE 
				WHERE account_id = $1
			`, [accountId]);
	}

	async getAccountFromEmail( email ) {
		let result = await this.parameterizedQueryPromise( "SELECT account_id, password_hash FROM account WHERE email = $1" , [email]);
		if(result.rowCount === 1) {
			return result.rows[0];
		} else if(result.rowCount !== 0) {
			throw new HandledError(500,`A strange number of accounts were returned: ${email} ${result}`);
		}
		return undefined;
	}

	async setPasswordHashAndExpireToken(accountId, newPasswordHash) {
		await this.parameterizedQueryPromise( `
				UPDATE account 
				SET password_hash = $1, password_token_expiration = now()
				WHERE account_id = $2
			`, [newPasswordHash, accountId]);
	}

	async setPasswordTokenHash(accountId, newPasswordHash) {
		await this.parameterizedQueryPromise( `
				UPDATE account 
				SET password_token_hash = $1, password_token_expiration = now() + interval '24' hour
				WHERE account_id = $2
			`, [newPasswordHash, accountId]);
	}

	async deleteAccount(accountId) {
		await this.parameterizedQueryPromise( `
				DELETE FROM account 
				WHERE account_id = $1
			`, [accountId]);
	}

}