import React from 'react';
import expose from 'expose';

interface RouteState {
  [key: string]: unknown;
}

type RouteComponent = React.ComponentType<Record<string, unknown>>;

export function routeMatches(url: string, path: string, state: RouteState): boolean {
  // Remove any url params so they don't affect the matching
  url = url.split('?')[0];

  const urlArray = url.split('/');
  const pathArray = path.split('/');
  const pathVariables: Record<string, string> = {};

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

interface RouteResult {
  state?: RouteState;
  renderRouteComponent?: RouteComponent;
}

export function getRouteState(url: string, routes: Record<string, RouteComponent>): RouteResult {
  for (let routeName in routes) {
    const state: RouteState = {};
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

interface RouteContainerProps {
  routes?: Record<string, RouteComponent>;
  routeId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (props: any) => React.ReactNode;
  [key: string]: unknown;
}

interface RouteContainerState {
  path: string;
}

export default class RouteContainer extends expose.Component<RouteContainerProps, RouteContainerState> {
  constructor(props: RouteContainerProps) {
    super(props);
    this.state = {
      path: window?.location?.pathname || '/',
    };
    this.exposeOverwrite('router' + (this.props.routeId ?? ''));
  }

  render() {
    const { routes, ...props } = this.props;
    const { state, renderRouteComponent } = getRouteState(
      this.state.path,
      this.props.routes ?? {}
    );
    const search = window?.location?.search?.slice(1);
    const routeProps = {
      page: this.state.path,
      renderRouteComponent,
      ...state,
      search: search
        ? search.split('&').reduce((ret: Record<string, string | boolean>, keyValPair: string) => {
            let [key, value]: [string, string | boolean] = keyValPair.split('=') as [string, string];
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
