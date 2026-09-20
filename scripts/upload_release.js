const fs = require('fs');
const path = require('path');
const https = require('https');

const token = process.env.GH_TOKEN;
const owner = 'neelkanth-patel26';
const repo = 'Ocal-Browser';
const tag = 'v9.1.05';
const fileName = 'Ocal-9.1.05-Setup.exe';
const filePath = path.join(__dirname, '..', 'dist-inno', fileName);

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const fileStats = fs.statSync(filePath);
console.log(`Preparing to upload ${fileName} (${(fileStats.size / (1024 * 1024)).toFixed(2)} MB)...`);

function apiRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data || '{}'));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  try {
    console.log(`Fetching release for tag ${tag}...`);
    const release = await apiRequest({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/tags/${tag}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Ocal-Browser',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    console.log(`Release found: ID ${release.id}, name: ${release.name}`);

    // Check if asset already exists
    const existingAsset = release.assets ? release.assets.find(a => a.name === fileName) : null;
    if (existingAsset) {
      console.log(`Deleting existing asset ID ${existingAsset.id}...`);
      await apiRequest({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`,
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Ocal-Browser',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      console.log('Existing asset deleted.');
    }

    // Upload new asset
    console.log(`Uploading ${fileName} to https://uploads.github.com ...`);
    const uploadOptions = {
      hostname: 'uploads.github.com',
      path: `/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(fileName)}`,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Ocal-Browser',
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size
      }
    };

    const uploadReq = https.request(uploadOptions, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const assetInfo = JSON.parse(data);
          console.log(`\nSUCCESS! Uploaded asset:`);
          console.log(`Download URL: ${assetInfo.browser_download_url}`);
          console.log(`Size: ${assetInfo.size} bytes`);
        } else {
          console.error(`\nUpload failed: HTTP ${res.statusCode}: ${data}`);
          process.exit(1);
        }
      });
    });

    uploadReq.on('error', (err) => {
      console.error('\nUpload error:', err);
      process.exit(1);
    });

    const fileStream = fs.createReadStream(filePath);
    let uploadedBytes = 0;
    let lastLog = Date.now();

    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      if (Date.now() - lastLog > 2000 || uploadedBytes === fileStats.size) {
        lastLog = Date.now();
        const percent = ((uploadedBytes / fileStats.size) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${percent}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(fileStats.size / (1024 * 1024)).toFixed(1)} MB)`);
      }
    });

    fileStream.pipe(uploadReq);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
