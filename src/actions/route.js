import expose from 'expose';

export function setRoute(path, routeId) {
  if (path !== window?.location?.pathname) {
    window.history.pushState({}, '', path);
  }
  expose.set_state('router' + (routeId || ''), {
    path,
  });
}
