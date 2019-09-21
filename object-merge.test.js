const objectMerge = require('./object-merge.js');

let baseState = {
  players: [
    {
      id: 1,
      name: 'Thomas',
      gender: 'M',
      picture: null,
    },
    {
      id: 2,
      name: 'Benjamin',
      gender: 'M',
      picture: null,
    },
    {
      id: 3,
      name: 'Lauren',
      gender: 'F',
      picture: null,
    },
    {
      id: 4,
      name: 'Katelyn',
      gender: 'F',
      picture: null,
    },
    {
      id: 5,
      name: 'Katie',
      gender: 'F',
      picture: null,
    },
  ],
  teams: [
    {
      games: [
        {
          plateAppearances: [
            {
              id: 35,
              player_id: 3,
              result: 'E',
              location: {
                x: 0.57772,
                y: 0.520725,
              },
              plateAppearanceIndex: 1,
            },
            {
              id: 36,
              player_id: 1,
              result: '1B',
              location: {
                x: 0.632124,
                y: 0.336788,
              },
              plateAppearanceIndex: 2,
            },
            {
              id: 37,
              player_id: 4,
              result: '1B',
              location: {
                x: 0.297927,
                y: 0.349741,
              },
              plateAppearanceIndex: 3,
            },
          ],
          id: 10,
          opponent: 'Upper Deckers',
          date: 1521609321600,
          park: 'Stazio',
          score_us: 0,
          score_them: 0,
          lineup_type: 2,
          lineup: [3, 4, 5, 8, 1, 2],
        },
      ],
      id: 123,
      name: 'T^2',
      roster: [],
    },
  ],
};

test('Edit - diff and patch', () => {
  let stateA = JSON.parse(JSON.stringify(baseState)); // deep copy
  let stateB = JSON.parse(JSON.stringify(baseState));
  stateB.players[0].name = 'Jamal';
  stateB.teams[0].games[0].plateAppearances[2].location.x = 0.12344;
  let patch = objectMerge.diff(stateA, stateB);

  let expectedPatch = {
    players: {
      '1': {
        name: {
          op: 'Edit',
          key: 'name',
          param1: 'Thomas',
          param2: 'Jamal',
        },
      },
    },
    teams: {
      '123': {
        games: {
          '10': {
            plateAppearances: {
              '37': {
                location: {
                  x: {
                    op: 'Edit',
                    key: 'x',
                    param1: 0.297927,
                    param2: 0.12344,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  expect(patch).toEqual(expectedPatch);

  let newObject = objectMerge.patch(stateA, patch);
  expect(newObject).toEqual(stateB);
});

test('ArrayAdd - diff and patch', () => {
  let stateA = JSON.parse(JSON.stringify(baseState));
  let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy
  stateB.players.push({
    id: 6,
    name: 'Jamal',
    gender: 'M',
  });
  stateB.teams[0].games[0].plateAppearances.push({
    id: 38,
    player_id: 3,
    result: 'E',
    location: {
      x: 0.57772,
      y: 0.520725,
    },
    plateAppearanceIndex: 1,
  });
  let patch = objectMerge.diff(stateA, stateB);

  let expectedPatch = {
    players: {
      'T8auMWB7NgJ9neGe/krF9g': {
        op: 'ArrayAdd',
        key: 'T8auMWB7NgJ9neGe/krF9g',
        param1: '{"id":6,"name":"Jamal","gender":"M"}',
        param2: 5,
      },
    },
    teams: {
      '123': {
        games: {
          '10': {
            plateAppearances: {
              'vU8qy8N/Dv2Ol45IMFryNA': {
                op: 'ArrayAdd',
                key: 'vU8qy8N/Dv2Ol45IMFryNA',
                param1:
                  '{"id":38,"player_id":3,"result":"E","location":{"x":0.57772,"y":0.520725},"plateAppearanceIndex":1}',
                param2: 3,
              },
            },
          },
        },
      },
    },
  };

  expect(patch).toEqual(expectedPatch);

  let newObject = objectMerge.patch(stateA, patch);
  expect(newObject).toEqual(stateB);
});

test('Add - diff and patch', () => {
  let stateA = JSON.parse(JSON.stringify(baseState));
  let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy

  // Add
  stateB.players[2].walkup_song = 'https://www.youtube.com/watch?v=RMR5zf1J1Hs';

  let patch = objectMerge.diff(stateA, stateB);

  let expectedPatch = {
    players: {
      '3': {
        walkup_song: {
          op: 'Add',
          key: 'walkup_song',
          param1: 'https://www.youtube.com/watch?v=RMR5zf1J1Hs',
        },
      },
    },
  };

  expect(patch).toEqual(expectedPatch);

  let newObject = objectMerge.patch(stateA, patch);
  expect(newObject).toEqual(stateB);
});

test('Re-Order - diff and patch', () => {
  let stateA = JSON.parse(JSON.stringify(baseState));
  let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy

  // Re-order
  stateB.teams[0].games[0].lineup = [4, 3, 5, 1, 2, 8];

  let patch = objectMerge.diff(stateA, stateB);

  let expectedPatch = {
    teams: {
      '123': {
        games: {
          '10': {
            lineup: {
              ReOrder: {
                op: 'ReOrder',
                key: 'ReOrder',
                param1: '[3,4,5,8,1,2]',
                param2: '[4,3,5,1,2,8]',
              },
            },
          },
        },
      },
    },
  };

  expect(patch).toEqual(expectedPatch);

  let newObject = objectMerge.patch(stateA, patch);
  expect(newObject).toEqual(stateB);
});

test('Delete - diff and patch', () => {
  let stateA = JSON.parse(JSON.stringify(baseState));
  let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy
  stateB.players.splice(3, 1);
  let patch = objectMerge.diff(stateA, stateB);

  let expectedPatch = {
    players: {
      '4': {
        op: 'Delete',
        key: 4,
      },
    },
  };

  expect(patch).toEqual(expectedPatch);

  let newObject = objectMerge.patch(stateA, patch);
  expect(newObject).toEqual(stateB);
});

test('Reorder, ArrayAdd, Delete - diff and patch', () => {
  let stateA = JSON.parse(JSON.stringify(baseState));
  let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy

  // Re-order
  stateB.teams[0].games[0].lineup = [11, 4, 16, 17, 3, 5, 1, 18];

  let patch = objectMerge.diff(stateA, stateB);

  let expectedPatch = {
    teams: {
      '123': {
        games: {
          '10': {
            lineup: {
              '2': {
                op: 'Delete',
                key: 2,
              },
              '8': {
                op: 'Delete',
                key: 8,
              },
              '11': {
                op: 'ArrayAdd',
                key: '11',
                param1: '11',
                param2: 0,
              },
              '16': {
                op: 'ArrayAdd',
                key: '16',
                param1: '16',
                param2: 2,
              },
              '17': {
                op: 'ArrayAdd',
                key: '17',
                param1: '17',
                param2: 3,
              },
              '18': {
                op: 'ArrayAdd',
                key: '18',
                param1: '18',
                param2: 7,
              },
              ReOrder: {
                op: 'ReOrder',
                key: 'ReOrder',
                param1: '[3,4,5,1]',
                param2: '[4,3,5,1]',
              },
            },
          },
        },
      },
    },
  };

  expect(patch).toEqual(expectedPatch);

  let newObject = objectMerge.patch(stateA, patch);
  expect(newObject).toEqual(stateB);
});

test('Partial Patches -- Edit something that has already been deleted with and without partial patches', () => {
  let stateA = JSON.parse(JSON.stringify(baseState));
  let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy

  // Edit a game
  stateB.teams[0].games[0].plateAppearances[2].location.x = 0.12344;

  let patch = objectMerge.diff(stateA, stateB);

  // Delete the game we just edited
  stateA.teams[0].games.splice(0, 1);

  // Without partial patches we expect an error
  expect(() => {
    objectMerge.patch(stateA, patch);
  }).toThrow('This patch can not be applied');

  // With partial patches we expect no changes
  let newObject = objectMerge.patch(stateA, patch, true);

  expect(newObject).toEqual(stateA);
});

test('Partial Patches -- Add something that already exists with and without partial patches', () => {
  let stateA = JSON.parse(JSON.stringify(baseState));
  let stateB = JSON.parse(JSON.stringify(baseState)); // deep copy
  let stateC = JSON.parse(JSON.stringify(baseState)); // deep copy

  // Modify a game
  stateA.teams[0].games[0] = {
    plateAppearances: [
      {
        id: 37,
        player_id: 4,
        result: '2B',
        location: {
          x: 0.297927,
          y: 0.349741,
        },
        plateAppearanceIndex: 3,
      },
    ],
    id: 10,
    opponent: 'Modified Opponent',
    date: 1521609321600,
    park: 'Stazio',
    score_us: 0,
    score_them: 0,
    lineup_type: 2,
    newProperty: 'pizza',
    lineup: [3, 4, 5, 8, 2, 1],
  };

  // Delete the game we just edited in a state A so we can get a patch that adds it back
  stateB.teams[0].games.splice(0, 1);
  let patch = objectMerge.diff(stateB, stateA);

  // Attempting to apply that patch (with an arrayAdd) to a state that already has that object without partial patches we expect an error
  expect(() => {
    objectMerge.patch(stateC, patch);
  }).toThrow('This patch can not be applied');

  console.log(stateC.teams[0].games[0]);

  // With partial patches we expect the objects to be merge. The first patch's edits should win in case of conflict but no unmodified entries should be deleted.
  objectMerge.patch(stateC, patch, true);

  let expected = {
    plateAppearances: [
      {
        id: 35,
        player_id: 3,
        result: 'E',
        location: {
          x: 0.57772,
          y: 0.520725,
        },
        plateAppearanceIndex: 1,
      },
      {
        id: 36,
        player_id: 1,
        result: '1B',
        location: {
          x: 0.632124,
          y: 0.336788,
        },
        plateAppearanceIndex: 2,
      },
      {
        id: 37,
        player_id: 4,
        result: '2B',
        location: {
          x: 0.297927,
          y: 0.349741,
        },
        plateAppearanceIndex: 3,
      },
    ],
    id: 10,
    opponent: 'Modified Opponent',
    date: 1521609321600,
    park: 'Stazio',
    score_us: 0,
    score_them: 0,
    lineup_type: 2,
    newProperty: 'pizza',
    lineup: [3, 4, 5, 8, 2, 1],
  };

  expect(stateC.teams[0].games[0]).toEqual(expected);
});
