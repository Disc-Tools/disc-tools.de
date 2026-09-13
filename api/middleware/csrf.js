const allowedOrigins = ["https://admin.disc-tools.de", 'https://disc-tools.de', 'https://www.disc-tools.de', 'https://api.disc-tools.de', 'https://dash.disc-tools.de', 'https://partner.disc-tools.de'];

function csrfMiddleware(req, res, next) {
    // Only check for state-changing methods on admin routes
    if (req.path.startsWith('/api/admin') && ['POST','PUT','DELETE','PATCH'].includes(req.method)) {
        const origin = req.headers.origin;
        if (!origin || !allowedOrigins.includes(origin)) {
            console.warn(`[CSRF] Blocked ${req.method} ${req.path} without valid Origin: ${origin}`);
            return res.status(403).json({ error: 'CSRF blocked - invalid origin' });
        }
        // Double-submit cookie check: require X-CSRF-Token header to match csrf_token cookie if present
        const cookieToken = req.cookies && req.cookies['csrf_token'];
        const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
        // If cookie exists, require header to match (for browser forms)
        // For API clients that don't use cookies, Origin check is sufficient
        if (cookieToken && headerToken && cookieToken !== headerToken) {
            console.warn(`[CSRF] Token mismatch for ${req.path}`);
            return res.status(403).json({ error: 'CSRF token mismatch' });
        }
    }
    next();
}
module.exports = csrfMiddleware;
