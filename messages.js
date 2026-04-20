// messages.js — authentication + message synchronization with Firebase
(function () {
    const appEl = document.getElementById('app');
    const authArea = document.getElementById('auth-area');
    const messagesArea = document.getElementById('messages-area');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const signoutBtn = document.getElementById('signout');
    const postForm = document.getElementById('post-form');
    const messagesEl = document.getElementById('messages');
    const convMessagesEl = document.getElementById('conv-messages');
    const recipientSelect = document.getElementById('recipient-select');
    const convHeader = document.getElementById('conv-header');
    const postPseudo = document.getElementById('post-pseudo');
    const postContent = document.getElementById('post-content');
    const currentUserEl = document.getElementById('current-user');

    if (!window.FIREBASE_CONFIG) {
        if (appEl) appEl.innerHTML = '<div class="forum-error">Firebase config manquant. Ajoutez window.FIREBASE_CONFIG.</div>';
        return;
    }

    // initialize Firebase (compat)
    try { firebase.initializeApp(window.FIREBASE_CONFIG); } catch (e) { /* already initialized */ }
    const auth = firebase.auth();
    const db = firebase.database();

    let usersMap = {};
    let rendered = new Set();
    let convRendered = new Set();
    let activeConvRef = null;
    let activeConvHandler = null;
    let writePath = 'monsite_forum_messages';
    const MAX_MESSAGES = 400;
    const PUBLIC_MESSAGE_KEYS = ['content','message','text','body','msg','messageText','txt'];
    // No cross-app normalization/mirroring: keep each app owning its own data

    // Normalization/mirroring helpers removed — messages remain isolated per-app

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function fmt(ts) {
        try { return new Date(Number(ts)).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); }
        catch (e) { return String(ts || ''); }
    }

    function extractText(obj) {
        if (obj == null) return '';
        if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
        const keys = ['content', 'message', 'text', 'body', 'msg', 'messageText', 'txt'];
        for (const k of keys) if (obj[k]) return obj[k];
        // first string property
        for (const k in obj) {
            if (typeof obj[k] === 'string' && obj[k].trim()) return obj[k];
        }
        return '';
    }

    function extractPseudo(obj, key) {
        if (obj == null) return '';
        if (typeof obj === 'string') return obj;
        const keys = ['pseudo', 'name', 'username', 'displayName', 'author', 'sender', 'user'];
        for (const k of keys) if (obj[k]) return obj[k];
        // fallback: use usersMap by key
        if (key && usersMap[key]) return usersMap[key];
        return '';
    }

    function extractTs(obj) {
        if (!obj) return Date.now();
        const keys = ['ts', 'time', 'timestamp', 'createdAt'];
        for (const k of keys) if (obj[k]) return Number(obj[k]);
        return Date.now();
    }

    function addMessage(id, pseudo, content, ts) {
        if (rendered.has(id)) return;
        rendered.add(id);
        const el = document.createElement('div');
        el.className = 'message visible';
        el.dataset.id = id;
        el.innerHTML = `
            <div class="meta">
                <div class="pseudo">${escapeHtml(pseudo || 'Anonyme')}</div>
                <div class="time">${fmt(ts)}</div>
            </div>
            <div class="content">${escapeHtml(content || '')}</div>
        `;
        if (messagesEl) {
            messagesEl.appendChild(el);
            // keep list bounded
            while (messagesEl.children.length > MAX_MESSAGES) messagesEl.removeChild(messagesEl.firstChild);
            // scroll down
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    }

    function addConvMessage(id, pseudo, content, ts) {
        if (!convMessagesEl) return;
        if (convRendered.has(id)) return;
        convRendered.add(id);
        const el = document.createElement('div');
        el.className = 'message visible';
        el.dataset.id = id;
        el.innerHTML = `
            <div class="meta">
                <div class="pseudo">${escapeHtml(pseudo || 'Anonyme')}</div>
                <div class="time">${fmt(ts)}</div>
            </div>
            <div class="content">${escapeHtml(content || '')}</div>
        `;
        convMessagesEl.appendChild(el);
        while (convMessagesEl.children.length > MAX_MESSAGES) convMessagesEl.removeChild(convMessagesEl.firstChild);
        convMessagesEl.scrollTop = convMessagesEl.scrollHeight;
    }

    function extractTextFromAllowedKeys(obj) {
        if (!obj || typeof obj !== 'object') return null;
        for (const k of PUBLIC_MESSAGE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
        }
        return null;
    }

    function isPrivateShape(obj) {
        if (!obj || typeof obj !== 'object') return false;
        if (obj.fromUid || obj.toUid || obj.sender || obj.receiver || obj.from || obj.to) return true;
        return false;
    }

    function addNormalized(key, val, basePath) {
        // For public feeds, require an explicit message key to avoid rendering raw flags/ids/emails.
        let text = null;
        if (basePath && String(basePath).startsWith('private_conversations')) {
            text = extractText(val) || extractTextFromAllowedKeys(val) || '';
        } else {
            // public: only accept entries that have explicit message-like keys
            text = extractTextFromAllowedKeys(val) || '';
        }
        if (!text) return;
        // skip private-shaped messages from public feeds
        if (!(basePath && String(basePath).startsWith('private_conversations')) && isPrivateShape(val)) return;
        const pseudo = extractPseudo(val, key) || '';
        const ts = extractTs(val) || Date.now();
        if (text) addMessage(key, pseudo, text, ts);
    }

    function traverseSnap(snap, basePath) {
        if (!snap) return;
        const val = snap.val();
        if (val == null) return;
        // if leaf (no children) -> add
        if (!snap.hasChildren()) {
            const id = basePath + ':' + (snap.key || 'root');
            addNormalized(id, val, basePath);
            return;
        }
        // if object looks like a message (has content/message keys), add it
        const text = extractText(val);
        if (text) {
            const id = basePath + ':' + (snap.key || 'root');
            addNormalized(id, val, basePath);
            // continue to descend to catch nested messages too
        }
        // descend (use the child's key so path builds correctly)
        snap.forEach(child => traverseSnap(child, basePath + '/' + (child.key || '')));
    }

    let listenersAttached = false;
    function attachListeners() {
        if (listenersAttached) return;
        listenersAttached = true;

        // users map
        db.ref('users').on('value', snap => {
            usersMap = {};
            snap.forEach(child => {
                const v = child.val();
                usersMap[child.key] = (v && (v.name || v.displayName)) || '';
            });
            // populate recipient selector if present
            try { populateRecipients(); } catch (e) { /* ignore */ }
        });

        // prefer existing app-specific node
        db.ref('monsite_forum_messages').limitToLast(200).on('child_added', snap => {
            const id = 'monsite_forum_messages:' + snap.key;
            addNormalized(id, snap.val(), 'monsite_forum_messages');
        });

        // No cross-app listeners or automatic merging: each app keeps its own data.
    }

    // mergeMessageNode removed — no automatic normalization performed

    // mergeExistingData removed — no automatic migration or cross-app normalization

    // Mirroring handlers removed — no cross-node writes performed by this client

    // writePath detection disabled — always use the site's `monsite_forum_messages` for public posts

    // Auth handlers
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pseudo = (document.getElementById('signup-pseudo').value || '').trim();
        const email = (document.getElementById('signup-email').value || '').trim();
        const pwd = (document.getElementById('signup-pwd').value || '');
        if (!email || !pwd) return alert('Email et mot de passe requis');
        auth.createUserWithEmailAndPassword(email, pwd)
            .then(cred => {
                const uid = cred.user.uid;
                const name = pseudo || (email.split('@')[0] || 'Utilisateur');
                return db.ref('users/' + uid).set({ name: name, open: false, timer_open: '' });
            })
            .catch(err => alert(err.message || err));
    });

    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = (document.getElementById('signin-email').value || '').trim();
        const pwd = (document.getElementById('signin-pwd').value || '');
        if (!email || !pwd) return alert('Email et mot de passe requis');
        auth.signInWithEmailAndPassword(email, pwd).catch(err => alert(err.message || err));
    });

    signoutBtn.addEventListener('click', () => auth.signOut());

    function computeConvId(a, b) {
        try {
            if (!a || !b) return a + '_' + b;
            return [String(a), String(b)].sort().join('_');
        } catch (e) { return String(a) + '_' + String(b); }
    }

    function populateRecipients() {
        if (!recipientSelect) return;
        const prev = recipientSelect.value || 'public';
        recipientSelect.innerHTML = '';
        const publicOpt = document.createElement('option');
        publicOpt.value = 'public';
        publicOpt.textContent = 'Public — Tous';
        recipientSelect.appendChild(publicOpt);
        for (const uid in usersMap) {
            if (!Object.prototype.hasOwnProperty.call(usersMap, uid)) continue;
            // don't allow selecting yourself as recipient
            if (auth.currentUser && auth.currentUser.uid === uid) continue;
            const name = usersMap[uid] || uid;
            const opt = document.createElement('option');
            opt.value = uid;
            opt.textContent = name;
            recipientSelect.appendChild(opt);
        }
        // if previous selection was self, or invalid now, reset to public
        try {
            if (prev && auth.currentUser && prev === auth.currentUser.uid) recipientSelect.value = 'public';
            else recipientSelect.value = prev;
        } catch (e) { recipientSelect.value = 'public'; }
    }

    function detachActiveConv() {
        try {
            if (activeConvRef && activeConvHandler) {
                activeConvRef.off('child_added', activeConvHandler);
            }
        } catch (e) { /* ignore */ }
        activeConvRef = null;
        activeConvHandler = null;
        convRendered = new Set();
    }

    function showPrivateConversation(otherUid) {
        if (!auth.currentUser) return alert('Connectez-vous pour ouvrir une conversation privée.');
        if (!otherUid) return;
        // hide public feed, show conv feed
        if (messagesEl) messagesEl.style.display = 'none';
        if (convMessagesEl) convMessagesEl.style.display = 'block';
        convMessagesEl.innerHTML = '';
        convRendered = new Set();
        const myUid = auth.currentUser.uid;
        const convId = computeConvId(myUid, otherUid);
        convHeader.textContent = 'Conversation privée avec ' + (usersMap[otherUid] || otherUid);
        detachActiveConv();
        // listen on chat/{convId} instead of private_conversations
        activeConvRef = db.ref('chat/' + convId);
        activeConvHandler = (snap) => {
            const v = snap.val();
            if (!v) return;
            const fromName = v.pseudo || usersMap[v.fromUid] || (v.fromUid || '');
            addConvMessage(snap.key, fromName, extractText(v) || v.content || '', extractTs(v));
        };
        // this will fire for existing children and for new ones
        activeConvRef.limitToLast(500).on('child_added', activeConvHandler);
    }

    function showPublicView() {
        // show public feed and hide conversation feed
        detachActiveConv();
        if (convMessagesEl) convMessagesEl.style.display = 'none';
        if (messagesEl) messagesEl.style.display = 'block';
        if (convHeader) convHeader.textContent = 'Mode: Public';
        // reload last public messages to refresh UI
        try {
            messagesEl.innerHTML = '';
            rendered = new Set();
            db.ref('monsite_forum_messages').limitToLast(200).once('value').then(snap => {
                snap.forEach(child => {
                    const v = child.val();
                    const id = 'monsite_forum_messages:' + child.key;
                    const text = extractText(v) || '';
                    const pseudo = extractPseudo(v, child.key) || '';
                    const ts = extractTs(v) || Date.now();
                    if (text) addMessage(id, pseudo, text, ts);
                });
            }).catch(() => { /* ignore */ });
        } catch (e) { /* ignore */ }
    }

    if (recipientSelect) {
        recipientSelect.addEventListener('change', () => {
            const val = recipientSelect.value;
            if (!val || val === 'public') {
                showPublicView();
            } else {
                showPrivateConversation(val);
            }
        });
    }

    // admin actions removed — no automatic migration or cross-app sync

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = (postContent.value || '').trim();
        if (!content) return;
        const pseudo = (postPseudo.value || '').trim() || (auth.currentUser && (auth.currentUser.displayName || (auth.currentUser.email || '').split('@')[0])) || 'Anonyme';
        const now = Date.now();
        const payload = { content: content, pseudo: pseudo, ts: now };
        try {
            const target = (recipientSelect && recipientSelect.value) ? recipientSelect.value : 'public';
            if (target && target !== 'public') {
                // prevent sending a private message to yourself
                if (!auth.currentUser) return alert('Connectez-vous pour envoyer un message privé');
                if (target === auth.currentUser.uid) {
                    alert('Vous ne pouvez pas vous envoyer un message privé. Choisissez un autre destinataire.');
                    return;
                }
                // private conversation: write only to site-owned `chat/{convId}` (no cross-write)
                const convId = computeConvId(auth.currentUser.uid, target);
                const p = Object.assign({}, payload, { fromUid: auth.currentUser.uid, toUid: target });
                try {
                    const ref = db.ref('chat/' + convId).push();
                    await ref.set(p);
                    postContent.value = '';
                } catch (err) {
                    alert(err.message || err);
                }
            } else {
                // public fallback / writePath
                try {
                    const publicShape = Object.assign({}, payload, {
                        message: payload.content,
                        timestamp: payload.ts,
                        time: payload.ts,
                        text: payload.content
                    });
                    const r = db.ref(writePath).push();
                    r.set(publicShape).then(() => { postContent.value = ''; }).catch(err => alert(err.message || err));
                } catch (e) { alert('Erreur en envoyant le message'); }
            }
        } catch (e) { alert('Erreur en envoyant le message'); }
    });

    // keep UI in sync with auth state
    auth.onAuthStateChanged((user) => {
        if (user) {
            if (authArea) authArea.style.display = 'none';
            if (messagesArea) messagesArea.style.display = 'block';
            currentUserEl.textContent = user.email || (user.displayName || 'Utilisateur');
            // prefill pseudo from users node
            db.ref('users/' + user.uid).once('value').then(snap => {
                const v = snap.val();
                if (v && v.name) postPseudo.value = v.name;
                else postPseudo.value = (user.displayName || (user.email || '').split('@')[0] || '');
            }).catch(() => { postPseudo.value = (user.email || '').split('@')[0] || ''; });

            attachListeners();
        } else {
            if (authArea) authArea.style.display = 'block';
            if (messagesArea) messagesArea.style.display = 'none';
            currentUserEl.textContent = '—';
        }
    });

    // No automatic migration or merge on load; each app manages its own data.

})();
