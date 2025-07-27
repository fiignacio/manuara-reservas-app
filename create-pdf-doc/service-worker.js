// Define un nombre para el caché actual
const CACHE_NAME = 'reservas-manuara-cache-v1';

// Lista de archivos que se deben cachear para que la app funcione offline
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@17/umd/react.development.js',
  'https://unpkg.com/react-dom@17/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Evento 'install': se dispara cuando el service worker se instala
self.addEventListener('install', event => {
  // Realiza las tareas de instalación
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        // Agrega todos los recursos especificados al caché
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': se dispara cada vez que la página solicita un recurso
self.addEventListener('fetch', event => {
  event.respondWith(
    // Busca el recurso en el caché primero
    caches.match(event.request)
      .then(response => {
        // Si se encuentra en caché, lo devuelve
        if (response) {
          return response;
        }
        // Si no, intenta obtenerlo de la red
        return fetch(event.request);
      }
    )
  );
});

// Evento 'activate': se dispara cuando el service worker se activa
// Se usa para limpiar cachés antiguos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Borra los cachés que no están en la lista blanca
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

