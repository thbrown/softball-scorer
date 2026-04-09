import { getGlobalState } from './state';
import type { PlateAppearance, Player } from 'shared-lib';
import type { GameId, PlayerId } from './types/branded-ids';

export type LineupType = 0 | 1 | 2 | 3;

const normalBattingOrder = function (
  plateAppearances: PlateAppearance[],
  lineup: PlayerId[],
  n: number
): Player | undefined {
  let previousBatterLineupIndex = lineup.length - 1;
  if (plateAppearances.length) {
    const mostRecentPlateAppearance =
      plateAppearances[plateAppearances.length - 1];
    previousBatterLineupIndex = lineup.findIndex(
      (v) => v === mostRecentPlateAppearance.playerId
    );
  }
  const nextBatterIndex = (previousBatterLineupIndex + n) % lineup.length;
  return getGlobalState().getPlayer(lineup[nextBatterIndex]);
};

const genderAlternatingOrder = function (
  plateAppearances: PlateAppearance[],
  lineup: PlayerId[],
  n: number
): Player | undefined {
  let targetBattersGender: 'M' | 'F' | '?' = '?';
  if (plateAppearances.length === 0) {
    const firstBatter = getGlobalState().getPlayer(lineup[0]);
    if (!firstBatter) return undefined;
    const firstBatterGender = firstBatter.gender;
    const otherGender = firstBatterGender === 'F' ? 'M' : 'F';
    targetBattersGender =
      n % 2 === 0 ? otherGender : (firstBatterGender as 'M' | 'F');
  } else {
    const mostRecentPlateAppearance =
      plateAppearances[plateAppearances.length - 1];
    const mostRecentPlateAppearancePlayer = getGlobalState().getPlayer(
      mostRecentPlateAppearance.playerId
    );
    if (!mostRecentPlateAppearancePlayer) return undefined;
    const otherGender =
      mostRecentPlateAppearancePlayer.gender === 'F' ? 'M' : 'F';
    targetBattersGender =
      n % 2 === 0
        ? (mostRecentPlateAppearancePlayer.gender as 'M' | 'F')
        : otherGender;
  }

  if (targetBattersGender === 'F') {
    const femalePlateApearances = plateAppearances.filter((pa) => {
      const player = getGlobalState().getPlayer(pa.playerId);
      return player?.gender === 'F';
    });
    const mostRecentFemalePlateAppearance =
      femalePlateApearances.length === 0
        ? null
        : femalePlateApearances[femalePlateApearances.length - 1];
    const femaleLineup = lineup
      .map((playerId) => getGlobalState().getPlayer(playerId))
      .filter((player): player is Player => player !== undefined && player.gender === 'F')
      .map((player) => player.id);
    const startLookingIndex = mostRecentFemalePlateAppearance
      ? femaleLineup.findIndex(
          (v) => v === mostRecentFemalePlateAppearance.playerId
        )
      : femaleLineup.length - 1;
    return getGlobalState().getPlayer(
      femaleLineup[
        (startLookingIndex + Math.floor((n + 1) / 2)) % femaleLineup.length
      ]
    );
  } else {
    const malePlateApearances = plateAppearances.filter((pa) => {
      const player = getGlobalState().getPlayer(pa.playerId);
      return player?.gender === 'M';
    });
    const mostRecentMalePlateAppearance =
      malePlateApearances.length === 0
        ? null
        : malePlateApearances[malePlateApearances.length - 1];
    const maleLineup = lineup
      .map((playerId) => getGlobalState().getPlayer(playerId))
      .filter((player): player is Player => player !== undefined && player.gender === 'M')
      .map((player) => player.id);
    const startLookingIndex = mostRecentMalePlateAppearance
      ? maleLineup.findIndex(
          (v) => v === mostRecentMalePlateAppearance.playerId
        )
      : maleLineup.length - 1;
    return getGlobalState().getPlayer(
      maleLineup[
        (startLookingIndex + Math.floor((n + 1) / 2)) % maleLineup.length
      ]
    );
  }
};

const getNthBatter = function (game_id: GameId, n: number): Player | null {
  if (n <= 0) {
    return null; // not supported
  }

  const game = getGlobalState().getGame(game_id);
  if (!game) {
    return null;
  }
  const plateAppearances = getGlobalState().getPlateAppearancesForGame(game_id);
  if (!plateAppearances) {
    return null;
  }

  const type = game.lineupType;
  const lineup = game.lineup;

  if (lineup.length === 0) {
    return null;
  }

  let batter: Player | undefined;
  if (type === 1) {
    batter = normalBattingOrder(plateAppearances, lineup, n);
  } else if (type === 2) {
    batter = genderAlternatingOrder(plateAppearances, lineup, n);
  } else {
    return null;
  }

  return batter ?? null;
};

export default {
  getNthBatter,
};
