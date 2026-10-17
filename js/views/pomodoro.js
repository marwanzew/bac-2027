/* =========================================================
   views/pomodoro.js — minuteur Pomodoro (25 / 5 min par défaut).
   Le minuteur continue si tu changes de page. Chaque séance de
   travail terminée est ajoutée à tes statistiques (matière choisie).
   ========================================================= */

import { el, icone, notifier } from "../render.js";
import { reglages, modifierReglages, ajouterTemps } from "../storage.js";
import { ariane } from "./commun.js";

// État partagé, conservé entre les visites de la page.
const etat = { phase: "travail", fin: null, resteMs: null, enCours: false, cycles: 0, matiere: "ses", tic: null };
let affichage = null;

function dureeMs(phase) { const p = reglages().pomodoro; return (phase === "travail" ? p.travail : p.pause) * 60000; }
function reste() { return etat.enCours ? Math.max(0, etat.fin - Date.now()) : (etat.resteMs ?? dureeMs(etat.phase)); }
function format(ms) { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }

function boucle() {
  clearInterval(etat.tic);
  etat.tic = setInterval(() => {
    if (reste() <= 0) {
      if (etat.phase === "travail") { etat.cycles += 1; ajouterTemps(etat.matiere, reglages().pomodoro.travail); notifier("Séance terminée : pause !"); }
      else notifier("Pause terminée : au travail !");
      etat.phase = etat.phase === "travail" ? "pause" : "travail";
      etat.fin = Date.now() + dureeMs(etat.phase);
    }
    affichage?.();
    document.title = etat.enCours ? `${format(reste())} · ${etat.phase === "travail" ? "Travail" : "Pause"}` : "Révisions Bac 2027";
  }, 250);
}

export function vuePomodoro({ catalogue }) {
  const chrono = el("div", { class: "chrono", role: "timer", "aria-live": "off" });
  const phase = el("p", { style: { "text-align": "center", "font-weight": "700" } });
  const cycles = el("p", { class: "discret", style: { "text-align": "center" } });
  const bouton = el("button", { type: "button", class: "bouton principal-btn" });

  affichage = () => {
    if (!chrono.isConnected) return;
    chrono.textContent = format(reste());
    phase.textContent = etat.phase === "travail" ? "Travail" : "Pause";
    cycles.textContent = `${etat.cycles} séance(s) de travail terminée(s) depuis l'ouverture du site`;
    bouton.replaceChildren(icone(etat.enCours ? "pause" : "lecture"), etat.enCours ? "Pause" : "Démarrer");
  };
  bouton.addEventListener("click", () => {
    if (etat.enCours) { etat.resteMs = reste(); etat.enCours = false; }
    else { etat.fin = Date.now() + reste(); etat.resteMs = null; etat.enCours = true; boucle(); }
    affichage();
  });
  const raz = el("button", { type: "button", class: "bouton", onclick: () => { etat.enCours = false; etat.phase = "travail"; etat.resteMs = null; affichage(); document.title = "Révisions Bac 2027"; } }, icone("recommencer"), "Réinitialiser");

  const choixMatiere = el("select", { class: "champ", style: { width: "auto" }, "aria-label": "Matière travaillée", onchange: (e) => { etat.matiere = e.target.value; } },
    catalogue.matieres.filter((m) => m.page !== "rappel").map((m) => el("option", { value: m.id, selected: m.id === etat.matiere }, m.nom)));
  const reglage = (cle, libelle, min, max) => el("label", { class: "ligne" }, el("span", {}, libelle),
    el("input", { type: "number", class: "champ", style: { width: "6rem" }, min: String(min), max: String(max), value: String(reglages().pomodoro[cle]), onchange: (e) => {
      const v = Math.min(max, Math.max(min, Number(e.target.value) || min));
      e.target.value = String(v);
      modifierReglages({ pomodoro: { ...reglages().pomodoro, [cle]: v } });
      if (!etat.enCours) { etat.resteMs = null; affichage(); }
    } }), el("span", { class: "discret" }, "min"));

  affichage();
  return el("div", { class: "vue lecture" },
    ariane([["Accueil", "#/"], ["Minuteur Pomodoro"]]),
    el("h1", { tabindex: "-1" }, "Minuteur Pomodoro"),
    el("section", { class: "carte pile", style: { "text-align": "center" } },
      phase, chrono, el("div", { class: "ligne", style: { "justify-content": "center" } }, bouton, raz), cycles),
    el("section", { class: "carte pile", style: { "margin-top": "var(--e4)" } },
      el("label", { class: "ligne" }, el("span", {}, "Matière travaillée"), choixMatiere),
      el("div", { class: "ligne" }, reglage("travail", "Travail", 5, 90), reglage("pause", "Pause", 1, 30)),
      el("p", { class: "discret" }, "Une séance de travail d'au moins 10 minutes compte pour ta série de jours.")));
}
