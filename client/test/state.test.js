import { it, describe, expect, beforeEach, afterEach } from 'vitest';
import { GlobalState } from 'state';
import mockData from './mock.json';
import StateContainer from 'state-container';

describe('State Operations', () => {
  it('Team CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const globalState = new GlobalState(stateContainer);

    // Get a team (is immutable)
    const existingTeam = globalState.getTeam('05iWarrdrfZ1ff');
    const existingTeamName = existingTeam.name;
    existingTeam.name = 'Dallas Cowboys';
    expect(globalState.getTeam(existingTeam.id).name).toEqual(existingTeamName);

    // Get all teams (is immutable)
    const existingTeams = globalState.getAllTeams();
    const existingTeamCount = existingTeams.length;
    existingTeams.splice(0, 1);
    expect(globalState.getAllTeams().length).toEqual(existingTeamCount);

    // Add a team
    const addedTeam = globalState.addTeam('Denver Broncos');
    expect(globalState.getTeam(addedTeam.id)).toBeDefined();

    // Remove a team
    globalState.removeTeam('4i7WarrEmtZMxJ');
    expect(globalState.getTeam('4i7WarrEmtZMxJ')).toBeUndefined();

    // Replace a team
    const newName = 'Kansas City Chiefs';
    const teamToEdit = globalState.getTeam('05iWarrdrfZ1ff');
    const numExistingGames = teamToEdit.games.length;
    teamToEdit.name = newName;
    globalState.replaceTeam(existingTeam.id, teamToEdit);
    expect(globalState.getTeam(teamToEdit.id).name).toEqual(newName);
    expect(globalState.getTeam(teamToEdit.id).games.length).toEqual(
      numExistingGames
    );
  });

  it('Player CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const globalState = new GlobalState(stateContainer);

    // Get a player (is immutable)
    const existingPlayer = globalState.getPlayer('3hw09h7XgjfMK7');
    const existingPlayerName = existingPlayer.name;
    existingPlayer.name = 'Frodo';
    expect(globalState.getPlayer(existingPlayer.id).name).toEqual(
      existingPlayerName
    );

    // Get all players (is immutable)
    const existingPlayers = globalState.getAllPlayers();
    const existingPlayersCount = existingPlayers.length;
    existingPlayers.splice(0, 1);
    expect(globalState.getAllPlayers().length).toEqual(existingPlayersCount);

    // Add a player
    const addedPlayer = globalState.addPlayer('Sam', 'M');
    expect(globalState.getPlayer(addedPlayer.id)).toBeDefined();

    // Remove a player that can be removed
    const wasSuccessfulA = globalState.removePlayer(addedPlayer.id);
    expect(wasSuccessfulA).toEqual(true);
    expect(globalState.getPlayer(addedPlayer.id)).toBeUndefined();

    // Remove a player that can't be removed
    const wasSuccessfulB = globalState.removePlayer('5LubX8hY1J9qbi');
    expect(wasSuccessfulB).toEqual(false);

    // Replace a player
    const newName = 'Matty Jones';
    const playerToEdit = globalState.getPlayer('3hw09h7XgjfMK7');
    const playerGender = playerToEdit.gender;
    playerToEdit.name = newName;
    globalState.replacePlayer(playerToEdit.id, playerToEdit);
    expect(globalState.getPlayer(playerToEdit.id).name).toEqual(newName);
    expect(globalState.getPlayer(playerToEdit.id).gender).toEqual(playerGender);
  });

  it('Optimization CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const globalState = new GlobalState(stateContainer);

    // Get an optimization (is immutable)
    const existingOptimization = globalState.getOptimization('3NSGvYhAAtiCCc');
    const existingOptimizationName = existingOptimization.name;
    existingOptimization.name = 'Frodo';
    expect(globalState.getOptimization(existingOptimization.id).name).toEqual(
      existingOptimizationName
    );

    // Get all optimizations (is immutable)
    const existingOptimizations = globalState.getAllOptimizations();
    const existingOptimizationsCount = existingOptimizations.length;
    existingOptimizations.splice(0, 1);
    expect(globalState.getAllOptimizations().length).toEqual(
      existingOptimizationsCount
    );

    // Add an optimization
    const addedOptimization = globalState.addOptimization('SomeName', [
      '3XcBG4OeaNrgHs',
      '5t7RegcwU6GWQ4',
      '5LubX8hY1J9qbi',
    ]);
    expect(globalState.getOptimization(addedOptimization.id)).toBeDefined();

    // Remove an optimization
    globalState.removeOptimization(addedOptimization.id);
    expect(globalState.getOptimization(addedOptimization.id)).toBeUndefined();

    // Replace a optimization
    const newName = 'Better Optimization';
    const optimizationToEdit = globalState.getOptimization('3hLmu7ZyyDNXzi');
    const optimizationOverrideDataCount =
      optimizationToEdit.overrideData.length;
    optimizationToEdit.name = newName;
    globalState.replaceOptimization(optimizationToEdit.id, optimizationToEdit);
    expect(globalState.getOptimization(optimizationToEdit.id).name).toEqual(
      newName
    );
    expect(
      globalState.getOptimization(optimizationToEdit.id).overrideData.length
    ).toEqual(optimizationOverrideDataCount);
  });

  it('Game CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const globalState = new GlobalState(stateContainer);

    // Get a game (is immutable)
    const existingGame = globalState.getGame('1');
    const existingGameOpponent = existingGame.opponent;
    existingGame.opponent = 'PizzaParty';
    expect(globalState.getGame(existingGame.id).opponent).toEqual(
      existingGameOpponent
    );

    // Add a game
    const addedGame = globalState.addGame('4i7WarrEmtZMxJ', 'Denver Broncos');
    expect(globalState.getGame(addedGame.id)).toBeDefined();

    // Remove a game
    globalState.removeGame('2');
    expect(globalState.getGame('2')).toBeUndefined();

    // Replace a game
    const newOpponent = 'Kansas City Chiefs';
    const oldGame = globalState.getGame('1');
    const gameToEdit = globalState.getGame('1');
    const numExistingPas = gameToEdit.plateAppearances.length;
    gameToEdit.opponent = newOpponent;
    globalState.replaceGame(oldGame.id, null, gameToEdit); // TODO: remove the second arg

    expect(globalState.getGame(gameToEdit.id).opponent).toEqual(newOpponent);
    expect(globalState.getGame(gameToEdit.id).plateAppearances.length).toEqual(
      numExistingPas
    );
  });

  it('PlateAppearance CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const globalState = new GlobalState(stateContainer);

    // Get a plate appearance (is immutable)
    const existingPlateAppearance =
      globalState.getPlateAppearance('1asNvNz984Ec4f');
    const existingPlateAppearanceResult = existingPlateAppearance.result;
    existingPlateAppearance.result = 'Out';
    expect(
      globalState.getPlateAppearance(existingPlateAppearance.id).result
    ).toEqual(existingPlateAppearanceResult);

    // Add a plate appearance
    const addedPlateAppearance = globalState.addPlateAppearance(
      '3XcBG4OeaNrgHs',
      '1'
    );
    expect(
      globalState.getPlateAppearance(addedPlateAppearance.id)
    ).toBeDefined();

    // Remove a game
    globalState.removePlateAppearance('2IHrEOVC4hfUTI');
    expect(globalState.getPlateAppearance('2IHrEOVC4hfUTI')).toBeUndefined();

    // Replace a game
    const newResult = 'HRo';
    const oldPlateAppearance = globalState.getPlateAppearance('4UuyGMABG7tefx');
    const plateAppearanceToEdit =
      globalState.getPlateAppearance('4UuyGMABG7tefx');
    plateAppearanceToEdit.result = newResult;
    globalState.replacePlateAppearance(
      oldPlateAppearance.id,
      null,
      null,
      plateAppearanceToEdit
    ); // TODO: remove the second & third args

    expect(
      globalState.getPlateAppearance(plateAppearanceToEdit.id).result
    ).toEqual(newResult);
  });
});
