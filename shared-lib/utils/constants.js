/**
 * NOTE for compatibility with webpack on client and server, only use export/module syntax,
 * do not use the `exports` or `module.exports` commonjs format
 */

export const OPTIMIZATION_STATUS_ENUM = Object.freeze({
  undefined: 0, // Treated the same as NOT_STARTED
  NOT_STARTED: 0,
  STARTING: 6, // Added later, this state doesn't exist on softball-sim
  ALLOCATING_RESOURCES: 1,
  IN_PROGRESS: 2,
  COMPLETE: 3,
  PAUSED: 4,
  ERROR: 5,
});

export const EDITABLE_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([undefined, OPTIMIZATION_STATUS_ENUM.NOT_STARTED])
);

export const STARTABLE_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([
    undefined,
    OPTIMIZATION_STATUS_ENUM.NOT_STARTED,
    OPTIMIZATION_STATUS_ENUM.ERROR,
    OPTIMIZATION_STATUS_ENUM.PAUSED,
  ])
);

export const TERMINAL_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([
    OPTIMIZATION_STATUS_ENUM.COMPLETE,
    OPTIMIZATION_STATUS_ENUM.PAUSED,
    OPTIMIZATION_STATUS_ENUM.ERROR,
  ])
);

export const PROGRESSING_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([
    OPTIMIZATION_STATUS_ENUM.STARTING,
    OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES,
    OPTIMIZATION_STATUS_ENUM.IN_PROGRESS,
  ])
);

export const OPTIMIZATION_TYPE_ENUM = Object.freeze({
  MONTE_CARLO_EXHAUSTIVE: 0,
  MONTE_CARLO_ADAPTIVE: 1,
  MONTE_CARLO_ANNEALING: 2,
  EXPECTED_VALUE: 3,
  SORT_BY_AVERAGE: 4,
});

export const invertOptStatusSet = function (inputSet) {
  let output = new Set();
  for (let key in OPTIMIZATION_STATUS_ENUM) {
    if (!inputSet.has(OPTIMIZATION_STATUS_ENUM[key])) {
      output.add(OPTIMIZATION_STATUS_ENUM[key]);
    }
  }
  return output;
};

// Flip enums for reverse lookups
let optStatuses = Object.keys(OPTIMIZATION_STATUS_ENUM);
let inverse = {};
for (let i = 0; i < optStatuses.length; i++) {
  let englishValue = optStatuses[i];
  inverse[OPTIMIZATION_STATUS_ENUM[englishValue]] = englishValue;
}
inverse[undefined] = 'NOT_STARTED'; // undefined is treated the same as NOT_STARTED
export const OPTIMIZATION_STATUS_ENUM_INVERSE = inverse;

const exp = {
  OPTIMIZATION_STATUS_ENUM,
  EDITABLE_OPTIMIZATION_STATUSES_ENUM,
  STARTABLE_OPTIMIZATION_STATUSES_ENUM,
  TERMINAL_OPTIMIZATION_STATUSES_ENUM,
  PROGRESSING_OPTIMIZATION_STATUSES_ENUM,
  OPTIMIZATION_TYPE_ENUM,
  OPTIMIZATION_STATUS_ENUM_INVERSE,
  invertOptStatusSet,
};

export default exp;
