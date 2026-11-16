(() => {
    const accountLink = document.getElementById('account-link');
    const menu = document.getElementById('account-menu');
    const trigger = document.getElementById('account-trigger');

    document.addEventListener('click', event => {
        if (menu.open && !menu.contains(event.target)) menu.open = false;
    });

    menu.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !menu.open) return;
        menu.open = false;
        trigger.focus();
    });

    const cdn = 'https://cdn.discordapp.com';
    const fallbackAvatar = '/static/assets/img/logo.svg';

    function profileImage(className, url) {
        const image = document.createElement('img');
        image.className = className;
        image.alt = '';
        image.referrerPolicy = 'no-referrer';
        image.src = url;
        return image;
    }

    const profileCard = document.getElementById('profile-card');
    const profileStatus = document.getElementById('profile-status');
    const profileLogin = document.getElementById('profile-login');

    function makeAvatar(user, size) {
        const identity = document.createElement('span');
        identity.className = 'account-avatar';
        let avatarUrl = fallbackAvatar;

        if (/^\d{17,20}$/.test(user?.id)) {
            if (/^(?:a_)?[a-f0-9]{32}$/.test(user.avatar)) {
                const format = user.avatar.startsWith('a_') ? 'gif' : 'webp';
                avatarUrl = `${cdn}/avatars/${user.id}/${user.avatar}.${format}?size=${size}`;
            } else {
                const index = user.discriminator && user.discriminator !== '0'
                    ? Number(user.discriminator) % 5
                    : Number((BigInt(user.id) >> 22n) % 6n);
                avatarUrl = `${cdn}/embed/avatars/${index}.png`;
            }
        }

        const avatar = profileImage('account-avatar-image', avatarUrl);
        avatar.addEventListener('error', () => { avatar.src = fallbackAvatar; }, { once: true });
        identity.append(avatar);

        const decoration = user?.avatar_decoration_data?.asset;
        if (/^a_[a-f0-9]{32}$/.test(decoration)) {
            const overlay = profileImage('account-avatar-decoration', `${cdn}/avatar-decoration-presets/${decoration}.png?size=${size === 64 ? 96 : 256}`);
            overlay.addEventListener('error', () => overlay.remove(), { once: true });
            identity.append(overlay);
        }

        return identity;
    }

    function showProfile(user) {
        const displayName = user?.global_name || user?.username || 'My profile';
        const name = document.createElement('span');
        name.className = 'account-name';
        name.textContent = displayName;

        trigger.title = displayName;
        trigger.replaceChildren(makeAvatar(user, 64), name);
        accountLink.hidden = true;
        menu.hidden = false;
    }

    function showProfilePage(user) {
        const banner = document.getElementById('profile-banner');
        banner.replaceChildren();
        if (/^\d{17,20}$/.test(user.id) && /^(?:a_)?[a-f0-9]{32}$/.test(user.banner)) {
            const format = user.banner.startsWith('a_') ? 'gif' : 'webp';
            const image = profileImage('profile-banner-image', `${cdn}/banners/${user.id}/${user.banner}.${format}?size=1024`);
            image.addEventListener('error', () => image.remove(), { once: true });
            banner.append(image);
        }

        document.getElementById('profile-avatar').replaceChildren(makeAvatar(user, 256));
        document.getElementById('profile-name').textContent = user.global_name || user.username;
        document.getElementById('profile-handle').textContent = `@${user.username}`;

        const badges = [
            [1, 'Staff'], [2, 'Partner'], [4, 'HypeSquad'], [8, 'Bug Hunter'],
            [64, 'Bravery'], [128, 'Brilliance'], [256, 'Balance'], [512, 'Early Supporter'],
            [16384, 'Bug Hunter Level 2'], [131072, 'Verified Developer'],
            [262144, 'Certified Moderator'], [4194304, 'Active Developer']
        ].filter(([flag]) => user.public_flags & flag).map(([, label]) => label);

        const facts = document.getElementById('profile-facts');
        const fields = [
            ['Discord ID', user.id], ['Email verified', user.verified ? 'Yes' : 'No'],
            ['Nitro', ['None', 'Nitro Classic', 'Nitro', 'Nitro Basic'][user.premium_type] || 'None']
        ];
        if (badges.length) fields.push(['Badges', badges.join(', ')]);
        if (user.email) fields.push(['Email', user.email]);

        facts.replaceChildren(...fields.map(([label, value]) => {
            const row = document.createElement('div');
            const term = document.createElement('dt');
            const detail = document.createElement('dd');
            term.textContent = label;
            detail.textContent = value;
            if (label === 'Email') {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'profile-email';
                button.textContent = value;
                let resetColor;
                button.addEventListener('click', () => {
                    clearTimeout(resetColor);
                    button.classList.add('is-green');
                    resetColor = setTimeout(() => button.classList.remove('is-green'), 600);
                });
                detail.replaceChildren(button);
            }
            row.append(term, detail);
            return row;
        }));

        profileStatus.textContent = '';
        profileCard.hidden = false;
    }

    async function checkVpn() {
        try {
            const response = await fetch('/api/security/vpn-check', {
                cache: 'no-store',
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) return;

            const connection = await response.json();
            if (connection.isVpn !== true) return;

            try {
                const { ip, type, provider, asn } = connection;
                sessionStorage.setItem('blocked-vpn-details', JSON.stringify({ ip, type, provider, asn }));
            } catch {
                // The blocked page also works when browser storage is unavailable.
            }
            window.location.replace('/blocked/vpn/');
        } catch {
            // A failed lookup does not classify the connection as a VPN.
        }
    }

    async function updateAccountLink() {
        menu.open = false;
        menu.hidden = true;
        accountLink.hidden = false;

        if (profileCard) {
            profileCard.hidden = true;
            profileLogin.hidden = true;
            profileStatus.textContent = 'Checking your Discord session…';
        }

        try {
            const response = await fetch('/api/auth/me', { cache: 'no-store' });
            if (!response.ok) throw new Error('Session request failed');

            const session = await response.json();
            if (session?.authenticated !== true || !session.user) {
                void checkVpn();
                if (profileCard) {
                    profileStatus.textContent = 'Log in with Discord to view your profile.';
                    profileLogin.hidden = false;
                }
                return;
            }

            showProfile(session.user);
            if (profileCard) showProfilePage(session.user);
        } catch {
            if (profileCard) profileStatus.textContent = 'Could not load your profile. Try reloading this page.';
        }
    }

    updateAccountLink();
    window.addEventListener('pageshow', event => {
        if (event.persisted) updateAccountLink();
    });
})();
