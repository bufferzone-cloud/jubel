const CACHE_NAME = 'jubel-driver-v1.2';
const urlsToCache = [
  '/jubel/',
  '/jubel/index.html',
  '/jubel/driver.html',
  '/jubel/jubel.png',
  '/jubel/driver.js',
  '/jubel/driver.json',
  'https://bufferzone-cloud.github.io/jubel/index.html'
];

self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('All resources cached successfully');
            return self.skipWaiting(); // Force activation
          })
          .catch(error => {
            console.log('Cache addAll failed:', error);
          });
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim(); // Take control of all pages
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('bufferzone-cloud.github.io/jubel')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Not in cache - fetch from network
        console.log('Fetching from network:', event.request.url);
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
                console.log('Cached new resource:', event.request.url);
              });

            return networkResponse;
          })
          .catch(function(error) {
            console.log('Fetch failed, returning offline page:', error);
            // If both cache and network fail, you could return a custom offline page
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push notifications (if needed in future)
self.addEventListener('push', function(event) {
  console.log('Push message received', event);
  
  const title = 'Jubel Driver';
  const options = {
    body: 'You have a new ride request!',
    icon: 'jubel.png',
    badge: 'jubel.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/jubel/index.html');
      }
    })
  );
});
