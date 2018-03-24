'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const dialog = require( 'dialog' );

const state = require( 'state' );

module.exports = class CardTeamList extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleButtonClick = function( team ){
			expose.set_state( 'main', {
				page: 'Team',
				team: team.id
			} );
		};

		this.handleDeleteClick = function( team, ev ){
			dialog.show_confirm( 'Are you sure you want to delete the team "' + team.name + '"?', () => {
				state.removeTeam( team.id );
			} );
			ev.stopPropagation();
		};

		this.handleCreateClick = function(){
			dialog.show_input( 'Team Name', ( name ) => {
				state.addTeam( name );
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
					let response = JSON.parse(xhr.response);
					if(response.status === "FAIL") {
						buttonDiv.innerHTML = "Push - Error: " + response.reason;
						console.log("FAIL: " + response.reason);
					} else if (response.status === "SUCCESS") {
						buttonDiv.innerHTML = "Push";
						console.log("PUSH WAS SUCCESSFUL! Performing hard sync to reconcile ids");
						state.updateState((status) => {
							console.log("Done with hard sync: " + status);
							expose.set_state( 'main', { render: true } );
						} , true);

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
			this.download(JSON.stringify(state.getState()), 'save' + today + '.json', 'text/plain');
		};
	}

	// https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file
	// This only works in desktop chrome
	download(text, name, type) {
		var a = document.createElement("a");
		var file = new Blob([text], {type: type});
		a.href = URL.createObjectURL(file);
		a.download = name;
		a.click();
	}

	renderTeamList(){
		const s = state.getState();
		let elems = s.teams.map( ( team ) => {
			return DOM.div( {
				team_id: team.id,
				key: 'team' + team.id,
				className: 'list-item',
				onClick: this.handleButtonClick.bind( this, team ),
				style: {
					display: 'flex',
					justifyContent: 'space-between'
				}
			},
				DOM.div( {}, team.name ),
				DOM.img( {
					src: 'assets/ic_close_white_24dp_1x.png',
					className: 'delete-button',
					onClick: this.handleDeleteClick.bind( this, team )
				})
			);
		} );

		elems.push( DOM.div( {
			key: 'newteam',
			className: 'list-item add-list-item',
			onClick: this.handleCreateClick,
		}, '+ Add New Team' ) );

		// TODO: re-render
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

		// TODO: re-render
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
			}, 'Teams' ),
			this.renderTeamList()
		);
	}
};
