document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userIdInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') lookupUsernameHistory();
    });
    updateFreeSearchCounter();
});

async function updateFreeSearchCounter() {
    const counter = document.getElementById('freeSearchCounter');
    if (!counter) return;
    try {
        const res = await fetch('/api/username-history/eligibility', { cache: 'no-store' });
        const data = res.ok ? await res.json() : null;
        if (!data) {
            return;
        }
        if (data.isLoggedIn) {
            counter.style.display = 'block';
            counter.innerHTML = data.optedOut
                ? `<span style="color:#e74c3c;"><i class="fa-solid fa-user-lock" style="margin-right:4px;"></i>Search blocked — you opted out</span>`
                : `<span style="color:#2ecc71;"><i class="fa-solid fa-check-circle" style="margin-right:4px;"></i>Unlimited searches</span>`;
        } else {
            counter.style.display = 'block';
            const used = data.freeSearchesUsed || 0;
            const max = data.freeSearchesMax || 1;
            const remaining = max - used;
            if (remaining > 0) {
                counter.innerHTML = `<i class="fa-solid fa-key" style="margin-right:4px;"></i>Free searches: <strong>${remaining}/${max}</strong>`;
            } else {
                counter.innerHTML = `<i class="fa-solid fa-key" style="margin-right:4px;"></i>Free searches: <strong>0/${max}</strong> &middot; <a href="/api/auth/login" style="color:var(--accent);">Login</a>`;
            }
        }
    } catch (e) {};
}

async function lookupUsernameHistory() {
    const userId = document.getElementById('userIdInput').value.trim();
    if (!userId) {
        showToast('Please enter a Discord User ID.');
        return;
    }

    if (!/^\d{17,20}$/.test(userId)) {
        showToast('Invalid Discord User ID format.');
        return;
    }

    const btn = document.querySelector('.decode-btn');
    btn.disabled = true;
    btn.textContent = 'Loading...';

    try {
        const res = await fetch(`/api/username-history/${userId}`, { cache: 'no-store' });

        if (res.status === 403) {
            const err = await res.json().catch(() => ({}));
            showBlocked(err);
            btn.disabled = false;
            btn.textContent = 'Look Up';
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.error || 'Failed to fetch username history.');
            btn.disabled = false;
            btn.textContent = 'Look Up';
            return;
        }

        // Update counter after successful search
        updateFreeSearchCounter();

        const data = await res.json();

        const userInfo = document.getElementById('userInfo');
        const noData = document.getElementById('noData');
        const historyTable = document.getElementById('historyTable');
        const historyBody = document.getElementById('historyBody');
        const historyEmptyState = document.getElementById('historyEmptyState');
        const resultsContainer = document.getElementById('resultsContainer');

        historyEmptyState.style.display = 'none';
        resultsContainer.style.display = 'block';

        const avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(parseInt(userId) >> 22) % 6}.png`;
        document.getElementById('userAvatar').src = avatarUrl;
        document.getElementById('userDisplayName').textContent = userId;
        document.getElementById('userUsername').textContent = `ID: ${userId}`;

        try {
            const userRes = await fetch(`/api/user-info/${userId}`);
            if (userRes.ok) {
                const userData = await userRes.json();
                document.getElementById('userDisplayName').textContent = userData.global_name || userData.username || userId;
                document.getElementById('userUsername').textContent = `${userData.username || 'Unknown'} (${userId})`;
                const ext = userData.avatar && userData.avatar.startsWith('a_') ? 'gif' : 'png';
                document.getElementById('userAvatar').src = userData.avatar
                    ? `https://cdn.discordapp.com/avatars/${userId}/${userData.avatar}.${ext}?size=64`
                    : avatarUrl;
            }
        } catch {}

        userInfo.style.display = 'block';

        if (data.optedOut) {
            noData.style.display = 'block';
            noData.innerHTML = '<p style="color:var(--muted);">This user has opted out of username history tracking.</p>';
            historyTable.style.display = 'none';
        } else if (!data.history || data.history.length === 0) {
            noData.style.display = 'block';
            noData.innerHTML = '<p style="color:var(--muted);">No username history found for this user.</p>';
            historyTable.style.display = 'none';
        } else {
            noData.style.display = 'none';
            historyTable.style.display = 'block';

            historyBody.innerHTML = data.history.map(entry => {
                const date = new Date(entry.changed_at);
                const ts = Math.floor(date.getTime() / 1000);
                return `
                    <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:10px 12px;">${escapeHtml(entry.old_username)}</td>
                        <td style="padding:10px 12px; color:#2ecc71;">${escapeHtml(entry.new_username)}</td>
                        <td style="padding:10px 12px; color:var(--muted); font-size:13px;"><t:${ts}:R></td>
                    </tr>
                `;
            }).join('');
        }

        if (window.trackToolUsage) trackToolUsage('username-history');
    } catch (err) {
        showToast('An error occurred. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Look Up';
    }
}

function showBlocked(data) {
    const mainContent = document.getElementById('toolMainContent');
    const locked = document.getElementById('eligibilityLocked');
    const message = document.getElementById('eligibilityMessage');

    if (!mainContent || !locked || !message) return;

    mainContent.style.display = 'none';
    locked.style.display = 'block';

    if (data.isLoggedIn && data.optedOut) {
        message.innerHTML = `
            <p style="color:var(--muted); margin-bottom:10px;">You have opted out of username history tracking.</p>
            <p style="color:var(--muted); margin-bottom:15px; font-size:13px;">To search other users, you need to allow being searched yourself.</p>
            <button class="decode-btn" onclick="toggleOptIn()" style="background:var(--accent);">Allow Search & Unlock</button>
        `;
    } else {
        const used = data.freeSearchesUsed || 0;
        const max = data.freeSearchesMax || 1;
        message.innerHTML = `
            <p style="color:var(--muted); margin-bottom:10px;">Free searches used: <strong>${used}/${max}</strong></p>
            <p style="color:var(--muted); margin-bottom:15px; font-size:13px;">Log in with Discord to continue using the Username History tool.</p>
            <a href="/api/auth/login" class="decode-btn" style="background:var(--accent); text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
                <i class="fa-brands fa-discord"></i> Login with Discord
            </a>
        `;
    }
}

async function toggleOptIn() {
    try {
        const res = await fetch('/api/username-history/optout', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            if (!data.optedOut) {
                document.getElementById('eligibilityLocked').style.display = 'none';
                document.getElementById('toolMainContent').style.display = 'block';
                showToast('You can now search other users.');
            }
        }
    } catch (e) {
        showToast('Failed to update settings. Please try again.');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
