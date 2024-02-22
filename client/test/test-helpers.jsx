import React from 'react';
import { mount } from 'enzyme';
import RouteContainer from 'elements/route-container';
import MainContainer from 'main-container';
import routes from 'routes';

export const getPageWrapper = () => {
  let publicRouteProps = {};
  return {
    wrapper: mount(
      <RouteContainer routes={routes}>
        {(routeProps) => {
          publicRouteProps = routeProps;
          return (
            <MainContainer
              test={true}
              main={{}}
              data={{}}
              loading={false}
              {...routeProps}
            />
          );
        }}
      </RouteContainer>
    ),
    getRouteProps: () => {
      return publicRouteProps;
    },
  };
};
