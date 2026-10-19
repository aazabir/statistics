const CACHE = 'sb-6db682026b';
const CORE = ["./", "404.html", "assets/account.js", "assets/ad-gobeshona101.jpg", "assets/fb.js", "assets/fonts.css", "assets/fonts/LICENSE-fonts.txt", "assets/fonts/baloo-da-2-bengali-600-normal.woff2", "assets/fonts/baloo-da-2-bengali-700-normal.woff2", "assets/fonts/baloo-da-2-bengali-800-normal.woff2", "assets/fonts/baloo-da-2-latin-600-normal.woff2", "assets/fonts/baloo-da-2-latin-700-normal.woff2", "assets/fonts/baloo-da-2-latin-800-normal.woff2", "assets/fonts/dm-sans-latin-400-normal.woff2", "assets/fonts/dm-sans-latin-600-normal.woff2", "assets/fonts/dm-sans-latin-700-normal.woff2", "assets/fonts/hind-siliguri-bengali-400-normal.woff2", "assets/fonts/hind-siliguri-bengali-600-normal.woff2", "assets/fonts/hind-siliguri-bengali-700-normal.woff2", "assets/fonts/noto-serif-bengali-bengali-400-normal.woff2", "assets/fonts/noto-serif-bengali-bengali-700-normal.woff2", "assets/fonts/source-serif-4-latin-400-italic.woff2", "assets/fonts/source-serif-4-latin-400-normal.woff2", "assets/fonts/source-serif-4-latin-700-normal.woff2", "assets/site.css", "assets/site.js", "ch-00.html", "ch-01.html", "ch-02.html", "ch-03.html", "ch-04.html", "ch-05.html", "ch-06.html", "ch-07.html", "ch-08.html", "ch-09.html", "ch-10.html", "ch-11.html", "ch-12.html", "ch-13.html", "ch-14.html", "ch-15.html", "ch-16.html", "ch-17.html", "ch-18.html", "ch-19.html", "ch-20.html", "ch-21.html", "ch-22.html", "ch-23.html", "ch-24.html", "ch-25.html", "ch-26.html", "ch-27.html", "ch-28.html", "ch-29.html", "favicon.svg", "icons/apple-touch-icon.png", "icons/favicon-48.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "manifest.webmanifest", "media/image1.jpeg", "media/image2.jpeg", "media/image3.png", "og-image.png", "privacy.html", "search-index.json"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sb-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }))
  );
});
