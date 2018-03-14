'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );

const state = require( 'state' );
const qs = state.getQueryObj();

module.exports = class CardLoading extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};
	}

	componentDidMount(){
		state.updateState(function( err ) {
			if( err ) {
				console.log( 'Error initializing state', err );
			} else {
				expose.set_state( 'main', {
					page: qs.page || 'TeamList'
				} );
			}
		}, false);
	}

	render() {
		return 	DOM.div( {
			},
			'Loading...'
		);
	}
};
