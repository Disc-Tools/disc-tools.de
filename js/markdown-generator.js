function insertMD(btn) {
    const prefix = btn.getAttribute('data-prefix');
    const suffix = btn.getAttribute('data-suffix');
    const input = document.getElementById('mdInput');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    
    let actualPrefix = prefix;
    if (prefix === '<t:' && suffix === ':R>') {
        const now = Math.floor(Date.now() / 1000);
        actualPrefix = `<t:${now}`;
    }

    const before = text.substring(0, start);
    const after = text.substring(end);

    const isWrapped = before.endsWith(prefix) && after.startsWith(suffix);
    const selectionIsWrapped = selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length >= (prefix.length + suffix.length);

    let newVal;
    let newStart, newEnd;

    if (isWrapped) {
        const trimmedBefore = before.substring(0, before.length - prefix.length);
        const trimmedAfter = after.substring(suffix.length);
        newVal = trimmedBefore + selected + trimmedAfter;
        newStart = start - prefix.length;
        newEnd = end - prefix.length;
    } else if (selectionIsWrapped) {
        const innerSelected = selected.substring(prefix.length, selected.length - suffix.length);
        newVal = before + innerSelected + after;
        newStart = start;
        newEnd = end - (prefix.length + suffix.length);
    } else {
        newVal = before + actualPrefix + selected + suffix + after;
        newStart = start + actualPrefix.length;
        newEnd = start + actualPrefix.length + selected.length;
    }

    input.value = newVal;
    input.focus();
    input.selectionStart = newStart;
    input.selectionEnd = newEnd;
    
    updatePreview();
    checkActiveFormatting();
}

function insertAnsi() {
    const color = document.getElementById('ansiColor').value;
    if (color === 'none') return;
    
    const input = document.getElementById('mdInput');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);

    const prefix = `\u001b[${color}m`;
    const suffix = `\u001b[0m`;
    
    let newVal;
    if (!text.includes('```ansi')) {
        newVal = text.substring(0, start) + '```ansi\n' + prefix + (selected || 'text') + suffix + '\n```' + text.substring(end);
    } else {
        newVal = text.substring(0, start) + prefix + (selected || 'text') + suffix + text.substring(end);
    }

    input.value = newVal;
    document.getElementById('ansiColor').value = 'none';
    updatePreview();
}

function checkActiveFormatting() {
    const input = document.getElementById('mdInput');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const buttons = document.querySelectorAll('.md-btn');
    buttons.forEach(btn => {
        const prefix = btn.getAttribute('data-prefix');
        const suffix = btn.getAttribute('data-suffix');
        if (!prefix) return;
        const isWrapped = (before.endsWith(prefix) && after.startsWith(suffix)) || 
                         (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length >= (prefix.length + suffix.length));
        btn.classList.toggle('active', isWrapped);
    });
}

function parseDiscordMarkdown(text) {
    if (!text) return '<span style="color: var(--muted)">Your message preview will appear here...</span>';

    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code Blocks (including ANSI)
    html = html.replace(/```ansi\n([\s\S]*?)```/g, (match, content) => {
        let ansiHtml = content;
        // Basic ANSI to HTML
        const ansiMap = {
            '0;31': '#ff4545', '1;31': '#ff4545',
            '0;32': '#43b581', '1;32': '#43b581',
            '0;33': '#faa61a', '1;33': '#faa61a',
            '0;34': '#00aff4', '1;34': '#00aff4',
            '0;35': '#eb459e', '1;35': '#eb459e',
            '0;36': '#00ffff', '1;36': '#00ffff',
            '0;37': '#ffffff', '1;37': '#ffffff',
            '0': 'inherit'
        };
        
        ansiHtml = ansiHtml.replace(/\u001b\[([\d;]+)m/g, (m, code) => {
            const color = ansiMap[code] || 'inherit';
            return `</span><span style="color: ${color}">`;
        });
        
        return `<div style="background: #1e1f22; padding: 10px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; margin: 8px 0; border: 1px solid rgba(255,255,255,0.05);"><span>${ansiHtml}</span></div>`;
    });

    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<div style="background: #1e1f22; padding: 10px; border-radius: 4px; font-family: \'JetBrains Mono\', monospace; margin: 8px 0; border: 1px solid rgba(255,255,255,0.05);">$2</div>');
    
    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code style="background: #2b2d31; padding: 2px 4px; border-radius: 4px; font-family: \'JetBrains Mono\', monospace;">$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3 style="color: #fff; margin: 12px 0 4px; font-size: 16px;">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 style="color: #fff; margin: 16px 0 4px; font-size: 18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 style="color: #fff; margin: 20px 0 8px; font-size: 22px;">$1</h1>');

    // Bold, Italic, Underline, Strike
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.*?)__/g, '<span style="text-decoration: underline;">$1</span>');
    html = html.replace(/~~(.*?)~~/g, '<del style="opacity: 0.6;">$1</del>');

    // Spoiler
    html = html.replace(/\|\|(.*?)\|\|/g, '<span class="md-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

    // Blockquote
    html = html.replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #4e5058; padding-left: 12px; margin: 8px 0; color: #dbdee1;">$1</blockquote>');

    // Timestamps
    html = html.replace(/&lt;t:(\d+):?(\w+)?&gt;/g, (match, ts) => {
        const date = new Date(ts * 1000);
        return `<span style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; cursor: help;" title="${date.toLocaleString()}">${date.toLocaleDateString()}</span>`;
    });

    return html.replace(/\n/g, '<br>');
}

function updatePreview() {
    const input = document.getElementById('mdInput').value;
    const preview = document.getElementById('mdPreview');
    preview.innerHTML = parseDiscordMarkdown(input);
}

function clearEditor() {
    if (confirm('Clear all text?')) {
        document.getElementById('mdInput').value = '';
        updatePreview();
    }
}

async function copyMarkdown() {
    const input = document.getElementById('mdInput').value;
    const btn = document.querySelector('.copy-all-btn');
    if (!input || !btn) return;

    try {
        await navigator.clipboard.writeText(input);
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        btn.style.background = '#43b581';
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = '';
        }, 2000);
        showToast('<i class="fa-solid fa-circle-check"></i> Markdown copied to clipboard!');
    } catch (err) {
        showToast('<i class="fa-solid fa-circle-xmark"></i> Failed to copy.');
    }
}

updatePreview();
