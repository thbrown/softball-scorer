import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import state from 'state';
import { setRoute, setOnGoBack } from 'actions/route';
import { getPageWrapper } from './test-helpers';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

const TEST_TEAM_NAME = 'Test Team';
const TEST_GAME_NAME = 'Test Opponent';
const TEST_OPTIMIZATION_NAME = 'Test Optimization';
const TEST_PLAYERS = [];
for (let i = 0; i < 10; i++) {
  TEST_PLAYERS.push('PLAYER ' + i);
}

export const createTeamUI = (wrapper) => {
  // Enzyme 3 doesn't automatically re-render when modifying external state without an event
  // so you must manually tell it to update.
  setRoute(`/`);
  wrapper.update();

  wrapper.find('#teams').hostNodes().simulate('click');
  wrapper.find('#newTeam').hostNodes().simulate('click');
  wrapper
    .find('input')
    .hostNodes()
    .simulate('change', { target: { value: TEST_TEAM_NAME } });
  wrapper.find('#save').hostNodes().simulate('click');
  wrapper.update();

  // when the Save button is pressed, the team should be in the state as the first team
  const teams = state.getLocalState().teams;
  const newTeam = teams[0];
  expect(newTeam).toBeTruthy();
  expect(newTeam.name).toEqual(TEST_TEAM_NAME);
  expect(newTeam.games.length).toEqual(0);

  return newTeam;
};

export const createGameUI = (wrapper, teamId) => {
  // Enzyme 3 doesn't automatically re-render when modifying external state without an event
  // so you must manually tell it to update.
  setRoute(`/teams`);
  wrapper.update();

  wrapper.find(`#team-${teamId}`).hostNodes().simulate('click');
  wrapper.find('#newGame').hostNodes().simulate('click');
  wrapper
    .find('input#opponentName')
    .hostNodes()
    .simulate('change', { target: { value: TEST_GAME_NAME } });
  wrapper
    .find('#lineupType')
    .hostNodes()
    .simulate('change', { target: { value: 1 } });
  wrapper.find('#save').hostNodes().simulate('click');
  wrapper.update();

  // the last game in the list for this team should be the newly-created game
  const games = state.getTeam(teamId).games;
  const newGame = games.find((g) => g.opponent === TEST_GAME_NAME);
  expect(newGame).toBeTruthy();
  expect(newGame.opponent).toEqual(TEST_GAME_NAME);
  expect(newGame.lineupType).toEqual(1);

  return newGame;
};

export const createOptimizationUI = (wrapper) => {
  // Enzyme 3 doesn't automatically re-render when modifying external state without an event
  // so you must manually tell it to update.
  setRoute(`/`);
  wrapper.update();

  wrapper.find('#optimizations').hostNodes().simulate('click');
  wrapper.find('#new-optimization').hostNodes().simulate('click');
  wrapper
    .find('input#optimizationName')
    .hostNodes()
    .simulate('change', { target: { value: TEST_OPTIMIZATION_NAME } });

  wrapper.find('#save').hostNodes().simulate('click');
  wrapper.update();

  const optimizations = state.getLocalState().optimizations;
  const newOptimization = optimizations[optimizations.length - 1];
  expect(newOptimization).toBeTruthy();
  expect(newOptimization.name).toEqual(TEST_OPTIMIZATION_NAME);

  return newOptimization;
};

describe('[UI] Create/Edit/Delete', () => {
  describe('Team', () => {
    // window.history.back does not work in enzyme, but it can be simulated by capturing
    // the goBack event and manually setting the route it would have gone to.
    beforeAll(() => {
      setOnGoBack((path) => {
        setRoute(path);
      });
      state.resetState();
    });

    it('A user can create, edit, and delete a team', () => {
      const { wrapper } = getPageWrapper();
      const newTeam = createTeamUI(wrapper);
      wrapper.find(`#team-${newTeam.id}-edit`).hostNodes().simulate('click');
      wrapper.find(`#delete`).hostNodes().simulate('click');
      wrapper.find('#dialog-confirm').hostNodes().simulate('click');

      expect(state.getLocalState().teams.length).toEqual(0);
    });
  });

  describe('Game', () => {
    it('A user can create, edit, and delete a game', () => {
      const { wrapper } = getPageWrapper();
      const teamId = createTeamUI(wrapper).id;
      const newGame = createGameUI(wrapper, teamId);
      wrapper.update();
      wrapper.find(`#game-${newGame.id}-edit`).hostNodes().simulate('click');
      wrapper.find(`#delete`).hostNodes().simulate('click');
      wrapper.find('#dialog-confirm').hostNodes().simulate('click');
      expect(state.getTeam(teamId).games.length).toEqual(0);
    });
  });

  describe('Lineup', () => {
    it('A user can create, edit, and delete a lineup ', () => {
      const { wrapper } = getPageWrapper();
      const teamId = createTeamUI(wrapper).id;
      const newGame = createGameUI(wrapper, teamId);
      wrapper.find(`#game-${newGame.id}-edit`).hostNodes().simulate('click');
      /*
      TEST_PLAYERS.forEach((playerName) => {
        wrapper.find('#newPlayer').simulate('click');
        wrapper
          .find('input')
          .simulate('change', { target: { value: playerName } });

        // TODO click on the autosuggest instead of setting state here
        wrapper.find('#player-select').setState({
          createNewPlayer: true,
        });
        wrapper.find('#submit').simulate('click');
      });

      const game = state.getGame(gameId);
      expect(game.lineup.length).toEqual(TEST_PLAYERS.length);

      // copy the lineup so that the state does not modify this version of it.
      const lineup = game.lineup.slice();

      lineup.forEach((playerId) => {
        wrapper.find('#remove-' + playerId).simulate('click');
        wrapper.find('#dialog-confirm').simulate('click');
      });

      expect(state.getGame(gameId).lineup.length).toEqual(0);
      */
    });
  });

  describe('Optimization', () => {
    it('A user can create, edit, and delete an optimization', () => {
      const { wrapper } = getPageWrapper();
      const optimizationId = createOptimizationUI(wrapper).id;
      wrapper.update();

      wrapper
        .find(`#optimization-${optimizationId}`)
        .hostNodes()
        .simulate('click');
      wrapper.find('#accordion-players').hostNodes().simulate('click');
      wrapper.find('#accordion-games').hostNodes().simulate('click');
      wrapper.find('#accordion-options').hostNodes().simulate('click');
      // wrapper.find('#back-button').hostNodes().simulate('click');
      setRoute('/optimizations');
      wrapper.update();
      wrapper
        .find(`#edit-optimization-${optimizationId}`)
        .hostNodes()
        .simulate('click');
      wrapper.find('#delete').hostNodes().simulate('click');
      wrapper.find('#dialog-confirm').hostNodes().simulate('click');

      expect(state.getLocalState().optimizations.length).toEqual(0);
    });
  });
});
