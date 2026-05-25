let currentType = 'plain';
let defaultWebhookData = null;

function switchType(type) {
    currentType = type;
    
    // Update Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event) event.currentTarget.classList.add('active');

    // Update Sections
    if (type === 'plain') {
        document.getElementById('plain-section').style.display = 'block';
        document.getElementById('embed-section').classList.remove('active');
    } else {
        document.getElementById('plain-section').style.display = 'none';
        document.getElementById('embed-section').classList.add('active');
    }
    updatePreview();
}

function updatePreview() {
    const overrideName = document.getElementById('overrideName').value.trim();
    const overrideAvatar = document.getElementById('overrideAvatar').value.trim();
    
    // Update Author
    const authorEl = document.getElementById('prevAuthor');
    authorEl.textContent = overrideName || (defaultWebhookData ? defaultWebhookData.name : 'Webhook');
    
    // Update Avatar
    const avatarEl = document.getElementById('prevAvatar');
    if (overrideAvatar) {
        avatarEl.src = overrideAvatar;
    } else if (defaultWebhookData && defaultWebhookData.avatar) {
        avatarEl.src = `https://cdn.discordapp.com/avatars/${defaultWebhookData.id}/${defaultWebhookData.avatar}.png`;
    } else {
        avatarEl.src = 'https://disc-tools.de/assets/img/logo.png';
    }

    const prevText = document.getElementById('prevText');
    const prevEmbed = document.getElementById('prevEmbed');

    const linkUrl = "https://disc-tools.de/tools/webhook-manager/";
    const maskedLink = `[disc-tools Webhook manager](${linkUrl})`;

    if (currentType === 'plain') {
        const content = document.getElementById('msgContent').value.trim();
        prevText.textContent = content ? (content + "\n\nSent via " + maskedLink) : 'Your message will appear here...';
        prevText.style.display = 'block';
        prevEmbed.classList.remove('active');
    } else {
        // Embed Mode
        prevText.style.display = 'none'; // No text above embed
        
        const title = document.getElementById('embedTitle').value.trim();
        const desc = document.getElementById('embedDesc').value.trim();
        const color = document.getElementById('embedColor').value;
        const thumbnail = document.getElementById('embedThumbnail').value.trim();
        const image = document.getElementById('embedImage').value.trim();
        const authName = document.getElementById('embedAuthorName').value.trim();
        const authIcon = document.getElementById('embedAuthorIcon').value.trim();

        prevEmbed.classList.add('active');
        prevEmbed.style.borderLeftColor = color;
        
        // Author Preview
        const authEl = document.getElementById('prevEmbedAuthor');
        if (authName) {
            authEl.style.display = 'flex';
            document.getElementById('prevEmbedAuthorName').textContent = authName;
            document.getElementById('prevEmbedAuthorIcon').src = authIcon || 'https://disc-tools.de/assets/img/logo.png';
        } else {
            authEl.style.display = 'none';
        }

        const titleEl = document.getElementById('prevEmbedTitle');
        if (title) {
            titleEl.textContent = title;
            titleEl.style.display = 'block';
        } else {
            titleEl.style.display = 'none';
        }

        const descEl = document.getElementById('prevEmbedDesc');
        descEl.textContent = (desc ? (desc + "\n\n") : "") + maskedLink;
        descEl.style.display = 'block';
        
        // Fields Preview
        const fieldsPrev = document.getElementById('prevEmbedFields');
        fieldsPrev.innerHTML = '';
        const fields = document.querySelectorAll('.field-item');
        fields.forEach(f => {
            const fName = f.querySelector('.field-name').value.trim();
            const fValue = f.querySelector('.field-value').value.trim();
            const fInline = f.querySelector('.field-inline').checked;
            
            if (fName && fValue) {
                const fEl = document.createElement('div');
                fEl.style.gridColumn = fInline ? 'span 1' : 'span 2';
                fEl.innerHTML = `
                    <div style="color: #fff; font-size: 13px; font-weight: 600; margin-bottom: 2px;">${fName}</div>
                    <div style="color: #dbdee1; font-size: 13px; line-height: 1.2; white-space: pre-wrap;">${fValue}</div>
                `;
                fieldsPrev.appendChild(fEl);
            }
        });

        const thumbEl = document.getElementById('prevEmbedThumbnail');
        if (thumbnail) {
            thumbEl.src = thumbnail;
            thumbEl.style.display = 'block';
        } else {
            thumbEl.style.display = 'none';
        }

        const imgEl = document.getElementById('prevEmbedImage');
        if (image) {
            imgEl.src = image;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
    }
}

function addField() {
    const container = document.getElementById('fields-container');
    if (container.children.length >= 25) {
        showToast('Maximum 25 fields allowed.');
        return;
    }

    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'field-item';
    fieldDiv.style.background = 'rgba(255,255,255,0.02)';
    fieldDiv.style.padding = '12px';
    fieldDiv.style.borderRadius = '8px';
    fieldDiv.style.border = '1px solid var(--border)';
    fieldDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase;">Field #${container.children.length + 1}</span>
            <button onclick="this.parentElement.parentElement.remove(); updatePreview();" style="background: none; border: none; color: #f04747; cursor: pointer; font-size: 12px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <input type="text" class="config-input field-name" placeholder="Field name" oninput="updatePreview()" style="margin-bottom: 8px;">
        <textarea class="config-input field-value" placeholder="Field value" oninput="updatePreview()" style="height: 60px; margin-bottom: 8px;"></textarea>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--muted);">
            <input type="checkbox" class="field-inline" onchange="updatePreview()"> Inline Field
        </label>
    `;
    container.appendChild(fieldDiv);
}

async function loadWebhook() {
    const url = document.getElementById('webhookUrl').value.trim();
    if (!url) {
        showToast('<i class="fa-solid fa-circle-exclamation"></i> Please enter a Webhook URL.');
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Invalid Webhook');

        defaultWebhookData = await response.json();
        
        document.getElementById('manager-area').style.display = 'grid';
        document.getElementById('empty-manager').style.display = 'none';
        
        updatePreview();
        if (window.trackToolUsage) window.trackToolUsage('webhook-manager');
        showToast('<i class="fa-solid fa-circle-check"></i> Webhook loaded successfully!');

    } catch (err) {
        showToast('<i class="fa-solid fa-circle-xmark"></i> Failed to load webhook. Check the URL.');
    }
}

async function copyPayload(btn) {
    const payload = getPayload();
    if (!payload) return;

    try {
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        
        if (btn) {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            btn.style.color = '#43b581';
            
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.color = '';
            }, 2000);
        }
        showToast('JSON Payload copied!');
    } catch (err) {
        showToast('Failed to copy.');
    }
}

function getPayload() {
    const username = document.getElementById('overrideName').value.trim();
    const avatar = document.getElementById('overrideAvatar').value.trim();
    const linkUrl = "https://disc-tools.de/tools/webhook-manager/";
    const maskedLink = `[disc-tools Webhook manager](${linkUrl})`;
    
    const payload = {};
    if (username) payload.username = username;
    if (avatar) payload.avatar_url = avatar;

    if (currentType === 'plain') {
        const content = document.getElementById('msgContent').value.trim();
        if (!content) return null;
        payload.content = content + "\n\nSent via " + maskedLink;
    } else {
        const title = document.getElementById('embedTitle').value.trim();
        const description = document.getElementById('embedDesc').value.trim();
        const color = document.getElementById('embedColor').value;
        const thumbnail = document.getElementById('embedThumbnail').value.trim();
        const image = document.getElementById('embedImage').value.trim();
        const authName = document.getElementById('embedAuthorName').value.trim();
        const authIcon = document.getElementById('embedAuthorIcon').value.trim();

        const embed = {
            title: title || undefined,
            description: (description ? (description + "\n\n") : "") + maskedLink,
            color: parseInt(color.replace('#', ''), 16),
            footer: {
                text: "Sent via disc-tools Webhook manager",
                icon_url: "https://disc-tools.de/assets/img/logo.png"
            }
        };

        if (authName) {
            embed.author = { name: authName, icon_url: authIcon || undefined };
        }

        const fieldEls = document.querySelectorAll('.field-item');
        if (fieldEls.length > 0) {
            embed.fields = [];
            fieldEls.forEach(f => {
                const fName = f.querySelector('.field-name').value.trim();
                const fValue = f.querySelector('.field-value').value.trim();
                const fInline = f.querySelector('.field-inline').checked;
                if (fName && fValue) embed.fields.push({ name: fName, value: fValue, inline: fInline });
            });
        }

        if (thumbnail) embed.thumbnail = { url: thumbnail };
        if (image) embed.image = { url: image };

        payload.embeds = [embed];
    }
    return payload;
}

// Update sendMessage to use getPayload
async function sendMessage() {
    const url = document.getElementById('webhookUrl').value.trim();
    const payload = getPayload();

    if (!payload) {
        showToast('Message content cannot be empty.');
        return;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            if (window.trackToolUsage) window.trackToolUsage('webhook-manager');
            showToast('<i class="fa-solid fa-paper-plane"></i> Message sent successfully!');
            if (currentType === 'plain') {
                document.getElementById('msgContent').value = '';
                updatePreview();
            }
        } else {
            const errData = await response.json();
            showToast(`Error: ${errData.message || 'Failed to send'}`);
        }
    } catch (err) {
        showToast('Error: Failed to connect to Discord.');
    }
}

async function deleteWebhook() {
    const url = document.getElementById('webhookUrl').value.trim();
    if (!confirm('Are you absolutely sure you want to DELETE this webhook? This action cannot be reversed.')) return;

    try {
        const response = await fetch(url, { method: 'DELETE' });
        if (response.ok || response.status === 204) {
            showToast('<i class="fa-solid fa-trash-can"></i> Webhook deleted successfully.');
            document.getElementById('manager-area').style.display = 'none';
            document.getElementById('empty-manager').style.display = 'flex';
            document.getElementById('webhookUrl').value = '';
        } else {
            showToast('Failed to delete webhook.');
        }
    } catch (err) {
        showToast('Error: Failed to delete webhook.');
    }
}
