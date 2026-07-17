const fs = require('fs');

// --- FEED URLS ---
// Replace the M365 and Power Platform URLs with your specific feed endpoints
const M365_RSS_URL = 'YOUR_M365_RSS_URL_HERE'; 
const POWER_PLATFORM_RSS_URL = 'YOUR_POWER_PLATFORM_RSS_URL_HERE';
const AZURE_RSS_URL = 'https://azurestatusprodaus.azurewebsites.net/en-us/status/feed/';
const CONSUMER_STATUS_URL = 'https://portal.office.com/servicestatus';
const MSRC_RSS_URL = 'https://api.msrc.microsoft.com/update-guide/rss';

async function updateAllIssues() {
    try {
        console.log('Fetching all feeds...');
        
        // Fetch all endpoints concurrently
        const [msrcRes, m365Res, azureRes, ppRes, consumerRes] = await Promise.all([
            fetch(MSRC_RSS_URL),
            fetch(M365_RSS_URL),
            fetch(AZURE_RSS_URL),
            fetch(POWER_PLATFORM_RSS_URL),
            fetch(CONSUMER_STATUS_URL)
        ]);

        const msrcXml = await msrcRes.text();
        const m365Xml = await m365Res.text();
        const azureXml = await azureRes.text();
        const ppXml = await ppRes.text();
        const consumerHtml = await consumerRes.text();

        // --- SECURITY FEED PARSER ---
        const parseSecurityRSS = (xml) => {
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

        const securityItems = parseSecurityRSS(msrcXml);

        // --- SERVICE STATUS PARSERS ---
        // Helper to check for <status>Available</status> in the XML
        const checkStatusTag = (xml) => {
            const match = xml.match(/<status>([^<]+)<\/status>/i);
            if (match && match[1].trim().toLowerCase() === 'available') {
                return true; // Online
            }
            return false; // Degraded
        };

        // M365 (Checks for <status>Available</status>)
        const m365Online = checkStatusTag(m365Xml);

        // Power Platform (Checks for <status>Available</status>)
        const ppOnline = checkStatusTag(ppXml);

        // Azure (Feed is empty of <item> tags when healthy)
        const azureOnline = !(/<item>/i.test(azureXml));

        // Consumer (Scrapes page for the standard healthy text string)
        const consumerOnline = consumerHtml.includes('Everything is up and running') || consumerHtml.includes('All services are running');

        // Build the Tile Array
        const coreServices = [
            { name: 'M365 Enterprise', isOnline: m365Online },
            { name: 'Azure', isOnline: azureOnline },
            { name: 'Power Platform', isOnline: ppOnline },
            { name: 'Microsoft Consumer', isOnline: consumerOnline }
        ];

        let tilesHtml = coreServices.map(svc => {
            const statusText = svc.isOnline ? 'Online' : 'Degraded';
            const statusClass = svc.isOnline ? 'status-online' : 'status-issue';
            
            return `
            <div class="tile">
                <div class="tile-name">${svc.name}</div>
                <div class="tile-status ${statusClass}">${statusText}</div>
            </div>`;
        }).join('');

        // --- SECURITY CARDS HTML ---
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
            border-bottom: 1px solid #2a3f5f; 
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
        
        .tile {
            border: 1px solid #2a3f5f; 
            background-color: #0b1325; 
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

        .cve-card {
            border: 1px solid #2a3f5f; 
            background-color: #0b1325; 
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
        <a href="https://status.cloud.microsoft/" target="_blank" class="feed-btn">Admin Center</a>
    </div>

    <div class="main-grid">
        <!-- Left Column: Services -->
        <div>
            <div class="section-title">Core Services</div>
            <div class="tiles-grid">
                ${tilesHtml}
            </div>
        </div>

        <!-- Right Column: Security -->
        <div>
            <div class="section-title">Latest Security Advisories</div>
            ${secHtml}
        </div>
    </div>

    <div style="text-align: right; font-size: 9px; color: #475569; margin-top: 15px;">
        Last Sync (EDT): ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
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
