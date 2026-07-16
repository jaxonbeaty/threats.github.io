const fs = require('fs');

async function updateAllIssues() {
    try {
        const [msrcRes, statusRes] = await Promise.all([
            fetch('https://api.msrc.microsoft.com/update-guide/rss'),
            fetch('https://status.office.com/feed/rss')
        ]);

        const msrcXml = await msrcRes.text();
        const statusXml = await statusRes.text();

        const parseRSS = (xml) => {
            const items = [];
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;
            while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
                const content = match[1];
                items.push({
                    title: (content.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Update',
                    link: (content.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '#',
                    desc: (content.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || ''
                });
            }
            return items;
        };

        const securityItems = parseRSS(msrcXml);
        const operationalItems = parseRSS(statusXml);

        const generateCards = (items, type) => items.map(item => `
            <div class="card">
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-meta">${type === 'security' ? 'Security Advisory' : 'Service Status'}</div>
                <a href="${item.link}" target="_blank" class="card-link">View Details &rarr;</a>
            </div>`).join('');

        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="3600">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 15px; }
        h2 { font-size: 16px; margin: 0 0 15px 0; border-left: 3px solid #0078d4; padding-left: 10px; }
        .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .column { display: flex; flex-direction: column; gap: 10px; }
        .card { background: #1e293b; border: 1px solid #334155; padding: 12px; border-radius: 4px; }
        .card-title { font-size: 13px; font-weight: 600; margin-bottom: 5px; color: #e2e8f0; }
        .card-meta { font-size: 10px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
        .card-link { font-size: 11px; color: #38bdf8; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <h2>Microsoft Issues</h2>
    <div class="dashboard">
        <div class="column">
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Services</div>
            ${operationalItems.length > 0 ? generateCards(operationalItems, 'service') : '<div class="card" style="border:none; color:#10b981;">All Systems Online</div>'}
        </div>
        <div class="column">
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Security</div>
            ${securityItems.length > 0 ? generateCards(securityItems, 'security') : '<div class="card" style="border:none; color:#10b981;">No Faults Found</div>'}
        </div>
    </div>
    <div style="text-align: center; font-size: 9px; color: #475569; margin-top: 20px;">
        Last Sync (EST): ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
    </div>
</body>
</html>`;

        fs.writeFileSync('issues.html', fullHtml);
    } catch (err) { console.error(err); }
}

function escapeHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
updateAllIssues();
