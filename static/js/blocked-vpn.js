(() => {
    const params = new URLSearchParams(window.location.search);
    let connection;
    try {
        connection = JSON.parse(sessionStorage.getItem('blocked-vpn-details'));
    } catch {
        // Direct links can still supply details through the query string.
    }
    for (const detail of document.querySelectorAll('[data-connection-detail]')) {
        const key = detail.dataset.connectionDetail;
        detail.textContent = params.get(key) || connection?.[key] || '—';
    }
})();
