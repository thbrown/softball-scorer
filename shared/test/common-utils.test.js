const utils = require('../utils/common-utils');

test('Nested object sorting works', () => {
  const BASE = {
    account: {
      optimizers: [{ oranges: 2, apples: 1 }, 1, 2],
    },
    teams: [],
    players: [],
    optimizations: [],
    metadata: {
      scope: 'client',
      version: 2,
    },
  };
  const COMP = {
    account: {
      optimizers: [{ apples: 1, oranges: 2 }, 1, 2],
    },
    teams: [],
    players: [],
    optimizations: [],
    metadata: {
      version: 2,
      scope: 'client',
    },
  };

  expect(utils.sortJson(COMP)).toEqual(utils.sortJson(BASE));
});
