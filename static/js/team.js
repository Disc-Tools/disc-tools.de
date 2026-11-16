(() => {
    const content = document.getElementById('team-content');
    const status = document.getElementById('team-status');
    const retry = document.getElementById('team-retry');
    const presences = { online: 'Online', idle: 'Away', dnd: 'Do not disturb', offline: 'Offline' };

    function element(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function image(src, className) {
        try {
            const url = new URL(src);
            if (url.protocol !== 'https:' || !['cdn.discordapp.com', 'disc-tools.de'].includes(url.hostname)) return null;
            const img = element('img', className);
            img.alt = '';
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.src = url.href;
            img.addEventListener('error', () => img.remove(), { once: true });
            return img;
        } catch {
            return null;
        }
    }

    function memberCard(member, role) {
        const card = element('li', 'team-member');
        const banner = element('div', 'team-banner');
        const bannerImage = image(member.bannerURL, 'team-banner-image');
        if (bannerImage) banner.append(bannerImage);

        const body = element('div', 'team-member-body');
        const avatar = element('div', 'team-avatar');
        const avatarImage = image(member.avatarURL, 'team-avatar-image');
        if (avatarImage) avatar.append(avatarImage);
        if (/^a_[a-f0-9]{32}$/.test(member.avatarDecorationAsset)) {
            avatar.append(image(`https://cdn.discordapp.com/avatar-decoration-presets/${member.avatarDecorationAsset}.png`, 'team-decoration'));
        }

        const presence = Object.hasOwn(presences, member.onlineStatus) ? member.onlineStatus : 'offline';
        const dot = element('span', `team-presence ${presence}`);
        dot.title = presences[presence];
        dot.setAttribute('aria-label', presences[presence]);
        dot.setAttribute('role', 'img');
        avatar.append(dot);
        const roleLabel = element('p', 'team-role', role.name);
        if (/^#[0-9a-f]{6}$/i.test(role.color)) roleLabel.style.setProperty('--role-color', role.color);
        body.append(avatar, roleLabel, element('h2', 'team-name', member.displayName || member.username),
            element('p', 'team-handle', `@${member.username}`));
        card.append(banner, body);
        return card;
    }

    async function loadTeam() {
        content.setAttribute('aria-busy', 'true');
        retry.hidden = true;
        status.textContent = 'Loading team members…';

        try {
            const response = await fetch('/api/team', { signal: AbortSignal.timeout(12000) });
            if (!response.ok) throw new Error('Team request failed');
            const groups = await response.json();
            const cards = groups.flatMap(role => role.members.map(member => memberCard(member, role)));
            content.replaceChildren(...cards);
            status.textContent = cards.length ? '' : 'No team members are listed yet.';
        } catch {
            status.textContent = 'Could not load team members. Please try again.';
            retry.hidden = false;
        } finally {
            content.setAttribute('aria-busy', 'false');
        }
    }

    retry.addEventListener('click', loadTeam);
    loadTeam();
})();
