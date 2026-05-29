var CACHE_NAME = 'todolist-v5';
var ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Pass Supabase API calls through directly, don't cache
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first strategy: always try network, fall back to cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Network succeeded — update cache in background for offline use
      if (response.ok && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Network failed (offline) — serve from cache
      return caches.match(event.request);
    })
  );
});
