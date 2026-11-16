(() => {
    const form = document.getElementById('embed-form');
    const fields = document.getElementById('embed-fields');
    const addField = document.getElementById('embed-add-field');
    const preview = document.getElementById('embed-preview');
    const output = document.getElementById('embed-json');
    const copy = document.getElementById('embed-copy');
    const status = document.getElementById('embed-status');
    const componentsForm = document.getElementById('components-form');
    const blocks = document.getElementById('component-blocks');
    const componentType = document.getElementById('component-type');
    const addComponent = document.getElementById('component-add');
    const modes = [...document.querySelectorAll('[name="embed-mode"]')];
    const componentDefinitions = {
        text: ['Text Display', '<label>Text <textarea name="text" rows="3" maxlength="4000" required></textarea></label>'],
        image: ['Media Gallery image', '<label>Image URL <input name="url" type="url" required></label><label>Alt text <input name="description" maxlength="1024"></label>'],
        separator: ['Separator', '<label>Spacing <select name="spacing"><option value="1">Small</option><option value="2">Large</option></select></label><label class="embed-inline"><input name="divider" type="checkbox" checked> Show divider</label>'],
        link: ['Link button', '<label>Button label <input name="text" maxlength="80" required></label><label>Destination URL <input name="url" type="url" maxlength="512" required></label>']
    };

    function webUrl(value) {
        try {
            const url = new URL(value);
            if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
        } catch {
            return '';
        }
        return '';
    }

    function appendText(tag, text, parent = preview) {
        const node = document.createElement(tag);
        node.textContent = text;
        parent.append(node);
        return node;
    }

    function update() {
        if (!componentsForm.hidden) {
            updateComponents();
            return;
        }
        const { title, description, url, image, footer, color } = form.elements;
        const embed = { color: Number.parseInt(color.value.slice(1), 16) };
        const titleLink = webUrl(url.value.trim());
        const imageLink = webUrl(image.value.trim());
        if (title.value.trim()) embed.title = title.value.trim();
        if (description.value.trim()) embed.description = description.value.trim();
        if (embed.title && titleLink) embed.url = titleLink;
        if (imageLink) embed.image = { url: imageLink };
        if (footer.value.trim()) embed.footer = { text: footer.value.trim() };

        const entries = [...fields.children].map(row => ({
            name: row.querySelector('[data-field-name]').value.trim(),
            value: row.querySelector('[data-field-value]').value.trim(),
            inline: row.querySelector('input[type="checkbox"]').checked
        }));
        const complete = entries.filter(entry => entry.name && entry.value);
        if (complete.length) embed.fields = complete;

        preview.replaceChildren();
        preview.style.borderColor = color.value;
        if (embed.title) {
            const heading = appendText('strong', '');
            const titleNode = appendText(embed.url ? 'a' : 'span', embed.title, heading);
            if (embed.url) {
                titleNode.href = embed.url;
                titleNode.target = '_blank';
                titleNode.rel = 'noopener noreferrer';
            }
        }
        if (embed.description) appendText('div', embed.description);
        if (complete.length) {
            const group = document.createElement('div');
            group.className = 'embed-preview-fields';
            for (const entry of complete) {
                const block = document.createElement('div');
                if (!entry.inline) block.className = 'embed-preview-wide';
                appendText('strong', entry.name, block);
                appendText('div', entry.value, block);
                group.append(block);
            }
            preview.append(group);
        }
        if (embed.image) {
            const img = document.createElement('img');
            img.referrerPolicy = 'no-referrer';
            img.src = embed.image.url;
            img.alt = 'Embed image';
            preview.append(img);
        }
        if (embed.footer) appendText('small', embed.footer.text);

        const hasContent = preview.hasChildNodes();
        if (!hasContent) appendText('small', 'Add content to start your embed.');
        const textLength = [embed.title, embed.description, embed.footer?.text, ...complete.flatMap(entry => [entry.name, entry.value])]
            .reduce((total, text) => total + (text?.length || 0), 0);
        const errors = [];
        if (url.value.trim() && (!titleLink || !embed.title)) errors.push('A title link needs a title and an HTTP or HTTPS URL.');
        if (image.value.trim() && !imageLink) errors.push('Use an HTTP or HTTPS image URL.');
        if (entries.some(entry => !entry.name || !entry.value)) errors.push('Give each field a name and value, or remove it.');
        if (textLength > 6000) errors.push('Embed text exceeds Discord’s 6,000-character limit.');
        setOutput(hasContent ? { embeds: [embed] } : null, errors);
        addField.disabled = fields.children.length >= 25;
    }

    function setOutput(payload, errors) {
        status.textContent = errors.join(' ');
        output.value = payload && !errors.length
            ? JSON.stringify({ ...payload, allowed_mentions: { parse: [] } }, null, 2)
            : '';
        copy.disabled = !output.value;
    }

    function updateComponents() {
        const color = componentsForm.elements.color.value;
        const components = [];
        const errors = [];
        const rows = [...blocks.children];
        let componentCount = 1;
        preview.replaceChildren();
        preview.style.borderColor = color;

        for (const [index, row] of rows.entries()) {
            const type = row.dataset.type;
            const text = row.querySelector('[name="text"]')?.value.trim();
            const url = webUrl(row.querySelector('[name="url"]')?.value.trim() || '');
            const label = componentDefinitions[type][0];
            row.querySelector('[data-move="up"]').disabled = index === 0;
            row.querySelector('[data-move="down"]').disabled = index === rows.length - 1;
            componentCount += type === 'link' ? 2 : 1;
            if ((type === 'text' && !text) || (type === 'image' && !url)
                || (type === 'link' && (!text || !url || url.length > 512))) {
                errors.push(`Complete component ${index + 1} (${label}).`);
                continue;
            }

            if (type === 'text') {
                components.push({ type: 10, content: text });
                appendText('div', text);
            } else if (type === 'image') {
                const description = row.querySelector('[name="description"]').value.trim();
                const item = { media: { url } };
                if (description) item.description = description;
                components.push({ type: 12, items: [item] });
                const img = document.createElement('img');
                img.referrerPolicy = 'no-referrer';
                img.src = url;
                img.alt = description || 'Media Gallery image';
                preview.append(img);
            } else if (type === 'separator') {
                const spacing = Number(row.querySelector('[name="spacing"]').value);
                const divider = row.querySelector('[name="divider"]').checked;
                components.push({ type: 14, spacing, divider });
                const separator = document.createElement(divider ? 'hr' : 'div');
                separator.className = `component-separator spacing-${spacing}`;
                preview.append(separator);
            } else {
                components.push({ type: 1, components: [{ type: 2, style: 5, label: text, url }] });
                const link = appendText('a', text);
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'button button-outline';
            }
        }

        if (!components.length) appendText('small', 'Add a component to start your message.');
        if (componentCount > 40) errors.push('Discord allows up to 40 components, including the container and button rows.');
        addComponent.disabled = componentCount + (componentType.value === 'link' ? 2 : 1) > 40;
        setOutput(components.length ? {
            flags: 1 << 15,
            components: [{ type: 17, accent_color: Number.parseInt(color.slice(1), 16), components }]
        } : null, errors);
    }

    for (const mode of modes) {
        mode.addEventListener('change', syncMode);
    }

    function syncMode() {
        const classic = modes[0].checked;
        form.hidden = !classic;
        componentsForm.hidden = classic;
        update();
    }

    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', update);
    componentsForm.addEventListener('submit', event => event.preventDefault());
    componentsForm.addEventListener('input', updateComponents);
    addComponent.addEventListener('click', () => {
        const type = componentType.value;
        const [label, inputs] = componentDefinitions[type];
        const row = document.createElement('fieldset');
        row.dataset.type = type;
        row.className = 'embed-field';
        row.innerHTML = `
            <legend>${label}</legend>
            ${inputs}
            <div class="component-actions">
                <button type="button" class="button button-outline" data-move="up">Move up</button>
                <button type="button" class="button button-outline" data-move="down">Move down</button>
                <button type="button" class="button button-outline" data-remove>Remove</button>
            </div>`;
        blocks.append(row);
        updateComponents();
        row.querySelector('input, textarea, select').focus();
    });
    blocks.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        const row = button.closest('fieldset');
        if (button.hasAttribute('data-remove')) {
            row.remove();
            componentType.focus();
        } else if (button.dataset.move === 'up') {
            row.previousElementSibling.before(row);
        } else {
            row.nextElementSibling.after(row);
        }
        updateComponents();
        if (row.isConnected) (button.disabled ? row.querySelector('input, textarea, select') : button).focus();
    });
    addField.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'embed-field';
        row.innerHTML = `
            <label>Field name <input data-field-name maxlength="256"></label>
            <label>Field value <textarea data-field-value maxlength="1024" rows="2"></textarea></label>
            <label class="embed-inline"><input type="checkbox"> Inline</label>
            <button type="button" class="button button-outline">Remove field</button>`;
        row.querySelector('button').addEventListener('click', () => {
            row.remove();
            update();
            addField.focus();
        });
        fields.append(row);
        update();
        row.querySelector('input').focus();
    });
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(output.value);
            status.textContent = 'Copied.';
        } catch {
            output.select();
            status.textContent = 'Could not copy automatically. Copy the selected JSON.';
        }
    });
    syncMode();
})();
