/* =========================================================
   sw.js — service worker : fonctionnement hors ligne.
   - La coquille (HTML, CSS, JS, icônes, polices) est mise en cache
     à l'installation : stratégie « cache d'abord ».
   - Les contenus (data/) : « réseau d'abord, cache sinon », pour que
     tes corrections apparaissent dès que tu es en ligne.
   Change VERSION à chaque mise à jour du code pour forcer le rafraîchissement.
   ========================================================= */

const VERSION = "v8";
const CACHE_COQUILLE = `bac2027-coquille-${VERSION}`;
const CACHE_CONTENU = "bac2027-contenu";

const COQUILLE = [
  "./", "index.html", "manifest.webmanifest",
  "css/variables.css", "css/base.css", "css/composants.css", "css/premium.css",
  "js/app.js", "js/router.js", "js/storage.js", "js/render.js", "js/data.js", "js/theme.js",
  "js/progres.js", "js/quiz.js", "js/flashcards.js", "js/search.js", "js/synthese.js", "js/confetti.js", "js/effets.js",
  "js/views/commun.js", "js/views/accueil.js", "js/views/matiere.js", "js/views/chapitre.js",
  "js/views/exercice.js", "js/views/glossaire.js", "js/views/page.js", "js/views/pomodoro.js", "js/views/transverses.js",
  "assets/icones.svg", "assets/icone-app.svg", "assets/icone-180.png", "assets/icone-192.png", "assets/icone-512.png",
  "data/matieres.json",
];
// Polices : mises en cache si elles sont présentes (facultatives).
const POLICES = ["assets/fonts/inter-display-600.woff", "assets/fonts/inter-display-700.woff", "assets/fonts/inter-400.woff", "assets/fonts/inter-400-italic.woff", "assets/fonts/inter-600.woff", "assets/fonts/inter-700.woff"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_COQUILLE);
    await cache.addAll(COQUILLE);
    await Promise.all(POLICES.map((p) => cache.add(p).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n.startsWith("bac2027-coquille-") && n !== CACHE_COQUILLE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  if (url.pathname.includes("/data/")) {
    // Réseau d'abord, cache sinon
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_CONTENU);
      try {
        const reponse = await fetch(event.request);
        if (reponse.ok) cache.put(event.request, reponse.clone());
        return reponse;
      } catch {
        return (await cache.match(event.request)) || (await caches.match(event.request)) || Response.error();
      }
    })());
    return;
  }

  // Cache d'abord, réseau sinon
  event.respondWith((async () => {
    const enCache = await caches.match(event.request, { ignoreSearch: true });
    if (enCache) return enCache;
    try {
      const reponse = await fetch(event.request);
      if (reponse.ok) (await caches.open(CACHE_COQUILLE)).put(event.request, reponse.clone());
      return reponse;
    } catch {
      if (event.request.mode === "navigate") return caches.match("index.html");
      return Response.error();
    }
  })());
});
