/* Public application shell only: account/auth/API responses are never cached. */
const SHELL = 'fittrack-shell-20261105-strength-v14';
const ASSETS = 'fittrack-assets-20261105-strength-v14';
const PAGES = ['/', '/food', '/meals', '/workouts', '/workouts/active', '/progress', '/settings', '/onboarding'];
const PUBLIC_ASSETS = ['/offline.html', '/favicon.ico', '/favicon-16x16.png?v=aift-strength-8', '/favicon-32x32.png?v=aift-strength-8', '/manifest.webmanifest', '/icon-192.png?v=aift-strength-8', '/icon-512.png?v=aift-strength-8', '/icon-maskable.png?v=aift-strength-8', '/apple-touch-icon.png?v=aift-strength-8'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(async cache => {
    await cache.addAll([...PAGES, ...PUBLIC_ASSETS]);
    const assets = new Set();
    for (const page of PAGES) { const response = await cache.match(page); const html = await response.text(); for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) assets.add(match[1].replaceAll('&amp;', '&')); }
    await (await caches.open(ASSETS)).addAll([...assets]);
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fittrack-') && key !== SHELL && key !== ASSETS).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth')) return;
  if (PUBLIC_ASSETS.some(asset => asset.split('?')[0] === url.pathname)) {
    event.respondWith(caches.open(SHELL).then(async cache => (await cache.match(event.request, { ignoreSearch: true })) || fetch(event.request)));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.open(ASSETS).then(async cache => { const cached = await cache.match(event.request); if (cached) return cached; const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; }));
    return;
  }
  if (PAGES.includes(url.pathname) && event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try { const response = await fetch(event.request); if (response.ok) await cache.put(url.pathname, response.clone()); return response; }
      catch { return (await cache.match(url.pathname)) || (await cache.match('/offline.html')); }
    })());
  }
});
