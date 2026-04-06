const menuButton = document.getElementById("btn");
if (menuButton) {
    menuButton.addEventListener("click", () => {
        alert("test !");
    });
}

// Smooth scrolling for internal navigation links
const navLinks = document.querySelectorAll('a[href^="#"]');
navLinks.forEach(link => {
    // Let special links (like socials toggle) handle their own click behavior
    if (link.id === 'social-link') return;
    link.addEventListener('click', event => {
        event.preventDefault();
        const href = link.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
            // If the target is hidden (e.g., forum), reveal it first so scrolling works
            if (target.classList.contains('hidden')) {
                target.classList.remove('hidden');
                target.classList.add('visible');
                try { history.pushState(null, '', href); } catch (e) { location.hash = href; }
                setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
            } else {
                try { history.pushState(null, '', href); } catch (e) { location.hash = href; }
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// IntersectionObserver pour l'animation fade-in au scroll
const revealElements = document.querySelectorAll('.reveal');
const observerOptions = {
    threshold: 0.2
};

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

revealElements.forEach(element => {
    revealObserver.observe(element);
});

// Optionnel : animation de fond en boucle
const background = document.querySelector('.background-glow');
let glowAngle = 0;

function animateBackground() {
    glowAngle += 0.3;
    background.style.backgroundPosition = `${50 + Math.sin(glowAngle) * 10}% ${50 + Math.cos(glowAngle) * 10}%`;
    requestAnimationFrame(animateBackground);
}

if (background) {
    try { animateBackground(); } catch (e) { console.warn('Background animation failed', e); }
}

// Toggle Socials section visibility when nav link is clicked
const socialLink = document.getElementById('social-link');
const socialsSection = document.getElementById('socials');
    if (socialLink && socialsSection) {
        socialLink.addEventListener('click', (e) => {
            e.preventDefault();
            // If currently hidden, reveal; otherwise hide after transition
            if (socialsSection.classList.contains('hidden')) {
                socialsSection.classList.remove('hidden');
                socialsSection.classList.add('visible');
                socialLink.setAttribute('aria-expanded', 'true');
                socialsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                socialsSection.classList.remove('visible');
                socialLink.setAttribute('aria-expanded', 'false');
                setTimeout(() => socialsSection.classList.add('hidden'), 300);
            }
        });
    }

/* Forum logic: posting, rendering, realtime (Firebase optional) with BroadcastChannel/localStorage fallback */
(function () {
    const form = document.getElementById('forum-form');
    const messagesEl = document.getElementById('messages');
    const pseudoInput = document.getElementById('pseudo');
    const messageInput = document.getElementById('message');
    const forumSection = document.getElementById('forum');

    if (!form || !messagesEl) return;

    // helpers
    function nowTs() { return Date.now(); }
    function fmt(ts) {
        try {
            return new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        } catch (e) { return new Date(ts).toString(); }
    }

    // owner id to identify messages created from this browser
    const OWNER_KEY = 'monsite_owner_id';
    function getOwnerId() {
        let id = localStorage.getItem(OWNER_KEY);
        if (!id) {
            id = 'o-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
            try { localStorage.setItem(OWNER_KEY, id); } catch (e) { /* ignore */ }
        }
        return id;
    }
    const OWNER_ID = getOwnerId();

    function renderMessage(msg, prepend = false) {
        const el = document.createElement('div');
        el.className = 'message';
        el.dataset.id = msg.id || '';
        if (msg._key) el.dataset.key = msg._key;
        if (msg.ownerId) el.dataset.owner = msg.ownerId;
        el.dataset.ts = msg.ts || nowTs();
        el.dataset.pseudo = (msg.pseudo || '').trim();

        el.innerHTML = `
            <div class="meta">
                <div class="pseudo">${escapeHtml(msg.pseudo || 'Anonyme')}</div>
                <div class="time">${fmt(msg.ts || nowTs())}</div>
            </div>
            <div class="content">${escapeHtml(msg.content || '')}</div>
        `;

        // add delete control
        const controls = document.createElement('div');
        controls.style.marginTop = '0.6rem';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-secondary delete-btn';
        delBtn.textContent = 'Supprimer';
        delBtn.addEventListener('click', () => {
            const m = {
                id: el.dataset.id,
                key: el.dataset.key,
                ts: Number(el.dataset.ts),
                pseudo: (el.dataset.pseudo || '')
            };
            // no time limit: require pseudo only
            const answer = prompt('Entrez votre pseudo pour confirmer la suppression :');
            if (!answer || answer.trim().toLowerCase() !== String(m.pseudo || '').trim().toLowerCase()) {
                alert('Pseudo incorrect. Suppression annulée.');
                return;
            }
            // confirm
            if (!confirm('Supprimer ce message ?')) return;
            // perform deletion
            if (firebaseDbRef && m.key) {
                firebaseDbRef.child(m.key).remove().catch(err => console.error('Firebase remove error', err));
            } else {
                // local fallback
                try {
                    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
                    const filtered = arr.filter(x => x.id !== m.id);
                    localStorage.setItem(LS_KEY, JSON.stringify(filtered.slice(-200)));
                } catch (e) { console.warn('LS remove failed', e); }
                if (bc) bc.postMessage({ type: 'remove', id: m.id });
                // remove from UI
                el.remove();
            }
        });
        controls.appendChild(delBtn);
        el.appendChild(controls);

        if (prepend) messagesEl.prepend(el); else messagesEl.appendChild(el);
        // trigger animation
        requestAnimationFrame(() => el.classList.add('visible'));
        // keep list bounded
        while (messagesEl.children.length > 200) messagesEl.removeChild(messagesEl.lastChild);
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Storage keys
    const LS_KEY = 'monsite_forum_msgs_v1';

    // Realtime channels
    let bc = null;
    try { bc = new BroadcastChannel('monsite_forum_channel'); } catch (e) { bc = null; }

    // If the user provided Firebase config on window.FIREBASE_CONFIG, use it.
    // To enable cross-user realtime, add a small script before this file in index.html:
    // <script>window.FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", databaseURL: "...", projectId: "..." };</script>
    function initFirebaseIfNeeded(cb) {
        if (!window.FIREBASE_CONFIG) return cb(null);
        // load compat scripts dynamically
        const base = 'https://www.gstatic.com/firebasejs/9.22.1';
        const scripts = [base + '/firebase-app-compat.js', base + '/firebase-database-compat.js'];
        let loaded = 0;
        scripts.forEach(src => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => { loaded++; if (loaded === scripts.length) setupFirebase(cb); };
            s.onerror = () => cb(new Error('Failed to load Firebase scripts'));
            document.head.appendChild(s);
        });
    }

    let firebaseDbRef = null;
    function setupFirebase(cb) {
        try {
            firebase.initializeApp(window.FIREBASE_CONFIG);
            const db = firebase.database();
            firebaseDbRef = db.ref('monsite_forum_messages');
            // listen for new messages
            firebaseDbRef.limitToLast(200).on('child_added', snap => {
                const val = snap.val();
                if (val) {
                    // attach Firebase key so deletions can target the correct node
                    val._key = snap.key;
                    renderMessage(val, false);
                }
            });
            // also listen for removals to keep UI in sync
            firebaseDbRef.on('child_removed', snap => {
                const key = snap.key;
                const node = messagesEl.querySelector(`.message[data-key="${key}"]`);
                if (node) node.remove();
            });
            return cb(null, true);
        } catch (e) { return cb(e); }
    }

    // Publish message: either Firebase (if configured) or local broadcast + localStorage
    function publishMessage(msg) {
        msg.id = msg.id || (msg.ts + '-' + Math.random().toString(36).slice(2,9));
        if (firebaseDbRef) {
            firebaseDbRef.push(msg).catch(err => console.error('Firebase publish error', err));
            return;
        }
        // fallback: save to localStorage array and broadcast to other tabs
        try {
            const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
            arr.push(msg);
            localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(-200)));
        } catch (e) { console.warn('LS write failed', e); }
        if (bc) bc.postMessage({ type: 'new', msg });
        // also render locally
        renderMessage(msg, false);
    }

    // load fallback messages from localStorage on startup
    function loadFallbackMessages() {
        try {
            const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
            arr.forEach(m => renderMessage(m, false));
        } catch (e) { /* ignore */ }
    }

    // Listen BroadcastChannel for new messages, clear and remove events
    if (bc) {
        bc.onmessage = (ev) => {
            if (!ev || !ev.data) return;
            const d = ev.data;
            if (d.type === 'new' && d.msg) renderMessage(d.msg, false);
            if (d.type === 'clear') {
                try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
                messagesEl.innerHTML = '';
            }
            if (d.type === 'remove' && d.id) {
                // remove by id
                const node = messagesEl.querySelector(`.message[data-id="${d.id}"]`);
                if (node) node.remove();
            }
        };
    }

    // Clear all messages (Firebase if configured, plus local fallback)
    function clearAllMessages() {
        if (firebaseDbRef) {
            // remove all messages in the DB reference
            firebaseDbRef.remove().catch(err => console.error('Firebase clear error', err));
        }
        try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
        if (bc) bc.postMessage({ type: 'clear' });
        messagesEl.innerHTML = '';
    }

    // Wire clear button
    const clearBtn = document.getElementById('clear-messages');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            const code = prompt("Entrez le code d'administration pour supprimer tous les messages :");
            if (code !== 'timeo7948') {
                alert('Code incorrect. Suppression annulée.');
                return;
            }
            if (!confirm('Supprimer tous les messages du forum ? Cette action est irréversible.')) return;
            clearAllMessages();
        });
    }

    // Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pseudo = (pseudoInput.value || 'Anonyme').trim().slice(0,30);
        const content = (messageInput.value || '').trim();
        if (!content) return;
        const msg = { pseudo, content, ts: nowTs() };
        publishMessage(msg);
        messageInput.value = '';
        messageInput.focus();
    });

    // Initialize: try Firebase, otherwise load fallback messages
    initFirebaseIfNeeded((err, ok) => {
        if (err) console.warn('Firebase init failed or not configured — using local fallback', err);
        if (!ok) loadFallbackMessages();
    });

    // When Firebase is configured, ensure we listen for child_removed to sync deletions
    function attachFirebaseRemovalListener() {
        if (!firebaseDbRef) return;
        firebaseDbRef.on('child_removed', snap => {
            const key = snap.key;
            // try to find element by data-key
            const node = messagesEl.querySelector(`.message[data-key="${key}"]`);
            if (node) node.remove();
        });
    }

    // If user navigates to #forum, reveal section smoothly
    if (forumSection) {
        window.addEventListener('hashchange', () => {
            if (location.hash === '#forum') {
                forumSection.classList.remove('hidden');
                forumSection.classList.add('visible');
                setTimeout(() => forumSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
            }
        });
    }

    // small accessibility: focus pseudo when forum opened
    if (location.hash === '#forum' && pseudoInput) {
        forumSection.classList.remove('hidden');
        forumSection.classList.add('visible');
        setTimeout(() => pseudoInput.focus(), 300);
    }

    // No periodic disabling of delete buttons — deletion is controlled by pseudo confirmation only

})();