const state = require( 'state' );

let getNthBatter = function(game_id, n) {
	let game = state.getGame( game_id );
	let plateAppearances = state.getPlateAppearancesForGame( game_id );

	let type = game.lineup_type;
	let lineup = game.lineup;

	if(lineup.length == 0) {
		return null;
	}

	if(plateAppearances.length == 0) {
		return lineup[0];
	}

	let batterLineupIndex;
	if(type == 1) {
		batterLineupIndex = normalBattingOrder(plateAppearances, lineup, n);
	} else if (type == 2) {
		batterLineupIndex = genderAlternatingOrder(plateAppearances, lineup, n);
	} else {
		return null;
	}

	if(batterLineupIndex != null) {
		return lineup[batterLineupIndex];
	}
}

let normalBattingOrder = function(plateAppearances, lineup, n) {
	let mostRecentPlateAppearance = plateAppearances.reduce( ( prev, curr ) => curr.plateAppearanceIndex > prev.plateAppearanceIndex ? curr : prev);
	let previousBatterLineupIndex = lineup.findIndex(v => mostRecentPlateAppearance.id);
	let nextBatterIndex = previousBatterLineupIndex + n % lineup.length;
	return nextBatterIndex;
}

let genderAlternatingOrder = function(plateAppearances, lineup, n) {
	let lastPlateAppearance = plateAppearances.reduce( ( prev, curr ) => curr.id > prev.id ? curr : prev);
	let lastPlateAppertancePlayer = state.getPlayer(lastPlateAppearance.player_id);
	if(lastPlateAppertancePlayer.gender == "F") {
		let lastMalePlateAppearance = plateAppearances.reduce( ( prev, curr ) => (curr.plateAppearanceIndex > prev.plateAppearanceIndex) && (state.getPlayer(curr).gender == "M") ? curr : prev, -1);
		if(lastMalePlateAppearance == -1) {
			return null; // No males in the lineup
		}
	} else {
		let lastMalePlateAppearance = plateAppearances.reduce( ( prev, curr ) => (curr.plateAppearanceIndex > prev.plateAppearanceIndex) && (state.getPlayer(curr).gender == "F") ? curr : prev, -1);
		if(lastMalePlateAppearance == -1) {
			return null; // No females in the lineup
		}
	}
}

module.exports = {  
    getNthBatter: getNthBatter
}