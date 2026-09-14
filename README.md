<div align="center">
  <img src="https://disc-tools.de/static/assets/img/logo.png" alt="Disc-Tools Logo" width="80">
  <h1>Disc-Tools</h1>
  <p><strong>The ultimate collection of free Discord utilities</strong></p>
  <p>
    <a href="https://disc-tools.de"><img src="https://img.shields.io/badge/Website-disc--tools.de-5865F2?style=flat-square" alt="Website"></a>
    <a href="https://discord.gg/rtRs8rhj5u"><img src="https://img.shields.io/badge/Discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"></a>
  </p>
  <p>
    <a href="https://disc-tools.de">Website</a> •
    <a href="https://disc-tools.de/tools/">All Tools</a> •
    <a href="https://discord.gg/rtRs8rhj5u">Discord</a> •
    <a href="https://dash.disc-tools.de/premium">Premium</a>
  </p>
</div>

## Overview

Disc-Tools is a web app with free utilities, guides and educational content for the Discord community. The frontend is fully static (vanilla HTML, CSS, JavaScript — no frameworks, no build step); the backend is a Node.js/Express API backed by PostgreSQL, with Discord OAuth2 login and a discord.js bot integration.

**Live at:** [disc-tools.de](https://disc-tools.de)

## Tools

16 utilities in three categories — 14 live, 2 coming soon. Premium tools are marked with 👑 and require a subscription via the [dashboard](https://dash.disc-tools.de/premium).

**Look things up**

| Tool | Description | Status |
|------|-------------|--------|
| [User Lookup](https://disc-tools.de/tools/user-lookup/) | Badges, account age and details for any user ID | ✅ Live |
| [Username History](https://disc-tools.de/tools/username-history/) 👑 | Every past username of an account | ✅ Live |
| [Server Lookup](https://disc-tools.de/tools/server-lookup/) | Members, channels and invites via Discord's widget API | ✅ Live |
| [Invite Lookup](https://disc-tools.de/tools/invite-lookup/) | Guild info, member count, inviter and expiry of any invite | ✅ Live |
| [Alt Account Lookup](https://disc-tools.de/tools/alt-account-lookup/) 👑 | Alt accounts linked to a user | ✅ Live |
| [Account Checker](https://disc-tools.de/tools/account-checker/) | Account quality score from age, badges and profile signals | ✅ Live |
| [Snowflake Decoder](https://disc-tools.de/tools/snowflake-decoder/) | Creation date, worker, process and increment from any ID | ✅ Live |
| Embed Builder | Design embeds visually, export the ready JSON payload | 🔜 Soon |
| [Markdown Generator](https://disc-tools.de/tools/markdown-generator/) | Format messages with live preview and quick copy | ✅ Live |
| [Timestamp Generator](https://disc-tools.de/tools/timestamp-generator/) | All `<t:>` formats for any date and timezone | ✅ Live |
| [Color Picker](https://disc-tools.de/tools/color-picker/) | Role colors as HEX, RGB, HSL and integer values | ✅ Live |

**Manage & extract**

| Tool | Description | Status |
|------|-------------|--------|
| Webhook Manager | Send messages and delete webhooks without a bot | 🔜 Soon |
| [Emoji Stealer](https://disc-tools.de/tools/emoji-stealer/) | High-quality CDN links for any emoji or sticker | ✅ Live |
| [Avatar CDN](https://disc-tools.de/tools/avatar-cdn/) | Direct CDN links for any avatar, every size and format | ✅ Live |
| [Collectibles Inspector](https://disc-tools.de/tools/collectibles-inspector/) | Avatar, banner, decoration, nameplate & clan tag links | ✅ Live |
| [Link Cleaner](https://disc-tools.de/tools/link-cleaner/) | Strip 60+ trackers (`utm_*`, `fbclid`, …), bulk-ready | ✅ Live |

> New tools are announced on the site and in the [Discord](https://discord.gg/rtRs8rhj5u).

## Pages

- **Learn** (`/learn/`) — guides hub, formatting tips, keyboard shortcuts
- **Security Articles** (`/security-articles/`) — phishing, token grabbers, account security
- **Team** (`/team/`) — team members with roles synced from the Discord guild
- **Partners** (`/partner/`) — partner showcase with request system and admin approval flow
- **Announcements** (`/announcements/`) — site announcements
- **Premium** (`/premium/`) — subscription info (checkout via dashboard)
- **Profile** (`/profile/`, `/u/`) — user profile with linked accounts (Spotify, Twitch, GitHub), music embeds, custom links
- **GIFs** (`/gifs/`) — community GIF gallery with upload, moderation queue and age gate
- **Verify** (`/verify/`) — server verification (VPN check enforced)
- **Legal** (`/legal/`) — privacy policy, terms of service, imprint
- **Status** — [status.disc-tools.de](https://status.disc-tools.de)

## Tech Stack

**Frontend**
- Vanilla HTML, CSS, JavaScript — no frameworks, no build step
- Self-hosted fonts (Inter) and Font Awesome icons
- Service worker for offline caching (generated at deploy time, not tracked in git)
- Open Graph / Twitter Cards / JSON-LD for rich embeds
- Umami for privacy-friendly analytics

**Backend** (`api/`, Node 20+)
- Express 5, `helmet`, `cors`, `cookie-parser`
- PostgreSQL via `pg` connection pool (`api/db.js`)
- Discord OAuth2 login with JWT sessions (httpOnly cookies)
- discord.js bot integration for Discord API access
- Global custom rate limiting + VPN/proxy detection + CSRF origin check
- `node:test` smoke tests (`npm test`)

## Project Structure

```
├── index.html                 # Home page
├── 404.html                   # Error page
├── about/                     # About page
├── announcements/             # Site announcements
├── api/                       # Express backend (port 3000)
│   ├── index.js               # Server entry point
│   ├── db.js                  # PostgreSQL connection pool
│   ├── middleware/            # auth, cors, csrf, rateLimiter, validation, vpnCheck
│   ├── routes/                # auth, discord, verify, partners, profiles, gifs,
│   │                          #   connections, linktree, sessions, snooper, stats, tiktok
│   ├── utils/                 # discord (API client), ip, spotify
│   ├── test/                  # node:test smoke tests
│   └── uploads/               # runtime uploads (gitignored)
├── blocked/                   # Banned / VPN-blocked pages
├── gifs/                      # GIF gallery
├── learn/                     # Learn hub (guides, formatting, shortcuts)
├── legal/                     # Privacy policy, ToS, imprint
├── partner/                   # Partner showcase + request flow
├── premium/                   # Premium info page
├── profile/                   # User profile pages
├── security-articles/         # Security content
├── stream-ad/                 # Stream ad page
├── success/                   # Post-login/logout pages
├── team/                      # Team page
├── tips/                      # Formatting + shortcuts (legacy path)
├── tools/                     # Tool pages (see table above)
├── static/
│   ├── assets/img/            # Images and logos
│   ├── css/                   # Stylesheets
│   ├── fa-icons/              # Font Awesome
│   ├── fonts/                 # Self-hosted fonts
│   └── js/                    # Page scripts
├── sitemap.xml
└── robots.txt
```

> `sw.js` (service worker) and `.env` files are intentionally gitignored — see `.gitignore`.

## Getting Started

The frontend is fully static — serve the repo root with any static server:

```bash
git clone https://github.com/Disc-Tools/disc-tools.de.git
cd disc-tools.de
# e.g. with nginx, point `root` at this directory
```

**Backend:**

```bash
cd api
npm install
cp .env.example .env   # fill in your credentials (see table below)
node index.js          # listens on 127.0.0.1:3000 by default
```

Run the smoke tests:

```bash
cd api
npm test
```

### Environment Variables

The API reads its configuration from `api/.env` (see `api/.env.example`):

| Variable | Description |
|----------|-------------|
| `PORT` / `HOST` | Bind address (defaults: `3000` / `127.0.0.1`) |
| `JWT_SECRET` | Secret for signing JWT session tokens |
| `IP_HASH_SALT` | Salt for IP hashing (bans, rate limits) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_REDIRECT_URI` | Discord OAuth2 credentials |
| `DISCORD_BOT_TOKEN` | Discord bot token (API access, guild checks) |
| `GUILD_ID` | Main Discord guild ID |
| `DISCORD_INVITE` | Public invite link _(optional)_ |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL connection |
| `PROXYCHECK_API_KEY` | proxycheck.io key for VPN/proxy detection _(optional but recommended)_ |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REDIRECT_URI` | Spotify OAuth _(optional)_ |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` / `TWITCH_REDIRECT_URI` | Twitch OAuth _(optional)_ |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | GitHub OAuth _(optional)_ |
| `GIFS_INTERNAL_SECRET` | Internal secret for the GIFs service _(optional)_ |

## API Overview

All endpoints live under `/api/` (served on port 3000, proxied by nginx in production):

| Area | Examples |
|------|----------|
| Auth | `/api/auth/login`, `/api/auth/callback`, `/api/auth/me` |
| Lookups | `/api/users/:id`, `/api/username-history/:id` (premium), `/api/user-lookup/*` |
| Profiles & partners | `/api/profiles/*`, `/api/partners/*`, `/api/admin/partners/*` |
| GIFs | `/api/gifs`, `/api/gifs/upload` (multipart via multer) |
| Verify & security | `/api/verify/*`, `/api/security/vpn-check` |
| Misc | `/api/stats/*`, `/api/linktree/*`, `/api/tiktok-ad` |

Global middleware applies to every request: security headers (helmet), CORS, JSON body limit, custom per-path rate limiting, IP-ban check and VPN/proxy detection (skipped for authenticated users outside `/verify`).

## Contributing

Contributions are welcome!

- Open an [issue](https://github.com/Disc-Tools/disc-tools.de/issues) for bugs or feature requests
- Submit a [pull request](https://github.com/Disc-Tools/disc-tools.de/pulls) against `main`
- Keep it dependency-light: no frontend frameworks, no frontend build step
- Backend changes should include/extend `api/test/` smoke tests where sensible (`npm test` must stay green)
- Never commit secrets — `.env`, `uploads/` and logs are gitignored; Secret Scanning + Push Protection are enforced on this repo

## Security

Found a vulnerability? Please report it responsibly via a [private security advisory](https://github.com/Disc-Tools/disc-tools.de/security/advisories/new) instead of opening a public issue. Dependabot alerts and CodeQL scanning run automatically on this repo.

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <p>Not affiliated with Discord Inc.</p>
</div>
