// The build process apends a autoGenCacheName variable to the top of this file based on the hash of the src and assets directory
let cacheName = 'softball-v1';
if (typeof autoGenCacheName !== 'undefined') {
    cacheName =  autoGenCacheName;
}

self.addEventListener('install', function(event) {
  console.log("Installing service worker");

  // Don't wait until all tabs are closed to activate a new service worker. Activate it right away. Event registered in the main-container will force a page refresh.
  self.skipWaiting(); 

  // Specify the resources that should be cached
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(
        [
          '/',
          '/assets/main.css',
          '/build/vendor.js',
          '/build/main.js',
          '/assets/check.svg',
          '/assets/back.svg',
          '/assets/edit.svg',
          '/assets/cancel.svg',
          '/assets/delete.svg',
          '/assets/drag-handle.png',
          '/assets/baseball-hit.svg',
          '/assets/baseball-out.svg',
          '/assets/ballfield2.png'
        ]
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Try to get resource out of the cache, if it's not there go to the network.
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log("Activating service worker");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      // Delete old caches
      return Promise.all(
        cacheNames.filter(function(installedCacheName) {
          if(installedCacheName !== cacheName) {
            console.log("Deleting cache " + installedCacheName + " and replacing it with " + cacheName);
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