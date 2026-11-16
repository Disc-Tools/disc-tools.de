const statNumberFormat = new Intl.NumberFormat(document.documentElement.lang);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function animateStat(element, target, duration) {
    const value = statNumberFormat.format(target);
    if (reducedMotion.matches || target === 0 || typeof element.animate !== 'function') {
        element.textContent = value;
        return;
    }

    const accessibleValue = document.createElement('span');
    accessibleValue.className = 'stat-readable';
    accessibleValue.textContent = value;

    const reels = document.createElement('span');
    reels.setAttribute('aria-hidden', 'true');
    const animations = [];

    for (const [index, character] of Array.from(value).entries()) {
        if (!/^[0-9]$/.test(character)) {
            reels.append(character);
            continue;
        }

        const steps = 10 + Number(character);
        const viewport = document.createElement('span');
        viewport.className = 'stat-digit';
        const strip = document.createElement('span');
        strip.className = 'stat-reel';

        for (let step = 0; step <= steps; step++) {
            const digit = document.createElement('span');
            digit.textContent = String(step % 10);
            strip.append(digit);
        }

        viewport.append(strip);
        reels.append(viewport);
        animations.push({ strip, steps, delay: index * 65 });
    }

    element.replaceChildren(accessibleValue, reels);
    const finished = animations.map(({ strip, steps, delay }) => strip.animate(
        [{ transform: 'translateY(0)' }, { transform: `translateY(${-steps * 100 / (steps + 1)}%)` }],
        { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
    ).finished);

    Promise.allSettled(finished).then(() => { element.textContent = value; });
}
