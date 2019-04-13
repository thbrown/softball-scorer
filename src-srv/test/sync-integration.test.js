/*eslint no-process-exit:*/
"use strict";

const objectHash = require("object-hash");
const got = require("got");

const CacheCallsLocal = require("../cache-calls-local");
const config = require("../config");
const DatabaseCallsPostgres = require("../database-calls-postgres");
const MockDb = require("./database-calls-mock");
const objectMerge = require("../../object-merge.js");
const SoftballServer = require("../softball-server");
const StateTester = require("./test-state-tracker.js");
const utils = require("./test-utils.js");

/**
 * This test requires an attached postgres database.
 * It runs through common sync cases to make sure there are no regressions prior to release.
 */
describe("sync", () => {
  beforeAll(async () => {
    const pghost = config.database.host;
    const pgport = config.database.port;
    const username = config.database.username;
    const password = config.database.password;
    this.databaseCalls = new DatabaseCallsPostgres(
      pghost,
      pgport,
      username,
      password
    );
    this.cache = new CacheCallsLocal();
    this.server = new SoftballServer(this.databaseCalls, this.cache);
    this.server.start();

    let email = `syncTest${utils.randomId(10)}@softball.app`;
    let accountPassword = "pizza";

    await utils.signup(email, password);
    this.sessionId = await utils.login(email, accountPassword);
    this.stateTracker = new StateTester(this.sessionId);
  });

  afterAll(async () => {
    await utils.deleteAccount(this.sessionId);
    this.server.stop();
    this.databaseCalls.disconnect();
  });

  test("Sync - Team", async () => {
    // Create
    let clientAncestorState = utils.getInitialState();
    let clientLocalState = {
      teams: [
        {
          id: "4MWewta24olLam",
          name: "BigTeam",
          games: []
        }
      ],
      optimizations: [],
      players: []
    };
    let clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
    let clientHash = utils.getMd5(clientLocalState);

    let response = await utils.sync(this.sessionId, clientHash, clientPatch);
    let serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(clientHash);

    // Edit
    clientAncestorState = clientLocalState;
    clientLocalState = {
      teams: [
        {
          id: "4MWewta24olLam",
          name: "ActuallyThisBigTeam",
          games: []
        }
      ],
      optimizations: [],
      players: []
    };

    clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
    clientHash = utils.getMd5(clientLocalState);

    response = await utils.sync(this.sessionId, clientHash, clientPatch);
    serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(clientHash);

    // Delete
    clientAncestorState = clientLocalState;
    clientLocalState = { teams: [], players: [], optimizations: [] };

    clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
    clientHash = utils.getMd5(clientLocalState);

    response = await utils.sync(this.sessionId, clientHash, clientPatch);
    serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(clientHash);
  });

  test("Sync - Game", async () => {
    let startingState = {
      teams: [
        {
          id: "4r4jmPNazKYJaa",
          name: "Big Team",
          games: []
        }
      ],
      optimizations: [],
      players: []
    };

    await this.stateTracker.syncStateClientUpdatesOnly(startingState);

    let addGameState = {
      teams: [
        {
          id: "4r4jmPNazKYJaa",
          name: "Big Team",
          games: [
            {
              id: "4VWzK8D1cGkvi3",
              opponent: "Big Game",
              lineup: [],
              date: 1540356503,
              park: "Stazio",
              lineupType: 2,
              plateAppearances: []
            }
          ]
        }
      ],
      optimizations: [],
      players: []
    };

    await this.stateTracker.syncStateClientUpdatesOnly(addGameState);

    let editGameState = {
      teams: [
        {
          id: "45r4jmPNazKYJa",
          name: "Big Team",
          games: [
            {
              id: "4VWzK8D1cGkvi3",
              opponent: "Actually this Big Game",
              lineup: [],
              date: 1540356503,
              park: "Stazio",
              lineupType: 1,
              plateAppearances: []
            }
          ]
        }
      ],
      optimizations: [],
      players: []
    };

    await this.stateTracker.syncStateClientUpdatesOnly(editGameState);
    await this.stateTracker.syncStateClientUpdatesOnly(startingState);

    // Cleanup
    await this.stateTracker.syncStateClientUpdatesOnly(utils.getInitialState());
  });

  test("Sync - Lineup", async () => {
    let startingState = {
      teams: [
        {
          id: "45LFQiz0K9DGbD",
          name: "TestGame",
          games: [
            {
              id: "04snLyiYIV1cWy",
              opponent: "TestOpponent",
              lineup: [
                "4m3c0OhmJB9XrT",
                "48MwsctdTtmLHp",
                "4kdmhNihlb7S7V",
                "4GjWMa9kDM9ckP",
                "04ugtRIyb7ZPXy",
                "4BDYmWaFhNWmrI"
              ],
              date: 1540356768,
              park: "Stazio",
              lineupType: 2,
              plateAppearances: []
            }
          ]
        }
      ],
      optimizations: [],
      players: [
        {
          id: "4m3c0OhmJB9XrT",
          name: "Dave",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "48MwsctdTtmLHp",
          name: "Allison",
          gender: "F",
          song_link: null,
          song_start: null
        },
        {
          id: "4kdmhNihlb7S7V",
          name: "Paul",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4GjWMa9kDM9ckP",
          name: "Catherine",
          gender: "F",
          song_link: null,
          song_start: null
        },
        {
          id: "04ugtRIyb7ZPXy",
          name: "Peter",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4BDYmWaFhNWmrI",
          name: "Therese",
          gender: "F",
          song_link: null,
          song_start: null
        }
      ]
    };

    await this.stateTracker.syncStateClientUpdatesOnly(startingState);

    let editGameState = {
      teams: [
        {
          id: "45LFQiz0K9DGbD",
          name: "TestGame",
          games: [
            {
              id: "04snLyiYIV1cWy",
              opponent: "TestOpponent",
              lineup: [
                "4m3c0OhmJB9XrT",
                "4kdmhNihlb7S7V",
                "4GjWMa9kDM9ckP",
                "48MwsctdTtmLHp",
                "4BDYmWaFhNWmrI",
                "04ugtRIyb7ZPXy"
              ],
              date: 1540356768,
              park: "Stazio",
              lineupType: 2,
              plateAppearances: []
            }
          ]
        }
      ],
      optimizations: [],
      players: [
        {
          id: "4m3c0OhmJB9XrT",
          name: "Dave",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "48MwsctdTtmLHp",
          name: "Allison",
          gender: "F",
          song_link: null,
          song_start: null
        },
        {
          id: "4kdmhNihlb7S7V",
          name: "Paul",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4GjWMa9kDM9ckP",
          name: "Catherine",
          gender: "F",
          song_link: null,
          song_start: null
        },
        {
          id: "04ugtRIyb7ZPXy",
          name: "Peter",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4BDYmWaFhNWmrI",
          name: "Therese",
          gender: "F",
          song_link: null,
          song_start: null
        }
      ]
    };

    await this.stateTracker.syncStateClientUpdatesOnly(editGameState);
    await this.stateTracker.syncStateClientUpdatesOnly(startingState);

    // Cleanup
    await this.stateTracker.syncStateClientUpdatesOnly(utils.getInitialState());
  });

  test("Sync - Plate Appearances", async () => {
    let startingState = {
      teams: [
        {
          id: "48aClyxA7PILgd",
          name: "TestTeam",
          games: [
            {
              id: "4Zk4YqDwq22BNI",
              opponent: "TestGame",
              lineup: [
                "4Q1Mf6d01Akubt",
                "4hGBYagKOOERtm",
                "4E004Ivz24SCNW",
                "4SffIh2Ra8XyT7"
              ],
              date: 1540599203395,
              park: "Stazio",
              lineupType: 2,
              plateAppearances: []
            }
          ]
        }
      ],
      optimizations: [],
      players: [
        {
          id: "4Q1Mf6d01Akubt",
          name: "Peter",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4hGBYagKOOERtm",
          name: "Mary",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4E004Ivz24SCNW",
          name: "Paul",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4SffIh2Ra8XyT7",
          name: "Abigail",
          gender: "F",
          song_link: null,
          song_start: null
        }
      ]
    };

    await this.stateTracker.syncStateClientUpdatesOnly(startingState);

    let addPaState = {
      teams: [
        {
          id: "48aClyxA7PILgd",
          name: "TestTeam",
          games: [
            {
              id: "4Zk4YqDwq22BNI",
              opponent: "TestGame",
              lineup: [
                "4Q1Mf6d01Akubt",
                "4hGBYagKOOERtm",
                "4E004Ivz24SCNW",
                "4SffIh2Ra8XyT7"
              ],
              date: 1540599203395,
              park: "Stazio",
              lineupType: 2,
              plateAppearances: [
                {
                  id: "4QucKkUKnkr3yD",
                  player_id: "4Q1Mf6d01Akubt",
                  result: "Out",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "04fXi5mpgMXbOJ",
                  player_id: "4hGBYagKOOERtm",
                  result: "",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "40I2WsBtW97MJM",
                  player_id: "4E004Ivz24SCNW",
                  location: {
                    x: null,
                    y: null
                  },
                  result: "2B"
                },
                {
                  id: "4e7hfl3NLOn7w6",
                  player_id: "4SffIh2Ra8XyT7",
                  result: "",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4SiyB24q1vd8lA",
                  player_id: "4Q1Mf6d01Akubt",
                  result: "",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "4xJs56Q1Qq7FoM",
                  player_id: "4hGBYagKOOERtm",
                  result: "Out",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "4hAeUt5uqA9XEf",
                  player_id: "4E004Ivz24SCNW",
                  result: "2B",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "4k14wu1RemmEOw",
                  player_id: "4SffIh2Ra8XyT7",
                  result: "3B",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "04ycDmPkfD1iG3",
                  player_id: "4Q1Mf6d01Akubt",
                  result: "HRi",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4dqHEceFEBNtgd",
                  player_id: "4hGBYagKOOERtm",
                  result: "HRo",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4jE9W3SA02TCQt",
                  player_id: "4E004Ivz24SCNW",
                  result: "HRi",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4zIsqbshLu5Q58",
                  player_id: "4SffIh2Ra8XyT7",
                  result: "E",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "0462WifgeRHq1v",
                  player_id: "4Q1Mf6d01Akubt",
                  result: "FC",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4E8fqM3eLYlLEu",
                  player_id: "4hGBYagKOOERtm",
                  result: "SAC",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "04ioKppUw6azzT",
                  player_id: "4E004Ivz24SCNW",
                  result: "K",
                  location: {
                    x: null,
                    y: null
                  }
                }
              ]
            }
          ]
        }
      ],
      optimizations: [],
      players: [
        {
          id: "4Q1Mf6d01Akubt",
          name: "Peter",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4hGBYagKOOERtm",
          name: "Mary",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4E004Ivz24SCNW",
          name: "Paul",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4SffIh2Ra8XyT7",
          name: "Abigail",
          gender: "F",
          song_link: null,
          song_start: null
        }
      ]
    };

    await this.stateTracker.syncStateClientUpdatesOnly(addPaState);

    let editPaState = {
      teams: [
        {
          id: "48aClyxA7PILgd",
          name: "TestTeam",
          games: [
            {
              id: "4Zk4YqDwq22BNI",
              opponent: "TestGame",
              lineup: [
                "4Q1Mf6d01Akubt",
                "4hGBYagKOOERtm",
                "4E004Ivz24SCNW",
                "4SffIh2Ra8XyT7"
              ],
              date: 1540599203395,
              park: "Stazio",
              lineupType: 2,
              plateAppearances: [
                {
                  id: "4QucKkUKnkr3yD",
                  player_id: "4Q1Mf6d01Akubt",
                  result: "Out",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "04fXi5mpgMXbOJ",
                  player_id: "4hGBYagKOOERtm",
                  result: "",
                  location: {
                    x: 2141,
                    y: 22141
                  }
                },
                {
                  id: "40I2WsBtW97MJM",
                  player_id: "4E004Ivz24SCNW",
                  result: "2B",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "4e7hfl3NLOn7w6",
                  player_id: "4SffIh2Ra8XyT7",
                  result: "HRi",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4SiyB24q1vd8lA",
                  player_id: "4Q1Mf6d01Akubt",
                  result: "",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "4xJs56Q1Qq7FoM",
                  player_id: "4hGBYagKOOERtm",
                  result: "Out",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "4hAeUt5uqA9XEf",
                  player_id: "4E004Ivz24SCNW",
                  result: "2B",
                  location: {
                    x: null,
                    y: null
                  }
                },
                {
                  id: "4k14wu1RemmEOw",
                  player_id: "4SffIh2Ra8XyT7",
                  result: "3B",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4dqHEceFEBNtgd",
                  player_id: "4hGBYagKOOERtm",
                  result: "HRo",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4jE9W3SA02TCQt",
                  player_id: "4E004Ivz24SCNW",
                  result: "HRi",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4zIsqbshLu5Q58",
                  player_id: "4SffIh2Ra8XyT7",
                  result: "E",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "0462WifgeRHq1v",
                  player_id: "4Q1Mf6d01Akubt",
                  result: "FC",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "4E8fqM3eLYlLEu",
                  player_id: "4hGBYagKOOERtm",
                  result: "SAC",
                  location: {
                    x: 12141,
                    y: 12141
                  }
                },
                {
                  id: "04ioKppUw6azzT",
                  player_id: "4E004Ivz24SCNW",
                  result: "K",
                  location: {
                    x: null,
                    y: null
                  }
                }
              ]
            }
          ]
        }
      ],
      optimizations: [],
      players: [
        {
          id: "4Q1Mf6d01Akubt",
          name: "Peter",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4hGBYagKOOERtm",
          name: "Mary",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4E004Ivz24SCNW",
          name: "Paul",
          gender: "M",
          song_link: null,
          song_start: null
        },
        {
          id: "4SffIh2Ra8XyT7",
          name: "Abigail",
          gender: "F",
          song_link: null,
          song_start: null
        }
      ]
    };

    await this.stateTracker.syncStateClientUpdatesOnly(editPaState);
    await this.stateTracker.syncStateClientUpdatesOnly(startingState);

    // Cleanup
    await this.stateTracker.syncStateClientUpdatesOnly(utils.getInitialState());
  });

  /*
  test("Sync - Optimizations", async () => {
    // Create
    let clientAncestorState = utils.getInitialState();
    let clientLocalState = {
      teams: [
        {
          id: "4MWewta24olLam",
          name: "BigTeam",
          games: []
        }
      ],
      players: [],
      optomizations: [
        {
          id: "5iWewta24olLam",
          name: "Big sim",
          data: "...",
          completed: 233,
          total: 1000,
          lineup: [],
          histogram: {}
        },
        {}
      ]
    };
    let clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
    let clientHash = utils.getMd5(clientLocalState);

    let response = await utils.sync(this.sessionId, clientHash, clientPatch);
    let serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(clientHash);

    // Edit
    clientAncestorState = clientLocalState;
    clientLocalState = {
      teams: [
        {
          id: "4MWewta24olLam",
          name: "ActuallyThisBigTeam",
          games: []
        }
      ],
      players: []
    };

    clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
    clientHash = utils.getMd5(clientLocalState);

    response = await utils.sync(this.sessionId, clientHash, clientPatch);
    serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(clientHash);

    // Delete
    clientAncestorState = clientLocalState;
    clientLocalState = { teams: [], players: [] };

    clientPatch = objectMerge.diff(clientAncestorState, clientLocalState);
    clientHash = utils.getMd5(clientLocalState);

    response = await utils.sync(this.sessionId, clientHash, clientPatch);
    serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(clientHash);
  });
  */
});
