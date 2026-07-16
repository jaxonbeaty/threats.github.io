const fs = require('fs');

async function updateAllIssues() {
    try {
        console.log('Fetching feeds...');
        
        // Fetch BOTH feeds
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
            while ((match = itemRegex.exec(xml)) !== null && items.length < 4) {
                const content = match[1];
                items.push({
                    title: (content.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'Update',
                    link: (content.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '#',
                    desc: (content.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '',
                    pubDate: (content.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || ''
                });
            }
            return items;
        };

        const securityItems = parseRSS(msrcXml);
        const operationalItems = parseRSS(statusXml);

        // --- SERVICE TILES LOGIC ---
        const combinedOpText = operationalItems.map(i => (i.title + " " + i.desc).toLowerCase()).join(" ");
        
        const coreServices = [
            { name: 'Microsoft 365', keywords: ['microsoft 365', 'm365', 'office', 'portal', 'suite'] },
            { name: 'MS Teams', keywords: ['teams'] },
            { name: 'Exchange Online', keywords: ['exchange', 'email', 'outlook'] },
            { name: 'SharePoint', keywords: ['sharepoint', 'onedrive'] }
        ];

        let tilesHtml = coreServices.map(svc => {
            const hasIssue = svc.keywords.some(kw => combinedOpText.includes(kw));
            const statusText = hasIssue ? 'Degraded' : 'Online';
            const statusClass = hasIssue ? 'status-issue' : 'status-online';
            
            return `
            <div class="tile">
                <div class="tile-name">${svc.name}</div>
                <div class="tile-status ${statusClass}">${statusText}</div>
            </div>`;
        }).join('');

        // --- SECURITY CARDS LOGIC ---
        let secHtml = '';
        if (securityItems.length > 0) {
            secHtml = securityItems.map(item => {
                const dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
                const cleanDate = dateObj.toISOString().split('T')[0];
                const cleanDesc = item.desc.replace(/<[^>]*>/g, '').replace(/&lt;.*?&gt;/g, '').substring(0, 180) + '...';
                
                return `
                <div class="cve-card">
                    <div class="cve-header">
                        <a href="${item.link}" target="_blank" class="cve-title">${escapeHtml(item.title)}</a>
                        <span class="cve-date">Added ${cleanDate}</span>
                    </div>
                    <div class="cve-desc">${escapeHtml(cleanDesc)}</div>
                </div>`;
            }).join('');
        } else {
            secHtml = `
            <div class="cve-card" style="text-align: center; color: #10b981; padding: 20px;">
                No Active Critical Security Threats
            </div>`;
        }

        // --- HTML TEMPLATE ---
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="3600">
    <meta http-equiv="cache-control" content="no-cache, no-store, must-revalidate">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            background-color: transparent; 
            color: #cbd5e1; 
            margin: 0; 
            padding: 10px; 
        }
        
        .header-container { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 1px solid #1e293b; 
            padding-bottom: 12px; 
            margin-bottom: 15px; 
        }
        .header-title { 
            display: flex; 
            align-items: center; 
            font-size: 15px; 
            font-weight: 600; 
            color: #f8fafc; 
        }
        .dot { 
            height: 8px; 
            width: 8px; 
            background-color: #10b981; 
            border-radius: 50%; 
            display: inline-block; 
            margin-right: 8px; 
            box-shadow: 0 0 5px #10b981; 
        }
        .feed-btn { 
            background-color: #0052cc; 
            color: white; 
            padding: 4px 10px; 
            border-radius: 4px; 
            font-size: 11px; 
            font-weight: 600; 
            text-decoration: none; 
        }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .section-title {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .tiles-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        /* --- BORDER COLOR UPDATED HERE --- */
        .tile {
            border: 1px solid #314158; /* Changed from #1e293b to match right widget */
            background-color: rgba(15, 23, 42, 0.4);
            border-radius: 4px;
            padding: 12px;
            text-align: center;
        }
        .tile-name {
            font-size: 12px;
            color: #f8fafc;
            margin-bottom: 6px;
        }
        .tile-status {
            font-size: 11px;
            font-weight: 700;
        }
        .status-online { color: #10b981; }
        .status-issue { color: #f59e0b; }

        /* --- BORDER COLOR UPDATED HERE --- */
        .cve-card {
            border: 1px solid #314158; /* Changed from #1e293b to match right widget */
            background-color: rgba(15, 23, 42, 0.4);
            border-radius: 6px;
            padding: 14px;
            margin-bottom: 10px;
        }
        
        .cve-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            align-items: flex-start;
        }
        .cve-title {
            color: #38bdf8;
            font-weight: 600;
            font-size: 13px;
            text-decoration: none;
            max-width: 75%;
        }
        .cve-title:hover { text-decoration: underline; }
        .cve-date {
            color: #94a3b8;
            font-size: 11px;
        }
        .cve-desc {
            font-size: 11px;
            line-height: 1.5;
            color: #cbd5e1;
        }
    </style>
</head>
<body>

    <div class="header-container">
        <div class="header-title"><span class="dot"></span> Active Microsoft Issues</div>
        <a href="https://status.office.com/" target="_blank" class="feed-btn">MS Status Feed</a>
    </div>

    <div class="main-grid">
        <div>
            <div class="section-title">Core Services</div>
            <div class="tiles-grid">
                ${tilesHtml}
            </div>
        </div>

        <div>
            <div class="section-title">Latest Security Advisories</div>
            ${secHtml}
        </div>
    </div>

    <div style="text-align: right; font-size: 9px; color: #475569; margin-top: 15px;">
        Last Sync (EST): ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
    </div>

</body>
</html>`;

        fs.writeFileSync('issues.html', fullHtml);
        console.log('Successfully generated issues.html');
    } catch (err) { 
        console.error('Error generating dashboard:', err);
        process.exit(1);
    }
}

function escapeHtml(str) { 
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); 
}

updateAllIssues();
