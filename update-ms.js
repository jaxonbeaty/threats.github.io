const fs = require('fs');

async function updateMicrosoftIssues() {
    try {
        console.log('Fetching Microsoft Release Health information...');
        
        // Fetching from a reliable parsed endpoint of the Microsoft Release Health feed
        const response = await fetch('https://senserva.com/api/hot.json');
        if (!response.ok) throw new Error('Failed to fetch Microsoft updates API');
        
        const rawData = await response.json();
        
        // Grab the top 10 most critical/hot Microsoft updates
        const issues = (rawData.patches || [])
            .slice(0, 10);

        let cardHtml = '';
        
        if (issues.length === 0) {
            cardHtml = `
            <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                No active critical issues reported at this time.
            </div>`;
        } else {
            issues.forEach(issue => {
                // Determine severity badge styling dynamically
                let severityBadge = '';
                const score = parseFloat(issue.score || 0);
                
                if (score >= 7.5 || issue.isKev) {
                    severityBadge = '<span class="status-active">Critical / Exploited</span>';
                } else if (score >= 5.0) {
                    severityBadge = '<span class="status-mitigated">Important</span>';
                } else {
                    severityBadge = '<span class="status-resolved">Moderate</span>';
                }

                const kbLink = issue.kb 
                    ? `<a class="source-link" href="https://support.microsoft.com/help/${issue.kb}" target="_blank">KB${issue.kb} Detail &rarr;</a>`
                    : `<a class="source-link" href="https://learn.microsoft.com/en-us/windows/release-health/" target="_blank">Release Health &rarr;</a>`;

                cardHtml += `
            <div class="issue-card">
                <div class="card-header">
                    <span class="platform-badge">${escapeHtml(issue.vendor || 'Microsoft')}</span>
                    ${severityBadge}
                </div>
                <div class="issue-title">
                    ${escapeHtml(issue.title || 'Security Update')}
                </div>
                <div class="issue-details">
                    <strong>KB:</strong> ${issue.kb ? `KB${issue.kb}` : 'N/A'} &bull; 
                    <strong>CVSS:</strong> ${issue.score || 'N/A'} &bull;
                    <strong>Published:</strong> ${escapeHtml(issue.dateAdded || 'Recently')}
                </div>
                <div class="description">
                    ${escapeHtml(issue.summary || 'Check the KB detail link to view impacted platforms, CVE associations, and patch installation steps.')}
                </div>
                <div class="card-footer">
                    ${kbLink}
                </div>
            </div>`;
            });
        }

        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Microsoft Known Issues</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #0078d4; /* Microsoft Blue */
            --border: #334155;
            
            --resolved: #10b981;
            --mitigated: #f59e0b;
            --active: #ef4444;
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
            background-color: var(--accent);
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 8px var(--accent);
        }

        .badge-ms {
            background-color: #f25022; /* Microsoft Red/Orange */
            color: #ffffff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }

        .issue-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .issue-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .issue-card:hover {
            border-color: #475569;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .platform-badge {
            background-color: rgba(0, 120, 212, 0.1);
            color: #60a5fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }

        .status-active {
            color: var(--active);
            font-size: 11px;
            font-weight: bold;
        }

        .status-mitigated {
            color: var(--mitigated);
            font-size: 11px;
            font-weight: bold;
        }

        .status-resolved {
            color: var(--resolved);
            font-size: 11px;
            font-weight: bold;
        }

        .issue-title {
            font-weight: 700;
            font-size: 13px;
            color: #f1f5f9;
            margin-bottom: 4px;
            line-height: 1.3;
        }

        .issue-details {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .description {
            font-size: 11px;
            color: var(--text-secondary);
            line-height: 1.4;
            margin-bottom: 8px;
        }

        .card-footer {
            margin-top: 4px;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .attribution {
            color: #475569;
            font-size: 9px;
        }

        .attribution a {
            color: #475569;
            text-decoration: none;
        }

        .source-link {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 600;
        }

        .source-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>

    <div class="header">
        <h2><span class="feed-indicator"></span> Microsoft Hot Patches & Issues</h2>
        <span class="badge-ms">MSRC Feed</span>
    </div>

    <div class="issue-container">
        ${cardHtml}
    </div>

    <div style="margin-top: 15px; text-align: center;" class="attribution">
        Data provided by <a href="https://senserva.com" target="_blank">Senserva</a>
    </div>

</body>
</html>`;

        fs.writeFileSync('issues.html', fullHtml);
        console.log('Successfully generated issues.html!');
    } catch (err) {
        console.error('Error during Microsoft dashboard compile:', err);
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

updateMicrosoftIssues();
