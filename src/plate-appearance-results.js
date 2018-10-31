
const ALL_RESULTS = ['', 'Out', '1B', '2B', '3B', 'HRi', 'HRo', 'BB', 'E', 'FC', 'SAC', 'K'];
const OUT_RESULTS = ['E', 'Out', 'FC', 'SAC', 'K'];
const NO_AT_BAT_RESULTS = [''];


exports.getAllResults = function () {
	return ALL_RESULTS;
}

exports.getOutResults = function () {
	return OUT_RESULTS;
}

exports.getNoAtBatResults = function () {
	return NO_AT_BAT_RESULTS;
}