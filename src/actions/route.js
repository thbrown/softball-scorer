import expose from 'expose';
import { ROUTE_PREFIX } from 'routes';

const urlStack = ['/'];
let onGoBack = () => {};

window.onpopstate = function () {
  setRoute(window?.location?.pathname);
};

export function setRoute(path, routeId) {
  if (path !== window?.location?.pathname) {
    setUrl(ROUTE_PREFIX + path);
  }
  expose.set_state('router' + (routeId || ''), {
    path: ROUTE_PREFIX + path,
  });
}

export function setUrl(path) {
  urlStack.unshift(path);
  window.history.pushState({}, '', path);
}

export function goBack(amount) {
  amount = amount ? -Math.abs(amount) : -1;
  for (let i = 0; i < Math.abs(amount); i++) {
    urlStack.shift();
    onGoBack(urlStack[0]);
  }
  window.history.go(amount);
}

export function goHome() {
  setRoute('/');
}

export function setOnGoBack(cb) {
  onGoBack = cb;
}
