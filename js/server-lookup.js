function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function lookupServer() {
    const input = document.getElementById('server-input');
    const resultArea = document.getElementById('server-result');
    let guildId = input.value.trim();

    if (!guildId) return;

    // Extract ID if a URL is pasted
    if (guildId.includes('discord.com/channels/')) {
        guildId = guildId.split('discord.com/channels/')[1].split('/')[0];
    } else if (guildId.includes('discordapp.com/channels/')) {
        guildId = guildId.split('discordapp.com/channels/')[1].split('/')[0];
    }

    // Show loader
    resultArea.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/widget.json`);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Server not found or Widget is disabled.');
            } else if (response.status === 403) {
                 throw new Error('Widget is disabled for this server.');
            }
            throw new Error(data.message || 'Failed to fetch server info.');
        }

        displayServer(data);
    } catch (error) {
        resultArea.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function displayServer(data) {
    const resultArea = document.getElementById('server-result');
    
    let html = `
        <div class="lookup-layout">
            <div class="invite-data">
                <div class="guild-header" style="margin-top: 30px;">
                    <div class="guild-icon" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--accent), var(--accent2)); font-size: 36px; font-weight: 800; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${escapeHtml(data.name.charAt(0))}</div>
                    <div class="guild-info">
                        <h2>${escapeHtml(data.name)}</h2>
                        <div class="id"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(data.id)}</div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Online Presence</div>
                        <div class="stat-value"><span class="online-dot"></span>${escapeHtml(data.presence_count?.toLocaleString() || '0')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Public Channels</div>
                        <div class="stat-value"><i class="fa-solid fa-hashtag" style="font-size: 14px; color: var(--muted); margin-right: 5px;"></i>${escapeHtml(data.channels?.length || '0')}</div>
                    </div>
                </div>

                <div class="data-section">
                    <div class="data-section-title"><i class="fa-solid fa-circle-info"></i> Widget Details</div>
                    <div class="data-row">
                        <div class="data-label">Instant Invite</div>
                        <div class="data-value">
                            ${data.instant_invite ? `<a href="${escapeHtml(data.instant_invite)}" target="_blank" rel="noopener noreferrer" class="join-link">Join Server <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : '<span style="color: var(--muted); opacity: 0.6;">Disabled</span>'}
                        </div>
                    </div>
                </div>

                ${data.channels && data.channels.length > 0 ? `
                <div class="data-section">
                    <div class="data-section-title"><i class="fa-solid fa-volume-high"></i> Public Voice Channels</div>
                    <div class="channels-list">
                        ${data.channels.map(c => `
                            <div class="channel-item">
                                <i class="fa-solid fa-headset"></i>
                                <span>${escapeHtml(c.name)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="members-sidebar">
                <div class="data-section-title" style="margin-bottom: 20px;"><i class="fa-solid fa-users"></i> Online Members (${escapeHtml(data.presence_count)})</div>
                <div class="members-list">
                    ${data.members && data.members.length > 0 ? data.members.map(m => `
                        <div class="member-row">
                            <div class="member-avatar-wrapper">
                                <img src="${escapeHtml(m.avatar_url)}" class="member-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                                <span class="status-indicator ${escapeHtml(m.status)}"></span>
                            </div>
                            <div class="member-info">
                                <span class="member-name">${escapeHtml(m.username)}</span>
                                ${m.game ? `<span class="member-username">Playing ${escapeHtml(m.game.name)}</span>` : ''}
                            </div>
                        </div>
                    `).join('') : '<div class="empty-state" style="padding: 20px; font-size: 12px;">No members visible.</div>'}
                </div>
            </div>
        </div>
    `;

    resultArea.innerHTML = html;
}

// Allow pressing Enter to search
document.getElementById('server-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        lookupServer();
    }
});
