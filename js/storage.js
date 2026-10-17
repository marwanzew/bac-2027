/* =========================================================
   storage.js — progression sauvegardée dans le navigateur
   (localStorage), série de jours, badges, export / import.
   Format : schemas/progression.schema.json
   ========================================================= */

const CLE = "bac2027:progression";
const FORMAT = "bac2027-progression";
const VERSION = 1;

function progressionVide() {
  return {
    format: FORMAT,
    version: VERSION,
    chapitres: {},
    exercices: {},
    favoris: [],
    flashcards: {},
    temps: {},
    serie: { actuelle: 0, record: 0 },
    badges: [],
    reglages: { theme: "sombre", taillePourcent: 100, animations: true, pomodoro: { travail: 25, pause: 5 }, datesEpreuves: {} },
  };
}

let etat = charger();
const abonnes = new Set();

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return progressionVide();
    return migrer(JSON.parse(brut));
  } catch {
    return progressionVide(); // stockage bloqué ou illisible : on repart de zéro sans planter
  }
}

/** Met à niveau une ancienne sauvegarde et complète les champs manquants. */
function migrer(d) {
  const base = progressionVide();
  if (!d || d.format !== FORMAT) return base;
  // Version 1 : rien à transformer, on complète seulement.
  return {
    ...base, ...d,
    serie: { ...base.serie, ...(d.serie || {}) },
    reglages: { ...base.reglages, ...(d.reglages || {}), pomodoro: { ...base.reglages.pomodoro, ...((d.reglages || {}).pomodoro || {}) } },
  };
}

function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage plein ou bloqué */ }
  abonnes.forEach((f) => f(etat));
}

export function abonner(f) { abonnes.add(f); return () => abonnes.delete(f); }
export function lire() { return etat; }

/* ---------- Dates locales ---------- */
export function aujourdhui(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function veille(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return aujourdhui(new Date(a, m - 1, j - 1));
}

/* ---------- Chapitres ---------- */
export function statutChapitre(cle) { return etat.chapitres[cle]?.statut || "a-faire"; }

export function visiterChapitre(cle, route, titre) {
  const c = etat.chapitres[cle] || { statut: "a-faire" };
  if (c.statut === "a-faire") c.statut = "en-cours";
  c.derniereVisite = new Date().toISOString();
  etat.chapitres[cle] = c;
  etat.reprise = { route, titre };
  sauver();
}

export function definirStatut(cle, statut) {
  const c = etat.chapitres[cle] || {};
  c.statut = statut;
  etat.chapitres[cle] = c;
  if (statut === "maitrise") enregistrerActivite();
  sauver();
}

export function noterQuiz(cle, bonnes, total) {
  const c = etat.chapitres[cle] || { statut: "en-cours" };
  if (!c.quiz || bonnes > c.quiz.meilleur) c.quiz = { meilleur: bonnes, total };
  etat.chapitres[cle] = c;
  attribuer("premier-quiz");
  enregistrerActivite();
  sauver();
}

/* ---------- Exercices ---------- */
export function etatExercice(cle) { return etat.exercices[cle]?.etat || null; }
export function marquerExercice(cle, valeur, score) {
  etat.exercices[cle] = { etat: valeur, le: new Date().toISOString(), ...(typeof score === "number" ? { score } : {}) };
  enregistrerActivite();
  sauver();
}

/* ---------- Favoris ---------- */
export function estFavori(id) { return etat.favoris.includes(id); }
export function basculerFavori(id) {
  etat.favoris = estFavori(id) ? etat.favoris.filter((f) => f !== id) : [...etat.favoris, id];
  sauver();
  return estFavori(id);
}

/* ---------- Flashcards ---------- */
export function noterFlashcard(cle, connu) {
  const f = etat.flashcards[cle] || { connu: false, vues: 0 };
  etat.flashcards[cle] = { connu, vues: f.vues + 1 };
  sauver();
}

/* ---------- Temps de travail ---------- */
export function ajouterTemps(matiere, minutes) {
  const j = aujourdhui();
  etat.temps[j] = etat.temps[j] || {};
  etat.temps[j][matiere] = (etat.temps[j][matiere] || 0) + minutes;
  if (minutes >= 10) enregistrerActivite();
  sauver();
}

/* ---------- Série de jours et badges ---------- */
export function enregistrerActivite() {
  const j = aujourdhui();
  const s = etat.serie;
  if (s.dernierJour === j) return;
  s.actuelle = s.dernierJour === veille(j) ? s.actuelle + 1 : 1;
  s.record = Math.max(s.record, s.actuelle);
  s.dernierJour = j;
  if (s.actuelle >= 7) attribuer("serie-7");
  if (s.actuelle >= 30) attribuer("serie-30");
}

/** Série affichée : remise à 0 si un jour a été sauté. */
export function serieAffichee() {
  const s = etat.serie;
  if (!s.dernierJour) return 0;
  const j = aujourdhui();
  return s.dernierJour === j || s.dernierJour === veille(j) ? s.actuelle : 0;
}

export const BADGES = [
  { id: "premier-quiz", libelle: "Premier quiz terminé" },
  { id: "premier-chapitre", libelle: "Premier chapitre maîtrisé" },
  { id: "serie-7", libelle: "7 jours de suite" },
  { id: "serie-30", libelle: "30 jours de suite" },
  { id: "matiere-50", libelle: "Une matière à 50 %" },
  { id: "matiere-100", libelle: "Une matière à 100 %" },
];
let surBadge = () => {};
export function quandBadge(f) { surBadge = f; }

export function attribuer(id) {
  if (etat.badges.some((b) => b.id === id)) return false;
  etat.badges.push({ id, obtenuLe: new Date().toISOString() });
  sauver();
  const b = BADGES.find((x) => x.id === id);
  if (b) surBadge(b);
  return true;
}

/* ---------- Réglages ---------- */
export function reglages() { return etat.reglages; }
export function modifierReglages(modif) {
  etat.reglages = { ...etat.reglages, ...modif };
  sauver();
}

/* ---------- Export / import / réinitialisation ---------- */
export function exporter() {
  const donnees = { ...etat, exporteLe: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = `progression-bac2027-${aujourdhui()}.json`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

/** Vérifie un fichier importé avant de remplacer quoi que ce soit. */
export function importer(texte) {
  let d;
  try { d = JSON.parse(texte); } catch { throw new Error("Ce fichier n'est pas un JSON lisible."); }
  if (!d || d.format !== FORMAT) throw new Error("Ce fichier n'est pas une progression de ce site.");
  if (typeof d.version !== "number" || d.version > VERSION) throw new Error("Ce fichier vient d'une version plus récente du site.");
  for (const champ of ["chapitres", "exercices", "flashcards", "temps"]) {
    if (d[champ] && (typeof d[champ] !== "object" || Array.isArray(d[champ]))) throw new Error(`Champ « ${champ} » invalide.`);
  }
  if (d.favoris && !Array.isArray(d.favoris)) throw new Error("Champ « favoris » invalide.");
  etat = migrer(d);
  sauver();
}

export function reinitialiser() {
  const garder = etat.reglages;
  etat = progressionVide();
  etat.reglages = garder;
  sauver();
}
