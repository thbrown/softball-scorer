import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { getPageWrapper } from './test-helpers';
import state from 'state';
import { setRoute } from 'actions/route';
import mockData from './mock.json';
import SharedLib from 'shared-lib';

Enzyme.configure({ adapter: new Adapter() });

describe('[UI] Card Player Edit', () => {
  let wrapper = null;

  beforeAll(async () => {
    state.setOffline();
    SharedLib.schemaMigration.updateSchema(null, mockData, 'client');
    await state.setLocalState(mockData);
    const { wrapper: localWrapper } = getPageWrapper();
    wrapper = localWrapper;
    setRoute(`/`);
  });

  it('Can edit a player even if no song start time is specified', () => {
    const playerId = '3XcBG4OeaNrgHs';
    const newName = 'NewName';

    wrapper.find(`#players`).hostNodes().simulate('click');
    wrapper.find(`#player-${playerId}-edit`).hostNodes().simulate('click');
    wrapper
      .find(`#playerName`)
      .hostNodes()
      .simulate('change', { target: { value: newName } });
    wrapper.find(`#save`).hostNodes().simulate('click');

    expect(state.getPlayer(playerId).name).toEqual(newName);
    expect(1).toEqual(1);
  });
});
