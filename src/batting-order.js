import state from 'state';

const normalBattingOrder = function (plateAppearances, lineup, n) {
  var previousBatterLineupIndex = lineup.length - 1;
  if (plateAppearances.length) {
    let mostRecentPlateAppearance =
      plateAppearances[plateAppearances.length - 1];
    previousBatterLineupIndex = lineup.findIndex(
      (v) => v === mostRecentPlateAppearance.playerId
    );
  }
  let nextBatterIndex = (previousBatterLineupIndex + n) % lineup.length;
  return state.getPlayer(lineup[nextBatterIndex]);
};

const genderAlternatingOrder = function (plateAppearances, lineup, n) {
  let targetBattersGender = '?';
  if (plateAppearances.length === 0) {
    let firstBatterGender = state.getPlayer(lineup[0]).gender;
    let otherGender = firstBatterGender === 'F' ? 'M' : 'F';
    targetBattersGender = n % 2 === 0 ? otherGender : firstBatterGender;
  } else {
    let mostRecentPlateAppearance =
      plateAppearances[plateAppearances.length - 1];
    let mostRecentPlateAppearancePlayer = state.getPlayer(
      mostRecentPlateAppearance.playerId
    );
    let otherGender =
      mostRecentPlateAppearancePlayer.gender === 'F' ? 'M' : 'F';
    targetBattersGender =
      n % 2 === 0 ? mostRecentPlateAppearancePlayer.gender : otherGender;
  }

  if (targetBattersGender === 'F') {
    let femalePlateApearances = plateAppearances.filter(
      (pa) => state.getPlayer(pa.playerId).gender === 'F'
    );
    let mostRecentFemalePlateAppearance =
      femalePlateApearances.length === 0
        ? null
        : femalePlateApearances[femalePlateApearances.length - 1];
    let femaleLineup = lineup
      .map((playerId) => state.getPlayer(playerId))
      .filter((player) => player.gender === 'F')
      .map((player) => player.id);
    let startLookingIndex = mostRecentFemalePlateAppearance
      ? femaleLineup.findIndex(
          (v) => v === mostRecentFemalePlateAppearance.playerId
        )
      : femaleLineup.length - 1;
    return state.getPlayer(
      femaleLineup[
        (startLookingIndex + Math.floor((n + 1) / 2)) % femaleLineup.length
      ]
    );
  } else {
    let malePlateApearances = plateAppearances.filter(
      (pa) => state.getPlayer(pa.playerId).gender === 'M'
    );
    let mostRecentMalePlateAppearance =
      malePlateApearances.length === 0
        ? null
        : malePlateApearances[malePlateApearances.length - 1];
    let maleLineup = lineup
      .map((playerId) => state.getPlayer(playerId))
      .filter((player) => player.gender === 'M')
      .map((player) => player.id);
    let startLookingIndex = mostRecentMalePlateAppearance
      ? maleLineup.findIndex(
          (v) => v === mostRecentMalePlateAppearance.playerId
        )
      : maleLineup.length - 1;
    return state.getPlayer(
      maleLineup[
        (startLookingIndex + Math.floor((n + 1) / 2)) % maleLineup.length
      ]
    );
  }
};

let getNthBatter = function (game_id, n) {
  if (n <= 0) {
    return null; // not supported
  }

  let game = state.getGame(game_id);
  let plateAppearances = state.getPlateAppearancesForGame(game_id);

  let type = game.lineupType;
  let lineup = game.lineup;

  if (lineup.length === 0) {
    return null;
  }

  let batter;
  if (type === 1) {
    batter = normalBattingOrder(plateAppearances, lineup, n);
  } else if (type === 2) {
    batter = genderAlternatingOrder(plateAppearances, lineup, n);
  } else {
    return null;
  }

  return batter;
};

export default {
  getNthBatter,
};
