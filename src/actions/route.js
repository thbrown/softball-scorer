import expose from 'expose';

const urlStack = ['/'];
let onGoBack = () => {};

window.onpopstate = function() {
  setRoute(window?.location?.pathname);
};

export function setRoute(path, routeId) {
  if (path !== window?.location?.pathname) {
    setUrl(path);
  }
  expose.set_state('router' + (routeId || ''), {
    path,
  });
}

export function setUrl(path) {
  urlStack.unshift(path);
  window.history.pushState({}, '', path);
}

export function goBack() {
  urlStack.shift();
  onGoBack(urlStack[0]);
  if (process.env.NODE_ENV !== 'test') {
    window.history.back();
  }
}

export function goHome() {
  setRoute('/');
}

export function setOnGoBack(cb) {
  onGoBack = cb;
}
