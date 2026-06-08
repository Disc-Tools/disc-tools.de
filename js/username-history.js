document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userIdInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') lookupUsernameHistory();
    });
});

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
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.error || 'Failed to fetch username history.');
            btn.disabled = false;
            btn.textContent = 'Look Up';
            return;
        }

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
