"""Vérifie tous les fichiers de contenu du dossier data/ avec les schémas de schemas/.
Utilisation : python3 verifier.py   (nécessite : pip install jsonschema)"""
import json, glob, os, sys
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ICI = os.path.dirname(os.path.abspath(__file__))
reg = Registry()
schemas = {}
for f in glob.glob(os.path.join(ICI, "schemas", "*.json")):
    s = json.load(open(f, encoding="utf-8"))
    Draft202012Validator.check_schema(s)
    reg = reg.with_resource(s["$id"], Resource.from_contents(s))
    schemas[s["$id"]] = s

def valider(chemin, sid):
    try:
        d = json.load(open(os.path.join(ICI, chemin), encoding="utf-8"))
    except Exception as e:
        return [f"illisible : {e}"]
    v = Draft202012Validator(schemas[sid], registry=reg)
    return [f"{'/'.join(map(str, e.absolute_path)) or '(racine)'} : {e.message[:200]}" for e in v.iter_errors(d)]

erreurs = 0
cat = json.load(open(os.path.join(ICI, "data/matieres.json"), encoding="utf-8"))
fichiers = [("data/matieres.json", "matieres.schema.json")]
for m in cat["matieres"]:
    if m.get("glossaire"): fichiers.append((m["glossaire"], "glossaire.schema.json"))
    if m.get("contenuPage"): fichiers.append((m["contenuPage"], "page.schema.json"))
    for c in m["chapitres"]:
        if c.get("fichier"): fichiers.append((c["fichier"], "chapitre.schema.json"))
        if c.get("exercices"): fichiers.append((c["exercices"], "exercice.schema.json"))

import re, unicodedata
def norm(t):
    return "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn").strip()

ids_glossaire, termes_glossaire = {}, {}
for m in cat["matieres"]:
    if m.get("glossaire"):
        entrees = json.load(open(os.path.join(ICI, m["glossaire"]), encoding="utf-8"))["entrees"]
        ids_glossaire[m["id"]] = {e["id"] for e in entrees}
        termes_glossaire[m["id"]] = {e["id"] for e in entrees} | {norm(e["terme"]) for e in entrees}

for chemin, sid in fichiers:
    if not os.path.exists(os.path.join(ICI, chemin)):
        print(f"MANQUANT  {chemin}"); erreurs += 1; continue
    errs = valider(chemin, sid)
    # Vérification supplémentaire : chaque bloc « definition » renvoie à un terme existant du glossaire.
    if sid == "chapitre.schema.json" and not errs:
        ch = json.load(open(os.path.join(ICI, chemin), encoding="utf-8"))
        connus = ids_glossaire.get(ch["matiere"], set())
        for p in ch["parties"]:
            for b in p["blocs"]:
                if b["type"] == "definition" and b["glossaire"] not in connus:
                    errs.append(f"définition inconnue dans le glossaire : {b['glossaire']}")
    # Chaque lien [[terme]] ou [[texte|id]] doit ouvrir une définition existante.
    if not errs and sid in ("chapitre.schema.json", "exercice.schema.json"):
        brut = open(os.path.join(ICI, chemin), encoding="utf-8").read()
        mat = json.loads(brut).get("matiere")
        for lien in re.findall(r"\[\[([^\]]+)\]\]", brut):
            cible = lien.split("|")[-1].strip()
            if cible not in termes_glossaire.get(mat, set()) and norm(cible) not in termes_glossaire.get(mat, set()):
                errs.append(f"lien de glossaire sans définition : [[{lien}]]")
    # Balisage imbriqué non géré : *italique avec **gras** dedans*
    if not errs:
        def toutes_chaines(o):
            if isinstance(o, dict):
                for v in o.values(): yield from toutes_chaines(v)
            elif isinstance(o, list):
                for v in o: yield from toutes_chaines(v)
            elif isinstance(o, str):
                yield o
        for t in toutes_chaines(json.load(open(os.path.join(ICI, chemin), encoding="utf-8"))):
            if re.search(r"(?:^|(?<=[\s(«\"'—]))\*(?=[^*\s])[^*]*\*\*", t):
                errs.append(f"gras dans de l'italique (non affiché correctement) : {t[:60]}")
    # Les champs affichés tels quels (titres, libellés…) ne doivent pas contenir de balisage.
    if not errs:
        def champs_bruts(o, cle=None):
            if isinstance(o, dict):
                for k, v in o.items(): yield from champs_bruts(v, k)
            elif isinstance(o, list):
                for v in o: yield from champs_bruts(v, cle)
            elif isinstance(o, str) and cle in ("titre", "terme", "critere", "colonnes", "intitule"):
                yield o
        for t in champs_bruts(json.load(open(os.path.join(ICI, chemin), encoding="utf-8"))):
            if re.search(r"\^|\*|\[\[", t):
                errs.append(f"balisage dans un champ non enrichi : {t[:60]}")
    print(("OK        " if not errs else "ERREUR    ") + chemin)
    for e in errs: print("          - " + e)
    erreurs += len(errs)
print(f"\n{len(fichiers)} fichier(s) vérifié(s), {erreurs} erreur(s).")
sys.exit(1 if erreurs else 0)
