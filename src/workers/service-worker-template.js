// The build process appends a autoGenCacheName variable to the top of this file based on the hash of the src and assets directory
let cacheName = 'softball-v1';
if (typeof autoGenCacheName !== 'undefined') {
    cacheName =  autoGenCacheName;
}

self.addEventListener('install', function(event) {
  console.log('[ServiceWorker] Installing service worker');

  // Don't wait until all tabs are closed to activate a new service worker. Activate it right away. Event registered in the main-container will force a page refresh.
  self.skipWaiting(); 

  // Specify the resources that should be cached
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(
        [
          '/',
          '/server/build/vendor.js',
          '/server/build/main.js',
          '/server/assets/main.css',
          '/server/assets/check.svg',
          '/server/assets/back.svg',
          '/server/assets/edit.svg',
          '/server/assets/cancel.svg',
          '/server/assets/delete.svg',
          '/server/assets/drag-handle.png',
          '/server/assets/baseball-hit.svg',
          '/server/assets/baseball-out.svg',
          '/server/assets/baseball.svg',
          '/server/assets/ballfield2.png',
          '/server/assets/spinner.gif',
          '/server/simulation-worker'
        ]
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  let requestToProcess = event.request;
  
  // If the url's path doesn't begin with 'server', it's a app url. Redirect it to / and the client code will handle it.
  // The service worker itself is an exception, it we served it under /server/service-worker it would not be able to 
  // cache the request to the root '/' due to scoping. So we've put it under /service-worker.
  var url = new URL(event.request.url);
  let pathArray = url.pathname ? url.pathname.split('/') : undefined;
  if(url.hostname === self.location.hostname && (!pathArray || pathArray.length < 2 || (pathArray[1] !== 'server' && pathArray[1] !== 'service-worker'))) {
    console.log(`[ServiceWorker] redirecting ${event.request.url} to base url`);
    requestToProcess = new Request('/');
  }

  // Otherwise it's a server url. 
  // First try to get resource out of the cache, if it's not there go to the network. 
  event.respondWith(
    caches.match(requestToProcess).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log(`[ServiceWorker] Activating service worker`);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      // Delete old caches
      return Promise.all(
        cacheNames.filter(function(installedCacheName) {
          if(installedCacheName !== cacheName) {
            console.log(`[ServiceWorker] Deleting cache ${installedCacheName} and replacing it with ${cacheName}`);
            return true;
          }
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // Take control of any pages right away upon a new service worker's activation
      console.log('[ServiceWorker] Claiming clients for version', cacheName);
      self.clients.claim();
    })
  );
});