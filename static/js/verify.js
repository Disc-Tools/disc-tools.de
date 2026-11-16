(() => {
    const form = document.getElementById('verify-form');
    const status = document.getElementById('verify-status');
    const login = document.getElementById('verify-login');
    const next = document.getElementById('verify-continue');
    const error = document.getElementById('verify-error');
    const submit = form.querySelector('button');
    const checks = [...form.querySelectorAll('input')];
    const verifyPath = '/verify/';
    const requested = new URLSearchParams(location.search).get('redirect') || '/';
    let destination = '/';

    if (requested.startsWith('/') && !requested.startsWith('//') && !/[\\\x00-\x20]/.test(requested)) {
        const target = new URL(requested, location.origin);
        if (target.origin === location.origin && !target.pathname.startsWith('//') && !/^\/verify\/?$/.test(target.pathname)) {
            destination = target.pathname + target.search + target.hash;
        }
    }
    next.href = destination;
    const productionVerify = verifyPath + (destination === '/' ? '' : '?redirect=' + encodeURIComponent(destination));
    login.href = 'https://disc-tools.de/api/auth/login?redirect=' + encodeURIComponent(productionVerify);
    document.getElementById('verify-switch').href = login.href;

    function showLogin() {
        status.textContent = 'Log in with Discord to continue verification on disc-tools.de.';
        status.hidden = false;
        form.hidden = true;
        login.hidden = false;
    }

    function showUser(user) {
        document.getElementById('verify-name').textContent = user.global_name || user.username;
        document.getElementById('verify-username').textContent = '@' + user.username;
        const avatar = document.getElementById('verify-avatar');
        if (/^\d{17,20}$/.test(user.id) && /^(?:a_)?[a-f\d]+$/i.test(user.avatar || '')) {
            const extension = user.avatar.startsWith('a_') ? 'gif' : 'webp';
            avatar.src =
                `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=64`;
        } else {
            avatar.src = '/static/assets/img/logo.svg';
        }
        status.hidden = true;
        form.hidden = false;
    }

    let pending = false;
    function updateSubmit() {
        submit.disabled = pending || !checks.every(check => check.checked);
    }

    form.addEventListener('change', updateSubmit);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submit.disabled) return;
        pending = true;
        updateSubmit();
        error.hidden = true;
        submit.textContent = 'Verifying…';

        try {
            const response = await fetch('/api/verify/complete', { method: 'POST', credentials: 'same-origin' });
            if (response.status === 401) {
                showLogin();
                return;
            }
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                error.textContent = data.detail || data.error || 'Verification failed. Please try again.';
                error.hidden = false;
                return;
            }
            form.hidden = true;
            status.textContent = data.alreadyVerified ? 'Your account is already verified.' : 'Your account has been verified.';
            status.hidden = false;
            next.hidden = false;
            next.focus();
        } catch {
            error.textContent = 'Could not reach the verification service. Please try again.';
            error.hidden = false;
        } finally {
            pending = false;
            submit.textContent = 'Verify account';
            updateSubmit();
        }
    });

    updateSubmit();
    fetch('/api/auth/me', { cache: 'no-store' })
        .then(async response => {
            if (response.status === 401) return showLogin();
            if (!response.ok) throw new Error('Session unavailable');
            const data = await response.json();
            if (data.authenticated && data.user) showUser(data.user);
            else showLogin();
        })
        .catch(() => {
            status.textContent = 'Could not check your Discord session. Reload to try again.';
        });
})();
