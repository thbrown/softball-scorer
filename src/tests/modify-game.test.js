import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import state from 'state';
import mockData from './mock.json';
import { createGameUI } from './create-edit-delete.test';
import { setRoute } from 'actions/route';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

const TEAM_ID = '4i7WarrEmtZMxJ';

const addPlateAppearance = (wrapper, gameId, playerIndex) => {
  const lineup = state.getGame(gameId).lineup;
  wrapper.find(`#newPa-${lineup[playerIndex]}`).simulate('click');
  wrapper.find('#result-Out').simulate('click');
  wrapper.find('#pa-confirm').simulate('click');

  const pas = state.getGame(gameId).plateAppearances;
  const pa = pas[pas.length - 1];
  expect(pa.player_id).toEqual(lineup[playerIndex]);
  expect(pa.result).toEqual('Out');
};

describe('[UI] Modify Game (add plate appearances)', () => {
  let wrapper = null;
  let teamId = TEAM_ID;
  let gameId = null;

  beforeAll(() => {
    state.setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    wrapper.find(`#teams`).simulate('click');
  });

  it('a user can navigate to a newly-created game', () => {
    const game = createGameUI(wrapper, teamId);
    gameId = game.id;
    wrapper.find(`#game-${gameId}`).simulate('click');
  });

  it('when a previous game exists, a lineup is populated after a game is created', () => {
    expect(state.getGame(gameId).lineup.length).toEqual(10);
  });

  it('a user can add a plate appearance', () => {
    const lineup = state.getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[0]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');

    const pa = state.getGame(gameId).plateAppearances[0];
    expect(pa.player_id).toEqual(lineup[0]);
    expect(pa.result).toEqual('Out');
  });

  it('pressing the back button in a plate appearance still saves it', () => {
    const lineup = state.getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[1]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#back-button').simulate('click');

    const pa = state.getGame(gameId).plateAppearances[1];
    expect(pa.player_id).toEqual(lineup[1]);
    expect(pa.result).toEqual('Out');
  });

  it('a user can edit a previous plate appearance', () => {
    const lineup = state.getGame(gameId).lineup;
    wrapper
      .find(`#pa-${state.getGame(gameId).plateAppearances[0].id}`)
      .simulate('click');
    wrapper.find('#result-1B').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');

    const pa = state.getGame(gameId).plateAppearances[0];
    expect(pa.player_id).toEqual(lineup[0]);
    expect(pa.result).toEqual('1B');
  });

  it('a user can delete a plate appearance', () => {
    wrapper
      .find(`#pa-${state.getGame(gameId).plateAppearances[1].id}`)
      .simulate('click');
    wrapper.find('#result-1B').simulate('click');
    wrapper.find('#pa-delete').simulate('click');
    wrapper.find('#dialog-confirm').simulate('click');

    expect(state.getGame(gameId).plateAppearances.length).toEqual(1);
  });

  it('a user can add 100 plate appearances', () => {
    for (let i = 0; i < 100; i++) {
      addPlateAppearance(wrapper, gameId, i % 10);
    }
  });
});
