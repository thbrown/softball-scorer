/*eslint no-process-exit:*/
'use strict';

const http_server = require( './http-server' );
const { Pool } = require( 'pg' );
const objectMerge = require( '../object-merge.js' );
const sqlGen = require( './sql-gen.js' );

let PORT = 8888;
let USE_PG = true;

if ( process.argv.length !== 5 && process.argv.length !== 2 ) {
	console.log( 'Usage: ' + __filename + ' <postgres_url> <postgres_username> <postgres_password>' );
	console.log( 'Assumes postgres is running on port 5432' );
	process.exit( -1 );
} else if ( process.argv.length === 2 ) {
	console.log( 'Warning: running without database connection' );
	USE_PG = false;
}

const pgurl = process.argv[ 2 ];
const user = process.argv[ 3 ];
const password = process.argv[ 4 ];

let pool = null;

if( USE_PG ) {
	console.log( 'Connecting to pg', pgurl );
	pool = new Pool( {
		user: user,
		host: pgurl,
		database: 'Softball',
		password: password,
		port: 5432,
	} );

	// Test connection
	pool.connect( function( err ) {
		if ( err ) {
			console.log( "There was a problem getting db connection:" );
			console.log( err );
			process.exit( 1 );
		}
	} );
}

process.on( 'SIGINT', function() {
	console.log( 'SIGINT' );
	process.exit( 0 );
} );
process.on( 'SIGTERM', function() {
	console.log( 'SIGTERM' );
	process.exit( 0 );
} );
process.on( 'exit', function() {
	process.stdout.write( 'Bye\n' );
} );

http_server.start( PORT, __dirname + '/..' );
console.log( 'Now listening on port: ' + PORT );

//localhost:8080/test as a GET request will trigger this function
http_server.get( 'test', ( obj, resp ) => {
	console.log( 'Triggered "test" GET request' );
	http_server.reply( resp, 'This is a test GET result' );
} );

//localhost:8080/test as a POST request will trigger this function
http_server.post( 'test', ( obj, resp, data ) => {
	console.log( 'Triggered "test" POST request', data );
	http_server.reply( resp, 'This is a test POST result' );
} );

http_server.post( 'state', ( obj, resp, data ) => {

	let responseObject = {};
	if( !USE_PG ) {
		responseObject.status = "FAIL";
		responseObject.reason = "POSTGRES NOT SETUP";
		return http_server.reply( resp, JSON.stringify(responseObject) );
	}

	getStatePromise().then( function( result ) { 

		var ancestorDiffs = objectMerge.diff(result, JSON.parse(data.ancestor));
		if(Object.keys(ancestorDiffs).length === 0 && ancestorDiffs.constructor === Object) {
			// Diff the client's data with the db data to get the patch we need to apply to make the database match the client
			var patch = objectMerge.diff(result, JSON.parse(data.local));
			console.log(JSON.stringify(patch, null,2));

			// Generate sql based off the patch
			let sqlToRun = sqlGen.getSqlFromPatch(patch);
			console.log(sqlToRun);

			// Run the sql in a single transaction
			(async () => {
				const client = await pool.connect();
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
								throw "ERROR: NO CLIENT ID MAPPING";
							}
						} else if (parseInt(insertedPrimaryKey.rows.length) !== 0) {
							console.log(insertedPrimaryKey);
							console.log(insertedPrimaryKey);
							throw "ERROR: UNEXPECTED NUMBER OF RESULTS RETURNED";
						}
					}

					await client.query('COMMIT');
					responseObject.status = "SUCCESS";
				} catch (e) {
					await client.query('ROLLBACK');
					console.log(e);
					responseObject.status = "FAIL";
					responseObject.reason = "DB QUERY ERROR - " + JSON.stringify(e);
				} finally {
					client.release();
					http_server.reply( resp, JSON.stringify(responseObject) );
				}
			})().catch(e => console.error(e.stack));

			/*
			parameterizedQueryPromise(text0 , values).then(res => {
				responseObject.status = "SUCCESS";
				http_server.reply( resp, JSON.stringify(responseObject) );
			}).catch(err => {
				responseObject.status = "FAIL";
				responseObject.reason = err;
				http_server.reply( resp, JSON.stringify(responseObject) );
			});
			*/

		} else {
			responseObject.status = "FAIL";
			responseObject.reason = "PENDING CHANGES - PULL FIRST";
			http_server.reply( resp, JSON.stringify(responseObject) );
		}
	});

} );



http_server.get( 'state', ( obj, resp ) => {
	if( !USE_PG ) {
		return http_server.reply( resp, SAMPLE_STATE );
	}

	getStatePromise().then( function( result ) { http_server.reply( resp, result ); } );
} );

http_server.get( 'state_debug', ( obj, resp ) => {
	if( !USE_PG ) {
		return http_server.reply( resp, JSON.stringify(SAMPLE_STATE, null, 2 ));
	}

	getStatePromise().then( function( result ) { http_server.reply( resp, JSON.stringify( result, null, 2 ) ); } );
} );

function getStatePromise() {
	return new Promise( function( resolve, reject ) {
		var players = queryPromise( `
			SELECT 
			  id as id,
			  name as name,
			  gender as gender,
			  picture as picture
			FROM public.players
		` );

		var teams = queryPromise( `
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

function queryPromise( queryString ) {
	return new Promise( function( resolve, reject ) {
		pool.connect( function( err, client, done ) {
			if ( err ) {
				console.log( "There was a problem getting db connection:" );
				console.log( err );
				process.exit( 1 );
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

function parameterizedQueryPromise( queryString, values ) {
	return new Promise( function( resolve, reject ) {
		pool.connect( function( err, client, done ) {
			if ( err ) {
				console.log( "There was a problem getting db connection:" );
				console.log( err );
				process.exit( 1 );
			}

			client.query(queryString, values, (err, res) => {
				if (err) {
					console.log(err.stack)
				} else {
					console.log(res.rows[0])
				}
			})
		} );
	} );
}

let SAMPLE_STATE = {
	"players": [ {
			"id": 1,
			"name": "Harry",
			"gender": "M",
			"picture": null
		},
		{
			"id": 2,
			"name": "Ron",
			"gender": "M",
			"picture": null
		},
		{
			"id": 3,
			"name": "Hermione",
			"gender": "F",
			"picture": null
		},
		{
			"id": 4,
			"name": "Luna",
			"gender": "F",
			"picture": null
		}
	],
	"teams": [ {
			"games": [ {
					"plateAppearances": [ {
							"id": 3,
							"player_id": 1,
							"result": "4i",
							"location": {
								"x":13,
								"y":14
							},
							"plateAppearanceIndex": 1
						},
						{
							"id": 8,
							"player_id": 2,
							"result": "3",
							"location": {
								"x":13,
								"y":14
							},
							"plateAppearanceIndex": 2
						},
						{
							"id": 7,
							"player_id": 2,
							"result": "0",
							"location": {
								"x":13,
								"y":14
							},
							"plateAppearanceIndex": 3
						},
						{
							"id": 6,
							"player_id": 3,
							"result": "2",
							"location": {
								"x":13,
								"y":14
							},
							"plateAppearanceIndex": 4
						},
						{
							"id": 5,
							"player_id": 3,
							"result": "1",
							"location": {
								"x":13,
								"y":14
							},
							"plateAppearanceIndex": 5
						},
						{
							"id": 4,
							"player_id": 1,
							"result": "3",
							"location": {
								"x":13,
								"y":14
							},
							"plateAppearanceIndex": 6
						}
					],
					"id": 1,
					"opponent": "Upslope",
					"date": "2008-02-21T07:00:00.000Z",
					"park": "Stazio",
					"score_us": 10,
					"score_them": 9,
					"lineup_type":1,
					"lineup": [
						2,
						1,
						3
					]
				},
				{
					"plateAppearances": [],
					"id": 3,
					"opponent": "Nobody",
					"date": "2020-01-23T07:00:00.000Z",
					"park": "Fed Center",
					"score_us": 1,
					"score_them": 1,
					"lineup_type":1,
					"lineup": [
						2,
						1,
						3
					]
				}
			],
			"id": 1,
			"name": "Screwballs"
		},
		{
			"games": [ {
				"plateAppearances": [ {
						"id": 10,
						"player_id": 4,
						"result": "0",
						"location": {
							"x":13,
							"y":14
						},
						"plateAppearanceIndex": 2
					},
					{
						"id": 9,
						"player_id": 4,
						"result": "2",
						"location": {
							"x":13,
							"y":14
						},
						"plateAppearanceIndex": 1
					}
				],
				"id": 2,
				"opponent": "Downslope",
				"date": "2008-03-31T06:00:00.000Z",
				"park": "Mapleton",
				"score_us": 11,
				"score_them": 2,
				"lineup_type":2,
				"lineup": [
					4
				]
			} ],
			"id": 2,
			"name": "Mom's Spaghetti"
		},
		{
			"games": [],
			"id": 3,
			"name": "Empty Team",
			"lineup_type":2
		}
	]
};