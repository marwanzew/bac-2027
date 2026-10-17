/* =========================================================
   quiz.js — QCM : une question à la fois, correction immédiate,
   explication affichée pour CHAQUE réponse, score final.
   Utilisé pour le mini-quiz des chapitres et les exercices QCM.
   ========================================================= */

import { el, remplacer, texteEnrichi, badgeCertitude, icone } from "./render.js";

/**
 * @param {Array} questions  questions au format schemas/qcm.schema.json
 * @param {object} options   { titre, ctx, surFin(bonnes, total) }
 */
/** Ordre aléatoire des réponses : la bonne réponse n'est jamais toujours au même endroit. */
function melanger(liste) {
  const copie = liste.slice();
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export function creerQuiz(questions, { titre = "Quiz", ctx = {}, surFin } = {}) {
  const racine = el("section", { class: "quiz", "aria-label": titre });
  let index = 0, bonnes = 0;
  const nom = "q" + Math.random().toString(36).slice(2, 8);

  function afficherQuestion() {
    const q = questions[index];
    const multiple = q.multiple === true;
    const annonce = el("p", { class: "verdict", role: "status", "aria-live": "polite" });
    const labels = melanger(q.choix).map((c) => {
      const entree = el("input", { type: multiple ? "checkbox" : "radio", name: nom + index, value: c.id });
      const label = el("label", {}, entree, el("span", {}, texteEnrichi(c.texte, ctx), el("span", { class: "explication", hidden: true }, texteEnrichi(c.explication, ctx))));
      label._choix = c; label._entree = entree;
      return label;
    });
    const valider = el("button", { type: "submit", class: "bouton principal-btn" }, "Valider");
    const suivant = el("button", { type: "button", class: "bouton principal-btn", hidden: true, onclick: () => {
      index += 1;
      if (index < questions.length) afficherQuestion(); else afficherScore();
    } }, index + 1 < questions.length ? "Question suivante" : "Voir mon score");

    const formulaire = el("form", { onsubmit: (e) => {
      e.preventDefault();
      const coches = labels.filter((l) => l._entree.checked);
      if (!coches.length) { annonce.textContent = "Choisis au moins une réponse."; return; }
      const juste = labels.every((l) => l._entree.checked === l._choix.correct);
      if (juste) bonnes += 1;
      for (const l of labels) {
        l._entree.disabled = true;
        if (l._choix.correct) l.classList.add("juste");
        else if (l._entree.checked) l.classList.add("faux");
        l.querySelector(".explication").hidden = false;
      }
      annonce.textContent = juste ? "Bonne réponse !" : "Pas tout à fait : lis les explications.";
      annonce.className = "verdict " + (juste ? "ok" : "ko");
      valider.hidden = true;
      suivant.hidden = false;
      suivant.focus();
    } },
      el("fieldset", {},
        el("legend", {}, texteEnrichi(q.enonce, ctx), " ", badgeCertitude(q)),
        multiple ? el("p", { class: "discret" }, "Plusieurs réponses possibles.") : null,
        el("div", { class: "choix" }, labels)),
      annonce,
      el("div", { class: "ligne", style: { "margin-top": "var(--e4)" } }, valider, suivant));

    remplacer(racine,
      el("div", { class: "quiz-entete" }, el("span", {}, titre), el("span", {}, `Question ${index + 1} sur ${questions.length}`)),
      formulaire);
  }

  function afficherScore() {
    const total = questions.length;
    const message = bonnes === total ? "Parfait, tout est juste."
      : bonnes >= total / 2 ? "Bien. Relis les explications des erreurs."
      : "Reprends le cours, puis retente le quiz.";
    remplacer(racine,
      el("div", { class: "score-final", role: "status" },
        el("p", {}, "Ton score"),
        el("strong", {}, `${bonnes} / ${total}`),
        el("p", {}, message),
        el("button", { type: "button", class: "bouton", onclick: () => { index = 0; bonnes = 0; afficherQuestion(); } }, icone("recommencer"), "Recommencer")));
    surFin?.(bonnes, total);
  }

  afficherQuestion();
  return racine;
}
