// sw.js - Service Worker para capacidad offline
const CACHE_NAME = 'calendario-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('🔄 Service Worker instalándose...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Todos los recursos cacheados');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Error en cache:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
  console.log('🎯 Service Worker activado');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker listo para controlar clientes');
      return self.clients.claim();
    })
  );
});

// Interceptar requests
self.addEventListener('fetch', function(event) {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') return;

  // Excluir requests al GAS (necesitan conexión)
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clonar el request porque es un stream y solo se puede usar una vez
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Verificar que la respuesta sea válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta porque es un stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(function() {
          // Fallback para páginas - devolver la página principal
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          
          // Para otros recursos, puedes devolver un fallback
          return new Response('Recurso no disponible en modo offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      }
    )
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Manejar sync en background (para futuras mejoras)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync ejecutándose');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Aquí se puede implementar sincronización en background
  console.log('🔄 Sincronizando en background...');
}
