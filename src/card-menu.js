'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const dialog = require( 'dialog' );

const state = require( 'state' );
const objectMerge = require( '../object-merge.js' );
const hasher = require( 'object-hash' );

module.exports = class CardMenu extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleTeamsClick = function() {
			expose.set_state( 'main', {
				page: '/teams'
			} );
		};

		this.handleLoginClick = function() {
			expose.set_state( 'main', {
				page: '/menu/login'
			} );
		};

		this.handleSyncClick = async function() {
			let buttonDiv = document.getElementById( 'sync' );
			buttonDiv.innerHTML = "Sync (In Progress)";
			buttonDiv.classList.add("disabled");
			let status = await state.sync();
			if(status == 200) {
				buttonDiv.innerHTML = "Sync (Success)";
			} else if(status == 403) {
				dialog.show_notification("Please log in");
				buttonDiv.innerHTML = "Sync";
			} else {
				buttonDiv.innerHTML = `Sync (Fail - ${status})`;
			}
			buttonDiv.classList.remove("disabled");
		};

		this.handleSaveClick = function() {
			var today = new Date().getTime();
			this.download( JSON.stringify( state.getLocalState(), null, 2 ), 'save' + today + '.json', 'text/plain' );
		};

		this.handleLoadClick = function() {
			expose.set_state( 'main', {
				page: '/menu/import'
			} );
		};
	}

	// https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file
	// TODO: cross-browser test
	download( text, name, type ) {
		var a = document.createElement( "a" );
		var file = new Blob( [ text ], { type: type } );
		a.href = URL.createObjectURL( file );
		a.download = name;
		a.click();
	}

	renderMenuOptions() {
		let elems = [];

		elems.push( DOM.div( {
			key: 'teams',
			id: 'teams',
			className: 'list-item',
			onClick: this.handleTeamsClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
			}
		}, 'Teams' ) );

		elems.push( DOM.div( {
			key: 'login',
			id: 'login',
			className: 'list-item',
			onClick: this.handleLoginClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
			}
		}, 'Login' ) );

		elems.push( DOM.div( {
			key: 'sync',
			id: 'sync',
			className: 'list-item',
			onClick: this.handleSyncClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
			}
		}, 'Sync' ) );

		elems.push( DOM.div( {
			key: 'save',
			className: 'list-item',
			onClick: this.handleSaveClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
			}
		}, 'Save as File' ) );

		elems.push( DOM.div( {
			key: 'load',
			className: 'list-item',
			onClick: this.handleLoadClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
			}
		}, 'Load from File' ) );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				style: {}
			},
			DOM.div( {
				className: 'card-title'
			}, 'Menu' ),
			this.renderMenuOptions()
		);
	}
};
