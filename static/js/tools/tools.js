/* Disc-Tools tool grid: category filter + favorites (localStorage) */
(function () {
    'use strict';

    var FAV_KEY = 'dt-favs-v1';
    var VALID_FILTERS = ['all', 'favorites', 'look-things-up', 'create-format', 'manage-extract'];

    var favs = [];
    try {
        var raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
        if (Array.isArray(raw)) favs = raw;
    } catch (e) { /* ignore */ }

    var chips = Array.prototype.slice.call(document.querySelectorAll('.filter-chip'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.tool-card'));
    var search = document.getElementById('directory-search');
    var status = document.getElementById('directory-status');
    var reset = document.getElementById('directory-reset');
    var currentFilter = 'all';
    var searchText = cards.map(function (card) {
        return card.textContent.toLowerCase();
    });
    var favCount = document.querySelector('.filter-chip[data-filter="favorites"] .fav-count');

    function save() {
        try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) { /* ignore */ }
    }

    function isFav(slug) {
        return favs.indexOf(slug) !== -1;
    }

    function renderStars() {
        cards.forEach(function (card) {
            var slug = card.dataset.slug;
            var btn = card.querySelector('.star-btn');
            card.classList.toggle('starred', isFav(slug));
            if (btn) btn.setAttribute('aria-pressed', isFav(slug) ? 'true' : 'false');
        });
        if (favCount) favCount.textContent = favs.length;
    }

    function applyFilter(filter) {
        if (VALID_FILTERS.indexOf(filter) === -1) filter = 'all';
        currentFilter = filter;
        var words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        var visible = 0;
        cards.forEach(function (card, index) {
            var ok = filter === 'all' ||
                (filter === 'favorites' && isFav(card.dataset.slug)) ||
                card.dataset.cat === filter;
            ok = ok && words.every(function (word) { return searchText[index].includes(word); });
            card.hidden = !ok;
            if (ok) visible += 1;
        });
        if (visible) {
            status.textContent = visible + (visible === 1 ? ' tool' : ' tools');
        } else {
            status.textContent = filter === 'favorites' && favs.length === 0
                ? 'No favorites yet. Select a star to save a tool.'
                : 'No tools match these filters.';
        }
        reset.hidden = visible > 0;
        chips.forEach(function (chip) {
            var active = chip.dataset.filter === filter;
            chip.classList.toggle('active', active);
            chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        if (location.hash !== '#' + filter && (filter !== 'all' || VALID_FILTERS.includes(location.hash.slice(1)))) {
            history.replaceState(null, '', filter === 'all' ? location.pathname + location.search : '#' + filter);
        }
    }

    chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            applyFilter(chip.dataset.filter);
        });
    });

    cards.forEach(function (card) {
        var btn = card.querySelector('.star-btn');
        btn.hidden = false;
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var i = favs.indexOf(card.dataset.slug);
            if (i === -1) favs.push(card.dataset.slug);
            else favs.splice(i, 1);
            save();
            renderStars();
            var active = chips.find(function (c) { return c.classList.contains('active'); });
            if (active && active.dataset.filter === 'favorites') {
                applyFilter('favorites');
            }
        });
    });

    search.addEventListener('input', function () { applyFilter(currentFilter); });
    reset.addEventListener('click', function () {
        search.value = '';
        applyFilter('all');
        search.focus();
    });

    var initial = location.hash.slice(1);
    favs = cards.map(function (card) { return card.dataset.slug; }).filter(isFav);
    renderStars();
    applyFilter(initial);
    document.querySelector('.directory-controls').hidden = false;
})();
