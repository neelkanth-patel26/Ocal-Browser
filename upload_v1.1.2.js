const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'neelkanth-patel26/Ocal-Browser';
const TAG = 'v1.1.2';
const ASSETS = [
    { dir: 'D:\\Brower\\dist-inno', name: 'Ocal-1.1.2-Setup.exe' }
];

async function request(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            method,
            hostname: urlObj.hostname,
            path: urlObj.pathname + (urlObj.search || ''),
            headers: {
                'Authorization': `token ${TOKEN}`,
                'User-Agent': 'Node.js',
                ...headers
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve({ body, statusCode: res.statusCode }));
        });
        req.on('error', reject);
        if (data) {
            if (Buffer.isBuffer(data)) req.write(data);
            else req.write(data);
        }
        req.end();
    });
}

async function run() {
    if (!TOKEN) {
        console.error('ERROR: GITHUB_TOKEN environment variable is not set.');
        return;
    }

    console.log(`Creating/Fetching release ${TAG}...`);
    const createPayload = JSON.stringify({
        tag_name: TAG,
        name: TAG,
        body: fs.readFileSync('D:\\Brower\\release_notes_v1.1.2.txt', 'utf8'),
        draft: false,
        prerelease: false
    });

    let createRes = await request('POST', `https://api.github.com/repos/${REPO}/releases`, createPayload);
    console.log(`Create Release Response: ${createRes.statusCode}`);

    const res = await request('GET', `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`);
    console.log(`Fetch Release Response: ${res.statusCode}`);
    if (res.statusCode !== 200) {
        console.error('Failed to get release info:', res.body);
        return;
    }
    const release = JSON.parse(res.body);
    const uploadUrlBase = release.upload_url.split('{')[0];
    console.log(`Target Upload URL: ${uploadUrlBase}`);

    console.log(`Cleaning existing assets for ${TAG}...`);
    for (const asset of release.assets) {
        console.log(`Deleting existing asset: ${asset.name}...`);
        await request('DELETE', `https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`);
    }

    for (const asset of ASSETS) {
        const filePath = path.join(asset.dir, asset.name);
        if (!fs.existsSync(filePath)) {
            console.error(`File missing: ${filePath}`);
            continue;
        }
        console.log(`Uploading ${asset.name}...`);
        const stats = fs.statSync(filePath);
        const fileData = fs.readFileSync(filePath);
        
        const uploadRes = await request('POST', `${uploadUrlBase}?name=${encodeURIComponent(asset.name)}`, fileData, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': stats.size
        });

        if (uploadRes.statusCode === 201) {
            console.log(`Successfully uploaded ${asset.name}`);
        } else {
            console.error(`Failed to upload ${asset.name}:`, uploadRes.body);
        }
    }
    console.log('All v1.1.2 uploads complete.');
}

run().catch(console.error);
