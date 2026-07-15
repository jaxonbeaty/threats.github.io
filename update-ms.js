const fs = require('fs');

async function updateMicrosoftIssues() {
    try {
        console.log('Fetching Microsoft Release Health information...');
        
        // Fetching from a reliable, open endpoint for Windows & MS updates
        const response = await fetch('https://feed.releasebot.io/updates/microsoft/windows');
        if (!response.ok) throw new Error('Failed to fetch Microsoft updates feed');
        
        const rawData = await response.json();
        
        // Grabbing the most recent 10 issues/news items
        const issues = (rawData.items || rawData.updates || [])
            .slice(0, 10);

        let cardHtml = '';
        issues.forEach(issue => {
            // Determine status color styling dynamically
            let statusBadge = '';
            const statusLower = (issue.status || '').toLowerCase();
            
            if (statusLower.includes('resolved') || statusLower.includes('fixed')) {
                statusBadge = '<span class="status-resolved">Resolved</span>';
            } else if (statusLower.includes('mitigated') || statusLower.includes('workaround')) {
                statusBadge = '<span class="status-mitigated">Mitigated</span>';
            } else {
                statusBadge = '<span class="status-active">Active / Confirmed</span>';
            }

            cardHtml += `
        <div class="issue-card">
            <div class="card-header">
                <span class="platform-badge">${escapeHtml(issue.platform || 'Windows 11 / Server')}</span>
                ${statusBadge}
            </div>
            <div class="issue-title">
                ${escapeHtml(issue.title || 'Windows Update Status Change')}
            </div>
            <div class="issue-details">
                <strong>KB Affected:</strong> ${escapeHtml(issue.kbArticle || 'N/A')} &bull; 
                <strong>Updated:</strong> ${escapeHtml(issue.dateAdded || issue.published_at || 'Recently')}
            </div>
            <div class="description">
                ${escapeHtml(issue.description || issue.summary || 'Click the link to read Microsoft\'s full advisory and mitigation steps.')}
            </div>
            <div class="card-footer">
                <a class="source-link" href="${issue.url || 'https://learn.microsoft.com/en-us/windows/release-health/'}" target="_blank">
                    View Microsoft Advisory &rarr;
                </a>
            </div>
        </div>`;
        });

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
            --accent: #00a4ef; /* Microsoft Blue */
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
            background-color: rgba(59, 130, 246, 0.1);
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
        }

        .source-link {
            color: #3b82f6;
            text-decoration: none;
            font-size: 11px;
            font-weight: 600;
        }

        .source-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>

    <div class="header">
        <h2><span class="feed-indicator"></span> Microsoft Known Issues</h2>
        <span class="badge-ms">Release Health</span>
    </div>

    <div class="issue-container">
        ${cardHtml}
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
