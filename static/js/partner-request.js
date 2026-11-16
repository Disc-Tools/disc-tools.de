(() => {
    const form = document.getElementById('partner-request-form');
    const status = document.getElementById('partner-request-status');
    const login = document.getElementById('partner-request-login');
    const error = document.getElementById('partner-request-error');
    const success = document.getElementById('partner-request-success');
    const submit = form.querySelector('button[type="submit"]');

    function showLogin() {
        status.textContent = 'Log in with Discord to submit a partnership request.';
        status.hidden = false;
        login.hidden = false;
        form.hidden = true;
    }

    async function checkSession() {
        try {
            const response = await fetch('/api/auth/me', { cache: 'no-store' });
            if (response.status === 401) return showLogin();
            if (!response.ok) throw new Error('Session unavailable');
            const session = await response.json();
            if (session.authenticated !== true) return showLogin();

            status.hidden = true;
            form.hidden = false;
        } catch {
            status.textContent = 'Could not check your Discord session. Reload to try again.';
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submit.disabled) return;
        error.hidden = true;
        const data = new FormData(form);
        const payload = {
            name: data.get('name').trim(),
            website: data.get('website').trim(),
            discordServer: data.get('discordServer').trim(),
            description: data.get('description').trim(),
            agreeTerms: data.has('agreeTerms'),
        };
        if (!payload.name || (!payload.website && !payload.discordServer)) {
            error.textContent = 'Enter a project name and provide a website or Discord invite.';
            error.hidden = false;
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Submitting…';
        try {
            const response = await fetch('/api/partners/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (response.status === 401) return showLogin();

            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'Could not submit the request. Please try again.');
            form.hidden = true;
            success.hidden = false;
            success.focus();
        } catch (failure) {
            error.textContent = failure.message || 'Could not submit the request. Please try again.';
            error.hidden = false;
        } finally {
            submit.disabled = false;
            submit.textContent = 'Submit partnership request';
        }
    });

    void checkSession();
})();
