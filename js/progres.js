/* =========================================================
   progres.js — calcul des pourcentages de progression.
   Une matière progresse quand ses chapitres passent à « maîtrisé ».
   On compte TOUS les chapitres du programme, même ceux pas encore
   rédigés : le pourcentage reflète le programme réel.
   ========================================================= */

import { lire, attribuer } from "./storage.js";

export function progresMatiere(m) {
  const total = m.chapitres.length;
  if (!total) return { total: 0, maitrises: 0, pourcent: 0 };
  const etat = lire();
  const maitrises = m.chapitres.filter((c) => etat.chapitres[`${m.id}/${c.id}`]?.statut === "maitrise").length;
  return { total, maitrises, pourcent: Math.round((maitrises / total) * 100) };
}

export function progresGlobal(catalogue) {
  let total = 0, maitrises = 0;
  for (const m of catalogue.matieres) {
    if (m.page !== "cours") continue;
    const p = progresMatiere(m);
    total += p.total; maitrises += p.maitrises;
  }
  return total ? Math.round((maitrises / total) * 100) : 0;
}

/** Attribue les badges liés à la progression (appelé après chaque changement de statut). */
export function verifierBadgesProgression(catalogue) {
  const etat = lire();
  if (Object.values(etat.chapitres).some((c) => c.statut === "maitrise")) attribuer("premier-chapitre");
  for (const m of catalogue.matieres) {
    if (m.page !== "cours") continue;
    const p = progresMatiere(m).pourcent;
    if (p >= 50) attribuer("matiere-50");
    if (p >= 100) attribuer("matiere-100");
  }
}
