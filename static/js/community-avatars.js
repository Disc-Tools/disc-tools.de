(() => {
    const container = document.getElementById('poll-list') || document.getElementById('ann-container');
    const selector = 'img[data-discord-avatar]';
    const refreshInterval = 120000;
    const lookups = new Map();
    const visible = new Set();
    const observed = new Set();

    function currentAvatar(id) {
        const now = Date.now();
        const cached = lookups.get(id);
        if (cached && cached.expires > now) return cached.promise;

        const promise = fetch('/api/avatar-cdn/' + id, { signal: AbortSignal.timeout(6000) })
            .then(async response => {
                if (!response.ok) return null;
                const data = await response.json();
                if (String(data.id) !== id) return null;
                const url = new URL(data.previewUrl);
                const custom = new RegExp('^/avatars/' + id + '/(?:a_)?[a-f0-9]{32}\\.(?:gif|png|webp)$');
                if (url.origin !== 'https://cdn.discordapp.com' ||
                    (!custom.test(url.pathname) && !/^\/embed\/avatars\/[0-5]\.png$/.test(url.pathname))) return null;
                url.search = '?size=64';
                return url.href;
            })
            .catch(() => null);

        lookups.set(id, { promise, expires: now + refreshInterval });
        return promise;
    }

    async function update(image) {
        const id = image.dataset.discordAvatar;
        if (document.hidden || !/^\d{17,20}$/.test(id)) return;
        const url = await currentAvatar(id);
        if (url && image.isConnected && image.dataset.discordAvatar === id && image.src !== url) {
            image.src = url;
        }
    }

    const observer = new IntersectionObserver(entries => {
        for (const { target, isIntersecting } of entries) {
            if (isIntersecting && observed.has(target)) {
                visible.add(target);
                void update(target);
            } else {
                visible.delete(target);
            }
        }
    }, { rootMargin: '150px' });

    function observeAvatars() {
        for (const image of observed) {
            if (container.contains(image)) continue;
            observer.unobserve(image);
            observed.delete(image);
            visible.delete(image);
        }
        for (const image of container.querySelectorAll(selector)) {
            if (observed.has(image)) continue;
            observed.add(image);
            observer.observe(image);
        }
    }

    function refreshVisible() {
        for (const image of visible) void update(image);
    }

    observeAvatars();
    new MutationObserver(observeAvatars).observe(container, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['data-discord-avatar'],
    });
    document.addEventListener('visibilitychange', refreshVisible);
    window.setInterval(refreshVisible, refreshInterval);
})();
