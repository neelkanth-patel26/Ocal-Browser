const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function downloadUBlock() {
    try {
        console.log('Fetching latest release info from GitHub...');
        const fetch = (await import('node-fetch')).default || require('cross-fetch');
        const res = await fetch('https://api.github.com/repos/gorhill/uBlock/releases/latest');
        const data = await res.json();
        
        const asset = data.assets.find(a => a.name.endsWith('chromium.zip'));
        if (!asset) {
            console.error('Chromium zip not found in latest release.');
            return;
        }
        
        const url = asset.browser_download_url;
        console.log(`Downloading ${url}...`);
        
        const zipFile = path.join(__dirname, 'ublock.zip');
        const zipRes = await fetch(url);
        const buffer = await zipRes.arrayBuffer();
        
        fs.writeFileSync(zipFile, Buffer.from(buffer));
        console.log('Download complete. Extracting...');
        
        const destDir = path.join(__dirname, 'ublock-origin-extension');
        if (fs.existsSync(destDir)) {
            fs.rmSync(destDir, { recursive: true, force: true });
        }
        
        const zip = new AdmZip(zipFile);
        zip.extractAllTo(destDir, true);
        
        fs.unlinkSync(zipFile);
        console.log('Done installing uBlock Origin extension locally.');
    } catch (err) {
        console.error('Error:', err);
    }
}

downloadUBlock();
