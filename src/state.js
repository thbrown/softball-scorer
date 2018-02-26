'use strict';

const expose = require( 'expose' );

let STATE = {
  "players": [
    {
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
  "teams": [
    {
      "games": [
        {
          "plateAppearances": [
            {
              "id": 3,
              "player_id": 1,
              "result": "4",
              "location": [
                1,
                2
              ],
              "plateAppearanceIndex": 1
            },
            {
              "id": 8,
              "player_id": 2,
              "result": "3",
              "location": [
                11,
                12
              ],
              "plateAppearanceIndex": 2
            },
            {
              "id": 7,
              "player_id": 2,
              "result": "0",
              "location": [
                9,
                10
              ],
              "plateAppearanceIndex": 1
            },
            {
              "id": 6,
              "player_id": 3,
              "result": "2",
              "location": [
                7,
                8
              ],
              "plateAppearanceIndex": 2
            },
            {
              "id": 5,
              "player_id": 3,
              "result": "1",
              "location": [
                5,
                6
              ],
              "plateAppearanceIndex": 1
            },
            {
              "id": 4,
              "player_id": 1,
              "result": "3",
              "location": [
                3,
                4
              ],
              "plateAppearanceIndex": 2
            }
          ],
          "id": 1,
          "opponent": "Upslope",
          "date": "2008-02-21T07:00:00.000Z",
          "park": "Stazio",
          "score_us": 10,
          "score_them": 9,
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
          "lineup": [
            2,
            1,
            3
          ]
        }
      ],
      "id": 1,
      "name": "Screwballs",
      "roster": [
        1,
        2,
        3
      ]
    },
    {
      "games": [
        {
          "plateAppearances": [
            {
              "id": 10,
              "player_id": 4,
              "result": "0",
              "location": [
                15,
                16
              ],
              "plateAppearanceIndex": 2
            },
            {
              "id": 9,
              "player_id": 4,
              "result": "2",
              "location": [
                13,
                14
              ],
              "plateAppearanceIndex": 1
            }
          ],
          "id": 2,
          "opponent": "Downslope",
          "date": "2008-03-31T06:00:00.000Z",
          "park": "Mapleton",
          "score_us": 11,
          "score_them": 2,
          "lineup": [
            4
          ]
        }
      ],
      "id": 2,
      "name": "Mom's Spaghetti",
      "roster": [
        4
      ]
    },
    {
      "games": [],
      "id": 3,
      "name": "Empty Team"
    }
  ]
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

exports.getPlateAppearance = function( team_id, game_id, player_id, plateAppearance_index ){
	let team = exports.getTeam( team_id );
	let game = exports.getGame( game_id );
	let player = exports.getPlayer( player_id );
	if( !team || !game || !player ) {
		return null;
	}

	if(plateAppearance.length) {
		for( let i = 0 ; i < plateAppearance.length; i++) {
			if( game.plateAppearances[i].player_id === player.id && i === plateAppearance_index ){
				return game.plateAppearances[i];
			}
		}
	}

	game.plateAppearances.push( {
		player: player_id,
		location: false,
		result: ''
	} );

	return null;
};

exports.updatePlateAppearanceResult = function( plateAppearance, result ){
	plateAppearance.result = result;
	exports.setState( STATE );
};

exports.updatePlateAppearanceLocation = function( plateAppearance, location ){
	plateAppearance.location = location;
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
		roster: [],
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
		plateAppearances: []
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

exports.buildStatsObject = function ( player_id, team_id ) {
	let state = exports.getState();
	let team = exports.getTeam( team_id, state );
	if(team.games) {
		for(let game = 0; game < team.games.length; game ++) {
			if(team.games[game].plateAppearances) {
				for(let plateAppearance = 0; plateAppearance > team.games[game].plateAppearances.length; plateAppearance++) {
					console.log(team.games.plateAppearances[plateAppearance]);
				}
			}
		}
	}
	return {ab:100, avg:.312}
}

window.state = exports;