// Serve only bundled HexGL resources under a real, same-origin Ocal URL.
const path = require('path');
const { pathToFileURL } = require('url');
function resolveArcadeAsset(requestURL, appRoot) {
    try {
        const url = new URL(requestURL);
        if (url.protocol !== 'ocal:' || url.hostname !== 'arcade') return null;
        const pathname = decodeURIComponent(url.pathname);
        if (!pathname.startsWith('/hexgl/') || pathname.includes('\\') || pathname.includes('\0')) return null;
        const root = path.resolve(appRoot, 'hexgl');
        const target = path.resolve(root, pathname.slice('/hexgl/'.length));
        const relative = path.relative(root, target);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
        return pathToFileURL(target).href;
    } catch { return null; }
}
module.exports = { resolveArcadeAsset };
