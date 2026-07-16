const fs = require('fs');

async function updateAllIssues() {
    try {
        console.log('Fetching feeds...');
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

        let cardHtml = '';

        operationalItems.forEach(item => {
            cardHtml += `<div class="issue-card" style="border-left: 4px solid #f59e0b;"><div class="card-header"><span class="platform-badge" style="background:#f59e0b22; color:#f59e0b;">Operational</span></div><div class="issue-title">${escapeHtml(item.title)}</div><div class="description">${escapeHtml(item.desc.substring(0, 100))}...</div><div class="card-footer"><a class="source-link" href="${item.link}" target="_blank">View Status &rarr;</a></div></div>`;
        });

        securityItems.forEach(item => {
            cardHtml += `<div class="issue-card"><div class="card-header"><span class="platform-badge">Security</span></div><div class="issue-title">${escapeHtml(item.title)}</div><div class="card-footer"><a class="source-link" href="${item.link}" target="_blank">View Advisory &rarr;</a></div></div>`;
        });

        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="3600">
    <meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate">
    <style>
        body { font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 10px; font-size: 13px; }
        .issue-card { background-color: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
        .issue-title { font-weight: bold; margin-bottom: 5px; }
        .platform-badge { font-size: 10px; padding: 2px 5px; border-radius: 3px; font-weight: bold; }
        .source-link { color: #60a5fa; text-decoration: none; font-size: 11px; }
        .description { font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
    </style>
</head>
<body>
    ${cardHtml}
    <div style="text-align: center; font-size: 9px; color: #475569; margin-top: 10px;">
        Last Sync (EST): ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
    </div>
</body>
</html>`;

        fs.writeFileSync('issues.html', fullHtml);
    } catch (err) { console.error(err); }
}

function escapeHtml(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
updateAllIssues();
