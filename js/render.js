/* =========================================================
   render.js — création SÛRE des éléments du DOM.
   Règle d'or : aucun contenu n'est jamais inséré via innerHTML.
   Tout texte passe par createTextNode (donc échappé par le navigateur).
   ========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Crée un élément HTML.
 * el("a", { href: "#/", class: "lien" }, "Accueil", autreNoeud)
 * - les attributs « on… » reçoivent une fonction (écouteur d'événement) ;
 * - les enfants peuvent être des chaînes (converties en texte), des nœuds,
 *   des tableaux, ou null/false (ignorés).
 */
export function el(tag, attrs = {}, ...enfants) {
  const noeud = document.createElement(tag);
  appliquerAttributs(noeud, attrs);
  ajouter(noeud, enfants);
  return noeud;
}

/** Même chose pour les éléments SVG. */
export function svg(tag, attrs = {}, ...enfants) {
  const noeud = document.createElementNS(SVG_NS, tag);
  appliquerAttributs(noeud, attrs);
  ajouter(noeud, enfants);
  return noeud;
}

function appliquerAttributs(noeud, attrs) {
  for (const [cle, valeur] of Object.entries(attrs || {})) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    if (cle.startsWith("on") && typeof valeur === "function") {
      noeud.addEventListener(cle.slice(2).toLowerCase(), valeur);
    } else if (cle === "style" && typeof valeur === "object") {
      for (const [prop, v] of Object.entries(valeur)) noeud.style.setProperty(prop, v);
    } else if (cle === "href" && typeof valeur === "string" && /^\s*javascript:/i.test(valeur)) {
      continue; // jamais de lien javascript:
    } else {
      noeud.setAttribute(cle, valeur === true ? "" : String(valeur));
    }
  }
}

export function ajouter(parent, enfants) {
  for (const enfant of [enfants].flat(Infinity)) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    parent.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
  }
  return parent;
}

/** Vide un nœud et y place de nouveaux enfants. */
export function remplacer(parent, ...enfants) {
  parent.replaceChildren();
  return ajouter(parent, enfants);
}

/** Icône de la planche assets/icones.svg. */
export function icone(nom, libelle) {
  const s = svg("svg", { class: "icone", "aria-hidden": libelle ? null : "true", role: libelle ? "img" : null, focusable: "false" },
    libelle ? svg("title", {}, libelle) : null,
    svg("use", { href: `assets/icones.svg#${nom}` }));
  return s;
}

/* ---------------------------------------------------------
   Mini-balisage autorisé dans les fichiers de contenu :
     **gras**   *italique*   ^exposant^   _{indice}   [[terme du glossaire]]
   Le texte est découpé en morceaux, chacun devient un nœud créé
   un par un. Tout le reste reste du texte brut.
   --------------------------------------------------------- */
const MOTIF = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\^[^^]+\^|_\{[^}]+\}|\[\[[^\]]+\]\])/g;

/**
 * @param {string} texte
 * @param {object} [ctx] { surTerme(terme) } appelé quand on clique un [[terme]]
 * @returns {DocumentFragment}
 */
export function texteEnrichi(texte, ctx = {}) {
  const frag = document.createDocumentFragment();
  if (typeof texte !== "string") return frag;
  for (const morceau of texte.split(MOTIF)) {
    if (!morceau) continue;
    if (morceau.startsWith("**") && morceau.endsWith("**") && morceau.length > 4) {
      frag.append(el("strong", {}, texteEnrichi(morceau.slice(2, -2), ctx)));
    } else if (morceau.startsWith("[[") && morceau.endsWith("]]")) {
      // [[texte affiché|id-du-glossaire]] ou [[terme]]
      const [affiche, cible] = morceau.slice(2, -2).split("|");
      const terme = (cible || affiche).trim();
      if (ctx.surTerme) {
        frag.append(el("button", { type: "button", class: "lien-glossaire", onclick: () => ctx.surTerme(terme) }, affiche));
      } else {
        frag.append(el("span", { class: "lien-glossaire" }, affiche));
      }
    } else if (morceau.startsWith("^") && morceau.endsWith("^") && morceau.length > 2) {
      frag.append(el("sup", {}, morceau.slice(1, -1)));
    } else if (morceau.startsWith("_{") && morceau.endsWith("}")) {
      frag.append(el("sub", {}, morceau.slice(2, -1)));
    } else if (morceau.startsWith("*") && morceau.endsWith("*") && morceau.length > 2) {
      frag.append(el("em", {}, texteEnrichi(morceau.slice(1, -1), ctx)));
    } else {
      frag.append(document.createTextNode(morceau));
    }
  }
  return frag;
}

/** Retire le mini-balisage (pour la recherche et les titres). */
export function texteBrut(texte) {
  return String(texte || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")
    .replace(/\^([^^]+)\^/g, "$1").replace(/_\{([^}]+)\}/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/** Normalise pour comparer : minuscules, sans accents. */
export function normaliser(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Badge « À VÉRIFIER » avec la raison du doute en info-bulle. */
export function badgeCertitude(objet) {
  if (!objet || objet.certitude !== "a_verifier") return null;
  const raison = objet.raison || "Point à vérifier.";
  return el("span", { class: "badge-verifier", title: raison, tabindex: "0", "aria-label": `À vérifier : ${raison}` }, "À VÉRIFIER");
}

/** Ligne de source. */
export function ligneSource(source) {
  if (!source || !source.titre) return null;
  const contenu = source.url && /^https:\/\//.test(source.url)
    ? el("a", { href: source.url, target: "_blank", rel: "noopener" }, source.titre)
    : source.titre;
  return el("p", { class: "source" }, "Source : ", contenu);
}

/** Petite notification temporaire. */
export function notifier(message) {
  let zone = document.querySelector(".notifications");
  if (!zone) {
    zone = el("div", { class: "notifications", role: "status", "aria-live": "polite" });
    document.body.append(zone);
  }
  const toast = el("div", { class: "toast" }, message);
  zone.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

/** Formatage des dates en français. */
export function dateLongue(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
