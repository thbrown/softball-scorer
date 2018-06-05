/*eslint no-process-exit:*/
'use strict';

const DatabaseCallsPostgres = require( './database-calls-postgres' );
const DatabaseCallsStatic = require( './database-calls-static' );
const SoftballServer = require( './softball-server' );

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

let USE_PG = true;
if ( process.argv.length !== 5 && process.argv.length !== 2 ) {
	console.log( 'Usage: ' + __filename + ' <postgres_url> <postgres_username> <postgres_password>' );
	console.log( 'Assumes postgres is running on port 5432' );
	process.exit( -1 );
} else if ( process.argv.length === 2 ) {
	console.log( 'Warning: running without database connection' );
	USE_PG = false;
}

const pgurl = process.argv[ 2 ];
const user = process.argv[ 3 ];
const password = process.argv[ 4 ];

let databaseCalls;
if ( USE_PG ) {
	databaseCalls = new DatabaseCallsPostgres( pgurl, user, password );
} else {
	databaseCalls = new DatabaseCallsStatic();
}

const softballServer = new SoftballServer( databaseCalls );
softballServer.start();
