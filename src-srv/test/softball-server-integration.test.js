/*eslint no-process-exit:*/
'use strict';

const objectHash = require( 'object-hash' );
const got = require('got');

const DatabaseCallsPostgres = require( '../database-calls-postgres' );
const config = require( '../config' );
const SoftballServer = require( '../softball-server' );
const utils = require( './test-utils.js' );
const objectMerge = require( '../../object-merge.js' );

describe('sync', () => {

	beforeAll(async () => {
		const pghost = config.database.host;
		const pgport = config.database.port;
		const username = config.database.username;
		const password = config.database.password;
		this.databaseCalls = new DatabaseCallsPostgres( pghost, pgport, username, password );
		this.server = new SoftballServer(this.databaseCalls);
		this.server.start();
	});

	afterAll(() => {
		this.server.stop();
		this.databaseCalls.disconnect();
	});

	test('Test account lifecycle', async () => {
		let email = `lifecycleTest${utils.randomId(10)}@softball.app`;
		let password = 'pizza';

		// Signup
		await utils.signup(email, password);

		// Login
		let sessionId = await utils.login( email, password );

		// Delete
		await utils.deleteAccount( sessionId );
	});

	test.only('Sync', async () => {
		let email = `syncTest${utils.randomId(10)}@softball.app`;
		let password = 'pizza';

		await utils.signup(email, password);
		let sessionId = await utils.login( email, password );

		try {
			// Sync - Create Team
			let clientAncestorState = {"teams":[], "players": []};;
			let clientLocalState = {
				"teams": [
					{
						"id": "5Jv09B38BMWewta24olLam",
						"name": "BigTeam",
						"games": []
					}
				],
				"players": []
			};
			let clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
			let clientHash = utils.getMd5(clientLocalState);

			const response = await utils.sync( sessionId, clientHash, clientPatch );
			let serverMd5 = response.body.md5;

			expect(serverMd5).toEqual(clientHash);

			// TODO:

			// Sync - Create Game

			// Sync - Create Player

			// Sync - Create Plate Appearance

			// Sync - Create All Entities At Once

			// Sync - Update Team

			// Sync - Update Game

			// Sync - Update Player

			// Sync - Update Plate Appearance

			// Sync - Delete Team

			// Sync - Delete Game

			// Sync - Delete Player

			// Sync - Delete Plate Appearance

		} finally {
			await utils.deleteAccount( sessionId );
		}
	});

});

