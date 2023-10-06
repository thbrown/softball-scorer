import { GlobalState } from 'state';
import mockData from './mock.json';
import StateContainer from 'state-container';

describe('State Operations', () => {
  it('Team CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a team (is immutable)
    const existingTeam = state.getTeam('05iWarrdrfZ1ff');
    const existingTeamName = existingTeam.name;
    existingTeam.name = 'Dallas Cowboys';
    expect(state.getTeam(existingTeam.id).name).toEqual(existingTeamName);

    // Get all teams (is immutable)
    const existingTeams = state.getAllTeams();
    const existingTeamCount = existingTeams.length;
    existingTeams.splice(0, 1);
    expect(state.getAllTeams().length).toEqual(existingTeamCount);

    // Add a team
    const addedTeam = state.addTeam('Denver Broncos');
    expect(state.getTeam(addedTeam.id)).toBeDefined();

    // Remove a team
    state.removeTeam('4i7WarrEmtZMxJ');
    expect(state.getTeam('4i7WarrEmtZMxJ')).toBeUndefined();

    // Replace a team
    const newName = 'Kansas City Chiefs';
    const teamToEdit = state.getTeam('05iWarrdrfZ1ff');
    const numExistingGames = teamToEdit.games.length;
    teamToEdit.name = newName;
    state.replaceTeam(existingTeam.id, teamToEdit);
    expect(state.getTeam(teamToEdit.id).name).toEqual(newName);
    expect(state.getTeam(teamToEdit.id).games.length).toEqual(numExistingGames);
  });

  it('Player CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a player (is immutable)
    const existingPlayer = state.getPlayer('3hw09h7XgjfMK7');
    const existingPlayerName = existingPlayer.name;
    existingPlayer.name = 'Frodo';
    expect(state.getPlayer(existingPlayer.id).name).toEqual(existingPlayerName);

    // Get all players (is immutable)
    const existingPlayers = state.getAllPlayers();
    const existingPlayersCount = existingPlayers.length;
    existingPlayers.splice(0, 1);
    expect(state.getAllPlayers().length).toEqual(existingPlayersCount);

    // Add a player
    const addedPlayer = state.addPlayer('Sam', 'M');
    expect(state.getPlayer(addedPlayer.id)).toBeDefined();

    // Remove a player that can be removed
    const wasSuccessfulA = state.removePlayer(addedPlayer.id);
    expect(wasSuccessfulA).toEqual(true);
    expect(state.getPlayer(addedPlayer.id)).toBeUndefined();

    // Remove a player that can't be removed
    const wasSuccessfulB = state.removePlayer('5LubX8hY1J9qbi');
    expect(wasSuccessfulB).toEqual(false);

    // Replace a player
    const newName = 'Matty Jones';
    const playerToEdit = state.getPlayer('3hw09h7XgjfMK7');
    const playerGender = playerToEdit.gender;
    playerToEdit.name = newName;
    state.replacePlayer(playerToEdit.id, playerToEdit);
    expect(state.getPlayer(playerToEdit.id).name).toEqual(newName);
    expect(state.getPlayer(playerToEdit.id).gender).toEqual(playerGender);
  });

  it('Optimization CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get an optimization (is immutable)
    const existingOptimization = state.getOptimization('3NSGvYhAAtiCCc');
    const existingOptimizationName = existingOptimization.name;
    existingOptimization.name = 'Frodo';
    expect(state.getOptimization(existingOptimization.id).name).toEqual(
      existingOptimizationName
    );

    // Get all optimizations (is immutable)
    const existingOptimizations = state.getAllOptimizations();
    const existingOptimizationsCount = existingOptimizations.length;
    existingOptimizations.splice(0, 1);
    expect(state.getAllOptimizations().length).toEqual(
      existingOptimizationsCount
    );

    // Add an optimization
    const addedOptimization = state.addOptimization('SomeName', [
      '3XcBG4OeaNrgHs',
      '5t7RegcwU6GWQ4',
      '5LubX8hY1J9qbi',
    ]);
    expect(state.getOptimization(addedOptimization.id)).toBeDefined();

    // Remove an optimization
    state.removeOptimization(addedOptimization.id);
    expect(state.getOptimization(addedOptimization.id)).toBeUndefined();

    // Replace a optimization
    const newName = 'Better Optimization';
    const optimizationToEdit = state.getOptimization('3hLmu7ZyyDNXzi');
    const optimizationOverrideDataCount =
      optimizationToEdit.overrideData.length;
    optimizationToEdit.name = newName;
    state.replaceOptimization(optimizationToEdit.id, optimizationToEdit);
    expect(state.getOptimization(optimizationToEdit.id).name).toEqual(newName);
    expect(
      state.getOptimization(optimizationToEdit.id).overrideData.length
    ).toEqual(optimizationOverrideDataCount);
  });

  it('Game CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a game (is immutable)
    const existingGame = state.getGame('1');
    const existingGameOpponent = existingGame.opponent;
    existingGame.opponent = 'PizzaParty';
    expect(state.getGame(existingGame.id).opponent).toEqual(
      existingGameOpponent
    );

    // Add a game
    const addedGame = state.addGame('4i7WarrEmtZMxJ', 'Denver Broncos');
    expect(state.getGame(addedGame.id)).toBeDefined();

    // Remove a game
    state.removeGame('2');
    expect(state.getGame('2')).toBeUndefined();

    // Replace a game
    const newOpponent = 'Kansas City Chiefs';
    const oldGame = state.getGame('1');
    const gameToEdit = state.getGame('1');
    const numExistingPas = gameToEdit.plateAppearances.length;
    gameToEdit.opponent = newOpponent;
    state.replaceGame(oldGame.id, null, gameToEdit); // TODO: remove the second arg

    expect(state.getGame(gameToEdit.id).opponent).toEqual(newOpponent);
    expect(state.getGame(gameToEdit.id).plateAppearances.length).toEqual(
      numExistingPas
    );
  });

  it('PlateAppearance CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a plate appearance (is immutable)
    const existingPlateAppearance = state.getPlateAppearance('1asNvNz984Ec4f');
    const existingPlateAppearanceResult = existingPlateAppearance.result;
    existingPlateAppearance.result = 'Out';
    expect(state.getPlateAppearance(existingPlateAppearance.id).result).toEqual(
      existingPlateAppearanceResult
    );

    // Add a plate appearance
    const addedPlateAppearance = state.addPlateAppearance(
      '3XcBG4OeaNrgHs',
      '1'
    );
    expect(state.getPlateAppearance(addedPlateAppearance.id)).toBeDefined();

    // Remove a game
    state.removePlateAppearance('2IHrEOVC4hfUTI');
    expect(state.getPlateAppearance('2IHrEOVC4hfUTI')).toBeUndefined();

    // Replace a game
    const newResult = 'HRo';
    const oldPlateAppearance = state.getPlateAppearance('4UuyGMABG7tefx');
    const plateAppearanceToEdit = state.getPlateAppearance('4UuyGMABG7tefx');
    plateAppearanceToEdit.result = newResult;
    state.replacePlateAppearance(
      oldPlateAppearance.id,
      null,
      null,
      plateAppearanceToEdit
    ); // TODO: remove the second & third args

    expect(state.getPlateAppearance(plateAppearanceToEdit.id).result).toEqual(
      newResult
    );
  });
});
