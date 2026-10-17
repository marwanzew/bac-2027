/* =========================================================
   views/accueil.js — tableau de bord.
   ========================================================= */

import { el, svg, icone, dateLongue } from "../render.js";
import { lire, serieAffichee, BADGES, reglages, aujourdhui } from "../storage.js";
import { progresMatiere, progresGlobal } from "../progres.js";
import { naviguer } from "../router.js";

function anneau(pourcent) {
  const r = 54, c = 2 * Math.PI * r;
  return el("div", { class: "anneau", role: "img", "aria-label": `Progression globale : ${pourcent} %` },
    svg("svg", { viewBox: "0 0 132 132", "aria-hidden": "true" },
      svg("defs", {}, svg("linearGradient", { id: "degrade-anneau", x1: "0", y1: "0", x2: "1", y2: "1" },
        svg("stop", { offset: "0", style: { "stop-color": "var(--texte)" } }),
        svg("stop", { offset: ".5", style: { "stop-color": "var(--accent)" } }),
        svg("stop", { offset: "1", style: { "stop-color": "var(--accent)" } }))),
      svg("circle", { cx: 66, cy: 66, r, fill: "none", stroke: "var(--surface-2)", "stroke-width": 12 }),
      svg("circle", { cx: 66, cy: 66, r, fill: "none", stroke: "url(#degrade-anneau)", "stroke-width": 12, "stroke-linecap": "round",
        "stroke-dasharray": c, "stroke-dashoffset": c * (1 - pourcent / 100) })),
    el("div", { class: "valeur", "aria-hidden": "true" }, el("div", {}, el("strong", {}, `${pourcent} %`), el("span", { class: "discret" }, "du programme"))));
}

function joursAvant(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  const [a2, m2, j2] = aujourdhui().split("-").map(Number);
  return Math.round((new Date(a, m - 1, j) - new Date(a2, m2 - 1, j2)) / 86400000);
}

export function compteARebours(catalogue) {
  const saisies = reglages().datesEpreuves || {};
  const lignes = catalogue.epreuves.map((e) => {
    const date = e.modifiable ? (saisies[e.id] || e.date) : e.date;
    let droite;
    if (!date) droite = el("a", { href: "#/parametres" }, "Date à saisir");
    else {
      const n = joursAvant(date);
      droite = el("strong", { title: dateLongue(date) }, n > 1 ? `J − ${n}` : n === 1 ? "Demain" : n === 0 ? "Aujourd'hui" : "Passée");
    }
    return el("div", { class: "compte-ligne" },
      el("span", {}, e.libelle, e.modifiable ? el("span", { class: "discret" }, " (modifiable)") : null), droite);
  });
  return el("section", { class: "carte", "aria-labelledby": "titre-compte" },
    el("h2", { id: "titre-compte", style: { "margin-top": 0 } }, "Compte à rebours"),
    el("div", { class: "compte" }, lignes),
    el("p", { class: "discret", style: { margin: "var(--e3) 0 0" } }, "Dates officielles : calendrier du BO spécial n° 2 du 25 août 2026."));
}

export function vueAccueil({ catalogue }) {
  const etat = lire();
  const global = progresGlobal(catalogue);
  const maitrises = Object.values(etat.chapitres).filter((c) => c.statut === "maitrise").length;
  const semaine = Object.entries(etat.temps).filter(([j]) => joursAvant(j) > -7).reduce((s, [, parM]) => s + Object.values(parM).reduce((a, b) => a + b, 0), 0);
  const heure = new Date().getHours();
  const salut = heure < 5 ? "Bonne nuit" : heure < 18 ? "Bonjour" : "Bonsoir";

  const champRecherche = el("input", { type: "search", class: "champ", name: "q", placeholder: "Rechercher un cours, une définition, un exercice…", "aria-label": "Recherche globale" });

  return el("div", { class: "vue" },
    el("section", { class: "entete-accueil" },
      el("div", {},
        el("h1", { class: "salut", tabindex: "-1" }, salut, "."),
        el("p", { class: "discret" }, "Bac 2027 · Terminale générale · SES et LLCER anglais"),
        el("form", { role: "search", onsubmit: (e) => { e.preventDefault(); naviguer(`/recherche?q=${encodeURIComponent(champRecherche.value)}`); } }, champRecherche),
        etat.reprise
          ? el("a", { href: etat.reprise.route, class: "bouton principal-btn", style: { "margin-top": "var(--e4)" } }, icone("lecture"), "Reprendre : ", etat.reprise.titre)
          : el("a", { href: "#/m/ses", class: "bouton principal-btn", style: { "margin-top": "var(--e4)" } }, icone("lecture"), "Commencer par la SES")),
      el("div", { class: "carte ligne", style: { "align-items": "center", gap: "var(--e5)" } },
        anneau(global),
        el("div", { class: "tuiles", style: { flex: 1 } },
          el("div", { class: "tuile" }, el("strong", {}, String(serieAffichee())), el("span", {}, "jour(s) de suite")),
          el("div", { class: "tuile" }, el("strong", {}, String(maitrises)), el("span", {}, "chapitre(s) maîtrisé(s)")),
          el("div", { class: "tuile" }, el("strong", {}, `${semaine} min`), el("span", {}, "cette semaine"))))),

    el("h2", {}, "Mes matières"),
    el("div", { class: "grille" }, catalogue.matieres.map((m) => {
      const p = progresMatiere(m);
      const meta = m.page === "cours" ? `${p.maitrises} / ${p.total} chapitres maîtrisés` : m.page === "methode" ? "Méthode et entraînement" : "Rappel des modalités";
      return el("a", { href: `#/m/${m.id}`, class: "carte carte-matiere", style: { "--c": `var(--c-${m.id})` } },
        el("span", { class: "icone-matiere" }, icone(m.icone)),
        el("h3", {}, m.nom),
        el("span", { class: "meta" }, meta),
        m.page === "cours" ? el("div", { class: "progression", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p.pourcent), "aria-label": `Progression ${m.nom}` },
          el("span", { style: { "--p": `${p.pourcent}%` } })) : null);
    })),

    el("div", { class: "grille", style: { "margin-top": "var(--e6)" } },
      compteARebours(catalogue),
      el("section", { class: "carte", "aria-labelledby": "titre-badges" },
        el("h2", { id: "titre-badges", style: { "margin-top": 0 } }, "Badges"),
        el("div", { class: "badges" }, BADGES.map((b) => {
          const obtenu = etat.badges.some((x) => x.id === b.id);
          return el("span", { class: "badge-recompense" + (obtenu ? "" : " verrouille") }, icone(obtenu ? "trophee" : "cible"), b.libelle, el("span", { class: "visuellement-cache" }, obtenu ? " (obtenu)" : " (pas encore)"));
        })))));
}
