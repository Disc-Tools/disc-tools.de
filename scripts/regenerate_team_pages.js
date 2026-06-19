const path = require('path');
const fs = require('fs');

const PROFILES_FILE = path.join(__dirname, '../api/profiles.json');
const OUT_DIR = path.join(__dirname, '../team');

function loadProfiles() {
    try {
        return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to load profiles.json', e);
        return {};
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeSpotifyEmbedUrl(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();

    const trackMatch = url.match(/^https?:\/\/open\.spotify\.com\/(?:embed\/)?track\/([A-Za-z0-9]+)(?:[/?].*)?$/);
    if (trackMatch) return `https://open.spotify.com/embed/track/${trackMatch[1]}`;

    const albumMatch = url.match(/^https?:\/\/open\.spotify\.com\/(?:embed\/)?album\/([A-Za-z0-9]+)(?:[/?].*)?$/);
    if (albumMatch) return `https://open.spotify.com/embed/album/${albumMatch[1]}`;

    const playlistMatch = url.match(/^https?:\/\/open\.spotify\.com\/(?:embed\/)?playlist\/([A-Za-z0-9]+)(?:[/?].*)?$/);
    if (playlistMatch) return `https://open.spotify.com/embed/playlist/${playlistMatch[1]}`;

    return url;
}

function normalizeSoundcloudEmbedUrl(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();
    if (url.includes('soundcloud.com')) {
        if (url.includes('w.soundcloud.com/player')) {
            return url;
        }
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
    }
    return '';
}

const PLATFORM_COLORS = {
    instagram: '#E4405F',
    twitter: '#1DA1F2',
    github: '#4078c0',
    youtube: '#FF0000',
    twitch: '#9146FF',
    tiktok: '#000000',
    linkedin: '#0A66C2',
    discord: '#5865F2',
    steam: '#1b2838',
    spotify: '#1DB954',
    soundcloud: '#FF5500',
    reddit: '#FF4500'
};

const LINK_PLATFORM_CONFIG = {
    instagram: { name: 'Instagram', icon: 'fa-brands fa-instagram', url: username => `https://instagram.com/${username}` },
    twitter: { name: 'Twitter/X', icon: 'fa-brands fa-x-twitter', url: username => `https://x.com/${username}` },
    github: { name: 'GitHub', icon: 'fa-brands fa-github', url: username => `https://github.com/${username}` },
    youtube: { name: 'YouTube', icon: 'fa-brands fa-youtube', url: username => `https://youtube.com/@${username}` },
    twitch: { name: 'Twitch', icon: 'fa-brands fa-twitch', url: username => `https://twitch.tv/${username}` },
    tiktok: { name: 'TikTok', icon: 'fa-brands fa-tiktok', url: username => `https://tiktok.com/@${username}` },
    linkedin: { name: 'LinkedIn', icon: 'fa-brands fa-linkedin', url: username => `https://linkedin.com/in/${username}` },
    discord: { name: 'Discord', icon: 'fa-brands fa-discord', url: (username, link) => `https://discord.com/users/${link?.discordId || username}` },
    steam: { name: 'Steam', icon: 'fa-brands fa-steam', url: username => `https://steamcommunity.com/id/${username}` },
    spotify: { name: 'Spotify', icon: 'fa-brands fa-spotify', url: username => `https://open.spotify.com/user/${username}` },
    soundcloud: { name: 'SoundCloud', icon: 'fa-brands fa-soundcloud', url: username => `https://soundcloud.com/${username}` },
    reddit: { name: 'Reddit', icon: 'fa-brands fa-reddit', url: username => `https://reddit.com/user/${username}` }
};

function normalizeHandle(value) {
    const clean = String(value || '').trim().replace(/^@+/, '').toLowerCase();
    return clean ? `@${clean}` : '';
}

function getWebsiteHandle(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
        return '';
    }
}

function getLinkUrl(link) {
    if (link.url) return link.url;
    const platform = LINK_PLATFORM_CONFIG[link.platform];
    if (platform && link.username) return platform.url(String(link.username).trim().replace(/^@+/, ''), link);
    return '#';
}

function getLinkDisplay(link) {
    const platform = LINK_PLATFORM_CONFIG[link.platform];
    const url = getLinkUrl(link);
    return {
        url,
        title: link.label || platform?.name || link.platform || url,
        handler: platform ? normalizeHandle(link.username) : getWebsiteHandle(url),
        iconClass: platform?.icon || 'fa-solid fa-globe',
        color: PLATFORM_COLORS[link.platform] || null
    };
}

function renderProfileHtml(p) {
    const avatar = p.avatar || '';
    const displayName = p.displayName || p.username || '';
    const safeDisplayName = escapeHtml(displayName);
    const safeUsername = escapeHtml(p.username || '');
    const title = `${safeDisplayName} (@${safeUsername})`;
    const bio = escapeHtml(p.bio || '');
    const spotifyEmbedUrl = normalizeSpotifyEmbedUrl(p.music?.spotifyEmbed || p.music?.favoriteSpotify || '');
    const soundcloudEmbedUrl = normalizeSoundcloudEmbedUrl(p.music?.soundcloudEmbed || '');
    const embedSections = [];
    if (spotifyEmbedUrl) {
        embedSections.push(`
      <section class="embed-block embed-block-spotify">
        <div class="embed-header"><span>Spotify Song</span></div>
        <div class="embed-frame embed-frame-spotify">
          <iframe src="${spotifyEmbedUrl}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" loading="lazy" title="Spotify embed"></iframe>
        </div>
      </section>`);
    }
    if (soundcloudEmbedUrl) {
        embedSections.push(`
      <section class="embed-block embed-block-soundcloud">
        <div class="embed-header"><span>SoundCloud Track</span></div>
        <div class="embed-frame embed-frame-soundcloud">
          <iframe src="${soundcloudEmbedUrl}" width="100%" height="166" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" loading="lazy" title="SoundCloud embed"></iframe>
        </div>
      </section>`);
    }
    const embedHtml = embedSections.join('\n');
    const listeningScript = p.music?.currentlyListeningEnabled
        ? `<script src="/js/spotify-listening.js" data-user-id="${escapeHtml(p.userId)}" defer></script>`
        : '';

    const profileBannerStyle = p.banner?.type === 'color' && p.banner?.value
        ? `background:${escapeHtml(p.banner.value)};`
        : p.banner?.type === 'discord' && p.banner?.value
            ? `background-image:url('${escapeHtml(p.banner.value)}'); background-size:cover; background-position:center;`
            : 'background: linear-gradient(135deg, rgba(17,17,24,0.9), rgba(9,11,17,0.9));';

    const linksHtml = (p.links || []).map(l => {
        const link = getLinkDisplay(l);
        const iconStyle = link.color ? `color:${link.color};` : '';
        return `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="profile-link"><i class="${escapeHtml(link.iconClass)} profile-link-icon" style="${iconStyle}"></i><span class="profile-link-text"><span class="profile-link-title">${escapeHtml(link.title)}</span>${link.handler ? `<span class="profile-link-handle">${escapeHtml(link.handler)}</span>` : ''}</span></a>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} | Disc-Tools Team</title>
  <meta name="description" content="${bio}">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
  <main class="profile-container">
    <section class="profile-card layout-${p.layout || 'centered'}">
      <div class="profile-banner" style="${profileBannerStyle}"></div>
      <div class="profile-content">
        <div class="profile-header-flex">
          <div class="profile-avatar-section">
            <div class="profile-avatar-wrapper">
              <img src="${avatar}" alt="${safeDisplayName}" class="profile-avatar">
            </div>
          </div>
          <div class="profile-info-section">
            <div class="profile-name-row">
              <div class="profile-main-info">
                <h2>${safeDisplayName}</h2>
                <div class="username">@${safeUsername}</div>
              </div>
            </div>
            <p class="profile-bio">${bio}</p>
          </div>
        </div>
        <div id="spotify-now-playing" class="currently-playing-card" style="display:none;"></div>
        <div class="links">${linksHtml}</div>
        ${embedHtml}
      </div>
    </section>
  </main>
  ${listeningScript}
</body>
</html>`;
}

async function regenerateAll() {
    const profiles = loadProfiles();
    for (const p of Object.values(profiles)) {
        const userFolder = path.join(OUT_DIR, p.username);
        if (p.visibility === 'public') {
            fs.mkdirSync(userFolder, { recursive: true });
            const html = renderProfileHtml(p);
            fs.writeFileSync(path.join(userFolder, 'index.html'), html, 'utf8');
            console.log('Regenerated:', p.username);
        } else {
            if (fs.existsSync(userFolder)) {
                fs.rmSync(userFolder, { recursive: true, force: true });
                console.log('Removed private profile folder:', p.username);
            }
        }
    }

    if (process.env.TEST_SPOTIFY_ENDPOINT === '1') {
        const testProfile = Object.values(profiles).find(pp => pp.music && pp.music.spotifyRefreshToken);
        if (!testProfile) {
            console.log('No profile with a spotifyRefreshToken found for manual test.');
            return;
        }

        console.log('\nManual test: fetch /api/spotify/currently-playing?userId=' + testProfile.userId);
        try {
            const urlStr = `http://localhost:${process.env.PORT || 3000}/api/spotify/currently-playing?userId=${testProfile.userId}`;
            const urlObj = new URL(urlStr);
            const httpMod = urlObj.protocol === 'https:' ? require('https') : require('http');
            await new Promise((resolve, reject) => {
                const req = httpMod.get(urlObj, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        console.log('HTTP status:', res.statusCode);
                        console.log('Response body:', data);
                        resolve();
                    });
                });
                req.on('error', (err) => reject(err));
                req.setTimeout(10000, () => {
                    req.abort();
                    reject(new Error('Request timed out'));
                });
            });
        } catch (e) {
            console.error('Manual HTTP test failed (server may not be running or network unreachable):', e.message || e);
        }
    }
}

if (require.main === module) {
    regenerateAll().catch(e => {
        console.error('Regeneration script failed:', e);
        process.exit(1);
    });
}

module.exports = { regenerateAll, renderProfileHtml };
