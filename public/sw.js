
// Solo activar en producción
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const CACHE_NAME = 'manuara-reservas-v1';
  const urlsToCache = [
    '/',
    '/manifest.json'
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          // Intentar cachear URLs base, ignorar errores en archivos específicos
          return cache.addAll(urlsToCache).catch((error) => {
            console.warn('Some cache resources failed to load:', error);
            // Cachear individualmente los que sí existen
            return Promise.all(
              urlsToCache.map(url => 
                cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
              )
            );
          });
        })
    );
  });

  self.addEventListener('fetch', (event) => {
    // Solo manejar requests de navegación en producción
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            return caches.match('/') || fetch('/');
          })
      );
      return;
    }

    // Manejar otros recursos con estrategia cache-first para assets estáticos
    if (event.request.url.includes('/assets/') || event.request.url.includes('.js') || event.request.url.includes('.css')) {
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            return fetch(event.request).then((fetchResponse) => {
              // Cachear la respuesta si es exitosa
              if (fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return fetchResponse;
            });
          })
      );
      return;
    }

    // Para otras requests, usar network-first
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  });

  self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  });
}
