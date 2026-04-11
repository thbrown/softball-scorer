import { sortObjectsByDate } from './functions';
import { getGlobalState } from 'state';
import type { PlateAppearance, Player, Game } from 'shared-lib';
import type { PlayerId } from 'types/branded-ids';

export const HIT_TYPE_FILTERS = {
  HITS: 'hits',
  OUTS: 'outs',
  EXTRA_BASE_HITS: '2+hits',
} as const;

type HitTypeFilter = (typeof HIT_TYPE_FILTERS)[keyof typeof HIT_TYPE_FILTERS];

const hits: Record<string, boolean> = {
  '1B': true,
  '2B': true,
  '3B': true,
  HRo: true,
  HRi: true,
};
const extraHits: Record<string, boolean> = {
  '2B': true,
  '3B': true,
  HRo: true,
  HRi: true,
};

interface PAWithGame extends PlateAppearance {
  game: Game & { date: number; id: string; opponent: string };
  date: number;
  id: string;
}

export function filterByHitType(plateAppearances: PAWithGame[], hitType: HitTypeFilter): PAWithGame[] | undefined {
  if (hitType === HIT_TYPE_FILTERS.HITS) {
    return plateAppearances.filter((pa) => !!hits[pa.result!]);
  } else if (hitType === HIT_TYPE_FILTERS.OUTS) {
    return plateAppearances.filter((pa) => !hits[pa.result!]);
  } else if (hitType === HIT_TYPE_FILTERS.EXTRA_BASE_HITS) {
    return plateAppearances.filter((pa) => !!extraHits[pa.result!]);
  }
}

export function filterByLastGames(plateAppearances: PAWithGame[], lastNGames: number): PAWithGame[] {
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
  let currentGame: PAWithGame['game'] | null = null;
  const ret: PAWithGame[] = [];
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

interface PlayerWithPAs extends Player {
  plateAppearances: PAWithGame[];
}

/**
 * convert a 1d list of plate appearances to a list of players with each plate appearance
 * added to a list on the player object
 */
export const convertPlateAppearanceListToPlayerPlateAppearanceList = (
  plateAppearances: PAWithGame[]
): PlayerWithPAs[] => {
  const ret: PlayerWithPAs[] = [];
  plateAppearances.forEach((pa) => {
    let playerInList = ret.find((p) => p.id === pa.playerId);

    if (!playerInList) {
      const player = getGlobalState().getPlayer(pa.playerId as PlayerId);
      if (!player) {
        throw new Error('No player with id ' + pa.playerId + ' could be found.');
      }
      playerInList = { ...player, plateAppearances: [] };
      ret.push(playerInList);
    }

    playerInList.plateAppearances.push(pa);
  });

  return ret;
};
