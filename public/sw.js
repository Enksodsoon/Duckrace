// Duck Race Randomizer offline shell. Bump CACHE when the app shell changes.
const CACHE = 'duck-race-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];
const currentMatch = async request => (await caches.open(CACHE)).match(request);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        // Retain the previous release for still-open tabs and offline rollback.
        Promise.all(keys.filter((key) => key.startsWith('duck-race-') && key !== CACHE).slice(0, -1).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/release.json' || url.pathname === '/sw.js') return;

  // Navigations (including /?audience=1 share links): network first,
  // fall back to the cached app shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) return currentMatch('/index.html').then(hit => hit || response);
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put('/index.html', copy))
            .catch(() => {});
          return response;
        })
        .catch(() => currentMatch('/index.html').then((hit) => hit || currentMatch('/'))),
    );
    return;
  }

  // Versioned assets are immutable; old tabs never receive a newer model at an old URL.
  event.respondWith(
    currentMatch(request).then(async current => {
      const hit = current || (url.pathname.startsWith('/assets/') ? await caches.match(request) : undefined);
      if (hit) return hit;
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => hit);
      return network;
    }),
  );
});
