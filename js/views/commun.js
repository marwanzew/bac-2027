/* =========================================================
   views/commun.js — éléments partagés entre les vues :
   fil d'Ariane, en-tête de matière, blocs de cours, fenêtre de
   définition (glossaire).
   ========================================================= */

import { el, icone, texteEnrichi, badgeCertitude, ligneSource, normaliser } from "../render.js";
import { rendreTableau, rendreSchema } from "../synthese.js";

export function ariane(elements) {
  return el("nav", { class: "ariane", "aria-label": "Fil d'Ariane" },
    el("ol", {}, elements.map(([libelle, lien], i) => el("li", {},
      lien && i < elements.length - 1 ? el("a", { href: lien }, libelle) : el("span", { "aria-current": "page" }, libelle)))));
}

/** En-tête : icône + nom de la matière. Si `titre` est donné, il devient le h1
    et le nom de la matière s'affiche au-dessus, en petit. */
export function enteteMatiere(m, sousTitre, titre) {
  const texte = titre
    ? [el("p", { class: "surtitre" }, m.nom), el("h1", { tabindex: "-1" }, titre)]
    : [el("h1", { tabindex: "-1" }, m.nom), sousTitre ? el("p", { class: "discret", style: { margin: 0 } }, sousTitre) : null];
  return el("header", { class: "entete-matiere" + (titre ? " avec-titre" : "") },
    el("span", { class: "icone-matiere" }, icone(m.icone)), el("div", {}, texte));
}

/** Contexte des textes enrichis : clic sur [[terme]] → définition. */
export function contexteGlossaire(entrees) {
  const parTerme = new Map();
  for (const e of entrees) { parTerme.set(normaliser(e.terme), e); parTerme.set(e.id, e); }
  return {
    surTerme(terme) {
      const e = parTerme.get(normaliser(terme)) || parTerme.get(terme);
      if (e) ouvrirDefinition(e);
    },
    trouver(id) { return parTerme.get(id) || parTerme.get(normaliser(id)); },
  };
}

/** Fenêtre modale accessible (élément <dialog> natif). */
export function ouvrirDefinition(e) {
  const fermer = el("button", { type: "button", class: "bouton", autofocus: true, onclick: () => dlg.close() }, "Fermer");
  let dlg;
  dlg = el("dialog", { class: "carte", "aria-labelledby": "dlg-titre", style: { "max-width": "560px", "border-radius": "var(--rayon)", color: "var(--texte)" } },
    el("h2", { id: "dlg-titre", style: { "margin-top": 0 } }, e.terme, " ", badgeCertitude(e)),
    e.traduction ? el("p", { class: "discret" }, `${e.traduction.cible} — ${e.traduction.fr}`) : null,
    el("p", {}, texteEnrichi(e.definition)),
    e.exemple ? el("p", { class: "discret" }, "Exemple : ", texteEnrichi(e.exemple)) : null,
    ligneSource(e.source),
    el("div", { class: "ligne" }, fermer));
  dlg.addEventListener("close", () => dlg.remove());
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  document.body.append(dlg);
  dlg.showModal();
}

const ENCADRES = {
  "a-retenir": ["ampoule", "À retenir"],
  piege: ["alerte", "Attention, piège"],
  exemple: ["exemple", "Exemple"],
  "plus-loin": ["boussole", "Pour aller plus loin — hors programme"],
};

/** Rendu d'un bloc de cours (format schemas/chapitre.schema.json). */
export function rendreBloc(b, ctx) {
  switch (b.type) {
    case "paragraphe":
      return el("p", {}, texteEnrichi(b.texte, ctx));
    case "liste":
      return el(b.ordonnee ? "ol" : "ul", {}, b.items.map((t) => el("li", {}, texteEnrichi(t, ctx))));
    case "definition": {
      const e = ctx.trouver?.(b.glossaire);
      if (!e) return el("p", { class: "badge-verifier" }, `Définition introuvable : ${b.glossaire}`);
      return el("aside", { class: "encadre definition", "aria-label": `Définition : ${e.terme}` },
        el("div", { class: "encadre-titre" }, icone("definition"), "Définition ", badgeCertitude(e)),
        el("p", {}, el("strong", { class: "terme" }, e.terme), " : ", texteEnrichi(e.definition, ctx)),
        ligneSource(e.source));
    }
    case "a-retenir": case "piege": case "exemple": case "plus-loin": {
      const [ic, libelle] = ENCADRES[b.type];
      return el("aside", { class: `encadre ${b.type}` },
        el("div", { class: "encadre-titre" }, icone(ic), b.titre ? `${libelle} : ${b.titre}` : libelle),
        el("p", {}, texteEnrichi(b.texte, ctx)));
    }
    case "citation":
      return el("figure", { class: "encadre citation" },
        el("div", { class: "encadre-titre" }, icone("citation"), "Citation ", badgeCertitude(b)),
        el("blockquote", {}, b.texte),
        el("figcaption", {}, texteEnrichi(`${b.auteur}, ${b.oeuvre}${b.reference ? ", " + b.reference : ""}`)),
        ligneSource(b.source));
    case "tableau":
      return rendreTableau(b, ctx);
    case "schema":
      return rendreSchema(b);
    default:
      return null;
  }
}

export function messageErreur(err) {
  return el("div", { class: "carte vide", role: "alert" },
    el("h1", { tabindex: "-1" }, "Contenu indisponible"),
    el("p", {}, err?.message || "Une erreur est survenue."),
    el("p", {}, el("a", { href: "#/" }, "Retour à l'accueil")));
}
