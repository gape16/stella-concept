const CACHE_NAME = 'stella-concept-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/services-travaux.html',
  '/services-transition.html',
  '/a-propos.html',
  '/faq.html',
  '/contact.html',
  '/reservation.html',
  '/calculateur.html',
  '/tarifs.html',
  '/zone-intervention.html',
  '/404.html',
  '/css/style.css',
  '/css/animations.css',
  '/js/main.js',
  '/js/animations.js',
  '/js/booking.js',
  '/js/parallax-steps.js',
  '/img/logotype_primaire.png',
  '/img/logotype_secondaire_blanc.png',
  '/img/favicon.svg',
  '/img/og-image.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy: always try fresh content, fallback to cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).then((response) => {
      if (e.request.method === 'GET' && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(e.request).then((cached) => {
        return cached || caches.match('/index.html');
      });
    })
  );
});
