import React from 'react';
import { mount } from 'enzyme';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

import css from 'css';
import MainContainer from 'main-container';
import routes from 'routes';
import RouteContainer from 'elements/route-container';
import { ThemeProvider } from 'react-jss';

Enzyme.configure({ adapter: new Adapter() });

const TEST_TEAM_NAME = 'Test Team';

const getWrapper = () => {
  return mount(
    <RouteContainer routes={routes}>
      {routeProps => {
        console.log('ROUTE PROPS', routeProps.page);
        return (
          <ThemeProvider theme={css}>
            <MainContainer
              test={true}
              main={{}}
              data={{}}
              loading={false}
              {...routeProps}
            />
          </ThemeProvider>
        );
      }}
    </RouteContainer>
  );
};

describe('[E2E] Scoring a game', () => {
  it('A user can create a new team with a test team name', () => {
    const wrapper = getWrapper();

    wrapper.find('#teams').simulate('click');
    expect(wrapper.find('#teamlist').children.length).toEqual(1);
    wrapper.find('#newteam').simulate('click');
    wrapper
      .find('input')
      .simulate('change', { target: { value: TEST_TEAM_NAME } });
    console.log('WRAPPER', wrapper);
  });
});
