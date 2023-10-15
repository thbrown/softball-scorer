import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import { getGlobalState } from 'state';
import { setRoute } from 'actions/route';
import mockData from './mock.json';
import SharedLib from 'shared-lib';

Enzyme.configure({ adapter: new Adapter() });

describe('[UI] Spray', () => {
  let wrapper = null;

  beforeAll(() => {
    getGlobalState().setOffline();
    SharedLib.schemaMigration.updateSchema(null, mockData, 'client');
    getGlobalState().setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    setRoute(`/`);
  });

  it('A user can access a spray chart from the players list', () => {
    wrapper.find(`#players`).hostNodes().simulate('click');
    wrapper.find(`#player-1ajppp381cecS7`).hostNodes().simulate('click');
    expect(wrapper.exists('#spray-field')).toEqual(true);
  });

  it('A user can click a plate appearance to see a tooltip bubble', () => {
    wrapper.find(`#pa-39AND6zg8BSTB6`).simulate('click');
    expect(wrapper.exists('#spray-tooltip')).toEqual(true);
  });

  it('A user can remove a tooltip by clicking on the field', () => {
    wrapper.find(`#spray-field`).simulate('click');
    expect(wrapper.exists('#spray-tooltip')).toEqual(false);
  });

  it('A user can click a tooltip while another tooltip is active', () => {
    wrapper.find(`#pa-39AND6zg8BSTB6`).simulate('click');
    expect(wrapper.exists('#spray-tooltip')).toEqual(true);
    wrapper.find(`#pa-1asNvNz984Ec4f`).simulate('click');
    expect(wrapper.exists('#spray-tooltip')).toEqual(true);
  });

  it('A user can click filter through plate appearances', () => {
    wrapper.find(`#filter-hits`).simulate('click');
    wrapper.find(`#filter-outs`).simulate('click');
    wrapper.find(`#filter-extra-hits`).simulate('click');
    wrapper.find(`#filter-past3`).simulate('click');
    wrapper.find(`#filter-past5`).simulate('click');
    wrapper.find(`#filter-past10`).simulate('click');
    expect(wrapper.exists('#pa-39AND6zg8BSTB6')).toEqual(false);
    expect(wrapper.exists('#pa-12P8g5t4CwcxBD')).toEqual(true);
  });
});
