'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );

module.exports = class MainContainer extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose( 'main' );
		this.state = {
			current_file: null
		};
	}

	render() {
		return DOM.div( {
				className: 'no-drag',
				style: {
					height: window.innerHeight + 'px'
				}
			},
			DOM.div()
		);
	}
};
