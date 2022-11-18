import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import state from 'state';
import { setRoute } from 'actions/route';
import mockData from './mock.json';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

describe('[UI] Game Stats', () => {
  let wrapper = null;

  beforeAll(() => {
    state.setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    setRoute(`/`);
  });

  it('A user can access the game stats card from the plate appearance list', () => {
    const teamId = '4i7WarrEmtZMxJ';
    const gameId = '1';

    wrapper.find(`#teams`).hostNodes().simulate('click');
    wrapper.find(`#team-${teamId}`).hostNodes().simulate('click');
    wrapper.find(`#game-${gameId}`).hostNodes().simulate('click');
    wrapper.find(`#view-stats`).hostNodes().simulate('click');

    expect(wrapper.find({ children: 'Game Stats' })).toExist();
  });
});
