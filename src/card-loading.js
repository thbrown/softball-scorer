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

		// Do an asynchronous sync so the ui loads quickly and get's the data from the network later
		// TODO: If the load is async, consider removing this whole card and moving to code to main-container
		// setTimeout(state.sync,1); .. moved to main container

		expose.set_state( 'main', {
			page: '/team'
		} );

		// Moved most of this to the main container
		// Visibility changes should load/save data from/to storage to prevent inconsistencies between tabs
		//window.addEventListener("focus", function (event) { 
		//	console.log("FOCUS EVENT");           
		//	state.loadAppDataFromLocalStorage();            
		//}, false);
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
