let currentUser = null;
let currentFormat = 'png';

async function fetchUser() {
    const userId = document.getElementById('userId').value.trim();
    if (!userId || !/^\d{17,20}$/.test(userId)) {
        showToast('<i class="fa-solid fa-circle-exclamation"></i> Please enter a valid User ID.');
        return;
    }

    const btn = document.querySelector('.input-group button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('User not found');
        currentUser = await response.json();

        displayUser(currentUser);
        if (window.trackToolUsage) window.trackToolUsage('avatar-cdn');
    } catch (err) {
        showToast('<i class="fa-solid fa-circle-xmark"></i> Failed to fetch user. Check the ID.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function displayUser(user) {
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('result-area').style.display = 'block';

    const displayName = user.global_name || user.username;
    document.getElementById('user-name').textContent = `${displayName}${user.discriminator !== '0' ? `#${user.discriminator}` : ''}`;
    document.getElementById('user-id-display').textContent = `ID: ${user.id}`;
    
    let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(user.discriminator || 0) % 5}.png`;
    if (user.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
        avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=1024`;
    }
    document.getElementById('user-avatar').src = avatarUrl;

    if (user.banner) {
        const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
        document.getElementById('user-banner').style.backgroundImage = `url(https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024)`;
        document.getElementById('user-banner').style.backgroundColor = '';
    } else {
        document.getElementById('user-banner').style.backgroundImage = '';
        document.getElementById('user-banner').style.backgroundColor = user.accent_color ? `#${user.accent_color.toString(16).padStart(6, '0')}` : 'var(--accent)';
    }

    renderTabs(user);
    renderMatrix(user, currentFormat);
}

function renderTabs(user) {
    const tabContainer = document.getElementById('format-tabs');
    tabContainer.innerHTML = '';
    
    const formats = ['png', 'jpg', 'webp'];
    if (user.avatar && user.avatar.startsWith('a_')) formats.push('gif');

    formats.forEach(f => {
        const tab = document.createElement('div');
        tab.className = `format-tab ${currentFormat === f ? 'active' : ''}`;
        tab.textContent = f.toUpperCase();
        tab.onclick = () => {
            currentFormat = f;
            document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderMatrix(user, f);
        };
        tabContainer.appendChild(tab);
    });
}

function renderMatrix(user, format) {
    const container = document.getElementById('cdn-matrix');
    container.innerHTML = '';

    if (!user.avatar) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 40px;">Default avatars only support PNG via the embed CDN.</p>';
        return;
    }

    const sizes = [64, 128, 256, 512, 1024, 2048, 4096];

    sizes.forEach(size => {
        const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=${size}`;
        const item = document.createElement('div');
        item.className = 'cdn-item';
        item.innerHTML = `
            <div class="cdn-info">${format.toUpperCase()} @ ${size}px</div>
            <div class="cdn-link-row">
                <input type="text" class="cdn-input" value="${url}" readonly onclick="this.select()">
                <button class="copy-btn-mini" onclick="copyToClipboard('${url}', this)"><i class="fa-solid fa-copy"></i></button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        const icon = btn.querySelector('i');
        icon.className = 'fa-solid fa-check';
        btn.style.background = '#43b581';
        setTimeout(() => {
            icon.className = 'fa-solid fa-copy';
            btn.style.background = '';
        }, 2000);
        showToast('Link copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy.');
    }
}
