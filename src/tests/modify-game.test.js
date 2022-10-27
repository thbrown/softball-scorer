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
  wrapper.update();

  const pas = state.getGame(gameId).plateAppearances;
  const pa = pas[pas.length - 1];
  expect(pa.playerId).toEqual(lineup[playerIndex]);
  expect(pa.result).toEqual('Out');
};

describe('[UI] Modify Game (add plate appearances)', () => {
  let wrapper = null;
  let teamId = TEAM_ID;

  beforeAll(() => {
    state.setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    wrapper.find(`#teams`).hostNodes().simulate('click');
  });

  it('a user can navigate to a newly-created game and add a plate appearance', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');
    expect(state.getGame(gameId).lineup.length).toEqual(10);

    const lineup = state.getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[0]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');

    const pa = state.getGame(gameId).plateAppearances[0];
    expect(pa.playerId).toEqual(lineup[0]);
    expect(pa.result).toEqual('Out');
  });

  // Back button broke with update to Enzyme 3
  it.skip('pressing the back button in a plate appearance still saves it', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    const lineup = state.getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[1]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#back-button').simulate('click');

    const pa = state.getGame(gameId).plateAppearances[1];
    expect(pa.playerId).toEqual(lineup[1]);
    expect(pa.result).toEqual('Out');
  });

  it('a user can edit a previous plate appearance', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    const lineup = state.getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[0]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');
    wrapper.update();

    const pa = state.getGame(gameId).plateAppearances[0];
    wrapper.find(`#pa-${pa.id}`).simulate('click');
    wrapper.find('#result-1B').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');

    const newPa = state.getGame(gameId).plateAppearances[0];
    expect(newPa.playerId).toEqual(lineup[0]);
    expect(newPa.result).toEqual('1B');
  });

  it('a user can delete a plate appearance', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    const lineup = state.getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[0]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');
    wrapper.update();

    const pa = state.getGame(gameId).plateAppearances[0];
    wrapper.find(`#pa-${pa.id}`).simulate('click');
    wrapper.find('#pa-delete').simulate('click');
    wrapper.find('#dialog-confirm').simulate('click');

    expect(state.getGame(gameId).plateAppearances.length).toEqual(0);
  });

  it('a user can add 100 plate appearances', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    for (let i = 0; i < 100; i++) {
      addPlateAppearance(wrapper, gameId, i % 10);
    }
  });
});
