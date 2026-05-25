// Umami Analytics Tracking
(function() {
    const scriptTag = document.querySelector('script[src*="analytics.umami.is"]');
    
    if (!scriptTag) {
        const umScript = document.createElement('script');
        umScript.async = true;
        umScript.src = 'https://umami.disc-tools.de/script.js';
        umScript.dataset.websiteId = '0cf82497-80c8-42a2-b6e4-8a8ae179d1fe';
        document.head.appendChild(umScript);
    }

    // Custom event tracking function
    window.trackEvent = function(eventName, properties = {}) {
        if (typeof umami !== 'undefined') {
            umami.track(eventName, properties);
        }
    };
})();
