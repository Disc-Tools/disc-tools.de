(function () {
    const script = document.currentScript;
    const userId = script?.dataset?.userId;
    if (!userId) return;

    const container = document.getElementById('spotify-now-playing');
    if (!container) return;

    let playback = null;
    let currentTrackId = null;
    let animationId = null;

    function escHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatTime(ms) {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}:${String(sec).padStart(2, '0')}`;
    }

    function getProgressMs() {
        if (!playback || !playback.durationMs) return 0;
        const elapsed = Date.now() - playback.syncAt;
        return Math.min(playback.progressMs + elapsed, playback.durationMs);
    }

    function getProgressPercent() {
        if (!playback?.durationMs) return 0;
        return Math.min(100, (getProgressMs() / playback.durationMs) * 100);
    }

    function updateProgressUI() {
        if (animationId) return;
        if (!container.querySelector('.listening-card')) return;
        const fill = container.querySelector('.listening-progress-fill');
        const current = container.querySelector('.listening-time-current');
        if (!fill || !playback?.durationMs) return;

        const pos = getProgressMs();
        fill.style.width = `${getProgressPercent()}%`;
        if (current) current.textContent = formatTime(pos);
    }

    function animateProgress(targetPercent, duration, callback) {
        if (animationId) cancelAnimationFrame(animationId);
        const fill = container.querySelector('.listening-progress-fill');
        const current = container.querySelector('.listening-time-current');
        if (!fill) { if (callback) callback(); return; }

        const startPercent = parseFloat(fill.style.width) || 0;
        const startTime = performance.now();
        fill.style.transition = 'none';

        function step(now) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            const val = startPercent + (targetPercent - startPercent) * ease;

            fill.style.width = `${val}%`;
            if (current && playback?.durationMs) {
                current.textContent = formatTime((val / 100) * playback.durationMs);
            }

            if (t < 1) {
                animationId = requestAnimationFrame(step);
            } else {
                fill.style.width = `${targetPercent}%`;
                if (current && playback?.durationMs) {
                    current.textContent = formatTime((targetPercent / 100) * playback.durationMs);
                }
                fill.style.transition = 'width 0.35s linear';
                animationId = null;
                if (callback) callback();
            }
        }
        animationId = requestAnimationFrame(step);
    }

    function createCard(track) {
        container.innerHTML = ''
            + '<div class="listening-card">'
            + '<div class="listening-header">'
            + '<div class="listening-title"><i class="fa-brands fa-spotify spotify-color"></i> Currently Listening</div>'
            + '<div class="wave">'
            + '<span class="stroke"></span><span class="stroke"></span><span class="stroke"></span>'
            + '</div></div>'
            + '<a href="' + escHtml(track.url) + '" target="_blank" rel="noopener noreferrer" class="listening-body">'
            + '<img src="' + escHtml(track.albumArt) + '" alt="Album Art" class="album-art">'
            + '<div class="track-info">'
            + '<div class="track-title">' + escHtml(track.title) + '</div>'
            + '<div class="track-artist">' + escHtml(track.artist) + '</div>'
            + '</div>'
            + '<i class="fa-solid fa-play listening-play"></i>'
            + '</a>'
            + '<div class="listening-progress">'
            + '<div class="listening-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + track.durationMs + '" aria-valuenow="0">'
            + '<div class="listening-progress-fill" style="width:0%"></div>'
            + '</div>'
            + '<div class="listening-progress-times">'
            + '<span class="listening-time-current">0:00</span>'
            + '<span class="listening-time-total">' + formatTime(track.durationMs) + '</span>'
            + '</div></div>'
            + '<div class="listening-footer">'
            + '<a href="' + escHtml(track.url) + '" target="_blank" rel="noopener noreferrer" class="listening-link">'
            + '<i class="fa-brands fa-spotify"></i> Open on Spotify</a>'
            + '</div></div>';

        container.style.display = 'block';
    }

    function updateTrackInfo(track) {
        const img = container.querySelector('.album-art');
        if (img) img.src = track.albumArt;

        const title = container.querySelector('.track-title');
        if (title) title.textContent = track.title;

        const artist = container.querySelector('.track-artist');
        if (artist) artist.textContent = track.artist;

        const bodyLink = container.querySelector('.listening-body');
        if (bodyLink) bodyLink.href = track.url;

        const footerLink = container.querySelector('.listening-link');
        if (footerLink) footerLink.href = track.url;

        const total = container.querySelector('.listening-time-total');
        if (total) total.textContent = formatTime(track.durationMs);

        const bar = container.querySelector('.listening-progress-bar');
        if (bar) bar.setAttribute('aria-valuemax', track.durationMs);
    }

    async function updateListening() {
        try {
            const res = await fetch('/api/spotify/currently-playing?userId=' + encodeURIComponent(userId));
            if (!res.ok) return;

            const data = await res.json();
            const track = data.currentlyListening;

            if (track && track.isPlaying) {
                if (!currentTrackId) {
                    currentTrackId = track.url;
                    createCard(track);
                    playback = { progressMs: track.progressMs || 0, durationMs: track.durationMs, syncAt: Date.now() };
                    const pct = track.durationMs ? Math.min(100, (track.progressMs / track.durationMs) * 100) : 0;
                    animateProgress(pct, 500);
                } else if (track.url !== currentTrackId) {
                    currentTrackId = track.url;
                    animateProgress(0, 400, () => {
                        updateTrackInfo(track);
                        playback = { progressMs: track.progressMs, durationMs: track.durationMs, syncAt: Date.now() };
                        const pct = track.durationMs ? Math.min(100, (track.progressMs / track.durationMs) * 100) : 0;
                        animateProgress(pct, 400);
                    });
                } else {
                    const localMs = getProgressMs();
                    const apiMs = Number(track.progressMs) || 0;
                    if (apiMs > localMs + 3000) {
                        playback = { progressMs: apiMs, durationMs: track.durationMs, syncAt: Date.now() };
                        animateProgress(track.durationMs ? Math.min(100, (apiMs / track.durationMs) * 100) : 0, 350);
                    }
                }
            } else {
                if (currentTrackId) {
                    currentTrackId = null;
                    animateProgress(0, 500, () => {
                        playback = null;
                        container.style.display = 'none';
                        container.innerHTML = '';
                    });
                }
            }
        } catch (err) {
            console.error('[Spotify Listening]', err);
        }
    }

    updateListening();
    setInterval(updateListening, 5000);
    setInterval(updateProgressUI, 1000);
})();
