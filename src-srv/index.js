/*eslint no-process-exit:*/
'use strict';

const DatabaseCallsPostgres = require( './database-calls-postgres' );
const DatabaseCallsStatic = require( './database-calls-static' );
const SoftballServer = require( './softball-server' );
const config = require( './config' );

process.on( 'SIGINT', function() {
	console.log( 'SIGINT' );
	process.exit( 0 );
} );
process.on( 'SIGTERM', function() {
	console.log( 'SIGTERM' );
	process.exit( 0 );
} );
process.on( 'exit', function() {
	process.stdout.write( 'Bye\n' );
} );

const pghost = config.database.host;
const pgport = config.database.port;
const username = config.database.username;
const password = config.database.password;

let databaseCalls;
if ( pghost && pgport && username && password) {
	databaseCalls = new DatabaseCallsPostgres( pghost, pgport, username, password );
} else {
	console.log( 'Warning: running without database connection' );
	databaseCalls = new DatabaseCallsStatic();
}

const softballServer = new SoftballServer( databaseCalls );
softballServer.start();
