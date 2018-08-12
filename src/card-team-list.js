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

		this.handleTeamClick = function( team ) {
			expose.set_state( 'main', {
				page: 'Team',
				team: team.id
			} );
		};

		this.handleEditClick = function( team, ev ) {
			expose.set_state( 'main', {
				page: 'TeamEdit',
				team: team.id,
				isNew: false
			} );
			ev.stopPropagation();
		};

		this.handleCreateClick = function() {
			let team = state.addTeam( '' );
			expose.set_state( 'main', {
				page: 'TeamEdit',
				team: team.id,
				isNew: true
			} );
		};
	}

	renderTeamList() {
		const s = state.getLocalState();
		let elems = s.teams.map( ( team ) => {
			return DOM.div( {
					team_id: team.id,
					key: 'team' + team.id,
					className: 'list-item',
					onClick: this.handleTeamClick.bind( this, team ),
					style: {
						display: 'flex',
						justifyContent: 'space-between'
					}
				},
				DOM.div( {					
					className: 'preventOverflow'
				}, team.name ),
				DOM.div( {
					style: {
						display: 'flex'
					}}, 
					DOM.img( {
						src: 'assets/edit.svg',
						alt: 'edit',
						className: 'delete-button', // TODO: more generic css
						onClick: this.handleEditClick.bind( this, team )
					} )
				)
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
				className: 'card',
				style: {}
			},
			DOM.div( {
					className: 'card-title'
				},
				DOM.img( {
					src: 'assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				} ),
				DOM.div( {
					style: {
						//display: 'flex',
						justifyContent: 'space-between',
						// Adjusting for back-arrow.
						//marginLeft: '60px',
					}
				}, 'Teams' ),
			),
			this.renderTeamList()
		);
	}
};