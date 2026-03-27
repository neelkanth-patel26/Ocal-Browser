const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'neelkanth-patel26/Ocal-Browser';
const TAG = 'v1.1.1';
const ASSETS = [
    { dir: 'D:\\Brower\\out\\make\\squirrel.windows\\x64', name: 'RELEASES' },
    { dir: 'D:\\Brower\\out\\make\\squirrel.windows\\x64', name: 'ocal-1.1.1 Setup.exe' },
    { dir: 'D:\\Brower\\out\\make\\squirrel.windows\\x64', name: 'ocal-1.1.1-full.nupkg' },
    { dir: 'D:\\Brower\\dist-inno', name: 'Ocal-1.1.1-Setup.exe' }
];

async function request(method, url, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            method,
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
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
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    console.log(`Creating release ${TAG}...`);
    const createRes = await request('POST', `https://api.github.com/repos/${REPO}/releases`, JSON.stringify({
        tag_name: TAG,
        name: TAG,
        body: fs.readFileSync('D:\\Brower\\release_notes_v1.1.1.txt', 'utf8'),
        draft: false,
        prerelease: false
    }));

    if (createRes.statusCode !== 201) {
        console.log(`Release already exists or failed to create: ${createRes.statusCode}. Fetching...`);
    }

    const res = await request('GET', `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`);
    if (res.statusCode !== 200) {
        console.error('Failed to get release info:', res.body);
        return;
    }
    const release = JSON.parse(res.body);
    const uploadUrl = release.upload_url.split('{')[0];

    console.log(`Cleaning existing assets for ${TAG}...`);
    for (const asset of release.assets) {
        console.log(`Deleting ${asset.name}...`);
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
        const uploadRes = await request('POST', `${uploadUrl}?name=${encodeURIComponent(asset.name)}`, fileData, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': stats.size
        });
        if (uploadRes.statusCode === 201) {
            console.log(`Successfully uploaded ${asset.name}`);
        } else {
            console.error(`Failed to upload ${asset.name}:`, uploadRes.body);
        }
    }
    console.log('All v1.1.1 uploads complete.');
}

run().catch(console.error);
