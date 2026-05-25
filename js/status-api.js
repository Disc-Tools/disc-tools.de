let highestPing = 0;
const API_COMPONENT_ID = 'tkv66gt95jkp'; // Official ID for Discord API component

async function measurePing() {
    const start = Date.now();
    const pingDisplay = document.getElementById('current-ping');
    const highestDisplay = document.getElementById('highest-ping');
    const indicator = document.querySelector('.ping-indicator');
    const statusText = document.getElementById('ping-status');

    try {
        // We use a non-existent endpoint or a small one with CORS allowed if possible.
        // Since we can't easily ping discord.com/api due to CORS, we try to fetch a public asset or just the domain.
        // Actually, fetching 'https://discord.com/api/v9/gateway' often works for simple GET if not blocked.
        const response = await fetch('https://discord.com/api/v9/gateway', { mode: 'no-cors', cache: 'no-cache' });
        const latency = Date.now() - start;

        pingDisplay.textContent = `${latency} ms`;
        
        if (latency > highestPing) {
            highestPing = latency;
            highestDisplay.textContent = `${highestPing} ms`;
        }

        // Color coding
        if (latency < 150) {
            indicator.style.background = '#43b581';
            statusText.innerHTML = '<div class="ping-indicator" style="background:#43b581"></div> Excellent';
        } else if (latency < 400) {
            indicator.style.background = '#faa61a';
            statusText.innerHTML = '<div class="ping-indicator" style="background:#faa61a"></div> High Latency';
        } else {
            indicator.style.background = '#f04747';
            statusText.innerHTML = '<div class="ping-indicator" style="background:#f04747"></div> Very Slow';
        }

    } catch (err) {
        pingDisplay.textContent = 'Offline';
        indicator.style.background = '#f04747';
        statusText.innerHTML = '<div class="ping-indicator" style="background:#f04747"></div> API Unreachable';
    }
}

async function fetchApiIncidents() {
    const incidentContainer = document.getElementById('api-incidents');
    
    try {
        const response = await fetch('https://discordstatus.com/api/v2/summary.json');
        const data = await response.json();

        const apiIncidents = data.incidents.filter(inc => 
            inc.components.some(c => c.id === API_COMPONENT_ID)
        );

        if (apiIncidents.length > 0) {
            incidentContainer.innerHTML = apiIncidents.map(inc => `
                <div class="incident-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <h3 style="font-family: var(--sans); color: #fff; font-size: 18px;">${inc.name}</h3>
                        <span class="category-badge" style="background: rgba(240, 71, 71, 0.1); color: #f04747; border-color: #f04747;">${inc.status.toUpperCase()}</span>
                    </div>
                    <div style="border-left: 2px solid var(--accent); padding-left: 20px;">
                        <div style="font-family: var(--mono); font-size: 11px; color: var(--muted); margin-bottom: 5px;">Latest Update: ${new Date(inc.updated_at).toLocaleString()}</div>
                        <p style="font-size: 14px; line-height: 1.6; color: var(--text);">${inc.incident_updates[0].body}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Failed to fetch incidents:', err);
    }
}

// Initial calls
measurePing();
fetchApiIncidents();

// Refresh ping every 5 seconds
setInterval(measurePing, 5000);
