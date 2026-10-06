// Service worker : garde l'application en mémoire sur l'appareil pour qu'elle fonctionne hors connexion.
// Il ne met en cache que les fichiers de l'application ; aucune donnée de santé ne transite par lui.
const CACHE = 'mes-soins-v3';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icones/icone-192.png', 'icones/icone-512.png', 'icones/apple-touch-icon.png', 'polices/plus-jakarta-sans.woff2'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('donnees_medicales.json')) return; // jamais mis en cache
  // Cache d'abord (hors connexion), puis mise à jour en arrière-plan pour la prochaine ouverture.
  ev.respondWith(caches.open(CACHE).then(async cache => {
    const cle = ev.request.mode === 'navigate' ? 'index.html' : ev.request;
    const enCache = await cache.match(cle, { ignoreSearch: true });
    const reseau = fetch(ev.request).then(rep => {
      if (rep.ok) cache.put(cle, rep.clone());
      return rep;
    }).catch(() => enCache);
    return enCache || reseau;
  }));
});
