/* ==========================================================================
   ADMIN.JS - GESTION BACK-OFFICE PLOMBIER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    let authToken = sessionStorage.getItem('dr_admin_jwt');
    let activeConversationId = null;

    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const conversationsList = document.getElementById('conversationsList');
    const conversationView = document.getElementById('conversationView');
    const refreshBtn = document.getElementById('refreshListBtn');

    if (authToken) {
        showDashboard();
    } else {
        showLogin();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;

        // Identifiants par défaut du plombier
        if (username === 'Hounze' && password === '@Justin2026') {
            authToken = 'dr_admin_token_active';
            sessionStorage.setItem('dr_admin_jwt', authToken);
            showDashboard();
        } else {
            loginError.textContent = 'Identifiant ou mot de passe incorrect.';
            loginError.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('dr_admin_jwt');
        authToken = null;
        showLogin();
    });

    refreshBtn.addEventListener('click', loadConversations);

    function showLogin() {
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'flex';
        loadConversations();
        setInterval(loadConversations, 4000);
    }

    async function loadConversations() {
        let list = [];

        // 1. Essai API serveur
        try {
            const res = await fetch('/api/admin/conversations', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) list = await res.json();
        } catch (e) {
            // 2. Mode local fallback
            list = JSON.parse(localStorage.getItem('dr_all_conversations') || '[]');
        }

        renderConversationsList(list);
    }

    function renderConversationsList(list) {
        if (!list || list.length === 0) {
            conversationsList.innerHTML = '<p style="padding: 1rem; color: var(--text-muted); text-align: center;">Aucune demande reçue pour le moment.</p>';
            return;
        }

        conversationsList.innerHTML = '';
        list.forEach(c => {
            const item = document.createElement('div');
            item.className = `conversation-item ${c.id === activeConversationId ? 'active' : ''}`;
            const date = new Date(c.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' });

            item.innerHTML = `
                <div class="conv-top">
                    <span class="conv-name">${escapeHtml(c.client_name)}</span>
                    <span class="conv-date">${date}</span>
                </div>
                <div class="conv-service">${escapeHtml(c.service_type)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;"><i class="fa-solid fa-phone"></i> ${escapeHtml(c.client_phone)}</div>
            `;

            item.addEventListener('click', () => {
                activeConversationId = c.id;
                document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                openConversation(c);
            });

            conversationsList.appendChild(item);
        });
    }

    function openConversation(conv) {
        conversationView.className = 'conversation-view is-open';
        const messages = conv.messages || [];

        conversationView.innerHTML = `
            <div class="admin-chat-header">
                <div>
                    <h2>${escapeHtml(conv.client_name)}</h2>
                    <p style="font-size:0.85rem; color:var(--text-muted);">
                        <i class="fa-solid fa-phone"></i> <a href="tel:${escapeHtml(conv.client_phone)}">${escapeHtml(conv.client_phone)}</a> • 
                        <i class="fa-regular fa-envelope"></i> ${escapeHtml(conv.client_email)} • 
                        <strong>${escapeHtml(conv.service_type)}</strong>
                    </p>
                </div>
                <div>
                    <a href="https://wa.me/${escapeHtml(conv.client_phone.replace(/[^0-9]/g, ''))}" target="_blank" class="btn btn-whatsapp" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp
                    </a>
                </div>
            </div>

            <div class="admin-messages-box" id="adminMessagesBox">
                ${messages.map(m => {
                    const isPlumber = m.sender_type === 'plumber';
                    const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="message-bubble ${isPlumber ? 'client' : 'plumber'}" style="align-self: ${isPlumber ? 'flex-end' : 'flex-start'}">
                            <strong>${isPlumber ? 'Vous (HOUNZE JUSTIN)' : 'Client'} :</strong>
                            <div>${escapeHtml(m.content)}</div>
                            <div class="bubble-meta"><span>${time}</span></div>
                        </div>
                    `;
                }).join('')}
            </div>

            <form class="admin-reply-bar" id="adminReplyForm">
                <input type="text" id="adminReplyInput" placeholder="Répondre à ${escapeHtml(conv.client_name)}..." required autocomplete="off">
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> Répondre</button>
            </form>
        `;

        const box = document.getElementById('adminMessagesBox');
        box.scrollTop = box.scrollHeight;

        document.getElementById('adminReplyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('adminReplyInput');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';

            // Envoi API ou sauvegarde locale
            try {
                await fetch(`/api/conversations/${conv.token || conv.id}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, sender: 'plumber' })
                });
            } catch (err) {
                // Sauvegarde locale
                let all = JSON.parse(localStorage.getItem('dr_all_conversations') || '[]');
                let target = all.find(c => c.id === conv.id || c.token === conv.token);
                if (target) {
                    if (!target.messages) target.messages = [];
                    target.messages.push({
                        sender_type: 'plumber',
                        content: text,
                        created_at: new Date().toISOString()
                    });
                    localStorage.setItem('dr_all_conversations', JSON.stringify(all));
                    openConversation(target);
                }
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});