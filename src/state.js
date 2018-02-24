'use strict';

const expose = require( 'expose' );

let STATE = {
	teams: [ {
		id: 1,
		name: 'Pizza Team',
		picture: '',
		players: [
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10
		],
		games: [ {
			id: 1,
			name: 'Pizza Team vs Upslope',
			lineup: [
				4,
				2,
				3,
				1,
				6,
				5,
				10,
				7,
				9,
				8
			],
			atbats: [ {
				atbat_count: 1,
				player: 4,
				location: [ 200, 100 ],
				result: '1'
			} ]
		} ]
	}, {
		id: 2,
		name: 'Dance Party Team',
		picture: '',
		players: [
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10
		],
		games: [ {
			id: 2,
			name: 'Dance Party Team vs Upslope',
			lineup: [
				1,
				2,
				3,
				4
			],
			atbats: [ {
				atbat_count: 1,
				player: 4,
				location: [ 200, 100 ],
				result: '1'
			} ]
		} ]
	} ],
	players: [ {
		id: 1,
		name: 'Thomas',
		picture: '/assets/img/default.png',
		gender: 'm',
		stats: {}
	}, {
		id: 2,
		name: 'Benjaminbread',
		picture: '/assets/img/default.png',
		gender: 'm',
		stats: {}
	}, {
		id: 3,
		name: 'Morgan',
		picture: '/assets/img/default.png',
		gender: 'f',
		stats: {}
	}, {
		id: 4,
		name: 'Lauren',
		picture: '/assets/img/default.png',
		gender: 'f',
		stats: {}
	}, {
		id: 5,
		name: 'Katelyn',
		picture: '/assets/img/default.png',
		gender: 'f',
		stats: {}
	}, {
		id: 6,
		name: 'Katie',
		picture: '/assets/img/default.png',
		gender: 'f',
		stats: {}
	}, {
		id: 7,
		name: 'Becca',
		picture: '/assets/img/default.png',
		gender: 'f',
		stats: {}
	}, {
		id: 8,
		name: 'Misha',
		picture: '/assets/img/default.png',
		gender: 'm',
		stats: {}
	}, {
		id: 9,
		name: 'Shane',
		picture: '/assets/img/default.png',
		gender: 'm',
		stats: {}
	}, {
		id: 10,
		name: 'Geoff',
		picture: '/assets/img/default.png',
		gender: 'm',
		stats: {}
	} ]
};

exports.getQueryObj = function(){
	let queryString = window.location.search || '';
	if( queryString[ 0 ] === '?' ) {
		queryString = queryString.slice( 1 );
	}
	let params = {}, queries, temp, i, l;
	queries = queryString.split( '&' );
	for ( i = 0, l = queries.length; i < l; i++ ) {
		temp = queries[i].split( '=' );
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

exports.getGame = function( game_id, state ){
	for( let team of ( state || STATE ).teams ) {
		for( let game of team.games ) {
			if( game.id === game_id ) {
				return game;
			}
		}
	}

	return null;
};

exports.getTeam = function( team_id, state ){
	return ( state || STATE ).teams.reduce( ( prev, curr ) => {
		return curr.id === parseInt( team_id ) ? curr : prev;
	}, null );
};

exports.getPlayer = function( player_id, state ){
	return ( state || STATE ).players.reduce( ( prev, curr ) => {
		return curr.id === parseInt( player_id ) ? curr : prev;
	}, null );
};

exports.getAtbat = function( team_id, game_id, player_id, atbat_index ){
	let team = exports.getTeam( team_id );
	let game = exports.getGame( game_id );
	let player = exports.getPlayer( player_id );
	if( !team || !game || !player ) {
		return null;
	}

	for( let atbat of game.atbats ) {
		if( atbat.player === player.id && atbat.atbat_count === atbat_index ){
			return atbat;
		}
	}

	game.atbats.push( {
		atbat_count: atbat_index,
		player: player_id,
		location: false,
		result: ''
	} );

	return null;
};

exports.updateAtbatResult = function( atbat, result ){
	atbat.result = result;
	exports.setState( STATE );
};

exports.updateAtbatLocation = function( atbat, location ){
	atbat.location = location;
	exports.setState( STATE );
};

exports.updateLineup = function( lineup, player_id, position_index ){
	let ind = lineup.indexOf( player_id );
	lineup.splice( ind, 1 );
	lineup.splice( position_index, 0, player_id );
	exports.setState( STATE );
	return lineup;
};

exports.getState = function(){
	return STATE;
};

exports.setState = function( s ){
	STATE = s;
	expose.set_state( 'main', {
		render: true
	} );
};

exports.addTeam = function( team_name ){
	const id = exports.getNextTeamId();
	let new_state = exports.getState();
	let team = {
		id: id,
		name: team_name,
		picture: '',
		players: [],
		games: []
	};
	new_state.teams.push( team );
	exports.setState( new_state );
	return team;
};

exports.addPlayer = function( player_name ){
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

exports.addGame = function( team_id, opposing_team_name ){
	let new_state = exports.getState();
	const id = exports.getNextGameId();
	const team = exports.getTeam( team_id, new_state );
	let last_lineup = [];
	if( team.games.length ){
		let last_game = team.games[ team.games.length - 1 ];
		last_lineup = last_game.lineup.slice();
	}
	let game = {
		id: id,
		name: team.name + " vs " + opposing_team_name,
		lineup: last_lineup,
		atbats: []
	};
	team.games.push( game );
	exports.setState( new_state );
	return game;
};

exports.removeTeam = function( team_id ){
	let new_state = exports.getState();
	new_state.teams = new_state.teams.filter( ( team ) => {
		return team.id !== team_id;
	} );
	exports.setState( new_state );
};

window.state = exports;
