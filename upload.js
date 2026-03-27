const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'neelkanth-patel26/Ocal-Browser';
const TAG = 'v1.0.6';
const FILE_PATH = path.join(__dirname, 'dist-inno', 'Ocal-1.0.6-Setup.exe');

async function request(method, url, data = null, headers = {}) {
    const urlObj = new URL(url);
    const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + (urlObj.search || ''),
        method: method,
        headers: {
            'Authorization': `token ${TOKEN}`,
            'User-Agent': 'NodeJS',
            'Accept': 'application/vnd.github.v3+json',
            ...headers
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ body, statusCode: res.statusCode, headers: res.headers }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    try {
        console.log(`Checking if release ${TAG} exists...`);
        let release;
        const releasesRes = await request('GET', `https://api.github.com/repos/${REPO}/releases`);
        const releases = JSON.parse(releasesRes.body);
        release = (Array.isArray(releases) ? releases : []).find(r => r.tag_name === TAG);

        if (!release) {
            console.log(`Release ${TAG} not found. Creating new draft release...`);
            const createRes = await request('POST', `https://api.github.com/repos/${REPO}/releases`, JSON.stringify({
                tag_name: TAG,
                name: TAG,
                body: 'Ocal Browser v1.0.6 Robust Update System & UI Polishing',
                draft: true,
                prerelease: false
            }), { 'Content-Type': 'application/json' });
            
            if (createRes.statusCode !== 201) {
                console.error(`Failed to create release: ${createRes.statusCode} ${createRes.body}`);
                process.exit(1);
            }
            release = JSON.parse(createRes.body);
            console.log(`Created release ID: ${release.id}`);
        } else {
            console.log(`Found existing release ID: ${release.id}`);
        }

        const fileName = path.basename(FILE_PATH);
        const stats = fs.statSync(FILE_PATH);
        const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${fileName}`);
        
        console.log(`Uploading ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
        
        const fileStream = fs.createReadStream(FILE_PATH);
        const uploadOptions = {
            method: 'POST',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Content-Type': 'application/octet-stream',
                'Content-Length': stats.size,
                'User-Agent': 'NodeJS'
            }
        };

        const urlObj = new URL(uploadUrl);
        const uploadReq = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            ...uploadOptions
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`SUCCESS: Upload finished with status ${res.statusCode}`);
                } else {
                    console.error(`FAILED: Upload failed with status ${res.statusCode}`);
                    console.error(body);
                }
            });
        });
        
        uploadReq.on('error', (err) => console.error('Upload Error:', err));
        fileStream.pipe(uploadReq);

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

run();
