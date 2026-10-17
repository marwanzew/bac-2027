/* =========================================================
   views/chapitre.js — un chapitre, dans l'ordre imposé :
   1 rattachement · 2 objectifs · 3-5 cours et encadrés ·
   6 repères · 7 synthèse · 8 fiche · 9 quiz · 10 boutons.
   ========================================================= */

import { el, icone, texteEnrichi, badgeCertitude, ligneSource, notifier } from "../render.js";
import { visiterChapitre, statutChapitre, definirStatut, noterQuiz, estFavori, basculerFavori, ajouterTemps } from "../storage.js";
import { chargerChapitre, chargerGlossaire } from "../data.js";
import { rendreSynthese } from "../synthese.js";
import { creerQuiz } from "../quiz.js";
import { lancerConfettis } from "../confetti.js";
import { verifierBadgesProgression } from "../progres.js";
import { ariane, enteteMatiere, contexteGlossaire, rendreBloc } from "./commun.js";

const TYPES_REPERES = { date: "Date", auteur: "Auteur", formule: "Formule", mecanisme: "Mécanisme", chiffre: "Chiffre clé", lieu: "Lieu", notion: "Notion" };

export async function vueChapitre({ m, params, requete, catalogue, contexte }) {
  const { ref, chapitre } = await chargerChapitre(m, params.chapitre);
  const route = `#/m/${m.id}/c/${ref.id}`;
  if (!chapitre) {
    return el("div", { class: "vue" },
      ariane([["Accueil", "#/"], [m.nom, `#/m/${m.id}`], [ref.titre]]),
      el("h1", { tabindex: "-1" }, ref.titre),
      el("p", { class: "vide carte" }, "Ce chapitre sera rédigé et vérifié à l'étape 3."));
  }
  const glossaire = await chargerGlossaire(m);
  const ctx = contexteGlossaire(glossaire);
  const cle = `${m.id}/${ref.id}`;
  visiterChapitre(cle, route, chapitre.titre);

  // Temps de travail : compté tant que la page reste ouverte et visible.
  let debut = Date.now();
  const compter = () => { const min = Math.floor((Date.now() - debut) / 60000); if (min > 0) ajouterTemps(m.id, Math.min(min, 120)); debut = Date.now(); };
  const surVisibilite = () => { if (document.hidden) compter(); else debut = Date.now(); };
  document.addEventListener("visibilitychange", surVisibilite);
  contexte.nettoyer = () => { compter(); document.removeEventListener("visibilitychange", surVisibilite); observateur?.disconnect(); };

  // Sections et sommaire
  const sections = [];
  const section = (id, titre, ...contenu) => {
    sections.push([id, titre]);
    return el("section", { id, class: "section-chapitre", "aria-labelledby": `t-${id}` }, el("h2", { id: `t-${id}` }, titre), contenu);
  };

  const corps = [
    section("rattachement", "Rattachement au programme",
      el("div", { class: "rattachement" },
        el("p", {}, el("strong", {}, chapitre.rattachement.theme), " — ", chapitre.rattachement.intitule, " ", badgeCertitude(chapitre.rattachement)),
        chapitre.rattachement.evaluableEcrit === true ? el("p", { class: "discret" }, "Évaluable à l'épreuve écrite 2027.") : null,
        ligneSource(chapitre.rattachement.source))),
    section("objectifs", "À la fin, je dois savoir…",
      el("ul", { class: "objectifs" }, chapitre.objectifs.map((o) => el("li", {}, texteEnrichi(o, ctx))))),
    ...chapitre.parties.map((p, i) => section(`partie-${p.id}`, `${i + 1}. ${p.titre}`, p.blocs.map((b) => rendreBloc(b, ctx)))),
    section("reperes", "Repères",
      el("div", { class: "reperes" }, chapitre.reperes.map((r) => el("div", { class: "repere" },
        el("span", { class: "type" }, TYPES_REPERES[r.type] || r.type),
        el("span", { class: "valeur" }, texteEnrichi(r.valeur, ctx)),
        el("span", {}, texteEnrichi(r.libelle, ctx), " ", badgeCertitude(r)),
        ligneSource(r.source))))),
    section("synthese", "Synthèse", rendreSynthese(chapitre.synthese, ctx)),
    section("fiche", "Fiche de révision",
      el("div", { class: "fiche" },
        el("ul", {}, chapitre.fiche.map((f) => el("li", {}, texteEnrichi(f, ctx)))),
        el("button", { type: "button", class: "bouton discret-btn", onclick: () => window.print(), style: { "margin-top": "var(--e3)" } }, icone("fiche"), "Imprimer la page"))),
    section("quiz", "Mini-quiz",
      creerQuiz(chapitre.quiz, { titre: "Quiz du chapitre", ctx, surFin: (bonnes, total) => { noterQuiz(cle, bonnes, total); verifierBadgesProgression(catalogue); } })),
  ];

  // Boutons « Chapitre maîtrisé » et « Favori »
  const boutonMaitrise = el("button", { type: "button", class: "bouton", "aria-pressed": String(statutChapitre(cle) === "maitrise"), onclick: () => {
    const devient = statutChapitre(cle) !== "maitrise";
    definirStatut(cle, devient ? "maitrise" : "en-cours");
    boutonMaitrise.setAttribute("aria-pressed", String(devient));
    if (devient) { lancerConfettis(); notifier("Chapitre maîtrisé, bravo !"); verifierBadgesProgression(catalogue); }
  } }, icone("valide"), "Chapitre maîtrisé");
  const idFavori = `chapitre:${cle}`;
  const boutonFavori = el("button", { type: "button", class: "bouton", "aria-pressed": String(estFavori(idFavori)), onclick: () => {
    const f = basculerFavori(idFavori);
    boutonFavori.setAttribute("aria-pressed", String(f));
    notifier(f ? "Ajouté aux favoris" : "Retiré des favoris");
  } }, icone("favori"), "Favori");

  const liensSommaire = sections.map(([id, titre]) => el("li", {}, el("a", { href: `${route}?partie=${id}`, "data-cible": id, onclick: (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    document.getElementById(`t-${id}`)?.focus({ preventScroll: true });
  } }, titre)));
  const sommaire = el("nav", { class: "sommaire", "aria-label": "Sommaire du chapitre" }, el("p", { class: "nav-titre", style: { margin: "0 0 var(--e2)" } }, "Sommaire"), el("ol", {}, liensSommaire));
  const sommaireMobile = el("details", { class: "sommaire-mobile" }, el("summary", {}, "Sommaire du chapitre"),
    el("ol", {}, sections.map(([id, titre]) => el("li", {}, el("a", { href: `${route}?partie=${id}`, onclick: (e) => { e.preventDefault(); e.target.closest("details").open = false; document.getElementById(id)?.scrollIntoView(); } }, titre)))));

  // Surligne la section en cours de lecture dans le sommaire
  let observateur = null;
  if ("IntersectionObserver" in window) {
    observateur = new IntersectionObserver((entrees) => {
      for (const e of entrees) if (e.isIntersecting) {
        sommaire.querySelectorAll("a").forEach((a) => a.classList.toggle("actif", a.dataset.cible === e.target.id));
      }
    }, { rootMargin: "-20% 0px -70% 0px" });
  }

  const vue = el("div", { class: "vue" },
    ariane([["Accueil", "#/"], [m.nom, `#/m/${m.id}`], [chapitre.titre]]),
    enteteMatiere(m, null, chapitre.titre),
    el("div", { class: "mise-chapitre", style: { "margin-top": "var(--e5)" } },
      el("article", { class: "lecture" }, sommaireMobile, corps,
        el("div", { class: "actions-chapitre" }, boutonMaitrise, boutonFavori,
          el("a", { class: "bouton discret-btn", href: `#/m/${m.id}/exercices` }, icone("crayon"), "Exercices"),
          el("a", { class: "bouton discret-btn", href: `#/m/${m.id}/glossaire` }, icone("definition"), "Glossaire")),
        el("p", { class: "discret" }, `Dernière relecture : ${chapitre.maj}.`)),
      sommaire));

  requestAnimationFrame(() => {
    corps.forEach((s) => observateur?.observe(s));
    if (requete.partie) document.getElementById(requete.partie)?.scrollIntoView();
  });
  return vue;
}
