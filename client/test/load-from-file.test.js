import { it, describe, beforeAll, afterEach } from 'vitest';
import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import { getGlobalState } from 'state';
import mockData from './mock.json';
import { setRoute } from 'actions/route';
import SharedLib from 'shared-lib';

Enzyme.configure({ adapter: new Adapter() });

describe('[UI] Load from file', () => {
  let wrapper = null;

  beforeAll(() => {
    getGlobalState().setOffline();
    SharedLib.schemaMigration.updateSchema(null, mockData, 'client');
    getGlobalState().setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    setRoute(`/`);
  });

  it('A user can import data', () => {
    const { wrapper } = getPageWrapper();
    wrapper.find(`#load`).hostNodes().simulate('click');
    wrapper.find(`#theirChoice`).hostNodes().simulate('click');
    SharedLib.schemaMigration.updateSchema(null, mockData, 'client');
    getGlobalState().setLocalState(mockData);
  });
});
