// Offline-first service worker.
// Core shell + data are precached; chapter backgrounds and cutscene art are
// cached lazily on first use so the initial download stays small.
const CACHE = 'our-story-v2';
const CORE = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'scripts/engine.js', 'scripts/core.js', 'scripts/save-core.js', 'scripts/save.js',
  'scripts/ui.js', 'scripts/home.js', 'scripts/scene.js', 'scripts/dialogue.js',
  'scripts/puzzle.js', 'scripts/cutscene.js', 'scripts/mystery.js', 'scripts/audio.js',
  'data/chapters.json', 'data/scenes.json', 'data/puzzles.json',
  'data/cutscenes.json', 'data/mystery.json', 'data/characters.json',
  'assets/png/ui/app-icon.png', 'assets/png/ui/title-key-art.png',
  'assets/png/ui/loading.png', 'assets/png/ui/paper.png',
  'assets/png/ui/icon-passport.png', 'assets/png/ui/icon-map.png',
  'assets/png/ui/icon-notebook.png', 'assets/png/ui/icon-inventory.png',
  'assets/png/ui/icon-cutscene.png', 'assets/png/ui/icon-settings.png',
  'assets/png/ui/icon-swap.png',
  'assets/png/characters/leah-atlas.png', 'assets/png/characters/moshe-atlas.png',
  'assets/png/collectibles/rabbit-mark.png',
  'assets/png/backgrounds/p01-paris-apartment.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
