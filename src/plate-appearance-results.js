const ALL_RESULTS = [
  null,
  "Out",
  "1B",
  "2B",
  "3B",
  "HRi",
  "HRo",
  "BB",
  "E",
  "FC",
  "SAC",
  "K"
];
const HIT_RESULTS = ["1B", "2B", "3B", "HRi", "HRo"];
const NO_HIT_RESULTS = ["Out", "E", "FC", "K", "SAC"];
const NO_AT_BAT_RESULTS = ["BB"];

exports.getAllResults = function() {
  return ALL_RESULTS;
};

exports.getHitResults = function() {
  return HIT_RESULTS;
};

exports.getNoHitResults = function() {
  return NO_HIT_RESULTS;
};

exports.getNoAtBatResults = function() {
  return NO_AT_BAT_RESULTS;
};
