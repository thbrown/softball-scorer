const objectMerge = require( './object-merge.js' );

let baseState = {
  "players": [
    {
      "id": 1,
      "name": "Thomas",
      "gender": "M",
      "picture": null
    },
    {
      "id": 2,
      "name": "Benjamin",
      "gender": "M",
      "picture": null
    },
    {
      "id": 3,
      "name": "Lauren",
      "gender": "F",
      "picture": null
    },
    {
      "id": 4,
      "name": "Katelyn",
      "gender": "F",
      "picture": null
    },
    {
      "id": 5,
      "name": "Katie",
      "gender": "F",
      "picture": null
    }
  ],
  "teams": [
    {
      "games": [
        {
          "plateAppearances": [
            {
              "id": 35,
              "player_id": 3,
              "result": "E",
              "location": {
                "x": 0.57772,
                "y": 0.520725
              },
              "plateAppearanceIndex": 1
            },
            {
              "id": 36,
              "player_id": 1,
              "result": "1B",
              "location": {
                "x": 0.632124,
                "y": 0.336788
              },
              "plateAppearanceIndex": 2
            },
            {
              "id": 37,
              "player_id": 4,
              "result": "1B",
              "location": {
                "x": 0.297927,
                "y": 0.349741
              },
              "plateAppearanceIndex": 3
            }
          ],
          "id": 10,
          "opponent": "Upper Deckers",
          "date": 1521609321600,
          "park": "Stazio",
          "score_us": 0,
          "score_them": 0,
          "lineup_type": 2,
          "lineup": [
            3,
            4,
            5,
            8,
            1,
            2,
          ],
        },
 	  ],
	  "id": 123,
      "name": "T^2",
      "roster": []
 	}
  ]
};

test('Diff Edit', () => {
	let stateA = baseState;
	let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy
	stateB.players[0].name = "Jamal";
	stateB.teams[0].games[0].plateAppearances[2].location.x = .12344;
	let patch = objectMerge.diff(stateA,stateB);
	console.log(JSON.stringify(patch, null, 2));

	let expectedPatch = {
      "players": {
        "1": {
          "name": {
            "op": "Edit",
            "key": "name",
            "param1": "Thomas",
            "param2": "Jamal"
          }
        }
      },
      "teams": {
        "123": {
          "games": {
            "10": {
              "plateAppearances": {
                "37": {
                  "location": {
                    "x": {
                      "op": "Edit",
                      "key": "x",
                      "param1": 0.297927,
                      "param2": 0.12344
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

	expect(patch).toEqual(expectedPatch);

	let newObject = objectMerge.patch(stateA, patch);
	expect(newObject).toEqual(stateB);

});

test('Diff ArrayAdd', () => {
	let stateA = baseState;
	let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy
	stateB.players.push({
      "id": 6,
      "name": "Jamal",
      "gender": "M"
    });
    stateB.teams[0].games[0].plateAppearances.push({
		"id": 38,
		"player_id": 3,
		"result": "E",
		"location": {
		"x": 0.57772,
		"y": 0.520725
		},
		"plateAppearanceIndex": 1
    });
	let patch = objectMerge.diff(stateA,stateB);
	console.log(JSON.stringify(patch, null, 2));

	let expectedPatch = {
      "players": {
        "{\"id\":6,\"name\":\"Jamal\",\"gender\":\"M\"}": {
          "op": "ArrayAdd",
          "key": "{\"id\":6,\"name\":\"Jamal\",\"gender\":\"M\"}",
          "param1": "{\"id\":6,\"name\":\"Jamal\",\"gender\":\"M\"}",
          "param2": 5
        }
      },
      "teams": {
        "123": {
          "games": {
            "10": {
              "plateAppearances": {
                "{\"id\":38,\"player_id\":3,\"result\":\"E\",\"location\":{\"x\":0.57772,\"y\":0.520725},\"plateAppearanceIndex\":1}": {
                  "op": "ArrayAdd",
                  "key": "{\"id\":38,\"player_id\":3,\"result\":\"E\",\"location\":{\"x\":0.57772,\"y\":0.520725},\"plateAppearanceIndex\":1}",
                  "param1": "{\"id\":38,\"player_id\":3,\"result\":\"E\",\"location\":{\"x\":0.57772,\"y\":0.520725},\"plateAppearanceIndex\":1}",
                  "param2": 3
                }
              }
            }
          }
        }
      }
    };

	expect(patch).toEqual(expectedPatch);
});

test.only('Diff Add', () => {
	let stateA = baseState;
	let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy

	// Add
	stateB.players[2].walkup_song = "https://www.youtube.com/watch?v=RMR5zf1J1Hs";

	let patch = objectMerge.diff(stateA,stateB);
	console.log(JSON.stringify(patch, null, 2));

	let expectedPatch = {
      "players": {
        "3": {
          "walkup_song": {
            "op": "Add",
            "key": "walkup_song",
            "param1": "https://www.youtube.com/watch?v=RMR5zf1J1Hs"
          }
        }
      }
    };

	expect(patch).toEqual(expectedPatch);
});

test('Diff Re-Order', () => {
	let stateA = baseState;
	let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy

	// Re-order
	stateB.teams[0].games[0].lineup = [4,3,5,1,2,8];

	let patch = objectMerge.diff(stateA,stateB);
	console.log(JSON.stringify(patch, null, 2));

	let expectedPatch = {
      "teams": {
        "123": {
          "games": {
            "10": {
              "lineup": {
                "ReOrder": {
                  "op": "ReOrder",
                  "key": "ReOrder",
                  "param1": "[3,4,5,8,1,2]",
                  "param2": "[4,3,5,1,2,8]"
                }
              }
            }
          }
        }
      }
    };

	expect(patch).toEqual(expectedPatch);
});

test('Diff Delete', () => {
	let stateA = baseState;
	let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy
	stateB.players.splice(3, 1);
	let patch = objectMerge.diff(stateA,stateB);
	console.log(JSON.stringify(patch, null, 2));

	let expectedPatch =     {
      "players": {
        "4": {
          "op": "Delete",
          "key": 4
        }
      }
    };

	expect(patch).toEqual(expectedPatch);
});