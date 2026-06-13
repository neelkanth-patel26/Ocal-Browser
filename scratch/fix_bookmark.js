const fs = require('fs');
const path = require('path');

const os = require('os');
const settingsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'ocal', 'settings.json');

console.log('Target path:', settingsPath);

if (fs.existsSync(settingsPath)) {
    try {
        const raw = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(raw);
        if (settings.bookmarks) {
            let updated = false;
            settings.bookmarks.forEach(bm => {
                if (bm.title === 'YouTube' && bm.url === 'https://downloaderto.com/enA5/') {
                    bm.url = 'https://www.youtube.com/';
                    updated = true;
                    console.log('Updated YouTube bookmark URL to https://www.youtube.com/');
                }
            });
            if (updated) {
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
                console.log('Successfully saved settings.json');
            } else {
                console.log('No matching bookmark found.');
            }
        }
    } catch (e) {
        console.error('Error fixing settings.json:', e);
    }
} else {
    console.error('settings.json not found.');
}
