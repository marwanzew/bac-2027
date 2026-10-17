/* =========================================================
   search.js — recherche locale (cours, définitions, exercices).
   L'index est construit en mémoire à la première recherche,
   à partir des fichiers de contenu. Recherche sans accents
   ni majuscules ; tous les mots tapés doivent être présents.
   ========================================================= */

import { chargerCatalogue, chargerChapitre, chargerGlossaire, chargerTousExercices } from "./data.js";
import { normaliser, texteBrut } from "./render.js";

let index = null;

async function construire() {
  const cat = await chargerCatalogue();
  const entrees = [];
  for (const m of cat.matieres) {
    for (const ref of m.chapitres) {
      const base = { matiere: m.nom, couleur: m.couleur };
      if (!ref.fichier) {
        entrees.push({ ...base, type: "Chapitre", titre: ref.titre, extrait: "Bientôt disponible", route: `#/m/${m.id}/c/${ref.id}`, texte: ref.titre });
        continue;
      }
      try {
        const { chapitre } = await chargerChapitre(m, ref.id);
        const corps = chapitre.parties.flatMap((p) => [p.titre, ...p.blocs.map((b) => b.texte || (b.items || []).join(" "))]).join(" ");
        entrees.push({ ...base, type: "Chapitre", titre: chapitre.titre, extrait: texteBrut(chapitre.objectifs[0] || ""), route: `#/m/${m.id}/c/${ref.id}`, texte: `${chapitre.titre} ${texteBrut(corps)}` });
        for (const p of chapitre.parties) {
          entrees.push({ ...base, type: "Partie de cours", titre: p.titre, extrait: chapitre.titre, route: `#/m/${m.id}/c/${ref.id}?partie=partie-${p.id}`, texte: p.titre });
        }
      } catch { /* fichier invalide : ignoré par la recherche */ }
    }
    try {
      for (const g of await chargerGlossaire(m)) {
        entrees.push({ matiere: m.nom, couleur: m.couleur, type: "Définition", titre: g.terme, extrait: texteBrut(g.definition), route: `#/m/${m.id}/glossaire?terme=${g.id}`, texte: `${g.terme} ${texteBrut(g.definition)} ${g.traduction?.cible || ""}` });
      }
      for (const x of await chargerTousExercices(m)) {
        entrees.push({ matiere: m.nom, couleur: m.couleur, type: "Exercice", titre: x.titre, extrait: texteBrut((x.enonce || [])[0] || ""), route: `#/m/${m.id}/x/${x.id}`, texte: `${x.titre} ${texteBrut((x.enonce || []).join(" "))}` });
      }
    } catch { /* ignoré */ }
  }
  return entrees.map((e) => ({ ...e, cle: normaliser(e.texte), cleTitre: normaliser(e.titre) }));
}

export async function rechercher(requete) {
  const mots = normaliser(requete).split(/\s+/).filter((m) => m.length > 1);
  if (!mots.length) return [];
  index = index || await construire();
  return index
    .filter((e) => mots.every((m) => e.cle.includes(m)))
    .map((e) => ({ ...e, score: mots.filter((m) => e.cleTitre.includes(m)).length * 10 + (e.type === "Définition" ? 3 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
}
