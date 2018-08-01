'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const state = require( 'state' );
const CardGame = require( 'card-game' );
const CardGameEdit = require( 'card-game-edit' );
const CardPlateAppearance = require( 'card-plate-appearance' );
const CardLoading = require( 'card-loading' );
const CardPlayerSelection = require( 'card-player-selection' );
const CardTeam = require( 'card-team' );
const CardTeamEdit = require( 'card-team-edit' );
const CardTeamList = require( 'card-team-list' );
const CardMenu = require( 'card-menu' );
const CardAuth = require( 'card-auth' );
const CardSpray = require( 'card-spray' );
const CardSignup = require( 'card-signup' );
const CardLoad = require( 'card-load' );

const qs = state.getQueryObj();

// TODO
// Players List
// Edit Player
// Length limitations
// Disable submit button on signin
// Text directions?
// Sample data?

// Smoother click and drag
// Use svgs
// Weirdness adding player mid-game
// Scroll bars on desktop

// Long names overlap back button on AP page

module.exports = class MainContainer extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose( 'main' );
		// Shouldn't these all be renamed as ids e.g. teamId, gameId, etc.
		this.state = {
			render: true,
			page: 'Loading',
			team: qs.team || 1,
			game: qs.game || 1,
			player: qs.player || 1,
			plateAppearance: qs.plateAppearance || 1
		};
	}

	renderCard( card_name ){
		if ( card_name !== 'Loading' ) {
			state.saveStateToLocalStorage();
		}

		if( card_name === 'Loading' ) {
			return React.createElement( CardLoading );
		} else if( card_name === 'Menu' ) {
			return React.createElement( CardMenu );
		} else if( card_name === 'Auth' ) {
			return React.createElement( CardAuth );
		} else if( card_name === 'Signup' ) {
			return React.createElement( CardSignup );
		} else if( card_name === 'TeamList' ) {
			return React.createElement( CardTeamList );
		} else if( card_name === 'Team' ) {
			let team = state.getTeam( this.state.team );
			return React.createElement( CardTeam, {
				team: team
			} );
		} else if( card_name === 'TeamEdit' ) {
			let team = state.getTeam( this.state.team );
			return React.createElement( CardTeamEdit, {
				team: team
			} );
		} else if( card_name === 'Game' ) {
			let team = state.getTeam( this.state.team );
			let game = state.getGame( this.state.game );
			return React.createElement( CardGame, {
				team: team,
				game: game
			} );
		} else if( card_name === 'GameEdit' ) {
			let game = state.getGame( this.state.game );
			return React.createElement( CardGameEdit, {
				game: game
			} );
		} else if( card_name === 'PlateAppearance' ) {
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
			let plateAppearance = state.getPlateAppearance( this.state.plateAppearance );
			let plateAppearances = state.getPlateAppearancesForPlayerInGame( this.state.player, this.state.game );
			return React.createElement( CardPlateAppearance, {
				team: team,
				game: game,
				player: player,
				plateAppearance: plateAppearance,
				plateAppearances: plateAppearances
			} );
		} else if ( card_name === 'PlayerSelection' ) {
			let team = state.getTeam( this.state.team );
			if( !team ) {
				console.error( 'no team', this.state.team );
			}
			let game = state.getGame( this.state.game );
			if( !game ){
				console.error( 'no game', this.state.game );
			}
			return React.createElement( CardPlayerSelection, {
				team: team,
				game: game,
			} );
		} else if ( card_name === 'Spray' ) {
			return React.createElement( CardSpray, {
				playerId: this.state.player,
				teamId: this.state.team
			} );
		} else if ( card_name === 'Load') {
			return React.createElement( CardLoad );
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
