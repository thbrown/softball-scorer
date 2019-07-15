import React from 'react';

export function routeMatches(url, path, state) {
  const urlArray = url.split('/');
  const pathArray = path.split('/');
  const pathVariables = {};
  if (pathArray.length !== urlArray.length) {
    return false;
  }
  for (let i = 1; i < pathArray.length; i++) {
    if (pathArray[i].length > 0 && pathArray[i][0] === ':') {
      pathVariables[pathArray[i].substring(1)] = urlArray[i];
    } else if (urlArray[i] !== pathArray[i]) {
      return false;
    }
  }

  const pathVarKeys = Object.keys(pathVariables);
  for (let i = 0; i < pathVarKeys.length; i++) {
    state[pathVarKeys[i]] = pathVariables[pathVarKeys[i]];
  }
  return true;
}

export function getRouteState(url, routes) {
  for (let routeName in routes) {
    const state = {};
    const doesMatch = routeMatches(url, routeName, state);
    if (doesMatch) {
      return {
        state,
        renderRouteComponent: routes[routeName],
      };
    }
  }
  return {};
}

const RouterContainer = ({ children, routes, ...props }) => {
  const { state, renderRouteComponent } = getRouteState(
    window.location.pathname,
    routes
  );
  const routeProps = {
    page: window.location.pathname,
    renderRouteComponent,
    ...state,
  };
  return <>{children({ ...props, ...routeProps })}</>;
};

export default RouterContainer;
