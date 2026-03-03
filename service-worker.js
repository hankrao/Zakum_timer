/* Service Worker (new method) for the OLD tool */
const CACHE_VERSION = 'v2.0.0-oldtool';
const STATIC_CACHE = `oldtool-static-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './offline.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    for (const url of STATIC_ASSETS) {
      try { await cache.add(url); } catch (e) {}
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const accept = req.headers.get('accept') || '';

  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put('./', fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match('./index.html'))
            || (await caches.match('./offline.html'))
            || new Response('離線狀態，且尚未快取頁面。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return new Response('離線資源不可用', { status: 504 });
    }
  })());
});
