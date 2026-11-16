(() => {
    const notice = document.getElementById('cookie-notice');
    const settings = document.getElementById('show-cookie-notice');
    const select = document.getElementById('select-ad-consent');
    const options = document.getElementById('ad-consent-options');
    const advertising = document.getElementById('allow-advertising');
    const analytics = document.getElementById('allow-analytics');
    const slots = [...document.querySelectorAll('.ad-slot')];
    const storageKey = 'disc-tools-consent-v3';
    const live = location.hostname === 'disc-tools.de';
    const privatePage = /^\/(?:profile|verify|success|blocked)(?:\/|$)/.test(location.pathname);
    let choice;
    let eligibility;
    let adsStarted = false;
    let analyticsStarted = false;

    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        const previous = JSON.parse(localStorage.getItem('dt-consent-v2'));
        if (typeof saved?.analytics === 'boolean' && typeof saved.advertising === 'boolean') {
            choice = saved;
        } else if (previous?.essential === true) {
            choice = { analytics: previous.analytics === true, advertising: previous.marketing === true };
        }
    } catch {
        // Consent can still be set for this page visit.
    }

    function startAnalytics() {
        if (!live || privatePage || !choice?.analytics || analyticsStarted) return;
        analyticsStarted = true;
        const tracker = document.createElement('script');
        tracker.src = 'https://umami.disc-tools.de/script.js';
        tracker.async = true;
        tracker.dataset.websiteId = '0cf82497-80c8-42a2-b6e4-8a8ae179d1fe';
        tracker.dataset.domains = 'disc-tools.de';
        tracker.dataset.excludeSearch = 'true';
        tracker.dataset.excludeHash = 'true';
        document.head.append(tracker);
    }

    async function startAds() {
        if (!live || !slots.length || !choice?.advertising || adsStarted) return;
        eligibility ??= fetch('/api/alt-lookup/eligibility', {
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
        }).then(async response => response.ok && (await response.json()).isPremium === false)
            .catch(() => false);
        if (!await eligibility || !choice?.advertising || adsStarted) return;
        adsStarted = true;

        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = '/static/css/ads.css?v=20261116-live1';
        const stylesReady = new Promise(resolve => {
            stylesheet.addEventListener('load', resolve, { once: true });
            stylesheet.addEventListener('error', resolve, { once: true });
        });
        document.head.append(stylesheet);

        const script = document.createElement('script');
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6223306610300371';
        script.addEventListener('load', async () => {
            await stylesReady;
            if (!choice?.advertising) return;
            for (const slot of slots) {
                slot.hidden = false;
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                } catch {
                    slot.hidden = true;
                }
            }
        }, { once: true });
        document.head.append(script);
    }

    function toggleOptions(expanded) {
        options.hidden = !expanded;
        select.setAttribute('aria-expanded', String(expanded));
        if (expanded) {
            advertising.checked = choice?.advertising === true;
            analytics.checked = choice?.analytics === true;
        }
    }

    function saveChoice(value) {
        choice = value;
        try {
            localStorage.setItem(storageKey, JSON.stringify(choice));
        } catch {
            if ((analyticsStarted && !choice.analytics) || (adsStarted && !choice.advertising)) {
                // The preference could not be persisted, so reloads would restore the old choice.
                document.querySelector('.ad-consent-policy').textContent = 'This browser could not save your choice. Clear site data to remove saved permissions.';
                return;
            }
        }
        notice.hidden = true;
        toggleOptions(false);
        settings?.focus();
        if ((adsStarted && !choice.advertising) || (analyticsStarted && !choice.analytics)) {
            location.reload();
            return;
        }
        startAnalytics();
        void startAds();
    }

    settings?.addEventListener('click', () => {
        notice.hidden = false;
        toggleOptions(true);
        analytics.focus();
    });
    select.addEventListener('click', () => toggleOptions(options.hidden));
    document.getElementById('save-ad-consent').addEventListener('click', () => saveChoice({
        advertising: advertising.checked === true, analytics: analytics.checked === true,
    }));
    notice.addEventListener('click', event => {
        const button = event.target.closest('[data-ad-consent]');
        if (!button) return;
        const enabled = button.dataset.adConsent === 'allow';
        saveChoice({ analytics: enabled, advertising: enabled });
    });
    notice.hidden = !!choice;
    startAnalytics();
    void startAds();
})();
