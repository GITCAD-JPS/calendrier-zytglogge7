/* Service worker : le calendrier reste consultable sans réseau, y compris à la
   patinoire. Changez VERSION à chaque modification des fichiers pour forcer la
   mise à jour des téléphones déjà visités. */

const VERSION = 'zytglogge7-v3';

const COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/composants.js',
  './assets/js/dom.js',
  './assets/js/export.js',
  './assets/js/langue.js',
  './assets/js/model.js',
  './assets/js/nuage.js',
  './assets/js/nuage-configuration.js',
  './assets/js/store.js',
  './assets/js/theme.js',
  './assets/js/vues/calendrier.js',
  './assets/js/vues/equipe.js',
  './assets/js/vues/match.js',
  './assets/js/vues/reglages.js',
  './assets/js/vues/saison.js',
  './assets/js/vues/tableau.js',
  './assets/icons/icone.svg',
  './assets/icons/icone-180.png',
  './assets/icons/icone-192.png',
  './assets/icons/icone-512.png',
  './data/seed.json',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(COQUILLE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((nom) => nom !== VERSION).map((nom) => caches.delete(nom)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET' || !requete.url.startsWith(self.location.origin)) return;

  // Navigation : on tente le réseau puis on retombe sur la page mise en cache.
  if (requete.mode === 'navigate') {
    evenement.respondWith((async () => {
      try {
        return await fetch(requete);
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  evenement.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const enCache = await cache.match(requete);
    if (enCache) {
      // Rafraîchissement discret en arrière-plan.
      fetch(requete).then((reponse) => {
        if (reponse.ok) cache.put(requete, reponse.clone());
      }).catch(() => {});
      return enCache;
    }
    try {
      const reponse = await fetch(requete);
      if (reponse.ok) cache.put(requete, reponse.clone());
      return reponse;
    } catch {
      return Response.error();
    }
  })());
});
