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
		state.loadAppDataFromLocalStorage();
		setTimeout(state.sync(),1); // Async sync
		expose.set_state( 'main', {
			page: qs.page || 'TeamList'
		} );

		// Visibility changes should load/save data from/to storage to prevent inconsistencies between tabs
		window.addEventListener("focus", function (event) { 
			console.log("FOCUS EVENT");           
			state.loadAppDataFromLocalStorage();            
		}, false);
		//window.addEventListener("blur", function (event) {
		//	state.saveAppDataToLocalStorage();
		//}, false);
	}

	render() {
		return 	DOM.div( {
				className: 'card'
			},
			'Loading...'
		);
	}
};
