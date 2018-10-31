/*eslint no-process-exit:*/
'use strict';

const objectHash = require('object-hash');
const got = require('got');

const DatabaseCallsPostgres = require('../database-calls-postgres');
const config = require('../config');
const SoftballServer = require('../softball-server');
const utils = require('./test-utils.js');
const objectMerge = require('../../object-merge.js');
const StateTester = require('./test-state-tracker.js');

/**
 * This test requires an attached postgres database.
 * It runs through common sync cases to make sure there are no regressions propr to release.
 */
describe('sync', () => {

	beforeAll(async () => {
		const pghost = config.database.host;
		const pgport = config.database.port;
		const username = config.database.username;
		const password = config.database.password;
		this.databaseCalls = new DatabaseCallsPostgres(pghost, pgport, username, password);
		this.server = new SoftballServer(this.databaseCalls);
		this.server.start();

		let email = `syncTest${utils.randomId(10)}@softball.app`;
		let accountpassword = 'pizza';

		await utils.signup(email, password);
		this.sessionId = await utils.login(email, accountpassword);
		this.stateTracker = new StateTester(this.sessionId);
	});

	afterAll(async () => {
		await utils.deleteAccount(this.sessionId);
		this.server.stop();
		this.databaseCalls.disconnect();
	});

	test('Sync - Team', async () => {
		// Create
		let clientAncestorState = utils.getInitialState();
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

		let response = await utils.sync(this.sessionId, clientHash, clientPatch);
		let serverMd5 = response.body.md5;

		expect(serverMd5).toEqual(clientHash);

		// Edit
		clientAncestorState = clientLocalState;
		clientLocalState = {
			"teams": [
				{
					"id": "5Jv09B38BMWewta24olLam",
					"name": "ActuallyThisBigTeam",
					"games": []
				}
			],
			"players": []
		};

		clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
		clientHash = utils.getMd5(clientLocalState);

		response = await utils.sync(this.sessionId, clientHash, clientPatch);
		serverMd5 = response.body.md5;

		expect(serverMd5).toEqual(clientHash);

		// Delete
		clientAncestorState = clientLocalState;
		clientLocalState = { "teams": [], "players": [] };

		clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
		clientHash = utils.getMd5(clientLocalState);

		response = await utils.sync(this.sessionId, clientHash, clientPatch);
		serverMd5 = response.body.md5;

		expect(serverMd5).toEqual(clientHash);
	});

	test('Sync - Game', async () => {
		let startingState = {
			"teams": [
				{
					"id": "2sPowxz25r4jmPNazKYJaa",
					"name": "Big Team",
					"games": []
				}
			],
			"players": []
		};

		await this.stateTracker.syncStateClientUpdatesOnly(startingState);

		let addGameState = {
			"teams": [
				{
					"id": "2sPowxz25r4jmPNazKYJaa",
					"name": "Big Team",
					"games": [
						{
							"id": "4vj3huXzVVWzK8D1cGkvi3",
							"opponent": "Big Game",
							"lineup": [],
							"date": 1540356503,
							"park": "Stazio",
							"lineupType": 2,
							"plateAppearances": []
						}
					]
				}
			],
			"players": []
		};

		await this.stateTracker.syncStateClientUpdatesOnly(addGameState);

		let editGameState = {
			"teams": [
				{
					"id": "2sPowxz25r4jmPNazKYJaa",
					"name": "Big Team",
					"games": [
						{
							"id": "4vj3huXzVVWzK8D1cGkvi3",
							"opponent": "Actually this Big Game",
							"lineup": [],
							"date": 1540356503,
							"park": "Stazio",
							"lineupType": 1,
							"plateAppearances": []
						}
					]
				}
			],
			"players": []
		}

		await this.stateTracker.syncStateClientUpdatesOnly(editGameState);
		await this.stateTracker.syncStateClientUpdatesOnly(startingState);

		// Cleanup
		await this.stateTracker.syncStateClientUpdatesOnly(utils.getInitialState());
	});


	test('Sync - Lineup', async () => {
		let startingState = {
			"teams": [
				{
					"id": "2i7Kvon1G5LFQiz0K9DGbD",
					"name": "TestGame",
					"games": [
						{
							"id": "lvGs6Ivs8snLyiYIV1cWy",
							"opponent": "TestOpponent",
							"lineup": [
								"3q8KUZSCBm3c0OhmJB9XrT",
								"2b6lvmlDG8MwsctdTtmLHp",
								"3qbun59DfkdmhNihlb7S7V",
								"4EMfBrKhvGjWMa9kDM9ckP",
								"7QSKhntZ5ugtRIyb7ZPXy",
								"5GvaGswqVBDYmWaFhNWmrI"
							],
							"date": 1540356768,
							"park": "Stazio",
							"lineupType": 2,
							"plateAppearances": []
						}
					]
				}
			],
			"players": [
				{
					"id": "3q8KUZSCBm3c0OhmJB9XrT",
					"name": "Dave",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "2b6lvmlDG8MwsctdTtmLHp",
					"name": "Allison",
					"gender": "F",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "3qbun59DfkdmhNihlb7S7V",
					"name": "Paul",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "4EMfBrKhvGjWMa9kDM9ckP",
					"name": "Catherine",
					"gender": "F",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "7QSKhntZ5ugtRIyb7ZPXy",
					"name": "Peter",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "5GvaGswqVBDYmWaFhNWmrI",
					"name": "Therese",
					"gender": "F",
					"song_link": null,
					"song_start": null
				}
			]
		}

		await this.stateTracker.syncStateClientUpdatesOnly(startingState);

		let editGameState = {
			"teams": [
				{
					"id": "2i7Kvon1G5LFQiz0K9DGbD",
					"name": "TestGame",
					"games": [
						{
							"id": "lvGs6Ivs8snLyiYIV1cWy",
							"opponent": "TestOpponent",
							"lineup": [
								"3q8KUZSCBm3c0OhmJB9XrT",
								"3qbun59DfkdmhNihlb7S7V",
								"4EMfBrKhvGjWMa9kDM9ckP",
								"2b6lvmlDG8MwsctdTtmLHp",
								"5GvaGswqVBDYmWaFhNWmrI",
								"7QSKhntZ5ugtRIyb7ZPXy"
							],
							"date": 1540356768,
							"park": "Stazio",
							"lineupType": 2,
							"plateAppearances": []
						}
					]
				}
			],
			"players": [
				{
					"id": "3q8KUZSCBm3c0OhmJB9XrT",
					"name": "Dave",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "2b6lvmlDG8MwsctdTtmLHp",
					"name": "Allison",
					"gender": "F",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "3qbun59DfkdmhNihlb7S7V",
					"name": "Paul",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "4EMfBrKhvGjWMa9kDM9ckP",
					"name": "Catherine",
					"gender": "F",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "7QSKhntZ5ugtRIyb7ZPXy",
					"name": "Peter",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "5GvaGswqVBDYmWaFhNWmrI",
					"name": "Therese",
					"gender": "F",
					"song_link": null,
					"song_start": null
				}
			]
		};

		await this.stateTracker.syncStateClientUpdatesOnly(editGameState);
		await this.stateTracker.syncStateClientUpdatesOnly(startingState);

		// Cleanup
		await this.stateTracker.syncStateClientUpdatesOnly(utils.getInitialState());
	});

	test('Sync - Plate Appearances', async () => {
		let startingState = {
			"teams": [
				{
					"id": "2gFsS8ZRl8aClyxA7PILgd",
					"name": "TestTeam",
					"games": [
						{
							"id": "3KpWNATXYZk4YqDwq22BNI",
							"opponent": "TestGame",
							"lineup": [
								"1WeOkVGXvQ1Mf6d01Akubt",
								"5lPkuIjPDhGBYagKOOERtm",
								"3oYdgMieEE004Ivz24SCNW",
								"6xSppZ8E0SffIh2Ra8XyT7"
							],
							"date": 1540599203395,
							"park": "Stazio",
							"lineupType": 2,
							"plateAppearances": []
						}
					]
				}
			],
			"players": [
				{
					"id": "1WeOkVGXvQ1Mf6d01Akubt",
					"name": "Peter",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "5lPkuIjPDhGBYagKOOERtm",
					"name": "Mary",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "3oYdgMieEE004Ivz24SCNW",
					"name": "Paul",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "6xSppZ8E0SffIh2Ra8XyT7",
					"name": "Abigail",
					"gender": "F",
					"song_link": null,
					"song_start": null
				}
			]
		};

		await this.stateTracker.syncStateClientUpdatesOnly(startingState);

		let addPaState = {
			"teams": [
				{
					"id": "2gFsS8ZRl8aClyxA7PILgd",
					"name": "TestTeam",
					"games": [
						{
							"id": "3KpWNATXYZk4YqDwq22BNI",
							"opponent": "TestGame",
							"lineup": [
								"1WeOkVGXvQ1Mf6d01Akubt",
								"5lPkuIjPDhGBYagKOOERtm",
								"3oYdgMieEE004Ivz24SCNW",
								"6xSppZ8E0SffIh2Ra8XyT7"
							],
							"date": 1540599203395,
							"park": "Stazio",
							"lineupType": 2,
							"plateAppearances": [
								{
									"id": "54BrUioTIQucKkUKnkr3yD",
									"player_id": "1WeOkVGXvQ1Mf6d01Akubt",
									"result": "Out",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "yb0Ru4EjBfXi5mpgMXbOJ",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "6WZqJ7o8n0I2WsBtW97MJM",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"location": {
										"x": null,
										"y": null
									},
									"result": "2B"
								},
								{
									"id": "6buwvxH6Oe7hfl3NLOn7w6",
									"player_id": "6xSppZ8E0SffIh2Ra8XyT7",
									"result": "",
									"location": {
										"x": 12141,
										"y": 12141
									},
								},
								{
									"id": "4KjKMj3UXSiyB24q1vd8lA",
									"player_id": "1WeOkVGXvQ1Mf6d01Akubt",
									"result": "",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "7IyIRYx6SxJs56Q1Qq7FoM",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "Out",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "2Lp6b2qf5hAeUt5uqA9XEf",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"result": "2B",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "23pn8bSi2k14wu1RemmEOw",
									"player_id": "6xSppZ8E0SffIh2Ra8XyT7",
									"result": "3B",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "qo8bgjlJCycDmPkfD1iG3",
									"player_id": "1WeOkVGXvQ1Mf6d01Akubt",
									"result": "HRi",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "1jVGUOCt7dqHEceFEBNtgd",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "HRo",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "6dQFJ7fi1jE9W3SA02TCQt",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"result": "HRi",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "7zTgvVUiNzIsqbshLu5Q58",
									"player_id": "6xSppZ8E0SffIh2Ra8XyT7",
									"result": "E",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "wp4qPBXOE62WifgeRHq1v",
									"player_id": "1WeOkVGXvQ1Mf6d01Akubt",
									"result": "FC",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "5F0IiZafiE8fqM3eLYlLEu",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "SAC",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "tOZ6AaAXDioKppUw6azzT",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"result": "K",
									"location": {
										"x": null,
										"y": null
									}
								}
							]
						}
					]
				}
			],
			"players": [
				{
					"id": "1WeOkVGXvQ1Mf6d01Akubt",
					"name": "Peter",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "5lPkuIjPDhGBYagKOOERtm",
					"name": "Mary",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "3oYdgMieEE004Ivz24SCNW",
					"name": "Paul",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "6xSppZ8E0SffIh2Ra8XyT7",
					"name": "Abigail",
					"gender": "F",
					"song_link": null,
					"song_start": null
				}
			]
		};

		await this.stateTracker.syncStateClientUpdatesOnly(addPaState);

		let editPaState = {
			"teams": [
				{
					"id": "2gFsS8ZRl8aClyxA7PILgd",
					"name": "TestTeam",
					"games": [
						{
							"id": "3KpWNATXYZk4YqDwq22BNI",
							"opponent": "TestGame",
							"lineup": [
								"1WeOkVGXvQ1Mf6d01Akubt",
								"5lPkuIjPDhGBYagKOOERtm",
								"3oYdgMieEE004Ivz24SCNW",
								"6xSppZ8E0SffIh2Ra8XyT7"
							],
							"date": 1540599203395,
							"park": "Stazio",
							"lineupType": 2,
							"plateAppearances": [
								{
									"id": "54BrUioTIQucKkUKnkr3yD",
									"player_id": "1WeOkVGXvQ1Mf6d01Akubt",
									"result": "Out",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "yb0Ru4EjBfXi5mpgMXbOJ",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "",
									"location": {
										"x": 2141,
										"y": 22141
									}
								},
								{
									"id": "6WZqJ7o8n0I2WsBtW97MJM",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"result": "2B",
									"location": {
										"x": null,
										"y": null
									},
								},
								{
									"id": "6buwvxH6Oe7hfl3NLOn7w6",
									"player_id": "6xSppZ8E0SffIh2Ra8XyT7",
									"result": "HRi",
									"location": {
										"x": 12141,
										"y": 12141
									},
								},
								{
									"id": "4KjKMj3UXSiyB24q1vd8lA",
									"player_id": "1WeOkVGXvQ1Mf6d01Akubt",
									"result": "",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "7IyIRYx6SxJs56Q1Qq7FoM",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "Out",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "2Lp6b2qf5hAeUt5uqA9XEf",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"result": "2B",
									"location": {
										"x": null,
										"y": null
									}
								},
								{
									"id": "23pn8bSi2k14wu1RemmEOw",
									"player_id": "6xSppZ8E0SffIh2Ra8XyT7",
									"result": "3B",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "1jVGUOCt7dqHEceFEBNtgd",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "HRo",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "6dQFJ7fi1jE9W3SA02TCQt",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"result": "HRi",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "7zTgvVUiNzIsqbshLu5Q58",
									"player_id": "6xSppZ8E0SffIh2Ra8XyT7",
									"result": "E",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "wp4qPBXOE62WifgeRHq1v",
									"player_id": "1WeOkVGXvQ1Mf6d01Akubt",
									"result": "FC",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "5F0IiZafiE8fqM3eLYlLEu",
									"player_id": "5lPkuIjPDhGBYagKOOERtm",
									"result": "SAC",
									"location": {
										"x": 12141,
										"y": 12141
									}
								},
								{
									"id": "tOZ6AaAXDioKppUw6azzT",
									"player_id": "3oYdgMieEE004Ivz24SCNW",
									"result": "K",
									"location": {
										"x": null,
										"y": null
									}
								}
							]
						}
					]
				}
			],
			"players": [
				{
					"id": "1WeOkVGXvQ1Mf6d01Akubt",
					"name": "Peter",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "5lPkuIjPDhGBYagKOOERtm",
					"name": "Mary",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "3oYdgMieEE004Ivz24SCNW",
					"name": "Paul",
					"gender": "M",
					"song_link": null,
					"song_start": null
				},
				{
					"id": "6xSppZ8E0SffIh2Ra8XyT7",
					"name": "Abigail",
					"gender": "F",
					"song_link": null,
					"song_start": null
				}
			]
		};

		await this.stateTracker.syncStateClientUpdatesOnly(editPaState);
		await this.stateTracker.syncStateClientUpdatesOnly(startingState);

		// Cleanup
		await this.stateTracker.syncStateClientUpdatesOnly(utils.getInitialState());
	});

});

