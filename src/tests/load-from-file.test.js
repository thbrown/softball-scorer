import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import state from 'state';
import mockData from './mock.json';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

describe('[UI] Load from file', () => {
  it('A user can import data', () => {
    const { wrapper } = getPageWrapper();
    wrapper.find(`#load`).simulate('click');
    wrapper.find(`#overwriteChoice`).simulate('click');
    state.setLocalState(mockData);
  });
});
