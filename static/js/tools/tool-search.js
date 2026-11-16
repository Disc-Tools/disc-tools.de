const search = document.querySelector('#tool-search');
const status = document.querySelector('#tool-search-status');
const groups = [...document.querySelectorAll('.tool-group')].map(group => ({
    element: group,
    rows: [...group.querySelectorAll('.tool-list > li')].map(row => ({
        element: row,
        text: row.textContent.toLowerCase()
    }))
}));

function filterTools() {
    const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let matches = 0;

    for (const group of groups) {
        let visible = 0;
        for (const row of group.rows) {
            row.element.hidden = !words.every(word => row.text.includes(word));
            if (!row.element.hidden) visible++;
        }
        group.element.hidden = visible === 0;
        matches += visible;
    }

    const resultLabel = matches === 1 ? 'result' : 'results';
    const message = matches ? `${matches} ${resultLabel}` : 'No tools match your search.';
    status.textContent = words.length ? message : '';
}

search.addEventListener('input', filterTools);
search.closest('.tool-search').hidden = false;
filterTools();
