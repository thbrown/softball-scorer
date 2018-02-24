'use strict';

const http_server = require( './http-server' );

const PORT = 8888;

process.on( 'SIGINT', function() {
	console.log( 'SIGINT' );
	process.exit( 0 );
} );
process.on( 'SIGTERM', function() {
	console.log( 'SIGTERM' );
	process.exit( 0 );
} );
process.on( 'exit', function() {
	process.stdout.write( "Bye\n" );
} );

http_server.start( PORT, __dirname + '/..' );
console.log( 'Now listening on port: ' + PORT );

//localhost:8080/test as a GET request will trigger this function
http_server.get( 'test', ( obj, resp ) => {
	console.log( 'Triggered "test" GET request' );
	http_server.reply( resp, 'This is a test GET result' );
} );

//localhost:8080/test as a POST request will trigger this function
http_server.post( 'compile', ( obj, resp, data ) => {
	console.log( 'Triggered "test" POST request', data );
	http_server.reply( resp, 'This is a test POST result' );
} );
