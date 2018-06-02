const { Pool } = require( 'pg' );

const objectMerge = require( '../object-merge.js' );
const sqlGen = require( './sql-gen.js' );
const HandledError = require( './handled-error.js' )

module.exports = class DatabaseCalls {

	constructor(url, user, password) {
		console.log( 'Connecting to pg', url );
		this.pool = new Pool( {
			user: user,
			host: url,
			database: 'Softball',
			password: password,
			port: 5432,
		} );

		// Test connection
		this.pool.connect( function( err ) {
			if ( err ) {
				console.log( "There was a problem getting db connection:" );
				console.log( err );
				reject( err );
			}
		} );

		// We don't ever anticipate having primary keys (or anything else) larger than the javascript maximum safe integer size
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

	async getAccountIdAndPassword( email ) {
		let result = await this.parameterizedQueryPromise( "SELECT id, password FROM accounts WHERE accounts.email = $1" , [email]);
		if(result.rowCount === 1) {
			return result.rows[0];
		} else if(result.rowCount !== 0) {
			throw new Error(`A strange number of accounts were returned: ${email} ${result}`);
		}
		return undefined;
	}

	getState( account_id ) {
		let self = this;
		return new Promise( function( resolve, reject ) {
			var players = self.queryPromise( `
				SELECT 
				  id as id,
				  name as name,
				  gender as gender,
				  picture as picture
				FROM public.players
			` );

			var teams = self.queryPromise( `
				SELECT
				  teams.id as team_id, 
				  teams.name as team_name,
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
				  plate_appearances.index_in_game as index,
				  plate_appearances.player_id as player_id,
				  sub_lineup.lineup as lineup
				FROM 
				  public.plate_appearances
				FULL JOIN public.games ON public.games.id=public.plate_appearances.game_id
				FULL JOIN (SELECT public.players_games.game_id as game_id, string_agg(public.players_games.player_id::text, ', ' order by public.players_games.lineup_index) as lineup
				  FROM public.players_games
				  GROUP BY players_games.game_id) as sub_lineup ON sub_lineup.game_id=public.games.id
				FULL JOIN public.teams ON public.games.team_id=public.teams.id
				ORDER BY
				  teams.id ASC,
				  games.id ASC,
				  index ASC;
			` );

			// It looks like thes two objects could get out of sync if a save to the db happened between select requests.
			Promise.all( [ players, teams ] ).then( function( values ) {
				var state = {};

				// Players
				state.players = [];
				state.players = values[ 0 ].rows;

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
						newTeam.id = plateAppearance.team_id;
						newTeam.name = plateAppearance.team_name;
						if ( plateAppearance.roster ) {
							newTeam.roster = plateAppearance.roster.split( ',' ).map( Number );
						} else {
							newTeam.roster = [];
						}
						teams.push( newTeam );
					}

					if ( plateAppearance.game_id && !gameIdSet.has( plateAppearance.game_id ) ) {
						gameIdSet.add( plateAppearance.game_id );
						var newGame = {};
						newGame.plateAppearances = [];
						newGame.id = plateAppearance.game_id;
						newGame.opponent = plateAppearance.game_opponent;
						newGame.date = plateAppearance.game_date;
						newGame.park = plateAppearance.game_park;
						newGame.score_us = plateAppearance.score_us;
						newGame.score_them = plateAppearance.score_them;
						newGame.lineup_type = plateAppearance.lineup_type;
						if ( plateAppearance.lineup ) {
							newGame.lineup = plateAppearance.lineup.split( ',' ).map( Number );
						} else {
							newGame.lineup = [];
						}
						newTeam.games.push( newGame );
					}

					if ( plateAppearance.plate_appearance_id ) {
						var newPlateAppearance = {};
						newPlateAppearance.id = plateAppearance.plate_appearance_id;
						newPlateAppearance.player_id = plateAppearance.player_id;
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
				resolve( state );
			} );
		} );
	}

	async setState( data ) {
		let responseObject = {};
		responseObject.status = "STATUS UNKNOWN";
		let result = await this.getState();

		let self = this;
		var ancestorDiffs = objectMerge.diff(result, JSON.parse(data.ancestor));
		if(Object.keys(ancestorDiffs).length === 0 && ancestorDiffs.constructor === Object) {
			// Diff the client's data with the db data to get the patch we need to apply to make the database match the client
			var patch = objectMerge.diff(result, JSON.parse(data.local));
			console.log(JSON.stringify(patch, null,2));

			// Generate sql based off the patch
			let sqlToRun = sqlGen.getSqlFromPatch(patch);
			console.log(sqlToRun);

			// Run the sql in a single transaction
			let responseObject = {};
			const client = await self.pool.connect();
			try {
				await client.query('BEGIN');
				await client.query('SET CONSTRAINTS ALL DEFERRED');

				let idMap = {'teams':{}, 'players':{}, 'plate_appearances':{}, 'games':{}, 'players_games':{}};
				for(let i = 0; i < sqlToRun.length; i++) {
					// Replace 'values' that are client ids with their corresponding server ids
					if(sqlToRun[i].idReplacements) {
						for(let j = 0; j < sqlToRun[i].idReplacements.length; j++) {
							let oldValue = sqlToRun[i].idReplacements[j].clientId;
							let table = sqlToRun[i].idReplacements[j].table;
							let newValue = idMap[table][oldValue];
							if(newValue === undefined) {
								newValue = oldValue; // Client id matches the server id (or the order of the query's is wrong)
							}
							let indexToReplace = sqlToRun[i].idReplacements[j].valuesIndex;
							sqlToRun[i].values[indexToReplace] = newValue;
						}
					}

					// Run the query!
					console.log("Executing:", sqlToRun[i]);
					let insertedPrimaryKey = await client.query(sqlToRun[i].query, sqlToRun[i].values);

					// Map client ids to server ids so we can replace them in subsequent queries
					if(parseInt(insertedPrimaryKey.rows.length) === 1) {
						let primaryKey = insertedPrimaryKey.rows[0].id;
						if(sqlToRun[i].mapReturnValueTo && sqlToRun[i].mapReturnValueTo.table && sqlToRun[i].mapReturnValueTo.clientId) {
							idMap[sqlToRun[i].mapReturnValueTo.table][sqlToRun[i].mapReturnValueTo.clientId] = primaryKey;
						} else {
							console.log(sqlToRun, insertedPrimaryKey);
							console.log("insertedPrimaryKey has values no clientId was assigned to map");
							throw new HandledError(500, "Internal Server Error", "ERROR: NO CLIENT ID MAPPING");
						}
					} else if (parseInt(insertedPrimaryKey.rows.length) !== 0) {
						console.log(insertedPrimaryKey);
						console.log(insertedPrimaryKey);
						throw new HandledError(500, "Internal Server Error", "ERROR: UNEXPECTED NUMBER OF RESULTS RETURNED");
					}
				}

				await client.query('COMMIT');
				responseObject.status = "SUCCESS";
			} catch (e) {
				await client.query('ROLLBACK');
				throw e;
			} finally {
				client.release();
				return JSON.stringify(responseObject);
			}
		} else {
			throw new HandledError(400, "There are pending changes. Pull first.");
		}
	}


}