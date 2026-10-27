/* ==========================================================================
   DISCUSSION.JS - GESTION DES MESSAGES CLIENT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || localStorage.getItem('dr_client_token');

    const messagesArea = document.getElementById('messagesArea');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!token) {
        messagesArea.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 2.2rem; color: var(--danger);"></i>
                <p>Aucune conversation trouvée.</p>
                <a href="index.html#contact" class="btn btn-primary">Faire une demande</a>
            </div>
        `;
        messageInput.disabled = true;
        sendBtn.disabled = true;
        return;
    }

    loadMessages();
    setInterval(loadMessages, 3000);

    // Ajustement de hauteur automatique
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
    });

    // Envoi par Entrée
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });

    // Envoi d'un message
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content) return;

        messageInput.value = '';
        messageInput.style.height = 'auto';

        // 1. Essai API serveur
        try {
            await fetch(`/api/conversations/${token}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: content, sender: 'client' })
            });
        } catch (err) {
            // 2. Mode local fallback
            saveMessageLocally(token, 'client', content);
        }

        loadMessages();
        messageInput.focus();
    });

    async function loadMessages() {
        try {
            const res = await fetch(`/api/conversations/${token}`);
            if (res.ok) {
                const data = await res.json();
                renderMessages(data.conversation, data.messages);
                return;
            }
        } catch (err) {
            // Lecture fallback en local
        }

        const localConvs = JSON.parse(localStorage.getItem('dr_all_conversations') || '[]');
        const conv = localConvs.find(c => c.token === token || c.id === token);

        if (conv) {
            renderMessages(conv, conv.messages || []);
        }
    }

    function renderMessages(conversation, messages) {
        messagesArea.innerHTML = '';

        const recap = document.createElement('div');
        recap.className = 'message-bubble recap';
        recap.innerHTML = `
            <strong><i class="fa-solid fa-clipboard-check"></i> Demande enregistrée</strong><br>
            <strong>Client :</strong> ${escapeHtml(conversation.client_name)} (${escapeHtml(conversation.client_phone)})<br>
            <strong>Prestation :</strong> ${escapeHtml(conversation.service_type)}
        `;
        messagesArea.appendChild(recap);

        messages.forEach(msg => {
            const bubble = document.createElement('div');
            const isClient = msg.sender_type === 'client';
            bubble.className = `message-bubble ${isClient ? 'client' : 'plumber'}`;

            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            bubble.innerHTML = `
                ${!isClient ? '<span class="bubble-author"><i class="fa-solid fa-user-check"></i> HOUNZE JUSTIN</span>' : ''}
                <div>${escapeHtml(msg.content)}</div>
                <div class="bubble-meta"><span>${time}</span></div>
            `;
            messagesArea.appendChild(bubble);
        });

        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function saveMessageLocally(tok, sender, text) {
        let all = JSON.parse(localStorage.getItem('dr_all_conversations') || '[]');
        let conv = all.find(c => c.token === tok || c.id === tok);
        if (conv) {
            if (!conv.messages) conv.messages = [];
            conv.messages.push({
                sender_type: sender,
                content: text,
                created_at: new Date().toISOString()
            });
            localStorage.setItem('dr_all_conversations', JSON.stringify(all));
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});