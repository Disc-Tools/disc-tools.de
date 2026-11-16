const header = document.querySelector('.site-header');
let isPill = false;
let updateScheduled = false;

function updateHeader() {
    isPill = isPill ? window.scrollY >= 32 : window.scrollY > 64;
    header.classList.toggle('is-pill', isPill);
    updateScheduled = false;
}

window.addEventListener('scroll', () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(updateHeader);
}, { passive: true });

updateHeader();

function checkAdBlocker() {
    const bait = document.createElement('div');
    bait.className = 'adsbygoogle ad-banner ad-placement advertisement';
    bait.setAttribute('aria-hidden', 'true');
    bait.style.cssText = 'position:fixed;top:-1000px;left:0;width:300px;height:250px;pointer-events:none';
    document.body.append(bait);

    // Give cosmetic filters a chance to apply after the element is inserted.
    window.setTimeout(() => {
        const style = getComputedStyle(bait);
        const blocked = !bait.isConnected || bait.offsetHeight === 0
            || style.visibility === 'hidden' || style.visibility === 'collapse';
        bait.remove();
        if (blocked) window.location.replace('/blocked/ad-blocker/');
    }, 250);
}

if (!window.location.pathname.startsWith('/blocked/')) {
    checkAdBlocker();
    window.addEventListener('pageshow', event => {
        if (event.persisted) checkAdBlocker();
    });
}

const announcementBell = document.getElementById('announcement-notifications');
let announcementNotificationsLoaded = false;

function loadAnnouncementBell() {
    if (!announcementBell || announcementNotificationsLoaded) return;
    announcementNotificationsLoaded = true;
    import('./announcement-notifications.js?v=2')
        .then(({ loadAnnouncementNotifications }) => loadAnnouncementNotifications(announcementBell))
        .catch(() => {
            announcementNotificationsLoaded = false;
            announcementBell.querySelector('li').textContent = 'Could not load announcements.';
        });
}

announcementBell?.addEventListener('toggle', () => {
    if (announcementBell.open) loadAnnouncementBell();
});

window.addEventListener('load', () => {
    if (window.requestIdleCallback) window.requestIdleCallback(loadAnnouncementBell, { timeout: 1500 });
    else window.setTimeout(loadAnnouncementBell, 150);
}, { once: true });

document.addEventListener('click', event => {
    if (announcementBell?.open && !announcementBell.contains(event.target)) announcementBell.open = false;
});

announcementBell?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !announcementBell.open) return;
    announcementBell.open = false;
    announcementBell.querySelector('summary').focus();
});
