function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let cachedGuilds = [];

const FEATURE_INFO = {
    'ANIMATED_ICON': { label: 'Animated Icon', color: '#ff73fa', desc: 'Server has an animated icon.' },
    'BANNER': { label: 'Banner', color: '#5865f2', desc: 'Server has a custom banner image.' },
    'COMMUNITY': { label: 'Community', color: '#43b581', desc: 'Server is a community server.' },
    'DISCOVERABLE': { label: 'Discoverable', color: '#faa61a', desc: 'Server is listed in Discord Discovery.' },
    'FEATURABLE': { label: 'Featurable', color: '#f04747', desc: 'Server can be featured by Discord.' },
    'INVITE_SPLASH': { label: 'Invite Splash', color: '#7289da', desc: 'Server has a custom invite background.' },
    'MEMBER_VERIFICATION_GATE_ENABLED': { label: 'Verification Gate', color: '#43b581', desc: 'Rules screening is enabled.' },
    'NEWS': { label: 'News Channels', color: '#ff73fa', desc: 'Server has announcement channels.' },
    'PARTNERED': { label: 'Partnered', color: '#5865f2', desc: 'Server is partnered with Discord.' },
    'VANITY_URL': { label: 'Vanity URL', color: '#faa61a', desc: 'Server has a custom invite link.' },
    'VERIFIED': { label: 'Verified', color: '#43b581', desc: 'Server is verified by Discord.' },
    'ROLE_ICONS': { label: 'Role Icons', color: '#ff73fa', desc: 'Server has custom icons for roles.' },
    'SOUNDBOARD': { label: 'Soundboard', color: '#7289da', desc: 'Server has custom soundboard sounds.' },
    'GUILD_ONBOARDING': { label: 'Onboarding', color: '#5865f2', desc: 'Server has a welcome experience.' },
    'MONETIZATION_ENABLED': { label: 'Monetized', color: '#faa61a', desc: 'Server has monetization features enabled.' },
    'ANIMATED_BANNER': { label: 'Animated Banner', color: '#5865f2', desc: 'Server has an animated banner.' },
    'PREVIEW_ENABLED': { label: 'Preview Enabled', color: '#43b581', desc: 'Server can be previewed without joining.' },
    'MEMBER_PROFILES': { label: 'Member Profiles', color: '#ff73fa', desc: 'Server has custom member profiles.' },
    'COMMERCE': { label: 'Commerce', color: '#faa61a', desc: 'Server has store channels.' },
    'ENABLED_DISCOVERABLE_BEFORE': { label: 'Discovered Before', color: '#43b581', desc: 'Server was previously discoverable.' },
    'GUILD_WEB_PAGE_VANITY_URL': { label: 'Web Vanity URL', color: '#faa61a', desc: 'Server has a web vanity URL.' }
};

document.addEventListener('DOMContentLoaded', () => {
    checkUserGuilds();
    
    // Check for guild ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const guildId = urlParams.get('guild');
    if (guildId) {
        lookupGuild(guildId);
    }

    const input = document.getElementById('inviteInput');
    if (input) {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                lookupInvite();
            }
        });
    }
});

async function checkUserGuilds() {
    try {
        const response = await fetch('/api/user/guilds');
        if (response.ok) {
            const guilds = await response.json();
            if (guilds && guilds.length > 0) {
                cachedGuilds = guilds;
                renderGuilds(guilds);
            }
        }
    } catch (err) {
        console.error('Failed to load user guilds');
    }
}

function renderGuilds(guilds) {
    const container = document.getElementById('user-guilds');
    const grid = document.getElementById('guild-grid');
    
    if (!grid) return;

    grid.innerHTML = guilds.map(guild => `
        <div class="server-item" data-guild-id="${escapeHtml(guild.id)}">
            ${guild.icon ? `<img src="https://cdn.discordapp.com/icons/${escapeHtml(guild.id)}/${escapeHtml(guild.icon)}.png?size=64">` : `<div class="guild-icon" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:var(--surface2); border-radius:10px; font-weight:800; font-size:14px;">${escapeHtml(guild.name.charAt(0))}</div>`}
            <span>${escapeHtml(guild.name)}</span>
        </div>
    `).join('');

    grid.querySelectorAll('.server-item').forEach(item => {
        item.addEventListener('click', function() {
            lookupGuild(this.getAttribute('data-guild-id'));
        });
    });
    
    if (container) container.style.display = 'block';
}

async function lookupGuild(guildId) {
    const resultArea = document.getElementById('result');
    if (!resultArea) return;

    // First try: use cached guild data from the user's guild list (no extra API call needed)
    const cached = cachedGuilds.find(g => g.id === guildId);
    if (cached) {
        const inviteMock = {
            guild: {
                id: cached.id,
                name: cached.name,
                icon: cached.icon,
                banner: cached.banner || null,
                splash: cached.splash || null,
                description: cached.description || null,
                features: cached.features || [],
                verification_level: cached.verification_level ?? null,
                nsfw_level: cached.nsfw_level ?? null,
                premium_tier: cached.premium_tier ?? null,
                premium_subscription_count: cached.premium_subscription_count ?? null,
                vanity_url_code: cached.vanity_url_code || null,
            },
            approximate_member_count: cached.approximate_member_count || null,
            approximate_presence_count: cached.approximate_presence_count || null,
            channel: null,
            inviter: null
        };
        displayInvite(inviteMock);
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    // Fallback: show loader and try API (requires bot token on server)
    resultArea.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const response = await fetch(`/api/guilds/${guildId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Guild details unavailable.');
        }

        const inviteMock = {
            guild: data,
            approximate_member_count: data.approximate_member_count,
            approximate_presence_count: data.approximate_presence_count,
            channel: null,
            inviter: null
        };

        displayInvite(inviteMock);
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        resultArea.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>Could not load guild details. Try looking up an invite link instead.</p>
            </div>
        `;
    }
}

async function lookupInvite() {
    const input = document.getElementById('inviteInput');
    const resultArea = document.getElementById('result');
    if (!input || !resultArea) return;
    
    let code = input.value.trim();

    if (!code) return;

    // Extract code from URL if necessary
    if (code.includes('discord.gg/')) {
        code = code.split('discord.gg/')[1].split('/')[0].split('?')[0];
    } else if (code.includes('discord.com/invite/')) {
        code = code.split('discord.com/invite/')[1].split('/')[0].split('?')[0];
    }

    // Show loader
    resultArea.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const response = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true&with_expiration=true`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Invite not found or expired.');
        }

        displayInvite(data);
    } catch (error) {
        resultArea.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function displayInvite(data) {
    const resultArea = document.getElementById('result');
    if (!resultArea) return;

    const guild = data.guild;
    const inviter = data.inviter;
    const channel = data.channel;

    const iconUrl = guild && guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=160` : null;
    const bannerUrl = guild && guild.banner ? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.webp?size=1024` : null;
    const splashUrl = guild && guild.splash ? `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.webp?size=1024` : null;

    let html = `
        <div class="invite-data">
            ${bannerUrl ? `<div class="server-banner-container" style="height: 240px;"><img src="${escapeHtml(bannerUrl)}" class="server-banner" alt="Banner"></div>` : ''}
            
            <div class="guild-header" style="${bannerUrl ? 'margin-top: -40px; position: relative; z-index: 2;' : 'margin-top: 20px;'}">
                ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" class="guild-icon" alt="Guild Icon" style="${bannerUrl ? 'border: 4px solid var(--surface);' : ''}">` : `<div class="guild-icon" style="display: flex; align-items: center; justify-content: center; background: var(--surface2); font-size: 32px; font-weight: 800; font-family: var(--sans); ${bannerUrl ? 'border: 4px solid var(--surface);' : ''}">${guild ? escapeHtml(guild.name.charAt(0)) : '?'}</div>`}
                <div class="guild-info">
                    <h2 style="display: flex; align-items: center; gap: 10px;">
                        ${guild ? escapeHtml(guild.name) : 'Unknown Guild'}
                        ${guild && guild.features?.includes('VERIFIED') ? '<i class="fa-solid fa-circle-check" style="color: #43b581; font-size: 18px;" title="Verified"></i>' : ''}
                        ${guild && guild.features?.includes('PARTNERED') ? '<i class="fa-solid fa-handshake" style="color: #5865f2; font-size: 18px;" title="Partnered"></i>' : ''}
                    </h2>
                    <div class="id"><i class="fa-solid fa-fingerprint"></i> ${guild ? escapeHtml(guild.id) : 'No ID'}</div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Total Members</div>
                    <div class="stat-value">${escapeHtml(data.approximate_member_count?.toLocaleString() || 'Unknown')}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Online Members</div>
                    <div class="stat-value"><span class="online-dot"></span>${escapeHtml(data.approximate_presence_count?.toLocaleString() || 'Unknown')}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div class="data-section" style="margin-top: 0;">
                    <div class="data-section-title"><i class="fa-solid fa-info-circle"></i> Basic Info</div>
                    ${channel ? `
                    <div class="data-row">
                        <div class="data-label">Channel</div>
                        <div class="data-value">#${escapeHtml(channel.name)}</div>
                    </div>
                    ` : ''}
                    <div class="data-row">
                        <div class="data-label">Verification</div>
                        <div class="data-value">${escapeHtml(getVerificationLevel(guild?.verification_level))}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label">NSFW Level</div>
                        <div class="data-value">${escapeHtml(getNSFWLevel(guild?.nsfw_level))}</div>
                    </div>
                    ${data.expires_at ? `
                    <div class="data-row">
                        <div class="data-label">Expires</div>
                        <div class="data-value">${escapeHtml(new Date(data.expires_at).toLocaleDateString())}</div>
                    </div>
                    ` : ''}
                </div>

                <div class="data-section" style="margin-top: 0;">
                    <div class="data-section-title"><i class="fa-solid fa-rocket"></i> Boost Status</div>
                    <div class="data-row">
                        <div class="data-label">Premium Tier</div>
                        <div class="data-value" style="color: #ff73fa; font-weight: 700;">Level ${escapeHtml(guild?.premium_tier || 0)}</div>
                    </div>
                    <div class="data-row">
                        <div class="data-label">Boost Count</div>
                        <div class="data-value">${escapeHtml(guild?.premium_subscription_count || 0)} Boosts</div>
                    </div>
                    ${guild?.vanity_url_code ? `
                    <div class="data-row">
                        <div class="data-label">Vanity URL</div>
                        <div class="data-value" style="color: var(--accent); font-weight: 600;">.gg/${escapeHtml(guild.vanity_url_code)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${guild?.description ? `
            <div class="data-section">
                <div class="data-section-title"><i class="fa-solid fa-quote-left"></i> Server Description</div>
                <div style="color: var(--text); font-size: 13px; line-height: 1.5; padding: 5px 0;">${escapeHtml(guild.description)}</div>
            </div>
            ` : ''}

            ${splashUrl ? `
            <div class="data-section">
                <div class="data-section-title"><i class="fa-solid fa-image"></i> Invite Splash Preview</div>
                <img src="${escapeHtml(splashUrl)}" style="width: 100%; border-radius: 12px; border: 1px solid var(--border); margin-top: 10px;">
            </div>
            ` : ''}

            ${guild && guild.features && guild.features.length > 0 ? `
            <div class="data-section">
                <div class="data-section-title"><i class="fa-solid fa-star"></i> Guild Features</div>
                <div class="features-grid">
                    ${guild.features.map(f => {
                        const info = FEATURE_INFO[f] || { 
                            label: f.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '), 
                            color: 'rgba(255,255,255,0.1)', 
                            desc: 'No description available.' 
                        };
                        return `
                            <div class="feature-tag" style="--feat-color: ${info.color}" title="${escapeHtml(info.desc)}">
                                <span class="feat-dot"></span>
                                <span class="feat-label">${escapeHtml(info.label)}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : ''}
            
            <a href="https://discord.gg/${escapeHtml(data.code || guild.id)}" target="_blank" rel="noopener noreferrer" class="join-server-btn">
                <i class="fa-brands fa-discord"></i> Join this Server
            </a>
        </div>
    `;

    resultArea.innerHTML = html;
}

function getVerificationLevel(level) {
    const levels = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High'
    };
    return levels[level] || 'Unknown';
}

function getNSFWLevel(level) {
    const levels = {
        0: 'Default',
        1: 'Explicit',
        2: 'Safe',
        3: 'Age Restricted'
    };
    return levels[level] || 'Default';
}

function getChannelType(type) {
    const types = {
        0: 'Text',
        1: 'DM',
        2: 'Voice',
        3: 'Group DM',
        4: 'Category',
        5: 'News',
        10: 'News Thread',
        11: 'Public Thread',
        12: 'Private Thread',
        13: 'Stage',
        14: 'Directory',
        15: 'Forum'
    };
    return types[type] || 'Unknown';
}
