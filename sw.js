// Service worker : garde l'application en mémoire sur l'appareil pour qu'elle fonctionne hors connexion.
// Il ne met en cache que les fichiers de l'application ; aucune donnée de santé ne transite par lui.
const CACHE = 'mes-soins-v6';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icones/icone-192.png', 'icones/icone-512.png', 'icones/apple-touch-icon.png', 'polices/plus-jakarta-sans.woff2'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('donnees_medicales.json')) return; // jamais mis en cache
  if (url.pathname.endsWith('.chiffre.json')) return; // mises à jour chiffrées : toujours depuis le réseau
  if (ev.request.mode === 'navigate') {
    // La page : réseau d'abord (toujours la dernière version), copie locale si hors connexion.
    ev.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctrl = new AbortController();
        const minuterie = setTimeout(() => ctrl.abort(), 5000);
        const rep = await fetch(url.href, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(minuterie);
        if (!rep.ok) throw new Error('HTTP ' + rep.status);
        const propre = new Response(await rep.blob(), { status: rep.status, headers: rep.headers });
        await cache.put('index.html', propre.clone());
        return propre;
      } catch (e) {
        return (await cache.match('index.html')) || Response.error();
      }
    })());
    return;
  }
  // Autres fichiers (police, icônes) : copie locale, mise à jour en arrière-plan.
  ev.respondWith(caches.open(CACHE).then(async cache => {
    const enCache = await cache.match(ev.request, { ignoreSearch: true });
    const reseau = fetch(ev.request).then(rep => { if (rep.ok) cache.put(ev.request, rep.clone()); return rep; }).catch(() => enCache);
    return enCache || reseau;
  }));
});
