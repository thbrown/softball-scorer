exports.OPTIMIZATION_STATUS_ENUM = Object.freeze({
  NOT_STARTED: 0, // In softball-sim
  ALLOCATING_RESOURCES: 1,
  IN_PROGRESS: 2, // In softball-sim
  COMPLETE: 3, // In softball-sim
  PAUSED: 4, // In softball-sim
  ERROR: 5, // In softball-sim
  PAUSING: 6,
});

// Flip enums for reverse lookups
let optStatuses = Object.keys(exports.OPTIMIZATION_STATUS_ENUM);
let inverse = {};
for (let i = 0; i < optStatuses.length; i++) {
  let englishValue = optStatuses[i];
  inverse[exports.OPTIMIZATION_STATUS_ENUM[englishValue]] = englishValue;
}

exports.OPTIMIZATION_STATUS_ENUM_INVERSE = inverse;
