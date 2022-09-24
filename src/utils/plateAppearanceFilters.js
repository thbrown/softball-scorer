import { sortObjectsByDate } from './functions';
import state from 'state';

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

/**
 * convert a 1d list of plate appearances to a list of players with each plate appearance
 * added to a list on the player object
 */
export const convertPlateAppearanceListToPlayerPlateAppearanceList = (
  plateAppearances,
  inputState
) => {
  const ret = [];
  plateAppearances.forEach((pa) => {
    let playerInList = ret.find(
      (playerInList) => playerInList.id === pa.player_id
    );

    if (!ret.find((p) => p.id === pa.player_id)) {
      const player = state.getPlayer(pa.player_id, inputState);
      console.log('Looking for', pa.player_id, inputState);
      if (!player) {
        throw new Error(
          'No player with id ' + pa.player_id + ' could be found.'
        );
      }

      playerInList = {
        ...player,
        plateAppearances: [],
      };
      ret.push(playerInList);
    }

    playerInList.plateAppearances.push(pa);
  });

  return ret;
};
