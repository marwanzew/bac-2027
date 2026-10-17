/* =========================================================
   views/matiere.js — page matière : onglets Leçons / Exercices /
   Glossaire. Les matières sans cours (Grand oral, EPS) sont
   rendues par views/page.js.
   ========================================================= */

import { el, remplacer } from "../render.js";
import { statutChapitre, etatExercice } from "../storage.js";
import { progresMatiere } from "../progres.js";
import { chargerTousExercices } from "../data.js";
import { ariane, enteteMatiere } from "./commun.js";

const LIBELLE_STATUT = { "a-faire": "À faire", "en-cours": "En cours", maitrise: "Maîtrisé" };
export const LIBELLE_DIFFICULTE = { facile: "Facile", moyen: "Moyen", bac: "Niveau bac" };

export function onglets(m, actif) {
  const items = [["lecons", "Leçons", `#/m/${m.id}`], ["exercices", "Exercices", `#/m/${m.id}/exercices`]];
  if (m.glossaire) items.push(["glossaire", "Glossaire", `#/m/${m.id}/glossaire`]);
  return el("nav", { class: "onglets", "aria-label": "Sections de la matière" },
    items.map(([id, libelle, lien]) => el("a", { href: lien, "aria-current": id === actif ? "page" : null }, libelle)));
}

export function vueLecons({ m }) {
  const p = progresMatiere(m);
  const groupes = [];
  for (const c of m.chapitres) {
    let g = groupes.find((x) => x.nom === c.groupe);
    if (!g) groupes.push(g = { nom: c.groupe, chapitres: [] });
    g.chapitres.push(c);
  }
  let numero = 0;
  return el("div", { class: "vue" },
    ariane([["Accueil", "#/"], [m.nom]]),
    enteteMatiere(m, `${p.maitrises} / ${p.total} chapitres maîtrisés · ${m.bac.evaluation === "controle-continu" ? "contrôle continu" : "épreuve finale"}, coefficient ${String(m.bac.coefficient).replace(".", ",")}`),
    onglets(m, "lecons"),
    el("p", { class: "discret lecture" }, "Programme : ", m.programme.intitule, " — ", m.programme.source.titre, "."),
    groupes.map((g) => el("section", { class: "groupe-chapitres" },
      el("h2", {}, g.nom),
      el("ol", { class: "liste-chapitres" }, g.chapitres.map((c) => {
        numero += 1;
        const statut = statutChapitre(`${m.id}/${c.id}`);
        const contenu = [
          el("span", { class: "num", "aria-hidden": "true" }, String(numero)),
          el("span", { class: "titre" }, c.titre),
          c.evaluableEcrit === true ? el("span", { class: "etiquette" }, "Évaluable à l'écrit") : null,
          c.evaluableEcrit === false ? el("span", { class: "etiquette" }, "Hors épreuve écrite") : null,
          c.fichier ? el("span", { class: `statut ${statut}` }, LIBELLE_STATUT[statut]) : el("span", { class: "statut" }, "Bientôt"),
        ];
        return el("li", {}, c.fichier
          ? el("a", { class: "ligne-chapitre", href: `#/m/${m.id}/c/${c.id}` }, contenu)
          : el("div", { class: "ligne-chapitre indisponible", "aria-disabled": "true" }, contenu));
      })))));
}

export async function vueExercices({ m, requete }) {
  const tous = await chargerTousExercices(m);
  const titreChap = Object.fromEntries(m.chapitres.map((c) => [c.id, c.titre]));
  const liste = el("div", { class: "grille" });
  const filtres = { difficulte: requete.difficulte || "", etat: "" };

  function dessiner() {
    const visibles = tous.filter((x) => (!filtres.difficulte || x.difficulte === filtres.difficulte)
      && (!filtres.etat || (etatExercice(`${m.id}/${x.id}`) || "a-faire") === filtres.etat));
    remplacer(liste, visibles.length ? visibles.map((x) => {
      const etat = etatExercice(`${m.id}/${x.id}`);
      return el("a", { href: `#/m/${m.id}/x/${x.id}`, class: "carte carte-exercice", style: { "text-decoration": "none" } },
        el("div", { class: "ligne entre" },
          el("span", { class: "etiquette" }, x.type === "qcm" ? "QCM" : x.type.replace(/-/g, " ")),
          el("span", { class: "difficulte" }, LIBELLE_DIFFICULTE[x.difficulte])),
        el("h3", {}, x.titre),
        el("span", { class: "discret" }, titreChap[x.chapitre] || ""),
        el("span", { class: "discret" }, `${x.dureeMinutes} min conseillées`, etat ? ` · ${etat === "reussi" ? "Réussi" : "À refaire"}` : ""));
    }) : el("p", { class: "vide" }, tous.length ? "Aucun exercice ne correspond à ces filtres." : "Les exercices de cette matière arrivent à l'étape 3."));
  }

  const choix = (nom, options) => el("label", { class: "ligne" }, el("span", { class: "discret" }, nom),
    el("select", { class: "champ", style: { width: "auto", "min-height": "44px" }, onchange: (e) => { filtres[nom === "Difficulté" ? "difficulte" : "etat"] = e.target.value; dessiner(); } },
      options.map(([v, l]) => el("option", { value: v, selected: (nom === "Difficulté" ? filtres.difficulte : filtres.etat) === v }, l))));

  dessiner();
  return el("div", { class: "vue" },
    ariane([["Accueil", "#/"], [m.nom, `#/m/${m.id}`], ["Exercices"]]),
    enteteMatiere(m, "Exercices créés pour s'entraîner, au format bac"),
    onglets(m, "exercices"),
    el("div", { class: "ligne", style: { "margin-bottom": "var(--e4)" } },
      choix("Difficulté", [["", "Toutes"], ["facile", "Facile"], ["moyen", "Moyen"], ["bac", "Niveau bac"]]),
      choix("État", [["", "Tous"], ["a-faire", "À faire"], ["reussi", "Réussis"], ["a-refaire", "À refaire"]])),
    liste);
}

