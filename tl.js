// TL.ly - Firebase Auth + MySQL Videos with Firebase Storage and MySQL metadata

const API_URL = './api/tl-api.php';

// Éléments DOM
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const signupToggle = document.getElementById('signup-toggle');
const loginToggle = document.getElementById('login-toggle');
const loginError = document.getElementById('login-error');
const uploadForm = document.getElementById('upload-form');
const uploadError = document.getElementById('upload-error');
const videosContainer = document.getElementById('videos-container');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const uploadBtn = document.getElementById('upload-btn');
const progressBar = document.getElementById('progress-bar');
const uploadProgress = document.getElementById('upload-progress');

let currentUser = null;
let auth = null;
let storage = null;

// Initialisation Firebase
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.FIREBASE_CONFIG) {
        console.error('Firebase config manquant');
        return;
    }

    try {
        firebase.initializeApp(window.FIREBASE_CONFIG);
    } catch (e) {
        // Déjà initialisé
    }

    auth = firebase.auth();
    storage = firebase.storage();
    checkAuth();
    setupEventListeners();
});

// Vérifier l'authentification
function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            showMainScreen();
            loadVideos();
        } else {
            currentUser = null;
            showLoginScreen();
        }
    });
}

// Afficher l'écran de login
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    userInfo.style.display = 'none';
}

// Afficher l'écran principal
function showMainScreen() {
    loginScreen.style.display = 'none';
    mainScreen.style.display = 'block';
    userInfo.style.display = 'flex';
    usernameDisplay.textContent = currentUser.email;
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Basculer entre login et signup
    signupToggle.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
        loginError.classList.remove('show');
    });

    loginToggle.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'flex';
        loginError.classList.remove('show');
    });

    // Soumettre le formulaire de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-pseudo').value;
        const password = document.getElementById('login-password').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            loginForm.reset();
        } catch (error) {
            showError(translateFirebaseError(error.code), loginError);
        }
    });

    // Soumettre le formulaire d'inscription
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-pseudo').value;
        const password = document.getElementById('signup-password').value;
        const passwordConfirm = document.getElementById('signup-password-confirm').value;
        
        if (password !== passwordConfirm) {
            showError('Les mots de passe ne correspondent pas', loginError);
            return;
        }

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            signupForm.reset();
        } catch (error) {
            showError(translateFirebaseError(error.code), loginError);
        }
    });

    // Déconnexion
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            loginForm.reset();
            signupForm.reset();
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        }
    });

    // Poster une vidéo (upload de fichier)
    uploadForm.addEventListener('submit', handleUploadVideo);
}

// Uploader une vidéo dans Firebase Storage, puis enregistrer la métadonnée dans MySQL
async function handleUploadVideo(e) {
    e.preventDefault();

    if (!currentUser) {
        showError('Vous devez être connecté', uploadError);
        return;
    }

    const fileInput = document.getElementById('video-file');
    const titleInput = document.getElementById('video-title');
    const descriptionInput = document.getElementById('video-description');

    const file = fileInput.files[0];
    const title = titleInput.value;
    const description = descriptionInput.value;

    if (!file) {
        showError('Sélectionnez un fichier vidéo', uploadError);
        return;
    }

    if (!title) {
        showError('Le titre est requis', uploadError);
        return;
    }

    if (file.size > 500 * 1024 * 1024) {
        showError('Fichier trop volumineux (max 500 MB)', uploadError);
        return;
    }

    try {
        uploadError.classList.remove('show');
        uploadProgress.style.display = 'block';
        uploadBtn.disabled = true;

        if (!storage) {
            throw new Error('Firebase Storage non initialisé');
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const storagePath = `videos/${currentUser.uid}/${Date.now()}_${safeName}`;
        const storageRef = storage.ref(storagePath);
        const uploadTask = storageRef.put(file);

        uploadTask.on('state_changed',
            (snapshot) => {
                if (snapshot.totalBytes) {
                    const percentComplete = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressBar.style.width = percentComplete + '%';
                }
            },
            (error) => {
                uploadProgress.style.display = 'none';
                uploadBtn.disabled = false;
                progressBar.style.width = '0%';
                showError('Erreur upload Firebase: ' + error.message, uploadError);
            },
            async () => {
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    const metadataForm = new FormData();
                    metadataForm.append('action', 'upload_video');
                    metadataForm.append('title', title);
                    metadataForm.append('description', description);
                    metadataForm.append('video_url', downloadURL);
                    metadataForm.append('storage_path', storagePath);
                    metadataForm.append('file_size', file.size);
                    metadataForm.append('firebase_uid', currentUser.uid);
                    metadataForm.append('email', currentUser.email);

                    const response = await fetch(API_URL, {
                        method: 'POST',
                        body: metadataForm
                    });
                    const result = await response.json();

                    uploadProgress.style.display = 'none';
                    uploadBtn.disabled = false;
                    progressBar.style.width = '0%';

                    if (response.ok && result.success) {
                        uploadForm.reset();
                        loadVideos();
                        showError('Vidéo publiée!', uploadError);
                        uploadError.style.backgroundColor = 'rgba(107, 142, 35, 0.1)';
                        uploadError.style.borderColor = 'rgba(107, 142, 35, 0.3)';
                        uploadError.style.color = '#7cb342';
                    } else {
                        showError(result.message || 'Erreur lors de l\'upload', uploadError);
                    }
                } catch (error) {
                    console.error('Erreur upload:', error);
                    uploadProgress.style.display = 'none';
                    uploadBtn.disabled = false;
                    progressBar.style.width = '0%';
                    showError('Erreur lors de l\'upload', uploadError);
                }
            }
        );
    } catch (error) {
        console.error('Erreur upload:', error);
        uploadProgress.style.display = 'none';
        uploadBtn.disabled = false;
        showError('Erreur lors de l\'upload', uploadError);
    }
}

// Charger les vidéos depuis MySQL
async function loadVideos() {
    try {
        const formData = new FormData();
        formData.append('action', 'get_videos');
        formData.append('firebase_uid', currentUser.uid);
        formData.append('email', currentUser.email);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success && data.videos.length > 0) {
            videosContainer.innerHTML = '';
            data.videos.forEach(video => {
                videosContainer.appendChild(createVideoCard(video));
            });
        } else {
            videosContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Aucune vidéo pour le moment</h3>
                    <p>Soyez le premier à partager une vidéo !</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur chargement:', error);
        videosContainer.innerHTML = `
            <div class="empty-state">
                <h3>Erreur</h3>
                <p>Impossible de charger les vidéos</p>
            </div>
        `;
    }
}

// Créer une carte vidéo
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    const isLiked = video.user_liked;
    const likeCount = video.likes_count || 0;
    const commentCount = video.comments_count || 0;
    
    card.innerHTML = `
        <div class="video-preview">
            <video style="width: 100%; height: 100%; object-fit: cover;" onmouseover="this.play()" onmouseout="this.pause()">
                <source src="${video.file_path}" type="video/mp4">
                Votre navigateur ne supporte pas les vidéos HTML5
            </video>
            <div class="video-play-icon" onclick="playVideo('${video.file_path}', '${video.title}')">▶</div>
        </div>
        <div class="video-info">
            <div class="video-header">
                <div class="video-avatar">${video.author_email.charAt(0).toUpperCase()}</div>
                <div class="video-meta">
                    <span class="video-author">${video.author_email}</span>
                    <span class="video-timestamp">${formatDate(video.created_at)}</span>
                </div>
            </div>
            <div class="video-title">${escapeHtml(video.title)}</div>
            <div class="video-description">${escapeHtml(video.description || '')}</div>
            <div class="video-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${video.id})">
                    <span>❤️</span>
                    <span class="like-count">${likeCount}</span>
                </button>
                <button class="action-btn" onclick="toggleComments(${video.id})">
                    <span>💬</span>
                    <span class="comment-count">${commentCount}</span>
                </button>
                <button class="action-btn" onclick="shareVideo('${video.title}')">
                    <span>📤</span>
                    <span>Partager</span>
                </button>
            </div>
            <div class="video-comments" id="comments-${video.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(121, 191, 255, 0.1);">
                <div class="comments-list" id="comments-list-${video.id}"></div>
                <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                    <input type="text" class="comment-input" id="comment-${video.id}" placeholder="Ajouter un commentaire..." maxlength="200" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(121, 191, 255, 0.3); border-radius: 8px; padding: 0.75rem; color: #e8eef9; flex: 1;">
                    <button class="btn btn-secondary" style="padding: 0.75rem 1rem; font-size: 0.85rem;" onclick="addComment(${video.id})">Valider</button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Échapper les caractères HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Ouvrir une vidéo en plein écran
function playVideo(filePath, title) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="width: 90%; max-width: 900px; position: relative;">
            <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: white; font-size: 2rem; cursor: pointer;">✕</button>
            <video controls style="width: 100%; height: auto; border-radius: 12px;">
                <source src="${filePath}" type="video/mp4">
                Votre navigateur ne supporte pas les vidéos HTML5
            </video>
            <p style="color: #a0aec0; margin-top: 1rem; text-align: center;">${escapeHtml(title)}</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Activer/Désactiver le like
async function toggleLike(videoId) {
    if (!currentUser) {
        alert('Vous devez être connecté pour liker');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'toggle_like');
        formData.append('video_id', videoId);
        formData.append('firebase_uid', currentUser.uid);
        formData.append('email', currentUser.email);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            loadVideos();
        }
    } catch (error) {
        console.error('Erreur like:', error);
    }
}

// Afficher/Masquer les commentaires
function toggleComments(videoId) {
    const commentsDiv = document.getElementById(`comments-${videoId}`);
    if (commentsDiv.style.display === 'none') {
        commentsDiv.style.display = 'block';
        loadComments(videoId);
    } else {
        commentsDiv.style.display = 'none';
    }
}

// Charger les commentaires
async function loadComments(videoId) {
    try {
        const formData = new FormData();
        formData.append('action', 'get_comments');
        formData.append('video_id', videoId);
        formData.append('firebase_uid', currentUser.uid);
        formData.append('email', currentUser.email);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        const commentsList = document.getElementById(`comments-list-${videoId}`);
        commentsList.innerHTML = '';
        if (data.success && data.comments) {
            data.comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';
                commentDiv.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(comment.user_email)}</span>
                        <span class="comment-timestamp">${formatDate(comment.created_at)}</span>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                `;
                commentsList.appendChild(commentDiv);
            });
        }
    } catch (error) {
        console.error('Erreur chargement commentaires:', error);
    }
}

// Ajouter un commentaire
async function addComment(videoId) {
    if (!currentUser) {
        alert('Vous devez être connecté pour commenter');
        return;
    }

    const input = document.getElementById(`comment-${videoId}`);
    const text = input.value.trim();
    
    if (!text) return;

    try {
        const formData = new FormData();
        formData.append('action', 'add_comment');
        formData.append('video_id', videoId);
        formData.append('text', text);
        formData.append('firebase_uid', currentUser.uid);
        formData.append('email', currentUser.email);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            input.value = '';
            loadComments(videoId);
        }
    } catch (error) {
        console.error('Erreur commentaire:', error);
    }
}

// Partager une vidéo
function shareVideo(title) {
    if (navigator.share) {
        navigator.share({
            title: 'TL.ly - ' + title,
            text: 'Regarde cette vidéo sur TL.ly !',
            url: window.location.href
        });
    } else {
        const text = `${title} - ${window.location.href}`;
        navigator.clipboard.writeText(text).then(() => {
            alert('Lien copié dans le presse-papiers !');
        });
    }
}

// Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR');
}

// Afficher une erreur
function showError(message, element) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
        // Réinitialiser la couleur
        element.style.backgroundColor = '';
        element.style.borderColor = '';
        element.style.color = '';
    }, 4000);
}

// Traduire les erreurs Firebase en français
function translateFirebaseError(code) {
    const translations = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Format email invalide',
        'auth/weak-password': 'Le mot de passe est trop faible (min 6 caractères)',
        'auth/user-not-found': 'Utilisateur non trouvé',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/invalid-credential': 'Identifiants invalides',
        'auth/operation-not-allowed': 'Opération non autorisée',
    };
    return translations[code] || 'Erreur: ' + code;
}
