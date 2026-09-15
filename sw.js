// HRMS service worker — makes the app installable. Network-first so data
// and code are always fresh; cached copies only serve when offline.
const CACHE = 'hrms-shell-v1';
const SHELL = ['./index.html', './assets/css/style.css', './assets/js/api.js', './assets/js/layout.js', './assets/js/config.js', './manifest.json', './icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never touch API calls or cross-origin requests (Shopify, CDN models).
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('api.php')) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
