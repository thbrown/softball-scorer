import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { getPageWrapper } from './test-helpers';
import state from 'state';
import mockData from './mock.json';
import { createOptimizationUI } from './create-edit-delete.test';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

const TEAM_ID = '4i7WarrEmtZMxJ';
const GAME_ID = '1';

describe('[UI] Optimization', () => {
  let wrapper = null;
  let optimizationId = null;

  beforeAll(() => {
    state.setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    optimizationId = createOptimizationUI(wrapper).id;
  });

  it('A user can access navigate to the optimization player select card', () => {
    wrapper.find('#optimization-' + optimizationId).simulate('click');
    wrapper.find('#edit-players').simulate('click');
    wrapper.find('#import').simulate('click');
  });

  it('A user can import a lineup from a game through the player list editor', () => {
    wrapper.find('#list-' + TEAM_ID).simulate('click');
    wrapper.find('#list-' + GAME_ID).simulate('click');
    wrapper.find('#confirm').simulate('click');
    const { playerList, teamList } = state.getOptimization(optimizationId);
    expect(JSON.parse(playerList).length).toEqual(10);
    expect(JSON.parse(teamList).length).toEqual(1);
    expect(JSON.parse(teamList)[0]).toEqual(TEAM_ID);
  });
});
