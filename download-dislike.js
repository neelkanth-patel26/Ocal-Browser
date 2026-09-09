const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function downloadDislikeCountExtension() {
    try {
        console.log('Fetching latest release info for Return YouTube Dislike from GitHub...');
        const fetch = (await import('node-fetch')).default || require('cross-fetch');
        const res = await fetch('https://api.github.com/repos/Anarios/return-youtube-dislike/releases/latest');
        const data = await res.json();
        
        // Find the chrome.zip asset
        const asset = data.assets.find(a => a.name.includes('chrome.zip') || a.name.includes('chromium.zip'));
        if (!asset) {
            console.error('Chromium/Chrome zip not found in latest release assets.');
            console.log('Available assets:', data.assets.map(a => a.name));
            return;
        }
        
        const url = asset.browser_download_url;
        console.log(`Downloading ${url}...`);
        
        const zipFile = path.join(__dirname, 'dislike-ext.zip');
        const zipRes = await fetch(url);
        const buffer = await zipRes.arrayBuffer();
        
        fs.writeFileSync(zipFile, Buffer.from(buffer));
        console.log('Download complete. Extracting...');
        
        const destDir = path.join(__dirname, 'return-youtube-dislike-extension');
        if (fs.existsSync(destDir)) {
            fs.rmSync(destDir, { recursive: true, force: true });
        }
        
        const zip = new AdmZip(zipFile);
        zip.extractAllTo(destDir, true);
        
        fs.unlinkSync(zipFile);
        console.log('Done installing official Return YouTube Dislike extension.');
    } catch (err) {
        console.error('Error during download/extraction:', err);
    }
}

downloadDislikeCountExtension();
