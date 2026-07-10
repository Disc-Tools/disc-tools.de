(function() {
    document.querySelectorAll('.profile-link').forEach(function(link) {
        var titleSpan = link.querySelector('.profile-link-title');
        if (!titleSpan || !titleSpan.textContent.includes('Verified')) return;

        var handleEl = link.querySelector('.profile-link-handle');
        if (!handleEl) return;

        try {
            var url = new URL(link.href);
            var segments = url.pathname.replace(/\/+$/, '').split('/');
            var identifier = segments[segments.length - 1];
            if (identifier) {
                handleEl.textContent = identifier;
            }
        } catch(e) {}
    });
})();
