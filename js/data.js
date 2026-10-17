/* =========================================================
   data.js — chargement des contenus JSON (dossier data/)
   avec cache mémoire et vérifications minimales.
   Les schémas complets sont dans schemas/ (vérification hors ligne
   avec verifier.py avant de publier).
   ========================================================= */

const cache = new Map();

export class ErreurContenu extends Error {}

async function chargerJSON(chemin) {
  if (cache.has(chemin)) return cache.get(chemin);
  if (!/^data\/[a-z0-9\-/]+\.json$/.test(chemin)) throw new ErreurContenu(`Chemin refusé : ${chemin}`);
  const promesse = fetch(chemin).then(async (r) => {
    if (!r.ok) throw new ErreurContenu(`Fichier introuvable : ${chemin}`);
    try { return await r.json(); } catch { throw new ErreurContenu(`Fichier JSON mal formé : ${chemin}`); }
  });
  cache.set(chemin, promesse);
  promesse.catch(() => cache.delete(chemin));
  return promesse;
}

function exiger(objet, champs, quoi) {
  const manquants = champs.filter((c) => objet?.[c] === undefined);
  if (manquants.length) throw new ErreurContenu(`${quoi} : champ(s) manquant(s) ${manquants.join(", ")}`);
}

let catalogue = null;
export async function chargerCatalogue() {
  if (catalogue) return catalogue;
  const c = await chargerJSON("data/matieres.json");
  exiger(c, ["version", "session", "epreuves", "matieres"], "matieres.json");
  catalogue = c;
  return c;
}

export function matiere(id) {
  return catalogue?.matieres.find((m) => m.id === id) || null;
}

export async function chargerChapitre(mat, chapId) {
  const ref = mat.chapitres.find((c) => c.id === chapId);
  if (!ref) throw new ErreurContenu("Ce chapitre n'existe pas.");
  if (!ref.fichier) return { ref, chapitre: null };
  const chapitre = await chargerJSON(ref.fichier);
  exiger(chapitre, ["id", "titre", "rattachement", "objectifs", "parties", "reperes", "synthese", "fiche", "quiz"], ref.fichier);
  if (chapitre.quiz.length !== 5) throw new ErreurContenu(`${ref.fichier} : le quiz doit compter 5 questions.`);
  return { ref, chapitre };
}

export async function chargerExercices(mat, chapId) {
  const ref = mat.chapitres.find((c) => c.id === chapId);
  if (!ref?.exercices) return [];
  const d = await chargerJSON(ref.exercices);
  exiger(d, ["exercices"], ref.exercices);
  return d.exercices.map((x) => ({ ...x, chapitre: chapId }));
}

export async function chargerTousExercices(mat) {
  const listes = await Promise.all(mat.chapitres.filter((c) => c.exercices).map((c) => chargerExercices(mat, c.id)));
  return listes.flat();
}

export async function chargerGlossaire(mat) {
  if (!mat.glossaire) return [];
  const g = await chargerJSON(mat.glossaire);
  exiger(g, ["entrees"], mat.glossaire);
  return g.entrees;
}

/** Contenu d'une page « méthode » ou « rappel » (Grand oral, EPS). */
export async function chargerPage(mat) {
  if (!mat.contenuPage) return null;
  return chargerJSON(mat.contenuPage);
}

/** Liste de tous les fichiers de contenu (pour le téléchargement hors ligne). */
export function tousLesFichiers() {
  const f = ["data/matieres.json"];
  for (const m of catalogue?.matieres || []) {
    if (m.glossaire) f.push(m.glossaire);
    if (m.contenuPage) f.push(m.contenuPage);
    for (const c of m.chapitres) { if (c.fichier) f.push(c.fichier); if (c.exercices) f.push(c.exercices); }
  }
  return f;
}
