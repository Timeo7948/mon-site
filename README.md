# mon-site

## Déploiement sur GitHub Pages

Pour publier ce site sur GitHub Pages :

1. Crée un dépôt GitHub et pousse le contenu de ce dossier (`index.html`, `style.css`, `script.js`, `favicon.png`, etc.).
2. Dans **Settings → Pages**, choisis la branche `main` (ou `gh-pages`) et le dossier `/ (root)` comme source.
3. Le fichier `.nojekyll` présent empêche le traitement Jekyll (utile si tu utilises des fichiers commençant par `_`).
4. Les chemins d'assets sont relatifs (`./style.css`, `./script.js`, `./favicon.png`) — aucune configuration supplémentaire n'est nécessaire.

Le site sera disponible à l'URL fournie par GitHub Pages après quelques minutes.