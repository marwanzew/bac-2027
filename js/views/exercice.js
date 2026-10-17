/* =========================================================
   views/exercice.js — un exercice.
   Mode « Entraînement » : méthode visible, correction disponible.
   Mode « Épreuve » : chronomètre, méthode cachée, correction
   accessible seulement après « Terminer ».
   ========================================================= */

import { el, icone, remplacer, texteEnrichi, badgeCertitude, ligneSource, notifier } from "../render.js";
import { etatExercice, marquerExercice } from "../storage.js";
import { chargerTousExercices, chargerGlossaire } from "../data.js";
import { rendreTableau } from "../synthese.js";
import { creerQuiz } from "../quiz.js";
import { ariane, enteteMatiere, contexteGlossaire, rendreBloc } from "./commun.js";
import { LIBELLE_DIFFICULTE } from "./matiere.js";

function format(sec) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60), ss = s % 60;
  const z = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${z(mn)}:${z(ss)}` : `${z(mn)}:${z(ss)}`;
}

export async function vueExercice({ m, params, contexte }) {
  const tous = await chargerTousExercices(m);
  const x = tous.find((e) => e.id === params.exercice);
  if (!x) throw new Error("Exercice introuvable.");
  const ctx = contexteGlossaire(await chargerGlossaire(m));
  const cle = `${m.id}/${x.id}`;
  const titreChap = m.chapitres.find((c) => c.id === x.chapitre)?.titre;
  const zone = el("div", { class: "pile" });
  let minuteur = null;
  contexte.nettoyer = () => clearInterval(minuteur);

  const origine = x.origine.type === "annale"
    ? el("p", { class: "mention-origine" }, `Sujet officiel : ${x.origine.session}, ${x.origine.centre}. `, ligneSource(x.origine.source))
    : el("p", { class: "mention-origine" }, "Créé pour s'entraîner, au format bac. Ce n'est pas un ancien sujet.");

  const documents = (x.documents || []).map((d, i) => el("figure", { class: "document" },
    el("figcaption", {}, el("strong", {}, `Document ${i + 1} — ${d.titre}`), " ", badgeCertitude(d)),
    typeof d.contenu === "string" ? el("p", {}, texteEnrichi(d.contenu, ctx)) : rendreTableau(d.contenu, ctx),
    ligneSource(d.source)));

  const bareme = el("section", {}, el("h2", {}, "Barème indicatif"),
    el("div", { class: "tableau-conteneur" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Critère"), el("th", { scope: "col" }, "Points"))),
      el("tbody", {}, x.bareme.map((b) => el("tr", {}, el("td", {}, b.critere), el("td", {}, String(b.points).replace(".", ",")))),
        el("tr", {}, el("th", { scope: "row" }, "Total"), el("td", {}, String(x.bareme.reduce((s, b) => s + b.points, 0)).replace(".", ",")))))));

  const boutonsEtat = el("div", { class: "ligne" },
    el("span", { class: "discret" }, "Mon résultat :"),
    ["reussi", "a-refaire"].map((v) => el("button", { type: "button", class: "bouton", "aria-pressed": String(etatExercice(cle) === v), onclick: (e) => {
      marquerExercice(cle, v);
      e.currentTarget.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
      notifier(v === "reussi" ? "Exercice marqué réussi" : "Exercice à refaire");
    } }, v === "reussi" ? "Réussi" : "À refaire")));

  function afficher(mode) {
    clearInterval(minuteur);
    const epreuve = mode === "epreuve";
    const enonce = el("section", {}, el("h2", {}, "Énoncé"), x.enonce.map((t) => el("p", {}, texteEnrichi(t, ctx))), documents);
    const methode = el("details", { class: "encadre a-retenir" }, el("summary", { class: "encadre-titre" }, icone("ampoule"), "Méthode"),
      el("ol", {}, x.methode.map((t) => el("li", {}, texteEnrichi(t, ctx)))));

    if (x.type === "qcm") {
      remplacer(zone, enonce, epreuve ? null : methode,
        creerQuiz(x.qcm, { titre: x.titre, ctx, surFin: (bonnes, total) => marquerExercice(cle, bonnes === total ? "reussi" : "a-refaire", Math.round((bonnes / total) * 20)) }),
        boutonsEtat);
      return;
    }

    const corrige = el("details", { class: "corrige" },
      el("summary", { class: "bouton" }, "Afficher la correction"),
      el("div", { class: "carte" }, x.corrige.map((b) => rendreBloc(b, ctx))));
    const reponse = el("label", {}, el("span", { class: "discret" }, "Ma réponse (brouillon, non enregistré)"), el("textarea", { class: "zone-reponse" }));

    if (!epreuve) {
      remplacer(zone, enonce, methode, reponse, corrige, bareme, boutonsEtat);
      return;
    }
    // Mode épreuve
    let reste = x.dureeMinutes * 60;
    const temps = el("span", { class: "temps", role: "timer", "aria-live": "off" }, format(reste));
    const terminer = el("button", { type: "button", class: "bouton principal-btn" }, "Terminer");
    const bandeau = el("div", { class: "bandeau-epreuve" }, el("span", {}, "Mode épreuve"), temps, terminer);
    const finir = () => {
      clearInterval(minuteur);
      remplacer(zone, el("p", { class: "verdict", role: "status" }, reste > 0 ? `Terminé avec ${format(reste)} d'avance.` : "Temps écoulé."), enonce, reponse, corrige, bareme, boutonsEtat);
      reponse.querySelector("textarea").value = brouillon.value;
    };
    terminer.addEventListener("click", finir);
    const brouillon = el("textarea", { class: "zone-reponse", "aria-label": "Ma réponse" });
    remplacer(zone, bandeau, enonce, el("label", {}, el("span", { class: "discret" }, "Ma réponse"), brouillon));
    minuteur = setInterval(() => {
      reste -= 1;
      temps.textContent = format(reste);
      if (reste === Math.floor(x.dureeMinutes * 30)) notifier("Mi-temps.");
      if (reste === 300 && x.dureeMinutes > 10) notifier("Plus que 5 minutes.");
      temps.classList.toggle("alerte", reste <= 60);
      if (reste <= 0) finir();
    }, 1000);
  }

  const boutonsMode = el("div", { class: "segmente", role: "group", "aria-label": "Mode" },
    [["entrainement", "Entraînement"], ["epreuve", "Épreuve"]].map(([v, l]) => el("button", { type: "button", "aria-pressed": String(v === "entrainement"), onclick: (e) => {
      boutonsMode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
      afficher(v);
    } }, l)));

  afficher("entrainement");
  return el("div", { class: "vue" },
    ariane([["Accueil", "#/"], [m.nom, `#/m/${m.id}`], ["Exercices", `#/m/${m.id}/exercices`], [x.titre]]),
    enteteMatiere(m, null, x.titre),
    el("article", { class: "lecture pile", style: { "margin-top": "var(--e5)" } },
      titreChap ? el("p", { class: "discret", style: { margin: 0 } }, "Chapitre : ", titreChap) : null,
      el("p", { class: "ligne" },
        el("span", { class: "etiquette" }, x.type === "qcm" ? "QCM" : x.type.replace(/-/g, " ")),
        el("span", { class: "etiquette" }, LIBELLE_DIFFICULTE[x.difficulte]),
        el("span", { class: "etiquette" }, `${x.dureeMinutes} min conseillées`)),
      origine,
      boutonsMode,
      zone));
}
