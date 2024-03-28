import { it, describe, expect, beforeAll, afterEach } from 'vitest';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import { getGlobalState } from 'state';
import mockData from './mock.json';
import { createGameUI } from './create-edit-delete.test';
import { setRoute } from 'actions/route';
import SharedLib from 'shared-lib';

Enzyme.configure({ adapter: new Adapter() });

const TEAM_ID = '4i7WarrEmtZMxJ';

const addPlateAppearance = (wrapper, gameId, playerIndex) => {
  const lineup = getGlobalState().getGame(gameId).lineup;
  wrapper.find(`#newPa-${lineup[playerIndex]}`).simulate('click');
  wrapper.find('#result-Out').simulate('click');
  wrapper.find('#pa-confirm').simulate('click');
  wrapper.update();

  const pas = getGlobalState().getGame(gameId).plateAppearances;
  const pa = pas[pas.length - 1];
  expect(pa.playerId).toEqual(lineup[playerIndex]);
  expect(pa.result).toEqual('Out');
};

describe.only('[UI] Modify Game (add plate appearances)', () => {
  let wrapper = null;
  let teamId = TEAM_ID;

  beforeAll(() => {
    getGlobalState().setOffline();
    SharedLib.schemaMigration.updateSchema(null, mockData, 'client');
    getGlobalState().setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    setRoute(`/`);
    wrapper.find(`#teams`).hostNodes().simulate('click');
  });

  // This is undefined for some reason: wrapper.find(`#game-${gameId}`).hostNodes()
  // Possible update to Enzyme caused this.
  it.skip('a user can navigate to a newly-created game and add a plate appearance', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');
    expect(getGlobalState().getGame(gameId).lineup.length).toEqual(10);

    const lineup = getGlobalState().getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[0]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');

    const pa = getGlobalState().getGame(gameId).plateAppearances[0];
    expect(pa.playerId).toEqual(lineup[0]);
    expect(pa.result).toEqual('Out');
  });

  // Back button broke with update to Enzyme 3
  it.skip('pressing the back button in a plate appearance still saves it', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    const lineup = getGlobalState().getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[1]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#back-button').simulate('click');

    const pa = getGlobalState().getGame(gameId).plateAppearances[1];
    expect(pa.playerId).toEqual(lineup[1]);
    expect(pa.result).toEqual('Out');
  });

  // Something is happening where clicking 'pa-confirm' doesn't actually update the route
  // and re-render the page.  This is likely because it uses the goBack action of the
  // browser which isn't properly implemented in Enzyme
  it.skip('a user can edit a previous plate appearance', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    const lineup = getGlobalState().getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[0]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');
    wrapper.update();

    const pa = getGlobalState().getGame(gameId).plateAppearances[0];

    wrapper.find(`#pa-${pa.id}`).simulate('click');
    wrapper.find('#result-1B').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');

    const newPa = getGlobalState().getGame(gameId).plateAppearances[0];
    expect(newPa.playerId).toEqual(lineup[0]);
    expect(newPa.result).toEqual('1B');
  });

  // Something is happening where clicking 'pa-confirm' doesn't actually update the route
  // and re-render the page.  This is likely because it uses the goBack action of the
  // browser which isn't properly implemented in Enzyme
  it.skip('a user can delete a plate appearance', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    const lineup = getGlobalState().getGame(gameId).lineup;
    wrapper.find(`#newPa-${lineup[0]}`).simulate('click');
    wrapper.find('#result-Out').simulate('click');
    wrapper.find('#pa-confirm').simulate('click');
    wrapper.update();

    const pa = getGlobalState().getGame(gameId).plateAppearances[0];
    wrapper.find(`#pa-${pa.id}`).simulate('click');
    wrapper.find('#pa-delete').simulate('click');
    wrapper.find('#dialog-confirm').simulate('click');

    expect(getGlobalState().getGame(gameId).plateAppearances.length).toEqual(0);
  });

  // Something is happening where clicking 'pa-confirm' doesn't actually update the route
  // and re-render the page.  This is likely because it uses the goBack action of the
  // browser which isn't properly implemented in Enzyme
  it.skip('a user can add 100 plate appearances', () => {
    const game = createGameUI(wrapper, teamId);
    const gameId = game.id;
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');

    for (let i = 0; i < 100; i++) {
      addPlateAppearance(wrapper, gameId, i % 10);
    }
  });
});
