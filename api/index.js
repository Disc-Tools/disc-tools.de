const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

app.set('trust proxy', 'loopback');

// Helmet middleware (headers: CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https://cdn.discordapp.com", "https://cdn.jsdelivr.net", "https://i.scdn.co", "https://mosaic.scdn.co", "https://image-cdn-ak.spotifycdn.com", "https://www.google.com", "https://t2.gstatic.com", "https://*.giphy.com", "https://icons.duckduckgo.com", "https://avatars.githubusercontent.com", "https://static-cdn.jtvnw.net", "https://storage.ko-fi.com"],
            connectSrc: ["'self'", "https://discord.com", "https://umami.disc-tools.de", "https://soundcloud.com", "https://api.stripe.com"],
            frameSrc: ["'self'", "https://open.spotify.com", "https://w.soundcloud.com", "https://www.google.com", "https://stripe.com"],
            fontSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Rate limiting
const rateLimitMiddleware = require('./middleware/rateLimiter');
app.use(rateLimitMiddleware);

// CORS
const corsMiddleware = require('./middleware/cors');
app.use(corsMiddleware);

// VPN check (server-side enforcement)
const vpnMiddleware = require('./middleware/vpnCheck');
app.use('/api', vpnMiddleware);

// Import routes
const authRoutes = require('./routes/auth');
const discordRoutes = require('./routes/discord');
const statsRoutes = require('./routes/stats');
const partnersRoutes = require('./routes/partners');
const profilesRoutes = require('./routes/profiles');
const verifyRoutes = require('./routes/verify');
const proxyRoutes = require('./routes/proxy');
const connectionsRoutes = require('./routes/connections');
const gifsRoutes = require('./routes/gifs');
const tiktokRoutes = require('./routes/tiktok');
const linktreeRoutes = require('./routes/linktree');
const snooperRoutes = require('./routes/snooper');
const sessionsRoutes = require('./routes/sessions');

// Register routes
app.use('/', tiktokRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', discordRoutes);
app.use('/api', statsRoutes);
app.use('/', partnersRoutes);
app.use('/api', profilesRoutes);
app.use('/api', verifyRoutes);
app.use('/api', connectionsRoutes);
app.use('/api', gifsRoutes);
app.use('/api', linktreeRoutes);
app.use('/', snooperRoutes);
app.use('/api', sessionsRoutes);

function getClientIp(req) {
    let ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
    if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
    if (ip.startsWith('::ffff:')) ip = ip.split(':').pop();
    return ip;
}

// --- Team Endpoint ---
const db = require('./db');
const { discordFetch } = require('./utils/discord');

const TEAM_ROLES = [
    { id: '1503064097040629891', name: 'Founder', priority: 1, color: '#5865F2' },
    { id: '1503064197704061109', name: 'Co-Founder', priority: 2, color: '#4752C4' },
    { id: '1503064289915965621', name: 'Sr. Admin', priority: 3, color: '#E74C3C' },
    { id: '1503064343837937795', name: 'Admin', priority: 4, color: '#E67E22' },
    { id: '1503064391564791899', name: 'Sr. Moderator', priority: 5, color: '#F1C40F' },
    { id: '1503064448267718760', name: 'Moderator', priority: 6, color: '#2ECC71' },
    { id: '1503064501573124276', name: 'Developer', priority: 7, color: '#1ABC9C' },
    { id: '1503064547966058626', name: 'Helper', priority: 8, color: '#3498DB' }
];

const GUILD_ID = process.env.GUILD_ID || '1502369884322136326';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || null;

let teamCache = { data: null, timestamp: 0 };

app.get('/api/team', async (req, res) => {
    const now = Date.now();
    if (teamCache.data && now - teamCache.timestamp < 60000) {
        return res.json(teamCache.data);
    }

    if (!BOT_TOKEN) {
        return res.status(503).json({ error: 'Bot token not configured' });
    }

    try {
        // Load presences from database
        const presencesResult = await db.query('SELECT user_id, status FROM presences');
        const presences = {};
        presencesResult.rows.forEach(row => {
            presences[row.user_id] = row.status;
        });

        // Load custom profiles
        const profilesResult = await db.query(
            `SELECT user_id, username, visibility, activated FROM profiles`
        );
        const profilesMap = {};
        profilesResult.rows.forEach(row => {
            profilesMap[row.user_id] = row;
        });

        // Fetch Guild Members
        const members = await discordFetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`, BOT_TOKEN, 'Bot ');

        // Filter and Map Team Members
        const teamMembers = [];
        for (const m of members) {
            const memberRoles = m.roles || [];
            const matchingRoles = TEAM_ROLES.filter(r => memberRoles.includes(r.id));

            if (matchingRoles.length > 0) {
                const highestRole = matchingRoles.sort((a, b) => a.priority - b.priority)[0];

                let bannerURL = null;
                let avatarDecorationAsset = null;
                try {
                    const fullUser = await discordFetch(`https://discord.com/api/v10/users/${m.user.id}`, BOT_TOKEN, 'Bot ');
                    if (fullUser.banner) {
                        const ext = fullUser.banner.startsWith('a_') ? 'gif' : 'png';
                        bannerURL = `https://cdn.discordapp.com/banners/${fullUser.id}/${fullUser.banner}.${ext}?size=600`;
                    }
                    if (fullUser.avatar_decoration_data && fullUser.avatar_decoration_data.asset) {
                        avatarDecorationAsset = fullUser.avatar_decoration_data.asset;
                    }
                } catch (e) {}

                const avatarExt = m.user.avatar && m.user.avatar.startsWith('a_') ? 'gif' : 'png';
                const avatarURL = m.user.avatar
                    ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.${avatarExt}?size=256`
                    : `https://cdn.discordapp.com/embed/avatars/${(parseInt(m.user.id) >> 22) % 6}.png`;

                const profile = profilesMap[m.user.id];
                const hasProfile = profile && profile.visibility === 'public' && profile.activated === true;
                const profileUsername = hasProfile ? profile.username : null;

                teamMembers.push({
                    userId: m.user.id,
                    username: m.user.username,
                    displayName: m.nick || m.user.global_name || m.user.username,
                    avatarURL,
                    bannerURL,
                    avatarDecorationAsset,
                    role: highestRole,
                    onlineStatus: presences[m.user.id] || 'offline',
                    hasProfile,
                    profileUsername
                });
            }
        }

        // Group by Role
        const grouped = TEAM_ROLES.map(role => ({
            ...role,
            members: teamMembers.filter(m => m.role.id === role.id)
        }));

        teamCache = { data: grouped, timestamp: now };
        res.json(grouped);
    } catch (err) {
        console.error('[TEAM API] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});

// --- Username History ---
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS username_history_optout (
                user_id VARCHAR(20) PRIMARY KEY,
                opted_out_at TIMESTAMP DEFAULT NOW()
            )
        `);
    } catch (e) {
        console.error('[USERNAME-HISTORY-OPTOUT] Table init failed:', e.message);
    }
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS username_history_free_usage (
                ip_hash VARCHAR(64) PRIMARY KEY,
                used_at TIMESTAMP DEFAULT NOW()
            )
        `);
    } catch (e) {
        console.error('[USERNAME-HISTORY-FREE-USAGE] Table init failed:', e.message);
    }
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS username_history_user_usage (
                user_id VARCHAR(20) NOT NULL,
                used_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (user_id, used_at)
            )
        `);
    } catch (e) {
        console.error('[USERNAME-HISTORY-USER-USAGE] Table init failed:', e.message);
    }
})();

app.get('/api/username-history/eligibility', async (req, res) => {
    try {
        const token = req.cookies?.token;
        let user = null;
        if (token) {
            try {
                user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            } catch (e) {}
        }

        if (user) {
            const optout = await db.query(
                'SELECT 1 FROM username_history_optout WHERE user_id = $1',
                [user.id]
            );
            if (optout.rows.length > 0) {
                return res.json({
                    eligible: false,
                    isLoggedIn: true,
                    optedOut: true
                });
            }

            let isPremium = false;
            try {
                const premium = await db.query(
                    'SELECT 1 FROM premium_users WHERE user_id = $1 AND active = true',
                    [user.id]
                );
                isPremium = premium.rows.length > 0;
            } catch (e) {}

            if (isPremium) {
                return res.json({
                    eligible: true,
                    isLoggedIn: true,
                    optedOut: false,
                    isPremium: true
                });
            }

            let used = 0;
            try {
                const usage = await db.query(
                    'SELECT COUNT(*) AS cnt FROM username_history_user_usage WHERE user_id = $1',
                    [user.id]
                );
                used = parseInt(usage.rows[0]?.cnt, 10) || 0;
            } catch (e) {}

            const maxFree = 1;
            const remaining = Math.max(0, maxFree - used);

            return res.json({
                eligible: remaining > 0,
                isLoggedIn: true,
                optedOut: false,
                isPremium: false,
                freeSearchesMax: maxFree,
                freeSearchesUsed: used
            });
        } else {
            const ip = getClientIp(req);
            const ipHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback').update(ip).digest('hex');
            const usage = await db.query(
                'SELECT 1 FROM username_history_free_usage WHERE ip_hash = $1',
                [ipHash]
            );
            return res.json({
                eligible: usage.rows.length === 0,
                isLoggedIn: false,
                optedOut: false,
                freeSearchesMax: 1,
                freeSearchesUsed: usage.rows.length
            });
        }
    } catch (err) {
        console.error('[USERNAME-HISTORY-ELIGIBILITY] Error:', err.message);
        res.json({ eligible: false, isLoggedIn: false, optedOut: false });
    }
});

const BETA_ROLE_ID = '1513630971679736078';

function isBetaOrAdmin(user) {
    if (!user || !user.guild_roles) return false;
    const adminRoles = ['1503064097040629891', '1503064197704061109', '1503064289915965621', '1503064343837937795'];
    return user.guild_roles.includes(BETA_ROLE_ID) || user.guild_roles.some(r => adminRoles.includes(r));
}

app.get('/api/user-info/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId || !/^\d{17,20}$/.test(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        if (!BOT_TOKEN) return res.status(503).json({ error: 'Bot not configured' });

        const userRes = await fetch(`https://discord.com/api/v10/users/${userId}`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        });
        if (!userRes.ok) return res.status(404).json({ error: 'User not found' });
        const data = await userRes.json();
        res.json(data);
    } catch (err) {
        console.error('[USER-INFO] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

app.get('/api/username-history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId || !/^\d{17,20}$/.test(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Check eligibility
        const token = req.cookies?.token;
        let user = null;
        if (token) {
            try {
                user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            } catch (e) {}
        }

        let isEligible = false;
        let reason = null;
        let freeSearchesUsed = 0;
        let freeSearchesMax = 0;
        let isLoggedIn = false;

        if (user) {
            isLoggedIn = true;
            const optout = await db.query(
                'SELECT 1 FROM username_history_optout WHERE user_id = $1',
                [user.id]
            );
            if (optout.rows.length > 0) {
                reason = 'optout';
            } else {
                let isPremium = false;
                try {
                    const premium = await db.query(
                        'SELECT 1 FROM premium_users WHERE user_id = $1 AND active = true',
                        [user.id]
                    );
                    isPremium = premium.rows.length > 0;
                } catch (e) {}

                if (isPremium) {
                    isEligible = true;
                } else {
                    let used = 0;
                    try {
                        const usage = await db.query(
                            'SELECT COUNT(*) AS cnt FROM username_history_user_usage WHERE user_id = $1',
                            [user.id]
                        );
                        used = parseInt(usage.rows[0]?.cnt, 10) || 0;
                    } catch (e) {}

                    freeSearchesMax = 1;
                    freeSearchesUsed = used;

                    if (used >= freeSearchesMax) {
                        reason = 'free_used';
                    } else {
                        isEligible = true;
                        try {
                            await db.query(
                                'INSERT INTO username_history_user_usage (user_id) VALUES ($1)',
                                [user.id]
                            );
                        } catch (e) {}
                        freeSearchesUsed = used + 1;
                    }
                }
            }
        } else {
            const ip = getClientIp(req);
            const ipHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback').update(ip).digest('hex');
            const usage = await db.query(
                'SELECT 1 FROM username_history_free_usage WHERE ip_hash = $1',
                [ipHash]
            );
            if (usage.rows.length > 0) {
                reason = 'free_used';
            } else {
                isEligible = true;
                // Mark free usage
                await db.query(
                    'INSERT INTO username_history_free_usage (ip_hash) VALUES ($1) ON CONFLICT DO NOTHING',
                    [ipHash]
                );
            }
        }

        if (!isEligible) {
            return res.status(403).json({
                error: 'Access denied',
                reason: reason,
                isLoggedIn: isLoggedIn,
                optedOut: reason === 'optout',
                freeSearchesMax: freeSearchesMax || 1,
                freeSearchesUsed: freeSearchesUsed || (reason === 'free_used' ? 1 : 0)
            });
        }

        const optout = await db.query(
            `SELECT 1 FROM username_history_optout WHERE user_id = $1`,
            [userId]
        );
        if (optout.rows.length > 0) {
            return res.json({ history: [], optedOut: true });
        }

        const result = await db.query(
            `SELECT old_username, new_username, changed_at
             FROM username_history
             WHERE user_id = $1
             ORDER BY changed_at DESC`,
            [userId]
        );

        res.json({ history: result.rows, optedOut: false });
    } catch (err) {
        console.error('[USERNAME-HISTORY] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch username history' });
    }
});

app.post('/api/username-history/optout', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        const existing = await db.query(
            `SELECT 1 FROM username_history_optout WHERE user_id = $1`,
            [decoded.id]
        );

        if (existing.rows.length > 0) {
            await db.query(`DELETE FROM username_history_optout WHERE user_id = $1`, [decoded.id]);
            return res.json({ optedOut: false });
        } else {
            await db.query(
                `INSERT INTO username_history_optout (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
                [decoded.id]
            );
            return res.json({ optedOut: true });
        }
    } catch (err) {
        console.error('[USERNAME-HISTORY-OPTOUT] Error:', err.message);
        res.status(500).json({ error: 'Failed to toggle opt-out status' });
    }
});

app.get('/api/username-history/optout/status', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.json({ optedOut: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        const result = await db.query(
            `SELECT 1 FROM username_history_optout WHERE user_id = $1`,
            [decoded.id]
        );

        res.json({ optedOut: result.rows.length > 0 });
    } catch (err) {
        res.json({ optedOut: false });
    }
});

app.get('/api/user/check-beta', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.json({ isBetaOrAdmin: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        let authorized = isBetaOrAdmin(decoded);

        if (!authorized && BOT_TOKEN) {
            try {
                const member = await discordFetch(
                    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${decoded.id}`,
                    BOT_TOKEN, 'Bot '
                );
                const roles = member.roles || [];
                authorized = roles.includes(BETA_ROLE_ID) || roles.some(r => ['1503064097040629891', '1503064197704061109', '1503064289915965621', '1503064343837937795'].includes(r));
            } catch {}
        }

        res.json({ isBetaOrAdmin: authorized });
    } catch {
        res.json({ isBetaOrAdmin: false });
    }
});

// --- Announcement Read Tracking ---
// Ensure tables exist
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                global_name TEXT,
                avatar TEXT,
                session_id UUID NOT NULL UNIQUE,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                last_active TIMESTAMP DEFAULT NOW(),
                revoked BOOLEAN DEFAULT FALSE,
                refresh_token TEXT
            )
        `);
        await db.query(`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS refresh_token TEXT`);
        await db.query(`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_id ON admin_sessions(session_id)`);
    } catch (e) {
        console.error('[SESSIONS] Table init failed:', e.message);
    }
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                blocked_at TIMESTAMP DEFAULT NOW(),
                blocked_by TEXT
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS blocked_ips (
                ip_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                blocked_at TIMESTAMP DEFAULT NOW(),
                blocked_by TEXT
            )
        `);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_blocked_ips_user_id ON blocked_ips(user_id)`);
    } catch (e) {
        console.error('[BLOCKED TABLES] Init failed:', e.message);
    }
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS stats_history (cpu DECIMAL, ram DECIMAL, disk DECIMAL, recorded_at TIMESTAMP)
        `);
    } catch (e) {
        console.error('[STATS TABLE] Init failed:', e.message);
    }
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS gifs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(20) NOT NULL,
                storage_path TEXT NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                uploader_name VARCHAR(32),
                tags TEXT[] DEFAULT '{}',
                nsfw BOOLEAN DEFAULT false,
                file_size INTEGER NOT NULL,
                width INTEGER,
                height INTEGER,
                moderation_status VARCHAR(20) DEFAULT 'pending',
                moderated_by VARCHAR(20),
                moderation_reason TEXT,
                moderated_at TIMESTAMP,
                moderation_message_id TEXT,
                views INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_gifs_user_id ON gifs(user_id)
        `);
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_gifs_moderation ON gifs(moderation_status)
        `);
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_gifs_created ON gifs(created_at DESC)
        `);
    } catch (e) {
        console.error('[GIFS TABLE] Init failed:', e.message);
    }
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_birthdays (
                user_id VARCHAR(20) PRIMARY KEY,
                birthday DATE NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
    } catch (e) {
        console.error('[USER BIRTHDAYS] Init failed:', e.message);
    }
})();

// GET: fetch user's read announcement IDs (optional auth)
app.get('/api/announcements/read', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.json({ readIds: [] });

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        const result = await db.query(
            'SELECT announcement_id FROM announcement_reads WHERE user_id = $1',
            [decoded.id]
        );
        res.json({ readIds: result.rows.map(r => r.announcement_id) });
    } catch (err) {
        res.json({ readIds: [] });
    }
});

// POST: mark announcement(s) as read/unread (optional auth, silent no-op for guests)
app.post('/api/announcements/read', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.json({ success: true });

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        const { id, ids, unread, markAll } = req.body;

        if (markAll) {
            await db.query(
                `INSERT INTO announcement_reads (user_id, announcement_id)
                 SELECT $1, id FROM announcements WHERE active = true
                 ON CONFLICT (user_id, announcement_id) DO NOTHING`,
                [decoded.id]
            );
        } else if (ids && Array.isArray(ids)) {
            if (unread) {
                await db.query(
                    'DELETE FROM announcement_reads WHERE user_id = $1 AND announcement_id = ANY($2)',
                    [decoded.id, ids]
                );
            } else {
                const values = ids.map((_, i) => `($1, $${i + 2})`).join(', ');
                const params = [decoded.id, ...ids];
                await db.query(
                    `INSERT INTO announcement_reads (user_id, announcement_id) VALUES ${values} ON CONFLICT DO NOTHING`,
                    params
                );
            }
        } else if (id) {
            if (unread) {
                await db.query(
                    'DELETE FROM announcement_reads WHERE user_id = $1 AND announcement_id = $2',
                    [decoded.id, id]
                );
            } else {
                await db.query(
                    'INSERT INTO announcement_reads (user_id, announcement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [decoded.id, id]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[ANNOUNCEMENT_READS] Update failed:', err.message);
        res.status(500).json({ error: 'Failed to update read state' });
    }
});

// --- Public Announcements ---
app.get('/api/announcements', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, text, type, author_id, author_username, author_avatar, created_at
             FROM announcements WHERE active = true ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[ANNOUNCEMENTS] Fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// --- Log errors to file ---
const LOG_FILE = path.join(__dirname, 'error.log');
function logError(msg, context = {}) {
    const logEntry = `[${new Date().toISOString()}] ${msg} | Context: ${JSON.stringify(context)}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
        console.error('Failed to write to error log:', e);
    }
}

// --- System stats collection ---
setInterval(async () => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        let diskPercent = 0;
        try {
            const { execSync } = require('child_process');
            const df = execSync("df -h / | tail -1").toString().trim().split(/\s+/);
            diskPercent = parseInt(df[4].replace('%', '')) || 0;
        } catch (e) {}

        const cpu = parseFloat(os.loadavg()[0].toFixed(2)) * 25;
        const ram = Math.round((usedMem / totalMem) * 100);

        await db.query(
            `INSERT INTO stats_history (cpu, ram, disk, recorded_at) VALUES ($1, $2, $3, NOW())`,
            [cpu, ram, diskPercent]
        );

        // Keep only last 144 entries (24h worth at 10min intervals)
        await db.query(
            `DELETE FROM stats_history WHERE id NOT IN (SELECT id FROM stats_history ORDER BY recorded_at DESC LIMIT 144)`
        );
    } catch (e) {
        console.error('[STATS COLLECTOR] Failed:', e.message);
    }
}, 10 * 60 * 1000); // Every 10 minutes

// --- Linktree cleanup (archive non-premium, delete after 30 days) ---
async function cleanupLinktreeProfiles() {
    try {
        const result = await db.query(`
            DELETE FROM linktree_profiles
            WHERE archived_at IS NOT NULL
            AND archived_at < NOW() - INTERVAL '30 days'
        `);
        if (result.rowCount > 0) {
            console.log(`[LINKTREE] Cleaned up ${result.rowCount} expired profiles`);
        }

        await db.query(`
            UPDATE linktree_profiles
            SET is_active = false, archived_at = COALESCE(archived_at, NOW()), updated_at = NOW()
            WHERE is_active = true
            AND user_id NOT IN (SELECT user_id FROM premium_users WHERE active = true AND (expires_at IS NULL OR expires_at > NOW()))
        `);
    } catch (e) {
        console.error('[LINKTREE] Cleanup failed:', e.message);
    }
}

cleanupLinktreeProfiles();
setInterval(cleanupLinktreeProfiles, 60 * 60 * 1000);

// --- User Lookup ---
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_lookup_usage (
                user_id VARCHAR(20) NOT NULL,
                used_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (user_id, used_at)
            )
        `);
    } catch (e) {
        console.error('[USER-LOOKUP] Table init failed:', e.message);
    }
})();

app.get('/api/user-lookup/eligibility', async (req, res) => {
    const token = req.cookies?.token;
    let user = null;
    if (token) {
        try {
            user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        } catch (e) {
            console.error('[USER-LOOKUP-ELIGIBILITY] JWT verify failed:', e.message);
        }
    }

    if (!user) {
        return res.json({ eligible: false, isLoggedIn: false });
    }

    let isPremium = false;
    try {
        const premium = await db.query(
            'SELECT 1 FROM premium_users WHERE user_id = $1 AND active = true',
            [user.id]
        );
        isPremium = premium.rows.length > 0;
    } catch (e) {
        console.error('[USER-LOOKUP-ELIGIBILITY] Premium check failed:', e.message);
    }

    if (isPremium) {
        return res.json({ eligible: true, isLoggedIn: true, isPremium: true, remaining: -1 });
    }

    let used = 0;
    try {
        const usage = await db.query(
            'SELECT COUNT(*) AS cnt FROM user_lookup_usage WHERE user_id = $1',
            [user.id]
        );
        used = parseInt(usage.rows[0]?.cnt, 10) || 0;
    } catch (e) {
        console.error('[USER-LOOKUP-ELIGIBILITY] Usage query failed:', e.message);
    }

    const maxFree = 3;
    const remaining = Math.max(0, maxFree - used);

    res.json({
        eligible: remaining > 0,
        isLoggedIn: true,
        isPremium: false,
        remaining: remaining,
        maxFree: maxFree,
        used: used
    });
});

app.get('/api/user-lookup/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        if (!/^\d{17,20}$/.test(userId)) {
            return res.status(400).json({ error: 'Invalid User ID' });
        }

        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let user;
        try {
            user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        let isPremium = false;
        try {
            const premium = await db.query(
                'SELECT 1 FROM premium_users WHERE user_id = $1 AND active = true',
                [user.id]
            );
            isPremium = premium.rows.length > 0;
        } catch (e) {
            isPremium = false;
        }

        if (!isPremium) {
            let used = 0;
            try {
                const usage = await db.query(
                    'SELECT COUNT(*) AS cnt FROM user_lookup_usage WHERE user_id = $1',
                    [user.id]
                );
                used = parseInt(usage.rows[0]?.cnt, 10) || 0;
            } catch (e) {
                console.error('[USER-LOOKUP] Usage check failed:', e.message);
            }
            if (used >= 3) {
                return res.status(403).json({
                    error: 'Free limit reached',
                    remaining: 0,
                    maxFree: 3,
                    used: 3
                });
            }
        }

        if (!BOT_TOKEN) {
            return res.status(503).json({ error: 'Bot token not configured' });
        }

        let discordUser;
        try {
            discordUser = await discordFetch(`https://discord.com/api/v10/users/${userId}`, BOT_TOKEN, 'Bot ');
        } catch (err) {
            const status = err.response ? err.response.status : 502;
            if (status === 404) {
                return res.status(404).json({ error: 'User not found' });
            }
            console.error('[USER-LOOKUP] Discord API error:', err.message);
            return res.status(502).json({ error: 'Failed to fetch user from Discord' });
        }

        if (!isPremium) {
            try {
                await db.query(
                    'INSERT INTO user_lookup_usage (user_id) VALUES ($1)',
                    [user.id]
                );
            } catch (e) {
                console.error('[USER-LOOKUP] Usage insert failed:', e.message);
            }
        }

        let guildMember = null;
        try {
            const raw = await discordFetch(
                `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
                BOT_TOKEN, 'Bot '
            );
            if (raw && raw.user) {
                const matchedRoles = (raw.roles || [])
                    .map(r => TEAM_ROLES.find(t => t.id === r))
                    .filter(Boolean)
                    .sort((a, b) => a.priority - b.priority);
                guildMember = {
                    nick: raw.nick || null,
                    role: matchedRoles.length > 0 ? matchedRoles[0] : null,
                    joinedAt: raw.joined_at || null
                };
            }
        } catch (e) {
            guildMember = null;
        }

        res.json({ ...discordUser, _guildMember: guildMember });
    } catch (err) {
        console.error('[USER-LOOKUP] Error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy blocked this request' });
    }
    console.error(`[ERROR] ${err.stack}`);
    logError('Internal Server Error', { path: req.path, method: req.method, error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT]', err);
    logError('Uncaught Exception', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
    logError('Unhandled Rejection', { error: typeof reason === 'object' ? reason.message : String(reason) });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
    console.log(`✅ API running on ${HOST}:${PORT}`);
});
