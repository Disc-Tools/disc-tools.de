(() => {
    const main = document.querySelector('main');
    const input = document.getElementById('filterInput');
    const grid = document.getElementById('cardGrid');

    if (input && grid) {
        const cards = [...grid.querySelectorAll('.card')];
        const labels = [...grid.querySelectorAll('.cat-label')];
        const empty = document.getElementById('emptyState');
        const count = document.getElementById('cardCount');

        function filter() {
            const query = input.value.trim().toLowerCase();
            let visible = 0;
            for (const card of cards) {
                const text = card.textContent + ' ' + (card.dataset.search || '');
                card.hidden = !text.toLowerCase().includes(query);
                if (!card.hidden) visible++;
            }
            for (const label of labels) {
                let sibling = label.nextElementSibling;
                while (sibling && !sibling.matches('.cat-label, .card:not([hidden])')) {
                    sibling = sibling.nextElementSibling;
                }
                label.hidden = !sibling?.matches('.card');
            }
            empty.hidden = visible !== 0;
            count.textContent = visible;
        }

        input.addEventListener('input', filter);
        filter();
    }

    main.addEventListener('click', async event => {
        const spoiler = event.target.closest('button[data-spoiler]');
        if (spoiler) {
            spoiler.classList.add('revealed');
            spoiler.removeAttribute('aria-label');
            spoiler.removeAttribute('data-spoiler');
            spoiler.setAttribute('aria-disabled', 'true');
            return;
        }

        const button = event.target.closest('button[data-copy]');
        if (!button || button.disabled) return;
        event.preventDefault();

        const label = document.createElement('span');
        label.className = 'learn-copy-status';
        label.setAttribute('role', 'status');
        const icon = main.classList.contains('learn-category') ? button.querySelector('.fa-copy') : null;
        const caption = icon && button.querySelector('span');
        const originalCaption = caption?.textContent;
        const originalLabel = button.getAttribute('aria-label');
        button.disabled = true;
        try {
            await navigator.clipboard.writeText(button.dataset.copy.replace(/&#10;/g, '\n'));
            if (caption) {
                icon.classList.replace('fa-copy', 'fa-check');
                button.classList.add('copied');
                button.setAttribute('aria-label', 'Copied');
                caption.textContent = 'Copied';
            } else {
                button.after(label);
                label.textContent = 'Copied';
            }
        } catch {
            button.after(label);
            label.textContent = 'Could not copy';
        } finally {
            setTimeout(() => {
                if (button.classList.contains('copied')) {
                    icon.classList.replace('fa-check', 'fa-copy');
                    button.classList.remove('copied');
                    button.setAttribute('aria-label', originalLabel);
                    caption.textContent = originalCaption;
                }
                label.remove();
                button.disabled = false;
            }, 1500);
        }
    });
})();
