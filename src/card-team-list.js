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
			console.log("Starging Sync");
			state.updateState( (status) => {console.log("Done with sync: " + status)} );
		};

		this.handlePushClick = function() {
			console.log(this);
		};
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
				DOM.p( {}, team.name ),
				DOM.p( {
					className: 'delete-button',
					onClick: this.handleDeleteClick.bind( this, team )
				}, 'X' )
			);
		} );

		elems.push( DOM.div( {
			key: 'newteam',
			className: 'list-item',
			onClick: this.handleCreateClick,
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, '+ Add New Team' ) );

		elems.push( DOM.div( {
			key: 'sync',
			className: 'list-item',
			onClick: this.handleSyncClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Sync' ) );

		elems.push( DOM.div( {
			key: 'push',
			className: 'list-item',
			onClick: this.handlePushClick.bind( this),
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, 'Push' ) );

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
