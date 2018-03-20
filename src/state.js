'use strict';

const expose = require( 'expose' );
const objectMerge = require( '../object-merge.js' );

let DATABASE_STATE;
let STATE;

exports.getServerUrl = function(path) {
	return "http://pizzaman:8888" + path;
};

exports.updateState = function(callback, force) { // TODO: swap param order?

	let should_load_from_local_state = !STATE && localStorage && localStorage.LOCAL_STATE && localStorage.DATABASE_STATE;

	// TODO: block concurrent syncs or at least disable the buttons in the ui
	if( should_load_from_local_state ) {
		// TODO: do we need to do some basic validation here?
		try {
			STATE = JSON.parse(localStorage.LOCAL_STATE);
			DATABASE_STATE = JSON.parse(localStorage.DATABASE_STATE);
			console.log("State loaded from local storage");
			callback( null, STATE );
		} catch( e ) {
			console.warn( 'Error loading from local state:', e );
			should_load_from_local_state = false;
		}
	}

	if( !should_load_from_local_state ) {
		var xmlHttp = new XMLHttpRequest();
		// use fetch api for this instead of xmlhttp, its much easier (uses promises)
		xmlHttp.onreadystatechange = function() {
			if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
				try {
					if(STATE && (force === false)) {
						STATE = exports.merge(STATE, DATABASE_STATE, JSON.parse(xmlHttp.responseText));
					} else {
						STATE = JSON.parse(xmlHttp.responseText);
					}
					DATABASE_STATE = JSON.parse(xmlHttp.responseText);
					console.log("State loaded from API call");
					callback( "SUCCESS", STATE );
				} catch(error) {
					callback( error );
					console.log("There was an error while attempting to load state from API call");
					console.log(error);
				}
			}
		};
		xmlHttp.open("GET", exports.getServerUrl('/state') , true);
		xmlHttp.send(null);
	}
};

exports.saveStateToLocalStorage = function() {
	localStorage.setItem("LOCAL_STATE", JSON.stringify(STATE));
	localStorage.setItem("DATABASE_STATE", JSON.stringify(DATABASE_STATE));
};

function isEmpty(obj) {
	for(var prop in obj) {
		if(obj.hasOwnProperty(prop)) {
			return false;
		}
	}

	return JSON.stringify(obj) === JSON.stringify({});
}

exports.merge = function(mine, ancestor, yours) {

	let myChangesOnly = objectMerge.diff(ancestor, mine);
	let yourChangesOnly = objectMerge.diff(ancestor, yours);
	if(!isEmpty(myChangesOnly) && !isEmpty(yourChangesOnly)) {
		let myChangesWin = objectMerge.diff3(mine, ancestor, yours);
		let yourChangesWin = objectMerge.diff3(yours, ancestor, mine);
		if(JSON.stringify(myChangesWin) === JSON.stringify(yourChangesWin)) { // Does this need to be stable to prevent different orderings from returning false
			console.log("Remote and local changes merged (No Conflicts)");
			console.log(JSON.stringify(myChangesWin,null,2));
			let myChangesWinResult = objectMerge.patch(ancestor,myChangesWin);
			return myChangesWinResult;
		} else {
			console.log(JSON.stringify(myChangesWin,null,2));
			console.log(JSON.stringify(yourChangesWin,null,2));
			console.log("Conflicts! Local changes and remote changes were detected but not merged due to conflicts");
			throw "Conflicts detected";
		}
	} else if(!isEmpty(myChangesOnly)) {
		console.log("Local changes merged");
		console.log(JSON.stringify(myChangesOnly,null,2));
		return objectMerge.patch(ancestor,myChangesOnly);
	} else if(!isEmpty(yourChangesOnly)) {
		console.log("Remote changes merged");
		console.log(JSON.stringify(yourChangesOnly,null,2));
		return objectMerge.patch(ancestor,yourChangesOnly);
	} else {
		console.log("No changes detected");
		return ancestor;
	}
};

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

exports.getNextPlateAppearanceId = function() {
	return STATE.teams.reduce( ( prev, curr ) => {
		const id = curr.games.reduce( ( prev, curr ) => {
			const id2 = curr.plateAppearances.reduce( ( prev, curr ) => {
				return curr.id > prev ? curr.id : prev;
			}, 1 );
			return id2 > prev ? id2 : prev;
		}, 1 );
		return id > prev ? id : prev;
	}, 1 ) + 1;
};

exports.getNextPlateAppearanceNumber = function( game_id ) {
	let plateAppearances = exports.getGame( game_id ).plateAppearances;
	let nextPlateAppearanceIndex = 1; // Start at 0 or 1?
	if(plateAppearances && plateAppearances.length > 0) {
		nextPlateAppearanceIndex = Math.max.apply(Math,plateAppearances.map(function(o){return o.plateAppearanceIndex;})) + 1;
	}
	return nextPlateAppearanceIndex;
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

exports.getAllPlayers = function () {
	return STATE.players;
};

// TODO: allow for passing team and game ids to improve perf
exports.getPlateAppearance = function( pa_id, state ) {
	for ( let team of ( state || STATE ).teams ) {
		for ( let game of team.games ) {
			for ( let pa of game.plateAppearances ) {
				if ( pa.id === pa_id ) {
					return pa;
				}
			}
		}
	}
	return null;
};

exports.getPlateAppearancesForGame = function( game_id ) {
	let game = exports.getGame( game_id );
	if (!game) {
		return null;
	}
	return game.plateAppearances;
};

exports.getPlateAppearancesForPlayerInGame = function( player_id, game_id ) {
	let game = exports.getGame( game_id );
	let player = exports.getPlayer( player_id );
	if (!game || !player ) {
		return null;
	}
	return game.plateAppearances.filter( pa => pa.player_id === player_id );
};

exports.getPlateAppearances = function( team_id, player_id ) {
	let team = exports.getTeam( team_id );
	let plateAppearances = [];

	if ( team.games ) {
		team.games.forEach( game => {
			if ( game.plateAppearances ) {
				const plateAppearancesThisGame = game.plateAppearances.filter(pa => player_id === pa.player_id);
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
	plateAppearance.location = {};
	plateAppearance.location.x = location[0];
	plateAppearance.location.y = location[1];
	exports.setState( STATE );
};

exports.updateLineup = function( lineup, player_id, position_index ) {
	let ind = lineup.indexOf( player_id );
	lineup.splice( ind, 1 );
	lineup.splice( position_index, 0, player_id );
	exports.setState( STATE );
	return lineup;
};

exports.getAncestorState = function() {
	return DATABASE_STATE;
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

exports.addPlayerToLineup = function( lineup, player_id ) {
	lineup.push(player_id);
	exports.setState( STATE );
};

exports.addPlayer = function( player_name, gender ) {
	const id = exports.getNextPlayerId();
	let new_state = exports.getState();
	let player = {
		id: id,
		name: player_name,
		gender: gender,
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
		date: (new Date().getTime()),
		park: "Stazio",
		score_us: 0,
		score_them: 0,
		lineup_type: 2,
		plateAppearances: []
	};
	team.games.push( game );
	exports.setState( new_state );
	return game;
};

exports.addPlateAppearance = function ( player_id, game_id, team_id ) {
	let new_state = exports.getState();
	let game = exports.getGame( game_id );
	let plateAppearances = game.plateAppearances;
	let plateAppearanceIndex = exports.getNextPlateAppearanceNumber( game_id );
	let id = exports.getNextPlateAppearanceId();
	let plateAppearance = {
		id: id,
		player_id: player_id,
		game_id: game_id,
		team_id: team_id,
		plateAppearanceIndex: plateAppearanceIndex
	};
	plateAppearances.push( plateAppearance );
	exports.setState( new_state );
	return plateAppearance;
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
			if(pa.result === "BB") {
				stats.walks++; // Boo!
			} else {
				stats.atBats++;
				if(pa.result === "E") {
					stats.reachsOnError++;
				} else if (pa.result == 0) {
					// Intantionally blank
				} else {
					stats.hits++;
					if(pa.result === "1") {
						stats.totalBasesByHit++;
					} else if(pa.result === "2") {
						stats.doubles++;
						stats.totalBasesByHit += 2;
					} else if(pa.result === "3") {
						stats.triples++;
						stats.totalBasesByHit += 3;
					} else if(pa.result === "4i") {
						stats.insideTheParkHR++;
						stats.totalBasesByHit += 4;
					} else if(pa.result === "4o") {
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
