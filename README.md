<div align="center">
  <img src="https://disc-tools.de/assets/img/logo.png" alt="Disc-Tools Logo" width="80">
  <h1>Disc-Tools</h1>
  <p><strong>The ultimate collection of free Discord utilities</strong></p>
  <p>
    <a href="https://disc-tools.de">Website</a> •
    <a href="https://discord.gg/rtRs8rhj5u">Discord</a> •
    <a href="https://github.com/mistr-kebab/Disc-Tools">GitHub</a>
  </p>
</div>

## Overview

Disc-Tools is a comprehensive web application providing free tools, guides, and educational content for the Discord community. Built with vanilla HTML, CSS, and JavaScript on the frontend and a Node.js/Express API backend with PostgreSQL.

**Live at:** [disc-tools.de](https://disc-tools.de)

> **Note:** The frontend was developed with AI assistance, while the backend is entirely custom-built.

## Features

### Tools (11)
| Tool | Description |
|------|-------------|
| [Avatar CDN](https://disc-tools.de/tools/avatar-cdn/) | Generate direct CDN links for any Discord avatar in all sizes & formats |
| [Color Picker](https://disc-tools.de/tools/color-picker/) | Pick and convert colors between HEX, RGB, HSL and more |
| [Embed Builder](https://disc-tools.de/tools/embed-builder/) | Build and preview Discord embeds visually |
| [Emoji Stealer](https://disc-tools.de/tools/emoji-stealer/) | Download any custom Discord emoji or sticker |
| [Invite Lookup](https://disc-tools.de/tools/invite-lookup/) | Look up Discord invite codes and get server info |
| [Markdown Generator](https://disc-tools.de/tools/markdown-generator/) | Write and preview Discord markdown formatting |
| [Nitro Checker](https://disc-tools.de/tools/nitro-checker/) | Check if a Nitro gift code is valid |
| [Server Lookup](https://disc-tools.de/tools/server-lookup/) | Get detailed information about any Discord server |
| [Snowflake Decoder](https://disc-tools.de/tools/snowflake-decoder/) | Decode Discord snowflakes into timestamps and metadata |
| [Timestamp Generator](https://disc-tools.de/tools/timestamp-generator/) | Generate Discord-formatted timestamps for any date |
| [Webhook Manager](https://disc-tools.de/tools/webhook-manager/) | Send, edit, and manage Discord webhooks |

### Learn Section
- **Guides** — Step-by-step tutorials for all 11 tools
- **Formatting Tips** — 15 Discord markdown topics (bold, italic, code blocks, mentions, timestamps, etc.)
- **Shortcuts** — Discord keyboard shortcuts (quick switcher, navigation, emoji picker, etc.)
- **Security Articles** — In-depth security content (token grabber scams, etc.)

### User Features
- Discord OAuth2 authentication
- User profiles with avatar, badges, account info
- Server dashboard with search & filtering
- Favorite tools (persisted in localStorage)
- Dark/light theme toggle
- Global search (Ctrl+K / Ctrl+F)
- Live popularity stats (auto-updates every 30s)
- Mobile-responsive design with slide-in navigation
- Cookie consent banner

### Additional Pages
- **Team** — Team members with roles from Discord guild
- **Partners** — Partner showcase + partner request system
- **Announcements** — Site announcements with bell notification
- **Status** — System status page with uptime monitoring
- **Admin Panel** — Discord OAuth-protected admin dashboard with announcements, member management, logs, system stats, Umami analytics
- **Legal** — Privacy policy, terms of service, imprint

## Tech Stack

### Frontend
- Vanilla HTML, CSS, JavaScript (no frameworks)
- Self-hosted fonts: Inter, JetBrains Mono, Outfit
- Font Awesome 6.5.0 (icons)
- Custom service worker for offline caching
- Open Graph / Twitter Card meta tags for rich embeds
- JSON-LD structured data for SEO

### Backend
- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** PostgreSQL (via `pg` with connection pooling)
- **Auth:** Discord OAuth2 with JWT sessions
- **Bot:** discord.js 14 for Discord API interactions
- **External APIs:** Spotify OAuth, proxycheck.io (VPN detection)

## Project Structure

```
├── index.html                    # Home page
├── about/                        # About page
├── admin/                        # Admin panel (11 sections)
├── announcements/                # Site announcements
├── api/                          # Express backend
│   ├── index.js                  # Server entry point (port 3000)
│   ├── db.js                     # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js               # JWT auth middleware
│   │   ├── cors.js               # CORS configuration
│   │   └── rateLimiter.js        # Rate limiting
│   └── routes/
│       ├── auth.js               # Discord OAuth2 login/callback/logout
│       ├── discord.js            # Discord API proxy endpoints
│       ├── stats.js              # Tool usage & page view tracking
│       ├── admin.js              # Admin panel operations
│       ├── partners.js           # Partner listing
│       ├── profiles.js           # User profile CRUD
│       └── verify.js             # Bot/email verification
├── blocked/vpn/                  # VPN/proxy blocked page
├── css/
│   └── style.css                 # Main stylesheet (5200+ lines)
├── fonts/                        # Self-hosted woff2 fonts
├── guides/                       # 11 tool-specific guides
├── invite/bot/disc-tools/        # Bot invite landing page
├── js/
│   ├── main.js                   # Core app logic (820 lines)
│   ├── avatar-cdn.js             # Tool-specific scripts
│   ├── embed-builder.js
│   ├── ... (12 tool JS files)
├── learn/                        # Learn hub page
├── legal/                        # Privacy policy, ToS, imprint
├── mobile/                       # Mobile redirect page
├── partner/                      # Partner showcase page
├── profile/                      # User profile dashboard
├── scripts/
│   └── regenerate_team_pages.js  # Team page generator
├── security-articles/            # Security educational content
├── servers/                      # User's servers dashboard
├── sitemap.xml                   # XML sitemap for SEO
├── sw.js                         # Service Worker
├── team/                         # Team member pages
├── tips/
│   ├── formatting/               # 15 Discord formatting topics
│   └── shortcuts/                # 7 Discord shortcut topics
├── tools/                        # 11 tool pages
├── verify/                       # Verification page
└── verified/                     # Verification success page
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Discord application (for OAuth2 & bot)

### Installation

```bash
git clone https://github.com/mistr-kebab/Disc-Tools.git
cd Disc-Tools
```

**Frontend:** Serve the root directory with any static server (Apache, Nginx, etc.).

**Backend:**

```bash
cd api
npm install
cp .env.example .env   # Configure environment variables
node index.js
```

### Environment Variables

The API requires the following environment variables in `api/.env`:

| Variable | Description |
|----------|-------------|
| `PORT` | API server port (default: 3000) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `DISCORD_CLIENT_ID` | Discord OAuth2 client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 client secret |
| `DISCORD_REDIRECT_URI` | OAuth2 callback URL |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `GUILD_ID` | Discord server ID for team/roles |
| `DISCORD_INVITE` | Discord server invite link |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL connection |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | GET | Discord OAuth2 login redirect |
| `/api/auth/callback` | GET | OAuth2 callback handler |
| `/api/auth/logout` | GET | Clear session |
| `/api/auth/me` | GET | Current user info |
| `/api/user/guilds` | GET | User's Discord servers |
| `/api/user/profile` | GET/PUT | User profile |
| `/api/user/partner` | GET | Partner status check |
| `/api/guild/:id` | GET | Guild lookup |
| `/api/user/:id` | GET | User lookup |
| `/api/invite/:code` | GET | Invite lookup |
| `/api/bot-info` | GET | Bot information |
| `/api/stats/track` | POST | Track tool usage |
| `/api/stats/popular` | GET | Popular tools |
| `/api/track/view` | POST | Track page view |
| `/api/team` | GET | Team members |
| `/api/announcements` | GET | Active announcements |
| `/api/security/vpn-check` | GET | VPN/proxy detection |
| `/api/admin/check` | GET | Admin whitelist check |
| `/api/verify` | POST | User verification |

## SEO

- Comprehensive meta tags (Open Graph, Twitter Cards) on every page
- JSON-LD structured data (WebSite, WebApplication, BreadcrumbList, FAQ)
- XML sitemap with prioritized URLs
- Robots.txt with API disallow
- Canonical URLs
- Semantic HTML with breadcrumb navigation

## Contributing

Contributions are welcome! Feel free to:

- Open an [issue](https://github.com/mistr-kebab/Disc-Tools/issues) for bugs or feature requests
- Submit a [pull request](https://github.com/mistr-kebab/Disc-Tools/pulls)
- Star the repo to show support

## License

This project is open source. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Not affiliated with Discord Inc.</p>
</div>
