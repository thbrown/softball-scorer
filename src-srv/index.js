/*eslint no-process-exit:*/
'use strict';

let config = null;

try {
	config = require('./config.js');
} catch (e) {
	console.log('Error: No ./config.js present.');
	process.exit(1);
}

const DatabaseCallsPostgres = require('./database-calls-postgres');
const DatabaseCallsStatic = require('./database-calls-static');
const SoftballServer = require('./softball-server');

process.on('SIGINT', function () {
	console.log('SIGINT');
	process.exit(0);
});
process.on('SIGTERM', function () {
	console.log('SIGTERM');
	process.exit(0);
});
process.on('exit', function () {
	process.stdout.write('Bye\n');
});

function startServer(databaseCalls) {
	const softballServer = new SoftballServer(databaseCalls);
	softballServer.start();
}

const { host: pghost, port: pgport, username, password } = config.database;
if (pghost && pgport && username && password) {
	const databaseCalls = new DatabaseCallsPostgres(pghost, pgport, username, password, (err) => {
		if (err) {
			console.log('Encountered an error connecting to db', err);
			process.exit(1);
		}
		console.log('Connected to db.');
		startServer(databaseCalls);
	});
} else {
	console.log('Warning: running without database connection');
	startServer(new DatabaseCallsStatic());
}


