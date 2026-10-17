/* =========================================================
   flashcards.js — recto : terme, verso : définition.
   Retournement au clic, à Entrée ou à la barre d'espace.
   « Je savais » / « À revoir » est enregistré ; les cartes
   « à revoir » passent en premier à la séance suivante.
   ========================================================= */

import { el, remplacer, texteEnrichi, badgeCertitude, icone } from "./render.js";
import { lire, noterFlashcard } from "./storage.js";

export function creerFlashcards(matiereId, entrees) {
  const racine = el("section", { class: "pile", "aria-label": "Flashcards" });
  const etat = lire().flashcards;
  // À revoir et jamais vues d'abord, puis celles déjà connues.
  let paquet = [...entrees].sort((a, b) => Number(!!etat[`${matiereId}/${a.id}`]?.connu) - Number(!!etat[`${matiereId}/${b.id}`]?.connu));
  let i = 0, connues = 0;

  function afficher() {
    if (i >= paquet.length) return fin();
    const e = paquet[i];
    const carte = el("button", { type: "button", class: "flashcard", "aria-label": `Carte ${i + 1} sur ${paquet.length} : ${e.terme}. Appuie pour retourner.` },
      el("div", { class: "face recto" }, el("span", { class: "discret" }, "Terme"), el("strong", {}, e.terme), e.traduction ? el("span", {}, e.traduction.cible) : null),
      el("div", { class: "face verso", "aria-hidden": "true" },
        el("span", { class: "discret" }, e.terme, " ", badgeCertitude(e)),
        el("p", {}, texteEnrichi(e.definition)),
        e.exemple ? el("p", { class: "discret" }, "Exemple : ", texteEnrichi(e.exemple)) : null));
    const verso = carte.querySelector(".verso");
    const recto = carte.querySelector(".recto");
    const boutons = el("div", { class: "ligne", style: { "justify-content": "center" }, hidden: true },
      el("button", { type: "button", class: "bouton", onclick: () => noter(false) }, icone("recommencer"), "À revoir"),
      el("button", { type: "button", class: "bouton principal-btn", onclick: () => noter(true) }, icone("valide"), "Je savais"));
    carte.addEventListener("click", () => {
      const retournee = carte.classList.toggle("retournee");
      verso.setAttribute("aria-hidden", String(!retournee));
      recto.setAttribute("aria-hidden", String(retournee));
      boutons.hidden = false;
    });
    function noter(connu) {
      noterFlashcard(`${matiereId}/${e.id}`, connu);
      if (connu) connues += 1;
      i += 1;
      afficher();
      racine.querySelector(".flashcard, button")?.focus();
    }
    remplacer(racine,
      el("p", { class: "discret", style: { "text-align": "center" } }, `Carte ${i + 1} sur ${paquet.length}`),
      el("div", { class: "flashcard-zone" }, carte),
      boutons);
  }

  function fin() {
    remplacer(racine, el("div", { class: "score-final", role: "status" },
      el("p", {}, "Séance terminée"),
      el("strong", {}, `${connues} / ${paquet.length}`),
      el("p", {}, "cartes connues"),
      el("button", { type: "button", class: "bouton", onclick: () => { i = 0; connues = 0; afficher(); } }, icone("recommencer"), "Recommencer")));
  }

  if (!paquet.length) racine.append(el("p", { class: "vide" }, "Aucune définition pour le moment."));
  else afficher();
  return racine;
}
