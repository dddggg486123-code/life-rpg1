const CACHE_NAME = 'life-rpg-v8';
const ASSETS = [
  './index.html',
  './css/pixel.css',
  './js/store.js',
  './js/character.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
];

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
    }).then(function() {
      // Force all clients to reload to get the latest version
      return self.clients.matchAll().then(function(clients) {
        return Promise.all(clients.map(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
          return client.navigate(client.url);
        }));
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    // Always try network first, bypassing HTTP cache to avoid stale CDN
    fetch(e.request, { cache: 'no-cache' }).then(function(response) {
      if (!response.ok) throw new Error('bad response');
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(e.request, clone);
      });
      return response;
    }).catch(function() {
      // Try current cache first
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        // Fallback: try any old cache
        return caches.keys().then(function(keys) {
          var oldChecks = keys.filter(function(k) { return k !== CACHE_NAME; })
                              .map(function(k) {
                                return caches.open(k).then(function(c) {
                                  return c.match(e.request);
                                });
                              });
          return Promise.all(oldChecks).then(function(results) {
            return results.find(function(r) { return r !== undefined; }) || new Response('Offline', { status: 503 });
          });
        });
      });
    })
  );
});
