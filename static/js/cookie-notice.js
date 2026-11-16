(() => {
    const notice = document.getElementById('cookie-notice');
    const reopen = document.getElementById('show-cookie-notice');
    const dismiss = document.getElementById('dismiss-cookie-notice');
    const storageKey = 'disc-tools-cookie-notice-v1';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hiddenFrame = { opacity: 0, transform: 'translateY(16px)' };
    const visibleFrame = { opacity: 1, transform: 'translateY(0)' };
    let animation;
    let openedFromFooter = false;

    function animateNotice(frames) {
        animation?.cancel();
        animation = reducedMotion.matches || typeof notice.animate !== 'function'
            ? undefined
            : notice.animate(frames, { duration: 200, easing: 'ease-out', fill: 'both' });
        return animation;
    }

    function showNotice(fromFooter) {
        openedFromFooter = fromFooter;
        notice.hidden = false;
        animateNotice([hiddenFrame, visibleFrame]);
        if (fromFooter) dismiss.focus();
    }

    dismiss.addEventListener('click', async () => {
        try {
            localStorage.setItem(storageKey, 'dismissed');
        } catch {
            // The notice can still be dismissed for this page visit.
        }

        const exit = animateNotice([visibleFrame, hiddenFrame]);
        if (exit) {
            try {
                await exit.finished;
            } catch {
                return;
            }
        }
        if (openedFromFooter || notice.contains(document.activeElement)) {
            (reopen || document.querySelector('.site-header .brand'))?.focus({ preventScroll: true });
        }
        notice.hidden = true;
    });

    if (reopen) {
        reopen.addEventListener('click', () => showNotice(true));
        reopen.hidden = false;
    }
    try {
        if (localStorage.getItem(storageKey) === 'dismissed') return;
    } catch {
        // Show the notice when browser storage is unavailable.
    }
    showNotice(false);
})();
