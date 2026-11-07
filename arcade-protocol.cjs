// Serve only bundled HexGL & arcade resources under a real, same-origin Ocal URL.
const path = require('path');
const { pathToFileURL } = require('url');

function resolveArcadeAsset(requestURL, appRoot) {
    try {
        const url = new URL(requestURL);
        if (url.protocol !== 'ocal:') return null;
        let pathname = decodeURIComponent(url.pathname);
        if (pathname.includes('\\') || pathname.includes('\0')) return null;

        const root = path.resolve(appRoot, 'hexgl');
        let relPath = '';

        if (url.hostname === 'arcade') {
            if (pathname.startsWith('/hexgl')) {
                relPath = pathname.slice('/hexgl'.length);
            } else {
                relPath = pathname;
            }
        } else if (url.hostname === 'hexgl') {
            relPath = pathname;
        } else {
            return null;
        }

        if (relPath.startsWith('/')) relPath = relPath.substring(1);
        if (!relPath || relPath === '') relPath = 'index.html';

        const target = path.resolve(root, relPath);
        const relative = path.relative(root, target);
        if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
        return pathToFileURL(target).href;
    } catch {
        return null;
    }
}

module.exports = { resolveArcadeAsset };
