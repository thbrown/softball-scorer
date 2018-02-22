'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );

const CardTeamList = require( 'card-team-list' );

module.exports = class MainContainer extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose( 'main' );
		this.state = {
			page: 'CardTeamList'
		};
	}

	renderCard( card_name ){
		if( card_name === 'CardTeamList' ) {
			return React.createElement( CardTeamList );
		} else {
			return DOM.div( {}, 'Error, no card named: ' + card_name );
		}
	}

	render() {
		return DOM.div( {
				className: 'no-drag',
				style: {
					height: window.innerHeight + 'px'
				}
			},
			this.renderCard( this.state.page )
		);
	}
};
