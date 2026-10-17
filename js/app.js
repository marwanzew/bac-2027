/* =========================================================
   app.js — démarrage du site : coquille (navigation), routes,
   rendu des vues, service worker.
   ========================================================= */

import { el, icone, remplacer, notifier } from "./render.js";
import { route, analyser, demarrer } from "./router.js";
import { quandBadge } from "./storage.js";
import { chargerCatalogue, matiere } from "./data.js";
import { appliquerReglages, definirMatieres, couleurMatiere } from "./theme.js";
import { progresMatiere } from "./progres.js";
import { vueAccueil } from "./views/accueil.js";
import { vueLecons, vueExercices } from "./views/matiere.js";
import { vueChapitre } from "./views/chapitre.js";
import { vueExercice } from "./views/exercice.js";
import { vueGlossaire } from "./views/glossaire.js";
import { vuePage } from "./views/page.js";
import { vuePomodoro } from "./views/pomodoro.js";
import { vueFavoris, vueStats, vueParametres, vueRecherche, vuePlus } from "./views/transverses.js";
import { messageErreur } from "./views/commun.js";
import { activerEffets } from "./effets.js";

appliquerReglages();

/* ---------- Routes ---------- */
// Une vue reçoit { catalogue, m, params, requete, contexte } et renvoie un nœud (ou une promesse).
const avecMatiere = (vue, typesAutorises = ["cours"]) => (args) => {
  const m = matiere(args.params.matiere);
  if (!m) throw new Error("Cette matière n'existe pas.");
  if (!typesAutorises.includes(m.page)) return vuePage({ ...args, m });
  return vue({ ...args, m });
};

route("/", vueAccueil);
route("/matieres", vueMatieres);
route("/m/:matiere", avecMatiere(vueLecons));
route("/m/:matiere/exercices", avecMatiere(vueExercices));
route("/m/:matiere/glossaire", avecMatiere(vueGlossaire, ["cours", "methode", "rappel"]));
route("/m/:matiere/c/:chapitre", avecMatiere(vueChapitre));
route("/m/:matiere/x/:exercice", avecMatiere(vueExercice));
route("/favoris", vueFavoris);
route("/stats", vueStats);
route("/pomodoro", vuePomodoro);
route("/parametres", vueParametres);
route("/recherche", vueRecherche);
route("/plus", vuePlus);

function vueMatieres({ catalogue }) {
  return el("div", { class: "vue" },
    el("h1", { tabindex: "-1" }, "Matières"),
    el("div", { class: "grille" }, catalogue.matieres.map((m) => {
      const p = progresMatiere(m);
      return el("a", { href: `#/m/${m.id}`, class: "carte carte-matiere", style: { "--c": `var(--c-${m.id})` } },
        el("span", { class: "icone-matiere" }, icone(m.icone)), el("h3", {}, m.nom),
        el("span", { class: "meta" }, m.page === "cours" ? `${p.pourcent} % maîtrisé` : m.page === "methode" ? "Méthode" : "Rappel"));
    })));
}

/* ---------- Coquille ---------- */
const principal = el("main", { id: "contenu", class: "principal", tabindex: "-1" });
let barreLaterale, barreBas;

function construireCoquille(catalogue) {
  const lien = (href, ic, libelle) => el("a", { class: "lien-nav", href, "data-route": href }, icone(ic), el("span", { class: "libelle" }, libelle));
  barreLaterale = el("nav", { class: "barre-laterale", "aria-label": "Navigation principale" },
    el("a", { href: "#/", class: "marque" }, icone("logo"), el("span", { class: "libelle" }, "Bac 2027")),
    lien("#/", "accueil", "Tableau de bord"),
    lien("#/recherche", "recherche", "Recherche"),
    el("p", { class: "nav-titre" }, "Matières"),
    catalogue.matieres.map((m) => el("a", { class: "lien-nav", href: `#/m/${m.id}`, "data-route": `#/m/${m.id}`, title: m.nom },
      el("span", { class: "pastille", style: { background: `var(--c-${m.id})` }, "aria-hidden": "true" }), el("span", { class: "libelle" }, m.nom))),
    el("p", { class: "nav-titre" }, "Outils"),
    lien("#/favoris", "favori", "Mes favoris"),
    lien("#/stats", "stats", "Statistiques"),
    lien("#/pomodoro", "minuteur", "Pomodoro"),
    lien("#/parametres", "parametres", "Paramètres"),
    el("button", { type: "button", class: "lien-nav bouton-replier", style: { border: 0, background: "none", cursor: "pointer" }, "aria-label": "Replier ou déplier le menu", onclick: () => {
      const replie = document.querySelector(".coquille").classList.toggle("replie");
      try { localStorage.setItem("bac2027:menu-replie", replie ? "1" : "0"); } catch {}
    } }, icone("replier"), el("span", { class: "libelle" }, "Replier le menu")));

  const bas = (href, ic, libelle) => el("a", { href, "data-route": href }, icone(ic), libelle);
  barreBas = el("nav", { class: "barre-bas", "aria-label": "Navigation" },
    bas("#/", "accueil", "Accueil"), bas("#/matieres", "matieres", "Matières"), bas("#/recherche", "recherche", "Recherche"),
    bas("#/pomodoro", "minuteur", "Pomodoro"), bas("#/plus", "plus", "Plus"));

  let replie = false;
  try { replie = localStorage.getItem("bac2027:menu-replie") === "1"; } catch {}
  const coquille = el("div", { class: "coquille" + (replie ? " replie" : "") }, barreLaterale, principal);
  remplacer(document.getElementById("app"), el("a", { href: "#contenu", class: "evitement" }, "Aller au contenu"), coquille, barreBas);
}

function marquerNavigation(chemin) {
  const hash = "#" + chemin;
  for (const a of document.querySelectorAll("[data-route]")) {
    const r = a.dataset.route;
    const actif = r === "#/" ? hash === "#/" : hash === r || hash.startsWith(r + "/");
    if (actif) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
  // Sur mobile, les pages de matière activent l'onglet « Matières ».
  if (hash.startsWith("#/m/")) barreBas.querySelector('[data-route="#/matieres"]')?.setAttribute("aria-current", "page");
}

/* ---------- Rendu ---------- */
let catalogue = null;
let contexte = {};
let jeton = 0;

async function rendre() {
  contexte.nettoyer?.();
  contexte = {};
  const monJeton = ++jeton;
  const { vue, params, requete, chemin } = analyser();
  marquerNavigation(chemin);
  const m = params.matiere ? matiere(params.matiere) : null;
  document.documentElement.style.setProperty("--matiere", couleurMatiere(m) || "var(--focus)");
  document.title = "Révisions Bac 2027";

  let noeud;
  try {
    if (!vue) throw new Error("Cette page n'existe pas.");
    noeud = await vue({ catalogue, params, requete, contexte, m });
  } catch (err) {
    console.error(err);
    noeud = messageErreur(err);
  }
  if (monJeton !== jeton) return; // une navigation plus récente a eu lieu
  remplacer(principal, noeud);
  const titre = principal.querySelector("h1");
  if (titre) document.title = `${titre.textContent} · Révisions Bac 2027`;
  if (!requete.partie && !requete.terme) window.scrollTo(0, 0);
  (titre || principal).focus({ preventScroll: true });
}

/* ---------- Démarrage ---------- */
async function lancer() {
  try {
    catalogue = await chargerCatalogue();
  } catch (err) {
    remplacer(document.getElementById("app"), el("main", { class: "principal" }, messageErreur(err),
      el("p", { class: "discret" }, "Astuce : le site doit être ouvert via un serveur (GitHub Pages, ou « python3 -m http.server » en local), pas en double-cliquant sur index.html.")));
    return;
  }
  definirMatieres(catalogue.matieres);
  construireCoquille(catalogue);
  quandBadge((b) => notifier(`Nouveau badge : ${b.libelle}`));
  demarrer(rendre);
  activerEffets();

  const origineSure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && origineSure) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

lancer();
