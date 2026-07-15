const fs = require('fs');

async function updateData() {
    try {
        console.log('Fetching fresh CISA KEV data...');
        const response = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
        if (!response.ok) throw new Error('Failed to fetch CISA feed');
        
        const data = await response.json();
        const threats = (data.vulnerabilities || [])
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, 10);

        let cardHtml = '';
        threats.forEach(t => {
            const isRansomware = t.knownRansomwareCampaignUse === 'Known';
            const ransomwareBadge = isRansomware 
                ? '<span class="badge-danger">Ransomware Campaign</span>' 
                : '';
                
            cardHtml += `
        <div class="threat-card">
            <div class="card-header">
                <a class="cve-link" href="https://nvd.nist.gov/vuln/detail/${t.cveID}" target="_blank">
                    ${t.cveID}
                </a>
                <span class="date-badge">Added ${t.dateAdded}</span>
            </div>
            <div class="product-info">
                <strong>${escapeHtml(t.vendorProject)}</strong> &bull; ${escapeHtml(t.product)}
            </div>
            <div class="vuln-name">${escapeHtml(t.vulnerabilityName)}</div>
            <div class="description">${escapeHtml(t.shortDescription)}</div>
            ${ransomwareBadge ? `<div style="margin-top: 8px;">${ransomwareBadge}</div>` : ''}
        </div>`;
        });

        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Active Global Threats</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
            --danger: #ef4444;
            --border: #334155;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            margin: 0;
            padding: 12px;
            font-size: 13px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .feed-indicator {
            width: 8px;
            height: 8px;
            background-color: #10b981;
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 8px #10b981;
        }

        .badge-cisa {
            background-color: var(--accent);
            color: #ffffff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }

        .threat-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .threat-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .threat-card:hover {
            border-color: #475569;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .cve-link {
            color: #60a5fa;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
        }

        .cve-link:hover {
            text-decoration: underline;
        }

        .date-badge {
            font-size: 11px;
            color: var(--text-secondary);
        }

        .product-info {
            font-size: 12px;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .vuln-name {
            font-weight: 600;
            font-size: 12px;
            color: #f1f5f9;
            margin-bottom: 6px;
        }

        .description {
            font-size: 11px;
            color: var(--text-secondary);
            line-height: 1.4;
        }

        .badge-danger {
            display: inline-block;
            background-color: rgba(239, 68, 68, 0.15);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.4);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }
    </style>
</head>
<body>

    <div class="header">
        <h2><span class="feed-indicator"></span> Active Global Threats</h2>
        <span class="badge-cisa">CISA KEV Feed</span>
    </div>

    <div class="threat-container">
        ${cardHtml}
    </div>

</body>
</html>`;

        fs.writeFileSync('index.html', fullHtml);
        console.log('Successfully generated fresh index.html!');
    } catch (err) {
        console.error('Error during data compilation:', err);
        process.exit(1);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

updateData();
