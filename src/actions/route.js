import expose from 'expose';

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
  window.history.pushState({}, '', path);
}

export function goBack() {
  if (process.env.NODE_ENV !== 'test') {
    window.history.back();
  }
}
