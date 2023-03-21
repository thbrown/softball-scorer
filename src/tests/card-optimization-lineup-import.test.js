import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
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

  beforeAll(() => {
    state.setOffline();
    state.setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    window.scroll = () => void 0;
  });

  it('A user can import a lineup from a game through the player list editor', () => {
    const optimizationId = createOptimizationUI(wrapper).id;
    wrapper
      .find('#optimization-' + optimizationId)
      .hostNodes()
      .simulate('click');
    wrapper.find('#edit-players').hostNodes().simulate('click');
    wrapper.find('#import').hostNodes().simulate('click');
    wrapper
      .find('#list-' + TEAM_ID)
      .hostNodes()
      .simulate('click');
    wrapper
      .find('#list-' + GAME_ID)
      .hostNodes()
      .simulate('click');
    wrapper.find('#confirm').hostNodes().simulate('click');
    const { playerList, teamList } = state.getOptimization(optimizationId);
    expect(playerList.length).toEqual(10);
  });
});
