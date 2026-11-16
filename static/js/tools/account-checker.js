/* Disc-Tools: Account Checker — free with login, alt risk score from public account signals */
(function () {
    'use strict';

    var form = document.getElementById('lookup-form');
    var input = document.getElementById('lookup-input');
    var submit = document.getElementById('lookup-submit');
    var login = document.querySelector('.lookup-login');
    var resultEl = document.getElementById('result');

    var DISCORD_EPOCH_MS = 1420070400000;

    /* ---------- Helpers ---------- */
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function snowflakeDate(id) {
        try {
            var ms = Number((BigInt(id) >> 22n) + BigInt(DISCORD_EPOCH_MS));
            return new Date(ms);
        } catch (e) { return null; }
    }

    function daysOld(id) {
        var d = snowflakeDate(id);
        if (!d || isNaN(d.getTime())) return null;
        return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
    }

    function fmtDate(d) {
        if (!d || isNaN(d.getTime())) return 'Unknown';
        return d.toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function defaultAvatarURL(userId) {
        var idx = 0;
        try { idx = Number((BigInt(userId) >> 22n) % 6n); if (isNaN(idx) || idx < 0) idx = 0; } catch (e) {}
        return 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png';
    }

    function avatarURL(userId, avatar) {
        if (!avatar) return defaultAvatarURL(userId);
        var ext = avatar.startsWith('a_') ? 'gif' : 'webp';
        return 'https://cdn.discordapp.com/avatars/' + userId + '/' + avatar + '.' + ext + '?size=256';
    }

    function loadingHTML(msg) {
        return '<div class="lookup-loading"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>' + esc(msg) + '</div>';
    }

    function errorHTML(msg) {
        return '<div class="lookup-error"><i class="fa-solid fa-circle-exclamation"></i><p>' + esc(msg) + '</p></div>';
    }

    /* ---------- Profile score ---------- */
    function computeScore(u, manualBadges) {
        var days = daysOld(u.id);
        var factors = [
            { label: u.avatar ? 'Has a custom avatar' : 'Uses a default avatar', points: u.avatar ? 6 : 0 }
        ];

        if (days != null) factors.push({ label: 'Account is ' + days + ' days old', points: 0 });
        if (u.bot) factors.push({ label: 'Bot account', points: 0 });
        if (!u.bot) {
            var hasBadgeData = Boolean(u.public_flags) || (Array.isArray(u.badges) && u.badges.length > 0);
            var badgeLabel = hasBadgeData ? 'Badge data available from Discord' : 'No badge data returned by Discord';
            if (manualBadges) badgeLabel += ' · ' + manualBadges + ' marked manually';
            factors.push({ label: badgeLabel, points: 0 });
        }

        if (u._guildMember) factors.push({ label: 'Member of the Disc-Tools community', points: 0 });
        if (u.premium_since) factors.push({ label: 'Boosting a server', points: 0 });
        if (u.avatar_decoration_data?.asset) factors.push({ label: 'Has an avatar decoration', points: 2 });
        if (u.display_name_styles?.font_id) factors.push({ label: 'Custom display name styling', points: 0 });
        if ((u.primary_guild || u.clan)?.tag) factors.push({ label: 'Has a clan tag', points: 2 });

        return { score: factors.reduce(function (sum, factor) { return sum + factor.points; }, 90), factors: factors, days: days };
    }

    function renderFactors(factors) {
        return factors.map(function (factor) {
            var positive = factor.points > 0;
            return '<li class="alt-factor ' + (positive ? 'alt-factor-good' : 'alt-factor-neutral') + '">' +
                '<i class="fa-solid ' + (positive ? 'fa-circle-plus' : 'fa-circle') + '" aria-hidden="true"></i>' +
                '<span class="alt-factor-label">' + esc(factor.label) + '</span>' +
                '<span class="alt-factor-points">' + (positive ? '+' + factor.points : '0') + '</span></li>';
        }).join('');
    }

    function verdictColor(value) {
        if (value >= 80) return '#23a55a';
        if (value >= 60) return '#f0b232';
        if (value >= 40) return '#f07c22';
        return '#ed4245';
    }

    /* ---------- Render ---------- */
    function renderResult(u) {
        var res = computeScore(u);
        var value = res.score;
        var color = verdictColor(value);

        var display = u.global_name || u.display_name || u.username || 'Unknown';
        var username = '@' + (u.username || '?') + (u.discriminator && u.discriminator !== '0' ? '#' + u.discriminator : '');
        var created = snowflakeDate(u.id);
        var isBot = u.bot ? '<span class="result-bot-flag"><i class="fa-solid fa-robot"></i> Bot</span>' : '';
        var premiumFlag = u.premium_since ? '<span class="alt-flag alt-flag-boost"><i class="fa-solid fa-gem"></i> Boosting a server</span>' : '';
        var memberFlag = u._guildMember ? '<span class="alt-flag alt-flag-member"><i class="fa-solid fa-user-check"></i> In the community</span>' : '';

        var factorItems = renderFactors(res.factors);

        var ringLabel = String(value);
        var ringSub = '/ 100';

        var RING_PATH = 'M 50 5 A 45 45 0 1 1 50 95 A 45 45 0 1 1 50 5 Z';

        var badgesSection = u.bot ? '' :
            '<div class="alt-section alt-badges">' +
                '<h3 class="result-links-title"><i class="fa-solid fa-medal"></i> Badges</h3>' +
                '<button type="button" class="alt-badges-toggle" aria-expanded="false">' +
                    '<i class="fa-solid fa-circle-info" aria-hidden="true"></i> The bot can\'t see every badge — what\'s missing?' +
                    '<i class="fa-solid fa-chevron-down alt-badges-chev" aria-hidden="true"></i>' +
                '</button>' +
                '<div class="alt-badges-info" hidden>' +
                    '<p>As a bot we can only see Discord system badges: Staff, Partner, HypeSquad, Bug Hunter Lvl 1/2, Early Supporter, Verified Bot, Verified Developer, Certified Moderator and Active Developer.</p>' +
                    '<p>Discord can omit badges such as Nitro, Server Boosting and collectibles from the lookup. You can mark badges you see on the profile:</p>' +
                    '<div class="alt-badge-options">' +
                        '<label class="alt-badge-option"><input type="checkbox" value="nitro"><span><i class="fa-solid fa-gem" aria-hidden="true"></i> Nitro subscription</span></label>' +
                        '<label class="alt-badge-option"><input type="checkbox" value="boost"><span><i class="fa-solid fa-rocket" aria-hidden="true"></i> Server Boosting</span></label>' +
                        '<label class="alt-badge-option"><input type="checkbox" value="supporter"><span><i class="fa-solid fa-handshake-angle" aria-hidden="true"></i> Server Supporter</span></label>' +
                        '<label class="alt-badge-option"><input type="checkbox" value="profile"><span><i class="fa-solid fa-id-badge" aria-hidden="true"></i> Profile badge (collectible / unique)</span></label>' +
                    '</div>' +
                    '<p class="alt-badges-note">Badge information does not affect the score.</p>' +
                '</div>' +
            '</div>';

        resultEl.innerHTML =
            '<div class="result-card">' +
                '<section class="result-identity checker-identity" aria-labelledby="checker-name">' +
                '<div class="result-body">' +
                    '<div class="result-head">' +
                        '<div class="result-avatar-wrap">' +
                            '<img class="result-avatar" src="' + esc(avatarURL(u.id, u.avatar)) + '" alt="' + esc(display) + '">' +
                        '</div>' +
                        '<div class="result-name-block">' +
                            '<h2 class="result-display" id="checker-name">' + esc(display) + ' ' + isBot + '</h2>' +
                            '<p class="result-username">' + esc(username) + '</p>' +
                            '<div class="alt-flags">' + premiumFlag + memberFlag + '</div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="alt-score-wrap">' +
                        '<div class="alt-ring">' +
                            '<svg viewBox="0 0 100 100" width="150" height="150" aria-hidden="true">' +
                                '<path d="' + RING_PATH + '" pathLength="100" fill="none" stroke-width="10" class="alt-ring-track"/>' +
                                '<path d="' + RING_PATH + '" pathLength="100" fill="none" stroke-width="10" class="alt-ring-bad" stroke="#ed4245" style="stroke-dasharray:0 100"/>' +
                                '<path d="' + RING_PATH + '" pathLength="100" fill="none" stroke-width="10" class="alt-ring-value" stroke="#23a55a" style="stroke-dasharray:0 100"/>' +
                            '</svg>' +
                            '<div class="alt-ring-score">' +
                                '<span class="alt-ring-number" style="color:' + color + '">' + ringLabel + '</span>' +
                                '<span class="alt-ring-label">' + ringSub + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="alt-summary">' +
                            '<h3>Profile score</h3>' +
                            '<p class="alt-summary-text">Starts at 90. A custom avatar adds 6 points, and avatar decoration and a clan tag add 2 each.</p>' +
                        '</div>' +
                    '</div>' +

                '</div></section>' +
                '<section class="result-details" aria-labelledby="checker-details">' +
                    '<h2 id="checker-details">Account details</h2>' +
                    '<div class="alt-section">' +
                        '<h3 class="result-links-title"><i class="fa-solid fa-scale-balanced"></i> Score factors</h3>' +
                        '<ul class="alt-factor-list">' + factorItems + '</ul>' +
                    '</div>' +

                    badgesSection +

                    '<div class="result-info-grid">' +
                        '<div class="result-info-item">' +
                            '<span class="result-info-label"><i class="fa-solid fa-calendar"></i> Account created</span>' +
                            '<span class="result-info-value">' + (created ? esc(fmtDate(created)) : 'Unknown') + '</span>' +
                            '<span class="result-info-sub">' + (res.days != null ? esc(res.days + ' days ago') : '') + '</span>' +
                        '</div>' +
                        '<div class="result-info-item">' +
                            '<span class="result-info-label"><i class="fa-solid fa-hashtag"></i> User ID</span>' +
                            '<span class="result-info-value result-info-mono">' + esc(u.id) + '</span>' +
                            '<span class="result-info-sub">Snowflake ID — use it in any lookup tool</span>' +
                        '</div>' +
                    '</div>' +
                '</section>' +
            '</div>';

        var card = resultEl.querySelector('.result-card');
        if (card) card.classList.add('result-card-in');

        var arcEl = resultEl.querySelector('.alt-ring-value');
        var badEl = resultEl.querySelector('.alt-ring-bad');
        var numElInit = resultEl.querySelector('.alt-ring-number');

        function gaugeSet(score) {
            arcEl.style.strokeDasharray = score + ' 100';
            badEl.style.strokeDashoffset = -score;
            badEl.style.strokeDasharray = (100 - score) + ' 100';
        }

        if (arcEl) setTimeout(function () { gaugeSet(value); }, 60);
        if (numElInit) {
            numElInit.style.animation = 'none';
            void numElInit.offsetWidth;
            numElInit.style.animation = '';
        }

        /* ---------- Badges section: toggle + live rescore ---------- */
        var badgeChecks = resultEl.querySelectorAll('.alt-badge-options input');
        if (badgeChecks.length > 0) {
            var toggleBtn = resultEl.querySelector('.alt-badges-toggle');
            var infoBox = resultEl.querySelector('.alt-badges-info');

            toggleBtn.addEventListener('click', function () {
                var open = infoBox.hidden;
                infoBox.hidden = !open;
                toggleBtn.setAttribute('aria-expanded', String(open));
                toggleBtn.classList.toggle('alt-badges-open', open);
            });

            var factorListEl = resultEl.querySelector('.alt-factor-list');

            function refreshBadges() {
                var manual = Array.prototype.filter.call(badgeChecks, function (checkbox) {
                    return checkbox.checked;
                }).length;
                factorListEl.innerHTML = renderFactors(computeScore(u, manual).factors);
            }

            Array.prototype.forEach.call(badgeChecks, function (c) {
                c.addEventListener('change', refreshBadges);
            });
        }

        resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ---------- Lookup logic ---------- */
    function lookup(id) {
        if (submit.disabled) return;
        if (!/^\d{17,20}$/.test(id)) {
            resultEl.innerHTML = errorHTML('That doesn\'t look like a valid Discord user ID. IDs are 17-20 digits long.');
            return;
        }

        history.replaceState(null, '', '/tools/account-checker/?userid=' + id);
        submit.disabled = true;
        login.hidden = true;
        resultEl.innerHTML = loadingHTML('Looking up...');

        fetch('/api/user-lookup/' + encodeURIComponent(id), { cache: 'no-store' })
            .then(function (r) {
                var ct = r.headers.get('content-type') || '';
                if (ct.indexOf('application/json') === -1) {
                    throw new Error('Unexpected server response (please try again).');
                }
                return r.json().then(function (body) { return { ok: r.ok, status: r.status, body: body }; });
            })
            .then(function (res) {
                if (!res.ok || !res.body || res.body.error) {
                    var msg = res.body && res.body.error;
                    if (res.status === 401) {
                        login.hidden = false;
                        msg = 'Log in with Discord to use Account Checker.';
                    }
                    else if (res.status === 403 && msg === 'Free limit reached') msg = 'You\'ve reached the free limit of 3 lookups. Premium members have unlimited lookups.';
                    else if (res.status === 404) msg = 'User not found.';
                    else if (!msg || /500|failed/i.test(msg)) msg = 'Failed to fetch user.';
                    throw msg;
                }
                renderResult(res.body);
            })
            .catch(function (err) {
                resultEl.innerHTML = errorHTML(err || 'Failed to fetch user.');
            }).finally(function () { submit.disabled = false; });
    }

    /* ---------- Prefill from URL ---------- */
    function prefill() {
        var params = new URLSearchParams(location.search);
        var prefilled = params.get('userid') || params.get('id');
        if (prefilled && /^\d{17,20}$/.test(prefilled)) {
            input.value = prefilled;
            lookup(prefilled);
        }
    }

    /* ---------- Events ---------- */
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = (input.value || '').trim();
        if (!id) return;
        lookup(id);
    });

    Array.prototype.forEach.call(document.querySelectorAll('.hint-example'), function (el) {
        el.addEventListener('click', function () {
            input.value = el.getAttribute('data-id');
            form.dispatchEvent(new Event('submit'));
        });
    });

    prefill();
})();
