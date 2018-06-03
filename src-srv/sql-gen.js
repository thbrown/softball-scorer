const HandledError = require( './handled-error.js' );

let tableReferences = ['teams', 'players', 'plateAppearances', 'games', 'lineup'];
let tableNames = ['teams', 'players', 'plate_appearances', 'games', 'players_games'];

let getSqlFromPatch = function(patch, accountId) {
	let result = [];
	getSqlFromPatchInternal(patch, [], result, accountId);
	return result;
}

let getSqlFromPatchInternal = function(patch, path, result, accountId) {
	if(accountId === undefined) {
		throw new HandledError(500,"Internal Server Error", "Tried to generate sql while accoutnId was undefined (no account loged in)");
	}
	let keys = Object.keys(patch);
	for (var i = 0; i < keys.length; i++) {
		let key = keys[i];
		let value = patch[key];
		if(isRoot(value)) {
			let applicableTableReference = getTableReferenceFromPath(path, value.key);
			let applicableTable = getTableFromReference(applicableTableReference);
			let op = value.op;

			if(op == "Delete") {
				// We have to delete references first
				if(applicableTable == "teams") {
					result.push({
						query:"DELETE FROM players_games WHERE game_id IN ($1) AND account_id IN ($2)",
						values:[getIdFromPath(path, "games"), accountId] // Not value.key?
					});
					result.push({
						query:"DELETE FROM plate_appearances WHERE team_id IN ($1) AND account_id IN ($2)",
						values:[value.key, accountId]
					});
					result.push({
						query:"DELETE FROM games WHERE team_id IN ($1) AND account_id IN ($2)",
						values:[value.key, accountId]
					});
				}

				if(applicableTable == "games") {
					result.push({
						query:"DELETE FROM players_games WHERE game_id IN ($1) account_id IN ($2)",
						values:[value.key, accountId]
					});
					result.push({
						query:"DELETE FROM plate_appearances WHERE game_id IN ($1) account_id IN ($2)",
						values:[value.key, accountId]
					});
				}

				if(applicableTable === "players_games") {
					result.push({
						query:"UPDATE players_games SET lineup_index = lineup_index - 1 WHERE lineup_index >= (SELECT lineup_index FROM players_games WHERE game_id = $2 AND player_id = $1 AND account_id = $3) AND game_id = $2 AND account_id = $3",
						values:[value.key, getIdFromPath(path, "games"), accountId]
					});
					result.push({
						query:"DELETE FROM players_games WHERE player_id IN ($1) AND game_id IN ($2) AND account_id IN ($3)",
						values:[value.key, getIdFromPath(path, "games"), accountId]
					});
				} else {
					result.push({
						query:"DELETE FROM " + applicableTable + " WHERE id IN ($1) AND account_id IN ($2)",
						values:[value.key, accountId]
					});
				}
			} else if(op == "ArrayAdd") {
				// We need to add the key back to the object
				let insertObject = {};
				insertObject[applicableTableReference] = JSON.parse(value.param1);

				// Get the parent ids from the path
				let parents = {};
				if(applicableTableReference == 'games') {
					parents.teamId = path[1];
				} else if(applicableTableReference == 'plateAppearances') {
					parents.teamId = path[1];
					parents.gameId = path[3];
				} else if(applicableTableReference == 'lineup') {
					parents.gameId = path[3];
					insertObject.position = value.param2; // lineup is not based on primary key ordering so we need to specify a position
				}
				printInsertStatementsFromPatch(insertObject, parents, result, accountId);
			} else if(op == "ReOrder") {
				let param1 = value.param1.substring(1, value.param1.length-1);
				let param2 = value.param2.substring(1, value.param2.length-1);

				let oldOrder = param1.split(',');
				let newOrder = param2.split(',');

				if(applicableTable != "players_games") {
					throw "Something unexpected was reordered!" + applicableTable; // The only thing that should be re-orederable is the lineup, other things are all ordered by primary key
				}

				let reOrderQuery = 
				`UPDATE players_games AS pg SET lineup_index = c.lineup_index FROM (values`;
				let values = [getIdFromPath(path, "games"), accountId];
				for(let entry = 0; entry < oldOrder.length; entry++) {
					reOrderQuery += `($1, $${entry*2+3}, (SELECT lineup_index FROM players_games WHERE player_id = $${entry*2+4} AND game_id = $1 AND account_id = $2))`
					if(entry !== (oldOrder.length - 1)){
						reOrderQuery += ",";
					}
					values.push(newOrder[entry]);
					values.push(oldOrder[entry]);
				}
				reOrderQuery += `) AS c(game_id, player_id, lineup_index) WHERE c.player_id = pg.player_id::text AND c.game_id = pg.game_id AND account_id = $2;`; 
				// Idk why we don't need ::text on pg.game_id above, I needed it for the raw query


				console.log(reOrderQuery);
				console.log(values);

				result.push({
					query: reOrderQuery,
					values: values
				});

			} else if(op == "Edit") {
				result.push({
					query:"UPDATE " + applicableTable + " SET " + getColNameFromJSONValue(value.key) + " = $1 WHERE id IN ($2) AND account_id IN ($3);",
					values:[value.param2, getIdFromPath(path), accountId]
				});
			} else  {
				throw "Unrecognized operation: " + op + " " + JSON.stringify(patchObj[key])
			}
			
		} else if (hasProperties(value)) {
			path.push(key);
			getSqlFromPatchInternal(patch[key], path, result, accountId);
			path.pop(key);
		} else {
			console.log("Warning: don't know what to do with this");
		}
	}
}

let printInsertStatementsFromPatch = function(obj, parents, result, accountId) {
	if(accountId === undefined) {
		throw new HandledError(500,"Internal Server Error", "Tried to generate sql while accoutnId was undefined (no account loged in)");
	}
	if(obj.players) {
		result.push({
			query:"INSERT INTO players (name, gender, account_id) VALUES($1, $2, $3) RETURNING id;",
			values:[obj.players.name, obj.players.gender, accountId],
			idReplacements:[],
			mapReturnValueTo: {clientId: obj.players.id, table: "players"}
		});
	} 
	if(obj.teams) {
		result.push({
			query:"INSERT INTO teams (name, account_id) VALUES($1, $2) RETURNING id;",
			values:[obj.teams.name, accountId],
			idReplacements:[],
			mapReturnValueTo: {clientId: obj.teams.id, table: "teams"}
		});
		if(obj.teams.games) {
			let insertObject = {};
			insertObject.games = obj.teams.games;

			parents.teamId = obj.teams.id;
			
			printInsertStatementsFromRaw(insertObject, parents, result, accountId);
			parents.teamId = undefined;
		}
	}
	
	if(obj.games) {
		result.push({
			query:"INSERT INTO games (date, opponent, park, score_us, score_them, team_id, lineup_type, account_id) VALUES(to_timestamp($1), $2, $3, $4, $5, $6, $7, $8) RETURNING id;",
			values:[obj.games.date, obj.games.opponent, obj.games.park, obj.games.score_us, obj.games.score_them, "REPLACE_ME_TEAMS", obj.games.lineup_type, accountId],
			idReplacements:[
				{valuesIndex:5, table:"teams", clientId: parents.teamId},
			],
			mapReturnValueTo: {clientId: obj.games.id, table: "games"}
		});
		if(obj.games.plateAppearances) {
			let insertObject = {};
			insertObject.plateAppearances = obj.games.plateAppearances;

			parents.gameId = obj.games.id;
			printInsertStatementsFromRaw(insertObject, parents, result, accountId);
			parents.gameId = undefined;
		}
		if(obj.games.lineup) {
			let insertObject = {};
			insertObject.lineup = obj.games.lineup;

			parents.gameId = obj.games.id;
			printInsertStatementsFromRaw(insertObject, parents, result, accountId);
			parents.gameId = undefined;
		}
	}
	
	if(obj.lineup) {
		result.push({
			query:"UPDATE players_games SET lineup_index = lineup_index + 1 WHERE lineup_index >= $1 AND game_id = $2 AND account_id = $3",
			values:[obj.position+1, parents.gameId, accountId] // lineup oredering starts at 1 not 0
		});
		result.push({
			query:"INSERT INTO players_games (player_id, game_id, lineup_index, account_id) VALUES($1, $2, $3, $4) RETURNING id",
			values:["REPLACE_ME_PLAYERS", "REPLACE_ME_GAMES", obj.position+1, accountId], // lineup oredering starts at 1 not 0
			idReplacements:[
				{valuesIndex:0, table:"players", clientId: obj.lineup},
				{valuesIndex:1, table:"games", clientId: parents.gameId}
			],
			mapReturnValueTo: {clientId: "There is no client id for this table" , table: "players_games"}
		});
	}
	
	if(obj.plateAppearances) {
		let x;
		let y;
		if(obj.plateAppearances.location) {
			x = obj.plateAppearances.location.x;
			y = obj.plateAppearances.location.y;
		}
		result.push({
			query:"INSERT INTO plate_appearances (result, player_id, game_id, team_id, hit_location_x, hit_location_y, index_in_game, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;",
			values:[obj.plateAppearances.result, "REPLACE_ME_PLAYERS", "REPLACE_ME_GAMES", "REPLACE_ME_TEAMS", x, y, obj.plateAppearances.plateAppearanceIndex, accountId],
			idReplacements:[
				{valuesIndex:1, table:"players", clientId: obj.plateAppearances.player_id},
				{valuesIndex:2, table:"games", clientId: parents.gameId},
				{valuesIndex:3, table:"teams", clientId: parents.teamId}
			],
			mapReturnValueTo: {clientId: obj.plateAppearances.id, table: "plate_appearances"}
		});
	}
}

let printInsertStatementsFromRaw = function(obj, parents, result, accountId) {
	if(!accountId) {
		throw new HandledError(500,"Internal Server Error", "Tried to generate sql while accoutnId was undefined (no account loged in)");
	}
	if(obj.players) {
		for(let i = 0; i < obj.players.length; i++) {
			result.push({
				query:"INSERT INTO players (name, gender, account_id) VALUES($1, $2, $3) RETURNING id;",
				values:[obj.players[i].name, obj.players[i].gender, accountId],
				idReplacements:[],
				mapReturnValueTo: {clientId: obj.players[i].id, table: "players"}
			});
		}
	}
	
	if(obj.teams) {
		for(let i = 0; i < obj.teams.length; i++) {
			result.push({
				query:"INSERT INTO teams (name, account_id) VALUES($1, $2) RETURNING id;",
				values:[obj.teams[i].name],
				idReplacements:[],
				mapReturnValueTo: {clientId: obj.teams[i].id, table: "teams"}
			});
			if(obj.teams[i].games) {
				let insertObject = {};
				insertObject.games = obj.teams[i].games;

				parents.teamId = obj.teams[i].id;
				printInsertStatementsFromRaw(insertObject, parents, result, accountId);
				parents.teamId = undefined;
			}
		}
	}
	
	if(obj.games && obj.games.length > 0) {
		for(let i = 0; i < obj.games.length; i++) {
			result.push({
				query:"INSERT INTO games (date, opponent, park, score_us, score_them, team_id, lineup_type, account_id) VALUES(to_timestamp($1), $2, $3, $4, $5, $6, $7, $8) RETURNING id;",
				values:[obj.games[i].date, obj.games[i].opponent, obj.games[i].park, obj.games[i].score_us, obj.games[i].score_them, "REPLACE_ME_TEAMS", obj.games[i].lineup_type, accountId],
				idReplacements:[
					{valuesIndex:5, table:"teams", clientId: parents.teamId}
				],
				mapReturnValueTo: {clientId: obj.games[i].id, table: "games"}
			});
			if(obj.games[i].plateAppearances) {
				let insertObject = {};
				insertObject.plateAppearances = obj.games[i].plateAppearances;

				parents.gameId = obj.games[i].id;
				printInsertStatementsFromRaw(insertObject, parents, result, accountId);
				parents.gameId = undefined;
			}
			if(obj.games[i].lineup) {
				let insertObject = {};
				insertObject.lineup = obj.games[i].lineup;

				parents.gameId = obj.games[i].id;
				printInsertStatementsFromRaw(insertObject, parents, result, accountId);
				parents.gameId = undefined;
			}
		}
	}
	
	if(obj.lineup && obj.lineup.length > 0) {
		for(let i = 0; i < obj.lineup.length; i++) {
			result.push({
				query:"INSERT INTO players_games (player_id, game_id, lineup_index, account_id) VALUES($1, $2, $3, $4) RETURNING id;",
				values:["REPLACE_ME_PLAYERS", "REPLACE_ME_GAMES", i+1, accountId],
				idReplacements:[
					{valuesIndex:0, table:"players", clientId: obj.lineup[i]},
					{valuesIndex:1, table:"games", clientId: parents.gameId}
				],
				mapReturnValueTo: {clientId: "There is no client id for this table" , table: "players_games"}
			});
		}
	}
	
	if(obj.plateAppearances && obj.plateAppearances.length > 0) {
		for(let i = 0; i < obj.plateAppearances.length; i++) {
			let x;
			let y;
			if(obj.plateAppearances[i].location) {
				x = obj.plateAppearances[i].location.x;
				y = obj.plateAppearances[i].location.y;
			}
			result.push({
				query:"INSERT INTO plate_appearances (result, player_id, game_id, team_id, hit_location_x, hit_location_y, index_in_game, account_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;",
				values:[obj.plateAppearances[i].result, "REPLACE_ME_PLAYERS", "REPLACE_ME_GAMES", "REPLACE_ME_TEAMS", x, y, obj.plateAppearances[i].plateAppearanceIndex, accountId],
				idReplacements:[
					{valuesIndex:1, table:"players", clientId: obj.plateAppearances[i].player_id},
					{valuesIndex:2, table:"games", clientId: parents.gameId},
					{valuesIndex:3, table:"teams", clientId: parents.teamId}
				],
				mapReturnValueTo: {clientId: obj.plateAppearances[i].id, table: "plate_appearances"}
			});
		}
	}
	
}

let getColNameFromJSONValue = function(value) {
	let map = {
		x:"hit_location_x",
		y:"hit_location_y"
	}
	if(map[value]) {
		return map[value];
	} else {
		return value;
	}
}

let getTableFromReference = function(reference) {
	return tableNames[tableReferences.indexOf(reference)];
}

// If 'key' is a table reference, it is returned. Otherwise, this function returns the latest value in the 'path' array that is a table reference. 
let getTableReferenceFromPath = function(path, key) {
	// Map JSON names to db table names
	if(tableReferences.indexOf(key) >= 0) {
		return tableReferences[tableReferences.indexOf(key)];
	}
	for(let i = (path.length-1); i >= 0; i--) {
		if(tableReferences.indexOf(path[i]) >= 0) {
			return tableReferences[tableReferences.indexOf(path[i])];
		}
	}
	//console.log("Warning: not sure what to do with this");
	return null;
}

// Returns the id of type from the path. If no type is specified, returns latest id.
let getIdFromPath = function(path, type) {
	if(type) {
		for(let i = (path.length-1); i >= 0; i--) {
			if(path[i] === type) {
				return path[i+1];
			}
		}
	} else {
		for(let i = (path.length-1); i >= 0; i--) {
			if(isNumeric(path[i])) {
				return path[i];
			}
		}
	}
}

// returns true if the obj has any properties assigned
let hasProperties = function(obj) {
	//console.log(Object.keys(obj));
	if(Object.keys(obj).length > 0)  {
		return true;
	} else {
		return false;
	}
}

// Returns true if none of the object's properties are objects themselves.
let isRoot = function (obj) {
	let keys = Object.keys(obj);
	for (var i = 0; i < keys.length; i++) {
		let key = keys[i];
		if (obj[key] !== null && typeof obj[key] === 'object') {
			return false;
		}
	}
	return true;
}

let isNumeric = function(value) {
  return !isNaN(value - parseFloat(value));
}

module.exports = {  
    getSqlFromPatch: getSqlFromPatch
}