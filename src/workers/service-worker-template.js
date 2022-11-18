// The build process appends an autoGenCacheName variable to the top of this file based on the hash of the src and assets directory
let cacheName = 'softball-v1';
if (typeof autoGenCacheName !== undefined) {
  cacheName = autoGenCacheName;
}

self.addEventListener('install', function (event) {
  console.log('[ServiceWorker] Installing service worker');

  // Don't wait until all tabs are closed to activate a new service worker. Activate it right away. Event registered in the main-container will force a page refresh.
  self.skipWaiting();

  // Specify the resources that should be cached
  event.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll([
        '/',
        '/robots.txt',
        '/manifest.json',
        '/server/main.js',
        '/assets/alert.svg',
        '/assets/autotrack.js',
        '/assets/back.svg',
        '/assets/ballfield2.png',
        '/assets/baseball-hit.svg',
        '/assets/baseball-out.svg',
        '/assets/baseball.svg',
        '/assets/cancel.svg',
        '/assets/check.svg',
        '/assets/chevron-right.svg',
        '/assets/delete.svg',
        '/assets/edit.svg',
        '/assets/empty.svg',
        '/assets/help.svg',
        '/assets/home.svg',
        '/assets/icons/logo.svg',
        '/assets/icons/logo192.png',
        '/assets/icons/logo512.png',
        '/assets/link.svg',
        '/assets/main.css',
        '/assets/remove.svg',
        '/assets/spinner.gif',
        '/assets/scoreboard-webfont.woff',
        '/assets/scoreboard-webfont.woff2',
      ]);
    })
  );
});

self.addEventListener('fetch', function (event) {
  let requestToProcess = event.request;

  // If the url's path doesn't begin with 'server', it's an app url. Redirect it to / and the client code will handle it.
  // The service worker itself is an exception, it we served it under /server/service-worker.js it would not be able to
  // cache the request to the root '/' due to scoping. So we've put it under /service-worker.js.
  // robots.txt is also an exception
  var url = new URL(event.request.url);
  let pathArray = url.pathname ? url.pathname.split('/') : undefined;
  if (
    url.hostname === self.location.hostname &&
    (!pathArray ||
      pathArray.length < 2 ||
      (pathArray[1] !== 'server' &&
        pathArray[1] !== 'service-worker.js' &&
        pathArray[1] !== 'robots.txt' &&
        pathArray[1] !== 'manifest.json'))
  ) {
    console.log(`[ServiceWorker] redirecting ${event.request.url} to base url`);
    requestToProcess = new Request('/');
  }

  // Otherwise it's a server url.
  // First try to get resource out of the cache, if it's not there go to the network.
  event.respondWith(
    caches.match(requestToProcess).then(function (response) {
      console.log(
        `[ServiceWorker] cache request ${JSON.stringify(response, null, 2)}`
      );
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', function (event) {
  console.log(`[ServiceWorker] Activating service worker`);
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        // Delete old caches
        return Promise.all(
          cacheNames
            .filter(function (installedCacheName) {
              if (installedCacheName !== cacheName) {
                console.log(
                  `[ServiceWorker] Deleting cache ${installedCacheName} and replacing it with ${cacheName}`
                );
                return true;
              }
            })
            .map(function (cacheName) {
              return caches.delete(cacheName);
            })
        );
      })
      .then(function () {
        // Take control of any pages right away upon a new service worker's activation
        console.log('[ServiceWorker] Claiming clients for version', cacheName);
        self.clients.claim();
      })
  );
});
