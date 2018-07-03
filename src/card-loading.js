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

	async componentDidMount(){
		await state.sync();
		expose.set_state( 'main', {
			page: qs.page || 'TeamList'
		} );
	}

	render() {
		return 	DOM.div( {
				className: 'card'
			},
			'Loading...'
		);
	}
};
