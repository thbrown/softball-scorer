import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import state from 'state';
import { setRoute } from 'actions/route';
import mockData from './mock.json';
import SharedLib from 'shared-lib';

Enzyme.configure({ adapter: new Adapter() });

describe('[UI] Game Stats', () => {
  let wrapper = null;
  let _isSessionValid = state.isSessionValid;

  beforeAll(async () => {
    state.setOffline();
    SharedLib.schemaMigration.updateSchema(null, mockData, 'client');
    await state.setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    setRoute(`/`);
  });

  beforeEach(() => {
    state.isSessionValid = jest.fn().mockImplementation(() => {
      return true;
    });
  });

  afterEach(() => {
    state.isSessionValid = _isSessionValid;
  });

  it('A user can navigate to the share page for a specific team team', () => {
    const teamId = '4i7WarrEmtZMxJ';
    const gameId = '1';

    wrapper.find(`#teams`).hostNodes().simulate('click');
    wrapper.find(`#team-${teamId}`).hostNodes().simulate('click');
    wrapper
      .findWhere((node) => {
        return node.type() && node.name() && node.text() === 'Stats';
      })
      .hostNodes()
      .simulate('click');
    wrapper
      .findWhere((node) => {
        return node.type() && node.name() && node.text() === 'Sharing';
      })
      .hostNodes()
      .simulate('click');

    expect(wrapper.find('input#publicIdEnabled')).toExist();
  });
});
