/* =========================================================
   theme.js — applique les réglages d'affichage : thème,
   taille du texte, animations, couleurs des matières.
   ========================================================= */

import { reglages } from "./storage.js";

let matieres = [];
const style = document.createElement("style");
style.id = "couleurs-matieres";
document.head.append(style);
const requeteClair = window.matchMedia("(prefers-color-scheme: light)");
requeteClair.addEventListener("change", () => appliquerReglages());

export function definirMatieres(liste) { matieres = liste; appliquerReglages(); }

export function themeEffectif() {
  const t = reglages().theme;
  if (t === "systeme") return requeteClair.matches ? "clair" : "sombre";
  return t === "clair" ? "clair" : "sombre";
}

export function appliquerReglages() {
  const r = reglages();
  const racine = document.documentElement;
  racine.dataset.theme = ["clair", "sombre", "systeme"].includes(r.theme) ? r.theme : "sombre";
  racine.dataset.animations = r.animations === false ? "non" : "oui";
  racine.style.setProperty("--echelle", String(Math.min(140, Math.max(90, r.taillePourcent || 100)) / 100));

  // Couleurs de chaque matière, selon le thème (valeurs vérifiées par motif #RRGGBB).
  const variante = themeEffectif() === "clair" ? "clair" : "sombre";
  const hex = /^#[0-9A-Fa-f]{6}$/;
  const lignes = matieres
    .filter((m) => /^[a-z0-9-]+$/.test(m.id) && hex.test(m.couleur?.[variante] || ""))
    .map((m) => `--c-${m.id}: ${m.couleur[variante]};`);
  style.textContent = `:root { ${lignes.join(" ")} }`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", variante === "clair" ? "#FBFBFD" : "#07080A");
}

/** Couleur de la matière courante (utilisée par --matiere). */
export function couleurMatiere(m) {
  if (!m) return null;
  return m.couleur[themeEffectif() === "clair" ? "clair" : "sombre"];
}
