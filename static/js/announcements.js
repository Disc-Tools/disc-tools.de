(() => {
    const container = document.getElementById('ann-container');
    const idPattern = /^[A-Za-z0-9_-]{1,80}$/;
    const id = /^\/announcements\/([A-Za-z0-9_-]{1,80})\/?$/.exec(location.pathname)?.[1];
    const fallback = container.querySelector('[data-announcement-id]');
    const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

    function textElement(tag, text, className) {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    function article(entry) {
        const article = document.createElement('article');
        article.className = 'page-section announcement-card';
        const title = entry.title || 'Untitled';
        const heading = textElement('h2', title, 'announcement-title');
        if (!id) {
            const link = textElement('a', title);
            link.href = '/announcements/' + encodeURIComponent(entry.id);
            heading.replaceChildren(link);
        }
        const date = new Date(entry.created_at);
        if (!Number.isNaN(date.getTime())) {
            const time = textElement('time', dateFormat.format(date));
            time.dateTime = date.toISOString();
            article.append(time);
        }
        const author = textElement('div', 'By ', 'announcement-footer');
        if (/^\d{17,20}$/.test(entry.author_id)) {
            const avatar = document.createElement('img');
            avatar.className = 'author-avatar';
            avatar.dataset.discordAvatar = entry.author_id;
            avatar.src = '/static/assets/img/logo.svg';
            if (/^(?:a_)?[a-f0-9]{32}$/.test(entry.author_avatar)) {
                const format = entry.author_avatar.startsWith('a_') ? 'gif' : 'webp';
                avatar.src = 'https://cdn.discordapp.com/avatars/' + entry.author_id + '/' + entry.author_avatar + '.' + format + '?size=64';
            }
            avatar.alt = '';
            avatar.width = 24;
            avatar.height = 24;
            avatar.loading = 'lazy';
            author.append(avatar);
        }
        author.append(textElement('span', entry.author_username || 'Team'));
        article.append(heading, textElement('p', entry.text || '', 'announcement-text'), author);
        return article;
    }

    if (id) {
        document.getElementById('announcements-intro').hidden = true;
        document.getElementById('announcements-back').hidden = false;
        if (fallback?.dataset.announcementId === id) {
            const title = fallback.querySelector('.announcement-title');
            title.textContent = title.textContent;
            document.title = title.textContent + ' | Disc-Tools';
        } else {
            container.replaceChildren(textElement('p', 'Loading announcement…'));
        }
    }

    async function loadAnnouncements() {
        try {
            const response = await fetch('/api/announcements', { signal: AbortSignal.timeout(6000) });
            if (!response.ok) throw new Error('Announcements unavailable');
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid announcements');
            const available = data.filter(entry => idPattern.test(String(entry.id)));
            const entries = id ? available.filter(entry => String(entry.id) === id) : available;
            if (!entries.length) {
                container.replaceChildren(textElement('p', id ? 'This announcement was not found.' : 'No announcements yet.'));
                return;
            }
            container.replaceChildren(...entries.map(article));
            if (id) document.title = (entries[0].title || 'Announcement') + ' | Disc-Tools';
        } catch {
            if (id && fallback?.dataset.announcementId !== id) {
                container.replaceChildren(textElement('p', 'Could not load this announcement. Please try again.'));
            }
        }
    }

    void loadAnnouncements();
})();
