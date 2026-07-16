const fs = require('fs');

async function updateAllIssues() {
    try {
        // 1. Fetch BOTH feeds
        const [msrcRes, statusRes] = await Promise.all([
            fetch('https://api.msrc.microsoft.com/update-guide/rss'),
            fetch('https://status.office.com/feed/rss')
        ]);

        const msrcXml = await msrcRes.text();
        const statusXml = await statusRes.text();

        // 2. Parse both (Simplified helper)
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

        // 3. Generate HTML
        let cardHtml = '';

        // Add Operational Items (Service Health)
        operationalItems.forEach(item => {
            cardHtml += `
            <div class="issue-card" style="border-left: 4px solid #f59e0b;">
                <div class="card-header"><span class="platform-badge" style="background:#f59e0b22; color:#f59e0b;">Operational</span></div>
                <div class="issue-title">${escapeHtml(item.title)}</div>
                <div class="description">${escapeHtml(item.desc.substring(0, 100))}...</div>
                <div class="card-footer"><a class="source-link" href="${item.link}" target="_blank">Check Service Status &rarr;</a></div>
            </div>`;
        });

        // Add Security Items (CVEs)
        securityItems.forEach(item => {
            cardHtml += `
            <div class="issue-card">
                <div class="card-header"><span class="platform-badge">Security</span></div>
                <div class="issue-title">${escapeHtml(item.title)}</div>
                <div class="card-footer"><a class="source-link" href="${item.link}" target="_blank">View Advisory &rarr;</a></div>
            </div>`;
        });

        // ... (Include your fullHtml template here)
        // Ensure you paste the HTML/CSS template from the previous response
        // ...
        
        fs.writeFileSync('issues.html', fullHtml);
    } catch (err) {
        console.error('Update failed:', err);
    }
}
