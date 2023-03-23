const objectMerge = require('../utils/object-merge.js');
const utils = require('../utils/common-utils');

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
  console.log(patch);
  console.log(document);
  expect(utils.isObject(document)).toEqual(true);
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
  expect(document.length).toEqual(5);
  expect(document[2].name).toEqual('Millicent');
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
      },
      _404: false,
    },
    '#427': {
      _names: {
        $A: { _name: 'Mark' },
      },
      _404: false,
    },
    '#112': {
      _names: {
        $A: { _name: 'Luke' },
      },
      _404: false,
    },
    '#314': {
      _names: {
        $A: { _name: 'John' },
        $B: { _name: 'Johnny' },
        $C: { _name: 'Johnny Boy' },
      },
      _404: false,
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
