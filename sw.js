// YELLITAARE Thidé — Service Worker v1
var CACHE_NAME = 'yellitaare-v1';
var URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Outfit:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap'
];

// Installation : mettre en cache les fichiers essentiels
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : nettoyer les anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord, cache en fallback
self.addEventListener('fetch', function(event) {
  // Ignorer les requêtes non-GET et les requêtes vers Google
  if (event.request.method !== 'GET') return;
  if (event.request.url.indexOf('script.google.com') !== -1) return;
  if (event.request.url.indexOf('docs.google.com') !== -1) return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      // Mettre en cache la réponse fraîche
      if (response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // Hors-ligne : servir depuis le cache
      return caches.match(event.request).then(function(cached) {
        return cached || new Response('Hors-ligne — Veuillez vous reconnecter.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
