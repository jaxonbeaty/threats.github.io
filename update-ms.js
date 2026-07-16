const fs = require('fs');

async function updateMicrosoftIssues() {
    try {
        console.log('Fetching Microsoft Security Update RSS Feed...');
        
        const response = await fetch('https://api.msrc.microsoft.com/update-guide/rss');
        if (!response.ok) throw new Error('Failed to fetch MSRC feed');
        
        const xmlText = await response.text();
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        
        while ((match = itemRegex.exec(xmlText)) !== null && items.length < 10) {
            const itemContent = match[1];
            
            const title = (itemContent.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Security Update';
            const link = (itemContent.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || 'https://msrc.microsoft.com/update-guide';
            const description = (itemContent.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
            const pubDate = (itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
            
            const kbMatch = title.match(/KB\s*(\d+)/i) || description.match(/KB\s*(\d+)/i);
            const kb = kbMatch ? kbMatch[1] : 'N/A';
            const cveMatch = title.match(/CVE-\d+-\d+/i) || description.match(/CVE-\d+-\d+/i);
            const cve = cveMatch ? cveMatch[0] : 'N/A';

            items.push({ title, link, description, pubDate, kb, cve });
        }

        let cardHtml = '';
        if (items.length === 0) {
            cardHtml = `<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No active critical issues reported at this time.</div>`;
        } else {
            items.forEach(issue => {
                const cleanDate = issue.pubDate ? new Date(issue.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';
                let cleanDesc = issue.description.replace(/<[^>]*>/g, '').replace(/&lt;.*?&gt;/g, '').substring(0, 180) + '...';
                cardHtml += `
            <div class="issue-card">
                <div class="card-header">
                    <span class="platform-badge">${escapeHtml(issue.cve !== 'N/A' ? issue.cve : 'Security Advisory')}</span>
                    <span class="status-active">Active Update</span>
                </div>
                <div class="issue-title">${escapeHtml(issue.title.replace(/&amp;/g, '&'))}</div>
                <div class="issue-details"><strong>KB:</strong> ${issue.kb !== 'N/A' ? `KB${issue.kb}` : 'See Link'} &bull; <strong>Released:</strong> ${cleanDate}</div>
                <div class="description">${escapeHtml(cleanDesc)}</div>
                <div class="card-footer"><a class="source-link" href="${issue.link}" target="_blank">View MSRC Advisory &rarr;</a></div>
            </div>`;
            });
        }

        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="pragma" content="no-cache">
    <meta http-equiv="expires" content="0">
    <title>Microsoft Known Issues</title>
    <style>
        :root { --bg-color: #0f172a; --card-bg: #1e293b; --text-primary: #f8fafc; --text-secondary: #94a3b8; --border: #334155; --active: #f43f5e; }
        body { font-family: -apple-system, sans-serif; background-color: var(--bg-color); color: var(--text-primary); margin: 0; padding: 12px; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 12px; }
        h2 { margin: 0; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .feed-indicator { width: 8px; height: 8px; background-color: var(--active); border-radius: 50%; box-shadow: 0 0 8px var(--active); }
        .badge-ms { background-color: #0078d4; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .issue-container { display: flex; flex-direction: column; gap: 10px; }
        .issue-card { background-color: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px; }
        .card-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .platform-badge { background-color: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        .status-active { color: var(--active); font-size: 11px; font-weight: bold; }
        .issue-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
        .issue-details, .description { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
        .source-link { color: #3b82f6; text-decoration: none; font-weight: 600; }
        .attribution { color: #475569; font-size: 9px; margin-top: 15px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h2><span class="feed-indicator"></span>Microsoft Security Issues</h2>
        <span class="badge-ms">MSRC RSS</span>
    </div>
    <div class="issue-container">${cardHtml}</div>
    <div class="attribution">
        Source: Official Microsoft Security Response Center Feed <br>
        <a href="https://x.com/msftsecresponse" target="_blank" style="color: #60a5fa; text-decoration: underline;">
            Follow MSRC on X (Twitter) for real-time updates &rarr;
        </a>
    </div>
    <div style="margin-top: 20px; text-align: center; font-size: 8px; color: #475569;">
        Last Updated (EST): ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
    </div>
</body>
</html>`;

        fs.writeFileSync('issues.html', fullHtml);
        console.log('Successfully generated issues.html with MSRC data!');
    } catch (err) {
        console.error('Error during Microsoft dashboard compile:', err);
        process.exit(1);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

updateMicrosoftIssues();
