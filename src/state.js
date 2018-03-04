'use strict';

const expose = require( 'expose' );

let STATE = {};

exports.updateState = function(callback) {
	var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            STATE = JSON.parse(xmlHttp.responseText);
            callback();
        }
    }
    xmlHttp.open("GET", "http://localhost:8888/state", true);
    xmlHttp.send(null);
}

exports.getQueryObj = function() {
	let queryString = window.location.search || '';
	if ( queryString[ 0 ] === '?' ) {
		queryString = queryString.slice( 1 );
	}
	let params = {},
		queries, temp, i, l;
	queries = queryString.split( '&' );
	for ( i = 0, l = queries.length; i < l; i++ ) {
		temp = queries[ i ].split( '=' );
		params[ temp[ 0 ] ] = temp[ 1 ];
	}
	return params;
};

exports.getNextTeamId = function() {
	return STATE.teams.reduce( ( prev, curr ) => {
		return curr.id > prev ? curr.id : prev;
	}, 1 ) + 1;
};

exports.getNextPlayerId = function() {
	return STATE.players.reduce( ( prev, curr ) => {
		return curr.id > prev ? curr.id : prev;
	}, 1 ) + 1;
};

exports.getNextGameId = function() {
	return STATE.teams.reduce( ( prev, curr ) => {
		const id = curr.games.reduce( ( prev, curr ) => {
			return curr.id > prev ? curr.id : prev;
		}, 1 );

		return id > prev ? id : prev;
	}, 1 ) + 1;
};

exports.getGame = function( game_id, state ) {
	for ( let team of ( state || STATE ).teams ) {
		for ( let game of team.games ) {
			if ( game.id === game_id ) {
				return game;
			}
		}
	}

	return null;
};

exports.getTeam = function( team_id, state ) {
	return ( state || STATE ).teams.reduce( ( prev, curr ) => {
		return curr.id === parseInt( team_id ) ? curr : prev;
	}, null );
};

exports.getPlayer = function( player_id, state ) {
	return ( state || STATE ).players.reduce( ( prev, curr ) => {
		return curr.id === parseInt( player_id ) ? curr : prev;
	}, null );
};

exports.getPlateAppearance = function( team_id, game_id, player_id, pa_index ) {
	let team = exports.getTeam( team_id );
	let game = exports.getGame( game_id );
	let player = exports.getPlayer( player_id );
	if ( !team || !game || !player ) {
		return null;
	}

	for ( let i = 0; i < game.plateAppearances.length; i++ ) {
		let pa = game.plateAppearances[ i ];
		if ( pa.player_id === player.id && pa.plateAppearanceIndex === pa_index ) {
			return pa;
		}
	}

	let obj = {
		"player_id": player_id,
		"result": '',
		"location": [],
		"plateAppearanceIndex": pa_index
	};

	game.plateAppearances.push( obj );

	return obj;

};

exports.getPlateAppearances = function( team_id, player_id ) {
	let team = exports.getTeam( team_id );
	let plateAppearances = [];

	if ( team.games ) {
		team.games.forEach( game => {
			if ( game.plateAppearances ) {
				const plateAppearancesThisGame = game.plateAppearances.filter(pa => player_id == pa.player_id);
				plateAppearances = plateAppearances.concat(plateAppearancesThisGame);
			}
		});
	}
	return plateAppearances;
};

exports.updatePlateAppearanceResult = function( plateAppearance, result ) {
	plateAppearance.result = result;
	exports.setState( STATE );
};

exports.updatePlateAppearanceLocation = function( plateAppearance, location ) {
	plateAppearance.location = location;
	exports.setState( STATE );
};

exports.updateLineup = function( lineup, player_id, position_index ) {
	let ind = lineup.indexOf( player_id );
	lineup.splice( ind, 1 );
	lineup.splice( position_index, 0, player_id );
	exports.setState( STATE );
	return lineup;
};

exports.getState = function() {
	return STATE;
};

exports.setState = function( s ) {
	STATE = s;
	expose.set_state( 'main', {
		render: true
	} );
};

exports.addTeam = function( team_name ) {
	const id = exports.getNextTeamId();
	let new_state = exports.getState();
	let team = {
		id: id,
		name: team_name,
		picture: '',
		roster: [],
		games: []
	};
	new_state.teams.push( team );
	exports.setState( new_state );
	return team;
};

exports.addPlayer = function( player_name ) {
	const id = exports.getNextPlayerId();
	let new_state = exports.getState();
	let player = {
		id: id,
		name: player_name,
		picture: '',
		stats: {}
	};
	new_state.players.push( player );
	exports.setState( new_state );
	return player;
};

exports.addGame = function( team_id, opposing_team_name ) {
	let new_state = exports.getState();
	const id = exports.getNextGameId();
	const team = exports.getTeam( team_id, new_state );
	let last_lineup = [];
	if ( team.games.length ) {
		let last_game = team.games[ team.games.length - 1 ];
		last_lineup = last_game.lineup.slice();
	}
	let game = {
		id: id,
		opponent: opposing_team_name,
		lineup: last_lineup,
		plateAppearances: []
	};
	team.games.push( game );
	exports.setState( new_state );
	return game;
};

exports.removeTeam = function( team_id ) {
	let new_state = exports.getState();
	new_state.teams = new_state.teams.filter( ( team ) => {
		return team.id !== team_id;
	} );
	exports.setState( new_state );
};

exports.removeGame = function( game_id, team_id ) {
	let new_state = exports.getState();
	let team = exports.getTeam( team_id );
	var index = new_state.teams.indexOf(team);

	team.games = team.games.filter( game => {
		return game.id !== game_id;
	} );

	if (index > -1) {
    	new_state.teams[index] = team;
	} else {
		console.log("Game not found " + game_id);
	}

	exports.setState( new_state );
};

exports.removePlayerFromLineup = function( lineup, player_id ) {
	let index = lineup.indexOf( player_id );
	lineup.splice(index, 1);
	exports.setState( STATE );
};

exports.buildStatsObject = function( team_id, player_id ) {
	let state = exports.getState();
	let team = exports.getTeam( team_id, state );

	let stats = {};
	stats.plateAppearances = 0;
	stats.totalBasesByHit = 0;
	stats.atBats = 0;
	stats.hits = 0;
	stats.doubles = 0;
	stats.triples = 0;
	stats.insideTheParkHR = 0;
	stats.outsideTheParkHR = 0;
	stats.reachsOnError = 0;
	stats.walks = 0;

	let plateAppearances = exports.getPlateAppearances(team_id, player_id);

	plateAppearances.forEach( pa => {
		if(pa.result) {
			stats.plateAppearances++;
			if(pa.result == "BB") {
				stats.walks++; // Boo!
			} else {
				stats.atBats++;
				if(pa.result == "E") {
					stats.reachsOnError++;
				} else if (pa.result == 0) {
					// Intantionally blank
				} else {
					stats.hits++;
					if(pa.result == "1") {
						stats.totalBasesByHit++;
					} else if(pa.result == "2") {
						stats.doubles++;
						stats.totalBasesByHit += 2;
					} else if(pa.result == "3") {
						stats.triples++;
						stats.totalBasesByHit += 3;
					} else if(pa.result == "4i") {
						stats.insideTheParkHR++;
						stats.totalBasesByHit += 4;
					} else if(pa.result == "4o") {
						stats.outsideTheParkHR++;
						stats.totalBasesByHit += 4;
					} 
				}
			}
		}
	});

	if(stats.atBats != 0) {
		stats.battingAverage = (stats.hits/stats.atBats).toFixed(3);
		stats.sluggingPercentage = (stats.totalBasesByHit/stats.atBats).toFixed(3);
	} else {
		stats.battingAverage = "-";
		stats.sluggingPercentage = "-";
	}


	return stats;
};

window.state = exports;
