'use strict';

exports.request = function(method, url, body) {

	url = exports.getServerUrl(url);

	if('fetch' in window) {
		return fetch(url, {
			method: method,
			credentials: 'same-origin',
			headers: {
				'content-type': 'application/json'
			},
			body: body,
		});
	} else {
		console.log("Using XMLHttpRequest");
		/* TODO
		var xhr = new XMLHttpRequest();
		xhr.open( method, url, true );
		xhr.setRequestHeader( 'Content-type', 'application/json' );
		xhr.onreadystatechange = async function() {
		if ( xhr.readyState === 4 ) {
			if ( xhr.status === 200 ) {
				return // something
			} else {
				dialog.show_notification('An error occured while communicating with the server: ' + status);
			}
		}
		xhr.send( JSON.stringify( body ) );
		*/
	};
};

exports.getServerUrl = function(path) {
	return window.location.href + path;
};

window.state = exports;