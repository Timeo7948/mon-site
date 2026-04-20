# TL.ly - Plateforme de Partage de Vidéos

Une plateforme de partage de vidéos inspirée de TikTok, utilisant Firebase Auth + MySQL + stockage local.

## ⚠️ Important

**Ce système utilise PHP/MySQL qui ne sont PAS compatibles avec GitHub Pages !**

### Options de déploiement :

1. **Local seulement** : XAMPP/WAMP sur votre PC
2. **Hébergement séparé** : Frontend sur GitHub Pages, Backend sur serveur PHP
3. **Serveur complet** : Tout sur un VPS (Heroku, DigitalOcean, etc.)

## 🚀 Installation Rapide (Local)

1. **Installer XAMPP/WAMP**
2. **Cloner/Placer** ce projet dans `htdocs/` ou `www/`
3. **Créer la base** : Importer `database.sql` dans phpMyAdmin
4. **Configurer Firebase** : Modifier `tl.html` avec votre config
5. **Ouvrir** `http://localhost/mon-site/tl.html`

## 📖 Guide Complet

Voir [TL_LY_SETUP_HYBRIDE.md](TL_LY_SETUP_HYBRIDE.md) pour les instructions détaillées.

## ✨ Fonctionnalités

- 🔐 Authentification Firebase
- 📤 Upload de vidéos MP4 (stockage local)
- 🎬 Lecteur vidéo intégré
- ❤️ Système de likes
- 💬 Commentaires
- 📱 Interface responsive
- 💾 Stockage sur votre PC

## 🛠️ Technologies

- HTML5/CSS3
- JavaScript (ES6+)
- Firebase Auth
- PHP 7+
- MySQL
- Stockage local

## 📄 Pages

- `index.html` - Page d'accueil
- `messages.html` - Messagerie (Firebase)
- `tl.html` - Plateforme TL.ly

## 🔄 Architecture

- **Frontend** : HTML/JS (peut être sur GitHub Pages)
- **Backend** : PHP API (nécessite serveur PHP)
- **Base de données** : MySQL (nécessite serveur MySQL)
- **Stockage vidéos** : Dossier local `uploads/videos/`

## 🎯 Pour Internet

Si vous voulez rendre ça accessible sur internet :

1. **Frontend** → GitHub Pages
2. **Backend** → Heroku/DigitalOcean (avec PHP/MySQL)
3. **Vidéos** → Uploader sur votre serveur OU utiliser cloud storage

Consultez le guide complet pour les détails !