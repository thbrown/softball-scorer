export const HIT_TYPE_FILTERS = {
  HITS: 'hits',
  OUTS: 'outs',
  EXTRA_BASE_HITS: '2+hits',
};

const hits = ['1B', '2B', '3B', 'HRo', 'HRi'];
const extraHits = hits.slice(1);

export function filterByHitType(plateAppearances, hitType) {
  if (hitType === HIT_TYPE_FILTERS.HITS) {
    return plateAppearances.filter(pa => hits.includes(pa.result));
  } else if (hitType === HIT_TYPE_FILTERS.OUTS) {
    return plateAppearances.filter(pa => !hits.includes(pa.result));
  } else if (hitType === HIT_TYPE_FILTERS.EXTRA_BASE_HITS) {
    return plateAppearances.filter(pa => extraHits.includes(pa.result));
  }
}

export function filterByLastGames(plateAppearances, lastNGames) {
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
