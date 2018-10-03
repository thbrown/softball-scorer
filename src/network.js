'use strict';

exports.request = async function( method, url, body ) {
	url = exports.getServerUrl( url );

	console.log( "Request to ", url );

	const response = {};
	if ( 'fetch' in window ) {
		const res = await fetch( url, {
			method: method,
			credentials: 'same-origin',
			headers: {
				'content-type': 'application/json'
			},
			body: body,
		} );
		response.status = res.status;
		if ( response.status !== 204 ) {
			try {
				response.body = await res.json();
			} catch ( e ) {
				console.log( e );
			}
		}
	} else {
		// TODO: This is untested and probably doesn't work
		const request = await new Promise( function( resolve, reject ) {
			const xhr = new XMLHttpRequest();
			xhr.open( method, url, true );
			xhr.setRequestHeader( 'Content-type', 'application/json' );
			xhr.onload = function() {
				if ( this.status >= 200 && this.status < 300 ) {
					resolve( xhr.response );
				} else {
					reject( {
						status: this.status,
						statusText: xhr.statusText,
						response: xhr.response
					} );
				}
			};
			xhr.onerror = function() {
				reject( {
					status: this.status,
					statusText: xhr.statusText
				} );
			};
			xhr.send( JSON.stringify( body ) );
		} );
		response.status = request.status;
		if ( response.status !== 204 ) {
			response.body = request.response;
		}
	}
	console.log( "Request Complete", url, response.status );
	return response;
};

exports.getServerUrl = function( path ) {
	return window.location.origin + "/" + path;
};

window.state = exports;
