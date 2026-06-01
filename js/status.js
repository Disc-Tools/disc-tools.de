function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let currentData = null;

async function fetchStatus() {
    const overallDiv = document.getElementById('overall-status');
    const componentsDiv = document.getElementById('components-list');
    const refreshBtn = document.querySelector('.status-refresh-btn');
    const refreshIcon = refreshBtn ? refreshBtn.querySelector('i') : null;

    if (refreshIcon) refreshIcon.classList.add('spinning');

    try {
        const response = await fetch('/api/proxy/discord-status');
        const data = await response.json();
        currentData = data;

        // Display Overall Status
        const statusColor = getStatusColor(data.status.indicator);
        let iconClass = 'fa-circle-check';
        if (data.status.indicator !== 'none') iconClass = 'fa-triangle-exclamation';
        
        let incidentsHtml = '';
        if (data.incidents && data.incidents.length > 0) {
            incidentsHtml = `
                <div class="active-incident-card" style="margin-top: 25px; padding: 20px; background: rgba(240, 71, 71, 0.1); border: 1px solid rgba(240, 71, 71, 0.3); border-radius: 12px; text-align: left; cursor: pointer;" data-incident-id="${escapeHtml(data.incidents[0].id)}">
                    <h3 style="font-family: var(--sans); font-size: 16px; color: #f04747; margin-bottom: 10px;">
                        <i class="fa-solid fa-bullhorn"></i> Active Incident (Click for details)
                    </h3>
                    <div style="margin-bottom: 5px;">
                        <strong style="color: #fff; font-size: 14px; display: block; margin-bottom: 5px;">${escapeHtml(data.incidents[0].name)}</strong>
                        <p style="font-family: var(--mono); font-size: 12px; color: var(--text); line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(data.incidents[0].incident_updates[0].body)}</p>
                    </div>
                </div>
            `;
        }

        overallDiv.innerHTML = `
            <i class="fa-solid ${iconClass}" style="font-size: 48px; color: ${statusColor}; margin-bottom: 20px;"></i>
            <h2 style="font-family: var(--sans); font-size: 28px; margin-bottom: 10px;">${escapeHtml(data.status.description)}</h2>
            <p style="font-family: var(--mono); font-size: 13px; color: var(--muted);">Last update acknowledgment: ${escapeHtml(new Date(data.page.updated_at).toLocaleString())}</p>
            ${incidentsHtml}
        `;
        overallDiv.style.borderColor = statusColor;

        const activeCard = document.querySelector('.active-incident-card');
        if (activeCard) {
            activeCard.addEventListener('click', function() {
                const id = this.getAttribute('data-incident-id');
                showIncidentDetails(id);
            });
        }

        // Display Components
        componentsDiv.innerHTML = data.components.map(comp => {
            const isApi = comp.id === 'tkv66gt95jkp'; // API component ID
            const detailLabel = isApi ? `View detailed metrics` : `Click for incident history`;
            
            return `
                <div class="tool-card status-component-card" style="cursor: pointer; --card-accent: ${escapeHtml(getStatusColor(comp.status))}" data-component-id="${escapeHtml(comp.id)}" data-is-api="${isApi}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div class="tool-card-title" style="margin-bottom: 0;">${escapeHtml(comp.name)}</div>
                        <span class="category-badge" style="background: ${escapeHtml(getStatusColor(comp.status))}20; color: ${escapeHtml(getStatusColor(comp.status))}; border-color: ${escapeHtml(getStatusColor(comp.status))}40;">
                            ${escapeHtml(comp.status.replace('_', ' '))}
                        </span>
                    </div>
                    <div class="tool-card-desc">${escapeHtml(comp.description || 'No description provided.')}</div>
                    <div style="margin-top: 15px; font-family: var(--mono); font-size: 10px; color: var(--muted);">${escapeHtml(detailLabel)} <i class="fa-solid fa-chevron-right"></i></div>
                </div>
            `;
        }).join('');

        componentsDiv.querySelectorAll('.status-component-card').forEach(card => {
            card.addEventListener('click', function() {
                const isApi = this.getAttribute('data-is-api') === 'true';
                if (isApi) {
                    window.location.href = './api/';
                } else {
                    const id = this.getAttribute('data-component-id');
                    showComponentDetails(id);
                }
            });
        });

    } catch (error) {
        overallDiv.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; color: #f04747; margin-bottom: 20px;"></i>
            <h2 style="font-family: var(--sans); font-size: 28px; margin-bottom: 10px;">Connection Error</h2>
            <p style="font-family: var(--mono); font-size: 13px; color: var(--muted);">Failed to fetch status from Discord API.</p>
        `;

    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('spinning'), 500);
        }
    }
}

function showIncidentDetails(incidentId) {
    if (!currentData) return;
    const incident = currentData.incidents.find(i => i.id === incidentId);
    if (!incident) return;

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <span class="hero-tag">// incident report</span>
        <h2 style="font-family: var(--sans); color: #fff; margin: 15px 0;">${escapeHtml(incident.name)}</h2>
        <div style="margin-bottom: 20px;">
            <span class="category-badge" style="background: rgba(240, 71, 71, 0.1); color: #f04747; border-color: #f04747;">${escapeHtml(incident.status.toUpperCase())}</span>
            <span class="category-badge">${escapeHtml(incident.impact.toUpperCase())} IMPACT</span>
        </div>
        
        <div style="max-height: 300px; overflow-y: auto; padding-right: 10px;">
            ${incident.incident_updates.map(update => `
                <div class="incident-update">
                    <div style="font-family: var(--mono); font-size: 11px; color: var(--muted); margin-bottom: 8px;">${escapeHtml(new Date(update.created_at).toLocaleString())} - ${escapeHtml(update.status.toUpperCase())}</div>
                    <p style="font-size: 14px; line-height: 1.6; color: var(--text);">${escapeHtml(update.body)}</p>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('status-modal').style.display = 'flex';
}

function showComponentDetails(componentId) {
    if (!currentData) return;
    const component = currentData.components.find(c => c.id === componentId);
    if (!component) return;

    // Find incidents related to this component
    const relatedIncidents = currentData.incidents.filter(inc => 
        inc.components.some(c => c.id === componentId)
    );

    const modalBody = document.getElementById('modal-body');
    let incidentListHtml = '<p style="color: var(--muted); font-size: 14px;">No active incidents reported for this specific component.</p>';
    
    if (relatedIncidents.length > 0) {
        incidentListHtml = relatedIncidents.map(inc => `
            <div class="incident-update related-incident-card" style="border-color: #f04747; background: rgba(240, 71, 71, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 10px; cursor: pointer;" data-incident-id="${escapeHtml(inc.id)}">
                <strong style="color: #fff; display: block; margin-bottom: 5px;">${escapeHtml(inc.name)}</strong>
                <p style="font-size: 12px; opacity: 0.8;">${escapeHtml(inc.incident_updates[0].body.substring(0, 100))}...</p>
            </div>
        `).join('');
    }

    modalBody.innerHTML = `
        <span class="hero-tag">// component status</span>
        <h2 style="font-family: var(--sans); color: #fff; margin: 15px 0;">${escapeHtml(component.name)}</h2>
        <div style="margin-bottom: 30px;">
            <span class="category-badge" style="background: ${escapeHtml(getStatusColor(component.status))}20; color: ${escapeHtml(getStatusColor(component.status))}; border-color: ${escapeHtml(getStatusColor(component.status))}40;">
                ${escapeHtml(component.status.toUpperCase())}
            </span>
        </div>
        
        <h3 style="font-family: var(--sans); font-size: 16px; color: #fff; margin-bottom: 15px;">Active Issues</h3>
        ${incidentListHtml}
        
        <p style="margin-top: 30px; font-size: 12px; color: var(--muted); line-height: 1.5;">
            ${escapeHtml(component.description || 'This component represents a core part of the Discord infrastructure.')}
        </p>
    `;

    modalBody.querySelectorAll('.related-incident-card').forEach(card => {
        card.addEventListener('click', function() {
            const id = this.getAttribute('data-incident-id');
            showIncidentDetails(id);
        });
    });

    document.getElementById('status-modal').style.display = 'flex';
}

function closeModal(event) {
    document.getElementById('status-modal').style.display = 'none';
}

function getStatusColor(indicator) {
    switch (indicator) {
        case 'none':
        case 'operational':
            return '#43b581'; // Green
        case 'minor':
        case 'degraded_performance':
            return '#faa61a'; // Orange
        case 'major':
        case 'partial_outage':
            return '#f26522'; // Dark Orange
        case 'critical':
        case 'major_outage':
            return '#f04747'; // Red
        default:
            return '#747f8d'; // Gray
    }
}

fetchStatus();
