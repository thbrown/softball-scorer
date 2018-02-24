'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const state = require( 'state' );
const CardTeamList = require( 'card-team-list' );
const CardTeam = require( 'card-team' );
const CardLineup = require( 'card-lineup' );
const CardAtBat = require( 'card-at-bat' );

const qs = state.getQueryObj();

module.exports = class MainContainer extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose( 'main' );
		this.state = {
			render: true,
			page: qs.page || 'TeamList',
			team: parseInt( qs.team ) || 1,
			game: parseInt( qs.game ) || 1,
			player: parseInt( qs.player ) || 1,
			atbat: parseInt( qs.atbat ) || 1
		};
	}

	renderCard( card_name ){
		if( card_name === 'TeamList' ) {
			return React.createElement( CardTeamList );
		} else if( card_name === 'Team' ) {
			let team = state.getTeam( this.state.team );
			return React.createElement( CardTeam, {
				team: team
			} );
		} else if( card_name === 'Lineup' ) {
			let team = state.getTeam( this.state.team );
			let game = state.getGame( this.state.game );
			return React.createElement( CardLineup, {
				team: team,
				game: game
			} );
		} else if( card_name === 'Atbat' ) {
			let team = state.getTeam( this.state.team );
			if( !team ) {
				console.error( 'no team', this.state.team );
			}
			let game = state.getGame( this.state.game );
			if( !game ){
				console.error( 'no game', this.state.game );
			}
			let player = state.getPlayer( this.state.player );
			if( !player ){
				console.error( 'no player', this.state.player );
			}
			let atbat = state.getAtbat( team.id, game.id, player.id, this.state.atbat );
			return React.createElement( CardAtBat, {
				team: team,
				game: game,
				player: player,
				atbat: atbat
			} );
		} else {
			return DOM.div( {
				style: {
					color: css.colors.TEXT_LIGHT
				}
			}, 'Error, no card named: ' + card_name );
		}
	}

	render() {
		return DOM.div( {
				style: {
					height: window.innerHeight + 'px'
				}
			},
			this.renderCard( this.state.page )
		);
	}
};
