let databaseCalls = class DatabaseCalls {

	constructor() {
		this.SAMPLE_STATE = {
		  "players": [
		    {
		      "id": "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		      "name": "Harry",
		      "gender": "M"
		    },
		    {
		      "id": "44c74b77-1225-40a8-92bf-3ed2afa47126",
		      "name": "Ron",
		      "gender": "M"
		    },
		    {
		      "id": "a84febaf-9b89-48c7-9bf9-1d313a575b5c",
		      "name": "Hermione",
		      "gender": "F"
		    },
		    {
		      "id": "2768b050-de98-4924-85bb-e1c3a8348761",
		      "name": "pizzaMan",
		      "gender": "M"
		    },
		    {
		      "id": "2b87b422-3964-43a7-9b18-f67d9abf5396",
		      "name": "pizzaWoman",
		      "gender": "F"
		    },
		    {
		      "id": "af5542dd-cb26-4f46-928e-8fa7c0a29eaf",
		      "name": "DancePartyMan",
		      "gender": "M"
		    },
		    {
		      "id": "815a03c4-7d99-4053-8a80-139309c576c3",
		      "name": "DancePartyGirl",
		      "gender": "F"
		    }
		  ],
		  "teams": [
		    {
		      "id": "a09a559f-deee-4a4d-a157-5088770c978a",
		      "name": "TestTeam1",
		      "games": [
		        {
		          "id": "0b506744-4be9-4a2b-802a-8f22f9fc776f",
		          "opponent": "BigGame1",
		          "lineup": [
		            "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		            "44c74b77-1225-40a8-92bf-3ed2afa47126",
		            "a84febaf-9b89-48c7-9bf9-1d313a575b5c"
		          ],
		          "date": 1530587989922,
		          "park": "Stazio",
		          "scoreUs": 0,
		          "scoreThem": 0,
		          "lineupType": 2,
		          "plateAppearances": [
		            {
		              "id": "d1bb1e58-a3ae-4ea7-a810-42654d7a3ba3",
		              "player_id": "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		              "plateAppearanceIndex": 1
		            },
		            {
		              "id": "482eea86-3fd5-4858-b3a3-94d8bb872fa2",
		              "player_id": "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		              "plateAppearanceIndex": 2,
		              "location": {
		                "x": 0.4470899470899471,
		                "y": 0.3386243386243386
		              }
		            },
		            {
		              "id": "22bf3463-6456-42dc-bef0-93fcfc6b5c66",
		              "player_id": "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		              "plateAppearanceIndex": 3,
		              "result": "2B"
		            },
		            {
		              "id": "106301e4-9497-41c1-b848-667f248fa9cf",
		              "player_id": "44c74b77-1225-40a8-92bf-3ed2afa47126",
		              "plateAppearanceIndex": 4,
		              "location": {
		                "x": 0.2619047619047619,
		                "y": 0.35185185185185186
		              },
		              "result": "Out"
		            },
		            {
		              "id": "cf0ce90c-9f97-48ec-8892-cddbe2240c41",
		              "player_id": "44c74b77-1225-40a8-92bf-3ed2afa47126",
		              "plateAppearanceIndex": 5,
		              "location": {
		                "x": 0.8703703703703703,
		                "y": 0.11375661375661375
		              },
		              "result": "HRo"
		            },
		            {
		              "id": "8fd0d89a-f014-4eb5-b2cd-c868ce52436b",
		              "player_id": "a84febaf-9b89-48c7-9bf9-1d313a575b5c",
		              "plateAppearanceIndex": 6,
		              "result": "HRi",
		              "location": {
		                "x": 0.07671957671957672,
		                "y": 0.3941798941798942
		              }
		            },
		            {
		              "id": "c116a446-fa7c-456f-94ae-a1a54193d643",
		              "player_id": "a84febaf-9b89-48c7-9bf9-1d313a575b5c",
		              "plateAppearanceIndex": 7,
		              "result": "HRo",
		              "location": {
		                "x": 0.10317460317460317,
		                "y": 0.16666666666666666
		              }
		            },
		            {
		              "id": "bfce27e7-170e-4a40-bf73-0ce2923274da",
		              "player_id": "a84febaf-9b89-48c7-9bf9-1d313a575b5c",
		              "plateAppearanceIndex": 8,
		              "result": "BB"
		            },
		            {
		              "id": "a6d9354a-c9f5-4c56-9fb0-be824a3741b4",
		              "player_id": "a84febaf-9b89-48c7-9bf9-1d313a575b5c",
		              "plateAppearanceIndex": 9,
		              "location": {
		                "x": 0.43915343915343913,
		                "y": 0.7195767195767195
		              },
		              "result": "E"
		            },
		            {
		              "id": "5f6e5ed1-4b59-44d1-bc73-a48086dffd32",
		              "player_id": "44c74b77-1225-40a8-92bf-3ed2afa47126",
		              "plateAppearanceIndex": 10,
		              "result": "FC",
		              "location": {
		                "x": 0.21957671957671956,
		                "y": 0.6137566137566137
		              }
		            },
		            {
		              "id": "6de4b557-f349-48cc-a9d1-954dff51cadc",
		              "player_id": "44c74b77-1225-40a8-92bf-3ed2afa47126",
		              "plateAppearanceIndex": 11,
		              "result": "2B",
		              "location": {
		                "x": 0.7724867724867724,
		                "y": 0.3201058201058201
		              }
		            },
		            {
		              "id": "8f0441e0-3ea5-4125-bb14-47e9594b855c",
		              "player_id": "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		              "plateAppearanceIndex": 12,
		              "location": {
		                "x": 0.9047619047619048,
		                "y": 0.4444444444444444
		              },
		              "result": "3B"
		            }
		          ]
		        },
		        {
		          "id": "adc985b1-5279-4312-87ed-3639599a6d8b",
		          "opponent": "BigGame2",
		          "lineup": [
		            "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		            "44c74b77-1225-40a8-92bf-3ed2afa47126",
		            "a84febaf-9b89-48c7-9bf9-1d313a575b5c"
		          ],
		          "date": 1530588057192,
		          "park": "ParkB",
		          "scoreUs": 0,
		          "scoreThem": 0,
		          "lineupType": 2,
		          "plateAppearances": []
		        }
		      ]
		    },
		    {
		      "id": "4d5721b3-18e6-434a-8e11-b3f2e766306f",
		      "name": "TestTeam2",
		      "games": [
		        {
		          "id": "c9218ade-a30d-4e89-a4f9-5343d59c4e1f",
		          "opponent": "Globo Gym",
		          "lineup": [
		            "2768b050-de98-4924-85bb-e1c3a8348761",
		            "2b87b422-3964-43a7-9b18-f67d9abf5396",
		            "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		            "af5542dd-cb26-4f46-928e-8fa7c0a29eaf",
		            "815a03c4-7d99-4053-8a80-139309c576c3",
		            "a84febaf-9b89-48c7-9bf9-1d313a575b5c"
		          ],
		          "date": 1530588138801,
		          "park": "ParkA",
		          "scoreUs": 0,
		          "scoreThem": 0,
		          "lineupType": 2,
		          "plateAppearances": [
		            {
		              "id": "a1c36883-3a39-4699-9c77-40213ff9a0aa",
		              "player_id": "2768b050-de98-4924-85bb-e1c3a8348761",
		              "plateAppearanceIndex": 1,
		              "result": ""
		            },
		            {
		              "id": "55c914f2-a432-4644-956f-25fbd55d850f",
		              "player_id": "2b87b422-3964-43a7-9b18-f67d9abf5396",
		              "plateAppearanceIndex": 2,
		              "result": "Out"
		            },
		            {
		              "id": "1a90c75f-5ed0-422c-8a90-863405e0df78",
		              "player_id": "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		              "plateAppearanceIndex": 3,
		              "result": "1B"
		            },
		            {
		              "id": "85a639ba-c18e-45cc-a09b-138528c22cda",
		              "player_id": "af5542dd-cb26-4f46-928e-8fa7c0a29eaf",
		              "plateAppearanceIndex": 4,
		              "result": "2B"
		            },
		            {
		              "id": "8b54479a-2aa5-4eda-9e05-c4e4cd1e4056",
		              "player_id": "815a03c4-7d99-4053-8a80-139309c576c3",
		              "plateAppearanceIndex": 5,
		              "result": "3B"
		            },
		            {
		              "id": "0812c5b9-202d-44d8-b53a-ba19a0e2278f",
		              "player_id": "a84febaf-9b89-48c7-9bf9-1d313a575b5c",
		              "plateAppearanceIndex": 6,
		              "result": "HRi"
		            },
		            {
		              "id": "12a4a7b9-ab21-43cc-b060-df16fa160f73",
		              "player_id": "2768b050-de98-4924-85bb-e1c3a8348761",
		              "plateAppearanceIndex": 7,
		              "result": "HRi"
		            },
		            {
		              "id": "f2d4905a-0ee7-4e58-8315-c5d5099ac03b",
		              "player_id": "2b87b422-3964-43a7-9b18-f67d9abf5396",
		              "plateAppearanceIndex": 8,
		              "result": "HRo"
		            },
		            {
		              "id": "91aa368b-73d0-4b78-8eda-804f3dcdba6b",
		              "player_id": "a18bb8e9-d398-4ac4-9812-8c0ab5976715",
		              "plateAppearanceIndex": 9,
		              "result": "BB"
		            },
		            {
		              "id": "0441a26a-d7ad-48ae-9c23-3effc151e20f",
		              "player_id": "af5542dd-cb26-4f46-928e-8fa7c0a29eaf",
		              "plateAppearanceIndex": 10,
		              "result": "E"
		            }
		          ]
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