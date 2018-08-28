'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const state = require( 'state' );
const dialog = require( 'dialog' );
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
const CardPasswordReset = require( 'card-password-reset' );
const CardVerify = require( 'card-verify' );

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

// Team, Player, and game ordering
// Separate urls
// Delete account/data
// Config file for app-level credentials
// Async localstorage interaction
// Bug with editing name
// Shorter Ids

module.exports = class MainContainer extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose( 'main' );

		// Register a service worker to support offline experience and quick subsequent page loads
		if ('serviceWorker' in navigator) {
			// When a new service worker is available, re-load the page
			navigator.serviceWorker.oncontrollerchange = function(controllerchangeevent) {
				if(document.hidden) {
					dialog.show_notification(
						'Softball.app has been updated, this page will be automatically refreshed. You will not lose any data you\'ve entered.'
					,
						function() {
							window.location.reload();
						}
					);
				} else {
					window.location.reload();
				}
			};

			// The actual registration
			window.addEventListener('load', function() {
				navigator.serviceWorker.register('/service-worker');
			});
		}

		// Determine landing card based on url
		let pathArray = window.location.pathname.split('/');
		console.log(pathArray);
		let card = 'Loading';
		let token = undefined;
		if(pathArray[1] === "account" && pathArray[2] === "password-reset") {
			card = 'PasswordReset';
			token = pathArray[3];
		} else if( pathArray[1] === "auth" ) {
			card = 'Auth';
		}
		console.log('Starting on card', card);

	    // TODO: We are conflating react state with app data, we should split AppData into its own class
		// TODO: Shouldn't these all be renamed as ids e.g. teamId, gameId, etc. 
		this.state = {
			render: true,
			page: card,
			team: qs.team || 1,
			game: qs.game || 1,
			player: qs.player || 1,
			plateAppearance: qs.plateAppearance || 1,
			token: token
		};
	}

	renderCard( card_name ){
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
			let isNew = this.state.isNew;
			return React.createElement( CardTeamEdit, {
				team: team,
				isNew: isNew
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
		} else if ( card_name === 'PasswordReset') {
			return React.createElement( CardPasswordReset, {
				token: this.state.token
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