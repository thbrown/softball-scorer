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

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'Menu'
			} );
		};

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
			}, 				
				DOM.img( {
					src: 'assets/ic_arrow_back_white_36dp_1x.png',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				}),
				DOM.div( {
					style: {
						// display: 'flex',
						justifyContent: 'space-between',
						// Adjusting for back-arrow.
						marginLeft: '60px',
					}
				}, 'Teams' ),
			),
			this.renderTeamList()
		);
	}
};
