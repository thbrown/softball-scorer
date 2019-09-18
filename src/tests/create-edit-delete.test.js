import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import state from 'state';
import { setRoute, setOnGoBack } from 'actions/route';
import { getPageWrapper } from './test-helpers';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

const TEST_TEAM_NAME = 'Test Team';
const TEST_GAME_NAME = 'Test Opponent';
const TEST_PLAYERS = [];
for (let i = 0; i < 10; i++) {
  TEST_PLAYERS.push('PLAYER ' + i);
}

export const createTeamUI = wrapper => {
  setRoute(`/`);
  wrapper.find('#teams').simulate('click');
  wrapper.find('#newTeam').simulate('click');
  wrapper
    .find('input')
    .simulate('change', { target: { value: TEST_TEAM_NAME } });
  wrapper.find('#save').simulate('click');

  // when the Save button is pressed, the team should be in the state as the last team
  const teams = state.getLocalState().teams;
  const newTeam = teams.slice(-1)[0];
  expect(newTeam).toBeTruthy();
  expect(newTeam.name).toEqual(TEST_TEAM_NAME);
  expect(newTeam.games.length).toEqual(0);

  return newTeam;
};

export const createGameUI = (wrapper, teamId) => {
  setRoute(`/teams`);
  wrapper.find(`#team-${teamId}`).simulate('click');
  wrapper.find('#newGame').simulate('click');
  wrapper
    .find('input#opponentName')
    .simulate('change', { target: { value: TEST_GAME_NAME } });
  wrapper.find('#lineupType').simulate('change', { target: { value: 1 } });
  wrapper.find('#save').simulate('click');

  // the last game in the list for this team should be the newly-created game
  const games = state.getTeam(teamId).games;
  const newGame = games.slice(-1)[0];
  expect(newGame).toBeTruthy();
  expect(newGame.opponent).toEqual(TEST_GAME_NAME);
  expect(newGame.lineupType).toEqual(1);

  return newGame;
};

describe('[UI] Create/Edit/Delete', () => {
  describe('Team', () => {
    // window.history.back does not work in enzyme, but it can be simulated by capturing
    // the goBack event and manually setting the route it would have gone to.
    beforeAll(() => {
      setOnGoBack(path => {
        setRoute(path);
      });
    });

    it('A user can create, edit, and delete a team', () => {
      const { wrapper } = getPageWrapper();
      const newTeam = createTeamUI(wrapper);
      wrapper.find(`#team-${newTeam.id}-edit`).simulate('click');
      wrapper.find(`#delete`).simulate('click');
      wrapper.find('#dialog-confirm').simulate('click');

      expect(state.getLocalState().teams.length).toEqual(0);
    });
  });

  describe('Game', () => {
    it('A user can create, edit, and delete a game', () => {
      const { wrapper } = getPageWrapper();
      const teamId = createTeamUI(wrapper).id;
      const newGame = createGameUI(wrapper, teamId);
      wrapper.find(`#game-${newGame.id}-edit`).simulate('click');
      wrapper.find(`#delete`).simulate('click');

      wrapper.find('#dialog-confirm').simulate('click');
      expect(state.getTeam(teamId).games.length).toEqual(0);
    });
  });

  describe('Lineup', () => {
    it('A user can create, edit, and delete a lineup', () => {
      const { wrapper } = getPageWrapper();
      const teamId = createTeamUI(wrapper).id;
      const gameId = createGameUI(wrapper, teamId).id;
      wrapper.find(`#game-${gameId}`).simulate('click');

      TEST_PLAYERS.forEach(playerName => {
        wrapper.find('#newPlayer').simulate('click');
        wrapper
          .find('input')
          .simulate('change', { target: { value: playerName } });

        // TODO click on the autosuggest instead of setting state here
        wrapper.find('#player-selection').setState({
          createNewPlayer: true,
        });
        wrapper.find('#submit').simulate('click');
      });

      const game = state.getGame(gameId);
      expect(game.lineup.length).toEqual(TEST_PLAYERS.length);

      // copy the lineup so that the state does not modify this version of it.
      const lineup = game.lineup.slice();

      lineup.forEach(playerId => {
        wrapper.find('#remove-' + playerId).simulate('click');
        wrapper.find('#dialog-confirm').simulate('click');
      });

      expect(state.getGame(gameId).lineup.length).toEqual(0);
    });
  });
});
