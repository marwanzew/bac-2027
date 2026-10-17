/* =========================================================
   views/page.js — pages sans cours : Grand oral (méthode +
   chronomètre d'entraînement) et EPS (rappel des modalités).
   Contenu : data/<matiere>/page.json
   ========================================================= */

import { el, icone, notifier } from "../render.js";
import { chargerPage, chargerGlossaire } from "../data.js";
import { ariane, enteteMatiere, rendreBloc, contexteGlossaire } from "./commun.js";

/** Chronomètre du Grand oral : préparation, exposé, échange. */
function chronoGrandOral(contexte) {
  const PHASES = [
    { nom: "Préparation", min: 20 },
    { nom: "Premier temps : présentation de la question", min: 10 },
    { nom: "Deuxième temps : échange avec le jury", min: 10 },
  ];
  let i = 0, fin = null, reste = PHASES[0].min * 60000, tic = null;
  const titre = el("p", { style: { "text-align": "center", "font-weight": "700" } });
  const chrono = el("div", { class: "chrono", role: "timer", "aria-live": "off" });
  const bouton = el("button", { type: "button", class: "bouton principal-btn" });
  const suivant = el("button", { type: "button", class: "bouton" }, "Phase suivante");
  const fmt = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  const maj = () => {
    const r = fin ? Math.max(0, fin - Date.now()) : reste;
    titre.textContent = `${i + 1}/3 · ${PHASES[i].nom}`;
    chrono.textContent = fmt(r);
    chrono.classList.toggle("alerte", r <= 60000);
    bouton.replaceChildren(icone(fin ? "pause" : "lecture"), fin ? "Pause" : "Démarrer");
    if (fin && r <= 0) { notifier(`Fin : ${PHASES[i].nom}`); passer(); }
  };
  const passer = () => {
    clearInterval(tic); fin = null;
    if (i < PHASES.length - 1) { i += 1; reste = PHASES[i].min * 60000; } else notifier("Entraînement terminé.");
    maj();
  };
  bouton.addEventListener("click", () => {
    if (fin) { reste = Math.max(0, fin - Date.now()); fin = null; clearInterval(tic); }
    else { fin = Date.now() + reste; tic = setInterval(maj, 250); }
    maj();
  });
  suivant.addEventListener("click", passer);
  const raz = el("button", { type: "button", class: "bouton discret-btn", onclick: () => { clearInterval(tic); fin = null; i = 0; reste = PHASES[0].min * 60000; maj(); } }, icone("recommencer"), "Recommencer");
  contexte.nettoyer = () => clearInterval(tic);
  maj();
  return el("section", { class: "carte pile", "aria-label": "Chronomètre du Grand oral" },
    el("h2", { style: { "margin-top": 0 } }, "Chronomètre d'entraînement"),
    titre, chrono, el("div", { class: "ligne", style: { "justify-content": "center" } }, bouton, suivant, raz));
}

export async function vuePage({ m, contexte }) {
  const page = await chargerPage(m);
  const ctx = contexteGlossaire(await chargerGlossaire(m));
  return el("div", { class: "vue" },
    ariane([["Accueil", "#/"], [m.nom]]),
    enteteMatiere(m, page?.intro),
    el("article", { class: "lecture", style: { "margin-top": "var(--e5)" } },
      page?.outil === "chrono-grand-oral" ? chronoGrandOral(contexte) : null,
      (page?.sections || []).map((s) => el("section", {}, el("h2", {}, s.titre), s.blocs.map((b) => rendreBloc(b, ctx)))),
      page?.maj ? el("p", { class: "discret" }, `Dernière vérification : ${page.maj}.`) : null));
}
