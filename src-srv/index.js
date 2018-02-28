'use strict';

const http_server = require( './http-server' );
const { Pool, Client } = require( 'pg' );

let PORT = 8888;
let USE_PG = true;

if ( process.argv.length !== 4 && process.argv.length !== 2 ) {
	console.log( 'Usage: ' + __filename + ' <username> <password>' );
	process.exit( -1 );
} else if ( process.argv.length === 2 ) {
	USE_PG = false;
}

const user = process.argv[ 2 ];
const password = process.argv[ 3 ];
let pool = null;

if( USE_PG ) {
	let pgurl = '35.197.35.206';
	console.log( 'Connecting to pg', pgurl );
	pool = new Pool( {
		user: user,
		host: pgurl,
		database: 'Softball',
		password: password,
		port: 5432,
	} );

	// Test connection
	pool.connect( function( err, client, done ) {
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

http_server.get( 'state', ( obj, resp ) => {
	if( !USE_PG ) {
		return http_server.reply( resp, { error: 'PG Not enabled on server' } );
	}

	getStatePromise().then( function( result ) { http_server.reply( resp, result ); } );
} );

http_server.get( 'state_debug', ( obj, resp ) => {
	if( !USE_PG ) {
		return http_server.reply( resp, { error: 'PG Not enabled on server' } );
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
			  games.date as game_date, 
			  games.opponent as game_opponent, 
			  games.park as game_park, 
			  games.score_us as score_us, 
			  games.score_them as score_them,
			  plate_appearances.id as plate_appearance_id, 
			  plate_appearances.result as result,
			  plate_appearances.location as location,
			  plate_appearances.plate_appearances_index as index,
			  plate_appearances.player_id as player_id,
			  sub_lineup.lineup as lineup,
			  sub_roster.roster as roster
			FROM 
			  public.plate_appearances
			FULL JOIN public.games ON public.games.id=public.plate_appearances.game_id
			FULL JOIN (SELECT public.players_games.game_id as game_id, string_agg(public.players_games.player_id::character, ', ' order by public.players_games.lineup_index) as lineup
			  FROM public.players_games
			  GROUP BY players_games.game_id) as sub_lineup ON sub_lineup.game_id=public.games.id
			FULL JOIN public.teams ON public.games.team_id=public.teams.id
			FULL JOIN (SELECT public.players_teams.team_id as team_id, string_agg(public.players_teams.player_id::character, ', ') as roster
			  FROM public.players_teams
			  GROUP BY public.players_teams.team_id) as sub_roster ON sub_roster.team_id=public.teams.id
			ORDER BY
			  teams.id ASC,
			  games.id ASC;
		` );

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
					if ( plateAppearance.lineup ) {
						newGame.lineup = plateAppearance.lineup.split( ',' ).map( Number );
					}
					newTeam.games.push( newGame );
				}

				if ( plateAppearance.plate_appearance_id ) {
					var newPlateAppearance = {};
					newPlateAppearance.id = plateAppearance.plate_appearance_id;
					newPlateAppearance.player_id = plateAppearance.player_id;
					newPlateAppearance.result = plateAppearance.result;
					if ( plateAppearance.location ) {
						newPlateAppearance.location = plateAppearance.location.split( ',' ).map( Number );
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
