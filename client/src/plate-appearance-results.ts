export type PlateAppearanceResult =
  | null
  | 'Out'
  | '1B'
  | '2B'
  | '3B'
  | 'HRi'
  | 'HRo'
  | 'BB'
  | 'E'
  | 'FC'
  | 'SAC'
  | 'K'
  | 'Ʞ'
  | 'DP'
  | 'TP'
  | 'HBP';

const ALL_RESULTS: PlateAppearanceResult[] = [
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
  'DP',
  'TP',
  'HBP',
];

const HIT_RESULTS: PlateAppearanceResult[] = ['1B', '2B', '3B', 'HRi', 'HRo'];
const NO_HIT_RESULTS: PlateAppearanceResult[] = [
  'Out',
  'E',
  'FC',
  'K',
  'SAC',
  'DP',
  'TP',
  'HBP',
];
const NO_AT_BAT_RESULTS: PlateAppearanceResult[] = ['BB', 'SAC'];
const FIRST_PAGE: PlateAppearanceResult[] = [
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
];
const SECOND_PAGE: PlateAppearanceResult[] = ['Ʞ', 'K', 'DP', 'TP']; //  'HBP', 'CI'

const exp = {
  getFirstPage: function (): PlateAppearanceResult[] {
    return FIRST_PAGE;
  },

  getSecondPage: function (): PlateAppearanceResult[] {
    return SECOND_PAGE;
  },

  getAllResults: function (): PlateAppearanceResult[] {
    return ALL_RESULTS;
  },

  getHitResults: function (): PlateAppearanceResult[] {
    return HIT_RESULTS;
  },

  getNoHitResults: function (): PlateAppearanceResult[] {
    return NO_HIT_RESULTS;
  },

  getNoAtBatResults: function (): PlateAppearanceResult[] {
    return NO_AT_BAT_RESULTS;
  },
};

export const getFirstPage = exp.getFirstPage;
export const getSecondPage = exp.getSecondPage;
export const getAllResults = exp.getAllResults;
export const getHitResults = exp.getHitResults;
export const getNoHitResults = exp.getNoHitResults;
export const getNoAtBatResults = exp.getNoAtBatResults;

export default exp;
