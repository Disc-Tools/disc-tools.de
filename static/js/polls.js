(function() {
    var state = {
        authenticated: false,
        sort: 'new',
        polls: [],
        loaded: false
    };

    var listEl = document.getElementById('poll-list');
    var loginHint = document.getElementById('login-hint');
    var sortTabs = document.getElementById('sort-tabs');
    var pollId = /^\/polls\/([A-Za-z0-9_-]{1,80})\/?$/.exec(window.location.pathname)?.[1];
    var loginUrl = 'https://disc-tools.de/api/auth/login?redirect=' + encodeURIComponent(pollId ? '/polls/' + pollId : '/polls/');

    if (pollId) {
        sortTabs.hidden = true;
        document.getElementById('poll-back').hidden = false;
        document.getElementById('poll-intro').hidden = true;
        loginHint.querySelector('a').href = loginUrl;
    }

    function visiblePolls(polls) {
        return pollId ? polls.filter(function(poll) { return String(poll.id) === pollId; }) : polls;
    }

    function escHtml(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function timeAgo(dateStr) {
        var diff = Date.now() - new Date(dateStr).getTime();
        var min = Math.floor(diff / 60000);
        if (min < 1) return 'just now';
        if (min < 60) return min + 'm ago';
        var h = Math.floor(min / 60);
        if (h < 24) return h + 'h ago';
        var d = Math.floor(h / 24);
        if (d < 30) return d + 'd ago';
        var mo = Math.floor(d / 30);
        if (mo < 12) return mo + 'mo ago';
        return Math.floor(mo / 12) + 'y ago';
    }

    function avatarHtml(userId, hash, name, cls) {
        var src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        if (/^[0-9]{17,20}$/.test(String(userId || '')) && /^[A-Za-z0-9_]+$/.test(String(hash || ''))) {
            var ext = hash.indexOf('a_') === 0 ? 'gif' : 'png';
            src = 'https://cdn.discordapp.com/avatars/' + encodeURIComponent(userId) + '/' + encodeURIComponent(hash) + '.' + ext + '?size=64';
        }
        var avatarId = /^[0-9]{17,20}$/.test(String(userId || '')) ? ' data-discord-avatar="' + userId + '"' : '';
        return '<img class="' + escHtml(cls) + '" src="' + escHtml(src) + '" alt="' + escHtml(name) + '" loading="lazy"' + avatarId + '>';
    }

    function renderCreateArea() {
        loginHint.hidden = state.authenticated;
    }

    function findPoll(id) {
        for (var i = 0; i < state.polls.length; i++) {
            if (String(state.polls[i].id) === String(id)) return state.polls[i];
        }
        return null;
    }

    function voteButtons(p) {
        var disabled = p.ended_at ? ' disabled' : '';
        return '<button class="vote-btn up' + (p.my_vote === 1 ? ' voted' : '') + '" data-vote="1" aria-label="Upvote"' + disabled + '><i class="fa-solid fa-arrow-up"></i></button>'
            + '<span class="vote-score">' + (Number(p.score) || 0) + '</span>'
            + '<button class="vote-btn down' + (p.my_vote === -1 ? ' voted' : '') + '" data-vote="-1" aria-label="Downvote"' + disabled + '><i class="fa-solid fa-arrow-down"></i></button>';
    }

    function yesNoButtons(p) {
        var yes = Math.max(0, Number(p.yes_votes) || 0);
        var no = Math.max(0, Number(p.no_votes) || 0);
        var total = yes + no;
        var yesPct = total ? Math.round(yes * 100 / total) : 0;
        var noPct = total ? 100 - yesPct : 0;
        var disabled = p.ended_at ? ' disabled' : '';
        return '<div class="yesno-group">' +
            '<button class="yesno-btn yes' + (p.my_vote === 1 ? ' voted' : '') + '" data-vote="1"' + disabled + '>' +
                '<span class="yesno-fill" style="width:' + yesPct + '%"></span>' +
                '<span class="yesno-text"><span>Yes</span><span class="yesno-meta">' + yes + ' · ' + yesPct + '%</span></span>' +
            '</button>' +
            '<button class="yesno-btn no' + (p.my_vote === -1 ? ' voted' : '') + '" data-vote="-1"' + disabled + '>' +
                '<span class="yesno-fill" style="width:' + noPct + '%"></span>' +
                '<span class="yesno-text"><span>No</span><span class="yesno-meta">' + no + ' · ' + noPct + '%</span></span>' +
            '</button>' +
        '</div>';
    }

    function voteArea(p) {
        return p.mode === 'yesno' ? yesNoButtons(p) : '<div class="vote-group">' + voteButtons(p) + '</div>';
    }

    function pollCardHtml(p) {
        var question = escHtml(p.question);
        var questionContent = pollId
            ? '<span class="poll-question-text">' + question + '</span>'
            : '<a class="poll-question-text" href="/polls/' + encodeURIComponent(p.id) + '">' + question + '</a>';
        return '<div class="poll-card" id="poll-' + escHtml(p.id) + '" data-id="' + escHtml(p.id) + '">' +
                '<div class="poll-head">' +
                    avatarHtml(p.user_id, p.avatar, p.username, 'poll-avatar') +
                    '<span class="poll-author">' + escHtml(p.username) + '</span>' +
                    '<span class="poll-time">' + timeAgo(p.created_at) + '</span>' +
                    (p.ended_at ? '<span class="poll-ended-badge">Ended</span>' : '') +
                '</div>' +
                '<h2 class="poll-question">' + questionContent + '</h2>' +
                (p.description ? '<div class="poll-description">' + escHtml(p.description) + '</div>' : '') +
                '<div class="poll-actions">' +
                    voteArea(p) +
                    '<button class="comment-toggle"><i class="fa-solid fa-message"></i> <span class="comment-count">' + (Number(p.comment_count) || 0) + '</span></button>' +
                '</div>' +
                '<div class="comments-section"></div>' +
            '</div>';
    }

    function renderList() {
        if (!state.loaded) return;
        if (state.polls.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-list-check"></i><p>' +
                (pollId ? 'This poll was not found.' : 'No polls yet.') + '</p></div>';
            return;
        }
        var html = '';
        for (var i = 0; i < state.polls.length; i++) {
            html += pollCardHtml(state.polls[i]);
        }
        listEl.innerHTML = html;
    }

    async function handleVote(card, value) {
        if (!state.authenticated) {
            window.location.href = loginUrl;
            return;
        }
        var id = card.getAttribute('data-id');
        var p = findPoll(id);
        if (!p || p.ended_at) return;

        var newValue = p.my_vote === value ? 0 : value;
        try {
            var res = await fetch('/api/polls/' + encodeURIComponent(id) + '/vote', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: newValue })
            });
            if (res.status === 401) { window.location.href = loginUrl; return; }
            if (res.status === 409) {
                p.ended_at = new Date().toISOString();
                updateCardFromPoll(card, p);
                return;
            }
            if (!res.ok) return;
            var data = await res.json();
            p.score = data.score;
            p.yes_votes = data.yes_votes;
            p.no_votes = data.no_votes;
            p.my_vote = data.my_vote;
            updateCardFromPoll(card, p);
        } catch (e) {}
    }

    function commentHtml(c) {
        return '<div class="comment">' +
            avatarHtml(c.user_id, c.avatar, c.username, 'comment-avatar') +
            '<div class="comment-body">' +
                '<div class="comment-meta"><b>' + escHtml(c.username) + '</b> · ' + timeAgo(c.created_at) + '</div>' +
                '<div class="comment-content">' + escHtml(c.content) + '</div>' +
            '</div>' +
        '</div>';
    }

    async function loadComments(section, id) {
        section.innerHTML = '<div class="comments-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';
        try {
            var res = await fetch('/api/polls/' + encodeURIComponent(id) + '/comments', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load comments');
            var data = await res.json();
            var html = '';
            if (!data.comments || data.comments.length === 0) {
                html += '<div class="no-comments">No comments yet.</div>';
            } else {
                for (var i = 0; i < data.comments.length; i++) html += commentHtml(data.comments[i]);
            }
            if (state.authenticated) {
                html += '<form class="comment-form">' +
                    '<textarea maxlength="500" placeholder="Write a comment…" required></textarea>' +
                    '<button type="submit" class="poll-submit" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>' +
                '</form>';
            }
            section.innerHTML = html;
            section.dataset.ids = (data.comments || []).map(function(c) { return c.id; }).join(',');

            var form = section.querySelector('.comment-form');
            if (form) {
                form.addEventListener('submit', async function(ev) {
                    ev.preventDefault();
                    var ta = form.querySelector('textarea');
                    var content = ta.value.trim();
                    if (!content) return;
                    var sendBtn = form.querySelector('button');
                    sendBtn.disabled = true;
                    try {
                        var r = await fetch('/api/polls/' + encodeURIComponent(id) + '/comments', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: content })
                        });
                        if (r.status === 401) { window.location.href = loginUrl; return; }
                        var d = await r.json();
                        if (r.ok && d.comment) {
                            var noComments = section.querySelector('.no-comments');
                            if (noComments) noComments.remove();
                            section.insertAdjacentHTML('afterbegin', commentHtml(d.comment));
                            ta.value = '';
                            var p = findPoll(id);
                            if (p) {
                                p.comment_count = (Number(p.comment_count) || 0) + 1;
                                var card = section.closest('.poll-card');
                                var cnt = card.querySelector('.comment-count');
                                if (cnt) cnt.textContent = p.comment_count;
                            }
                        }
                    } catch (e) {} finally {
                        sendBtn.disabled = false;
                    }
                });
            }
        } catch (e) {
            section.innerHTML = '<div class="no-comments">Failed to load comments.</div>';
        }
    }

    var REFRESH_MS = 6000;
    var refreshTimer = null;

    function updateCardFromPoll(card, p) {
        var group = card.querySelector('.vote-group, .yesno-group');
        if (group) group.outerHTML = voteArea(p);
        var badge = card.querySelector('.poll-ended-badge');
        if (p.ended_at && !badge) {
            var time = card.querySelector('.poll-time');
            if (time) time.insertAdjacentHTML('afterend', '<span class="poll-ended-badge">Ended</span>');
        } else if (!p.ended_at && badge) {
            badge.remove();
        }
        var cnt = card.querySelector('.comment-count');
        if (cnt) cnt.textContent = p.comment_count;
    }

    async function appendNewComments(section, id) {
        try {
            var res = await fetch('/api/polls/' + encodeURIComponent(id) + '/comments', { credentials: 'include' });
            if (!res.ok) return;
            var data = await res.json();
            var comments = data.comments || [];
            var have = {};
            (section.dataset.ids || '').split(',').forEach(function(x) { if (x) have[x] = true; });
            var added = false;
            for (var i = 0; i < comments.length; i++) {
                if (have[comments[i].id]) continue;
                have[comments[i].id] = true;
                var form = section.querySelector('.comment-form');
                var html = commentHtml(comments[i]);
                if (form) form.insertAdjacentHTML('beforebegin', html);
                else section.insertAdjacentHTML('beforeend', html);
                added = true;
            }
            if (added) {
                var noComments = section.querySelector('.no-comments');
                if (noComments) noComments.remove();
                section.dataset.ids = Object.keys(have).join(',');
            }
        } catch (e) {}
    }

    async function refreshLive() {
        if (document.hidden || !state.loaded || document.activeElement && document.activeElement.closest && document.activeElement.closest('.comments-section, .poll-create')) return;
        try {
            var res = await fetch('/api/polls?sort=' + state.sort, { credentials: 'include' });
            if (!res.ok) return;
            var data = await res.json();
            var fresh = visiblePolls(data.polls || []);
            var seen = new Set();
            for (var i = 0; i < fresh.length; i++) {
                var p = fresh[i];
                seen.add(p.id);
                var existing = findPoll(p.id);
                if (existing) {
                    var votesChanged = existing.score !== p.score || existing.my_vote !== p.my_vote ||
                        existing.yes_votes !== p.yes_votes || existing.no_votes !== p.no_votes ||
                        existing.mode !== p.mode || existing.ended_at !== p.ended_at;
                    var commentsChanged = existing.comment_count !== p.comment_count;
                    existing.score = p.score;
                    existing.my_vote = p.my_vote;
                    existing.yes_votes = p.yes_votes;
                    existing.no_votes = p.no_votes;
                    existing.mode = p.mode;
                    existing.ended_at = p.ended_at;
                    existing.username = p.username;
                    existing.avatar = p.avatar;
                    if (votesChanged || commentsChanged || existing.question !== p.question || existing.description !== p.description) {
                        existing.question = p.question;
                        existing.description = p.description;
                        var card = document.getElementById('poll-' + p.id);
                        if (card) {
                            updateCardFromPoll(card, existing);
                            var q = card.querySelector('.poll-question-text');
                            if (q) q.textContent = existing.question;
                            var d = card.querySelector('.poll-description');
                            if (d && existing.description) d.innerHTML = escHtml(existing.description);
                        }
                    }
                    if (commentsChanged) {
                        var card2 = document.getElementById('poll-' + p.id);
                        if (card2) {
                            var section = card2.querySelector('.comments-section');
                            if (section && section.classList.contains('open') && section.dataset.loaded) {
                                appendNewComments(section, p.id);
                            }
                        }
                    }
                } else {
                    state.polls.unshift(p);
                    var empty = listEl.querySelector('.empty-state');
                    if (empty) empty.remove();
                    listEl.insertAdjacentHTML('afterbegin', pollCardHtml(p));
                    var newCard = document.getElementById('poll-' + p.id);
                    if (newCard) {
                        newCard.classList.add('fresh');
                        setTimeout(function(el) { return function() { el.classList.remove('fresh'); }; }(newCard), 500);
                    }
                }
            }
            for (var j = state.polls.length - 1; j >= 0; j--) {
                if (!seen.has(state.polls[j].id)) {
                    var el = document.getElementById('poll-' + state.polls[j].id);
                    if (el) el.remove();
                    state.polls.splice(j, 1);
                    if (state.polls.length === 0) renderList();
                }
            }
        } catch (e) {}
    }

    function startLiveRefresh() {
        if (refreshTimer) return;
        refreshTimer = setInterval(refreshLive, REFRESH_MS);
    }

    listEl.addEventListener('click', function(ev) {
        var card = ev.target.closest('.poll-card');
        if (!card) return;
        var voteBtn = ev.target.closest('[data-vote]');
        if (voteBtn) return handleVote(card, Number(voteBtn.getAttribute('data-vote')));

        var toggle = ev.target.closest('.comment-toggle');
        if (toggle) {
            var section = card.querySelector('.comments-section');
            var open = section.classList.toggle('open');
            if (open && !section.dataset.loaded) {
                section.dataset.loaded = '1';
                loadComments(section, card.getAttribute('data-id'));
            }
        }
    });

    sortTabs.addEventListener('click', function(ev) {
        var tab = ev.target.closest('.sort-tab');
        if (!tab) return;
        var sort = tab.getAttribute('data-sort');
        if (sort === state.sort) return;
        state.sort = sort;
        this.querySelectorAll('.sort-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        loadPolls();
    });

    async function loadPolls() {
        try {
            var res = await fetch('/api/polls?sort=' + state.sort, { credentials: 'include' });
            if (!res.ok) throw new Error('Could not load polls');
            var data = await res.json();
            state.authenticated = data.authenticated === true;
            renderCreateArea();
            state.polls = visiblePolls(data.polls || []);
            if (pollId && state.polls.length) document.title = state.polls[0].question + ' | Disc-Tools';
            state.loaded = true;
            renderList();
        } catch (e) {
            listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load polls. Please try again later.</p></div>';
        } finally {
            listEl.setAttribute('aria-busy', 'false');
        }
    }

    loadPolls().then(startLiveRefresh);
})();
