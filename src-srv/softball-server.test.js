/*eslint no-process-exit:*/
'use strict';

const SoftballServer = require( './softball-server' );
const MockDb = require('./database-calls-mock' );
const objectHash = require( 'object-hash' );

const got = require('got');

describe('sync', () => {

	beforeAll(async () => {
		this.mockDb = new MockDb();
		this.server = new SoftballServer(this.mockDb);
		this.server.start();

		try {
			const response = await got.post('http://localhost:8888/login', {
				body: {
					"email": "whateverThisDoesn'tMatter",
					"password": "pizza"
				},
				json: true
			});
			console.log(response.headers);

			// Save the session id so we can make authenticated requests
			console.log("Session", response.headers["set-cookie"][0].split(';')[0]);
			this.sessionId = response.headers["set-cookie"][0].split(';')[0];
		} catch (error) {
			console.log("Error logging in", error);
		}
	});

	beforeEach(() => {
		this.mockDb.reset();
	})

	afterAll(() => {
		this.server.stop();
	});

	test.only('Test sync hashes', async () => {

		let state = {
		  "players": [],
		  "teams": [
		    {
		      "games": [
		        {
		          "plateAppearances": [],
		          "id": "0888b393-72ff-46f8-9847-e10807618af6",
		          "opponent": "TestGame",
		          "date": 1532144332800,
		          "park": "Stazio",
		          "lineup": []
		        }
		      ],
		      "id": "ad0bdbe2-8722-4271-b392-e891abc4d8e1",
		      "name": "TestTeam"
		    }
		  ]
		}

		let expectedHash = objectHash(state, { 
							algorithm: 'md5',  
							respectFunctionProperties: false, 
							respectFunctionNames: false, 
							respectType: false
						});


		this.mockDb.setState(state);

		let serverMd5;
		try {
			const response = await got.post('http://localhost:8888/sync', {
				headers: {
					"cookie": this.sessionId
				},
				body: {
					md5: '-',
					patch: {}
				},
				json: true
			});
			serverMd5 = response.body.md5;
		} catch (error) {
			console.log(error);
		}

		expect(serverMd5).toEqual(expectedHash);
		expect(serverMd5).toEqual("44f334e51d173dd72dfa86779ce46a0c");

	});

});

