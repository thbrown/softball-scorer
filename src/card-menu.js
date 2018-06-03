'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const dialog = require( 'dialog' );

const CardPlayerList = require( 'card-player-list' );
const CardGameList = require( 'card-game-list' );

let tab = 'games';

module.exports = class CardTeam extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleTeamsClick = function() {
			expose.set_state( 'main', {
				page: 'TeamList'
			} );
		};

		this.handleLoginClick = function() {
			expose.set_state( 'main', {
				page: 'Auth'
			} );
		};

		this.handleSyncClick = function() {
			let buttonDiv = document.getElementById('pull');
			buttonDiv.innerHTML = "Pull (In Progress)";
			state.updateState((error) => {
				if(error) {
					buttonDiv.innerHTML = "Pull - Error: " + error;
					console.log("Pull failed: " + error);
				} else {
					buttonDiv.innerHTML = "Pull";
					console.log("Pull Succeeded");
				}
				expose.set_state( 'main', { render: true } );
			} , false );
		};

		this.handleHardSyncClick = function( ev ) {
			dialog.show_confirm( 'Are you sure you want do a hard pull? This will erase all local changes.', () => {
				state.updateState((status) => {
					console.log("Done with sync: " + status);
					expose.set_state( 'main', { render: true } );
				} , true);
			} );
			ev.stopPropagation();
		};

		this.handlePushClick = function() {
			let buttonDiv = document.getElementById('push');
			buttonDiv.innerHTML = "Push (In Progress)";

			var xhr = new XMLHttpRequest();
			xhr.open("POST", state.getServerUrl('state') , true);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.onreadystatechange = function() {
				if (xhr.readyState === XMLHttpRequest.DONE) {
					console.log("Status", xhr.status);
					if(xhr.status === 204) {
						buttonDiv.innerHTML = "Push";
						console.log("PUSH WAS SUCCESSFUL! Performing hard sync to reconcile ids");
						state.updateState((status) => {
							console.log("Done with hard sync" );
							expose.set_state( 'main', { render: true } );
						} , true);
					} else {
						let response = JSON.parse(xhr.response);
						buttonDiv.innerHTML = "Push - Error: " + response.errors[0];
						console.log("FAIL: " + response.errors[0]);
					}
				}
			};
			xhr.send(JSON.stringify({
				local: JSON.stringify(state.getState()),
				ancestor: JSON.stringify(state.getAncestorState())
			}));
		};

		this.handleSaveClick = function() {
			var today = new Date().getTime();
			this.download(JSON.stringify(state.getState(), null, 2), 'save' + today + '.json', 'text/plain');
		};
	}

	// https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file
	// TODO: cross-browser test
	download(text, name, type) {
		var a = document.createElement("a");
		var file = new Blob([text], {type: type});
		a.href = URL.createObjectURL(file);
		a.download = name;
		a.click();
	}

	renderMenuOptions(){
		const s = state.getState();
		let elems = [];

		elems.push( DOM.div( {
			key: 'teams',
			id: 'teams',
			className: 'list-item',
			onClick: this.handleTeamsClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Teams' ) );

		elems.push( DOM.div( {
			key: 'login',
			id: 'login',
			className: 'list-item',
			onClick: this.handleLoginClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Login' ) );

		elems.push( DOM.div( {
			key: 'pull',
			id: 'pull',
			className: 'list-item',
			onClick: this.handleSyncClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Pull' ) );

		elems.push( DOM.div( {
			key: 'hardPull',
			id: 'hardPull',
			className: 'list-item',
			onClick: this.handleHardSyncClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Hard Pull' ) );

		elems.push( DOM.div( {
			key: 'push',
			id: 'push',
			className: 'list-item',
			onClick: this.handlePushClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Push' ) );

		elems.push( DOM.div( {
			key: 'save',
			className: 'list-item',
			onClick: this.handleSaveClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Save as File' ) );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				style: {
				}
			},
			DOM.div( {
				className: 'card-title'
			}, 'Menu' ),
			this.renderMenuOptions()
		);
	}
};
