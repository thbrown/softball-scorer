exports.OPTIMIZATION_STATUS_ENUM = Object.freeze({
  undefined: 0, // Treated the same as NOT_STARTED
  NOT_STARTED: 0,
  STARTING: 6, // Added later, this state doesn't exist on softball-sim
  ALLOCATING_RESOURCES: 1,
  IN_PROGRESS: 2,
  COMPLETE: 3,
  PAUSED: 4,
  ERROR: 5,
});

exports.EDITABLE_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([undefined, exports.OPTIMIZATION_STATUS_ENUM.NOT_STARTED])
);

exports.STARTABLE_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([
    undefined,
    exports.OPTIMIZATION_STATUS_ENUM.NOT_STARTED,
    exports.OPTIMIZATION_STATUS_ENUM.ERROR,
    exports.OPTIMIZATION_STATUS_ENUM.PAUSED,
  ])
);

exports.TERMINAL_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([
    exports.OPTIMIZATION_STATUS_ENUM.COMPLETE,
    exports.OPTIMIZATION_STATUS_ENUM.PAUSED,
    exports.OPTIMIZATION_STATUS_ENUM.ERROR,
  ])
);

exports.PROGRESSING_OPTIMIZATION_STATUSES_ENUM = Object.freeze(
  new Set([
    exports.OPTIMIZATION_STATUS_ENUM.STARTING,
    exports.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES,
    exports.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS,
  ])
);

exports.OPTIMIZATION_TYPE_ENUM = Object.freeze({
  MONTE_CARLO_EXHAUSTIVE: 0,
  MONTE_CARLO_ADAPTIVE: 1,
  MONTE_CARLO_ANNEALING: 2,
  EXPECTED_VALUE: 3,
  SORT_BY_AVERAGE: 4,
});

// Flip enums for reverse lookups
let optStatuses = Object.keys(exports.OPTIMIZATION_STATUS_ENUM);
let inverse = {};
for (let i = 0; i < optStatuses.length; i++) {
  let englishValue = optStatuses[i];
  inverse[exports.OPTIMIZATION_STATUS_ENUM[englishValue]] = englishValue;
}
inverse[undefined] = 'NOT_STARTED'; // undefined is treated the same as NOT_STARTED

exports.OPTIMIZATION_STATUS_ENUM_INVERSE = inverse;
