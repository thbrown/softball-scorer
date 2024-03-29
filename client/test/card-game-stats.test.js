import {
  it,
  describe,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vitest,
} from 'vitest';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import { getGlobalState } from 'state';
import { setRoute } from 'actions/route';
import mockData from './mock.json';
import SharedLib from 'shared-lib';

Enzyme.configure({ adapter: new Adapter() });

describe('[UI] Game Stats', () => {
  let wrapper = null;
  let _isSessionValid = getGlobalState().isSessionValid;

  beforeAll(() => {
    getGlobalState().setOffline();
    SharedLib.schemaMigration.updateSchema(null, mockData, 'client');
    getGlobalState().setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    setRoute(`/`);
  });

  beforeEach(() => {
    getGlobalState().isSessionValid = vitest.fn().mockImplementation(() => {
      return true;
    });
  });

  afterEach(() => {
    getGlobalState().isSessionValid = _isSessionValid;
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

    expect(Boolean(wrapper.find('input#publicIdEnabled'))).toBeTruthy();
  });
});
