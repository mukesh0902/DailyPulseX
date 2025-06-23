const CACHE_NAME = 'dailypulsex-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/static/style.css',
  '/static/manifest.json',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install event - Cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - Serve cached content when offline
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) &&
    !event.request.url.startsWith('https://cdn.jsdelivr.net') &&
    !event.request.url.startsWith('https://cdnjs.cloudflare.com')) {
    return;
  }

  // For GET requests only
  if (event.request.method !== 'GET') {
    return;
  }

  // For HTML pages - network first, then cache
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the latest version
          let responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, use cache
          return caches.match(event.request)
            .then(response => {
              return response || caches.match('/');
            });
        })
    );
    return;
  }

  // For all other requests - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            // Cache the response
            let responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // Return the offline page for image requests
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/static/images/offline.png');
            }
          });
      })
  );
});

// Cache news API responses
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_NEWS') {
    const articles = event.data.articles;

    caches.open('news-cache').then(cache => {
      // Store article data with timestamp
      const timestamp = Date.now();
      const cacheData = {
        articles: articles,
        timestamp: timestamp
      };

      cache.put('cached-news', new Response(
        JSON.stringify(cacheData),
        { headers: { 'Content-Type': 'application/json' } }
      ));
    });
  }
}); 