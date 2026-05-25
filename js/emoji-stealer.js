let currentType = 'emoji';

function setMode(mode) {
    currentType = mode;
    document.getElementById('mode-emoji').classList.toggle('active', mode === 'emoji');
    document.getElementById('mode-sticker').classList.toggle('active', mode === 'sticker');
    
    const input = document.getElementById('assetInput');
    if (mode === 'emoji') {
        input.placeholder = "Paste message with emojis or enter ID...";
    } else {
        input.placeholder = "Enter Sticker ID...";
    }
}

function stealAsset() {
    const input = document.getElementById('assetInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!input) {
        showToast('<i class="fa-solid fa-circle-exclamation"></i> Please enter an ID or paste a message.');
        return;
    }

    if (currentType === 'sticker') {
        const id = input.replace(/\D/g, '');
        if (!id) return showToast('Invalid Sticker ID');
        renderSticker(id);
        return;
    }

    // Emoji Mode: Support multiple emojis in text
    const emojiRegex = /<(a)?:?(\w+):(\d+)>/g;
    const matches = [...input.matchAll(emojiRegex)];
    
    if (matches.length > 0) {
        renderEmojiList(matches.map(m => ({
            animated: !!m[1],
            name: m[2],
            id: m[3]
        })));
    } else {
        // Fallback for single ID paste
        const id = input.replace(/\D/g, '');
        if (!id) return showToast('Invalid ID or format');
        renderEmojiList([{ animated: false, name: 'unknown', id: id }]);
    }
}

function renderEmojiList(emojis) {
    const resultDiv = document.getElementById('result');
    
    resultDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 30px;">
            ${emojis.map(emoji => `
                <div class="asset-preview" style="margin-top: 0; padding: 20px;">
                    <img src="https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=128&quality=lossless" class="asset-img" style="width: 80px; height: 80px;">
                    <div style="text-align: center; font-size: 11px; font-family: var(--mono); color: var(--muted); overflow: hidden; text-overflow: ellipsis; width: 100%;">:${emoji.name}:</div>
                    <div class="asset-actions" style="flex-direction: column;">
                        <div style="display: flex; gap: 5px;">
                            <a href="https://cdn.discordapp.com/emojis/${emoji.id}.png?size=1024&quality=lossless" target="_blank" class="download-btn" style="padding: 6px; font-size: 10px;">PNG</a>
                            ${emoji.animated ? `<a href="https://cdn.discordapp.com/emojis/${emoji.id}.gif?size=1024&quality=lossless" target="_blank" class="download-btn" style="padding: 6px; font-size: 10px;">GIF</a>` : ''}
                        </div>
                        <button class="download-btn" style="width: 100%; font-size: 10px; padding: 6px;" onclick="copyToClipboard('https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=1024', this)">
                            <i class="fa-solid fa-link"></i> Copy Link
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderEmoji(id, isAnimated) {
    const resultDiv = document.getElementById('result');
    const pngUrl = `https://cdn.discordapp.com/emojis/${id}.png?size=1024&quality=lossless`;
    const gifUrl = `https://cdn.discordapp.com/emojis/${id}.gif?size=1024&quality=lossless`;
    const webpUrl = `https://cdn.discordapp.com/emojis/${id}.webp?size=1024&quality=lossless`;

    const displayUrl = isAnimated ? gifUrl : pngUrl;

    resultDiv.innerHTML = `
        <div class="asset-preview">
            <img src="${displayUrl}" class="asset-img" alt="Emoji Preview" onerror="this.src='https://cdn.discordapp.com/emojis/${id}.png?size=1024'">
            <div style="text-align: center; margin-bottom: 10px;">
                <span class="category-badge">ID: ${id}</span>
                ${isAnimated ? '<span class="category-badge" style="color: #ffcc00; border-color: #ffcc00;">Animated</span>' : ''}
            </div>
            <div class="asset-actions">
                <a href="${pngUrl}" target="_blank" class="download-btn"><i class="fa-solid fa-image"></i> PNG</a>
                ${isAnimated ? `<a href="${gifUrl}" target="_blank" class="download-btn"><i class="fa-solid fa-film"></i> GIF</a>` : ''}
                <a href="${webpUrl}" target="_blank" class="download-btn"><i class="fa-solid fa-file-image"></i> WebP</a>
            </div>
            <button class="copy-all-btn" style="background: var(--surface2); border: 1px solid var(--border);" onclick="copyToClipboard('${displayUrl}')">
                <i class="fa-solid fa-link"></i> Copy CDN Link
            </button>
        </div>
    `;
}

function renderSticker(id) {
    const resultDiv = document.getElementById('result');
    const pngUrl = `https://cdn.discordapp.com/stickers/${id}.png?size=1024`;
    const webpUrl = `https://cdn.discordapp.com/stickers/${id}.webp?size=1024`;

    resultDiv.innerHTML = `
        <div class="asset-preview">
            <img src="${pngUrl}" class="asset-img" alt="Sticker Preview" style="width: 200px; height: 200px;">
            <div style="text-align: center; margin-bottom: 10px;">
                <span class="category-badge">Sticker ID: ${id}</span>
            </div>
            <div class="asset-actions">
                <a href="${pngUrl}" target="_blank" class="download-btn"><i class="fa-solid fa-image"></i> PNG</a>
                <a href="${webpUrl}" target="_blank" class="download-btn"><i class="fa-solid fa-file-image"></i> WebP</a>
            </div>
            <button class="copy-all-btn" style="background: var(--surface2); border: 1px solid var(--border);" onclick="copyToClipboard('${pngUrl}')">
                <i class="fa-solid fa-link"></i> Copy CDN Link
            </button>
        </div>
    `;
}

async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        
        if (btn) {
            const originalContent = btn.innerHTML;
            const originalBg = btn.style.background;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            btn.style.background = '#43b581';
            btn.style.borderColor = '#43b581';
            
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.background = originalBg;
                btn.style.borderColor = '';
            }, 2000);
        }

        showToast('<i class="fa-solid fa-circle-check"></i> Link copied!');
    } catch (err) {
        showToast('Failed to copy.');
    }
}
