const CACHE_NAME = 'jubel-driver-app-v1.0';
const urlsToCache = [
  './',
  './index.html',
  './driver.html',
  './jubel-driver.png',
  './driver-sw.js',
  './driver-manifest.json'
];

self.addEventListener('install', function(event) {
  console.log('Jubel DRIVER Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened DRIVER app cache');
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('All DRIVER app resources cached successfully');
            return self.skipWaiting();
          })
          .catch(error => {
            console.log('DRIVER app cache addAll failed:', error);
          });
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('Jubel DRIVER Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete any caches that aren't the current DRIVER app cache
          if (cacheName !== CACHE_NAME && cacheName.includes('jubel-driver')) {
            console.log('Deleting old DRIVER app cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Jubel DRIVER Service Worker activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Only handle requests for the driver app domain
  if (event.request.url.includes('jubel-driver')) {
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Not in cache - fetch from network
          return fetch(event.request)
            .then(function(networkResponse) {
              // Check if we received a valid response
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }

              // Clone the response
              const responseToCache = networkResponse.clone();

              // Add to cache for future visits
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });

              return networkResponse;
            })
            .catch(function(error) {
              console.log('DRIVER app fetch failed:', error);
            });
        })
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push notifications for driver app
self.addEventListener('push', function(event) {
  console.log('Push message received for DRIVER app', event);
  
  const title = 'Jubel Driver';
  const options = {
    body: 'New ride request available!',
    icon: 'jubel.png',
    badge: 'jubel.png',
    vibrate: [100, 50, 100],
    data: {
      url: 'https://bufferzone-cloud.github.io/jubel/driver.html'
    },
    tag: 'ride-request',
    actions: [
      {
        action: 'accept',
        title: 'Accept Ride'
      },
      {
        action: 'decline', 
        title: 'Decline'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks for driver app
self.addEventListener('notificationclick', function(event) {
  console.log('DRIVER app notification click received');
  
  event.notification.close();
  
  if (event.action === 'accept') {
    // Handle ride acceptance
    console.log('Ride accepted');
  } else if (event.action === 'decline') {
    // Handle ride decline
    console.log('Ride declined');
  }
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      for (let client of clientList) {
        if (client.url.includes('jubel-driver') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://bufferzone-cloud.github.io/jubel/driver.html');
      }
    })
  );
});
