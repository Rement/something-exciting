const CACHE = 'birthday-reveal-v15';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/scratch.js',
  '/modal.js',
  '/countdown.js',
  '/admin.js',
  '/api.js',
  '/time.js',
  '/manifest.webmanifest',
];

// SPA routes that should serve index.html
const SPA_ROUTES = ['/admin'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip cross-origin requests (e.g. S3 pre-signed uploads)
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // SPA routes → serve index.html
  if (SPA_ROUTES.includes(url.pathname)) {
    e.respondWith(caches.match('/index.html').then((r) => r || fetch('/index.html')));
    return;
  }

  // Cache-first for shell
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
