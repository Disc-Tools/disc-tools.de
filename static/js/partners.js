(() => {
    const list = document.getElementById('partners-list');
    const status = document.getElementById('partners-status');
    const copy = document.getElementById('partner-copy');
    const copyStatus = document.getElementById('copy-status');
    const slug = location.pathname.split('/')[2];

    function element(tag, text) {
        const node = document.createElement(tag);
        node.textContent = text || '';
        return node;
    }

    function webUrl(value, base) {
        try {
            const url = new URL(value, base);
            if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
        } catch {
            return null;
        }
        return null;
    }

    function partnerLogo(partner) {
        const image = element('img');
        image.alt = '';
        image.width = 48;
        image.height = 48;
        image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer';
        const fallback = '/static/assets/img/logo.svg';
        image.addEventListener('error', () => { image.src = fallback; }, { once: true });
        image.src = (partner.logo && webUrl(partner.logo, 'https://disc-tools.de/')) || fallback;
        return image;
    }

    function card(partner) {
        const row = element('li');
        const link = element('a');
        link.href = '/partners/' + encodeURIComponent(partner.slug) + '/';
        const title = element('h2', partner.name);
        link.append(partnerLogo(partner), title, element('p', partner.description));
        row.append(link);
        return row;
    }

    function detail(partner) {
        document.title = partner.name + ' · Disc-Tools';
        document.getElementById('partners-heading').textContent = partner.name;
        const intro = document.getElementById('partners-intro');
        intro.textContent = partner.description || '';
        intro.before(partnerLogo(partner));
        const actions = document.getElementById('partners-actions');
        actions.replaceChildren();
        for (const [label, value] of [['Website', partner.website], ['Discord', partner.discord_server]]) {
            const url = value && webUrl(value);
            if (!url) continue;
            const link = element('a', label);
            link.className = 'button button-outline';
            link.href = url;
            actions.append(link);
        }
    }

    async function load() {
        if (slug) {
            document.getElementById('partners-back').hidden = false;
            document.getElementById('partners-intro').textContent = '';
            document.getElementById('partners-actions').hidden = true;
        }

        try {
            const response = await fetch('/api/partners', { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error('Partner request failed');
            const partners = (await response.json()).filter(partner =>
                /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(partner.slug) && partner.name
            );
            status.textContent = '';
            if (slug) {
                const partner = partners.find(entry => entry.slug === slug);
                if (partner) {
                    detail(partner);
                    document.getElementById('partners-actions').hidden = false;
                } else {
                    document.getElementById('partners-heading').textContent = 'Partner not found';
                }
            } else {
                list.replaceChildren(...partners.map(card));
                if (!partners.length) status.textContent = 'No active partners yet.';
            }
        } catch {
            status.textContent = 'Could not load partners. Try reloading the page.';
        }
    }

    if (navigator.clipboard && !slug) {
        copy.hidden = false;
        copy.addEventListener('click', async () => {
            copy.disabled = true;
            copyStatus.textContent = '';
            try {
                const response = await fetch('/static/assets/partner-ad.txt');
                if (!response.ok) throw new Error('Advertisement request failed');
                await navigator.clipboard.writeText(await response.text());
                copyStatus.textContent = 'Advertisement copied.';
            } catch {
                copyStatus.textContent = 'Could not copy the advertisement.';
            } finally {
                copy.disabled = false;
            }
        });
    }
    load();
})();
