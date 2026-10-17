/* =========================================================
   views/transverses.js — Favoris, Statistiques, Paramètres,
   Recherche et menu « Plus » (mobile).
   ========================================================= */

import { el, icone, remplacer, texteEnrichi, notifier, normaliser } from "../render.js";
import { lire, reglages, modifierReglages, exporter, importer, reinitialiser, BADGES, aujourdhui } from "../storage.js";
import { progresMatiere } from "../progres.js";
import { chargerGlossaire, chargerTousExercices, tousLesFichiers, matiere as trouverMatiere } from "../data.js";
import { rechercher } from "../search.js";
import { naviguer } from "../router.js";
import { ariane, ouvrirDefinition } from "./commun.js";
import { appliquerReglages } from "../theme.js";

/* ---------- Favoris ---------- */
export async function vueFavoris() {
  const favoris = lire().favoris;
  const items = [];
  for (const f of favoris) {
    const [type, chemin] = f.split(":");
    const [mid, id] = chemin.split("/");
    const m = trouverMatiere(mid);
    if (!m) continue;
    try {
      if (type === "chapitre") {
        const ref = m.chapitres.find((c) => c.id === id);
        if (ref) items.push(el("a", { class: "resultat-recherche", href: `#/m/${mid}/c/${id}` }, el("span", { class: "type-res" }, `Chapitre · ${m.nom}`), el("strong", { style: { display: "block" } }, ref.titre)));
      } else if (type === "definition") {
        const e = (await chargerGlossaire(m)).find((g) => g.id === id);
        if (e) items.push(el("button", { type: "button", class: "resultat-recherche", style: { width: "100%", "text-align": "left", cursor: "pointer" }, onclick: () => ouvrirDefinition(e) },
          el("span", { class: "type-res" }, `Définition · ${m.nom}`), el("strong", { style: { display: "block" } }, e.terme), el("span", { class: "discret" }, texteEnrichi(e.definition))));
      } else if (type === "exercice") {
        const x = (await chargerTousExercices(m)).find((e) => e.id === id);
        if (x) items.push(el("a", { class: "resultat-recherche", href: `#/m/${mid}/x/${id}` }, el("span", { class: "type-res" }, `Exercice · ${m.nom}`), el("strong", { style: { display: "block" } }, x.titre)));
      }
    } catch { /* contenu supprimé : on l'ignore */ }
  }
  return el("div", { class: "vue lecture" },
    ariane([["Accueil", "#/"], ["Mes favoris"]]),
    el("h1", { tabindex: "-1" }, "Mes favoris"),
    items.length ? el("div", { class: "pile" }, items) : el("p", { class: "vide carte" }, "Aucun favori. Utilise l'étoile dans un chapitre ou dans le glossaire."));
}

/* ---------- Statistiques ---------- */
export function vueStats({ catalogue }) {
  const etat = lire();
  const jours = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return aujourdhui(d); });
  const minutesJour = jours.map((j) => Object.values(etat.temps[j] || {}).reduce((a, b) => a + b, 0));
  const max = Math.max(30, ...minutesJour);
  const parMatiere = {};
  for (const parM of Object.values(etat.temps)) for (const [mid, min] of Object.entries(parM)) parMatiere[mid] = (parMatiere[mid] || 0) + min;
  const quizFaits = Object.values(etat.chapitres).filter((c) => c.quiz);
  const exos = Object.values(etat.exercices);

  return el("div", { class: "vue" },
    ariane([["Accueil", "#/"], ["Mes statistiques"]]),
    el("h1", { tabindex: "-1" }, "Mes statistiques"),
    el("div", { class: "tuiles", style: { margin: "var(--e5) 0" } },
      el("div", { class: "tuile" }, el("strong", {}, String(etat.serie.record)), el("span", {}, "jours : record de série")),
      el("div", { class: "tuile" }, el("strong", {}, String(quizFaits.length)), el("span", {}, "quiz de chapitre faits")),
      el("div", { class: "tuile" }, el("strong", {}, `${exos.filter((x) => x.etat === "reussi").length} / ${exos.length}`), el("span", {}, "exercices réussis")),
      el("div", { class: "tuile" }, el("strong", {}, `${etat.badges.length} / ${BADGES.length}`), el("span", {}, "badges"))),
    el("section", { class: "carte" },
      el("h2", { style: { "margin-top": 0 } }, "Progression par matière"),
      el("div", { class: "barres" }, catalogue.matieres.filter((m) => m.page === "cours").map((m) => {
        const p = progresMatiere(m);
        return el("div", { class: "barre-stat" }, el("span", {}, m.nom),
          el("div", { class: "progression", style: { "--c": `var(--c-${m.id})` }, role: "progressbar", "aria-valuenow": String(p.pourcent), "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": m.nom }, el("span", { style: { "--p": `${p.pourcent}%` } })),
          el("span", { class: "valeur" }, `${p.pourcent} %`));
      }))),
    el("section", { class: "carte", style: { "margin-top": "var(--e4)" } },
      el("h2", { style: { "margin-top": 0 } }, "Temps de travail, 14 derniers jours"),
      el("div", { class: "histogramme", role: "img", "aria-label": `Minutes par jour : ${minutesJour.join(", ")}` },
        jours.map((j, i) => el("div", { class: "colonne" },
          el("span", {}, minutesJour[i] ? String(minutesJour[i]) : ""),
          el("span", { class: "b", style: { height: `${(minutesJour[i] / max) * 100}%` } }),
          el("span", {}, j.slice(8))))),
      el("h3", {}, "Total par matière"),
      Object.keys(parMatiere).length
        ? el("ul", {}, Object.entries(parMatiere).sort((a, b) => b[1] - a[1]).map(([mid, min]) => el("li", {}, `${trouverMatiere(mid)?.nom || mid} : ${min} min`)))
        : el("p", { class: "discret" }, "Le temps passé dans les chapitres et au Pomodoro s'affichera ici.")));
}

/* ---------- Paramètres ---------- */
export function vueParametres({ catalogue }) {
  const r = reglages();
  const segment = (cle, options) => el("div", { class: "segmente", role: "group" },
    options.map(([v, l]) => el("button", { type: "button", "aria-pressed": String(r[cle] === v), onclick: (e) => {
      modifierReglages({ [cle]: v }); appliquerReglages();
      e.currentTarget.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
    } }, l)));

  const taille = el("input", { type: "range", min: "90", max: "140", step: "10", value: String(r.taillePourcent), "aria-label": "Taille du texte", oninput: (e) => {
    modifierReglages({ taillePourcent: Number(e.target.value) }); appliquerReglages(); sortieTaille.textContent = `${e.target.value} %`;
  } });
  const sortieTaille = el("output", {}, `${r.taillePourcent} %`);

  const dates = catalogue.epreuves.filter((e) => e.modifiable).map((e) => el("div", { class: "reglage" },
    el("label", { for: `date-${e.id}` }, e.libelle),
    el("input", { type: "date", id: `date-${e.id}`, class: "champ", style: { width: "auto" }, min: "2027-01-01", max: "2027-09-30", value: (r.datesEpreuves || {})[e.id] || e.date || "", onchange: (ev) => {
      modifierReglages({ datesEpreuves: { ...(reglages().datesEpreuves || {}), [e.id]: ev.target.value } }); notifier("Date enregistrée");
    } })));

  const fichier = el("input", { type: "file", accept: "application/json,.json", class: "visuellement-cache", id: "import", onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm("Remplacer ta progression actuelle par celle de ce fichier ?")) return;
    try { importer(await f.text()); appliquerReglages(); notifier("Progression importée"); naviguer("/"); }
    catch (err) { notifier(err.message); }
    e.target.value = "";
  } });

  const telechargement = el("button", { type: "button", class: "bouton", onclick: async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = "Téléchargement…";
    try {
      const cacheOuvert = await caches.open("bac2027-contenu");
      await cacheOuvert.addAll(tousLesFichiers());
      notifier("Tous les cours sont disponibles hors ligne");
    } catch { notifier("Téléchargement impossible (hors ligne ?)"); }
    b.disabled = false; b.textContent = "Tout télécharger pour le hors-ligne";
  } }, "Tout télécharger pour le hors-ligne");

  return el("div", { class: "vue lecture" },
    ariane([["Accueil", "#/"], ["Paramètres"]]),
    el("h1", { tabindex: "-1" }, "Paramètres"),
    el("section", { class: "carte" },
      el("h2", { style: { "margin-top": 0 } }, "Affichage"),
      el("div", { class: "reglage" }, el("span", {}, "Thème"), segment("theme", [["sombre", "Sombre"], ["clair", "Clair"], ["systeme", "Système"]])),
      el("div", { class: "reglage" }, el("span", {}, "Taille du texte"), el("span", { class: "ligne" }, taille, sortieTaille)),
      el("div", { class: "reglage" }, el("span", {}, "Animations"), segment("animations", [[true, "Oui"], [false, "Non"]]))),
    el("section", { class: "carte", style: { "margin-top": "var(--e4)" } },
      el("h2", { style: { "margin-top": 0 } }, "Dates de mes épreuves"),
      el("p", { class: "discret" }, "Les dates officielles (français écrit, philosophie, LLCER écrit) sont fixes. Complète les autres d'après ta convocation."),
      dates),
    el("section", { class: "carte", style: { "margin-top": "var(--e4)" } },
      el("h2", { style: { "margin-top": 0 } }, "Ma progression"),
      el("div", { class: "ligne" },
        el("button", { type: "button", class: "bouton", onclick: exporter }, icone("telecharger"), "Exporter (fichier JSON)"),
        el("label", { for: "import", class: "bouton", tabindex: "0", onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fichier.click(); } } }, icone("televerser"), "Importer"), fichier,
        el("button", { type: "button", class: "bouton", onclick: () => {
          if (confirm("Effacer toute ta progression ? Exporte-la d'abord si tu veux la garder.")) { reinitialiser(); notifier("Progression réinitialisée"); naviguer("/"); }
        } }, icone("recommencer"), "Réinitialiser"))),
    el("section", { class: "carte", style: { "margin-top": "var(--e4)" } },
      el("h2", { style: { "margin-top": 0 } }, "Hors ligne"),
      el("p", { class: "discret" }, "Les pages ouvertes restent disponibles sans réseau. Ce bouton enregistre tous les cours d'un coup."),
      telechargement));
}

/* ---------- Recherche ---------- */
export async function vueRecherche({ requete }) {
  const champ = el("input", { type: "search", class: "champ", name: "q", value: requete.q || "", placeholder: "Rechercher…", "aria-label": "Rechercher", autofocus: true });
  const zone = el("div", { class: "pile", "aria-live": "polite" });
  async function lancer() {
    const q = champ.value.trim();
    if (q.length < 2) { remplacer(zone, el("p", { class: "discret" }, "Tape au moins 2 lettres.")); return; }
    remplacer(zone, el("p", { class: "discret" }, "Recherche…"));
    const res = await rechercher(q);
    const mots = normaliser(q).split(/\s+/);
    remplacer(zone, el("p", { class: "discret" }, `${res.length} résultat(s)`), res.map((r) => el("a", { class: "resultat-recherche", href: r.route },
      el("span", { class: "type-res" }, `${r.type} · ${r.matiere}`),
      el("strong", { style: { display: "block" } }, surligner(r.titre, mots)),
      el("span", { class: "discret" }, r.extrait.slice(0, 160)))));
  }
  let attente;
  champ.addEventListener("input", () => { clearTimeout(attente); attente = setTimeout(lancer, 200); });
  if (requete.q) lancer();
  return el("div", { class: "vue lecture" },
    ariane([["Accueil", "#/"], ["Recherche"]]),
    el("h1", { tabindex: "-1" }, "Recherche"),
    el("form", { role: "search", onsubmit: (e) => { e.preventDefault(); lancer(); } }, champ),
    zone);
}

/** Surligne les mots trouvés sans HTML brut. */
function surligner(texte, mots) {
  const frag = document.createDocumentFragment();
  const n = normaliser(texte);
  let i = 0;
  const marques = [];
  for (const m of mots) { if (m.length < 2) continue; let p = n.indexOf(m); while (p >= 0) { marques.push([p, p + m.length]); p = n.indexOf(m, p + m.length); } }
  marques.sort((a, b) => a[0] - b[0]);
  for (const [a, b] of marques) { if (a < i) continue; frag.append(texte.slice(i, a), el("mark", {}, texte.slice(a, b))); i = b; }
  frag.append(texte.slice(i));
  return frag;
}

/* ---------- Menu « Plus » (mobile) ---------- */
export function vuePlus({ catalogue }) {
  const lien = (href, ic, libelle) => el("a", { class: "lien-nav", href }, icone(ic), libelle);
  return el("div", { class: "vue lecture" },
    el("h1", { tabindex: "-1" }, "Plus"),
    el("nav", { class: "pile carte", "aria-label": "Autres pages" },
      lien("#/favoris", "favori", "Mes favoris"),
      lien("#/stats", "stats", "Mes statistiques"),
      lien("#/parametres", "parametres", "Paramètres")),
    el("h2", {}, "Toutes les matières"),
    el("nav", { class: "pile carte", "aria-label": "Matières" }, catalogue.matieres.map((m) => el("a", { class: "lien-nav", href: `#/m/${m.id}` }, el("span", { class: "pastille", style: { background: `var(--c-${m.id})` } }), m.nom))));
}

