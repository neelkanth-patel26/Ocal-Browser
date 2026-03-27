const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'neelkanth-patel26/Ocal-Browser';
const TAG = 'v1.0.6';

async function request(method, url, data = null) {
    const urlObj = new URL(url);
    const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + (urlObj.search || ''),
        method: method,
        headers: {
            'Authorization': `token ${TOKEN}`,
            'User-Agent': 'NodeJS',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ body, statusCode: res.statusCode }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    try {
        console.log(`Searching for release ${TAG}...`);
        const releasesRes = await request('GET', `https://api.github.com/repos/${REPO}/releases`);
        const releases = JSON.parse(releasesRes.body);
        const release = releases.find(r => r.tag_name === TAG || r.name === TAG);

        if (!release) {
            console.error(`Release ${TAG} not found.`);
            process.exit(1);
        }

        console.log(`Found release ID: ${release.id}. Publishing...`);
        const patchRes = await request('PATCH', `https://api.github.com/repos/${REPO}/releases/${release.id}`, JSON.stringify({
            draft: false
        }));

        if (patchRes.statusCode === 200) {
            console.log(`SUCCESS: Release ${TAG} is now published!`);
        } else {
            console.error(`FAILED: ${patchRes.statusCode} ${patchRes.body}`);
        }
    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

run();
