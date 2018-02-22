'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const state = require( 'state' );

module.exports = class CardTeamList extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};
	}

	renderTeamList(){
		const s = state.getState();
		let elems = s.teams.map( ( team ) => {
			return DOM.div( {
				key: 'team' + team.id,
				className: 'list-item',
				style: {
					display: 'flex',
					justifyContent: 'space-between'
				}
			},
				DOM.p( {}, team.name ),
				DOM.p( { className: 'delete-button' }, 'X' )
			);
		} );

		elems.push( DOM.div( {
			key: 'newteam',
			className: 'list-item',
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
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
			}, 'Team List' ),
			this.renderTeamList()
		);
	}
};
