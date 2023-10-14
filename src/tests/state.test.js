import { GlobalState } from 'state';
import mockData from './mock.json';
import StateContainer from 'state-container';

describe('State Operations', () => {
  it('Team CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a team (is immutable)
    const existingTeam = getGlobalState().getTeam('05iWarrdrfZ1ff');
    const existingTeamName = existingTeam.name;
    existingTeam.name = 'Dallas Cowboys';
    expect(getGlobalState().getTeam(existingTeam.id).name).toEqual(
      existingTeamName
    );

    // Get all teams (is immutable)
    const existingTeams = getGlobalState().getAllTeams();
    const existingTeamCount = existingTeams.length;
    existingTeams.splice(0, 1);
    expect(getGlobalState().getAllTeams().length).toEqual(existingTeamCount);

    // Add a team
    const addedTeam = getGlobalState().addTeam('Denver Broncos');
    expect(getGlobalState().getTeam(addedTeam.id)).toBeDefined();

    // Remove a team
    getGlobalState().removeTeam('4i7WarrEmtZMxJ');
    expect(getGlobalState().getTeam('4i7WarrEmtZMxJ')).toBeUndefined();

    // Replace a team
    const newName = 'Kansas City Chiefs';
    const teamToEdit = getGlobalState().getTeam('05iWarrdrfZ1ff');
    const numExistingGames = teamToEdit.games.length;
    teamToEdit.name = newName;
    getGlobalState().replaceTeam(existingTeam.id, teamToEdit);
    expect(getGlobalState().getTeam(teamToEdit.id).name).toEqual(newName);
    expect(getGlobalState().getTeam(teamToEdit.id).games.length).toEqual(
      numExistingGames
    );
  });

  it('Player CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a player (is immutable)
    const existingPlayer = getGlobalState().getPlayer('3hw09h7XgjfMK7');
    const existingPlayerName = existingPlayer.name;
    existingPlayer.name = 'Frodo';
    expect(getGlobalState().getPlayer(existingPlayer.id).name).toEqual(
      existingPlayerName
    );

    // Get all players (is immutable)
    const existingPlayers = getGlobalState().getAllPlayers();
    const existingPlayersCount = existingPlayers.length;
    existingPlayers.splice(0, 1);
    expect(getGlobalState().getAllPlayers().length).toEqual(
      existingPlayersCount
    );

    // Add a player
    const addedPlayer = getGlobalState().addPlayer('Sam', 'M');
    expect(getGlobalState().getPlayer(addedPlayer.id)).toBeDefined();

    // Remove a player that can be removed
    const wasSuccessfulA = getGlobalState().removePlayer(addedPlayer.id);
    expect(wasSuccessfulA).toEqual(true);
    expect(getGlobalState().getPlayer(addedPlayer.id)).toBeUndefined();

    // Remove a player that can't be removed
    const wasSuccessfulB = getGlobalState().removePlayer('5LubX8hY1J9qbi');
    expect(wasSuccessfulB).toEqual(false);

    // Replace a player
    const newName = 'Matty Jones';
    const playerToEdit = getGlobalState().getPlayer('3hw09h7XgjfMK7');
    const playerGender = playerToEdit.gender;
    playerToEdit.name = newName;
    getGlobalState().replacePlayer(playerToEdit.id, playerToEdit);
    expect(getGlobalState().getPlayer(playerToEdit.id).name).toEqual(newName);
    expect(getGlobalState().getPlayer(playerToEdit.id).gender).toEqual(
      playerGender
    );
  });

  it('Optimization CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get an optimization (is immutable)
    const existingOptimization =
      getGlobalState().getOptimization('3NSGvYhAAtiCCc');
    const existingOptimizationName = existingOptimization.name;
    existingOptimization.name = 'Frodo';
    expect(
      getGlobalState().getOptimization(existingOptimization.id).name
    ).toEqual(existingOptimizationName);

    // Get all optimizations (is immutable)
    const existingOptimizations = getGlobalState().getAllOptimizations();
    const existingOptimizationsCount = existingOptimizations.length;
    existingOptimizations.splice(0, 1);
    expect(getGlobalState().getAllOptimizations().length).toEqual(
      existingOptimizationsCount
    );

    // Add an optimization
    const addedOptimization = getGlobalState().addOptimization('SomeName', [
      '3XcBG4OeaNrgHs',
      '5t7RegcwU6GWQ4',
      '5LubX8hY1J9qbi',
    ]);
    expect(
      getGlobalState().getOptimization(addedOptimization.id)
    ).toBeDefined();

    // Remove an optimization
    getGlobalState().removeOptimization(addedOptimization.id);
    expect(
      getGlobalState().getOptimization(addedOptimization.id)
    ).toBeUndefined();

    // Replace a optimization
    const newName = 'Better Optimization';
    const optimizationToEdit =
      getGlobalState().getOptimization('3hLmu7ZyyDNXzi');
    const optimizationOverrideDataCount =
      optimizationToEdit.overrideData.length;
    optimizationToEdit.name = newName;
    getGlobalState().replaceOptimization(
      optimizationToEdit.id,
      optimizationToEdit
    );
    expect(
      getGlobalState().getOptimization(optimizationToEdit.id).name
    ).toEqual(newName);
    expect(
      getGlobalState().getOptimization(optimizationToEdit.id).overrideData
        .length
    ).toEqual(optimizationOverrideDataCount);
  });

  it('Game CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a game (is immutable)
    const existingGame = getGlobalState().getGame('1');
    const existingGameOpponent = existingGame.opponent;
    existingGame.opponent = 'PizzaParty';
    expect(getGlobalState().getGame(existingGame.id).opponent).toEqual(
      existingGameOpponent
    );

    // Add a game
    const addedGame = getGlobalState().addGame(
      '4i7WarrEmtZMxJ',
      'Denver Broncos'
    );
    expect(getGlobalState().getGame(addedGame.id)).toBeDefined();

    // Remove a game
    getGlobalState().removeGame('2');
    expect(getGlobalState().getGame('2')).toBeUndefined();

    // Replace a game
    const newOpponent = 'Kansas City Chiefs';
    const oldGame = getGlobalState().getGame('1');
    const gameToEdit = getGlobalState().getGame('1');
    const numExistingPas = gameToEdit.plateAppearances.length;
    gameToEdit.opponent = newOpponent;
    getGlobalState().replaceGame(oldGame.id, null, gameToEdit); // TODO: remove the second arg

    expect(getGlobalState().getGame(gameToEdit.id).opponent).toEqual(
      newOpponent
    );
    expect(
      getGlobalState().getGame(gameToEdit.id).plateAppearances.length
    ).toEqual(numExistingPas);
  });

  it('PlateAppearance CRUD', () => {
    const stateContainer = new StateContainer(mockData);
    const state = new GlobalState(stateContainer);

    // Get a plate appearance (is immutable)
    const existingPlateAppearance =
      getGlobalState().getPlateAppearance('1asNvNz984Ec4f');
    const existingPlateAppearanceResult = existingPlateAppearance.result;
    existingPlateAppearance.result = 'Out';
    expect(
      getGlobalState().getPlateAppearance(existingPlateAppearance.id).result
    ).toEqual(existingPlateAppearanceResult);

    // Add a plate appearance
    const addedPlateAppearance = getGlobalState().addPlateAppearance(
      '3XcBG4OeaNrgHs',
      '1'
    );
    expect(
      getGlobalState().getPlateAppearance(addedPlateAppearance.id)
    ).toBeDefined();

    // Remove a game
    getGlobalState().removePlateAppearance('2IHrEOVC4hfUTI');
    expect(
      getGlobalState().getPlateAppearance('2IHrEOVC4hfUTI')
    ).toBeUndefined();

    // Replace a game
    const newResult = 'HRo';
    const oldPlateAppearance =
      getGlobalState().getPlateAppearance('4UuyGMABG7tefx');
    const plateAppearanceToEdit =
      getGlobalState().getPlateAppearance('4UuyGMABG7tefx');
    plateAppearanceToEdit.result = newResult;
    getGlobalState().replacePlateAppearance(
      oldPlateAppearance.id,
      null,
      null,
      plateAppearanceToEdit
    ); // TODO: remove the second & third args

    expect(
      getGlobalState().getPlateAppearance(plateAppearanceToEdit.id).result
    ).toEqual(newResult);
  });
});
