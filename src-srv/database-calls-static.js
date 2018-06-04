let databaseCalls = class DatabaseCalls {

	constructor() {
		this.SAMPLE_STATE = {
			"players": [ {
					"id": 1,
					"name": "Harry",
					"gender": "M",
					"picture": null
				},
				{
					"id": 2,
					"name": "Ron",
					"gender": "M",
					"picture": null
				},
				{
					"id": 3,
					"name": "Hermione",
					"gender": "F",
					"picture": null
				},
				{
					"id": 4,
					"name": "Luna",
					"gender": "F",
					"picture": null
				}
			],
			"teams": [ {
					"games": [ {
							"plateAppearances": [ {
									"id": 3,
									"player_id": 1,
									"result": "4i",
									"location": {
										"x":13,
										"y":14
									},
									"plateAppearanceIndex": 1
								},
								{
									"id": 8,
									"player_id": 2,
									"result": "3",
									"location": {
										"x":13,
										"y":14
									},
									"plateAppearanceIndex": 2
								},
								{
									"id": 7,
									"player_id": 2,
									"result": "0",
									"location": {
										"x":13,
										"y":14
									},
									"plateAppearanceIndex": 3
								},
								{
									"id": 6,
									"player_id": 3,
									"result": "2",
									"location": {
										"x":13,
										"y":14
									},
									"plateAppearanceIndex": 4
								},
								{
									"id": 5,
									"player_id": 3,
									"result": "1",
									"location": {
										"x":13,
										"y":14
									},
									"plateAppearanceIndex": 5
								},
								{
									"id": 4,
									"player_id": 1,
									"result": "3",
									"location": {
										"x":13,
										"y":14
									},
									"plateAppearanceIndex": 6
								}
							],
							"id": 1,
							"opponent": "Upslope",
							"date": "2008-02-21T07:00:00.000Z",
							"park": "Stazio",
							"score_us": 10,
							"score_them": 9,
							"lineup_type":1,
							"lineup": [
								2,
								1,
								3
							]
						},
						{
							"plateAppearances": [],
							"id": 3,
							"opponent": "Nobody",
							"date": "2020-01-23T07:00:00.000Z",
							"park": "Fed Center",
							"score_us": 1,
							"score_them": 1,
							"lineup_type":1,
							"lineup": [
								2,
								1,
								3
							]
						}
					],
					"id": 1,
					"name": "Screwballs"
				},
				{
					"games": [ {
						"plateAppearances": [ {
								"id": 10,
								"player_id": 4,
								"result": "0",
								"location": {
									"x":13,
									"y":14
								},
								"plateAppearanceIndex": 2
							},
							{
								"id": 9,
								"player_id": 4,
								"result": "2",
								"location": {
									"x":13,
									"y":14
								},
								"plateAppearanceIndex": 1
							}
						],
						"id": 2,
						"opponent": "Downslope",
						"date": "2008-03-31T06:00:00.000Z",
						"park": "Mapleton",
						"score_us": 11,
						"score_them": 2,
						"lineup_type":2,
						"lineup": [
							4
						]
					} ],
					"id": 2,
					"name": "Mom's Spaghetti"
				},
				{
					"games": [],
					"id": 3,
					"name": "Empty Team",
					"lineup_type":2
				}
			]
		};
	}

	async getAccountIdAndPassword( email ) {
		return {id:1, password:'$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2' /* pizza */}
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