/* Disc-Tools: Username History — premium-only username change lookup */
(function () {
    'use strict';

    var form = document.getElementById('history-form');
    var input = document.getElementById('history-input');
    var submitBtn = document.getElementById('history-submit');
    var resultEl = document.getElementById('result');
    var gateEl = document.getElementById('gate');

    var isUnlocked = false;

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function fmtDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return 'Unknown';
        return d.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function renderGate(reason, data) {
        var icon, title, msg, btn, secondary;

        form.hidden = true;
        gateEl.hidden = false;
        isUnlocked = false;

        if (reason !== 'error' && (reason === 'login_required' || !data.isLoggedIn)) {
            icon = 'fa-right-to-bracket';
            title = 'Login required';
            msg = 'Log in with Discord and upgrade to <strong>Premium</strong> to look up username histories.';
            btn = '<a href="https://disc-tools.de/api/auth/login?redirect=/tools/username-history/" class="button button-primary"><i class="fa-brands fa-discord"></i> Login with Discord</a>';
            secondary = '<a href="https://dash.disc-tools.de/premium" rel="noopener">Learn about Premium &rarr;</a>';
        } else if (reason === 'optout' || data.optedOut) {
            icon = 'fa-eye-slash';
            title = 'You\'ve opted out';
            msg = 'You opted out of username history lookups via your dashboard settings. Opt back in to use this tool.<br><br>Your history is <strong>still being recorded</strong> while opted out — only lookups are hidden.';
            btn = '<a href="https://dash.disc-tools.de/profile/settings" class="button button-primary" rel="noopener"><i class="fa-solid fa-gear"></i> Go to Settings</a>';
            secondary = '';
        } else if (reason === 'premium_required') {
            icon = 'fa-crown';
            title = 'Premium feature';
            msg = 'Username History is exclusive to <strong>Premium</strong> members. Upgrade to unlock lookups of recorded username changes.';
            btn = '<a href="https://dash.disc-tools.de/premium" class="button button-primary" rel="noopener"><i class="fa-solid fa-crown"></i> Get Premium</a>';
            secondary = '<a href="https://disc-tools.de/api/auth/login?redirect=/tools/username-history/">Already have Premium? Login &rarr;</a>';
        } else {
            icon = 'fa-circle-exclamation';
            title = 'Access denied';
            msg = 'You cannot use this tool at this time.';
            btn = '';
            secondary = '';
        }

        gateEl.innerHTML =
            '<div class="uh-gate-card">' +
                '<div class="uh-gate-icon-wrap"><i class="fa-solid ' + icon + '"></i></div>' +
                '<h2>' + esc(title) + '</h2>' +
                '<p>' + msg + '</p>' +
                (btn ? btn : '') +
                (secondary ? '<span class="uh-gate-secondary">' + secondary + '</span>' : '') +
            '</div>';
    }

    function checkEligibility() {
        gateEl.innerHTML =
            '<div class="uh-gate-card">' +
                '<div class="uh-gate-icon-wrap"><i class="fa-solid fa-spinner fa-spin"></i></div>' +
                '<h2>Checking access...</h2>' +
            '</div>';

        fetch('/api/username-history/eligibility', { credentials: 'include' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.eligible) {
                    gateEl.innerHTML = '';
                    gateEl.hidden = true;
                    isUnlocked = true;
                    form.hidden = false;

                    var params = new URLSearchParams(location.search);
                    var prefilled = params.get('userid') || params.get('id');
                    if (prefilled && /^\d{17,20}$/.test(prefilled)) {
                        input.value = prefilled;
                        search(prefilled);
                    }
                    return;
                }
                isUnlocked = false;
                renderGate(data.reason, data);
            })
            .catch(function () {
                renderGate('error', { isLoggedIn: false });
            });
    }

    function uniqueChanges(entries) {
        return entries.filter(function (entry, index) {
            var previous = entries[index - 1];
            if (!previous || entry.old_username !== previous.old_username ||
                entry.new_username !== previous.new_username) return true;

            // Group consecutive copies of the same transition recorded in the same minute.
            var minute = Math.floor(Date.parse(entry.changed_at) / 60000);
            var previousMinute = Math.floor(Date.parse(previous.changed_at) / 60000);
            return minute !== previousMinute;
        });
    }

    function renderHistory(data, id) {
        if (data.optedOut) {
            resultEl.innerHTML = '<div class="lookup-error"><i class="fa-solid fa-eye-slash"></i><p>This user has opted out of username history lookups.</p></div>';
            return;
        }

        var INITIAL_SHOW = 3;
        var history = uniqueChanges(data.history || []);
        var html = '';

        html += '<p class="lookup-hint">Discord user ID <a href="https://discord.com/users/' +
            encodeURIComponent(id) + '">' + esc(id) + '</a></p>';

        if (!history.length) {
            html += '<div class="lookup-error"><i class="fa-solid fa-circle-info"></i><p>No username changes found for this user. Either they have never changed their username, or tracking started after their last change.</p></div>';
            resultEl.innerHTML = html;
            return;
        }

        html += '<section class="uh-card" aria-labelledby="uh-result-title">';
        html += '<header class="uh-card-header"><h2 id="uh-result-title">Recorded changes</h2>' +
            '<span>' + history.length + (history.length === 1 ? ' entry' : ' entries') + '</span></header>';
        html += '<ol class="uh-timeline" id="uh-timeline">';

        history.forEach(function (entry, i) {
            var isLatest = i === 0;
            var hidden = i >= INITIAL_SHOW;
            html += '<li class="uh-timeline-item' + (isLatest ? ' uh-timeline-latest' : '') + (hidden ? ' uh-timeline-hidden' : '') + '">' +
                '<div><span class="uh-entry-label">Previous username</span><span class="uh-name-old">' + esc(entry.old_username) + '</span></div>' +
                '<div><span class="uh-entry-label">New username</span><span class="uh-name-new">' + esc(entry.new_username) + '</span></div>' +
                '<div><span class="uh-entry-label">' + (isLatest ? 'Latest recorded change' : 'Changed on') + '</span>' +
                '<span class="uh-timeline-date">' + esc(fmtDate(entry.changed_at)) + '</span></div></li>';
        });

        html += '</ol>';

        if (history.length > INITIAL_SHOW) {
            html += '<button class="uh-show-more" id="uh-show-more" type="button"><i class="fa-solid fa-chevron-down"></i> Show ' + (history.length - INITIAL_SHOW) + ' more</button>';
            html += '<button class="uh-show-less" id="uh-show-less" type="button" hidden><i class="fa-solid fa-chevron-up"></i> Show less</button>';
        }

        html += '</section>';

        resultEl.innerHTML = html;

        var showMoreBtn = resultEl.querySelector('#uh-show-more');
        var showLessBtn = resultEl.querySelector('#uh-show-less');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', function () {
                Array.prototype.forEach.call(resultEl.querySelectorAll('.uh-timeline-hidden'), function (el) {
                    el.classList.remove('uh-timeline-hidden');
                    el.classList.add('uh-timeline-revealed');
                });
                showMoreBtn.hidden = true;
                showLessBtn.hidden = false;
            });
        }
        if (showLessBtn) {
            showLessBtn.addEventListener('click', function () {
                Array.prototype.forEach.call(resultEl.querySelectorAll('.uh-timeline-revealed'), function (el) {
                    el.classList.add('uh-timeline-hidden');
                    el.classList.remove('uh-timeline-revealed');
                });
                showLessBtn.hidden = true;
                showMoreBtn.hidden = false;
                resultEl.querySelector('#uh-timeline').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }

        var card = resultEl.querySelector('.uh-card');
        if (card) card.classList.add('result-card-in');
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function search(id) {
        if (!/^\d{17,20}$/.test(id)) {
            resultEl.innerHTML = '<div class="lookup-error"><i class="fa-solid fa-circle-exclamation"></i><p>That doesn\'t look like a valid Discord user ID. IDs are 17-20 digits long.</p></div>';
            return;
        }

        history.replaceState(null, '', '/tools/username-history/?userid=' + id);
        resultEl.innerHTML = '<div class="lookup-loading"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Fetching history...</div>';

        submitBtn.disabled = true;
        fetch('/api/username-history/' + encodeURIComponent(id), { cache: 'no-store' })
            .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
            .then(function (res) {
            if (!res.ok || !res.body || res.body.error) {
                if (res.body && res.body.reason === 'premium_required') {
                    renderGate('premium_required', { isLoggedIn: true });
                    resultEl.innerHTML = '';
                    return;
                }
                if (res.body && res.body.reason === 'login_required') {
                    renderGate('login_required', { isLoggedIn: false });
                    resultEl.innerHTML = '';
                    return;
                }
                if (res.body && res.body.reason === 'optout') {
                    renderGate('optout', { isLoggedIn: true, optedOut: true });
                    resultEl.innerHTML = '';
                    return;
                }
                throw (res.body && res.body.error) || 'Failed to fetch history.';
            }
            renderHistory(res.body, id);
        })
            .catch(function (err) {
                resultEl.innerHTML = '<div class="lookup-error"><i class="fa-solid fa-circle-exclamation"></i><p>' + esc(err || 'Failed to fetch history.') + '</p></div>';
            }).finally(function () { submitBtn.disabled = false; });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!isUnlocked || submitBtn.disabled) return;
        var id = (input.value || '').trim();
        if (!id) return;
        search(id);
    });

    Array.prototype.forEach.call(document.querySelectorAll('.hint-example'), function (el) {
        el.addEventListener('click', function () {
            if (!isUnlocked || submitBtn.disabled) return;
            input.value = el.getAttribute('data-id');
            form.dispatchEvent(new Event('submit'));
        });
    });

    function loadStats() {
        var trackedEl = document.getElementById('uh-tracked-count');
        var changesEl = document.getElementById('uh-changes-count');
        if (!trackedEl && !changesEl) return;
        fetch('/api/username-history/stats', { credentials: 'omit' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data) return;
                if (trackedEl && Number.isSafeInteger(data.tracked_users) && data.tracked_users >= 0) {
                    animateStat(trackedEl, data.tracked_users, 950);
                }
                if (changesEl && Number.isSafeInteger(data.total_changes) && data.total_changes >= 0) {
                    animateStat(changesEl, data.total_changes, 1250);
                }
            })
            .catch(function () { /* keep placeholder */ });
    }

    checkEligibility();
    loadStats();
})();
