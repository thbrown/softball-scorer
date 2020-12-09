const exp = {};

const ALL_RESULTS = [
  null,
  'Out',
  '1B',
  '2B',
  '3B',
  'HRi',
  'HRo',
  'BB',
  'E',
  'FC',
  'SAC',
  'K',
];
const HIT_RESULTS = ['1B', '2B', '3B', 'HRi', 'HRo'];
const NO_HIT_RESULTS = ['Out', 'E', 'FC', 'K', 'SAC'];
const NO_AT_BAT_RESULTS = ['BB'];

exp.getAllResults = function () {
  return ALL_RESULTS;
};
export const getAllResults = exp.getAllResults;

exp.getHitResults = function () {
  return HIT_RESULTS;
};
export const getHitResults = exp.getHitResults;

exp.getNoHitResults = function () {
  return NO_HIT_RESULTS;
};
export const getNoHitResults = exp.getNoHitResults;

exp.getNoAtBatResults = function () {
  return NO_AT_BAT_RESULTS;
};
export const getNoAtBatResults = exp.getNoAtBatResults;

export default exp;
