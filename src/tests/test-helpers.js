import React from 'react';
import { mount } from 'enzyme';
import RouteContainer from 'elements/route-container';
import { ThemeProvider } from 'react-jss';
import css from 'css';
import MainContainer from 'main-container';
import routes from 'routes';

export const getPageWrapper = () => {
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
