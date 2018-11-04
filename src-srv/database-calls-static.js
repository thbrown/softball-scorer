let databaseCalls = class DatabaseCalls {
  constructor() {
    this.SAMPLE_STATE = {
      players: [
        {
          id: "4f4CQExEegoHbV",
          name: "Harry",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4yIOlHpfiREBfJ",
          name: "Ron",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4SFlePddQQh8OY",
          name: "Hermione",
          gender: "F",
          song_link: null,
          song_start: null
        },
        {
          id: "47guOwUQN5QLPc",
          name: "Gina",
          gender: "F",
          song_link: null,
          song_start: null
        },
        {
          id: "4ZqtZbpYtlxOVW",
          name: "Carlos",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4ePGkCgKNTSnH4",
          name: "Jewels",
          gender: "F",
          song_link: null,
          song_start: null
        }
      ],
      teams: [
        {
          id: "4jouU8AOMIpbj",
          name: "Big Guns",
          games: [
            {
              id: "4HFlIjRu8XBV0I",
              opponent: "Bad Guys",
              lineup: ["4f4CQExEegoHbV", "4yIOlHpfiREBfJ", "4SFlePddQQh8OY"],
              date: "2018-10-10",
              park: "Stazio",
              scoreUs: 0,
              scoreThem: 0,
              lineupType: 2,
              plateAppearances: [
                {
                  id: "4K7eqMusZ9flF",
                  player_id: "4f4CQExEegoHbV"
                },
                {
                  id: "4kl5b2Aa59lkJw",
                  player_id: "4yIOlHpfiREBfJ",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4tlFhCnQ79KTyV",
                  player_id: "4SFlePddQQh8OY",
                  result: "2B",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4h2ZbOePr2inJ",
                  player_id: "4f4CQExEegoHbV",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "Out"
                },
                {
                  id: "4MkyWloxw2cMqL",
                  player_id: "4yIOlHpfiREBfJ",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "SAC"
                },
                {
                  id: "40fF3EKZVAqktS",
                  player_id: "4SFlePddQQh8OY",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "E"
                }
              ]
            },
            {
              id: "4Ju8hnXrGUPtIk",
              opponent: "Bad Guys 2",
              lineup: ["4f4CQExEegoHbV", "4yIOlHpfiREBfJ", "4SFlePddQQh8OY"],
              date: "2018-10-10",
              park: "Stazio",
              scoreUs: 0,
              scoreThem: 0,
              lineupType: 2,
              plateAppearances: [
                {
                  id: "4EhlxCjaM3VSUh",
                  player_id: "4f4CQExEegoHbV",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "Out"
                },
                {
                  id: "4GgpbT2BIAykck",
                  player_id: "4yIOlHpfiREBfJ",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "2B"
                },
                {
                  id: "4HN7dirqjZvrXQ",
                  player_id: "4SFlePddQQh8OY",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "1B"
                }
              ]
            }
          ]
        },
        {
          id: "4W78nKNVldoDZ4",
          name: "Just for fun",
          games: []
        },
        {
          id: "4fKFOTF7Wn4WIa",
          name: "Pizza Team",
          games: [
            {
              id: "4hHxL4AhHvS5El",
              opponent: "Pizza Game",
              lineup: ["47guOwUQN5QLPc", "4ZqtZbpYtlxOVW", "4ePGkCgKNTSnH4"],
              date: "2018-10-10",
              park: "Stazio",
              scoreUs: 0,
              scoreThem: 0,
              lineupType: 1,
              plateAppearances: [
                {
                  id: "4FAKJaKkpvUGwv",
                  player_id: "47guOwUQN5QLPc",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "1B"
                },
                {
                  id: "4yIffY8qsCpNr9",
                  player_id: "4ZqtZbpYtlxOVW",
                  location: {
                    x: 13141,
                    y: 22141
                  },
                  result: "2B"
                },
                {
                  id: "4UvsHLN0x3MQIG",
                  player_id: "4ePGkCgKNTSnH4",
                  location: {
                    x: 12141,
                    y: 12141
                  },
                  result: "3B"
                },
                {
                  id: "4VNCsBleBuQJCy",
                  player_id: "47guOwUQN5QLPc",
                  location: {
                    x: 123,
                    y: 23515
                  },
                  result: "Out"
                },
                {
                  id: "4LBFbOLR3Ri7xC",
                  player_id: "4ZqtZbpYtlxOVW",
                  location: {
                    x: 12141,
                    y: 19141
                  },
                  result: "HRo"
                },
                {
                  id: "4ncOGowVfcNET3",
                  player_id: "4ePGkCgKNTSnH4",
                  location: {
                    x: 22141,
                    y: 12141
                  },
                  result: "1B"
                }
              ]
            },
            {
              id: "4M6UuAFJsfQukP",
              opponent: "Another Game",
              lineup: [],
              date: "2018-10-10",
              park: "Stazio",
              scoreUs: 0,
              scoreThem: 0,
              lineupType: 2,
              plateAppearances: []
            }
          ]
        }
      ]
    };
  }

  // Login with any user name and the password "pizza"
  async getAccountFromEmail(email) {
    return {
      id: 1,
      password_hash:
        "$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2"
    };
  }

  getState(account_id) {
    return this.SAMPLE_STATE;
  }

  async setState(data) {
    let result = await getStatePromise();
    var ancestorDiffs = objectMerge.diff(
      this.SAMPLE_STATE,
      JSON.parse(data.ancestor)
    );
    if (
      Object.keys(ancestorDiffs).length === 0 &&
      ancestorDiffs.constructor === Object
    ) {
      // Diff the client's data with the db data to get the patch we need to apply to make the database match the client
      var patch = objectMerge.diff(result, JSON.parse(data.local));
      objectMerge.patch(this.SAMPLE_STATE, patch);
    } else {
      responseObject.status = "FAIL";
      responseObject.reason = "PENDING CHANGES - PULL FIRST";
      res.send(JSON.stringify(responseObject));
    }
  }
};

// Node only
module.exports = databaseCalls;
