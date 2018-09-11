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
// Delete account/data
// Async localstorage interaction

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

		// When the user pops the state (e.g. on back button press) make sure the react state matches the url.
		window.onpopstate = function() {
			console.log("Pop state");
			let newPage = window.location.pathname;
			expose.set_state( 'main', {
				page: newPage
			} );
		}

		state.loadAppDataFromLocalStorage(); // TODO: do we want to to this inside sync or here?

		// Sync on first load
		setTimeout(state.sync,1);

		// Reload from local storage each time after the window regains focus
		window.addEventListener("focus", function (event) { 
			console.log("FOCUS EVENT");           
			state.loadAppDataFromLocalStorage();            
		}, false);

		let startPage = window.location.pathname;

		this.state = {
			render: true,
			page: startPage
		};
	}

	/**
	 * Checks if the given url matches the path. If it does match this method returns true otherwise it returns false. 
	 * This method also stores any path variables (marked with the ':' prefix) as properties in the passed in state object.
	 */
	static matches( url, path, state ) {
		let urlArray = url.split('/');
		let pathArray = path.split('/');
		let pathVariables = {};
		if(pathArray.length !== urlArray.length) {
			return false;
		}
		for(let i = 1; i < pathArray.length; i++) {
			if(pathArray[i].length > 0 && pathArray[i][0] === ':') {
				pathVariables[pathArray[i].substring(1)] = urlArray[i];
			} else if(urlArray[i] !== pathArray[i]) {
				pathVariables = {};
				return false;
			} 
		}

		// Copy path vars to state if this path matches the url
		let pathVarKeys = Object.keys(pathVariables);
		for(let i = 0; i < pathVarKeys.length; i++) {
			state[pathVarKeys[i]] = pathVariables[pathVarKeys[i]];
		}
		return true;
	}

	// TODO: rename
	renderCard( url ){
		if(url !== window.location.pathname) {
			history.pushState({}, url, url);
		}

		if(MainContainer.matches(url, "/", this.state)) {
			// TODO: maybe this should just redirect to /team
			return React.createElement( CardTeamList );
		} else if(MainContainer.matches(url, "/menu", this.state)) {
			return React.createElement( CardMenu );
		} else if(MainContainer.matches(url, "/menu/login", this.state)) {
			return React.createElement( CardAuth );
		} else if(MainContainer.matches(url, "/menu/signup", this.state)) {
			return React.createElement( CardSignup );
		} else if(MainContainer.matches(url, "/menu/import", this.state)) {
			return React.createElement( CardLoad );
		} else if(MainContainer.matches(url, "/account/password-reset/:token", this.state)) {
			let token = this.state.token;
			return React.createElement( CardPasswordReset, {
				token: token
			} );
		} else if(MainContainer.matches(url, "/teams", this.state)) {
			return React.createElement( CardTeamList );
		} else if(MainContainer.matches(url, "/teams/:teamId", this.state) || MainContainer.matches(url, "/teams/:teamId/games", this.state)) {
			let teamId = this.state.teamId;
			let team = state.getTeam( teamId );
			return React.createElement( CardTeam, {
				team: team,
				tab: 'games'
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/edit", this.state)) {
			let teamId = this.state.teamId;
			let team = state.getTeam( teamId );
			let isNew = this.state.isNew; // TODO: revisit this, what happens if this pages is loaded via external link
			return React.createElement( CardTeamEdit, {
				team: team,
				isNew: isNew
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/stats", this.state)) {
			let teamId = this.state.teamId;
			let team = state.getTeam( teamId );
			return React.createElement( CardTeam, {
				team: team,
				tab: 'stats'
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/stats/player/:playerId", this.state)) {
			return React.createElement( CardSpray, {
				playerId: this.state.playerId,
				teamId: this.state.teamId
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/games/:gameId", this.state) || MainContainer.matches(url, "/teams/:teamId/games/:gameId/lineup", this.state)) {
			let team = state.getTeam( this.state.teamId );
			let game = state.getGame( this.state.gameId );
			return React.createElement( CardGame, {
				team: team,
				game: game,
				tab: 'lineup'
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/games/:gameId/scorer", this.state)) {
			let team = state.getTeam( this.state.teamId );
			let game = state.getGame( this.state.gameId );
			return React.createElement( CardGame, {
				team: team,
				game: game,
				tab: 'scorer'
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/games/:gameId/player-selection", this.state)) {
			let team = state.getTeam( this.state.teamId );
			let game = state.getGame( this.state.gameId );
			return React.createElement( CardPlayerSelection, {
				team: team,
				game: game,
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/games/:gameId/edit", this.state)) {
			let team = state.getTeam( this.state.teamId );
			let game = state.getGame( this.state.gameId );
			return React.createElement( CardGameEdit, {
				team: team,
				game: game
			} );
		} else if(MainContainer.matches(url, "/teams/:teamId/games/:gameId/plateAppearances/:plateAppearanceId", this.state)) {
			let team = state.getTeam( this.state.teamId );
			let game = state.getGame( this.state.gameId );
			let plateAppearance = state.getPlateAppearance( this.state.plateAppearanceId );
			let player = state.getPlayer( plateAppearance.player_id );
			let plateAppearances = state.getPlateAppearancesForPlayerInGame( plateAppearance.player_id, this.state.gameId );
			return React.createElement( CardPlateAppearance, {
				team: team,
				game: game,
				player: player,
				plateAppearance: plateAppearance,
				plateAppearances: plateAppearances
			} );
		} else {
			return DOM.div( {
				style: {
					color: css.colors.TEXT_LIGHT
				}
			}, '404 this resource could not be found');
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