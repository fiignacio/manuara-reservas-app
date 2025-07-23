
// Solo activar en producción
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const CACHE_NAME = 'manuara-reservas-v1';
  const urlsToCache = [
    '/',
    '/static/js/bundle.js',
    '/static/css/main.css',
    '/manifest.json'
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(urlsToCache))
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

    // Manejar otros recursos
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
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
