/* =========================================================
   router.js — navigation par adresse « #/… ».
   Fonctionne sur GitHub Pages sans configuration serveur.
   ========================================================= */

const routes = [];
let surChangement = () => {};

/** Déclare une route : motif « /m/:matiere/c/:chapitre ». */
export function route(motif, vue) {
  const noms = [];
  const regex = new RegExp("^" + motif.replace(/:([a-z]+)/g, (_, n) => { noms.push(n); return "([a-z0-9-]+)"; }) + "/?$");
  routes.push({ regex, noms, vue });
}

export function analyser(hash = location.hash) {
  const brut = hash.replace(/^#/, "") || "/";
  const [chemin, chaineRequete = ""] = brut.split("?");
  const requete = Object.fromEntries(new URLSearchParams(chaineRequete));
  for (const r of routes) {
    const m = chemin.match(r.regex);
    if (m) {
      const params = Object.fromEntries(r.noms.map((n, i) => [n, m[i + 1]]));
      return { vue: r.vue, params, requete, chemin };
    }
  }
  return { vue: null, params: {}, requete, chemin };
}

export function naviguer(chemin) {
  if (location.hash === "#" + chemin) surChangement();
  else location.hash = chemin;
}

export function demarrer(rappel) {
  surChangement = rappel;
  window.addEventListener("hashchange", rappel);
  rappel();
}
