function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Global Assets and Loader Logic
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            registration.update().catch(() => {});
        }).catch(err => console.warn('SW registration failed:', err));
    });
}

// Global UI Helper
async function updateLoaderStatus(text, delay = 0) {
    const status = document.getElementById('loader-status');
    if (status) status.innerText = text;
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
}

let loaderHiderFallback = setTimeout(hideLoader, 10000);

let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = escapeHtml(msg);
    clearTimeout(toastTimer);
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// Auth & Global Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Page view tracking
    fetch('/api/track/view', { method: 'POST', cache: 'no-store' }).catch(() => {});

    initTheme();
    initNavigation();
    initGlobalSearch();
    initFavorites();
    initStatusRedirect();
    const currentPath = window.location.pathname;

    // Handle blocked pages: Redirect away if user is actually authenticated
    if (currentPath.includes('/blocked/')) {
        const authData = await checkAuth();
        if (authData && authData.authenticated) {
            window.location.href = '/tools/';
        }
        return;
    }

    // Legal pages should not be redirected or blocked by VPN/adblock logic.
    if (currentPath === '/legal' || currentPath.startsWith('/legal/')) {
        updateFooterLinks();
        return;
    }

    // Desktop Header Scroll Effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        const closeMenu = () => {
            menuToggle.classList.remove('open');
            navLinks.classList.remove('open');
            document.body.classList.remove('menu-open');
        };

        const updateMobileLogin = () => {
            const isMobile = window.innerWidth <= 768;
            let mobileItem = navLinks.querySelector('.mobile-auth');
            
            if (!isMobile) {
                if (mobileItem) mobileItem.remove();
                return;
            }

            if (!mobileItem) {
                mobileItem = document.createElement('div');
                mobileItem.className = 'mobile-auth';
                navLinks.appendChild(mobileItem);
            }

            const loggedIn = document.querySelector('.login-badge.logged-in');
            if (loggedIn) {
                const username = loggedIn.dataset.username || '';
                mobileItem.innerHTML = `
                    <a href="/u/${encodeURIComponent(username)}" class="nav-link">Profile</a>
                    <a href="/u/${encodeURIComponent(username)}/servers/" class="nav-link">Servers</a>
                    <a href="/api/auth/logout" class="nav-link" style="color:var(--muted);">Logout</a>
                `;
            } else {
                mobileItem.innerHTML = `<a href="/api/auth/login" class="login-btn"><i class="fa-brands fa-discord"></i> Login</a>`;
            }

            mobileItem.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
        };

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('open');
            navLinks.classList.toggle('open');
            document.body.classList.toggle('menu-open');
        });

        document.addEventListener('click', (e) => {
            if (!navLinks.classList.contains('open')) return;
            if (navLinks.contains(e.target) || menuToggle.contains(e.target)) return;
            closeMenu();
        });

        navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

        navLinks.querySelectorAll('.dropdown-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (window.innerWidth > 768) return;
                e.stopPropagation();
                e.preventDefault();
                const menu = btn.nextElementSibling;
                if (menu && menu.classList.contains('dropdown-menu')) {
                    const isOpen = menu.style.display === 'block';
                    navLinks.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = '');
                    if (!isOpen) menu.style.display = 'block';
                }
            });
        });

        updateMobileLogin();

        const authObserver = new MutationObserver(() => updateMobileLogin());
        const badge = document.querySelector('.login-badge');
        if (badge) authObserver.observe(badge, { childList: true, subtree: true, attributes: true });

        window.addEventListener('resize', updateMobileLogin);
    }

    // Always check Auth and Security, regardless of loader presence
    const authData = await checkAuth();
    const isAuthenticated = authData && authData.authenticated;

    if (!isAuthenticated) {
        checkSecurity();
    }

    // Global Announcements Bell
    try {
        const res = await fetch('/api/announcements');
        const anns = await res.json();

        const header = document.querySelector('header');
        const loginBadge = document.querySelector('.login-badge');
        if (header && loginBadge) {
            // Read/Unread state: localStorage + server sync
            let readIds = [];
            try { readIds = JSON.parse(localStorage.getItem('announcements_read') || '[]'); } catch(e) {}

            // If authenticated, merge server read state into localStorage
            if (isAuthenticated) {
                try {
                    const syncRes = await fetch('/api/announcements/read');
                    if (syncRes.ok) {
                        const syncData = await syncRes.json();
                        const serverIds = syncData.readIds || [];
                        let changed = false;
                        for (const sid of serverIds) {
                            if (!readIds.includes(sid)) { readIds.push(sid); changed = true; }
                        }
                        if (changed) localStorage.setItem('announcements_read', JSON.stringify(readIds));
                    }
                } catch(e) {}
            }

            let _syncTimer;

            function syncToServer() {
                if (!isAuthenticated) return;
                if (_syncTimer) clearTimeout(_syncTimer);
                _syncTimer = setTimeout(() => {
                    fetch('/api/announcements/read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: readIds })
                    }).catch(() => {});
                }, 400);
            }

            function updateBadge() {
                const badge = document.getElementById('ann-badge');
                const unread = anns.filter(a => !readIds.includes(a.id)).length;
                if (badge) {
                    if (unread > 0) {
                        badge.textContent = unread;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }

            function toggleRead(id) {
                const idx = readIds.indexOf(id);
                if (idx > -1) { readIds.splice(idx, 1); }
                else { readIds.push(id); }
                localStorage.setItem('announcements_read', JSON.stringify(readIds));
                updateBadge();
                syncToServer();
                const cb = document.querySelector(`#ann-dropdown .ann-checkbox[data-id="${id}"]`);
                if (cb) {
                    const isRead = readIds.includes(id);
                    cb.classList.toggle('checked', isRead);
                    cb.querySelector('i').className = isRead ? 'fa-solid fa-check-square' : 'fa-regular fa-square';
                    cb.style.color = isRead ? '#2ecc71' : 'var(--muted)';
                    const item = cb.closest('.ann-item');
                    if (item) item.style.opacity = isRead ? '0.6' : '1';
                }
            }

            function markAllRead() {
                anns.forEach(a => { if (!readIds.includes(a.id)) readIds.push(a.id); });
                localStorage.setItem('announcements_read', JSON.stringify(readIds));
                updateBadge();
                if (isAuthenticated) {
                    fetch('/api/announcements/read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ markAll: true })
                    }).catch(() => {});
                }
                document.querySelectorAll('#ann-dropdown .ann-checkbox').forEach(cb => {
                    const id = cb.dataset.id;
                    if (id && readIds.includes(id)) {
                        cb.classList.add('checked');
                        cb.querySelector('i').className = 'fa-solid fa-check-square';
                        cb.style.color = '#2ecc71';
                    }
                });
                document.querySelectorAll('#ann-dropdown .ann-item').forEach(item => {
                    item.style.opacity = '0.6';
                });
            }

            // Build badge HTML
            let badgeHtml = '';
            const unreadCount = anns.filter(a => !readIds.includes(a.id)).length;
            if (unreadCount > 0) {
                badgeHtml = `<span id="ann-badge" style="position:absolute; top:0; right:0; background:#e74c3c; color:#fff; font-size:10px; font-weight:bold; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border:2px solid var(--surface);">${unreadCount}</span>`;
            }

            let dropdownItems = '';
            if (anns.length === 0) {
                dropdownItems = '<div style="padding:20px; color:var(--muted); font-size:13px; text-align:center;"><i class="fa-solid fa-check-circle" style="font-size:24px; color:#2ecc71; margin-bottom:10px; display:block;"></i>All caught up!</div>';
            } else {
                const displayAnns = anns.slice(0, 2);
                displayAnns.forEach(a => {
                    let icon = 'fa-circle-info'; let color = '#3498db';
                    if (a.type === 'success') { icon = 'fa-check-circle'; color = '#2ecc71'; }
                    else if (a.type === 'warning') { icon = 'fa-triangle-exclamation'; color = '#f1c40f'; }

                    const isRead = readIds.includes(a.id);

                    let authorHtml = '';
                    if (a.author) {
                        let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(a.author.discriminator || 0) % 5}.png`;
                        if (a.author.avatar) avatarUrl = `https://cdn.discordapp.com/avatars/${a.author.id}/${a.author.avatar}.png?size=32`;
                        authorHtml = `
                            <div style="display:flex; align-items:center; gap:6px; margin-top:8px;">
                                <img src="${avatarUrl}" style="width:16px; height:16px; border-radius:50%;">
                                <span style="font-size:11px; color:var(--muted);">${escapeHtml(a.author.username)}</span>
                            </div>
                        `;
                    }

                    dropdownItems += `
                        <div class="ann-item" data-id="${a.id}" style="padding:12px; border-radius:8px; background:rgba(255,255,255,0.02); border-left:3px solid ${color};${isRead ? ' opacity:0.6;' : ''}">
                            <div style="display:flex; gap:10px; align-items:flex-start;">
                                <div class="ann-checkbox ${isRead ? 'checked' : ''}" data-id="${a.id}" style="cursor:pointer; margin-top:2px; color:${isRead ? '#2ecc71' : 'var(--muted)'}; font-size:14px; width:16px; text-align:center; flex-shrink:0;">
                                    <i class="${isRead ? 'fa-solid fa-check-square' : 'fa-regular fa-square'}"></i>
                                </div>
                                <i class="fa-solid ${icon}" style="color:${color}; margin-top:2px;"></i>
                                <div style="flex:1;">
                                    <div style="font-weight:600; font-size:13px; color:#fff;">${escapeHtml(a.title)}</div>
                                    <div style="font-size:12px; color:var(--muted); margin-top:3px; line-height:1.4;">${escapeHtml(a.text)}</div>
                                    ${authorHtml}
                                </div>
                            </div>
                        </div>
                    `;
                });

                // Bottom card: "View All" always, with "Read N more" if >2
                const moreCount = anns.length - 2;
                dropdownItems += `
                    <a href="/announcements/" style="display:flex; align-items:center; justify-content:center; gap:4px; padding:12px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid var(--border); color:var(--muted); font-size:12px; font-weight:600; text-decoration:none; margin-top:5px; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.color='var(--muted)';">
                        ${moreCount > 0 ? `Read ${moreCount} more announcement${moreCount > 1 ? 's' : ''} <span style="color:var(--border);">·</span> ` : ''}View All &rarr;
                    </a>
                `;
            }

            // Wrap bell + loginBadge together so they sit right next to each other
            let group = document.getElementById('header-right-group');
            if (!group) {
                group = document.createElement('div');
                group.id = 'header-right-group';
                group.style.cssText = 'display:inline-flex; align-items:center; gap:6px;';
                loginBadge.parentNode.insertBefore(group, loginBadge);
                group.appendChild(loginBadge);
            }

            group.insertAdjacentHTML('afterbegin', `
                <div style="position:relative;">
                    <button id="ann-bell-btn" style="background:transparent; border:none; color:var(--muted); font-size:18px; cursor:pointer; position:relative; padding:5px; transition:color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--muted)'">
                        <i class="fa-solid fa-bell"></i>
                        ${badgeHtml}
                    </button>
                    <div id="ann-dropdown" style="display:none; position:absolute; top:45px; right:0; width:340px; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:10px; box-shadow:0 10px 40px rgba(0,0,0,0.6); z-index:1001; max-height:400px; overflow-y:auto;">
                        <div style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--muted); padding:5px 10px 10px 10px; margin-bottom:10px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                            <span>Announcements</span>
                            ${anns.length > 0 ? '<button id="ann-mark-read" style="background:none; border:none; color:#3498db; font-size:12px; font-weight:600; cursor:pointer; padding:0; text-transform:none; white-space:nowrap;">Mark all as read</button>' : ''}
                        </div>
                        <div style="display:flex; flex-direction:column; gap:10px;">${dropdownItems}</div>
                    </div>
                </div>
            `);

            // Event listeners
            const btn = document.getElementById('ann-bell-btn');
            const dropdown = document.getElementById('ann-dropdown');
            if (btn && dropdown) {
                btn.onclick = (e) => { e.stopPropagation(); dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none'; };
                document.addEventListener('click', () => { dropdown.style.display = 'none'; });
                dropdown.onclick = (e) => {
                    e.stopPropagation();
                    const checkbox = e.target.closest('.ann-checkbox');
                    if (checkbox) { toggleRead(checkbox.dataset.id); return; }
                    const markBtn = e.target.closest('#ann-mark-read');
                    if (markBtn) { markAllRead(); return; }
                };
            }
        }
    } catch(e) {}
    
    updateFooterLinks();
    const filterButtons = document.querySelectorAll('.sidebar-link[data-filter], .filter-pill[data-filter]');
    const toolCards = document.querySelectorAll('.tool-card');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            
            // Update Active State
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter Cards
            toolCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeIn 0.3s ease forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Global Real Live Stats
    async function updateAllLiveStats() {
        try {
            const res = await fetch('/api/stats/popular');
            const tools = await res.json();

            const allCards = document.querySelectorAll('.tool-card');
            allCards.forEach(card => {
                const href = card.getAttribute('href') || '';
                const toolId = href.split('/').filter(Boolean).pop();
                const tool = tools.find(t => t.id === toolId);

                if (tool) {
                    card.setAttribute('data-popularity', tool.count);
                }
            });

            // Special handling for the Popular Tools section on home page
            const popularContainer = document.getElementById('popular-tools-container');
            if (popularContainer) {
                const popularCards = Array.from(popularContainer.querySelectorAll('.tool-card'));
                const sortedCards = popularCards.sort((a, b) => (Number(b.getAttribute('data-popularity')) || 0) - (Number(a.getAttribute('data-popularity')) || 0));

                sortedCards.forEach((c, index) => {
                    if (index < 3) {
                        c.style.display = 'block';
                        popularContainer.appendChild(c);
                    } else {
                        c.style.display = 'none';
                    }
                });
            }
        } catch (err) {
            console.warn('Stats fetch failed');
        }
    }

    // Global Enter-Key Support for all tools
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const activeEl = document.activeElement;
            if (activeEl.tagName === 'INPUT' && activeEl.type !== 'submit') {
                // Find the associated button
                const group = activeEl.closest('.input-group');
                if (group) {
                    const btn = group.querySelector('button');
                    if (btn) {
                        e.preventDefault();
                        btn.click();
                        return;
                    }
                }
                
                const container = activeEl.closest('.input-card') || activeEl.closest('.tool-container');
                if (container) {
                    const btn = container.querySelector('button:not(.toggle-visibility)');
                    if (btn) {
                        e.preventDefault();
                        btn.click();
                    }
                }
            }
        }
    });

    // Logout Confirmation
    document.addEventListener('click', (e) => {
        const logoutLink = e.target.closest('.logout-link, .logout-btn-premium, a[href*="logout"]');
        if (logoutLink) {
            const confirmed = confirm("Are you sure you want to log out?");
            if (!confirmed) {
                e.preventDefault();
            }
        }
    });

    updateAllLiveStats();
    setInterval(updateAllLiveStats, 30000);

    window.trackToolUsage = async (toolId) => {
        try {
            await fetch('/api/stats/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool: toolId })
            });
        } catch (err) {}
    };

    // Auto-track tool views
    if (currentPath.includes('/tools/')) {
        const parts = currentPath.split('/tools/');
        if (parts[1]) {
            const toolId = parts[1].split('/')[0];
            if (toolId) trackToolUsage(toolId);
        }
    }

    // Loader Sequence (only if loader exists)
    const loader = document.getElementById('global-loader');
    if (loader) {
        await updateLoaderStatus('Initializing core systems...', 400);
        await updateLoaderStatus('Ready!', 100);
        hideLoader();
        clearTimeout(loaderHiderFallback);
    }
});

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) return { authenticated: false };
        const data = await response.json();
        if (data.authenticated && data.user) {
            updateUIForAuth(data.user);
            return data;
        }
        resetUIForAuth();
        return { authenticated: false };
    } catch (err) {
        console.warn('Auth Check failed');
        resetUIForAuth();
        return { authenticated: false };
    }
}

function updateUIForAuth(user) {
    const loginBadge = document.querySelector('.login-badge');
    if (loginBadge) {
        let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(user.discriminator || 0) % 5}.png`;
        if (user.avatar) {
            const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=64`;
        }
            
        loginBadge.dataset.username = user.username;
        loginBadge.innerHTML = `
            <div class="user-dropdown-container">
                <button class="user-badge-mini" id="user-menu-trigger">
                    <img src="${avatarUrl}" alt="${escapeHtml(user.username)}" loading="lazy">
                    <span class="user-nav-name">${escapeHtml(user.username)}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div class="user-dropdown-menu" id="user-dropdown">
                    <a href="/u/${encodeURIComponent(user.username)}"><i class="fa-solid fa-user"></i> Profile</a>
                    <a href="/u/${encodeURIComponent(user.username)}/servers/"><i class="fa-solid fa-server"></i> Servers</a>
                    <div class="dropdown-divider"></div>
                    <a href="/api/auth/logout" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </div>
            </div>
        `;
        loginBadge.classList.add('logged-in');

        // Toggle Logic
        const trigger = document.getElementById('user-menu-trigger');
        const menu = document.getElementById('user-dropdown');
        
        if (trigger && menu) {
            trigger.onclick = (e) => {
                e.stopPropagation();
                menu.classList.toggle('show');
                trigger.classList.toggle('active');
            };

            document.addEventListener('click', () => {
                menu.classList.remove('show');
                trigger.classList.remove('active');
            });
        }

        // Check Admin Status asynchronously
        fetch('/api/admin/check', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.isAdmin && menu) {
                    const divider = menu.querySelector('.dropdown-divider');
                    const adminLink = document.createElement('a');
                    adminLink.href = '/admin/overview/';
                    adminLink.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: #e74c3c;"></i> Admin';
                    menu.insertBefore(adminLink, divider);
                }
            })
            .catch(() => {});

        // Check Partner Status asynchronously
        fetch('/api/user/partner', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data && data.slug && menu) {
                    const partnerLink = document.createElement('a');
                    partnerLink.href = `/partner/${data.slug}`;
                    partnerLink.innerHTML = '<i class="fa-solid fa-handshake" style="color: #2ecc71;"></i> Partner';
                    const adminLink = menu.querySelector('a[href^="/admin/"]');
                    const divider = menu.querySelector('.dropdown-divider');
                    if (adminLink) {
                        menu.insertBefore(partnerLink, adminLink);
                    } else if (divider) {
                        menu.insertBefore(partnerLink, divider);
                    } else {
                        menu.appendChild(partnerLink);
                    }
                }
            })
            .catch(() => {});
    }
}

function resetUIForAuth() {
    const loginBadge = document.querySelector('.login-badge');
    if (loginBadge) {
        loginBadge.innerHTML = `<a href="/api/auth/login" class="login-btn"><i class="fa-brands fa-discord"></i> Login</a>`;
        loginBadge.classList.remove('logged-in');
    }
}

async function checkSecurity() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Check ban status first (separate endpoint)
    try {
        const banRes = await fetch('/api/security/ban-check', { signal: controller.signal });
        const banData = await banRes.json();
        if (banData.isBanned) {
            console.warn('[SECURITY] IP is banned');
            window.location.href = '/blocked/banned/';
            return;
        }
    } catch (e) {}

    try {
        const response = await fetch('/api/security/vpn-check', { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        
        if (data.isVpn && ['VPN', 'Proxy', 'Hosting'].includes(data.type)) {
            console.warn(`[SECURITY] VPN/Proxy Detected: ${data.type} (${data.provider})`);
            const url = new URL('/blocked/vpn/', window.location.origin);
            url.searchParams.set('ip', data.ip || '');
            url.searchParams.set('type', data.type || '');
            url.searchParams.set('provider', data.provider || '');
            url.searchParams.set('asn', data.asn || '');
            window.location.href = url.toString();
        }
    } catch (err) {
        console.error('Security check failed or timed out. Falling back to permissive mode.');
    }
}

// --- NEW FEATURES ---

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    // Re-apply in case it was missed or updated
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Create toggle in header if not exists
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !document.getElementById('theme-toggle')) {
        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'theme-btn';
        toggle.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        toggle.onclick = () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            toggle.innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        };
        navLinks.prepend(toggle);
    }
}

function initNavigation() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    // Add Team link if not exists
    const links = Array.from(navLinks.querySelectorAll('a'));
    if (!links.some(a => a.getAttribute('href') === '/team/')) {
        const teamLink = document.createElement('a');
        teamLink.href = '/team/';
        teamLink.className = 'nav-link';
        teamLink.textContent = 'Team';
        
        // Match current page active state
        if (window.location.pathname === '/team/' || window.location.pathname === '/team/index.html') {
            teamLink.classList.add('active');
        }

        // Insert before About or Status if possible
        const aboutLink = links.find(a => a.getAttribute('href') === '/about/');
        const statusLink = links.find(a => a.getAttribute('href')?.includes('status'));
        
        if (aboutLink) {
            navLinks.insertBefore(teamLink, aboutLink);
        } else if (statusLink) {
            navLinks.insertBefore(teamLink, statusLink);
        } else {
            navLinks.appendChild(teamLink);
        }
    }

    // Add Security link to Learn dropdown if not exists
    const dropdownMenu = document.querySelector('.nav-dropdown .dropdown-menu');
    if (dropdownMenu && !dropdownMenu.querySelector('a[href="/security-articles/"]')) {
        const securityLink = document.createElement('a');
        securityLink.href = '/security-articles/';
        securityLink.textContent = 'Security';
        
        // Match current page active state
        const path = window.location.pathname;
        if (path === '/security-articles/' || path === '/security-articles/index.html' || path.startsWith('/security-articles/')) {
            securityLink.classList.add('active');
        }
        
        dropdownMenu.appendChild(securityLink);
    }
}

function initStatusRedirect() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.includes('status.disc-tools.de')) {
            const confirmed = confirm('You are about to be redirected to an external status page. Would you like to proceed?');
            if (!confirmed) {
                e.preventDefault();
            }
        }
    });
}

function initGlobalSearch() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('global-search-container')) return;

    const searchContainer = document.createElement('div');
    searchContainer.id = 'global-search-container';
    searchContainer.innerHTML = `
        <div class="search-wrapper">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="global-search-input" placeholder="Search tools & guides...">
            <div class="search-kbd">Ctrl K</div>
            <div id="search-results" class="search-dropdown"></div>
        </div>
    `;
    const loginBadge = header.querySelector('.login-badge');
    if (loginBadge) {
        header.insertBefore(searchContainer, loginBadge);
    } else {
        header.appendChild(searchContainer);
    }

    const input = document.getElementById('global-search-input');
    const results = document.getElementById('search-results');
    let selectedIndex = 0;

    const updateSelection = () => {
        const items = results.querySelectorAll('.search-item');
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    };

    input.oninput = () => {
        const query = input.value.toLowerCase().trim();
        if (!query) {
            results.classList.remove('show');
            return;
        }

        const items = [
            { name: 'Webhook Manager', url: '/tools/webhook-manager/', type: 'tool' },
            { name: 'Avatar CDN', url: '/tools/avatar-cdn/', type: 'tool' },
            { name: 'Invite Lookup', url: '/tools/invite-lookup/', type: 'tool' },
            { name: 'Server Lookup', url: '/tools/server-lookup/', type: 'tool' },
            { name: 'Markdown Generator', url: '/tools/markdown-generator/', type: 'tool' },
            { name: 'Emoji Stealer', url: '/tools/emoji-stealer/', type: 'tool' },
            { name: 'Snowflake Decoder', url: '/tools/snowflake-decoder/', type: 'tool' },
            { name: 'Color Picker', url: '/tools/color-picker/', type: 'tool' },
            { name: 'Nitro Gift Checker', url: '/tools/nitro-checker/', type: 'tool' },
            { name: 'Our Team', url: '/team/', type: 'info' },
            { name: 'About Us', url: '/about/', type: 'info' },
            { name: 'Token Grabber Guide', url: '/security-articles/token-grabber/', type: 'guide' },
            { name: 'Security Articles', url: '/security-articles/', type: 'guide' },
            { name: 'Learn Hub', url: '/learn/', type: 'guide' }
        ];

        // Advanced sorting by relevance
        const matches = items
            .filter(item => item.name.toLowerCase().includes(query))
            .sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                
                // 1. Exact match
                if (aName === query) return -1;
                if (bName === query) return 1;
                
                // 2. Starts with query
                if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
                if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
                
                // 3. Alphabetical
                return aName.localeCompare(bName);
            });

        if (matches.length > 0) {
            selectedIndex = 0; // Always select first match
            results.innerHTML = matches.map((m, idx) => `
                <a href="${m.url}" class="search-item ${idx === 0 ? 'selected' : ''}">
                    <i class="fa-solid ${m.type === 'tool' ? 'fa-screwdriver-wrench' : (m.type === 'info' ? 'fa-circle-info' : 'fa-book')}"></i>
                    <span>${m.name}</span>
                </a>
            `).join('');
            results.classList.add('show');
        } else {
            results.innerHTML = `
                <div class="search-no-results">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <p>No tools or guides found for "<span>${escapeHtml(query)}</span>"</p>
                    <small>Try a different keyword or check your spelling.</small>
                </div>
            `;
            results.classList.add('show');
        }
    };

    input.addEventListener('keydown', (e) => {
        const items = results.querySelectorAll('.search-item');
        if (!results.classList.contains('show') || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = items[selectedIndex];
            if (selected) {
                window.location.href = selected.getAttribute('href');
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) results.classList.remove('show');
    });

    document.addEventListener('keydown', (e) => {
        // Ctrl+F or Ctrl+K to focus
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'k')) {
            e.preventDefault();
            input.focus();
        }
        // ESC to close
        if (e.key === 'Escape') {
            results.classList.remove('show');
            input.blur();
        }
    });
}

function initFavorites() {
    const toolCards = document.querySelectorAll('.tool-card');
    const favorites = JSON.parse(localStorage.getItem('tool-favorites') || '[]');

    toolCards.forEach(card => {
        const href = card.getAttribute('href') || '';
        const toolId = href.split('/').filter(Boolean).pop();
        
        const star = document.createElement('button');
        star.className = 'favorite-btn' + (favorites.includes(toolId) ? ' active' : '');
        star.innerHTML = '<i class="fa-solid fa-star"></i>';
        star.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(toolId, star);
        };
        card.appendChild(star);
    });
}

function toggleFavorite(toolId, btn) {
    let favorites = JSON.parse(localStorage.getItem('tool-favorites') || '[]');
    if (favorites.includes(toolId)) {
        favorites = favorites.filter(id => id !== toolId);
        btn.classList.remove('active');
    } else {
        favorites.push(toolId);
        btn.classList.add('active');
    }
    localStorage.setItem('tool-favorites', JSON.stringify(favorites));
}

function updateFooterLinks() {}

// Cookie Banner Logic (Consolidated)
(function() {
    if (localStorage.getItem('cookie-consent')) return;
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
        <div class="cookie-content">
            <div class="cookie-icon"><i class="fa-solid fa-cookie-bite"></i></div>
            <div class="cookie-text">
                <p>We use cookies to enhance your experience and analyze our traffic. <a href="/legal/privacy-policy/">Learn more</a></p>
            </div>
            <div class="cookie-actions">
                <button id="decline-cookies" class="cookie-btn cookie-btn-secondary">Only Essentials</button>
                <button id="accept-cookies" class="cookie-btn">Accept</button>
            </div>
        </div>
    `;
    document.body.appendChild(banner);

    const dismiss = (value) => {
        banner.classList.add('fade-out');
        setTimeout(() => {
            banner.remove();
            localStorage.setItem('cookie-consent', value);
        }, 300);
    };

    document.getElementById('accept-cookies')?.addEventListener('click', () => dismiss('accepted'));
    document.getElementById('decline-cookies')?.addEventListener('click', () => dismiss('declined'));
})();
