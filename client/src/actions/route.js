import expose from 'expose';
import { ROUTE_PREFIX } from 'routes';

const urlStack = ['/'];
let onGoBack = () => {};

window.onpopstate = function () {
  setRoute(window?.location?.pathname);
};

export function setRoute(path, skipHistory) {
  if (path !== window?.location?.pathname) {
    if (skipHistory) {
      setUrl(ROUTE_PREFIX + path, true);
    } else {
      setUrl(ROUTE_PREFIX + path);
    }
  }
  expose.set_state('router', {
    path: ROUTE_PREFIX + path,
  });
}

export function setUrl(path, skipHistory) {
  if (skipHistory) {
    window.history.replaceState({}, '', path);
  } else {
    urlStack.unshift(path);
    window.history.pushState({}, '', path);
  }
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
