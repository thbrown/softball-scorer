import React from 'react';
import { mount } from 'enzyme';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { getPageWrapper } from './test-helpers';
import state from 'state';
import mockData from './mock.json';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

const TEST_TEAM_NAME = 'Test Team';
const TEST_GAME_NAME = 'Test Opponent';

describe('[UI] Load from file', () => {
  it('A user can import data', () => {
    const { wrapper, getRouteProps } = getPageWrapper();
    wrapper.find(`#load`).simulate('click');
    wrapper.find(`#overwriteChoice`).simulate('click');
    state.setLocalState(mockData);
  });
});
