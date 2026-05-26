(function() {
    const $ = id => document.getElementById(id);
    const fields = [];
    let currentTab = 'embed';

    const els = {
        authorName: $('author-name'),
        authorIcon: $('author-icon'),
        authorUrl: $('author-url'),
        title: $('embed-title'),
        titleUrl: $('title-url'),
        description: $('embed-description'),
        color: $('embed-color'),
        colorPicker: $('color-picker'),
        image: $('embed-image'),
        thumbnail: $('embed-thumbnail'),
        footerText: $('footer-text'),
        footerIcon: $('footer-icon'),
        timestampToggle: $('timestamp-toggle'),
        fieldsList: $('fields-list'),
        jsonDisplay: $('json-output-display'),
        colorBar: $('embed-color-bar'),
        previewAuthorArea: $('embed-author-area'),
        previewAuthorIcon: $('preview-author-icon'),
        previewAuthorName: $('preview-author-name'),
        previewTitleArea: $('embed-title-area'),
        previewTitleUrl: $('title-url'),
        previewDescriptionArea: $('embed-description-area'),
        previewFieldsArea: $('embed-fields-area'),
        previewImageArea: $('embed-image-area'),
        previewImage: $('preview-image'),
        previewThumbnail: $('preview-thumbnail'),
        previewFooterArea: $('embed-footer-area'),
        previewFooterIcon: $('preview-footer-icon'),
        previewFooterText: $('preview-footer-text'),
        previewTimestamp: $('preview-timestamp'),
        toast: $('toast-message'),
        toastText: $('toast-text'),
        webhookUrlRow: $('webhook-url-row'),
        webhookUrl: $('webhook-url'),
    };

    function getEmbed() {
        const embed = {};
        const authorName = els.authorName.value.trim();
        const authorIcon = els.authorIcon.value.trim();
        const authorUrl = els.authorUrl.value.trim();
        if (authorName || authorIcon || authorUrl) {
            embed.author = {};
            if (authorName) embed.author.name = authorName;
            if (authorIcon) embed.author.icon_url = authorIcon;
            if (authorUrl) embed.author.url = authorUrl;
        }

        const title = els.title.value.trim();
        const titleUrl = els.titleUrl.value.trim();
        if (title) {
            embed.title = title;
            if (titleUrl) embed.url = titleUrl;
        }

        const desc = els.description.value.trim();
        if (desc) embed.description = desc;

        const colorHex = els.color.value.trim().replace('#', '');
        if (/^[0-9A-Fa-f]{6}$/.test(colorHex)) {
            embed.color = parseInt(colorHex, 16);
        }

        const filtered = fields.filter(f => f.name.value.trim() || f.value.value.trim());
        if (filtered.length > 0) {
            embed.fields = filtered.map(f => ({
                name: f.name.value.trim() || '\u200b',
                value: f.value.value.trim() || '\u200b',
                inline: f.inline.checked
            }));
        }

        const imageUrl = els.image.value.trim();
        if (imageUrl) embed.image = { url: imageUrl };

        const thumbUrl = els.thumbnail.value.trim();
        if (thumbUrl) embed.thumbnail = { url: thumbUrl };

        const footerText = els.footerText.value.trim();
        const footerIcon = els.footerIcon.value.trim();
        if (footerText || footerIcon) {
            embed.footer = {};
            if (footerText) embed.footer.text = footerText;
            if (footerIcon) embed.footer.icon_url = footerIcon;
        }

        if (els.timestampToggle.checked) {
            embed.timestamp = new Date().toISOString();
        }

        return embed;
    }

    function getWebhookPayload() {
        const embed = getEmbed();
        const hasContent = Object.keys(embed).length > 0;
        const payload = {};
        if (hasContent) payload.embeds = [embed];
        const authorName = els.authorName.value.trim();
        if (authorName) {
            payload.username = authorName;
            const authorIcon = els.authorIcon.value.trim();
            if (authorIcon) payload.avatar_url = authorIcon;
        }
        return payload;
    }

    function updatePreview() {
        const embed = getEmbed();

        const hasMeaningfulContent = !!(embed.author || embed.title || embed.description || (embed.fields && embed.fields.length) || embed.image || embed.thumbnail || (embed.footer && embed.footer.text));
        const placeholder = document.getElementById('embed-placeholder');
        if (placeholder) {
            placeholder.style.display = hasMeaningfulContent ? 'none' : 'block';
        }

        const colorHex = els.color.value.trim();
        els.colorBar.style.background = /^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : '#5865F2';

        // Author
        if (embed.author && embed.author.name) {
            els.previewAuthorName.innerHTML = embed.author.url
                ? `<a href="${escapeHtml(embed.author.url)}" target="_blank" rel="noopener">${escapeHtml(embed.author.name)}</a>`
                : escapeHtml(embed.author.name);
            if (embed.author.icon_url) {
                els.previewAuthorIcon.src = embed.author.icon_url;
                els.previewAuthorIcon.style.display = 'block';
                els.previewAuthorIcon.onerror = () => els.previewAuthorIcon.style.display = 'none';
            } else {
                els.previewAuthorIcon.style.display = 'none';
            }
        } else {
            els.previewAuthorName.textContent = '';
            els.previewAuthorIcon.style.display = 'none';
        }

        // Title
        if (embed.title) {
            els.previewTitleArea.innerHTML = embed.url
                ? `<a href="${escapeHtml(embed.url)}" target="_blank" rel="noopener">${escapeHtml(embed.title)}</a>`
                : escapeHtml(embed.title);
        } else {
            els.previewTitleArea.textContent = '';
        }

        // Description
        els.previewDescriptionArea.textContent = embed.description || '';

        // Fields
        const fieldsArea = els.previewFieldsArea;
        fieldsArea.innerHTML = '';
        if (embed.fields && embed.fields.length > 0) {
            embed.fields.forEach(f => {
                const div = document.createElement('div');
                div.className = 'embed-field' + (f.inline ? ' inline' : '');
                div.innerHTML = `<div class="embed-field-name">${escapeHtml(f.name)}</div><div class="embed-field-value">${escapeHtml(f.value)}</div>`;
                fieldsArea.appendChild(div);
            });
        }

        // Image
        if (embed.image && embed.image.url) {
            els.previewImage.src = embed.image.url;
            els.previewImageArea.style.display = 'block';
            els.previewImage.onerror = () => els.previewImageArea.style.display = 'none';
        } else {
            els.previewImage.src = '';
            els.previewImageArea.style.display = 'none';
        }

        // Thumbnail
        if (embed.thumbnail && embed.thumbnail.url) {
            els.previewThumbnail.src = embed.thumbnail.url;
            els.previewThumbnail.style.display = 'block';
            els.previewThumbnail.onerror = () => els.previewThumbnail.style.display = 'none';
        } else {
            els.previewThumbnail.src = '';
            els.previewThumbnail.style.display = 'none';
        }

        // Footer
        els.previewFooterText.textContent = (embed.footer && embed.footer.text) ? embed.footer.text : '';
        if (embed.footer && embed.footer.icon_url) {
            els.previewFooterIcon.src = embed.footer.icon_url;
            els.previewFooterIcon.style.display = 'block';
            els.previewFooterIcon.onerror = () => els.previewFooterIcon.style.display = 'none';
        } else {
            els.previewFooterIcon.src = '';
            els.previewFooterIcon.style.display = 'none';
        }

        // Timestamp
        if (embed.timestamp) {
            els.previewTimestamp.textContent = new Date(embed.timestamp).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            els.previewTimestamp.style.display = 'inline';
        } else {
            els.previewTimestamp.textContent = '';
            els.previewTimestamp.style.display = 'none';
        }
    }

    function updateJSON() {
        let obj, label;
        if (currentTab === 'embed') {
            obj = getEmbed();
            label = 'Embed Object';
        } else {
            obj = getWebhookPayload();
            label = 'Webhook Payload';
        }
        els.jsonDisplay.textContent = JSON.stringify(obj, null, 2);
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function addField(nameVal, valueVal, inlineVal) {
        const empty = els.fieldsList.querySelector('.empty-fields-msg');
        if (empty) empty.remove();

        const div = document.createElement('div');
        div.className = 'field-item';
        div.innerHTML = `
            <div class="field-item-header">
                <span class="field-name-label">Field ${fields.length + 1}</span>
                <div class="field-item-actions">
                    <button class="move-field-up" title="Move up"><i class="fa-solid fa-chevron-up"></i></button>
                    <button class="move-field-down" title="Move down"><i class="fa-solid fa-chevron-down"></i></button>
                    <button class="delete-field" title="Delete"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="field-row">
                <label>Name</label>
                <input type="text" class="field-name" placeholder="Field name" spellcheck="false">
            </div>
            <div class="field-row">
                <label>Value</label>
                <input type="text" class="field-value" placeholder="Field value" spellcheck="false">
            </div>
            <div class="field-row">
                <label class="inline-check">
                    <input type="checkbox" class="field-inline"> Inline
                </label>
            </div>
        `;

        const nameInput = div.querySelector('.field-name');
        const valueInput = div.querySelector('.field-value');
        const inlineCheck = div.querySelector('.field-inline');

        if (nameVal !== undefined) nameInput.value = nameVal;
        if (valueVal !== undefined) valueInput.value = valueVal;
        if (inlineVal !== undefined) inlineCheck.checked = inlineVal;

        div.querySelector('.delete-field').addEventListener('click', () => {
            const idx = fields.indexOf(entry);
            if (idx > -1) fields.splice(idx, 1);
            div.remove();
            renderFieldLabels();
            updateAll();
        });

        div.querySelector('.move-field-up').addEventListener('click', () => {
            const idx = fields.indexOf(entry);
            if (idx > 0) {
                [fields[idx], fields[idx - 1]] = [fields[idx - 1], fields[idx]];
                els.fieldsList.insertBefore(div, div.previousElementSibling);
                renderFieldLabels();
                updateAll();
            }
        });

        div.querySelector('.move-field-down').addEventListener('click', () => {
            const idx = fields.indexOf(entry);
            if (idx < fields.length - 1) {
                [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
                els.fieldsList.insertBefore(div.nextElementSibling, div);
                renderFieldLabels();
                updateAll();
            }
        });

        nameInput.addEventListener('input', updateAll);
        valueInput.addEventListener('input', updateAll);
        inlineCheck.addEventListener('change', updateAll);

        const entry = { name: nameInput, value: valueInput, inline: inlineCheck, el: div };
        fields.push(entry);
        els.fieldsList.appendChild(div);
        renderFieldLabels();
        updateAll();
    }

    function renderFieldLabels() {
        const items = els.fieldsList.querySelectorAll('.field-item');
        items.forEach((item, i) => {
            const label = item.querySelector('.field-name-label');
            if (label) label.textContent = `Field ${i + 1}`;
        });
    }

    function updateAll() {
        updatePreview();
        updateJSON();
    }

    function resetEmbed() {
        els.authorName.value = '';
        els.authorIcon.value = '';
        els.authorUrl.value = '';
        els.title.value = '';
        els.titleUrl.value = '';
        els.description.value = '';
        els.color.value = '#5865F2';
        els.colorPicker.value = '#5865F2';
        els.image.value = '';
        els.thumbnail.value = '';
        els.footerText.value = '';
        els.footerIcon.value = '';
        els.timestampToggle.checked = true;

        fields.forEach(f => f.el.remove());
        fields.length = 0;
        if (!els.fieldsList.querySelector('.empty-fields-msg')) {
            const msg = document.createElement('div');
            msg.className = 'empty-fields-msg';
            msg.style.cssText = 'font-size:13px;color:var(--muted);padding:8px 0;';
            msg.textContent = 'No fields added yet.';
            els.fieldsList.appendChild(msg);
        }

        updateAll();
    }

    function exportEmbed() {
        const obj = currentTab === 'embed' ? getEmbed() : getWebhookPayload();
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'discord-embed.json';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('JSON exported!');
    }

    function importEmbed(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                loadFromObject(data);
                event.target.value = '';
                showToast('Embed imported successfully!');
            } catch (err) {
                showToast('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    }

    function loadFromObject(data) {
        resetEmbed();
        const embeds = data.embeds;
        const embed = embeds && embeds.length > 0 ? embeds[0] : data;

        if (embed.author) {
            if (embed.author.name) els.authorName.value = embed.author.name;
            if (embed.author.icon_url) els.authorIcon.value = embed.author.icon_url;
            if (embed.author.url) els.authorUrl.value = embed.author.url;
        }
        if (embed.title) els.title.value = embed.title;
        if (embed.url) els.titleUrl.value = embed.url;
        if (embed.description) els.description.value = embed.description;
        if (embed.color) {
            const hex = '#' + embed.color.toString(16).padStart(6, '0');
            els.color.value = hex;
            els.colorPicker.value = hex;
        }
        if (embed.image && embed.image.url) els.image.value = embed.image.url;
        if (embed.thumbnail && embed.thumbnail.url) els.thumbnail.value = embed.thumbnail.url;
        if (embed.footer) {
            if (embed.footer.text) els.footerText.value = embed.footer.text;
            if (embed.footer.icon_url) els.footerIcon.value = embed.footer.icon_url;
        }
        if (embed.timestamp) els.timestampToggle.checked = true;
        if (embed.fields) {
            embed.fields.forEach(f => addField(f.name, f.value, f.inline || false));
        }
        updateAll();
    }

    function copyJSON() {
        const text = els.jsonDisplay.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            showToast('Failed to copy');
        });
    }

    function sendToWebhook() {
        const row = els.webhookUrlRow;
        if (row.style.display === 'flex') {
            row.style.display = 'none';
        } else {
            row.style.display = 'flex';
            els.webhookUrl.focus();
        }
    }

    async function executeWebhook() {
        const url = els.webhookUrl.value.trim();
        if (!url) {
            showToast('Please enter a webhook URL');
            return;
        }
        if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(url)) {
            showToast('Invalid webhook URL');
            return;
        }
        try {
            const payload = getWebhookPayload();
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast('Webhook sent successfully!');
                els.webhookUrlRow.style.display = 'none';
            } else {
                const text = await res.text();
                showToast(`Error ${res.status}: ${text.slice(0, 100)}`);
            }
        } catch (err) {
            showToast('Failed to send webhook: ' + err.message);
        }
    }

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
        updateJSON();
    }

    function showToast(msg) {
        els.toastText.textContent = msg;
        els.toast.classList.add('show');
        clearTimeout(els.toast._timer);
        els.toast._timer = setTimeout(() => els.toast.classList.remove('show'), 2500);
    }

    function attachInputListeners() {
        const inputs = [
            els.authorName, els.authorIcon, els.authorUrl,
            els.title, els.titleUrl,
            els.description,
            els.color, els.colorPicker,
            els.image, els.thumbnail,
            els.footerText, els.footerIcon,
            els.timestampToggle
        ];
        inputs.forEach(el => {
            if (!el) return;
            const evt = el.type === 'checkbox' ? 'change' : 'input';
            el.addEventListener(evt, updateAll);
        });

        els.color.addEventListener('input', function() {
            if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
                els.colorPicker.value = this.value;
            }
        });
        els.colorPicker.addEventListener('input', function() {
            els.color.value = this.value;
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    }

    els.webhookUrl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') executeWebhook();
    });

    function init() {
        attachInputListeners();
        resetEmbed();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addField = addField;
    window.resetEmbed = resetEmbed;
    window.exportEmbed = exportEmbed;
    window.importEmbed = importEmbed;
    window.copyJSON = copyJSON;
    window.sendToWebhook = sendToWebhook;
    window.executeWebhook = executeWebhook;
    window.switchTab = switchTab;
})();
