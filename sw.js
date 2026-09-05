/**
 * Platform Fall — service worker.
 *
 * Strategy: precache the app shell, then stale-while-revalidate.
 * The app is a single HTML file, so the cache stays tiny and the game
 * launches instantly even fully offline.
 */

/** Name of the versioned cache used for the app shell. */
const CACHE = 'platform-fall-v21';

/** List of app shell resources precached during install. */
const APP_SHELL = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './js/main.js', './js/constants.js', './js/dice.js', './js/dom.js',
  './js/canvas.js', './js/render.js', './js/leaderboard.js',
  './js/input.js', './js/game.js', './js/pwa.js',
];

/**
 * Precaches the app shell and activates this worker immediately.
 * @param {InstallEvent} event
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/**
 * Deletes stale caches from previous versions and claims all clients.
 * @param {ExtendableEvent} event
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/**
 * Routes same-origin GET requests through the stale-while-revalidate handler.
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  event.respondWith(handle(req));
});

/**
 * Serves a request using stale-while-revalidate: the cached copy is served
 * immediately while a background refresh updates the cache. Navigation
 * requests fall back to the cached app shell when offline.
 * @param {Request} req - The request to handle.
 * @returns {Promise<Response>} The response to fulfill the request with.
 */
async function handle(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);

  // Background refresh (ignored if we already have a copy to serve).
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) return cached; // serve stale immediately, refresh in background

  const res = await network;
  if (res) return res;

  // Offline fallback: any navigation goes to the app shell.
  if (req.mode === 'navigate') {
    return (await cache.match('./index.html')) ||
      new Response('Offline', { status: 503, statusText: 'Offline' });
  }
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}
