// Manuara Reservas Service Worker v2
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `manuara-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `manuara-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `manuara-images-${CACHE_VERSION}`;

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Cache size limits
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 30;

// Helper to limit cache size
const limitCacheSize = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
};

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS).catch(err => {
          console.warn('[SW] Some precache assets failed:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => {
            return name.startsWith('manuara-') && 
                   name !== STATIC_CACHE && 
                   name !== DYNAMIC_CACHE && 
                   name !== IMAGE_CACHE;
          })
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with appropriate strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Firebase/external API calls (let them go to network)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('supabase')) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache the response
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache or offline page
          return caches.match(request)
            .then(cached => cached || caches.match('/'));
        })
    );
    return;
  }
  
  // Handle static assets (JS, CSS) - Cache First
  if (url.pathname.includes('/assets/') || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Return cached, but update in background
          fetch(request).then(response => {
            if (response.ok) {
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }
        
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Handle images - Cache First with size limit
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then(cache => {
              cache.put(request, clone);
              limitCacheSize(IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE);
            });
          }
          return response;
        }).catch(() => {
          // Return placeholder or nothing for failed images
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }
  
  // Handle fonts - Cache First
  if (request.destination === 'font') {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Default: Network First with dynamic cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, clone);
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});
