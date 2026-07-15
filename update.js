const fs = require('fs');

async function updateData() {
    try {
        // Fetch CISA KEV JSON
        const response = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
        if (!response.ok) throw new Error('Failed to fetch CISA feed');
        
        const data = await response.json();
        const threats = (data.vulnerabilities || [])
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, 10);

        // Build HTML table rows
        let htmlRows = '';
        threats.forEach(t => {
            const rBadge = t.knownRansomwareCampaignUse === 'Known' 
                ? '<span class="ransomware-tag">YES</span>' 
                : '<span style="color:#71717a">No</span>';
                
            htmlRows += `
            <tr>
                <td>
                    <a class="cve-link" href="https://nvd.nist.gov/vuln/detail/${t.cveID}" target="_blank">
                        ${t.cveID}
                    </a>
                </td>
                <td><strong>${escapeHtml(t.vendorProject)}</strong><br><span style="color:#a1a1aa">${escapeHtml(t.product)}</span></td>
                <td>
                    <strong>${escapeHtml(t.vulnerabilityName)}</strong>
                    <div style="font-size:11px; color:#a1a1aa; margin-top:4px;">${escapeHtml(t.shortDescription)}</div>
                </td>
                <td style="white-space: nowrap;">${t.dateAdded}</td>
                <td style="text-align: center;">${rBadge}</td>
            </tr>`;
        });

        // Read index.html and swap the old data out for the new data
        let indexHtml = fs.readFileSync('index.html', 'utf8');
        const regex = /()[\s\S]*()/;
        indexHtml = indexHtml.replace(regex, `$1${htmlRows}$2`);
        
        fs.writeFileSync('index.html', indexHtml);
        console.log('Successfully compiled CISA data into index.html!');
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
