# Révisions Bac 2027

Site personnel de révision du baccalauréat général, session 2027 (Terminale générale, spécialités SES et LLCER anglais).
HTML, CSS et JavaScript simples : rien à installer, rien à compiler. Fonctionne hors ligne et s'installe sur téléphone.

---

## 1. Voir le site sur ton ordinateur (avant de le publier)

Le site doit être ouvert par un petit serveur : un double-clic sur `index.html` ne suffit pas (le navigateur bloque alors le chargement des cours).

1. Décompresse le dossier `bac2027-site.zip`.
2. Ouvre un terminal dans ce dossier :
   - **Windows** : ouvre le dossier dans l'Explorateur, clique dans la barre d'adresse, tape `cmd` puis Entrée.
   - **Mac** : clic droit sur le dossier › « Nouveau terminal au dossier ».
3. Tape cette commande puis Entrée :
   ```
   python3 -m http.server 8000
   ```
   (Sous Windows, si `python3` n'est pas reconnu, essaie `python -m http.server 8000`. Si Python n'est pas installé : https://www.python.org/downloads/ , coche « Add Python to PATH » pendant l'installation.)
4. Ouvre ton navigateur à l'adresse **http://localhost:8000**
5. Pour arrêter : Ctrl + C dans le terminal.

---

## 2. Publier gratuitement sur GitHub Pages (pas à pas)

### a. Créer ton compte et ton dépôt
1. Va sur https://github.com et crée un compte gratuit (« Sign up »).
2. En haut à droite, clique sur **+** › **New repository**.
3. Nom du dépôt : par exemple `revisions-bac`. Coche **Public** (obligatoire pour GitHub Pages gratuit). Clique **Create repository**.

### b. Envoyer les fichiers
1. Sur la page du dépôt vide, clique sur le lien **uploading an existing file**.
2. Ouvre le dossier décompressé, sélectionne **tout son contenu** (pas le dossier lui-même : `index.html` doit être à la racine) et glisse-le dans la page.
3. En bas, clique **Commit changes**.

### c. Activer GitHub Pages
1. Dans le dépôt : **Settings** › **Pages** (menu de gauche).
2. Rubrique **Build and deployment** › **Source** : choisis **Deploy from a branch**.
3. **Branch** : choisis `main` et le dossier `/ (root)`, puis **Save**.
4. Attends une à deux minutes, puis recharge la page : l'adresse de ton site s'affiche, du type
   `https://ton-pseudo.github.io/revisions-bac/`

### d. L'installer sur ton téléphone
- **Android (Chrome)** : ouvre l'adresse › menu ⋮ › « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- **iPhone (Safari)** : ouvre l'adresse › bouton Partager › « Sur l'écran d'accueil ».

Après la première visite, le site fonctionne sans réseau. Dans **Paramètres**, le bouton « Tout télécharger pour le hors-ligne » enregistre tous les cours d'un coup.

### e. Mettre à jour le site plus tard
Dans le dépôt, ouvre le fichier à modifier (par exemple `data/ses/chapitres/croissance.json`), clique sur le crayon ✏️, modifie, puis **Commit changes**. Pour ajouter des fichiers : **Add file** › **Upload files**.
Quand tu modifies le code (dossiers `js/` ou `css/`), change aussi `VERSION` dans `sw.js` (par exemple `"v2"`) pour que les téléphones prennent la nouvelle version.

---

## 3. Ajouter ou corriger un contenu

Tout le contenu est dans `data/`, séparé du code :

| Fichier | Contenu |
| --- | --- |
| `data/matieres.json` | Liste des matières, de leurs chapitres (ordre du programme) et des dates d'épreuves |
| `data/<matiere>/chapitres/<id>.json` | Un chapitre de cours |
| `data/<matiere>/exercices/<id>.json` | Les exercices d'un chapitre |
| `data/<matiere>/glossaire.json` | Les définitions de la matière (glossaire et flashcards) |

Les formats exacts sont décrits dans `schemas/`. Pour vérifier tes fichiers avant de les publier :
```
pip install jsonschema
python3 verifier.py
```
Le script indique chaque erreur (champ manquant, faute de frappe, définition « à vérifier » sans raison…).

Règle de certitude : toute définition, tout repère ou chiffre porte `"certitude": "certain"` ou `"a_verifier"` avec une `"raison"` ; le site affiche alors un badge « À VÉRIFIER ».

---

## 4. Polices et apparence

La police **Inter** (licence OFL) est incluse dans `assets/fonts/` : rien à installer.

L'apparence se règle dans `css/variables.css` (couleurs, police, espacements) et `css/premium.css` (habillage final). Les animations s'arrêtent si ton appareil demande moins d'animations, ou si tu les coupes dans **Paramètres**.

---

## 5. Organisation du code

```
index.html            page unique
manifest.webmanifest  installation sur téléphone
sw.js                 hors ligne
css/                  variables.css (couleurs, polices), base.css, composants.css
js/app.js             démarrage et routes
js/router.js          navigation #/…
js/storage.js         progression, série, badges, export / import
js/render.js          création sûre des éléments (aucun innerHTML)
js/data.js            chargement des contenus
js/views/             un fichier par écran
schemas/              formats des fichiers de contenu
verifier.py           vérification des contenus
```
