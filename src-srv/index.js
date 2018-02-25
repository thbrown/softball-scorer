'use strict';

const http_server = require( './http-server' );
const { Pool, Client } = require('pg');

const PORT = 8888;

if (process.argv.length != 4) {
    console.log("Usage: " + __filename + " <username> <password>");
    process.exit(-1);
}

const user = process.argv[2];
const password = process.argv[3];

const pool = new Pool({
	user: user,
	host: '35.197.35.206',
	database: 'Softball',
	password: password,
	port: 5432,
});

// Test connection
pool.connect(function(err, client, done) {
	if (err) {
	    console.log("There was a problem getting db connection:");
	    console.log(err);
	    process.exit(1);
	}
});

process.on( 'SIGINT', function() {
	console.log( 'SIGINT' );
	process.exit();
} );
process.on( 'SIGTERM', function() {
	console.log( 'SIGTERM' );
	process.exit();
} );
process.on( 'exit', function() {
	process.stdout.write( "Bye\n" );
} );

http_server.start( PORT, __dirname + '/..' );
console.log( 'Now listening on port: ' + PORT );

//localhost:8080/test as a GET request will trigger this function
http_server.get( 'test', ( obj, resp ) => {
	console.log( 'Triggered "test" GET request' );
	http_server.reply( resp, 'This is a test GET result' );
} );

//localhost:8080/test as a POST request will trigger this function
http_server.post( 'compile', ( obj, resp, data ) => {
	console.log( 'Triggered "test" POST request', data );
	http_server.reply( resp, 'This is a test POST result' );
} );

http_server.get( 'state', ( obj, resp ) => {
 	getStatePromise().then(function(result) { http_server.reply( resp, result);});
});

http_server.get( 'state_debug', ( obj, resp ) => {
 	getStatePromise().then(function(result) { http_server.reply( resp, JSON.stringify(result, null, 2));});
});

function getStatePromise() {
	return new Promise(function(resolve,reject) {
		var players = queryPromise(`SELECT * FROM public.players`);
		
		var teams = queryPromise(`
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
			  plate_appearances.result as plate_appearance_result,
			  plate_appearances.location as plate_appearance_hit_location,
			  plate_appearances.plate_appearances_index as plate_appearance_index,
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
		`);

		Promise.all([players, teams]).then(function(values) {
			var state = {};

			// Players
			state.players = [];
			state.players = values[0].rows;

			// Teams
			let plateAppearances = values[1].rows;
			let teamIdSet = new Set();
			let gameIdSet = new Set();
			let teams = [];

			for(let i = 0; i < plateAppearances.length; i++) {
				let plateAppearance = plateAppearances[i];

				if(plateAppearance.team_id && !teamIdSet.has(plateAppearance.team_id)) {
					teamIdSet.add(plateAppearance.team_id);
					var newTeam = {};
					newTeam.games = [];
					newTeam.team_id = plateAppearance.team_id;
					newTeam.name = plateAppearance.team_name;
					newTeam.roster = plateAppearance.roster;
					teams.push(newTeam);
				}

				if(plateAppearance.game_id && !gameIdSet.has(plateAppearance.game_id)) {
					gameIdSet.add(plateAppearance.game_id);
					var newGame = {};
					newGame.plateAppearances = [];
					newGame.game_id = plateAppearance.game_id;
					newGame.opponent = plateAppearance.game_opponent;
					newGame.date = plateAppearance.game_date;
					newGame.park = plateAppearance.game_park;
					newGame.score_us = plateAppearance.score_us;
					newGame.score_them = plateAppearance.score_them;
					newGame.lineup = plateAppearance.lineup;
					newTeam.games.push(newGame);
				}

				if(plateAppearance.ab_id) {
					var newPlateAppearance = {};
					newPlateAppearance.plateAppearance_id = plateAppearance.ab_id;
					newPlateAppearance.player_id = plateAppearance.player_id;
					newPlateAppearance.result = plateAppearance.ab_result;
					newPlateAppearance.location = plateAppearance.ab_hit_location;
					newPlateAppearance.plateAppearanceIndex = plateAppearance.ab_index;
					newGame.plateAppearances.push(newPlateAppearance);
				}
			}
			state.teams = teams;
			resolve(state);
		});
	});
}

function queryPromise(queryString) {
	return new Promise(function(resolve,reject) {
		pool.connect(function(err, client, done) {
			if (err) {
			    console.log("There was a problem getting db connection:");
			    console.log(err);
			    process.exit(1);
			}

			client.query(queryString, function (err, result) {
			    done();
			    if (err) {
			        console.log(err);
			        reject(err);
			    } else {
			    	resolve(result);
				}
			});
		});
	});
}




	
