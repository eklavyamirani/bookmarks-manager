const CACHE_NAME = 'bookmark-manager-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - Cache First Strategy for app shell and Network First for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with Network First strategy
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If we got a response, clone it and put it in the cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(request);
        })
    );
  } else {
    // For app shell resources, use Cache First strategy
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // Return cached version or fetch from network
          return response || fetch(request)
            .then((fetchResponse) => {
              // Check if we received a valid response
              if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                return fetchResponse;
              }

              // Clone the response
              const responseToCache = fetchResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return fetchResponse;
            });
        })
        .catch(() => {
          // If both cache and network fail, return a fallback
          if (request.destination === 'document') {
            return caches.match('/');
          }
        })
    );
  }
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});