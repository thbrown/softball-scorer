const objectMerge = require('../utils/object-merge.js');
const utils = require('../utils/common-utils.js');

test('PATCH: Arrays maintain ordering on patch', () => {
  const BASE = {
    lineup: [
      '1CWXFOLUGu5kTH',
      '0000000000000B',
      '00000000000002',
      '1Wl1TC2aF2JF7d',
      '00000000000001',
      '2mQ74fPkiYKgp2',
      '00000000000003',
      '0QNxIPfgaAkYBI',
      '3ID5Ku7F0Sa7Kk',
      '5exz4RNKa2qs1P',
      '3CDUFVMThOQNDR',
      '1mx5oJRIVHChQ5',
    ],
  };
  const CHANGE = JSON.parse(JSON.stringify(BASE)).lineup.splice(5, 1);
  let patch = objectMerge.diff(BASE, CHANGE);
  let document = objectMerge.patch(BASE, patch);
  let end = utils.getHash(document);
  expect(document).toEqual(CHANGE);
});

test('PATCH: Empty patches cause no changes', () => {
  const BASE = {
    lineup: [
      '1CWXFOLUGu5kTH',
      '0000000000000B',
      '00000000000002',
      '1Wl1TC2aF2JF7d',
      '00000000000001',
      '2mQ74fPkiYKgp2',
      '00000000000003',
      '0QNxIPfgaAkYBI',
      '3ID5Ku7F0Sa7Kk',
      '5exz4RNKa2qs1P',
      '3CDUFVMThOQNDR',
      '1mx5oJRIVHChQ5',
    ],
  };
  let patch = [];
  let document = objectMerge.patch(BASE, patch);
  let end = utils.getHash(document);
  expect(document).toEqual(BASE);
});

test('PATCH: Reordering of objects w/ ids in an array', () => {
  let inputA = [
    { id: 321, name: 'Matthew' },
    { id: 427, name: 'Mark' },
    { id: 112, name: 'Luke' },
    { id: 314, name: 'John' },
  ];
  let inputB = [
    { id: 112, name: 'Luke' },
    { id: 321, name: 'Matthew' },
    { id: 314, name: 'John' },
    { id: 427, name: 'Mark' },
  ];

  let patch = objectMerge.diff(inputA, inputB);
  let document = objectMerge.patch(inputA, patch);

  expect(document).toEqual(inputB);
});

test('PATCH: Patching that results in an empty array, remains an array', () => {
  let documentA = [{ id: 1 }];
  let documentB = [];
  let documentC = [{ id: 1 }];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentC, patch);
  expect(Array.isArray(document)).toEqual(true);
});

test('PATCH: Patching that results in an empty object, remains an object', () => {
  let documentA = { pizza: true };
  let documentB = {};
  let documentC = { pizza: true };
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentC, patch);
  expect(utils.isObject(document)).toEqual(true);
});

test('PATCH: Reordering numeric arrays', () => {
  let documentA = [0, 1, 2, 3, 5];
  let documentB = [5, 2, 0, 3, 1];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch);
  expect(document).toEqual([5, 2, 0, 3, 1]);
});

test('PATCH: Reordering string arrays', () => {
  let documentA = ['0', '1', '2', '3', '5'];
  let documentB = ['5', '2', '0', '3', '1'];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch);
  expect(document).toEqual(['5', '2', '0', '3', '1']);
});

test('PATCH: Reordering numeric arrays w/ addition & subtraction', () => {
  let documentA = [0, 1, 2, 3, 5];
  let documentB = [5, 2, 4, 3, 1];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch);
  expect(document).toEqual([5, 2, 4, 3, 1]);
});

test('PATCH: Reordering string arrays w/ addition & subtraction', () => {
  let documentA = ['0', '1', '2', '3', '5'];
  let documentB = ['5', '2', '4', '3', '1'];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch);
  expect(document).toEqual(['5', '2', '4', '3', '1']);
});

test('MERGE: Arrays with numbers are merged properly', () => {
  let documentA = [0, 1, 2, 3, 5];
  let documentB = [4, 3];
  let documentC = [2, 10, 11, 3];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentC, patch);
  // "3" and "10" are competing for the spot at index 1
  // Either one could win, we let the lowest value (natural ordering) win in case of a tie
  expect(document).toEqual([4, 3, 10, 11]);
});

test('MERGE: Arrays with strings are merged properly', () => {
  let documentA = ['0', '1', '2', '3', '5'];
  let documentB = ['4', '3'];
  let documentC = ['2', '3', '10', '11'];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentC, patch);
  expect(document).toEqual(['4', '3', '10', '11']);
});

test('MERGE: Documents are merged when deletes are disabled', () => {
  let documentA = [{ id: 1 }, { id: 2 }, { id: 3 }];
  let documentB = [{ id: 3 }, { id: 4 }, { id: 5 }];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch, true, true);
  expect(document.length).toEqual(5);
});

test('MERGE: Patch fields win on collision', () => {
  let documentA = [
    { id: 1, name: 'Harry' },
    { id: 2, name: 'Ron' },
    { id: 3, name: 'Hermione' },
  ];
  let documentB = [
    { id: 3, name: 'Millicent' },
    { id: 4, name: 'Crab' },
    { id: 5, name: 'Goyle' },
  ];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch, true, true);
  console.log(patch);
  console.log(document);
  expect(document.length).toEqual(5);
  expect(document[0].name).toEqual('Millicent');
});

test('MERGE: Array w/ ids - nested - without existing members', () => {
  let documentA = { slytherins: [] };
  let documentB = {
    slytherins: [
      { id: 3, name: 'Millicent' },
      { id: 4, name: 'Crab' },
      { id: 5, name: 'Goyle' },
    ],
  };
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch, true, true);
  expect(Object.keys(document.slytherins).length).toEqual(3);
});

test('MERGE: Array w/ ids - nested - without existing members - reverse', () => {
  let documentA = {
    slytherins: [
      { id: 3, name: 'Millicent' },
      { id: 4, name: 'Crab' },
      { id: 5, name: 'Goyle' },
    ],
  };
  let documentB = { slytherins: [] };

  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch, true, true);
  expect(Object.keys(document.slytherins).length).toEqual(3);
});

test('MERGE: Array w/ ids - nested - without existing members into third array - SCENARIO A', () => {
  let documentA = { slytherins: [] };
  let documentB = { slytherins: [{ id: 3, name: 'Millicent' }] };
  let documentC = {
    slytherins: [
      { id: 4, name: 'Crab' },
      { id: 5, name: 'Goyle' },
    ],
  };

  let patch = objectMerge.diff(documentA, documentB);
  console.log(patch);

  let document = objectMerge.patch(documentC, patch, true, true);
  expect(Object.keys(document.slytherins).length).toEqual(3);
});

// Adding to populated array with ids
// Merging array without ids
test('MERGE: Array w/ ids - root - without existing members [Empty array bug]', () => {
  let documentA = [];
  let documentB = [
    { id: '~/~3', name: 'Millicent' },
    { id: '~/~4', name: 'Crab' },
    { id: '~/~5', name: 'Goyle' },
  ];
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch, true, true);
  expect(document.length).toEqual(3);
});

test('MERGE: Existing objects still exist after merge [Empty array bug - merge only]', () => {
  let documentA = {
    slytherins: [
      { id: 3, name: 'Millicent' },
      { id: 4, name: 'Crab' },
      { id: 5, name: 'Goyle' },
    ],
  };
  let documentB = {
    slytherins: [],
  };
  let patch = objectMerge.diff(documentA, documentB);

  let document = objectMerge.patch(documentA, patch, true, true);
  expect(Object.keys(document.slytherins).length).toEqual(3);
});

test('DELETION: Tolerate edits on objects that do not exist (these should be NO-OPs not errors)', () => {
  let documentA = {
    1: { name: 'bill' },
    2: { name: 'hill' },
    3: { name: 'boys' },
  };
  let documentB = {
    1: { name: 'bill' },
    2: { name: 'hill' },
    3: { name: 'bois' },
  };
  let documentC = { 1: { name: 'bill' }, 2: { name: 'hill' } };
  let patch = objectMerge.diff(documentA, documentB);
  let result = objectMerge.patch(documentC, patch, true);
  expect(result).toEqual(documentC);
});

test('ADDITION: Tolerate adds of elements that already exist (these should be NO-OPs not errors)', () => {
  var documentA = {
    1: { name: 'bill' },
    2: { name: 'hill' },
  };
  var documentB = {
    1: { name: 'bill' },
    2: { name: 'hill' },
    3: { name: 'boys' },
  };
  var documentC = {
    1: { name: 'bill' },
    2: { name: 'hill' },
    3: { name: 'boys' },
  };
  var patch = objectMerge.diff(documentA, documentB);
  let result = objectMerge.patch(documentC, patch, true);
  expect(result).toEqual(documentC);
});

test('Create RFC6902 compatible document', () => {
  let input = [
    { id: 321, name: 'Matthew' },
    { id: 427, name: 'Mark' },
    { id: 112, name: 'Luke' },
    { id: 314, name: 'John' },
  ];
  let expected = {
    '#321': { _name: 'Matthew' },
    '#427': { _name: 'Mark' },
    '#112': { _name: 'Luke' },
    '#314': { _name: 'John' },
    '&order': {
      112: 2,
      314: 3,
      321: 0,
      427: 1,
    },
  };

  let output = objectMerge._toRFC6902(input);
  expect(utils.sortJson(output)).toEqual(utils.sortJson(expected));
});

test('Restore from RFC6902 compatible document', () => {
  let input = {
    '#321': { _name: 'Matthew', _synoptic: true },
    '#427': { _name: 'Mark', _synoptic: true },
    '#112': { _name: 'Luke', _synoptic: true },
    '#314': { _name: 'John', _synoptic: false },
    '&order': { 321: 0, 427: 1, 112: 2, 314: 3 },
  };

  let expected = [
    { id: 321, name: 'Matthew', synoptic: true },
    { id: 427, name: 'Mark', synoptic: true },
    { id: 112, name: 'Luke', synoptic: true },
    { id: 314, name: 'John', synoptic: false },
  ];

  let output = objectMerge._fromRFC6902(input);
  expect(utils.sortJson(output)).toEqual(utils.sortJson(expected));
});

test('Tolerate misplaced &order keys', () => {
  let expected = [
    { id: 321, name: 'Matthew' },
    { id: 427, name: 'Mark' },
    { id: 112, name: 'Luke' },
    { id: 314, name: 'John' },
  ];
  let input = {
    '&order': {
      112: 2,
      314: 3,
      321: 0,
      427: 1,
    },
    '#321': { _name: 'Matthew' },
    '#427': { _name: 'Mark' },
    '#112': { _name: 'Luke' },
    '#314': { _name: 'John' },
  };

  let output = objectMerge._fromRFC6902(input);
  expect(utils.sortJson(output)).toEqual(utils.sortJson(expected));
});

test('Tolerate only &order keys - I don`t think this actually happens', () => {
  let expected = {};
  let input = {
    '&order': {},
  };

  let output = objectMerge._fromRFC6902(input);
  expect(utils.sortJson(output)).toEqual(utils.sortJson(expected));
});

test('Create and restore RFC6902 compatible nested document', () => {
  let input = [
    {
      id: 321,
      names: [
        { id: 'A', name: 'Matt' },
        { id: 'B', name: 'Matthew' },
      ],
      404: false,
    },
    {
      id: 427,
      names: [{ id: 'A', name: 'Mark' }],
      404: false,
    },
    {
      id: 112,
      names: [{ id: 'A', name: 'Luke' }],
      404: false,
    },
    {
      id: 314,
      names: [
        { id: 'A', name: 'John' },
        { id: 'B', name: 'Johnny' },
        { id: 'C', name: 'Johnny Boy' },
      ],
      404: false,
    },
  ];
  let expected = {
    '#321': {
      _names: {
        $A: { _name: 'Matt' },
        $B: { _name: 'Matthew' },
        '&order': {
          A: 0,
          B: 1,
        },
      },
      _404: false,
    },
    '#427': {
      _names: {
        $A: { _name: 'Mark' },
        '&order': {
          A: 0,
        },
      },
      _404: false,
    },
    '#112': {
      _names: {
        $A: { _name: 'Luke' },
        '&order': {
          A: 0,
        },
      },
      _404: false,
    },
    '#314': {
      _names: {
        $A: { _name: 'John' },
        $B: { _name: 'Johnny' },
        $C: { _name: 'Johnny Boy' },
        '&order': {
          A: 0,
          B: 1,
          C: 2,
        },
      },
      _404: false,
    },
    '&order': {
      112: 2,
      314: 3,
      321: 0,
      427: 1,
    },
  };

  let output = objectMerge._toRFC6902(input);
  expect(utils.sortJson(expected)).toEqual(utils.sortJson(output));
  output = objectMerge._fromRFC6902(output);
  expect(utils.sortJson(output)).toEqual(utils.sortJson(input));
});

test('Forbidden keys are detected in patch path', () => {
  let forbidden = new Set(['passw/ord', 'email']);

  let original = {
    Account: {
      'passw/ord': '123456',
      email: 'noreply@softball.app',
      nickname: 'Bilbo',
    },
  };

  let changeOne = {
    Account: {
      'passw/ord': '123456',
      email: 'noreply@softball.app',
      nickname: 'Bilbo Baggins',
    },
  };

  let changeTwo = {
    Account: {
      'passw/ord': '234567',
      email: 'noreply@softball.app',
      nickname: 'Bilbo',
    },
  };

  let goodPatch = objectMerge.diff(original, changeOne);
  let badPatch = objectMerge.diff(original, changeTwo);

  let filteredGoodPatch = objectMerge.filterPatch(goodPatch, forbidden);
  let filteredBadPatch = objectMerge.filterPatch(badPatch, forbidden);

  expect(filteredGoodPatch.length).toEqual(goodPatch.length);
  expect(filteredBadPatch.length).not.toEqual(badPatch.length);
});

test('Forbidden keys are detected in patch value', () => {
  let forbidden = new Set(['passw~ord', 'email', 'frodo']);

  let original = [
    {
      id: 1,
      'passw~ord': '123456',
      email: 'noreply@softball.app',
      nickname: 'Bilbo',
    },
  ];

  let changeOne = [
    {
      id: 1,
      'passw~ord': '123456',
      email: 'noreply@softball.app',
      nickname: 'Bilbo',
    },
    {
      id: 2,
      nickname: 'Frodo',
    },
  ];

  let changeTwo = [
    {
      id: 1,
      'passw~ord': '123456',
      email: 'noreply@softball.app',
      nickname: 'Bilbo',
    },
    {
      id: 2,
      'passw~ord': '123456',
      email: 'noreply@softball.app',
      nickname: 'Frodo',
    },
  ];

  let goodPatch = objectMerge.diff(original, changeOne);
  let badPatch = objectMerge.diff(original, changeTwo);

  let filteredGoodPatch = objectMerge.filterPatch(goodPatch, forbidden);
  let filteredBadPatch = objectMerge.filterPatch(badPatch, forbidden);

  expect(filteredGoodPatch.length).toEqual(goodPatch.length);
  expect(filteredBadPatch.length).not.toEqual(badPatch.length);
});
