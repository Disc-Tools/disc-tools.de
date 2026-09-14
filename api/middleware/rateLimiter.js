const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 120;

const PATH_LIMITS = [
    { paths: ['/api/auth/login', '/api/auth/callback', '/api/auth/logout'], max: 10, window: 60 * 1000 },
    { paths: ['/api/lookup', '/api/discord/guilds', '/api/discord/users'], max: 30, window: 60 * 1000 },
    { paths: ['/api/gifs'], max: 60, window: 60 * 1000 },
    { paths: ['/api/topgg/webhook'], max: 30, window: 60 * 1000 },
    { paths: ['/api/username-history'], max: 10, window: 60 * 1000 },
    { paths: ['/api/user-lookup'], max: 10, window: 60 * 1000 },
];

function getLimitConfig(path) {
    for (const cfg of PATH_LIMITS) {
        if (cfg.paths.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p))) {
            return cfg;
        }
    }
    return { max: MAX_REQUESTS, window: RATE_LIMIT_WINDOW };
}

const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitMap.entries()) {
        const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW * 2);
        if (valid.length === 0) {
            rateLimitMap.delete(key);
        } else {
            rateLimitMap.set(key, valid);
        }
    }
}, CLEANUP_INTERVAL);

// Redis-backed rate limiting with in-memory fallback
let redisClient = null;
let redisReady = false;
try {
    const Redis = require('ioredis');
    redisClient = new Redis({
        host: '127.0.0.1',
        port: 6379,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        retryStrategy: () => null
    });
    redisClient.on('ready', () => { redisReady = true; });
    redisClient.on('error', () => { redisReady = false; });
    redisClient.on('close', () => { redisReady = false; });
    // Try to connect but don't block startup
    redisClient.connect().catch(() => { redisReady = false; });
} catch (e) {
    console.warn('[RATE_LIMIT] Redis not available, using in-memory fallback:', e.message);
}

async function rateLimitMiddleware(req, res, next) {
    const rawIp = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip;
    const ip = String(rawIp).split(',')[0].trim().replace(/^::ffff:/, '');
    const config = getLimitConfig(req.path);
    const mapKey = `ratelimit:${ip}:${req.path}`;

    // Try Redis first if ready
    if (redisClient && redisReady) {
        try {
            const count = await redisClient.incr(mapKey);
            if (count === 1) {
                await redisClient.pexpire(mapKey, config.window);
            }
            if (count > config.max) {
                const ttl = await redisClient.pttl(mapKey);
                const retryAfter = Math.ceil((ttl > 0 ? ttl : config.window) / 1000);
                console.warn(`[SECURITY] Rate limit (Redis) exceeded by IP: ${ip} on ${req.method} ${req.path} (${count}/${config.max})`);
                res.setHeader('Retry-After', String(retryAfter));
                return res.status(429).json({
                    error: 'Too many requests',
                    retryAfterSeconds: retryAfter
                });
            }
            return next();
        } catch (e) {
            // Fallback to in-memory on Redis error
            console.warn('[RATE_LIMIT] Redis error, fallback to memory:', e.message);
            redisReady = false;
        }
    }

    // In-memory fallback (survives within process, but not across restarts - Redis is primary)
    const now = Date.now();
    if (!rateLimitMap.has(mapKey)) {
        rateLimitMap.set(mapKey, []);
    }

    let timestamps = rateLimitMap.get(mapKey);
    timestamps = timestamps.filter(t => now - t < config.window);

    if (timestamps.length >= config.max) {
        const retryAfter = Math.ceil((timestamps[0] + config.window - now) / 1000);
        console.warn(`[SECURITY] Rate limit (memory) exceeded by IP: ${ip} on ${req.method} ${req.path}`);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
            error: 'Too many requests',
            retryAfterSeconds: retryAfter
        });
    }

    timestamps.push(now);
    rateLimitMap.set(mapKey, timestamps);
    next();
}

module.exports = rateLimitMiddleware;
