/* =========================================================
   synthese.js — dessine les tableaux et les schémas décrits en JSON.
   Schéma : des boîtes (noeuds) placées dans l'ordre, en ligne ou en
   colonne, reliées par des flèches (liens). Tout est créé élément par
   élément : aucun SVG n'est copié depuis un fichier de contenu.
   ========================================================= */

import { el, svg, texteEnrichi } from "./render.js";

export function rendreTableau(t, ctx) {
  return el("div", { class: "tableau-conteneur", tabindex: "0", role: "region", "aria-label": t.titre || "Tableau" },
    el("table", {},
      t.titre ? el("caption", {}, t.titre) : null,
      el("thead", {}, el("tr", {}, t.colonnes.map((c) => el("th", { scope: "col" }, c)))),
      el("tbody", {}, t.lignes.map((ligne) =>
        el("tr", {}, ligne.map((cellule, i) => i === 0
          ? el("th", { scope: "row" }, texteEnrichi(cellule, ctx))
          : el("td", {}, texteEnrichi(cellule, ctx))))))));
}

/** Coupe un texte en lignes d'environ `max` caractères. */
function couper(texte, max = 20) {
  const lignes = [];
  let courante = "";
  for (const mot of texte.split(/\s+/)) {
    if ((courante + " " + mot).trim().length > max && courante) { lignes.push(courante); courante = mot; }
    else courante = (courante + " " + mot).trim();
  }
  if (courante) lignes.push(courante);
  return lignes;
}

export function rendreSchema(s) {
  const vertical = s.sens === "vertical";
  const L = 180, H_LIGNE = 18, PAD = 14, ECART = vertical ? 56 : 70;
  const boites = s.noeuds.map((n) => {
    const lignes = couper(n.texte);
    return { ...n, lignes, h: lignes.length * H_LIGNE + PAD * 2 };
  });
  const hMax = Math.max(...boites.map((b) => b.h));
  let x = 10, y = 10;
  for (const b of boites) {
    b.x = x; b.y = vertical ? y : 10 + (hMax - b.h) / 2;
    if (vertical) y += b.h + ECART; else x += L + ECART;
  }
  const largeur = vertical ? L + 20 + 160 : x - ECART + 10;
  const hauteur = vertical ? y - ECART + 10 : hMax + 20 + 60;
  const pos = Object.fromEntries(boites.map((b) => [b.id, b]));
  const idMarqueur = "fleche-" + Math.random().toString(36).slice(2, 8);

  const dessin = svg("svg", { viewBox: `0 0 ${largeur} ${hauteur}`, width: largeur, height: hauteur, role: "img", "aria-label": s.titre || "Schéma" },
    svg("defs", {}, svg("marker", { id: idMarqueur, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" },
      svg("path", { d: "M0 0 L10 5 L0 10 z" }))),
    s.liens.map((l) => {
      const a = pos[l.de], b = pos[l.vers];
      if (!a || !b) return null;
      let d, tx, ty;
      const voisins = Math.abs(boites.indexOf(a) - boites.indexOf(b)) === 1;
      if (vertical) {
        const ax = a.x + L / 2, bx = b.x + L / 2;
        if (voisins) {
          const [y1, y2] = a.y < b.y ? [a.y + a.h, b.y] : [a.y, b.y + b.h];
          d = `M${ax} ${y1} L${bx} ${y2}`; tx = ax + 8; ty = (y1 + y2) / 2 + 4;
        } else {
          const xd = a.x + L, y1 = a.y + a.h / 2, y2 = b.y + b.h / 2;
          d = `M${xd} ${y1} C${xd + 90} ${y1} ${xd + 90} ${y2} ${xd} ${y2}`; tx = xd + 76; ty = (y1 + y2) / 2 + 4;
        }
      } else {
        if (voisins) {
          const [x1, x2] = a.x < b.x ? [a.x + L, b.x] : [a.x, b.x + L];
          const yy = 10 + hMax / 2;
          d = `M${x1} ${yy} L${x2} ${yy}`; tx = (x1 + x2) / 2; ty = yy - 8;
        } else {
          const x1 = a.x + L / 2, x2 = b.x + L / 2, yb = 10 + hMax;
          d = `M${x1} ${yb} C${x1} ${yb + 55} ${x2} ${yb + 55} ${x2} ${yb}`; tx = (x1 + x2) / 2; ty = yb + 52;
        }
      }
      return svg("g", { class: "lien" },
        svg("path", { d, "marker-end": `url(#${idMarqueur})` }),
        l.texte ? svg("text", { x: tx, y: ty, "text-anchor": vertical ? "start" : "middle" }, l.texte) : null);
    }),
    boites.map((b) => svg("g", { class: "noeud" },
      svg("rect", { x: b.x, y: b.y, width: L, height: b.h, rx: 10 }),
      b.lignes.map((ligne, i) => svg("text", { x: b.x + L / 2, y: b.y + PAD + 13 + i * H_LIGNE, "text-anchor": "middle" }, ligne)))));

  return el("figure", { class: "schema" }, s.titre ? el("figcaption", {}, s.titre) : null, dessin);
}

export function rendreSynthese(objet, ctx) {
  return objet.type === "schema" ? rendreSchema(objet) : rendreTableau(objet, ctx);
}
