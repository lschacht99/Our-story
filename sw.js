const CACHE_PREFIX = 'our-story-';
const CACHE_VERSION = 'v10-20260720-pan-puzzle-art';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const PNG_CACHE = `${CACHE_PREFIX}png-${CACHE_VERSION}`;
const ACTIVE_CACHES = new Set([SHELL_CACHE, PNG_CACHE]);
const OFFLINE_URL = './index.html';

// Keep installation small. The much larger PNG library is cached only as the
// player encounters it, so installing an update never downloads the art tree.
const SHELL_FILES = [
  './',
  OFFLINE_URL,
  './styles.css',
  './sprite-fix.css',
  './manifest.webmanifest',
  './scripts/core.js',
  './scripts/audio.js',
  './scripts/cutscene.js',
  './scripts/dialogue.js',
  './scripts/engine.js',
  './scripts/home.js',
  './scripts/mystery.js',
  './scripts/puzzle.js',
  './scripts/save.js',
  './scripts/save-core.js',
  './scripts/scene.js',
  './scripts/ui.js',
  './data/chapters.json',
  './data/characters.json',
  './data/cutscenes.json',
  './data/mystery.json',
  './data/puzzles.json',
  './data/scenes.json',
  './assets/png/ui/app-icon.png',
  './assets/png/ui/loading.png',
  './assets/png/ui/title-key-art.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(key))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(response) {
  return response && response.status === 200 && response.type === 'basic';
}

function fetchAndCache(event, request, cacheName, cacheKey = request) {
  const responsePromise = fetch(request);
  const writePromise = responsePromise
    .then(async (response) => {
      if (!isCacheable(response)) return;
      const copy = response.clone();
      const cache = await caches.open(cacheName);
      await cache.put(cacheKey, copy);
    })
    .catch(() => undefined);
  event.waitUntil(writePromise);
  return responsePromise;
}

function normalizedCacheKey(request) {
  const url = new URL(request.url);
  url.search = '';
  return url.href;
}

async function navigationResponse(event) {
  const request = event.request;
  const update = fetchAndCache(event, request, SHELL_CACHE, OFFLINE_URL);
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(OFFLINE_URL);

  // The installed shell renders immediately while a fresh copy is saved for
  // the next visit. On a first uncached navigation, fall back offline safely.
  if (cached) return cached;
  try {
    return await update;
  } catch {
    const fallback = await caches.match(OFFLINE_URL);
    if (fallback) return fallback;
    throw new Error('Offline shell unavailable');
  }
}

function cacheFirstPng(event) {
  const request = event.request;
  const resultPromise = caches.match(request, { ignoreSearch: true })
    .catch(() => undefined)
    .then(async (cached) => {
      if (cached) return { response: cached, copy: null };
      const response = await fetch(request);
      return {
        response,
        copy: isCacheable(response) ? response.clone() : null
      };
    });
  const responsePromise = resultPromise.then(({ response }) => response);
  const writePromise = resultPromise
    .then(async ({ copy }) => {
      if (!copy) return;
      const cache = await caches.open(PNG_CACHE);
      await cache.put(request, copy);
    })
    .catch(() => undefined);
  event.waitUntil(writePromise);
  return responsePromise;
}

async function staleWhileRevalidate(event) {
  const request = event.request;
  const cacheKey = normalizedCacheKey(request);
  const update = fetchAndCache(event, request, SHELL_CACHE, cacheKey);
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(cacheKey);
  return cached || update;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(event));
    return;
  }

  if (requestUrl.pathname.toLowerCase().endsWith('.png')) {
    event.respondWith(cacheFirstPng(event));
    return;
  }

  if (/\.(?:css|js|json|webmanifest)$/i.test(requestUrl.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
