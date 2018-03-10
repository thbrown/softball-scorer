'use strict';

const React = require( 'react' );
const ReactDOM = require( 'react-dom' );
const ConfirmDialog = require( './confirm-dialog' );
const InputDialog = require( './input-dialog' );
const NotificationDialog = require( './notification-dialog' );

window.current_confirm = null;
window.current_cancel = null;
let is_visible = false;
let require_shift = false;

let on_key_down = function(	ev ){
	let t = true;
	if( require_shift ) {
		t = ev.shiftKey;
	}
	if( ev.keyCode === 13 && t ) { // enter
		window.current_confirm();
	} else if( ev.keyCode === 27 ) { // esc
		window.current_cancel();
	}
};

const show = function(){
	is_visible = true;
	window.addEventListener( 'keydown', on_key_down );
};

exports.show_confirm = function( text, on_confirm, on_cancel ){
	show();
	ReactDOM.render(
		React.createElement( ConfirmDialog, {
			text: text,
			on_confirm: on_confirm || function(){},
			on_cancel: on_cancel || function(){},
			hide: exports.hide
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.set_shift_req = function( v ){
	require_shift = v;
};

exports.show_input = function( node_or_default_text, on_confirm, on_cancel ){
	show();
	let node = null;
	let default_text = null;
	if( typeof node_or_default_text === 'object' ){
		node = node_or_default_text;
	} else {
		default_text = node_or_default_text;
	}
	ReactDOM.render(
		React.createElement( InputDialog, {
			node: node,
			default_text: default_text,
			on_confirm: on_confirm || function(){},
			on_cancel: on_cancel || function(){},
			whiteSpace: require_shift,
			hide: exports.hide
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.show_notification = function( text, on_confirm ){
	show();
	ReactDOM.render(
		React.createElement( NotificationDialog, {
			text: text,
			on_confirm: on_confirm || function(){},
			hide: exports.hide
		} ),
		document.getElementById( 'dialog' )
	);
};

exports.hide = function(){
	is_visible = false;
	window.removeEventListener( 'keydown', on_key_down );
	ReactDOM.unmountComponentAtNode( document.getElementById( 'dialog' ) );
};

exports.is_visible = function(){
	return is_visible;
};
