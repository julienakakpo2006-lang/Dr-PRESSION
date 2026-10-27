/* ==========================================================================
   MAIN.JS - NAVIGATION MOBILE ET GESTION DU FORMULAIRE DE CONTACT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Menu Mobile Burger
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('is-active');
        });

        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('is-active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // 2. Traitement du formulaire de contact
    const form = document.getElementById('contactForm');
    const alertBox = document.getElementById('formAlert');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const name = document.getElementById('clientName').value.trim();
            const phone = document.getElementById('clientPhone').value.trim();
            const email = document.getElementById('clientEmail').value.trim();
            const service = document.getElementById('serviceSelect').value;
            const message = document.getElementById('messageText').value.trim();

            let isValid = true;

            if (name.length < 2) {
                showError('nameError', 'Veuillez saisir votre nom complet.');
                document.getElementById('clientName').classList.add('is-invalid');
                isValid = false;
            }

            const phoneRegex = /^[+]?[(]?[0-9]{2,4}[)]?[-\s./0-9]{6,12}$/;
            if (!phoneRegex.test(phone)) {
                showError('phoneError', 'Numéro de téléphone invalide (ex: +228 97 77 98 24).');
                document.getElementById('clientPhone').classList.add('is-invalid');
                isValid = false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('emailError', 'Veuillez saisir une adresse e-mail valide.');
                document.getElementById('clientEmail').classList.add('is-invalid');
                isValid = false;
            }

            if (!service) {
                showError('serviceError', 'Veuillez sélectionner un type de service.');
                document.getElementById('serviceSelect').classList.add('is-invalid');
                isValid = false;
            }

            if (message.length < 8) {
                showError('messageError', 'Veuillez préciser votre demande (au moins 8 caractères).');
                document.getElementById('messageText').classList.add('is-invalid');
                isValid = false;
            }

            if (!isValid) return;

            setLoading(true);

            // Création d'un token unique pour le client
            const clientToken = 'dr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            const newConversation = {
                id: clientToken,
                token: clientToken,
                client_name: name,
                client_phone: phone,
                client_email: email,
                service_type: service,
                created_at: new Date().toISOString(),
                messages: [
                    {
                        sender_type: 'client',
                        content: message,
                        created_at: new Date().toISOString()
                    }
                ]
            };

            // Envoi au serveur OU sauvegarde locale instantanée
            try {
                const response = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, email, service, message })
                });

                if (response.ok) {
                    const data = await response.json();
                    saveLocalSession(data.client_token || clientToken, newConversation);
                } else {
                    saveLocalSession(clientToken, newConversation);
                }
            } catch (err) {
                // Fonctionne même en double-clic sans serveur
                saveLocalSession(clientToken, newConversation);
            }

            showAlert('Demande enregistrée avec succès ! Redirection vers la discussion...', 'success');

            setTimeout(() => {
                window.location.href = `discussion.html?token=${encodeURIComponent(clientToken)}`;
            }, 1000);
        });
    }

    function saveLocalSession(token, convData) {
        localStorage.setItem('dr_client_token', token);
        let allConvs = JSON.parse(localStorage.getItem('dr_all_conversations') || '[]');
        allConvs.unshift(convData);
        localStorage.setItem('dr_all_conversations', JSON.stringify(allConvs));
    }

    function clearErrors() {
        document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        if (alertBox) alertBox.style.display = 'none';
    }

    function showError(elementId, msg) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = msg;
    }

    function showAlert(text, type) {
        if (!alertBox) return;
        alertBox.textContent = text;
        alertBox.className = `alert-box ${type}`;
        alertBox.style.display = 'block';
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;
        submitBtn.disabled = isLoading;
        btnText.textContent = isLoading ? 'Enregistrement en cours...' : 'Envoyer & Démarrer la discussion';
    }
});