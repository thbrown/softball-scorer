import React from 'react';
import { mount } from 'enzyme';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

import css from 'css';
import MainContainer from 'main-container';
import routes from 'routes';
import RouteContainer from 'elements/route-container';
import { ThemeProvider } from 'react-jss';
import state from 'state';
import { setRoute } from 'actions/route';

Enzyme.configure({ adapter: new Adapter() });
state.setOffline();

const TEST_TEAM_NAME = 'Test Team';

// Because the wrapper is looking at the RouteContainer as a parent component, it only
// updates when that component remounts so you need to setState whenever routing
// from a test case.
const setRouteTest = (wrapper, route) => {
  setRoute('/teams');
  wrapper.setState({});
};

const getWrapper = () => {
  let publicRouteProps = {};
  return {
    wrapper: mount(
      <RouteContainer routes={routes}>
        {routeProps => {
          publicRouteProps = routeProps;
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
    ),
    getRouteProps: () => {
      return publicRouteProps;
    },
  };
};

describe('[E2E] Creating and editing a team', () => {
  it('A user can create a new team with a test team name', () => {
    const { wrapper, getRouteProps } = getWrapper();
    wrapper.find('#teams').simulate('click');
    expect(wrapper.find('#teamlist').children.length).toEqual(1);
    wrapper.find('#newteam').simulate('click');
    wrapper
      .find('input')
      .simulate('change', { target: { value: TEST_TEAM_NAME } });
    wrapper.find('#save').simulate('click');

    const teams = state.getLocalState().teams;
    const newTeam = teams.slice(-1)[0];
    console.log('NEW TEAM', newTeam);
    expect(newTeam).toBeTruthy();
    expect(newTeam.name).toEqual(TEST_TEAM_NAME);
    expect(newTeam.games.length).toEqual(0);

    // enzyme does not simulate window.location.back(), so if your component relies on that,
    // you need to manually set the route here
    setRouteTest(wrapper, '/teams');

    wrapper.find(`#team-${newTeam.id}-edit`).simulate('click');
    console.log(wrapper.debug());
    wrapper.find(`#delete`).simulate('click');
    wrapper.find('.confirm-button').simulate('click');
  });
});
