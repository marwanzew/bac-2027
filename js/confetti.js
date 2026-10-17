/* =========================================================
   confetti.js — confettis discrets (une seule salve, ~1,5 s)
   quand un chapitre passe à « maîtrisé ».
   Désactivés si prefers-reduced-motion ou si les animations
   sont coupées dans Paramètres.
   ========================================================= */

import { reglages } from "./storage.js";

export function lancerConfettis() {
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduit || reglages().animations === false) return;

  const canvas = document.createElement("canvas");
  canvas.className = "confettis";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const styles = getComputedStyle(document.documentElement);
  const couleurs = [styles.getPropertyValue("--matiere"), "#F2C14E", "#7FD1A8", "#F09AB2", "#8DB6EE"].map((c) => c.trim() || "#F2C14E");
  const particules = Array.from({ length: 42 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    taille: 5 + Math.random() * 5,
    angle: Math.random() * Math.PI,
    rotation: (Math.random() - 0.5) * 0.3,
    couleur: couleurs[Math.floor(Math.random() * couleurs.length)],
  }));

  const debut = performance.now();
  function image(t) {
    const ecoule = t - debut;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = Math.max(0, 1 - ecoule / 1500);
    for (const p of particules) {
      p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.angle += p.rotation;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.couleur;
      ctx.fillRect(-p.taille / 2, -p.taille / 4, p.taille, p.taille / 2);
      ctx.restore();
    }
    if (ecoule < 1500) requestAnimationFrame(image);
    else canvas.remove();
  }
  requestAnimationFrame(image);
}
