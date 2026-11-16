async function showMemberCount(statId, endpoint, field) {
    const stat = document.getElementById(statId);

    try {
        const response = await fetch(endpoint);
        if (!response.ok) return;

        const data = await response.json();
        const count = data?.[field];
        if (!Number.isSafeInteger(count) || count < 0) return;

        animateStat(stat.querySelector('dd'), count, 1250);
    } catch {
        // Keep the placeholder when its count is unavailable.
    }
}

const toolCount = document.getElementById('tool-count');
animateStat(toolCount, Number(toolCount.textContent), 950);
showMemberCount('member-stat', '/api/guilds/1502369884322136326', 'approximate_member_count');
showMemberCount('total-member-stat', '/api/stats', 'totalUsers');
