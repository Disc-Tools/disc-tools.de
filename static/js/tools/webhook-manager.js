/* Disc-Tools: Webhook Manager — inspect, use and delete Discord webhooks */
(function () {
    'use strict';

    var form = document.getElementById('wm-form');
    var input = document.getElementById('wm-url');
    var revealBtn = document.getElementById('wm-reveal');
    var loadBtn = document.getElementById('wm-load');
    var resultEl = document.getElementById('wm-result');

    var state = {
        url: '',
        webhook: null,
        sending: false,
        deleting: false
    };

    /* ---------- Helpers ---------- */
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function loadingHTML(msg) {
        return '<div class="lookup-loading"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>' + esc(msg) + '</div>';
    }

    function errorHTML(msg) {
        return '<div class="lookup-error"><i class="fa-solid fa-circle-exclamation"></i><p>' + esc(msg) + '</p></div>';
    }

    function api(path, payload) {
        return fetch('/api/webhook-manager/' + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
        }).then(function (r) {
            var ct = r.headers.get('content-type') || '';
            if (ct.indexOf('application/json') === -1) {
                throw new Error('Unexpected server response (HTTP ' + r.status + ').');
            }
            return r.json().then(function (body) {
                return { ok: r.ok, status: r.status, body: body };
            });
        }).then(function (res) {
            if (!res.ok) {
                var err = new Error((res.body && (res.body.detail || res.body.error)) || 'Request failed.');
                err.status = res.status;
                err.retryAfter = res.body && res.body.retryAfterSeconds;
                throw err;
            }
            return res.body || {};
        });
    }

    function normalizeUrl(raw) {
        var value = String(raw || '').trim();
        if (!value) return '';
        if (/^http:\/\//i.test(value)) value = value.replace(/^http:\/\//i, 'https://');
        if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
        return value;
    }

    function looksLikeWebhookUrl(value) {
        return /^https?:\/\/(?:canary\.|ptb\.)?(?:discord\.com|discordapp\.com)\/api\/(?:v\d+\/)?webhooks\/\d{17,20}\/[A-Za-z0-9_.-]{20,200}\/?(?:\?.*)?$/i.test(value);
    }

    function avatarUrl(webhook) {
        if (!webhook.avatar) return null;
        var ext = webhook.avatar.indexOf('a_') === 0 ? 'gif' : 'png';
        return 'https://cdn.discordapp.com/avatars/' + encodeURIComponent(webhook.id) + '/' +
            encodeURIComponent(webhook.avatar) + '.' + ext + '?size=128';
    }

    function feedback(el, msg, type) {
        if (!el) return;
        el.className = 'wm-feedback ' + (type === 'ok' ? 'is-ok' : 'is-error');
        el.innerHTML = '<i class="fa-solid ' + (type === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation') +
            '" aria-hidden="true"></i> ' + esc(msg);
    }

    function setLoading(btn, loading, label) {
        if (!btn) return;
        if (loading) {
            btn.dataset.label = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> ' + esc(label);
        } else {
            btn.disabled = false;
            if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
        }
    }

    /* ---------- Render ---------- */
    function renderWebhook(webhook) {
        var avatar = avatarUrl(webhook);
        var avatarHTML = avatar
            ? '<img class="wm-webhook-avatar" src="' + esc(avatar) + '" alt="" loading="lazy">'
            : '<div class="wm-webhook-avatar wm-webhook-avatar-fallback"><i class="fa-solid fa-robot" aria-hidden="true"></i></div>';

        var ids = '';
        if (webhook.channel_id) {
            ids += '<span><i class="fa-solid fa-hashtag" aria-hidden="true"></i> Channel <code>' + esc(webhook.channel_id) + '</code></span>';
        }
        if (webhook.guild_id) {
            ids += '<span><i class="fa-solid fa-server" aria-hidden="true"></i> Server <code>' + esc(webhook.guild_id) + '</code></span>';
        }
        if (webhook.application_id) {
            ids += '<span><i class="fa-solid fa-plug" aria-hidden="true"></i> App <code>' + esc(webhook.application_id) + '</code></span>';
        }

        resultEl.innerHTML =
            '<div class="wm-card wm-card-in">' +
                '<div class="wm-webhook-head">' +
                    avatarHTML +
                    '<div class="wm-webhook-info">' +
                        '<h2 class="wm-webhook-name">' + esc(webhook.name || 'Unnamed webhook') +
                            '<span class="wm-live-tag"><i class="fa-solid fa-circle" aria-hidden="true"></i> Live</span>' +
                        '</h2>' +
                        '<p class="wm-webhook-meta">Webhook ID <code>' + esc(webhook.id) + '</code></p>' +
                        (ids ? '<div class="wm-webhook-ids">' + ids + '</div>' : '') +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<form class="wm-card wm-card-in" id="wm-send-form" novalidate>' +
                '<h2 class="wm-card-title"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Send a message</h2>' +
                '<div class="wm-field">' +
                    '<label for="wm-content">Message</label>' +
                    '<textarea id="wm-content" maxlength="2000" rows="4" placeholder="Type your message…"></textarea>' +
                    '<span class="wm-counter" id="wm-counter">0 / 2000</span>' +
                '</div>' +
                '<div class="wm-grid">' +
                    '<div class="wm-field">' +
                        '<label for="wm-username">Display name (optional)</label>' +
                        '<input type="text" id="wm-username" maxlength="80" placeholder="Overrides the webhook name" autocomplete="off">' +
                    '</div>' +
                    '<div class="wm-field">' +
                        '<label for="wm-avatar">Avatar URL (optional)</label>' +
                        '<input type="url" id="wm-avatar" placeholder="https://example.com/avatar.png" autocomplete="off" spellcheck="false">' +
                    '</div>' +
                '</div>' +
                '<details class="wm-advanced">' +
                    '<summary>Advanced options</summary>' +
                    '<div class="wm-advanced-body">' +
                        '<div class="wm-field">' +
                            '<label for="wm-embeds">Embeds (JSON, optional)</label>' +
                            '<textarea id="wm-embeds" class="wm-mono" rows="4" spellcheck="false" placeholder=\'[{"title":"Hello","description":"Sent with Disc-Tools","color":5793266}]\'></textarea>' +
                        '</div>' +
                        '<label class="wm-check"><input type="checkbox" id="wm-tts"> Send as text-to-speech message</label>' +
                    '</div>' +
                '</details>' +
                '<div class="wm-actions">' +
                    '<button type="submit" class="btn btn-primary" id="wm-send"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Send message</button>' +
                    '<span class="wm-feedback" id="wm-send-feedback" role="status"></span>' +
                '</div>' +
            '</form>' +

            '<div class="wm-card wm-card-in wm-danger-card">' +
                '<h2 class="wm-card-title"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Delete webhook</h2>' +
                '<p>Deleting a webhook removes it permanently from its channel. Any integrations still posting to this URL will stop working.</p>' +
                '<button type="button" class="btn wm-btn-danger" id="wm-delete-start"><i class="fa-solid fa-trash" aria-hidden="true"></i> Delete webhook</button>' +
                '<div class="wm-delete-confirm" id="wm-delete-confirm" hidden>' +
                    '<p>Are you sure you want to delete <strong>' + esc(webhook.name || 'this webhook') + '</strong>?</p>' +
                    '<button type="button" class="btn wm-btn-danger" id="wm-delete"><i class="fa-solid fa-trash" aria-hidden="true"></i> Yes, delete permanently</button>' +
                    '<button type="button" class="btn btn-ghost" id="wm-delete-cancel">Cancel</button>' +
                '</div>' +
                '<span class="wm-feedback" id="wm-delete-feedback" role="status"></span>' +
            '</div>';

        bindComposer(webhook);
    }

    function bindComposer(webhook) {
        var sendForm = document.getElementById('wm-send-form');
        var content = document.getElementById('wm-content');
        var counter = document.getElementById('wm-counter');
        var sendBtn = document.getElementById('wm-send');
        var sendFeedback = document.getElementById('wm-send-feedback');
        var embeds = document.getElementById('wm-embeds');
        var deleteStart = document.getElementById('wm-delete-start');
        var deleteConfirm = document.getElementById('wm-delete-confirm');
        var deleteBtn = document.getElementById('wm-delete');
        var deleteCancel = document.getElementById('wm-delete-cancel');
        var deleteFeedback = document.getElementById('wm-delete-feedback');

        function updateCounter() {
            var len = content.value.length;
            counter.textContent = len + ' / 2000';
            counter.classList.toggle('is-near', len >= 1800 && len < 2000);
            counter.classList.toggle('is-full', len >= 2000);
        }
        content.addEventListener('input', updateCounter);
        updateCounter();

        sendForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (state.sending) return;

            var text = content.value;
            var username = document.getElementById('wm-username').value.trim();
            var avatar = document.getElementById('wm-avatar').value.trim();
            var tts = document.getElementById('wm-tts').checked;
            var embedValue = embeds.value.trim();
            var parsedEmbeds;

            if (!text.trim() && !embedValue) {
                feedback(sendFeedback, 'Enter a message or an embed before sending.', 'error');
                content.focus();
                return;
            }

            if (embedValue) {
                try {
                    parsedEmbeds = JSON.parse(embedValue);
                } catch (err) {
                    feedback(sendFeedback, 'Embeds must be valid JSON.', 'error');
                    embeds.focus();
                    return;
                }
                if (parsedEmbeds && !Array.isArray(parsedEmbeds) && typeof parsedEmbeds === 'object') {
                    parsedEmbeds = [parsedEmbeds];
                }
                if (!Array.isArray(parsedEmbeds)) {
                    feedback(sendFeedback, 'Embeds must be a JSON object or an array of objects.', 'error');
                    embeds.focus();
                    return;
                }
            }

            if (username.length > 80) {
                feedback(sendFeedback, 'The display name is limited to 80 characters.', 'error');
                return;
            }

            state.sending = true;
            setLoading(sendBtn, true, 'Sending…');
            sendFeedback.className = 'wm-feedback';
            sendFeedback.textContent = '';

            api('send', {
                url: state.url,
                content: text,
                username: username,
                avatar_url: avatar,
                tts: tts,
                embeds: parsedEmbeds
            }).then(function (res) {
                var msg = 'Message sent.';
                if (res.message && res.message.id) msg = 'Message sent (ID ' + res.message.id + ').';
                feedback(sendFeedback, msg, 'ok');
                content.value = '';
                embeds.value = '';
                updateCounter();
            }).catch(function (err) {
                var msg = err.message || 'Failed to send message.';
                if (err.status === 429 && err.retryAfter) {
                    msg += ' Try again in ' + err.retryAfter + 's.';
                }
                feedback(sendFeedback, msg, 'error');
            }).then(function () {
                state.sending = false;
                setLoading(sendBtn, false);
            });
        });

        deleteStart.addEventListener('click', function () {
            deleteStart.hidden = true;
            deleteConfirm.hidden = false;
            deleteBtn.focus();
        });

        deleteCancel.addEventListener('click', function () {
            deleteConfirm.hidden = true;
            deleteStart.hidden = false;
            deleteStart.focus();
        });

        deleteBtn.addEventListener('click', function () {
            if (state.deleting) return;
            state.deleting = true;
            setLoading(deleteBtn, true, 'Deleting…');
            deleteFeedback.className = 'wm-feedback';
            deleteFeedback.textContent = '';

            api('delete', { url: state.url }).then(function (res) {
                resultEl.innerHTML =
                    '<div class="wm-deleted wm-card-in">' +
                        '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>' +
                        '<h2>Webhook deleted</h2>' +
                        '<p>' + esc(res.alreadyDeleted
                            ? 'This webhook was already gone — it no longer posts to the channel.'
                            : 'The webhook was permanently removed from its channel.') + '</p>' +
                        '<button type="button" class="btn btn-ghost" id="wm-reset"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Load another webhook</button>' +
                    '</div>';

                var reset = document.getElementById('wm-reset');
                reset.addEventListener('click', function () {
                    input.value = '';
                    state.url = '';
                    state.webhook = null;
                    resultEl.innerHTML = '';
                    input.focus();
                });
            }).catch(function (err) {
                var msg = err.message || 'Failed to delete webhook.';
                if (err.status === 429 && err.retryAfter) {
                    msg += ' Try again in ' + err.retryAfter + 's.';
                }
                feedback(deleteFeedback, msg, 'error');
                state.deleting = false;
                setLoading(deleteBtn, false);
            });
        });
    }

    /* ---------- Load ---------- */
    function load(raw) {
        var value = normalizeUrl(raw);

        if (!value) {
            resultEl.innerHTML = errorHTML('Paste a Discord webhook URL to continue.');
            input.focus();
            return;
        }

        if (!looksLikeWebhookUrl(value)) {
            resultEl.innerHTML = errorHTML('That doesn\'t look like a Discord webhook URL. It should look like https://discord.com/api/webhooks/123456789012345678/…');
            input.focus();
            return;
        }

        state.url = value;
        state.webhook = null;
        resultEl.innerHTML = loadingHTML('Loading webhook from Discord…');
        setLoading(loadBtn, true, 'Loading…');

        api('info', { url: value }).then(function (body) {
            if (!body.webhook) throw new Error('Discord returned no webhook data.');
            state.webhook = body.webhook;
            renderWebhook(body.webhook);
        }).catch(function (err) {
            var msg = err.message || 'Failed to load webhook.';
            if (err.status === 429 && err.retryAfter) {
                msg += ' Try again in ' + err.retryAfter + 's.';
            }
            resultEl.innerHTML = errorHTML(msg);
        }).then(function () {
            setLoading(loadBtn, false);
        });
    }

    /* ---------- Events ---------- */
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (loadBtn.disabled) return;
            load(input.value);
        });
    }

    if (revealBtn && input) {
        revealBtn.addEventListener('click', function () {
            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            revealBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
            revealBtn.setAttribute('aria-label', show ? 'Hide webhook URL' : 'Show webhook URL');
            revealBtn.innerHTML = '<i class="fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye') + '" aria-hidden="true"></i>';
        });
    }
})();
