# TL.ly - Guide Hybride (Firebase Auth + MySQL + Stockage Local)

## 📝 Architecture

```
TL.ly utilise une architecture HYBRIDE:
┌─────────────────────────────────────┐
│         Frontend (HTML/JS)           │
│    - Interface utilisateur           │
│    - Upload fichiers MP4             │
│    - Lecteur vidéo                   │
└──────────────┬──────────────────────┘
               │
      ┌────────┴──────────┐
      │                   │
   [Firebase Auth]    [PHP Backend]
   - Authentification    - Upload MP4
   - Gestion sessions    - MySQL DB
      │                   │
      └────────┬──────────┘
               │
   ┌───────────┴──────────────┐
   │                          │
[MySQL Database]      [uploads/videos/]
- Métadonnées vidéos   - Fichiers MP4 locaux
- Likes                 - Stockage sur votre PC
- Commentaires
```

## ⚠️ Important: Hébergement Séparé

**GitHub Pages ne supporte pas PHP/MySQL !**

Pour utiliser ce système hybride sur internet, vous devez :

### Option 1: Hébergement PHP/MySQL séparé
- **Frontend** : GitHub Pages (HTML/JS)
- **Backend** : Serveur PHP/MySQL (Heroku, DigitalOcean, etc.)
- **Stockage** : Sur votre serveur (les vidéos restent sur votre PC)

### Option 2: Serveur complet local
- Tout sur votre PC avec XAMPP/WAMP
- Accessible seulement en local (http://localhost)

## ⚙️ Installation Pas à Pas

### ÉTAPE 1: Base de Données MySQL

```bash
# Option 1: Via PhpMyAdmin (XAMPP/WAMP)
Naviguer vers http://localhost/phpmyadmin/
- Créer une base: "tl_ly"
- Importer le fichier database.sql

# Option 2: Ligne de commande
mysql -u root -p < database.sql

# Option 3: GUI (MySQL Workbench)
Ouvrir database.sql et exécuter
```

### ÉTAPE 2: Configuration PHP

Éditer `api/tl-api.php` (Lignes 24-27):
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');      // Votre utilisateur MySQL
define('DB_PASS', '');          // Votre mot de passe MySQL
define('DB_NAME', 'tl_ly');
```

### ÉTAPE 3: Configuration Firebase

Modifier `tl.html` avec votre config Firebase :
```javascript
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCBLJ4LiDiNfvR84yjweqGn3_9sCmw5MlY",
    authDomain: "303888252700-doaj8tsdrpmp1guboics9b3vb59sekhu.apps.googleusercontent.com",
    projectId: "darkhub-a1a3d"
};
```

### ÉTAPE 4: Test Local

1. **Démarrer XAMPP/WAMP**
2. **Ouvrir** `tl.html` dans votre navigateur
3. **Tester** l'inscription/connexion
4. **Uploader** une vidéo MP4

## 🌐 Déploiement sur Internet

### Pour le Frontend (GitHub Pages)
```bash
git add .
git commit -m "TL.ly hybride prêt"
git push
```
- Activer GitHub Pages dans Settings
- Frontend accessible à `https://votre-username.github.io/repo/`

### Pour le Backend (Serveur PHP)
Vous devez déployer `api/` et `database.sql` sur un serveur PHP/MySQL :

#### Option A: Heroku (Gratuit)
1. Créer une app Heroku
2. Connecter votre base de données MySQL (ClearDB)
3. Déployer le dossier `api/`
4. Modifier `API_URL` dans `tl.js` vers votre URL Heroku

#### Option B: DigitalOcean/VPS
1. Serveur Ubuntu avec Apache/PHP/MySQL
2. Uploader les fichiers
3. Configurer la base de données
4. Modifier `API_URL` dans `tl.js`

### ⚠️ Problème du Stockage Local

**Les vidéos sont stockées sur VOTRE PC !**

Pour que les vidéos soient accessibles sur internet :
- Vous devez uploader `uploads/videos/` sur votre serveur
- OU utiliser un système de stockage cloud (AWS S3, etc.)
- OU garder tout local (pas d'accès internet)

## 🔧 Fonctionnalités

- ✅ **Authentification Firebase** (Email/Password)
- ✅ **Upload MP4** vers stockage local
- ✅ **Stockage métadonnées** dans MySQL
- ✅ **Lecteur vidéo** avec prévisualisation
- ✅ **Système de likes** en temps réel
- ✅ **Commentaires** par vidéo
- ✅ **Interface responsive**

## 📁 Structure des Fichiers

```
mon-site/
├── tl.html          # Page principale
├── tl.js            # Logique frontend
├── tl.css           # Styles
├── api/
│   └── tl-api.php   # Backend PHP
├── uploads/
│   └── videos/      # Stockage vidéos local
├── database.sql     # Schema MySQL
└── README.md
```

## 🚀 Utilisation

1. **Inscription/Connexion** avec Firebase
2. **Upload de vidéos** (stockées localement)
3. **Navigation** dans le feed
4. **Interaction** (like, commentaires)

## 🔒 Sécurité

- Authentification obligatoire pour upload
- Vérification du type MIME des fichiers
- Limite de taille des fichiers (500MB)
- Protection XSS avec `escapeHtml()`

## 🛠️ Développement

Pour tester localement :
```bash
# Avec XAMPP/WAMP démarré
# Ouvrir http://localhost/mon-site/tl.html
```

## 📊 Base de Données MySQL

Tables créées :
- `videos` : Métadonnées des vidéos
- `likes` : Système de likes
- `comments` : Commentaires

## 🎯 Avantages de l'approche hybride

- **Stockage local** : Contrôle total de vos vidéos
- **Base de données** : Requêtes SQL puissantes
- **Authentification** : Firebase sécurisé
- **Coût** : Firebase gratuit pour l'auth

## ⚠️ Limitations

- **Pas de CDN** : Vidéos plus lentes à charger
- **Stockage limité** : Espace disque de votre PC/serveur
- **Sauvegarde** : Vous devez gérer vos vidéos
- **Évolutivité** : Plus difficile à scaler

Si vous voulez un système 100% cloud, utilisez plutôt Firebase Storage + Firestore !

## 🚀 Déploiement GitHub Pages

### ÉTAPE 1: Préparation du Repository

1. **Créer un repository GitHub** (public ou privé)
2. **Pousser le code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit TL.ly"
   git remote add origin https://github.com/votre-username/votre-repo.git
   git push -u origin main
   ```

### ÉTAPE 2: Activer GitHub Pages

1. Aller dans **Settings** > **Pages**
2. Sélectionner **Deploy from a branch**
3. Choisir la branche **main** et le dossier **/** (root)
4. Cliquer **Save**

### ÉTAPE 3: Configuration Firebase

1. **Aller sur [Firebase Console](https://console.firebase.google.com/)**
2. **Créer un nouveau projet** ou utiliser un existant
3. **Activer les services**:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage

4. **Configuration Firestore**:
   - Créer une base de données en mode production
   - Règles par défaut (pour commencer)

5. **Configuration Storage**:
   - Créer un bucket par défaut
   - Règles de sécurité (modifier pour permettre l'upload):
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /videos/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

6. **Récupérer la configuration**:
   - Aller dans Paramètres du projet > Général
   - Descendre à "Vos applications"
   - Copier la config SDK (apiKey, authDomain, projectId, etc.)

### ÉTAPE 4: Mise à Jour de la Configuration

Éditer `tl.html` (lignes 13-18) avec votre config Firebase:

```javascript
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCBLJ4LiDiNfvR84yjweqGn3_9sCmw5MlY",
    authDomain: "303888252700-doaj8tsdrpmp1guboics9b3vb59sekhu.apps.googleusercontent.com",
    storageBucket: "https://darkhub-a1a3d-default-rtdb.europe-west1.firebasedatabase.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### ÉTAPE 5: Déploiement

Après avoir poussé les changements:
```bash
git add .
git commit -m "Configuration Firebase pour GitHub Pages"
git push
```

GitHub Pages se mettra à jour automatiquement (peut prendre quelques minutes).

## 🔧 Fonctionnalités

- ✅ **Authentification Firebase** (Email/Password)
- ✅ **Upload MP4** vers Firebase Storage
- ✅ **Stockage métadonnées** dans Firestore
- ✅ **Lecteur vidéo** avec prévisualisation
- ✅ **Système de likes** en temps réel
- ✅ **Commentaires** par vidéo
- ✅ **Interface responsive**
- ✅ **Compatible GitHub Pages**

## 🌐 Accès

Une fois déployé, votre site sera accessible à:
`https://votre-username.github.io/votre-repo/`

## 📱 Utilisation

1. **Inscription/Connexion** avec email
2. **Upload de vidéos** (MP4, max 500MB)
3. **Navigation** dans le feed
4. **Interaction** (like, commentaires)
5. **Partage** de vidéos

## 🔒 Sécurité

- Authentification obligatoire pour upload
- Vérification du type MIME des fichiers
- Limite de taille des fichiers
- Règles Firebase Storage restrictives

## 🛠️ Développement Local

Pour tester localement:
```bash
# Installer un serveur HTTP simple
npx http-server . -p 8000

# Ou utiliser Python
python -m http.server 8000
```

Accéder à `http://localhost:8000/tl.html`

## 📊 Base de Données Firestore

La structure des collections:

```
videos/
├── {videoId}/
│   ├── firebase_uid: string
│   ├── author_email: string
│   ├── title: string
│   ├── description: string
│   ├── file_url: string
│   ├── file_path: string
│   ├── file_size: number
│   ├── views_count: number
│   ├── likes_count: number
│   ├── comments_count: number
│   ├── created_at: timestamp
│   └── updated_at: timestamp

likes/
├── {likeId}/
│   ├── video_id: string
│   ├── firebase_uid: string
│   ├── user_email: string
│   └── created_at: timestamp

comments/
├── {commentId}/
│   ├── video_id: string
│   ├── firebase_uid: string
│   ├── user_email: string
│   ├── text: string
│   └── created_at: timestamp
```

## 🎯 Optimisations Futures

- CDN pour les vidéos
- Compression automatique
- Modération de contenu
- Analytics
- Notifications push
define('DB_HOST', 'localhost');  // ← Votre hôte MySQL
define('DB_USER', 'root');        // ← Votre utilisateur
define('DB_PASS', '');            // ← Votre mot de passe
define('DB_NAME', 'tl_ly');       // ← Nom de la base
```

### ÉTAPE 3: Préparation du Serveur

```bash
# Créer le dossier pour les vidéos
mkdir -p uploads/videos
chmod 755 uploads/videos    # Linux/Mac
# Ou via l'Explorateur Windows: mon-site\uploads\videos\

# Vérifier les permissions PHP (php.ini)
upload_max_filesize = 500M
post_max_size = 500M
max_execution_time = 300
```

### ÉTAPE 4: Lancer le Serveur

```bash
# Depuis le dossier mon-site
php -S localhost:8000

# Puis accéder à:
http://localhost:8000/tl.html
```

## 🔐 Authentification Firebase

La configuration Firebase est déjà incluse dans `tl.html` (copiée depuis `messages.html`).

**Comptes de test** (à créer lors du premier accès):
- Email: `test@example.com` / Password: `Test123!`
- Email: `user@example.com` / Password: `User123!`

## 📹 Flux d'Upload Vidéo

```
1. Utilisateur clique "Poster une vidéo"
   ↓
2. Sélectionne un fichier MP4 (max 500 MB)
   ↓
3. Ajoute Titre + Description
   ↓
4. Clique "Publier"
   ↓
5. Frontend envoie FormData avec:
   - Fichier vidéo
   - Metadata (titre, description)
   - Firebase UID + Email
   ↓
6. Backend PHP:
   - Valide le fichier (type MIME, taille)
   - Génère un nom unique
   - Sauvegarde dans uploads/videos/
   - Insère les métadonnées dans MySQL
   ↓
7. Vidéo apparaît dans le flux
```

## 📊 Schéma Base de Données

### Table: videos
```
id                INT         (clé primaire)
firebase_uid      VARCHAR     (UID Firebase de l'auteur)
author_email      VARCHAR     (Email de l'auteur)
title             VARCHAR     (Titre de la vidéo)
description       TEXT        (Description optionnelle)
file_path         VARCHAR     (Chemin: uploads/videos/...)
file_size         INT         (Taille en bytes)
duration          INT         (Durée en secondes, optionnel)
views_count       INT         (Compteur de vues)
likes_count       INT         (Compteur de likes)
comments_count    INT         (Compteur de commentaires)
created_at        TIMESTAMP   (Date de création)
```

### Table: likes
```
id                INT
video_id          INT         (FK to videos)
firebase_uid      VARCHAR     (UID Firebase de l'utilisateur)
user_email        VARCHAR     (Email de l'utilisateur)
created_at        TIMESTAMP
```

### Table: comments
```
id                INT
video_id          INT         (FK to videos)
firebase_uid      VARCHAR     (UID Firebase)
user_email        VARCHAR     (Email)
text              VARCHAR     (Contenu du commentaire)
created_at        TIMESTAMP
```

## 🎮 Utilisation

### Se Connecter/Inscrire
```
1. Aller à tl.html
2. Voir l'écran de login
3. Cliquer "S'inscrire" ou "Se connecter"
4. Remplir email + mot de passe
5. Accès au flux vidéo
```

### Poster une Vidéo
```
1. Remplir le formulaire à gauche
2. Sélectionner un fichier MP4
3. Ajouter Titre (obligatoire)
4. Ajouter Description (optionnel)
5. Cliquer "Publier"
6. Attendre la progression de l'upload
7. Vidéo apparaît dans le flux
```

### Liker/Commenter
```
Cliquer sur le cœur ❤️          → Like
Cliquer sur le bulle 💬         → Écrire un commentaire
Cliquer sur le partage 📤       → Copier lien
```

## 🐛 Dépannage

| Problème | Solution |
|----------|----------|
| "Erreur de connexion MySQL" | Vérifier DB_HOST, DB_USER, DB_PASS dans tl-api.php |
| "Dossier d'upload non trouvé" | Créer `uploads/videos/` et vérifier permissions |
| "Fichier trop volumineux" | Augmenter `upload_max_filesize` et `post_max_size` |
| "Erreur Firebase" | Vérifier les credentials dans tl.html |
| "Vidéo ne s'affiche pas" | Vérifier que le chemin file_path est correct dans DB |
| "Upload lent" | Normal pour les gros fichiers, attendre... |

## 📱 Formats Acceptés

**Vidéos:**
- MP4 (H.264 + AAC) ✅
- Taille max: 500 MB
- Autres formats: Convertir en MP4 d'abord

## 🔒 Sécurité

- ✅ Authentification Firebase = Tokens sécurisés
- ✅ Validation MIME types (MP4 uniquement)
- ✅ Génération noms aléatoires (évite les collisions)
- ✅ Upload via HTTPS en production
- ✅ Validation taille fichiers
- ✅ Échappement HTML des données

## 📈 Performance

- Barre de progression lors de l'upload
- Compression automatique des logs
- DB optimisée avec indexes
- Noms de fichiers uniques (pas de conflits)

## 🚀 Déploiement Production

```bash
# 1. Vérifier les limites PHP
php.ini:
  upload_max_filesize = 500M
  post_max_size = 500M
  max_execution_time = 300

# 2. Configurer HTTPS
# Certificat SSL obligatoire

# 3. Sauvegardes régulières
# uploads/videos/ doit être backupé
# Database doit être backupé

# 4. CDN (optionnel)
# Servir les vidéos via CloudFront/Cloudflare
```

## 📞 Support

**Fichiers importants:**
- tl.html (📍 Vérifier Firebase config)
- tl.js (📍 Logique upload/affichage)
- api/tl-api.php (📍 Vérifier DB credentials)
- database.sql (📍 Importer dans MySQL)
- uploads/videos/ (📍 Doit exister et être inscriptible)

---

**Version:** 2.0 (Hybride Firebase + MySQL + MP4)
**Statut:** Production Ready ✅
**Dernière mise à jour:** Avril 2026
