import { sortObjectsByDate, toClientDate } from './functions';

export const HIT_TYPE_FILTERS = {
  HITS: 'hits',
  OUTS: 'outs',
  EXTRA_BASE_HITS: '2+hits',
};

const hits = {
  '1B': true,
  '2B': true,
  '3B': true,
  HRo: true,
  HRi: true,
};
const extraHits = {
  '2B': true,
  '3B': true,
  HRo: true,
  HRi: true,
};

export function filterByHitType(plateAppearances, hitType) {
  if (hitType === HIT_TYPE_FILTERS.HITS) {
    return plateAppearances.filter((pa) => !!hits[pa.result]);
  } else if (hitType === HIT_TYPE_FILTERS.OUTS) {
    return plateAppearances.filter((pa) => !hits[pa.result]);
  } else if (hitType === HIT_TYPE_FILTERS.EXTRA_BASE_HITS) {
    return plateAppearances.filter((pa) => !!extraHits[pa.result]);
  }
}

export function filterByLastGames(plateAppearances, lastNGames) {
  // TODO can we do this server side?
  plateAppearances = sortObjectsByDate(plateAppearances, {
    eqCb: (a, b) => {
      if (a.game.opponent === b.game.opponent) {
        return a.game.id < b.game.id ? -1 : 1;
      } else {
        return a.game.opponent < b.game.opponent ? -1 : 1;
      }
    },
  });

  let gameCtr = 0;
  let currentGame = null;
  const ret = [];
  for (let i = 0; i < plateAppearances.length; i++) {
    const pa = plateAppearances[i];
    if (pa.game) {
      if (currentGame === null) {
        currentGame = pa.game;
      }

      if (currentGame !== pa.game) {
        gameCtr++;
        if (gameCtr === lastNGames) {
          return ret;
        }
        currentGame = pa.game;
      }
    }

    ret.push(pa);
  }
  return ret;
}
