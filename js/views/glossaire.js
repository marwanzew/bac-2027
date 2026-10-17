/* =========================================================
   views/glossaire.js — définitions triées A→Z, recherche,
   et mode flashcards.
   ========================================================= */

import { el, icone, remplacer, texteEnrichi, badgeCertitude, ligneSource, normaliser, notifier } from "../render.js";
import { estFavori, basculerFavori } from "../storage.js";
import { chargerGlossaire } from "../data.js";
import { creerFlashcards } from "../flashcards.js";
import { ariane, enteteMatiere, contexteGlossaire } from "./commun.js";
import { onglets } from "./matiere.js";

export async function vueGlossaire({ m, requete }) {
  const entrees = (await chargerGlossaire(m)).slice().sort((a, b) => a.terme.localeCompare(b.terme, "fr", { sensitivity: "base" }));
  const ctx = contexteGlossaire(entrees);
  const zone = el("div");
  const champ = el("input", { type: "search", class: "champ", placeholder: "Filtrer les définitions…", "aria-label": "Filtrer les définitions" });

  function carte(e) {
    const id = `definition:${m.id}/${e.id}`;
    const fav = el("button", { type: "button", class: "bouton bouton-icone discret-btn", "aria-pressed": String(estFavori(id)), "aria-label": `Favori : ${e.terme}`, onclick: () => {
      const f = basculerFavori(id); fav.setAttribute("aria-pressed", String(f)); notifier(f ? "Ajouté aux favoris" : "Retiré des favoris");
    } }, icone("favori"));
    return el("article", { class: "encadre definition", id: `def-${e.id}` },
      el("div", { class: "ligne entre" }, el("h3", { style: { margin: 0 } }, e.terme, " ", badgeCertitude(e)), fav),
      e.traduction ? el("p", { class: "discret", style: { margin: 0 } }, `${e.traduction.cible} — ${e.traduction.fr}`) : null,
      el("p", {}, texteEnrichi(e.definition, ctx)),
      e.exemple ? el("p", { class: "discret" }, "Exemple : ", texteEnrichi(e.exemple, ctx)) : null,
      ligneSource(e.source));
  }

  function liste() {
    const q = normaliser(champ.value);
    const visibles = entrees.filter((e) => !q || normaliser(e.terme + " " + e.definition).includes(q));
    const blocs = [];
    let lettre = "";
    for (const e of visibles) {
      const l = normaliser(e.terme)[0]?.toUpperCase() || "#";
      if (l !== lettre) { lettre = l; blocs.push(el("h2", { class: "glossaire-lettre" }, l)); }
      blocs.push(carte(e));
    }
    remplacer(zone, el("div", { class: "pile" }, champ, el("p", { class: "discret", role: "status" }, `${visibles.length} définition(s)`), el("div", { class: "glossaire-liste" }, blocs.length ? blocs : el("p", { class: "vide" }, "Aucune définition trouvée."))));
  }
  champ.addEventListener("input", () => { const pos = champ.selectionStart; liste(); champ.focus(); champ.setSelectionRange(pos, pos); });

  const modes = el("div", { class: "segmente", role: "group", "aria-label": "Affichage" },
    [["liste", "Liste A→Z"], ["cartes", "Flashcards"]].map(([v, l]) => el("button", { type: "button", "aria-pressed": String(v === "liste"), onclick: (ev) => {
      modes.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === ev.currentTarget)));
      if (v === "liste") liste(); else remplacer(zone, creerFlashcards(m.id, entrees));
    } }, l)));

  liste();
  if (requete.terme) requestAnimationFrame(() => { const c = document.getElementById(`def-${requete.terme}`); c?.scrollIntoView({ block: "center" }); c?.classList.add("surligne"); });

  return el("div", { class: "vue" },
    ariane([["Accueil", "#/"], [m.nom, `#/m/${m.id}`], ["Glossaire"]]),
    enteteMatiere(m, `${entrees.length} définition(s)`),
    onglets(m, "glossaire"),
    el("div", { class: "lecture pile" }, modes, zone));
}
