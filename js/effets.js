/* =========================================================
   effets.js — micro-interactions.
   Une lumière douce suit le pointeur sur les cartes (souris
   uniquement). Rien ne se passe sur écran tactile, ni quand
   les animations sont coupées.
   ========================================================= */

const CIBLES = ".carte-matiere, a.carte, .carte-exercice, a.ligne-chapitre, .resultat-recherche";

function animationsCoupees() {
  return document.documentElement.dataset.animations === "non" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function activerEffets() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.addEventListener("pointermove", (e) => {
    if (animationsCoupees()) return;
    const carte = e.target instanceof Element ? e.target.closest(CIBLES) : null;
    if (!carte) return;
    const r = carte.getBoundingClientRect();
    carte.style.setProperty("--mx", `${e.clientX - r.left}px`);
    carte.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });
}
