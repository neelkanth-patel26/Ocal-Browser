const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN = process.env.GH_TOKEN;
const REPO = 'neelkanth-patel26/Ocal-Browser';

// Load version and release info
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const releaseInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'release_info.json'), 'utf8'));

const VERSION = pkg.version;
const TAG = `v${VERSION}`;
const FILE_PATH = path.join(__dirname, '..', 'dist-inno', `Ocal-${VERSION}-Setup.exe`);

async function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    console.log(`Creating release ${TAG}...`);
    const releaseData = JSON.stringify({
        tag_name: TAG,
        name: releaseInfo.name || TAG,
        body: releaseInfo.body || `Ocal Browser ${VERSION} Release - Built via Antigravity AI.`,
        draft: false,
        prerelease: true
    });

    const createRes = await request({
        hostname: 'api.github.com',
        path: `/repos/${REPO}/releases`,
        method: 'POST',
        headers: {
            'Authorization': `token ${TOKEN}`,
            'User-Agent': 'Ocal-Build-Agent',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(releaseData)
        }
    }, releaseData);

    let release;
    if (createRes.statusCode === 201) {
        release = JSON.parse(createRes.body);
        console.log(`Release created: ${release.html_url}`);
    } else if (createRes.statusCode === 422) {
        console.log('Release or Tag already exists. Fetching existing release...');
        const listRes = await request({
            hostname: 'api.github.com',
            path: `/repos/${REPO}/releases/tags/${TAG}`,
            method: 'GET',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'User-Agent': 'Ocal-Build-Agent'
            }
        });
        if (listRes.statusCode === 200) {
            release = JSON.parse(listRes.body);
            console.log(`Found existing release: ${release.html_url}`);
        } else {
            console.error('Failed to find existing release:', listRes.body);
            process.exit(1);
        }
    } else {
        console.error('Failed to create release:', createRes.body);
        process.exit(1);
    }

    const filename = path.basename(FILE_PATH);
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File NOT found: ${FILE_PATH}`);
        process.exit(1);
    }

    const existingAsset = release.assets && release.assets.find(a => a.name === filename);
    if (existingAsset) {
        console.log(`Deleting existing asset ${filename} (ID: ${existingAsset.id})...`);
        const delRes = await request({
            hostname: 'api.github.com',
            path: `/repos/${REPO}/releases/assets/${existingAsset.id}`,
            method: 'DELETE',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'User-Agent': 'Ocal-Build-Agent'
            }
        });
        if (delRes.statusCode === 204) {
            console.log('Asset deleted successfully.');
        } else {
            console.warn('Failed to delete asset:', delRes.body);
        }
    }

    const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${path.basename(FILE_PATH)}`);
    const fileStats = fs.statSync(FILE_PATH);
    const fileStream = fs.createReadStream(FILE_PATH);

    console.log(`Uploading ${path.basename(FILE_PATH)} (${fileStats.size} bytes)...`);
    
    const url = new URL(uploadUrl);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Authorization': `token ${TOKEN}`,
            'User-Agent': 'Ocal-Build-Agent',
            'Content-Type': 'application/octet-stream',
            'Content-Length': fileStats.size
        }
    };

    const uploadReq = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 201) {
                console.log('Upload successful!');
                console.log('Asset URL:', JSON.parse(body).browser_download_url);
            } else {
                console.error('Upload failed:', body);
            }
        });
    });

    uploadReq.on('error', (e) => console.error('Upload error:', e));
    fileStream.pipe(uploadReq);
}

run();
