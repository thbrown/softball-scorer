import React from 'react';
import expose from 'expose';

export function routeMatches(url, path, state) {
  // Remove any url params so they don't affect the matching
  url = url.split('?')[0];

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

  const notFound = routes['/not-found'];
  if (notFound) {
    console.warn('Route not found: ' + url);
    return {
      state: {},
      renderRouteComponent: notFound,
    };
  }
  return {};
}

export default class RouteContainer extends expose.Component {
  constructor(props) {
    super(props);
    this.state = {
      path: window?.location?.pathname || '/',
    };
    this.exposeOverwrite('router' + this.props.routeId);
  }

  render() {
    const { routes, ...props } = this.props;
    const { state, renderRouteComponent } = getRouteState(
      this.state.path,
      this.props.routes
    );
    const search = window?.location?.search?.slice(1);
    const routeProps = {
      page: this.state.path,
      renderRouteComponent,
      ...state,
      search: search
        ? search.split('&').reduce((ret, keyValPair) => {
            let [key, value] = keyValPair.split('=');
            if (value === 'true') {
              value = true;
            } else if (value === 'false') {
              value = false;
            }
            ret[key] = value;
            return ret;
          }, {})
        : {},
    };
    return <>{this.props.children({ ...props, ...routeProps })}</>;
  }
}

RouteContainer.defaultProps = {
  routes: {},
  routeId: '',
};
