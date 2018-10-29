let databaseCalls = class DatabaseCalls {

	constructor() {
		this.SAMPLE_STATE = {
		  "players": [
		    {
		      "id": "4Pw6B9km4f4CQExEegoHbV",
		      "name": "Harry",
					"gender": "M",
					"song_link": null,
					"song_start": null
		    },
		    {
		      "id": "5lT2dJlhWyIOlHpfiREBfJ",
		      "name": "Ron",
		      "gender": "M",
					"song_link": null,
					"song_start": null
		    },
		    {
		      "id": "4ZjPjdvRQSFlePddQQh8OY",
		      "name": "Hermione",
		      "gender": "F",
					"song_link": null,
					"song_start": null
		    },
		    {
		      "id": "2UHSaa0yi7guOwUQN5QLPc",
		      "name": "Gina",
		      "gender": "F",
					"song_link": null,
					"song_start": null
		    },
		    {
		      "id": "79AlfdDaHZqtZbpYtlxOVW",
		      "name": "Carlos",
		      "gender": "M",
					"song_link": null,
					"song_start": null
		    },
		    {
		      "id": "24OsdgKV7ePGkCgKNTSnH4",
		      "name": "Jewels",
		      "gender": "F",
					"song_link": null,
					"song_start": null
		    }
		  ],
		  "teams": [
		    {
		      "id": "m0jlfuEH5jouU8AOMIpbj",
		      "name": "Big Guns",
		      "games": [
		        {
		          "id": "4N3286ykcHFlIjRu8XBV0I",
		          "opponent": "Bad Guys",
		          "lineup": [
		            "4Pw6B9km4f4CQExEegoHbV",
		            "5lT2dJlhWyIOlHpfiREBfJ",
		            "4ZjPjdvRQSFlePddQQh8OY"
		          ],
		          "date": "2018-10-10",
		          "park": "Stazio",
		          "scoreUs": 0,
		          "scoreThem": 0,
		          "lineupType": 2,
		          "plateAppearances": [
		            {
		              "id": "iLTIJLlVIK7eqMusZ9flF",
		              "player_id": "4Pw6B9km4f4CQExEegoHbV"
		            },
		            {
		              "id": "1sF3SZe4hkl5b2Aa59lkJw",
		              "player_id": "5lT2dJlhWyIOlHpfiREBfJ",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              }
		            },
		            {
		              "id": "7d5P2oCYztlFhCnQ79KTyV",
		              "player_id": "4ZjPjdvRQSFlePddQQh8OY",
		              "result": "2B",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              }
		            },
		            {
		              "id": "AaDeTuL6Uh2ZbOePr2inJ",
		              "player_id": "4Pw6B9km4f4CQExEegoHbV",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "Out"
		            },
		            {
		              "id": "79s6CZsXIMkyWloxw2cMqL",
		              "player_id": "5lT2dJlhWyIOlHpfiREBfJ",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "SAC"
		            },
		            {
		              "id": "2HEpXfz1e0fF3EKZVAqktS",
		              "player_id": "4ZjPjdvRQSFlePddQQh8OY",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "E"
		            }
		          ]
		        },
		        {
		          "id": "1IY5Re4tLJu8hnXrGUPtIk",
		          "opponent": "Bad Guys 2",
		          "lineup": [
		            "4Pw6B9km4f4CQExEegoHbV",
		            "5lT2dJlhWyIOlHpfiREBfJ",
		            "4ZjPjdvRQSFlePddQQh8OY"
		          ],
		          "date": "2018-10-10",
		          "park": "Stazio",
		          "scoreUs": 0,
		          "scoreThem": 0,
		          "lineupType": 2,
		          "plateAppearances": [
		            {
		              "id": "6rHVeLbRgEhlxCjaM3VSUh",
		              "player_id": "4Pw6B9km4f4CQExEegoHbV",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "Out"
		            },
		            {
		              "id": "3T9c2S02cGgpbT2BIAykck",
		              "player_id": "5lT2dJlhWyIOlHpfiREBfJ",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "2B"
		            },
		            {
		              "id": "3hUQoRy6tHN7dirqjZvrXQ",
		              "player_id": "4ZjPjdvRQSFlePddQQh8OY",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "1B"
		            }
		          ]
		        }
		      ]
		    },
		    {
		      "id": "5nOdStkL6W78nKNVldoDZ4",
		      "name": "Just for fun",
		      "games": []
		    },
		    {
		      "id": "2gEtoAScefKFOTF7Wn4WIa",
		      "name": "Pizza Team",
		      "games": [
		        {
		          "id": "3ZRIY5ktchHxL4AhHvS5El",
		          "opponent": "Pizza Game",
		          "lineup": [
		            "2UHSaa0yi7guOwUQN5QLPc",
		            "79AlfdDaHZqtZbpYtlxOVW",
		            "24OsdgKV7ePGkCgKNTSnH4"
		          ],
		          "date": "2018-10-10",
		          "park": "Stazio",
		          "scoreUs": 0,
		          "scoreThem": 0,
		          "lineupType": 1,
		          "plateAppearances": [
		            {
		              "id": "3JaE2TG0EFAKJaKkpvUGwv",
		              "player_id": "2UHSaa0yi7guOwUQN5QLPc",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "1B"
		            },
		            {
		              "id": "2BrYyihBcyIffY8qsCpNr9",
		              "player_id": "79AlfdDaHZqtZbpYtlxOVW",
		              "location": {
		                "x": 13141,
		                "y": 22141
		              },
		              "result": "2B"
		            },
		            {
		              "id": "2qHIiZ5k5UvsHLN0x3MQIG",
		              "player_id": "24OsdgKV7ePGkCgKNTSnH4",
		              "location": {
		                "x": 12141,
		                "y": 12141
		              },
		              "result": "3B"
		            },
		            {
		              "id": "78bJCHG71VNCsBleBuQJCy",
		              "player_id": "2UHSaa0yi7guOwUQN5QLPc",
		              "location": {
		                "x": 123,
		                "y": 23515
		              },
		              "result": "Out"
		            },
		            {
		              "id": "5N2XhQFFhLBFbOLR3Ri7xC",
		              "player_id": "79AlfdDaHZqtZbpYtlxOVW",
		              "location": {
		                "x": 12141,
		                "y": 19141
		              },
		              "result": "HRo"
		            },
		            {
		              "id": "1haY9oDOLncOGowVfcNET3",
		              "player_id": "24OsdgKV7ePGkCgKNTSnH4",
		              "location": {
		                "x": 22141,
		                "y": 12141
		              },
		              "result": "1B"
		            }
		          ]
		        },
		        {
		          "id": "2XRVs58sTM6UuAFJsfQukP",
		          "opponent": "Another Game",
		          "lineup": [],
		          "date": "2018-10-10",
		          "park": "Stazio",
		          "scoreUs": 0,
		          "scoreThem": 0,
		          "lineupType": 2,
		          "plateAppearances": []
		        }
		      ]
		    }
		  ]
		};
	}

	// Login with any user name and the password "pizza"
	async getAccountFromEmail( email ) {
		return {id:1, password_hash:'$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2'}
	}

	getState( account_id ) {
		return this.SAMPLE_STATE;
	}

	async setState( data ) {
		let result = await getStatePromise();
		var ancestorDiffs = objectMerge.diff(this.SAMPLE_STATE, JSON.parse(data.ancestor));
		if(Object.keys(ancestorDiffs).length === 0 && ancestorDiffs.constructor === Object) {
			// Diff the client's data with the db data to get the patch we need to apply to make the database match the client
			var patch = objectMerge.diff(result, JSON.parse(data.local));
			objectMerge.patch(this.SAMPLE_STATE, patch);
		} else {
			responseObject.status = "FAIL";
			responseObject.reason = "PENDING CHANGES - PULL FIRST";
			res.send( JSON.stringify(responseObject) );
		}
	}

}

// Node only
module.exports = databaseCalls;