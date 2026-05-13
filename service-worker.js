const CACHE_NAME = 'life-rpg-v10';
const ASSETS = [
  './',
  './index.html',
  './css/pixel.css',
  './js/store.js',
  './js/character.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './.spa',
];

// Static file extensions that are safe to serve cache-first
function isStaticAsset(url) {
  return /\.(css|js|png|svg|json|ico)$/.test(url) || url.endsWith('/');
}

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.warn('Precache failed, continuing:', err);
      });
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
  self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
    });
  });
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // For static assets: cache-first (fast, offline-ready)
  if (isStaticAsset(e.request.url)) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        // Update cache in background
        var fetchPromise = fetch(e.request, { cache: 'no-cache' }).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {});
        return cached || fetchPromise;
      })
    );
    return;
  }

  // For HTML/dynamic: network-first with cache fallback
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(function(response) {
      if (!response.ok) throw new Error('bad response');
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(e.request, clone);
      });
      return response;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        // Ultimate fallback: serve index.html (SPA)
        return caches.match('./index.html') || new Response('Offline', { status: 503 });
      });
    })
  );
});
