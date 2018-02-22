'use strict';

let STATE = {
	teams: [ {
		id: 1,
		name: 'Pizza Team',
		picture: '',
		players: [
			1,
			2,
			3,
			4
		],
		games: [ {
			id: 1,
			name: 'Pizza Team vs Upslope',
			lineup: [
				4,
				2,
				3,
				1
			],
			atbats: [ {
				atbat_count: 1,
				player: 4,
				location: [ 200, 100 ],
				result: 1
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
			4
		],
		games: [ {
			id: 1,
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
				result: 1
			} ]
		} ]
	} ],
	players: [ {
		id: 1,
		name: 'Thomas Brown',
		picture: '/assets/img/thomas.png',
		stats: {}
	}, {
		id: 2,
		name: 'Benjamin Brown',
		picture: '/assets/img/benjamin.png',
		stats: {}
	}, {
		id: 3,
		name: 'Morgan Seifert',
		picture: '/assets/img/morgan.png',
		stats: {}
	}, {
		id: 4,
		name: 'Lauren Brown',
		picture: '/assets/img/lauren.png',
		stats: {}
	} ]
};

function getTeam( team_id, state ){
	return state.teams.reduce( ( prev, curr ) => {
		curr.id === team_id ? curr : prev;
	}, null );
}

function getPlayer( player_id, state ){
	return state.players.reduce( ( prev, curr ) => {
		curr.id === player_id ? curr : prev;
	}, null );
}

function getNextTeamId() {
	return STATE.teams.reduce( ( prev, curr ) => {
		return curr.id > prev ? curr : prev;
	}, 1 );
}

function getNextPlayerId() {
	return STATE.players.reduce( ( prev, curr ) => {
		return curr.id > prev ? curr : prev;
	}, 1 );
}

function getNextGameId() {
	return STATE.teams.reduce( ( prev, curr ) => {
		const id = curr.games.reduce( ( prev, curr ) => {
			return curr.id > prev ? curr : prev;
		}, 1 );

		id > prev ? curr : prev;
	}, 1 );
}

exports.getState = function(){
	return STATE;
};

exports.setState = function( s ){
	STATE = s;
};

exports.addTeam = function( team_name ){
	const id = getNextTeamId();
	let new_state = exports.getState();
	new_state.teams.push( {
		id: id,
		name: team_name,
		picture: '',
		players: [],
		games: []
	} );
	exports.setState( new_state );
};

exports.addPlayer = function( player_name ){
	const id = getNextPlayerId();
	let new_state = exports.getState();
	new_state.players.push( {
		id: id,
		name: player_name,
		picture: '',
		stats: {}
	} );
	exports.setState( new_state );
};

exports.addGame = function( team_id, opposing_team_name ){
	let new_state = exports.getState();
	const id = getNextGameId();
	const team = getTeam( team_id, new_state );
	let last_lineup = [];
	if( team.games.length ){
		let last_game = team.games[ team.games.length - 1 ];
		last_lineup = last_game.lineup.slice();
	}
	team.games.push( {
		id: id,
		name: team.name + " vs " + opposing_team_name,
		lineup: last_lineup,
		atbats: []
	} );
	exports.setState( new_state );
};
