const electron = require('electron');

// Environment Check: Ensure we are running in the Electron Main Process
if (typeof electron === 'string' || !electron.app) {
    console.error('\n[FATAL ERROR] Ocal Browser must be run with the Electron executable.');
    console.error('Detected environment: ' + (typeof electron === 'string' ? 'Node.js (resolved to path string)' : 'Unknown'));
    // If you are seeing this, it means you might be running "node main.js" instead of "npm start" or "electron ."
    process.exit(1);
}

const {
    app, BrowserWindow, BrowserView, webContents, ipcMain, dialog,
    shell, session, Menu, MenuItem, clipboard, protocol, net,
    powerMonitor, Notification, screen
} = electron;

// Explicitly set application name for OS / Task Manager identification
app.name = 'Ocal Browser';
if (process.platform === 'win32') {
    app.setAppUserModelId('com.ocal.browser');
}

// Disable deprecation warnings in the console (silences punycode and setPreloads from 3rd-party libs)
process.noDeprecation = true;

// Register internal protocol as standard/secure to allow 'self' in CSP
protocol.registerSchemesAsPrivileged([
    { scheme: 'ocal', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);
const path = require('path');
const tabMediaMap = new Map(); // Stores detected media per tab ID
const AdmZip = require('adm-zip');
const fetch = require('cross-fetch').default || require('cross-fetch');

// Disable QUIC (fixes Handshake -101 and Connection Reset issues)
app.commandLine.appendSwitch('disable-quic');
// Enable High-DPI support for sharp rendering on Windows
app.commandLine.appendSwitch('high-dpi-support', '1');
// Enable modern TLS features and Print Preview
app.commandLine.appendSwitch('enable-features', 'Tls13EarlyData,PrintPreview');
// Hide the fact that we are an automated/embedded browser
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// Enable Chrome-style Print Preview
app.commandLine.appendSwitch('enable-print-browser');
app.commandLine.appendSwitch('enable-print-preview');
app.commandLine.appendSwitch('disable-print-preview', 'false');
// Force native smooth scrolling for mouse wheel (premium feel)
app.commandLine.appendSwitch('enable-smooth-scrolling');

// ── Web Loading & Rendering Speed Optimizations ──
// Enable GPU Rasterization (speeds up page painting/scrolling)
app.commandLine.appendSwitch('enable-gpu-rasterization');
// Enable Zero Copy for GPU memory rasterization
app.commandLine.appendSwitch('enable-zero-copy');
// Enable Parallel Downloading (faster file/media loading)
app.commandLine.appendSwitch('enable-parallel-downloading');
// Optimize JavaScript engine heap memory limit for heavy web apps
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc');
// Enable fast unload of pages/tabs
app.commandLine.appendSwitch('enable-fast-unload');
// Prevent background timer throttling (faster background tabs loading)
app.commandLine.appendSwitch('disable-background-timer-throttling');
// Prevent backgrounding of renderers
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Disable the default Electron menu bar on Windows/Linux to prevent UI shifting
Menu.setApplicationMenu(null);

const OCAL_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
app.userAgentFallback = OCAL_USER_AGENT;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
const isUninstallSurvey = process.argv.includes('--uninstall-survey');

function setupInteractionDismissal(contents) {
    if (!contents) return;
    contents.on('before-input-event', (event, input) => {
        if (input.type === 'mouseDown' || input.type === 'touchStart') {
            closeOverlays();
        }
    });
}

function getArgumentURL(argv) {
    // Arguments are typically: [executable, ...flags, targetFileOrURL]
    // We look for the first argument that isn't a flag and might be a path/URL
    const candidate = argv.find((arg, i) => {
        if (i === 0 || arg.startsWith('-') || arg.startsWith('--')) return false;
        // Exclude common dev-mode arguments like '.' or './'
        if (arg === '.' || arg === './' || arg === '.\\') return false;
        return true;
    });

    if (!candidate) return null;

    // Convert local Windows paths to file:// URLs
    if (/^[a-zA-Z]:[/\\]/.test(candidate) || candidate.startsWith('/') || candidate.startsWith('\\\\')) {
        return 'file:///' + candidate.replace(/\\/g, '/');
    }
    return candidate;
}

if (process.argv.includes('--install') || process.argv.includes('--squirrel-install')) {
    require('./installer-main.js');
    return;
}

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            const targetUrl = getArgumentURL(commandLine);
            if (targetUrl) {
                createNewTab(targetUrl);
            }
        }
    });
}

const fs = require('fs');
let lastSaveAsPath = null;

// Settings Persistence
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return null;
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}

function importChromiumBookmarks() {
    const importDir = path.join(app.getPath('userData'), 'imported');
    const importFile = path.join(importDir, 'bookmarks');
    const importHtmlFile = path.join(importDir, 'bookmarks.html');

    let imported = [];

    // 1. Try JSON Import (Chrome/Edge internal format)
    if (fs.existsSync(importFile)) {
        try {
            const raw = fs.readFileSync(importFile, 'utf8');
            const data = JSON.parse(raw);

            function processNode(node) {
                if (node.type === 'url') {
                    imported.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        name: node.name,
                        url: node.url,
                        favicon: null,
                        folderId: null
                    });
                } else if (node.type === 'folder' && node.children) {
                    node.children.forEach(processNode);
                }
            }

            if (data.roots) {
                Object.values(data.roots).forEach(root => root.children && root.children.forEach(processNode));
            }
            fs.unlinkSync(importFile);
        } catch (err) { }
    }

    // 2. Try HTML Import (Netscape Bookmark File format)
    if (fs.existsSync(importHtmlFile)) {
        try {
            const content = fs.readFileSync(importHtmlFile, 'utf8');
            const regex = /<A HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
            let match;
            while ((match = regex.exec(content)) !== null) {
                imported.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: match[2],
                    url: match[1],
                    favicon: null,
                    folderId: null
                });
            }
            fs.unlinkSync(importHtmlFile);
        } catch (err) { }
    }

    if (imported.length > 0) {
        userSettings.bookmarks = [...imported, ...userSettings.bookmarks];
        saveSettings(userSettings);
    }

    // Cleanup
    if (fs.existsSync(importDir) && fs.readdirSync(importDir).length === 0) {
        fs.rmdirSync(importDir);
    }
}

// Initial Settings
let userSettings = loadSettings() || {
    setupComplete: false,
    searchEngine: 'google',
    dns: 'default',
    accentColor: '#09f0a0',
    compactMode: false,
    trackingProtection: true,
    forceShieldIcon: true,
    profiles: [{ id: 'default', name: 'Personal', icon: 'fa-user' }],
    history: [],
    bookmarks: [],
    folders: [],
    bookmarkBarMode: 'auto',
    homeLayout: 'center', // 'top', 'center', 'bottom'
    homeTileSize: 80,
    homeTileSpacing: 20,
    homeTileStyle: 'glass-array', // 'glass-array', 'solid-matte', 'neon-orbit'
    sidebarMode: 'visible', // 'visible', 'hidden', 'autohide'
    autoCheckUpdates: true,
    confirmExit: true,
    tabGroups: [], // { id, name, color, collapsed }
    adBlockEnabled: true,
    assetVaultEnabled: true,
    aiAssistantEnabled: true,
    cyberStealthEnabled: false,
    aiApiKey: '',
    aiEngine: 'local', // 'local' or 'gemini'
    aiDeepScrape: true,
    aiShowReasoning: true,
    aiResponseStyle: 'detailed',
    customSearchUrl: 'https://www.google.com/search?q=%s',
    askSavePath: false,
    downloads: [],
    shieldStats: { ads: 0, trackers: 0, dataSaved: 0, history: [] },
    pdfViewerEnabled: true,
    batterySaver: false,
    localModel: 'gemma-4',
    localEndpoint: 'http://127.0.0.1:11434',
    openaiApiKey: '',
    customEndpoint: '',
    customModel: '',
    customApiKey: ''
};

if (!userSettings.bookmarks) userSettings.bookmarks = [];
if (!userSettings.localModel) userSettings.localModel = 'gemma-4';
if (!userSettings.localEndpoint) userSettings.localEndpoint = 'http://127.0.0.1:11434';
if (!userSettings.openaiApiKey) userSettings.openaiApiKey = '';
if (!userSettings.customEndpoint) userSettings.customEndpoint = '';
if (!userSettings.customModel) userSettings.customModel = '';
if (!userSettings.customApiKey) userSettings.customApiKey = '';
if (!userSettings.folders) userSettings.folders = [];
if (!userSettings.history) userSettings.history = [];
if (!userSettings.downloads) userSettings.downloads = [];
if (!userSettings.currentProfileId) userSettings.currentProfileId = 'default';
if (!userSettings.bookmarkBarMode) userSettings.bookmarkBarMode = 'auto';
if (!userSettings.homeLayout) userSettings.homeLayout = 'center';
if (!userSettings.homeTileSize) userSettings.homeTileSize = 80;
if (!userSettings.sitePermissions) userSettings.sitePermissions = {};
if (!userSettings.homeTileSpacing) userSettings.homeTileSpacing = 20;
if (!userSettings.homeTileStyle || userSettings.homeTileStyle === 'square' || userSettings.homeTileStyle === 'rectangle' || userSettings.homeTileStyle === 'monochrome') {
    userSettings.homeTileStyle = 'glass-array';
}
if (!userSettings.sidebarMode) userSettings.sidebarMode = 'visible';
if (userSettings.autoCheckUpdates === undefined) userSettings.autoCheckUpdates = true;
if (!userSettings.tabGroups) userSettings.tabGroups = [];
if (!userSettings.customSearchUrl) userSettings.customSearchUrl = 'https://www.google.com/search?q=%s';
if (userSettings.askSavePath === undefined) userSettings.askSavePath = false;
if (!userSettings.downloads) userSettings.downloads = [];
if (userSettings.adBlockEnabled === undefined) userSettings.adBlockEnabled = true;

if (userSettings.bookmarks) {
    userSettings.bookmarks.forEach(bm => {
        if (bm.title === 'YouTube' && bm.url === 'https://downloaderto.com/enA5/') {
            bm.url = 'https://www.youtube.com/';
        }
    });
}

if (userSettings.proxyUrl === undefined) userSettings.proxyUrl = 'socks5://127.0.0.1:9050'; // Default Tor-style or generic

// Security Hub Defaults
if (userSettings.httpsUpgradeEnabled === undefined) userSettings.httpsUpgradeEnabled = true;
if (userSettings.safeBrowsingEnabled === undefined) userSettings.safeBrowsingEnabled = true;
if (userSettings.dnsProvider === undefined) userSettings.dnsProvider = 'auto';

// Native Extensions Defaults
if (userSettings.cyberStealthEnabled === undefined) userSettings.cyberStealthEnabled = false;
if (userSettings.aiAssistantEnabled === undefined) userSettings.aiAssistantEnabled = true;
if (userSettings.assetVaultEnabled === undefined) userSettings.assetVaultEnabled = true;

// Search Hub Defaults
if (userSettings.instantSearchEnabled === undefined) userSettings.instantSearchEnabled = true;
if (userSettings.safeSearchEnabled === undefined) userSettings.safeSearchEnabled = false;

// Shield Stats Initialization & Migration
if (!userSettings.shieldStats) {
    userSettings.shieldStats = {
        global: { ads: 0, trackers: 0, dataSaved: 0 },
        sessionStartTime: Date.now(),
        history: []
    };
}
if (!userSettings.shieldStats.global) {
    // Migrate old flat structure to new structured format
    userSettings.shieldStats.global = {
        ads: userSettings.shieldStats.ads || 0,
        trackers: userSettings.shieldStats.trackers || 0,
        dataSaved: userSettings.shieldStats.dataSaved || 0
    };
}
if (!userSettings.shieldStats.history) userSettings.shieldStats.history = [];

// Non-persistent page stats: Map<webContentsId, { ads, trackers }>
const tabShieldStats = new Map();
const sessionStartTime = Date.now();

let _shieldSaveTimer = null;
function throttleShieldSave() {
    if (_shieldSaveTimer) return;
    _shieldSaveTimer = setTimeout(() => {
        saveSettings(userSettings);
        _shieldSaveTimer = null;
    }, 2500); // Only save to disk once every 2.5s if busy
}

function updateTabShieldStats(wcId, type) {
    if (!wcId) return;
    if (!tabShieldStats.has(wcId)) {
        tabShieldStats.set(wcId, { ads: 0, trackers: 0, isPlaying: false });
    }
    const stats = tabShieldStats.get(wcId);
    if (stats) {
        if (type === 'ads' || type === 'trackers') {
            stats[type]++;
            // Update Global Stats
            if (userSettings.shieldStats && userSettings.shieldStats.global) {
                if (userSettings.shieldStats.global[type] === undefined) userSettings.shieldStats.global[type] = 0;
                userSettings.shieldStats.global[type]++;

                // Heuristic: 50KB for ad, 5KB for tracker
                const bytesSaved = type === 'ads' ? 51200 : 5120;
                if (userSettings.shieldStats.global.dataSaved === undefined) userSettings.shieldStats.global.dataSaved = 0;
                userSettings.shieldStats.global.dataSaved += bytesSaved;

                throttleShieldSave();
                broadcastShieldStats(wcId);
            }
        }
        else if (type === 'isPlaying') stats.isPlaying = !!arguments[2];
    }
}

function broadcastShieldStats(wcId = null) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const globalStats = userSettings.shieldStats.global;

    // We send to everyone so the dashboard and popups stay in sync
    BrowserWindow.getAllWindows().forEach(bw => {
        try {
            if (bw.isDestroyed()) return;
            const pageStats = wcId ? tabShieldStats.get(wcId) : null;
            bw.webContents.send('shield-stats-updated', {
                global: globalStats,
                page: pageStats,
                webContentsId: wcId,
                sessionStartTime
            });
        } catch (e) { }
    });
}


function updateShieldHistory() {
    if (!userSettings.shieldStats.history) userSettings.shieldStats.history = [];
    const now = Date.now();
    const total = (userSettings.shieldStats.ads || 0) + (userSettings.shieldStats.trackers || 0);

    userSettings.shieldStats.history.push({ t: now, v: total });

    // Keep only last 744 points (31 days of hourly snapshots)
    if (userSettings.shieldStats.history.length > 744) {
        userSettings.shieldStats.history = userSettings.shieldStats.history.slice(-744);
    }

    saveSettings(userSettings);
}

// Update every hour
setInterval(updateShieldHistory, 60 * 60 * 1000);
// Initial snapshot if history is empty
if (userSettings.shieldStats.history.length === 0) updateShieldHistory();

let pipWindow = null;
let pipSourceContents = null;

var mainWindow;
var welcomeView;

function getWinOffset() {
    if (!mainWindow || mainWindow.isDestroyed()) return 0;
    return (mainWindow.isMaximized() && process.platform === 'win32') ? 8 : 0;
}

var sidebarOverlayView = null;
var aiSidebarView = null;

var suggestionsView = null;
var siteInfoView = null;
var webAppView = null;
var tabgroupView = null;
var tabContextView = null;
let isAlwaysOnTop = false;

let downloadsView = null;
var mediaMasterView = null;
let isAnimatingBounds = false;
var views = [];
let splitOverlayView = null;
var downloads = userSettings.downloads || [];
function saveDownloadsToSettings() {
    userSettings.downloads = downloads;
    saveSettings(userSettings);
}
let activeViewId = null;
let sidebarOpen = false;
let aiSidebarOpen = false;
let aiSidebarWidth = 550;
let historySidebarOpen = false;
let downloadsSidebarOpen = false;
let bookmarksSidebarOpen = false;
let bookmarkBarVisible = true;
let dropdownOpen = false;

// ── Automatic Sizing & Scaling System (DPI / Resolution / Screen Matcher) ──
let moveZoomTimeout = null;
let lastAppliedUiZoom = 1.0;
const activeUiWebContents = new Set();

function getOptimalZoomFactor() {
    try {
        if (!app.isReady()) {
            return 1.0;
        }
        if (!mainWindow || mainWindow.isDestroyed()) {
            return 1.0;
        }
        const winBounds = mainWindow.getBounds();
        const display = screen.getDisplayMatching(winBounds) || screen.getPrimaryDisplay();
        const { width, height } = display.size;
        
        let optimalZoom = 1.0;
        
        // Automatic sizing scale logic based on physical resolution and screen size
        if (width < 1366) {
            optimalZoom = 0.85; // Low-res screens (compact layouts, save space)
        } else if (width <= 1440) {
            optimalZoom = 0.90; // Small laptops (1280p, 1440p)
        } else if (width <= 1920) {
            optimalZoom = 1.0;  // Standard 1080p desktop/laptop
        } else if (width <= 2560) {
            optimalZoom = 1.10; // 1440p / 2K displays
        } else {
            optimalZoom = 1.25; // 4K displays and above
        }
        
        return optimalZoom;
    } catch (err) {
        console.error("Failed to calculate optimal zoom factor:", err);
        return 1.0;
    }
}

function applyZoomToWebContents(wc) {
    if (!wc || wc.isDestroyed()) return;
    try {
        const zoom = getOptimalZoomFactor();
        wc.setZoomFactor(zoom);
    } catch (err) {
        console.error("Error setting zoom factor on webContents:", err);
    }
}

function updateAllUiZoomFactors() {
    const zoom = getOptimalZoomFactor();
    lastAppliedUiZoom = zoom;
    for (const wc of activeUiWebContents) {
        if (!wc.isDestroyed()) {
            try {
                wc.setZoomFactor(zoom);
            } catch (err) {
                console.error("Error setting zoom on display change:", err);
            }
        }
    }
}

// Track and hook all newly created internal UI web contents to scale them
app.on('web-contents-created', (event, contents) => {
    contents.on('destroyed', () => {
        activeUiWebContents.delete(contents);
    });
    
    const handleUrl = (url) => {
        if (url && (url.startsWith('file://') || url.startsWith('ocal://'))) {
            activeUiWebContents.add(contents);
            applyZoomToWebContents(contents);
        } else {
            activeUiWebContents.delete(contents);
        }
    };

    contents.on('did-start-navigation', (e, url) => handleUrl(url));
    contents.on('did-finish-load', () => handleUrl(contents.getURL()));
});

// Screen display metrics event listener will be bound inside app.whenReady() to avoid early access errors.

let bmDropdownView = null;
let extensionDropdownView = null;
let activeBMFolderId = null;
let isQuitting = false;
let activePopupGroupId = null;
let webAppOpen = false;
let currentWebAppUrl = null;
let webAppLoadingTimeout = null;
let lastYOffset = 96;
let lastWSidebar = 44;
if (!userSettings.sitePermissions) userSettings.sitePermissions = {};

function applyShieldSettings() {
    setTimeout(() => {
        if (global._shieldInterceptorsRegistered) return;
        global._shieldInterceptorsRegistered = true;

        const ses = session.defaultSession;
        const sesGoogle = session.fromPartition('persist:google_login');

        // Precompile regexes for high-performance network intercepting
        const PRECOMPILED_AD_PATTERNS = [
            'doubleclick.net', 'googleadservices.com', 'partner.googleadservices.com',
            'googlesyndication.com', 'adservice.google.com', 'pagead2.googlesyndication.com',
            'youtube.com/pagead', 'youtube.com/ptracking', 'youtube.com/api/stats/ads',
            'youtube.com/api/stats/qoe?adformat=', 'youtube.com/get_midroll_info',
            /googlevideo\.com\/videoplayback\?.*ad_v2/,
            /googlevideo\.com\/videoplayback\?.*ctier=a/,
            /googlevideo\.com\/videoplayback\?.*adfilter/,
            /googlevideo\.com\/videoplayback\?.*oad=/,
            /googlevideo\.com\/initplayback\?.*oad=/,
            /youtube\.com\/get_video_info\?.*ad_v2/,
            'youtube.com/api/stats/ads'
        ];

        const masterOnBeforeRequest = (details, callback) => {
            if (!details.url) { callback({}); return; }
            const url = details.url.toLowerCase();
            const wcId = details.webContentsId;

            const isNeuralAd = PRECOMPILED_AD_PATTERNS.some(p => {
                if (p instanceof RegExp) return p.test(url);
                return url.includes(p);
            });

            if (isNeuralAd) {
                if (wcId) updateTabShieldStats(wcId, 'ads');
                callback({ cancel: true });
                return;
            }

            callback({});
        };

        const masterOnErrorOccurred = (details) => {
            // Passive Tracking: If a request failed/was blocked by an extension, track it.
            if (details.error === 'net::ERR_BLOCKED_BY_CLIENT' || details.error === 'net::ERR_ABORTED') {
                const url = details.url.toLowerCase();
                const wcId = details.webContentsId;
                if (!wcId) return;

                // Better heuristic for ad vs tracker
                const trackerKeywords = [
                    'pixel', 'tracker', 'telemetry', 'analytics', 'metrics', 'collect', 'collectors',
                    'tag-manager', 'googletagmanager', 'doubleclick', 'scorecardresearch',
                    'quantserve', 'taboola', 'outbrain', 'beacon', 'stat-collector', 'log-event'
                ];
                const isTracker = trackerKeywords.some(kw => url.includes(kw));
                updateTabShieldStats(wcId, isTracker ? 'trackers' : 'ads');
            }
        };

        const masterOnBeforeSendHeaders = (details, callback) => {
            const headers = details.requestHeaders || {};
            const url = details.url.toLowerCase();
            const isVideo = url.includes('googlevideo.com');

            // Force Regional Masking Headers
            headers['Accept-Language'] = 'en-US,en;q=0.9';
            // Legacy X-Forwarded-For removed to allow actual VPN nodes to handle masking
            callback({ requestHeaders: headers });
        };

        const masterOnHeadersReceived = (details, callback) => {
            const headers = details.responseHeaders || {};
            // Inject Secure Content-Security-Policy to resolve Electron warnings 
            // and protect against XSS, while allowing uBlock and internal resources.
            if (!headers['content-security-policy'] && !headers['Content-Security-Policy']) {
                headers['Content-Security-Policy'] = [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ocal: *; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; " +
                    "style-src 'self' 'unsafe-inline' https:; " +
                    "img-src 'self' data: blob: https: *; " +
                    "font-src 'self' data: https:; " +
                    "connect-src 'self' https: wss: *; " +
                    "media-src 'self' data: blob: https: *; " +
                    "worker-src 'self' blob:;"
                ];
            }
            callback({ responseHeaders: headers });
        };

        [ses, sesGoogle].forEach(s => {
            s.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, masterOnBeforeRequest);
            s.webRequest.onErrorOccurred({ urls: ['*://*/*'] }, masterOnErrorOccurred);
            s.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, masterOnBeforeSendHeaders);
            s.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, masterOnHeadersReceived);
        });

        console.log('Ocal Shield: Active (Stats Tracking & Fast-Fail Enabled)');
    }, 500);
}

function setupSessionHandlers() {
    const ses = session.defaultSession;
    ses.setUserAgent(OCAL_USER_AGENT);

    const checkPermission = (origin, permission) => {
        const sitePerms = userSettings.sitePermissions[origin];
        if (sitePerms && sitePerms[permission]) {
            const val = sitePerms[permission];
            if (val === 'allow') return true;
            if (val === 'block') return false;
            // 'default' or 'ask' falls through to default behavior
        }
        return null;
    };

    ses.setPermissionRequestHandler((webContents, permission, callback) => {
        try {
            const origin = new URL(webContents.getURL()).origin;
            const res = checkPermission(origin, permission === 'media' ? 'audio' : permission);
            if (res !== null) return callback(res);
        } catch (e) { }
        // Default deny for sensitive permissions like geolocation if not explicitly allowed
        if (permission === 'geolocation' || permission === 'notifications') {
            return callback(false);
        }
        callback(true);
    });

    ses.setPermissionCheckHandler((webContents, permission, origin) => {
        const res = checkPermission(origin, permission);
        if (res !== null) return res;
        return true;
    });


    applyShieldSettings();

}

// Modern Opera-Style Proxy Lifecycle
const PROXY_BYPASS_LIST = [
    '<local>',
    'localhost',
    '127.0.0.1',
    'ocal',
    '*.ocal',
    '*.youtube.com',
    'googlevideo.com',
    '*.googlevideo.com',
    'ytimg.com',
    '*.ytimg.com',
    'ggpht.com',
    '*.ggpht.com'
].join(';');

// Ocal Internal Redirect Pool
const INTERNAL_RESCUE_DASHBOARD = 'ocal://home';

ipcMain.on('print-document', (event) => {
    const wc = event.sender;
    if (wc && !wc.isDestroyed()) {
        wc.print({ silent: false, printBackground: true });
    }
});

function applyCyberStealth(webContents) {
    if (!userSettings.cyberStealthEnabled) return;

    // Advanced Bot-Detection Bypass (Randomized delays and clean traces)
    const stealthScript = `
        (function() {
            // Shadow DOM trace removal
            const originalAttachShadow = Element.prototype.attachShadow;
            Element.prototype.attachShadow = function(options) {
                return originalAttachShadow.call(this, { ...options, mode: 'open' });
            };

            // Canvas poisoning prevention
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
                const data = originalGetImageData.call(this, x, y, w, h);
                // Subtle noise to avoid fingerprinting
                if (data.data.length > 0) data.data[0] = data.data[0] ^ 1;
                return data;
            };

            console.log('[CyberStealth] Active: Traces sanitized, Fingerprinting guarded.');
        })();
    `;

    webContents.executeJavaScript(stealthScript).catch(() => { });
}

function setupSecurityHeadersFix() {
    const ses = session.defaultSession;
    const googleSes = session.fromPartition('persist:google_login');

    const stealthFilter = (details, callback) => {
        const { requestHeaders, url } = details;

        // Prevent 403 Forbidden on GoogleVideo / YouTube by ensuring Referer/Origin integrity
        const isYouTube = url.includes('youtube.com');
        const isVideo = url.includes('googlevideo.com');

        if (isYouTube && !isVideo) {
            // ONLY modify if absolutely necessary, don't overwrite if uBlock already handled it
            if (!requestHeaders['Sec-Ch-Ua']) {
                requestHeaders['Sec-Ch-Ua'] = '"Chromium";v="134", "Not:A-Brand";v="99"';
                requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
                requestHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
            }

            // Clean suspicious headers that trigger YouTube ad-block detection
            delete requestHeaders['X-Requested-With'];
            delete requestHeaders['X-Electron-Id'];
        }

        callback({ requestHeaders });
    };

    const filterHeaders = (details, callback) => {
        const { responseHeaders, url } = details;

        // Don't strip headers for our internal ocal:// pages
        if (url.startsWith('ocal://')) {
            return callback({ responseHeaders });
        }

        const headersToStrip = [
            'content-security-policy',
            'content-security-policy-report-only',
            'require-trusted-types-for',
            'trusted-types'
        ];

        // YouTube specifically needs its headers preserved to avoid 403s on videoplayback
        if (url.includes('googlevideo.com') || url.includes('youtube.com')) {
            return callback({ responseHeaders });
        }

        // Case-insensitive filtering
        const filteredHeaders = {};
        for (const key of Object.keys(responseHeaders)) {
            if (!headersToStrip.includes(key.toLowerCase())) {
                filteredHeaders[key] = responseHeaders[key];
            }
        }

        callback({ responseHeaders: filteredHeaders });
    };

    ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, filterHeaders);
    googleSes.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, filterHeaders);

    ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, stealthFilter);
    googleSes.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, stealthFilter);

    console.log('[Stealth Hub] Proactive Header Policy and YouTube bypass active.');
}

function setupSecurityHandlers() {
    const ses = session.defaultSession;

    // HTTPS Upgrade
    ses.webRequest.onBeforeRequest({ urls: ['http://*/*'] }, (details, callback) => {
        if (userSettings.httpsUpgradeEnabled && details.resourceType === 'mainFrame') {
            const url = new URL(details.url);
            url.protocol = 'https:';
            return callback({ redirectURL: url.toString() });
        }
        callback({});
    });
}

function createMainWindow() {
    if (isUninstallSurvey) {
        createSurveyWindow();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1350,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'Ocal',
        icon: path.join(__dirname, 'icon.ico'),
        frame: false,
        transparent: false,
        backgroundColor: userSettings.themeMode === 'light' ? '#ffffff' : '#0c0c0e', // Dynamic background to match theme and prevent flashbang
        resizable: true,
        fullscreenable: true,
        titleBarStyle: 'hidden', // Ensures native title bar is fully hidden on Windows 10
        titleBarOverlay: false, // Prevents Electron's native titlebar overlay from stealing clicks
        thickFrame: true, // Enables standard Windows resizing and snapping for frameless windows
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: false
        },
    });

    mainWindow.loadFile('index.html');

    splitOverlayView = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: false
        }
    });
    splitOverlayView.setBackgroundColor('#00000000');
    splitOverlayView.webContents.loadURL('file:///' + path.join(__dirname, 'home.html#drag-overlay').replace(/\\/g, '/'));

    if (!userSettings.setupComplete && fs.existsSync(path.join(__dirname, 'welcome.html'))) {
        importChromiumBookmarks();
        showWelcomeWizard();
    } else {
        userSettings.setupComplete = true;
        saveSettings(userSettings);
    }

    mainWindow.setMaxListeners(50);
    mainWindow.on('resize', () => {
        updateViewBounds();
        if (welcomeView) {
            const { width, height } = mainWindow.getContentBounds();
            welcomeView.setBounds({ x: 0, y: 0, width, height });
        }
    });

    mainWindow.on('move', () => {
        if (moveZoomTimeout) clearTimeout(moveZoomTimeout);
        moveZoomTimeout = setTimeout(() => {
            const currentZoom = getOptimalZoomFactor();
            if (currentZoom !== lastAppliedUiZoom) {
                lastAppliedUiZoom = currentZoom;
                updateAllUiZoomFactors();
                updateViewBounds();
            }
        }, 300);
    });

    // These should be initialized once, not on every reload
    setupDownloadHandler();
    setupCompatibilityHandler();
    setupSessionHandlers();
    setupSecurityHandlers();
    setupSecurityHeadersFix();

    setupInteractionDismissal(mainWindow.webContents);
    mainWindow.webContents.on('before-input-event', (event, input) => {
        handleShortcuts(event, input);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        if (!sidebarOverlayView) createSidebarOverlay();
        if (!aiSidebarView) createAiSidebar();
        if (!suggestionsView) createSuggestionsView();
        if (!tabgroupView) createTabgroupView();
        if (!tabContextView) createTabContextView();
        if (!mediaMasterView) createMediaMasterView();
        if (!bmDropdownView) createBMDropdownView();
        // Always open a tab on startup
        if (views.length === 0) {
            const startupUrl = getArgumentURL(process.argv);
            if (userSettings.lastVersion !== '7.1.00') {
                userSettings.lastVersion = '7.1.00';
                saveSettings(userSettings);
                createNewTab('ocal://whats-new');
                if (startupUrl) {
                    createNewTab(startupUrl);
                }
            } else {
                createNewTab(startupUrl);
            }
        }

        // Proactive background update check
        setTimeout(checkForUpdatesSilently, 3000);
    });

    mainWindow.on('maximize', () => {
        mainWindow.setResizable(false);
        mainWindow.webContents.send('window-is-maximized', true);
    });
    mainWindow.on('unmaximize', () => {
        mainWindow.setResizable(true);
        mainWindow.webContents.send('window-is-maximized', false);
    });

    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            if (userSettings.confirmExit !== false) {
                e.preventDefault();
                showSidebarOverlay();
                if (sidebarOverlayView) {
                    mainWindow.setTopBrowserView(sidebarOverlayView);
                    sidebarOverlayView.webContents.send('show-exit-modal');
                }
            } else {
                isQuitting = true;
            }
        }
    });
}

function createSurveyWindow() {
    const surveyWindow = new BrowserWindow({
        width: 600,
        height: 600,
        frame: false,
        resizable: false,
        backgroundColor: '#0c0c0e',
        backgroundMaterial: 'mica',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: false
        },
    });

    surveyWindow.loadFile(path.join(__dirname, 'uninstaller', 'index.html'));

    ipcMain.once('uninstall-survey-complete', (e, mailtoLink) => {
        shell.openExternal(mailtoLink);
        setTimeout(() => {
            app.quit();
            // Safety thermal exit if Chromium/Electron doesn't shut down in time
            setTimeout(() => process.exit(0), 2000);
        }, 500);
    });

    ipcMain.once('uninstall-survey-close', () => {
        app.quit();
        setTimeout(() => process.exit(0), 1000);
    });
}

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});

function setupCompatibilityHandler() {
    const registerStealthHandler = (ses) => {
        ses.setUserAgent(OCAL_USER_AGENT);
        ses.webRequest.onBeforeSendHeaders((details, callback) => {
            const { requestHeaders } = details;
            delete requestHeaders['X-Electron-Id'];
            delete requestHeaders['X-Requested-With'];
            delete requestHeaders['X-Electron-Version'];
            callback({ requestHeaders });
        });
    };

    registerStealthHandler(session.defaultSession);
    registerStealthHandler(session.fromPartition('persist:google_login'));

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (['display-capture', 'media', 'fullscreen'].includes(permission)) callback(true);
        else callback(false);
    });
}

app.on('web-contents-created', (event, contents) => {
    // Console logging redirection
    contents.on('console-message', (e, level, message, line, sourceId) => {
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelName = levelNames[level] || 'LOG';
        console.log(`[CONSOLE][${levelName}][${contents.getType()}] ${message} (${path.basename(sourceId || '')}:${line})`);
        
        if (message.startsWith('SIGNAL_INIT ')) {
            try {
                const data = JSON.parse(message.replace('SIGNAL_INIT ', ''));
            } catch (err) { }
        }
    });

    const desktopUA = OCAL_USER_AGENT;
    const googleBypassUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0';

    contents.setUserAgent(desktopUA);

    contents.on('audible-status-changed', (event, isAudible) => {
        const entry = views.find(v => v.view.webContents === contents);
        if (entry) {
            entry.audible = isAudible;
            mainWindow.webContents.send('tab-audio-status-changed', { id: entry.id, isAudible });
        }
    });

    // Robust URL Sync for all events (including back/forward)
    contents.on('did-finish-load', () => {
        const url = contents.getURL();
        const id = views.find(v => v.view.webContents === contents)?.id;
        if (id) {
            const title = contents.getTitle();
            mainWindow.webContents.send('url-updated', {
                id,
                url: url.includes('home.html') ? '' : url,
                title: url.includes('home.html') ? 'Ocal Home' : title
            });
        }
    });

    contents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
        if (!isMainFrame) return;

        const isSignFlow = url.includes('ServiceLogin') || url.includes('signin') || url.includes('identifier');
        const isGoogleAccounts = url.includes('accounts.google.com') || url.includes('google.com/accounts');
        const isPostLogin = url.includes('CheckCookie') || url.includes('ServiceLoginAuth');

        if (isGoogleAccounts && isSignFlow && !isPostLogin) {
            contents.setUserAgent(googleBypassUA);
        } else {
            contents.setUserAgent(desktopUA);
        }
    });

    contents.on('did-stop-navigation', () => {
        const url = contents.getURL();
        const isGoogleAccounts = url.includes('accounts.google.com') || url.includes('google.com/accounts');
        if (!isGoogleAccounts && contents.getUserAgent() === googleBypassUA) {
            contents.setUserAgent(desktopUA);
        }
    });

    contents.on('did-fail-load', (e, code, desc, url, isMain) => {
        if (isMain) {

        }
    });
});

function setupDownloadHandler() {
    session.defaultSession.on('will-download', (event, item, webContents) => {
        const downloadId = Date.now().toString();
        const fileName = item.getFilename();

        let savePath = lastSaveAsPath;
        if (!savePath || userSettings.askSavePath) {
            const filters = [];
            const ext = path.extname(fileName).toLowerCase().replace(/^\./, '');
            if (ext) {
                let extName = `${ext.toUpperCase()} File`;
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
                    extName = 'Image Files';
                } else if (ext === 'pdf') {
                    extName = 'PDF Document';
                } else if (ext === 'html' || ext === 'htm') {
                    extName = 'HTML Document';
                } else if (ext === 'txt' || ext === 'log') {
                    extName = 'Text Files';
                } else if (ext === 'zip' || ext === 'rar' || ext === '7z') {
                    extName = 'Archive Files';
                }
                
                let extensions = [ext];
                if (ext === 'jpg' || ext === 'jpeg') {
                    extensions = ['jpg', 'jpeg'];
                } else if (ext === 'html' || ext === 'htm') {
                    extensions = ['html', 'htm'];
                }
                filters.push({ name: extName, extensions: extensions });
            }
            filters.push({ name: 'All Files', extensions: ['*'] });

            const result = dialog.showSaveDialogSync(mainWindow, {
                title: 'Save File',
                defaultPath: path.join(app.getPath('downloads'), fileName),
                buttonLabel: 'Save',
                filters: filters
            });

            if (result) {
                savePath = result;
            } else {
                event.preventDefault();
                return;
            }
        }

        lastSaveAsPath = null;
        item.setSavePath(savePath);

        const dlItem = {
            id: downloadId,
            name: path.basename(savePath),
            state: 'progressing',
            received: 0,
            total: item.getTotalBytes(),
            path: savePath,
            timestamp: Date.now()
        };
        downloads.push(dlItem);
        saveDownloadsToSettings();

        if (!downloadsView) createDownloadsView();

        mainWindow.webContents.send('open-downloads-popup-ui');
        if (downloadsView) downloadsView.webContents.send('download-updated', downloads);
        broadcastToSidebars('download-updated', downloads);

        item.on('updated', (event, state) => {
            dlItem.state = state;
            if (state === 'progressing') dlItem.received = item.getReceivedBytes();
            if (downloadsView) downloadsView.webContents.send('download-updated', downloads);
            broadcastToSidebars('download-updated', downloads);
            saveDownloadsToSettings();
        });

        item.once('done', (event, state) => {
            dlItem.state = state;
            if (state === 'completed') dlItem.received = dlItem.total;
            if (downloadsView) downloadsView.webContents.send('download-updated', downloads);
            broadcastToSidebars('download-updated', downloads);
            saveDownloadsToSettings();
        });
    });
}

function broadcastToSidebars(channel, data) {
    if (sidebarOverlayView && !sidebarOverlayView.webContents.isDestroyed()) {
        sidebarOverlayView.webContents.send(channel, data);
    }
}

function createSidebarOverlay() {
    sidebarOverlayView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, devTools: false, webviewTag: true },
    });
    sidebarOverlayView.webContents.loadFile('sidebars.html');
    sidebarOverlayView.setBackgroundColor('#00000000');
    setupContextMenu(sidebarOverlayView.webContents);
}

function createAiSidebar() {
    aiSidebarView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, devTools: false, webviewTag: true },
    });
    aiSidebarView.webContents.loadURL('ocal://ai-sidebar/');
    aiSidebarView.setBackgroundColor('#00000000');
    setupContextMenu(aiSidebarView.webContents);

    // Ensure entrance animation plays on first load if it's being shown
    aiSidebarView.webContents.on('dom-ready', () => {
        if (aiSidebarOpen && aiSidebarView && !aiSidebarView.webContents.isDestroyed()) {
            aiSidebarView.webContents.send('sidebar-shown');
        }
    });
}

function showSidebarOverlay() {
    if (!sidebarOverlayView || !mainWindow) return;
    if (aiSidebarOpen) hideAiSidebar();
    if (!mainWindow.getBrowserViews().includes(sidebarOverlayView)) {
        mainWindow.addBrowserView(sidebarOverlayView);
    }
    sidebarOpen = true;
    updateViewBounds();
}

function hideSidebarOverlay() {
    if (sidebarOverlayView && !sidebarOverlayView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(sidebarOverlayView)) {
            mainWindow.removeBrowserView(sidebarOverlayView);
        }
    }
    sidebarOpen = false;
    updateViewBounds();
}

function showAiSidebar() {
    if (!aiSidebarView) createAiSidebar();
    if (sidebarOpen) hideSidebarOverlay();

    if (!mainWindow.getBrowserViews().includes(aiSidebarView)) {
        mainWindow.addBrowserView(aiSidebarView);
    }

    aiSidebarOpen = true;
    mainWindow.setTopBrowserView(aiSidebarView);
    updateViewBounds();

    // Signal renderer to play entrance animation
    if (aiSidebarView && !aiSidebarView.webContents.isDestroyed()) {
        aiSidebarView.webContents.send('sidebar-shown');
    }
}

function hideAiSidebar() {
    if (aiSidebarView && !aiSidebarView.webContents.isDestroyed()) {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserViews().includes(aiSidebarView)) {
            // Initiate exit animation instead of immediate removal
            aiSidebarView.webContents.send('start-sidebar-exit');

            // Safety timeout: remove after 600ms if renderer doesn't respond
            setTimeout(() => {
                if (aiSidebarView && !aiSidebarView.webContents.isDestroyed() &&
                    mainWindow && !mainWindow.isDestroyed() &&
                    mainWindow.getBrowserViews().includes(aiSidebarView) && aiSidebarOpen === false) {
                    mainWindow.removeBrowserView(aiSidebarView);
                    updateViewBounds();
                }
            }, 600);
        }
    }
    aiSidebarOpen = false;
    updateViewBounds();
}

ipcMain.on('sidebar-exit-complete', () => {
    if (aiSidebarView && !aiSidebarView.webContents.isDestroyed() &&
        mainWindow && !mainWindow.isDestroyed() &&
        mainWindow.getBrowserViews().includes(aiSidebarView)) {
        mainWindow.removeBrowserView(aiSidebarView);
        updateViewBounds();
    }
});

function createSuggestionsView() {
    suggestionsView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    suggestionsView.webContents.loadFile('suggestions.html');
}

function createTabgroupView() {
    tabgroupView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    tabgroupView.webContents.loadFile('tabgroup.html');
    tabgroupView.setBackgroundColor('#00000000');
}

function createTabContextView() {
    tabContextView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    tabContextView.webContents.loadFile('tab-context.html');
    tabContextView.setBackgroundColor('#00000000');
}

function closeOverlays() {
    sidebarOpen = false;
    aiSidebarOpen = false;
    hideSidebarOverlay();
    hideAiSidebar();
    hideSuggestions();

    if (tabgroupView && !tabgroupView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(tabgroupView)) {
            mainWindow.removeBrowserView(tabgroupView);
        }
    }
    if (tabContextView && !tabContextView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(tabContextView)) {
            mainWindow.removeBrowserView(tabContextView);
        }
    }
    if (shieldPopupView && !shieldPopupView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(shieldPopupView)) {
            mainWindow.removeBrowserView(shieldPopupView);
        }
    }
    if (bmDropdownView && !bmDropdownView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(bmDropdownView)) {
            mainWindow.removeBrowserView(bmDropdownView);
        }
    }
    if (extensionDropdownView && !extensionDropdownView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(extensionDropdownView)) {
            mainWindow.removeBrowserView(extensionDropdownView);
        }
    }
    if (siteInfoView && !siteInfoView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(siteInfoView)) {
            mainWindow.removeBrowserView(siteInfoView);
        }
    }
    activeBMFolderId = null;
    hideDownloadsPopup();
    hideWebApp();
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('sidebars-closed');
    }
}

function hidePopups() {
    closeOverlays();
    if (suggestionsView && mainWindow && mainWindow.getBrowserViews().includes(suggestionsView)) {
        mainWindow.removeBrowserView(suggestionsView);
    }
    if (shieldPopupView && mainWindow && mainWindow.getBrowserViews().includes(shieldPopupView)) {
        mainWindow.removeBrowserView(shieldPopupView);
    }
    if (bmDropdownView && mainWindow && mainWindow.getBrowserViews().includes(bmDropdownView)) {
        mainWindow.removeBrowserView(bmDropdownView);
    }
    if (extensionDropdownView && mainWindow && mainWindow.getBrowserViews().includes(extensionDropdownView)) {
        mainWindow.removeBrowserView(extensionDropdownView);
    }
    if (siteInfoView && mainWindow && mainWindow.getBrowserViews().includes(siteInfoView)) {
        mainWindow.removeBrowserView(siteInfoView);
    }
    activeBMFolderId = null;
}

function createBMDropdownView() {
    if (bmDropdownView) return;
    bmDropdownView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    bmDropdownView.webContents.loadFile('bm-dropdown.html');
    bmDropdownView.setBackgroundColor('#00000000');

    // Hide on blur (losing focus)
    bmDropdownView.webContents.on('blur', () => {
        closeOverlays();
    });
}

function hideSuggestions() {
    if (!suggestionsView || suggestionsView.webContents.isDestroyed()) return;
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserViews().includes(suggestionsView)) {
        mainWindow.removeBrowserView(suggestionsView);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('suggestions-hidden');
    }
}

let lastDownloadsBlurTime = 0;

function createDownloadsView() {
    downloadsView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    downloadsView.webContents.loadFile('downloads.html');
    downloadsView.setBackgroundColor('#00000000');
    setupContextMenu(downloadsView.webContents);

    // Hide on blur (losing focus)
    downloadsView.webContents.on('blur', () => {
        lastDownloadsBlurTime = Date.now();
        closeOverlays();
    });
}

function hideDownloadsPopup() {
    if (!downloadsView || downloadsView.webContents.isDestroyed()) return;
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserViews().includes(downloadsView)) {
        mainWindow.removeBrowserView(downloadsView);
    }
}

ipcMain.on('toggle-downloads-popup', (e, bounds) => {
    let isFirstLoad = false;
    if (!downloadsView) {
        createDownloadsView();
        isFirstLoad = true;
    }

    if (mainWindow.getBrowserViews().includes(downloadsView)) {
        hideDownloadsPopup();
    } else {
        if (Date.now() - lastDownloadsBlurTime < 150) return;

        closeOverlays();
        mainWindow.addBrowserView(downloadsView);
        mainWindow.setTopBrowserView(downloadsView);

        const contentBounds = mainWindow.getContentBounds();
        let targetX = bounds.x - 180;
        if (targetX + 350 > contentBounds.width) {
            targetX = contentBounds.width - 360;
        }

        downloadsView.setBounds({
            x: 0,
            y: 0,
            width: contentBounds.width,
            height: contentBounds.height
        });

        const sendPopup = () => {
            if (downloadsView && !downloadsView.webContents.isDestroyed()) {
                downloadsView.webContents.send('show-popup', { x: targetX, y: bounds.y });
                downloadsView.webContents.focus();
                downloadsView.webContents.send('download-updated', downloads);
            }
        };

        if (isFirstLoad) {
            downloadsView.webContents.once('did-finish-load', sendPopup);
        } else {
            sendPopup();
        }
    }
});

ipcMain.on('hide-downloads-popup', () => {
    hideDownloadsPopup();
});

let shieldPopupView = null;
function createShieldPopupView() {
    shieldPopupView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: false, nodeIntegration: true }
    });
    shieldPopupView.webContents.loadFile('shield-popup.html');
    shieldPopupView.setBackgroundColor('#00000000');

    // Auto-hide on blur
    shieldPopupView.webContents.on('blur', () => {
        if (shieldPopupView && mainWindow && mainWindow.getBrowserViews().includes(shieldPopupView)) {
            mainWindow.removeBrowserView(shieldPopupView);
        }
    });
}

function createPipWindow(sourceContents) {
    if (pipWindow) pipWindow.close();

    pipWindow = new BrowserWindow({
        width: 480,
        height: 270,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    pipWindow.loadFile('pip.html');
    pipSourceContents = sourceContents;

    pipWindow.on('closed', () => {
        pipWindow = null;
        pipSourceContents = null;
    });
}

function showWelcomeWizard() {
    welcomeView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    });
    mainWindow.setBrowserView(welcomeView);
    const { width, height } = mainWindow.getContentBounds();
    welcomeView.setBounds({ x: 0, y: 0, width, height });
    welcomeView.webContents.loadFile('welcome.html');
    setupContextMenu(welcomeView.webContents);
}

function resolveInternalURL(url) {
    if (!url) return url;

    // Strip query and hash for path matching
    const basePart = url.split(/[?#]/)[0];
    const cleanBase = basePart.toLowerCase().replace(/\/$/, ''); // remove trailing slash for comparison

    // 1. Exact Page Mappings
    if (cleanBase === 'home' || cleanBase === 'ocal://home') return 'file://' + path.join(__dirname, 'home.html');
    if (cleanBase === 'settings' || cleanBase === 'ocal://settings') return 'file://' + path.join(__dirname, 'settings.html');
    if (url.startsWith('ocal://settings#')) return 'file://' + path.join(__dirname, 'settings.html') + url.substring(15);
    if (cleanBase === 'file-manager' || cleanBase === 'ocal://file-manager') return 'file://' + path.join(__dirname, 'file-manager.html');
    if (cleanBase === 'ocal://offline') return 'file://' + path.join(__dirname, 'offline.html');
    if (cleanBase === 'ocal://suspended') return 'file://' + path.join(__dirname, 'suspended.html') + (url.indexOf('?') !== -1 ? url.substring(url.indexOf('?')) : '');
    if (cleanBase === 'ocal://whats-new' || cleanBase === 'whats-new') return 'file://' + path.join(__dirname, 'whats-new.html');
    if (cleanBase === 'ocal://games') return 'file://' + path.join(__dirname, 'games.html');
    if (cleanBase === 'ocal://tetris') return 'file://' + path.join(__dirname, 'tetris.html');
    if (cleanBase === 'ocal://game' || cleanBase === 'ocal://snake') return 'file://' + path.join(__dirname, 'snake.html');
    if (cleanBase === 'ocal://pulse' || cleanBase === 'ocal://runner') return 'file://' + path.join(__dirname, 'game.html');
    if (cleanBase === 'ocal://ai-sidebar' || cleanBase === 'ocal://ai-sidebar/ai-sidebar.html') return 'file://' + path.join(__dirname, 'ai-sidebar.html');

    if (cleanBase === 'ocal://site-settings') {
        const qIdx = url.indexOf('?');
        return 'file://' + path.join(__dirname, 'site-settings.html') + (qIdx !== -1 ? url.substring(qIdx) : '');
    }
    // Standardize with trailing slash to avoid CSP relative path issues
    if (cleanBase === 'ocal://pdf-viewer') {
        const qIdx = url.indexOf('?');
        return 'file://' + path.join(__dirname, 'pdf-viewer.html') + (qIdx !== -1 ? url.substring(qIdx) : '');
    }
    if (cleanBase === 'ocal://certificate-viewer') {
        const qIdx = url.indexOf('?');
        return 'file://' + path.join(__dirname, 'certificate-viewer.html') + (qIdx !== -1 ? url.substring(qIdx) : '');
    }

    // 2. Resource/Asset Resolution (ocal://host/file.js -> __dirname/file.js)
    if (url.startsWith('ocal://')) {
        const pathPart = url.replace(/ocal:\/\/[^\/]+\//, ''); // Strip ocal://host/
        if (pathPart && pathPart !== url) {
            const filePath = path.join(__dirname, pathPart.split(/[?#]/)[0]);
            if (fs.existsSync(filePath)) return 'file://' + filePath;
        }
    }

    return url;
}

function normalizeDocumentUrl(url) {
    if (!url) return url;
    try {
        if (url.startsWith('ocal://') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) return url;

        // Check for local drive path (e.g., C:/... or D:\...)
        const isLocalDrive = /^[a-zA-Z]:[/\\]/.test(url);
        const isAbsPath = url.startsWith('/') || url.startsWith('\\\\');
        if (isLocalDrive || isAbsPath) {
            return 'file:///' + url.replace(/\\/g, '/');
        }
    } catch (e) {
        console.error('[Navigation] normalization error', e);
    }
    return url;
}

function createNewTab(url = null) {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const view = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: true
        },
    });
    view.setBackgroundColor('#00000000');
    view.webContents.setUserAgent(OCAL_USER_AGENT);
    setupViewEvents(id, view, 'left');

    views.push({ id, view, isSplit: false, splitDirection: 'horizontal', focusedSide: 'left', lastActiveTime: Date.now() });

    // Initial Load Resolution
    let finalUrl = url;
    if (url && !url.startsWith('ocal://')) {
        const isPdf = /\.pdf($|\?)/i.test(url);
        if (isPdf && userSettings.pdfViewerEnabled !== false) {
            try {
                const cleanUrl = decodeURI(url);
                finalUrl = `ocal://pdf-viewer/?file=${encodeURIComponent(cleanUrl)}`;
            } catch (e) {
                finalUrl = `ocal://pdf-viewer/?file=${encodeURIComponent(url)}`;
            }
        }
    }

    // Load the ocal:// URL directly so the address bar stays clean
    if (finalUrl) {
        view.webContents.loadURL(resolveInternalURL(finalUrl));
    } else {
        view.webContents.loadFile('home.html');
    }

    setActiveTab(id);

    // HTML fullscreen events — hide/show chrome
    view.webContents.on('enter-html-full-screen', () => setHtmlFullscreen(id, true));
    view.webContents.on('leave-html-full-screen', () => setHtmlFullscreen(id, false));

    broadcastTabs();
}

function setActiveSplitSide(tabId, side) {
    const entry = views.find(v => v.id === tabId);
    if (entry && entry.isSplit && entry.focusedSide !== side) {
        entry.focusedSide = side;
        const activeWc = side === 'left' ? entry.view.webContents : entry.view2.webContents;
        if (activeWc && !activeWc.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
            const url = activeWc.getURL();
            const title = activeWc.getTitle();
            mainWindow.webContents.send('url-updated', {
                id: tabId,
                url: url.includes('home.html') ? '' : url,
                title: url.includes('home.html') ? 'Ocal Home' : title,
                favicon: entry.favicon || null
            });
            mainWindow.webContents.send('split-side-focused', { tabId, side });
        }
    }
}

function setupViewEvents(tabId, view, side = 'left') {
    const webContents = view.webContents;

    // Clear media on navigation
    webContents.on('did-start-navigation', (e, url, isInPlace) => {
        if (!isInPlace) {
            tabMedia[tabId] = [];
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('media-master-updated', { tabId, mediaList: [] });
            }
        }
    });

    // Inject Rounded Corners inside Web Pages
    webContents.on('dom-ready', () => {
        const url = webContents.getURL();
        const isInternal = url.startsWith('ocal://') || url.startsWith('file://') || url.includes('home.html');

        if (isInternal) {
            // Pages that need scrolling get a different treatment
            const needsScroll = url.includes('whats-new.html') || url.includes('settings.html') || url.includes('site-settings.html') || url.includes('games.html');
            if (needsScroll) {
                webContents.insertCSS(`
                    html {
                        border-radius: 12px !important;
                        overflow: hidden !important;
                        background: transparent !important;
                        contain: paint !important;
                    }
                    body {
                        border-radius: 12px !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        background: transparent !important;
                        height: 100vh !important;
                    }
                    html:fullscreen, body:fullscreen,
                    html:-webkit-full-screen, body:-webkit-full-screen,
                    html:fullscreen *, body:fullscreen *,
                    html:-webkit-full-screen *, body:-webkit-full-screen * {
                        border-radius: 0px !important;
                    }
                `);
            } else {
                webContents.insertCSS(`
                    html, body {
                        border-radius: 12px !important;
                        overflow: hidden !important;
                        background: transparent !important;
                        contain: paint !important;
                    }
                    html:fullscreen, body:fullscreen,
                    html:-webkit-full-screen, body:-webkit-full-screen,
                    html:fullscreen *, body:fullscreen *,
                    html:-webkit-full-screen *, body:-webkit-full-screen * {
                        border-radius: 0px !important;
                    }
                `);
            }
        }

        if (!isInternal) {
            const maskColor = userSettings.themeMode === 'light' ? '#f5f5f5' : '#0c0c0c';
            const sbColor = userSettings.themeMode === 'light' ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.16)';
            const sbHover = userSettings.themeMode === 'light' ? 'rgba(0,0,0,0.36)' : 'rgba(255,255,255,0.36)';

            webContents.insertCSS(`
                .ocal-corner-mask {
                    position: fixed !important;
                    width: 12px !important;
                    height: 12px !important;
                    z-index: 2147483647 !important;
                    pointer-events: none !important;
                    --mask-bg: ${maskColor};
                }
                .ocal-corner-mask-tl { top: 0 !important; left: 0 !important; background: radial-gradient(circle at 100% 100%, transparent 12px, var(--mask-bg) 12.5px) !important; }
                .ocal-corner-mask-tr { top: 0 !important; right: 0 !important; background: radial-gradient(circle at 0% 100%, transparent 12px, var(--mask-bg) 12.5px) !important; }
                .ocal-corner-mask-bl { bottom: 0 !important; left: 0 !important; background: radial-gradient(circle at 100% 0%, transparent 12px, var(--mask-bg) 12.5px) !important; }
                .ocal-corner-mask-br { bottom: 0 !important; right: 0 !important; background: radial-gradient(circle at 0% 0%, transparent 12px, var(--mask-bg) 12.5px) !important; }
                
                html:fullscreen .ocal-corner-mask,
                html:-webkit-full-screen .ocal-corner-mask {
                    display: none !important;
                }

                html {
                    scroll-behavior: smooth !important;
                }

                *, html, body {
                    scrollbar-color: initial !important;
                    scrollbar-width: initial !important;
                }
                *::-webkit-scrollbar, html::-webkit-scrollbar, body::-webkit-scrollbar {
                    width: 6px !important;
                    height: 6px !important;
                    background: transparent !important;
                }
                *::-webkit-scrollbar-track, html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
                    background: transparent !important;
                }
                *::-webkit-scrollbar-thumb, html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                    background: ${sbColor} !important;
                    border-radius: 10px !important;
                }
                *::-webkit-scrollbar-thumb:hover, html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover {
                    background: ${sbHover} !important;
                }
            `);

            const injectScript = `
                (function() {
                    if (document.getElementById('ocal-corner-masks-container')) return;
                    const container = document.createElement('div');
                    container.id = 'ocal-corner-masks-container';
                    container.style.position = 'fixed';
                    container.style.inset = '0';
                    container.style.pointerEvents = 'none';
                    container.style.zIndex = '2147483647';
                    
                    const tl = document.createElement('div'); tl.className = 'ocal-corner-mask ocal-corner-mask-tl';
                    const tr = document.createElement('div'); tr.className = 'ocal-corner-mask ocal-corner-mask-tr';
                    const bl = document.createElement('div'); bl.className = 'ocal-corner-mask ocal-corner-mask-bl';
                    const br = document.createElement('div'); br.className = 'ocal-corner-mask ocal-corner-mask-br';
                    
                    container.appendChild(tl);
                    container.appendChild(tr);
                    container.appendChild(bl);
                    container.appendChild(br);
                    
                    if (document.body) {
                        document.body.appendChild(container);
                    } else {
                        document.documentElement.appendChild(container);
                    }
                })();
            `;
            webContents.executeJavaScript(injectScript).catch(() => {});
        }
    });

    // Inject Robust YouTube AdShield fallback & Battery Saver
    webContents.on('did-finish-load', () => {
        const url = webContents.getURL();

        if (userSettings.batterySaver) {
            webContents.insertCSS(`
                * { 
                    animation: none !important; 
                    transition: none !important; 
                    scroll-behavior: auto !important;
                }
                img { image-rendering: -webkit-optimize-contrast !important; }
            `);
        }

        if (url.includes('youtube.com') && userSettings.adBlockEnabled !== false) {
            const adShieldPath = path.join(__dirname, 'youtube-ad-remover.js');
            if (fs.existsSync(adShieldPath)) {
                const script = fs.readFileSync(adShieldPath, 'utf8');
                webContents.executeJavaScript(script).catch(() => { });
                console.log(`[YouTube Enhancer] DOM Injected into ${url} (Ad-Shield + Dislike Recovery)`);
            }
        }

        if (userSettings.cyberStealthEnabled) {
            applyCyberStealth(webContents);
        }
    });

    // Intercept PDF view navigation and internal ocal:// links
    setupInteractionDismissal(webContents);
    webContents.on('will-navigate', (event, targetUrl) => {
        if (targetUrl.startsWith('ocal://')) {
            event.preventDefault();
            webContents.loadURL(targetUrl);
            return;
        }

        const isPdf = /\.pdf($|\?)/i.test(targetUrl);
        if (isPdf && !targetUrl.includes('ocal://pdf-viewer') && !targetUrl.includes('pdf-viewer.html')) {
            event.preventDefault();
            const cleanUrl = normalizeDocumentUrl(targetUrl);
            if (userSettings.pdfViewerEnabled !== false) {
                webContents.loadURL(`ocal://pdf-viewer/?file=${encodeURIComponent(cleanUrl)}`);
            } else {
                webContents.downloadURL(cleanUrl);
            }
            return;
        }
    });

    webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('ocal://')) {
            createNewTab(url);
            return { action: 'deny' };
        }
        if (/\.pdf($|\?)/i.test(url) && !url.includes('ocal://pdf-viewer') && !url.includes('pdf-viewer.html')) {
            const cleanUrl = normalizeDocumentUrl(url);
            if (userSettings.pdfViewerEnabled !== false) {
                createNewTab(`ocal://pdf-viewer?file=${encodeURIComponent(cleanUrl)}`);
            } else {
                webContents.downloadURL(cleanUrl);
            }
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Auto-hide overlays & split screen side focus
    webContents.on('before-input-event', (event, input) => {
        if (input.type === 'mouseDown') closeOverlays();
        if (input.type === 'mouseDown' || input.type === 'keyDown') {
            setActiveSplitSide(tabId, side);
        }
        handleShortcuts(event, input);
    });

    webContents.on('page-favicon-updated', (event, favicons) => {
        if (favicons && favicons.length > 0) {
            const entry = views.find(v => v.id === tabId);
            if (entry) {
                const icon = favicons[0];
                if (side === 'left') {
                    entry.favicon = icon;
                    mainWindow.webContents.send('favicon-updated', { id: tabId, favicon: icon });
                } else {
                    entry.favicon2 = icon;
                    mainWindow.webContents.send('favicon-updated', { id: tabId, favicon2: icon });
                }

                const url = webContents.getURL();
                if (userSettings.history) {
                    const histIndex = userSettings.history.findIndex(h => h.url === url);
                    if (histIndex > -1) {
                        userSettings.history[histIndex].favicon = icon;
                        saveSettings(userSettings);
                        broadcastHistory();
                    }
                }
            }
        }
    });

    webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
        if (isMainFrame) {
            hideSuggestions();
            const tabEntry = views.find(v => v.id === tabId);
            if (tabEntry) {
                if (side === 'left') {
                    tabEntry.url = url;
                }
                broadcastTabs();
                updateViewBounds(url);
            }
        }
    });

    webContents.on('did-navigate', (event, url) => {
        updateHistory(view, url);
        const tabEntry = views.find(v => v.id === tabId);
        if (tabEntry) {
            if (side === 'left') tabEntry.url = url;
        }

        if (tabShieldStats.has(webContents.id)) {
            tabShieldStats.delete(webContents.id);
            broadcastShieldStats(webContents.id);
        }

        broadcastTabs();
        updateViewBounds(url);

        const currentActive = views.find(v => v.id === activeViewId);
        if (currentActive && currentActive.id === tabId && currentActive.focusedSide === side) {
            mainWindow.webContents.send('url-updated', {
                id: tabId,
                url: url.includes('home.html') ? '' : url,
                title: url.includes('home.html') ? 'Ocal Home' : webContents.getTitle(),
                favicon: currentActive.favicon || null
            });
        }
    });

    setupContextMenu(webContents);

    webContents.on('did-navigate-in-page', (event, url) => {
        updateHistory(view, url);
        const tabEntry = views.find(v => v.id === tabId);
        if (tabEntry) {
            if (side === 'left') tabEntry.url = url;
        }
        broadcastTabs();
        updateViewBounds(url);

        const currentActive = views.find(v => v.id === activeViewId);
        if (currentActive && currentActive.id === tabId && currentActive.focusedSide === side) {
            mainWindow.webContents.send('url-updated', {
                id: tabId,
                url: url.includes('home.html') ? '' : url,
                title: url.includes('home.html') ? 'Ocal Home' : webContents.getTitle(),
                favicon: currentActive.favicon || null
            });
        }
    });

    webContents.on('page-title-updated', (event, title) => {
        const url = webContents.getURL();
        const currentActive = views.find(v => v.id === activeViewId);
        if (currentActive && currentActive.id === tabId && currentActive.focusedSide === side) {
            mainWindow.webContents.send('title-updated', { id: tabId, title: url.includes('home.html') ? 'Ocal Home' : title });
        }
    });

    webContents.on('did-start-loading', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('load-progress', { id: tabId, progress: 15 });
        }
    });

    webContents.on('dom-ready', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('load-progress', { id: tabId, progress: 75 });
        }
    });

    webContents.on('did-stop-loading', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('load-progress', { id: tabId, progress: 100 });
        }
    });

    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (isMainFrame) {
            const connectivityErrors = [
                -106, -105, -118, -100, -102, -101
            ];

            if (connectivityErrors.includes(errorCode) && !validatedURL.startsWith('ocal://') && !validatedURL.startsWith('file://')) {
                console.log(`[Rescue] Connectivity Error ${errorCode} on ${validatedURL}. Redirecting to Offline Page.`);
                webContents.loadURL('ocal://offline');
            }
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('load-progress', { id: tabId, progress: 0 });
        }
    });
}

function broadcastTabs() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const tabData = views.map(v => ({
        id: v.id,
        title: v.view.webContents.isDestroyed() ? 'Ocal Home' : (v.view.webContents.getTitle() || 'Ocal Home'),
        url: v.view.webContents.isDestroyed() ? '' : v.view.webContents.getURL(),
        favicon: v.favicon || null,
        groupId: v.groupId || null,
        audible: v.view.webContents.isDestroyed() ? false : v.view.webContents.isCurrentlyAudible(),
        isSplit: !!v.isSplit,
        splitDirection: v.splitDirection || 'horizontal',
        focusedSide: v.focusedSide || 'left',
        title2: (v.isSplit && v.view2 && !v.view2.webContents.isDestroyed()) ? (v.view2.webContents.getTitle() || 'Ocal Home') : '',
        url2: (v.isSplit && v.view2 && !v.view2.webContents.isDestroyed()) ? v.view2.webContents.getURL() : '',
        emoji: v.emoji || null,
        emoji2: v.emoji2 || null,
        favicon2: (v.isSplit && v.view2) ? (v.favicon2 || null) : null
    }));
    mainWindow.webContents.send('tabs-changed', {
        tabs: tabData,
        activeTabId: activeViewId,
        groups: userSettings.tabGroups
    });
    if (sidebarOverlayView && !sidebarOverlayView.webContents.isDestroyed()) {
        sidebarOverlayView.webContents.send('tabs-changed', {
            tabs: tabData,
            activeTabId: activeViewId,
            groups: userSettings.tabGroups
        });
    }
}

function setActiveTab(id) {
    const oldViewEntry = views.find(v => v.id === activeViewId);
    const oldWc = (oldViewEntry && oldViewEntry.view && oldViewEntry.view.webContents && !oldViewEntry.view.webContents.isDestroyed()) ? oldViewEntry.view.webContents : null;

    // Auto-PiP Logic: If previous tab was playing a video and we are switching away, request native PiP.
    if (oldWc && !oldWc.isDestroyed() && tabShieldStats.get(oldWc.id)?.isPlaying) {
        oldWc.send('request-smart-pip');
    }

    if (oldViewEntry && oldViewEntry.view && oldViewEntry.view.webContents && !oldViewEntry.view.webContents.isDestroyed() && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(oldViewEntry.view)) {
            mainWindow.removeBrowserView(oldViewEntry.view);
        }
        if (oldViewEntry.isSplit && oldViewEntry.view2 && !oldViewEntry.view2.webContents.isDestroyed()) {
            if (mainWindow.getBrowserViews().includes(oldViewEntry.view2)) {
                mainWindow.removeBrowserView(oldViewEntry.view2);
            }
        }
    }
    activeViewId = id;
    const newViewEntry = views.find(v => v.id === id);

    if (newViewEntry) {
        newViewEntry.lastActiveTime = Date.now();
        if (newViewEntry.suspended) {
            newViewEntry.suspended = false;
            if (newViewEntry.suspendedUrl && newViewEntry.view && !newViewEntry.view.webContents.isDestroyed()) {
                newViewEntry.view.webContents.loadURL(newViewEntry.suspendedUrl);
                newViewEntry.suspendedUrl = null;
            }
            if (newViewEntry.suspendedUrl2 && newViewEntry.view2 && !newViewEntry.view2.webContents.isDestroyed()) {
                newViewEntry.view2.webContents.loadURL(newViewEntry.suspendedUrl2);
                newViewEntry.suspendedUrl2 = null;
            }
            console.log(`[Memory Saver] Auto-restored suspended tab: ${id}`);
        }
    }

    if (newViewEntry && newViewEntry.view && newViewEntry.view.webContents && !newViewEntry.view.webContents.isDestroyed() && !mainWindow.isDestroyed()) {
        const activeViewToUse = (newViewEntry.isSplit && newViewEntry.focusedSide === 'right' && newViewEntry.view2) ? newViewEntry.view2 : newViewEntry.view;
        const newWc = activeViewToUse.webContents;

        // If the new tab is the one currently in PiP, close the PiP window
        if (pipWindow && !pipWindow.isDestroyed() && pipSourceContents && !pipSourceContents.isDestroyed() && pipSourceContents.id === newWc.id) {
            pipWindow.close();
        }

        if (!mainWindow.getBrowserViews().includes(newViewEntry.view)) {
            mainWindow.addBrowserView(newViewEntry.view);
        }
        if (newViewEntry.isSplit && newViewEntry.view2 && !newViewEntry.view2.webContents.isDestroyed()) {
            if (!mainWindow.getBrowserViews().includes(newViewEntry.view2)) {
                mainWindow.addBrowserView(newViewEntry.view2);
            }
        }
        updateViewBounds();

        if (!newWc.isDestroyed()) {
            const url = newWc.getURL();
            const title = newWc.getTitle();
            mainWindow.webContents.send('url-updated', {
                id,
                url: url.includes('home.html') ? '' : url,
                title: url.includes('home.html') ? 'Ocal Home' : title,
                favicon: newViewEntry.favicon || null
            });
        }
    }
    broadcastTabs();
}

// Track which view is in HTML fullscreen
let htmlFullscreenViewId = null;

function setHtmlFullscreen(id, isFullscreen) {
    htmlFullscreenViewId = isFullscreen ? id : null;
    // Tell the chrome UI to hide/show
    mainWindow.webContents.send('html-fullscreen', isFullscreen);
    updateViewBounds();
}

function isHomeURL(url) {
    if (!url || url === '' || url === 'about:blank') return true;
    // Only detect as home if it's the specific home.html file, not just a search string containing it
    return url.startsWith('file://') && url.toLowerCase().includes('home.html');
}

function updateViewBounds(forcedUrl = null) {
    if (typeof isAnimatingBounds !== 'undefined' && isAnimatingBounds) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const isMaximized = mainWindow.isMaximized();
    const { width, height } = mainWindow.getContentBounds();
    const isFullscreen = !!htmlFullscreenViewId;
    const zoom = getOptimalZoomFactor();

    const winOffset = 0; // Simplified for modern Electron styling

    const hTabs = isFullscreen ? 0 : Math.round((userSettings.compactMode ? 36 : 44) * zoom);
    const hNav = isFullscreen ? 0 : Math.round((userSettings.compactMode ? 40 : 52) * zoom);

    // Bookmark Bar Logic
    let isBmVisible = bookmarkBarVisible;
    const activeViewEntry = views.find(v => v.id === activeViewId);
    const activeView = activeViewEntry?.view;
    const url = forcedUrl || (activeView && !activeView.webContents.isDestroyed() ? activeView.webContents.getURL() : '');
    const isHome = isHomeURL(url);

    if (userSettings.bookmarkBarMode === 'always') isBmVisible = true;
    else if (userSettings.bookmarkBarMode === 'never') isBmVisible = false;
    else if (userSettings.bookmarkBarMode === 'auto') isBmVisible = isHome;

    // Notify renderer of our source-of-truth visibility (crucial to prevent gaps!)
    if (!mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('sync-bookmark-visibility', isBmVisible);
    }

    const hBm = (isFullscreen || !isBmVisible) ? 0 : Math.round((userSettings.compactMode ? 32 : 40) * zoom);
    // yPadding accounts for the potential 1px overlap on Windows 10
    const yPadding = (process.platform === 'win32') ? 1 : 0;
    const yOffset = hTabs + hNav + hBm + yPadding;

    let wSidebar = Math.round(44 * zoom);
    if (isFullscreen || userSettings.sidebarMode === 'hidden' || userSettings.sidebarMode === 'autohide') {
        wSidebar = 0;
    }

    lastYOffset = yOffset;
    lastWSidebar = wSidebar;

    if (activeViewEntry && activeViewEntry.view) {
        if (activeViewEntry.view.webContents && !activeViewEntry.view.webContents.isDestroyed() && mainWindow.getBrowserViews().includes(activeViewEntry.view)) {
            const xBase = Math.round(wSidebar + Math.round(8 * zoom));
            const yBase = Math.round(yOffset + Math.round(2 * zoom));
            const totalWidth = Math.round(width - wSidebar - Math.round(16 * zoom));
            const totalHeight = Math.round(height - yOffset - Math.round(10 * zoom));

            if (isFullscreen) {
                activeViewEntry.view.setBounds({
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                });
            } else if (activeViewEntry.isSplit && activeViewEntry.view2 && !activeViewEntry.view2.webContents.isDestroyed()) {
                const gap = Math.round(4 * zoom);
                if (activeViewEntry.splitDirection === 'vertical') {
                    const halfHeight = Math.floor((totalHeight - gap) / 2);
                    activeViewEntry.view.setBounds({
                        x: xBase,
                        y: yBase,
                        width: totalWidth,
                        height: halfHeight
                    });
                    if (mainWindow.getBrowserViews().includes(activeViewEntry.view2)) {
                        activeViewEntry.view2.setBounds({
                            x: xBase,
                            y: yBase + halfHeight + gap,
                            width: totalWidth,
                            height: totalHeight - halfHeight - gap
                        });
                    }
                } else {
                    const halfWidth = Math.floor((totalWidth - gap) / 2);
                    activeViewEntry.view.setBounds({
                        x: xBase,
                        y: yBase,
                        width: halfWidth,
                        height: totalHeight
                    });
                    if (mainWindow.getBrowserViews().includes(activeViewEntry.view2)) {
                        activeViewEntry.view2.setBounds({
                            x: xBase + halfWidth + gap,
                            y: yBase,
                            width: totalWidth - halfWidth - gap,
                            height: totalHeight
                        });
                    }
                }
            } else {
                activeViewEntry.view.setBounds({
                    x: xBase,
                    y: yBase,
                    width: totalWidth,
                    height: totalHeight
                });
            }
            mainWindow.setTopBrowserView(activeViewEntry.view);
            if (activeViewEntry.isSplit && activeViewEntry.view2 && !activeViewEntry.view2.webContents.isDestroyed() && mainWindow.getBrowserViews().includes(activeViewEntry.view2)) {
                mainWindow.setTopBrowserView(activeViewEntry.view2);
            }
            if (activeViewEntry.view && !activeViewEntry.view.webContents.isDestroyed()) {
                activeViewEntry.view.webContents.send('set-split-mode', !!activeViewEntry.isSplit);
            }
            if (activeViewEntry.isSplit && activeViewEntry.view2 && !activeViewEntry.view2.webContents.isDestroyed()) {
                activeViewEntry.view2.webContents.send('set-split-mode', true);
            }
        }
    }

    // Hide any views that are in collapsed groups to prevent them from staying on top
    views.forEach(v => {
        const group = userSettings.tabGroups.find(g => g.id === v.groupId);
        if (v.id !== activeViewId && group && group.collapsed) {
            if (v.view && v.view.webContents && !v.view.webContents.isDestroyed()) {
                if (mainWindow.getBrowserViews().includes(v.view)) {
                    mainWindow.removeBrowserView(v.view);
                }
            }
            if (v.isSplit && v.view2 && v.view2.webContents && !v.view2.webContents.isDestroyed()) {
                if (mainWindow.getBrowserViews().includes(v.view2)) {
                    mainWindow.removeBrowserView(v.view2);
                }
            }
        }
    });

    // 1. Stack AI Sidebar (on the right)
    if (aiSidebarView && aiSidebarView.webContents && !aiSidebarView.webContents.isDestroyed() && mainWindow.getBrowserViews().includes(aiSidebarView)) {
        const scaledAiSidebarWidth = Math.round(aiSidebarWidth * zoom);
        aiSidebarView.setBounds({
            x: Math.round(width - scaledAiSidebarWidth - winOffset),
            y: Math.round(yOffset + winOffset),
            width: Math.round(scaledAiSidebarWidth),
            height: Math.round(height - yOffset - (winOffset * 2))
        });
        mainWindow.setTopBrowserView(aiSidebarView);
    }

    // 2. Stack Sidebar Overlay (on the left, covering the whole window for backdrop)
    if (sidebarOverlayView && sidebarOverlayView.webContents && !sidebarOverlayView.webContents.isDestroyed() && mainWindow.getBrowserViews().includes(sidebarOverlayView)) {
        sidebarOverlayView.setBounds({
            x: Math.round(wSidebar + winOffset),
            y: Math.round(yOffset + winOffset),
            width: Math.round(width - wSidebar - (winOffset * 2)),
            height: Math.round(height - yOffset - (winOffset * 2))
        });
        mainWindow.setTopBrowserView(sidebarOverlayView);
    }

    // 3. Stack WebApp View (sliding drawer on the left next to Left Sidebar)
    if (webAppOpen && webAppView && webAppView.webContents && !webAppView.webContents.isDestroyed() && mainWindow.getBrowserViews().includes(webAppView)) {
        const webAppWidth = Math.round(960 * zoom);
        webAppView.setBounds({
            x: wSidebar,
            y: Math.round(yOffset),
            width: webAppWidth,
            height: Math.round(height - yOffset)
        });
        mainWindow.setTopBrowserView(webAppView);
    }
}

// Deduplicated closeOverlays removed here
function hideWebApp() {
    if (webAppLoadingTimeout) {
        clearTimeout(webAppLoadingTimeout);
        webAppLoadingTimeout = null;
    }
    webAppOpen = false;
    currentWebAppUrl = null;
    if (webAppView && mainWindow) mainWindow.removeBrowserView(webAppView);
    mainWindow.webContents.send('web-app-closed');
    updateViewBounds();
}

function showWebApp(url) {
    if (webAppLoadingTimeout) {
        clearTimeout(webAppLoadingTimeout);
        webAppLoadingTimeout = null;
    }

    if (!webAppView) {
        webAppView = new BrowserView({
            webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, devTools: false, sandbox: true, additionalArguments: ['--is-sidebar-app'] }
        });
        setupContextMenu(webAppView.webContents);
        webAppView.webContents.setWindowOpenHandler(({ url }) => { createNewTab(url); return { action: 'deny' }; });
    }

    // Always load the loading animation first
    const loadingUrl = 'file:///' + path.join(__dirname, 'sidebar-loading.html').replace(/\\/g, '/') + '?url=' + encodeURIComponent(url);
    webAppView.webContents.loadURL(loadingUrl);
    currentWebAppUrl = url;

    if (!mainWindow.getBrowserViews().includes(webAppView)) mainWindow.addBrowserView(webAppView);

    webAppOpen = true;
    updateViewBounds();

    if (mainWindow && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('web-app-opened', url);
    }

    // Delay actual load by 2 seconds to simulate loading
    webAppLoadingTimeout = setTimeout(() => {
        if (webAppOpen && currentWebAppUrl === url && webAppView && !webAppView.webContents.isDestroyed()) {
            webAppView.webContents.loadURL(url);
        }
        webAppLoadingTimeout = null;
    }, 2000);
}

// Persistence & Global Logic ──────────────────────────────────────────


// IPC Handlers
ipcMain.on('new-tab', (e, url) => createNewTab(url));
ipcMain.on('switch-tab', (e, id) => setActiveTab(id));
ipcMain.on('request-tabs', () => broadcastTabs());
ipcMain.on('open-external', (e, url) => createNewTab(url));
ipcMain.on('hide-popups', (e) => {
    if (e && e.sender) {
        if (webAppView && e.sender === webAppView.webContents) return;
        if (aiSidebarView && e.sender === aiSidebarView.webContents) return;
        if (sidebarOverlayView && e.sender === sidebarOverlayView.webContents) return;
    }
    hidePopups();
});
let lastClosedSplitTab = null;

function handleCloseTabRequest(id) {
    try {
        const entry = views.find(v => v.id === id);
        if (entry && entry.isSplit) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                const activeEntry = views.find(v => v.id === activeViewId);
                if (activeEntry) {
                    if (activeEntry.view && !activeEntry.view.webContents.isDestroyed() && mainWindow.getBrowserViews().includes(activeEntry.view)) {
                        mainWindow.removeBrowserView(activeEntry.view);
                    }
                    if (activeEntry.view2 && !activeEntry.view2.webContents.isDestroyed() && mainWindow.getBrowserViews().includes(activeEntry.view2)) {
                        mainWindow.removeBrowserView(activeEntry.view2);
                    }
                }
                mainWindow.webContents.send('confirm-close-split-tab', id);
            }
        } else {
            executeCloseTab(id);
        }
    } catch (err) {
        console.error('Error in handleCloseTabRequest:', err);
    }
}

function executeCloseTab(id) {
    try {
        if (views.length === 1) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.close();
            }
            return;
        }
        const index = views.findIndex(v => v.id === id);
        if (index !== -1) {
            const [removed] = views.splice(index, 1);
            if (removed.view) {
                if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserViews().includes(removed.view)) {
                    mainWindow.removeBrowserView(removed.view);
                }
                if (!removed.view.webContents.isDestroyed()) {
                    removed.view.webContents.destroy();
                }
            }

            if (removed.isSplit) {
                lastClosedSplitTab = {
                    url: removed.url || 'ocal://home',
                    url2: removed.url2 || 'ocal://home',
                    title: removed.title || 'New Tab',
                    title2: removed.title2 || 'Ocal Home',
                    favicon: removed.favicon || null,
                    favicon2: removed.favicon2 || null,
                    focusedSide: removed.focusedSide || 'left',
                    groupId: removed.groupId || null
                };
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('show-undo-split-toast');
                }
                if (removed.view2) {
                    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserViews().includes(removed.view2)) {
                        mainWindow.removeBrowserView(removed.view2);
                    }
                    if (!removed.view2.webContents.isDestroyed()) {
                        removed.view2.webContents.destroy();
                    }
                }
            }

        delete tabMedia[id]; // Cleanup media storage
        if (activeViewId === id) {
            activeViewId = views.length > 0 ? views[Math.max(0, index - 1)].id : null;
        }
        if (activeViewId) {
            setActiveTab(activeViewId);
        } else {
            updateViewBounds();
        }
        cleanupEmptyGroups();
        broadcastTabs();
    }
    } catch (err) {
        console.error('Error in executeCloseTab:', err);
    }
}

ipcMain.on('close-tab', async (e, id) => {
    handleCloseTabRequest(id);
});

ipcMain.on('close-tab-confirmed', (e, id) => {
    executeCloseTab(id);
});

ipcMain.on('close-tab-cancelled', (e, id) => {
    setActiveTab(activeViewId);
});

ipcMain.on('restore-last-closed-split-tab', () => {
    if (!lastClosedSplitTab) return;

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    
    const view = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: true
        }
    });

    const view2 = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: true
        }
    });

    view.setBackgroundColor('#00000000');
    view2.setBackgroundColor('#00000000');
    view.webContents.setUserAgent(OCAL_USER_AGENT);
    view2.webContents.setUserAgent(OCAL_USER_AGENT);

    setupViewEvents(id, view, 'left');
    setupViewEvents(id, view2, 'right');

    const entry = {
        id,
        view,
        view2,
        isSplit: true,
        splitDirection: 'horizontal',
        focusedSide: lastClosedSplitTab.focusedSide,
        url: lastClosedSplitTab.url,
        url2: lastClosedSplitTab.url2,
        title: lastClosedSplitTab.title,
        title2: lastClosedSplitTab.title2,
        favicon: lastClosedSplitTab.favicon,
        favicon2: lastClosedSplitTab.favicon2,
        groupId: lastClosedSplitTab.groupId
    };

    views.push(entry);

    view.webContents.loadURL(lastClosedSplitTab.url);
    view2.webContents.loadURL(lastClosedSplitTab.url2);

    activeViewId = id;
    setActiveTab(id);
    broadcastTabs();

    lastClosedSplitTab = null;
});

function getActiveViewForNavigation() {
    const entry = views.find(v => v.id === activeViewId);
    if (!entry) return null;
    if (entry.isSplit && entry.focusedSide === 'right' && entry.view2) {
        return entry.view2;
    }
    return entry.view;
}

function cleanupView2(entry) {
    if (entry.view2) {
        if (!entry.view2.webContents.isDestroyed()) {
            if (mainWindow.getBrowserViews().includes(entry.view2)) {
                mainWindow.removeBrowserView(entry.view2);
            }
            entry.view2.webContents.destroy();
        }
        entry.view2 = null;
    }
}

function animateSplitBounds(tabId, startSplit, onComplete = null) {
    const entry = views.find(v => v.id === tabId);
    if (!entry) {
        if (onComplete) onComplete();
        return;
    }

    const zoom = getOptimalZoomFactor();
    const { width, height } = mainWindow.getContentBounds();
    const isFullscreen = !!htmlFullscreenViewId;
    if (isFullscreen) {
        if (onComplete) onComplete();
        return;
    }

    const hTabs = Math.round((userSettings.compactMode ? 36 : 44) * zoom);
    const hNav = Math.round((userSettings.compactMode ? 40 : 52) * zoom);
    let isBmVisible = bookmarkBarVisible;
    const url = entry.view.webContents.isDestroyed() ? '' : entry.view.webContents.getURL();
    const isHome = isHomeURL(url);
    if (userSettings.bookmarkBarMode === 'always') isBmVisible = true;
    else if (userSettings.bookmarkBarMode === 'never') isBmVisible = false;
    else if (userSettings.bookmarkBarMode === 'auto') isBmVisible = isHome;
    
    const hBm = !isBmVisible ? 0 : Math.round((userSettings.compactMode ? 32 : 40) * zoom);
    const yPadding = (process.platform === 'win32') ? 1 : 0;
    const yOffset = hTabs + hNav + hBm + yPadding;
    
    let wSidebar = Math.round(44 * zoom);
    if (userSettings.sidebarMode === 'hidden' || userSettings.sidebarMode === 'autohide') {
        wSidebar = 0;
    }

    const xBase = Math.round(wSidebar + Math.round(8 * zoom));
    const yBase = Math.round(yOffset + Math.round(2 * zoom));
    const totalWidth = Math.round(width - wSidebar - Math.round(16 * zoom));
    const totalHeight = Math.round(height - yOffset - Math.round(10 * zoom));

    const duration = 250;
    const fps = 60;
    const totalFrames = Math.round(duration / (1000 / fps));
    let currentFrame = 0;

    isAnimatingBounds = true;

    const interval = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed() || !entry.view || entry.view.webContents.isDestroyed()) {
            clearInterval(interval);
            isAnimatingBounds = false;
            if (onComplete) onComplete();
            return;
        }

        currentFrame++;
        const progress = currentFrame / totalFrames;
        const eased = 1 - Math.pow(1 - progress, 3);

        const gap = Math.round(4 * zoom);

        if (entry.splitDirection === 'vertical') {
            const targetHalf = Math.floor((totalHeight - gap) / 2);
            if (startSplit) {
                const currentTopHeight = Math.round(totalHeight - (totalHeight - targetHalf) * eased);
                entry.view.setBounds({
                    x: xBase,
                    y: yBase,
                    width: totalWidth,
                    height: currentTopHeight
                });

                if (entry.view2 && !entry.view2.webContents.isDestroyed()) {
                    const bottomHeight = Math.round((totalHeight - targetHalf - gap) * eased);
                    entry.view2.setBounds({
                        x: xBase,
                        y: yBase + currentTopHeight + gap,
                        width: totalWidth,
                        height: bottomHeight
                    });
                }
            } else {
                const currentTopHeight = Math.round(targetHalf + (totalHeight - targetHalf) * eased);
                entry.view.setBounds({
                    x: xBase,
                    y: yBase,
                    width: totalWidth,
                    height: currentTopHeight
                });

                if (entry.view2 && !entry.view2.webContents.isDestroyed()) {
                    const bottomHeight = Math.round((totalHeight - targetHalf - gap) * (1 - eased));
                    entry.view2.setBounds({
                        x: xBase,
                        y: yBase + currentTopHeight + gap,
                        width: totalWidth,
                        height: Math.max(0, bottomHeight)
                    });
                }
            }
        } else {
            const targetHalf = Math.floor((totalWidth - gap) / 2);
            if (startSplit) {
                const currentLeftWidth = Math.round(totalWidth - (totalWidth - targetHalf) * eased);
                entry.view.setBounds({
                    x: xBase,
                    y: yBase,
                    width: currentLeftWidth,
                    height: totalHeight
                });

                if (entry.view2 && !entry.view2.webContents.isDestroyed()) {
                    const rightWidth = Math.round((totalWidth - targetHalf - gap) * eased);
                    entry.view2.setBounds({
                        x: xBase + currentLeftWidth + gap,
                        y: yBase,
                        width: rightWidth,
                        height: totalHeight
                    });
                }
            } else {
                const currentLeftWidth = Math.round(targetHalf + (totalWidth - targetHalf) * eased);
                entry.view.setBounds({
                    x: xBase,
                    y: yBase,
                    width: currentLeftWidth,
                    height: totalHeight
                });

                if (entry.view2 && !entry.view2.webContents.isDestroyed()) {
                    const rightWidth = Math.round((totalWidth - targetHalf - gap) * (1 - eased));
                    entry.view2.setBounds({
                        x: xBase + currentLeftWidth + gap,
                        y: yBase,
                        width: Math.max(0, rightWidth),
                        height: totalHeight
                    });
                }
            }
        }

        if (currentFrame >= totalFrames) {
            clearInterval(interval);
            isAnimatingBounds = false;
            if (onComplete) onComplete();
            updateViewBounds();
        }
    }, 1000 / fps);
}

ipcMain.on('toggle-split-screen', () => {
    if (!activeViewId) return;
    const entry = views.find(v => v.id === activeViewId);
    if (!entry) return;

    if (entry.isSplit) {
        entry.isSplit = false;
        entry.focusedSide = 'left';
        broadcastTabs();
        
        animateSplitBounds(activeViewId, false, () => {
            cleanupView2(entry);
        });
    } else {
        if (views.length <= 1) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('show-toast', 'Open another tab to enable split screen multitasking.');
            }
            return;
        }
        const id = activeViewId;
        const view2 = new BrowserView({
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
                devTools: true
            },
        });
        view2.setBackgroundColor('#00000000');
        view2.webContents.setUserAgent(OCAL_USER_AGENT);
        
        setupViewEvents(id, view2, 'right');
        view2.webContents.loadFile('home.html');

        entry.view2 = view2;
        entry.isSplit = true;
        entry.splitDirection = 'horizontal';
        entry.focusedSide = 'right';

        if (!mainWindow.getBrowserViews().includes(view2)) {
            mainWindow.addBrowserView(view2);
        }
        
        broadcastTabs();
        
        animateSplitBounds(activeViewId, true);
    }
    
    const focusedWc = (entry.isSplit && entry.focusedSide === 'right' && entry.view2) ? entry.view2.webContents : entry.view.webContents;
    if (focusedWc && !focusedWc.isDestroyed()) {
        const url = focusedWc.getURL();
        const title = focusedWc.getTitle();
        mainWindow.webContents.send('url-updated', {
            id: activeViewId,
            url: url.includes('home.html') ? '' : url,
            title: url.includes('home.html') ? 'Ocal Home' : title,
            favicon: entry.favicon || null
        });
    }
});

ipcMain.on('focus-split-side', (e, { tabId, side }) => {
    setActiveSplitSide(tabId, side);
});

let currentDraggedTabId = null;

ipcMain.on('tab-drag-start', (e, tabId) => {
    currentDraggedTabId = tabId;
    const entry = views.find(v => v.id === activeViewId);
    if (entry && !entry.isSplit) {
        if (splitOverlayView && mainWindow && !mainWindow.isDestroyed()) {
            if (!mainWindow.getBrowserViews().includes(splitOverlayView)) {
                mainWindow.addBrowserView(splitOverlayView);
            }
            
            const { width, height } = mainWindow.getContentBounds();
            const zoom = getOptimalZoomFactor();
            
            const hTabs = Math.round((userSettings.compactMode ? 36 : 44) * zoom);
            const hNav = Math.round((userSettings.compactMode ? 40 : 52) * zoom);
            
            let isBmVisible = bookmarkBarVisible;
            if (userSettings.bookmarkBarMode === 'always') isBmVisible = true;
            else if (userSettings.bookmarkBarMode === 'never') isBmVisible = false;
            else if (userSettings.bookmarkBarMode === 'auto') {
                const activeView = entry.view;
                const url = activeView && !activeView.webContents.isDestroyed() ? activeView.webContents.getURL() : '';
                isBmVisible = isHomeURL(url);
            }
            
            const hBm = !isBmVisible ? 0 : Math.round((userSettings.compactMode ? 32 : 40) * zoom);
            const yPadding = (process.platform === 'win32') ? 1 : 0;
            const yOffset = hTabs + hNav + hBm + yPadding;
            
            let wSidebar = Math.round(44 * zoom);
            if (userSettings.sidebarMode === 'hidden' || userSettings.sidebarMode === 'autohide') {
                wSidebar = 0;
            }
            
            const xBase = Math.round(wSidebar + Math.round(8 * zoom));
            const yBase = Math.round(yOffset + Math.round(2 * zoom));
            const totalWidth = Math.round(width - wSidebar - Math.round(16 * zoom));
            const totalHeight = Math.round(height - yOffset - Math.round(10 * zoom));
            
            splitOverlayView.setBounds({
                x: xBase,
                y: yBase,
                width: totalWidth,
                height: totalHeight
            });
            
            mainWindow.setTopBrowserView(splitOverlayView);
            
            if (!splitOverlayView.webContents.isDestroyed()) {
                splitOverlayView.webContents.send('tab-drag-start');
            }
        }
    }
});

ipcMain.on('tab-drag-end', (e) => {
    currentDraggedTabId = null;
    if (splitOverlayView && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(splitOverlayView)) {
            mainWindow.removeBrowserView(splitOverlayView);
        }
        if (!splitOverlayView.webContents.isDestroyed()) {
            splitOverlayView.webContents.send('tab-drag-end');
        }
    }
});

ipcMain.on('drop-tab-to-split', (e, direction) => {
    if (!currentDraggedTabId || !activeViewId) return;

    let sourceId = currentDraggedTabId;
    let targetId = activeViewId;

    if (sourceId === targetId) {
        const otherEntry = views.find(v => v.id !== targetId);
        if (!otherEntry) return;
        sourceId = otherEntry.id;
    }

    const sourceEntry = views.find(v => v.id === sourceId);
    const targetEntry = views.find(v => v.id === targetId);
    if (!sourceEntry || !targetEntry) return;

    const sourceUrl = sourceEntry.view.webContents.getURL();

    ipcMain.emit('close-tab', null, sourceId);

    if (!targetEntry.isSplit) {
        const id = activeViewId;
        const view2 = new BrowserView({
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
                devTools: true
            },
        });
        view2.setBackgroundColor('#00000000');
        view2.webContents.setUserAgent(OCAL_USER_AGENT);
        setupViewEvents(id, view2, 'right');

        targetEntry.view2 = view2;
        targetEntry.isSplit = true;
        targetEntry.splitDirection = (direction === 'top' || direction === 'bottom') ? 'vertical' : 'horizontal';

        if (direction === 'left' || direction === 'top') {
            const currentUrl = targetEntry.view.webContents.getURL();
            view2.webContents.loadURL(currentUrl);
            targetEntry.view.webContents.loadURL(sourceUrl);
            targetEntry.focusedSide = 'left';
        } else {
            view2.webContents.loadURL(sourceUrl);
            targetEntry.focusedSide = 'right';
        }

        if (!mainWindow.getBrowserViews().includes(view2)) {
            mainWindow.addBrowserView(view2);
        }

        broadcastTabs();
        animateSplitBounds(activeViewId, true);
    } else {
        const targetView = (direction === 'left' || direction === 'top') ? targetEntry.view : targetEntry.view2;
        if (targetView && !targetView.webContents.isDestroyed()) {
            targetView.webContents.loadURL(sourceUrl);
        }
    }
    
    currentDraggedTabId = null;
});

ipcMain.on('merge-tabs-to-split', (e, { sourceTabId, targetTabId }) => {
    if (!sourceTabId || !targetTabId || sourceTabId === targetTabId) return;

    const sourceEntry = views.find(v => v.id === sourceTabId);
    const targetEntry = views.find(v => v.id === targetTabId);
    if (!sourceEntry || !targetEntry) return;

    const sourceUrl = sourceEntry.view.webContents.getURL();

    ipcMain.emit('close-tab', null, sourceTabId);

    if (!targetEntry.isSplit) {
        const id = targetTabId;
        const view2 = new BrowserView({
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
                devTools: true
            },
        });
        view2.setBackgroundColor('#00000000');
        view2.webContents.setUserAgent(OCAL_USER_AGENT);
        setupViewEvents(id, view2, 'right');

        view2.webContents.loadURL(sourceUrl);

        targetEntry.view2 = view2;
        targetEntry.isSplit = true;
        targetEntry.splitDirection = 'horizontal';
        targetEntry.focusedSide = 'right';

        if (activeViewId === targetTabId) {
            if (!mainWindow.getBrowserViews().includes(view2)) {
                mainWindow.addBrowserView(view2);
            }
            broadcastTabs();
            animateSplitBounds(targetTabId, true);
        } else {
            setActiveTab(targetTabId);
        }
    } else {
        if (targetEntry.view2 && !targetEntry.view2.webContents.isDestroyed()) {
            targetEntry.view2.webContents.loadURL(sourceUrl);
        }
        setActiveTab(targetTabId);
    }
});

ipcMain.on('navigate-to', (e, url) => {
    if (!url || typeof url !== 'string') return;
    const activeView = getActiveViewForNavigation();
    if (!activeView) return;

    let cleanUrl = url.trim();
    if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
        cleanUrl = cleanUrl.substring(1, cleanUrl.length - 1);
    }

    let targetUrl = cleanUrl;

    const isLocalDrive = /^[a-zA-Z]:[/\\]/.test(cleanUrl);
    const isAbsPath = cleanUrl.startsWith('/') || cleanUrl.startsWith('\\\\');
    if ((isLocalDrive || isAbsPath) && !cleanUrl.startsWith('file://')) {
        targetUrl = 'file:///' + cleanUrl.replace(/\\/g, '/');
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://') && !targetUrl.startsWith('ocal://')) {
        if (cleanUrl === 'settings' || cleanUrl === 'ocal://settings') targetUrl = 'file://' + path.join(__dirname, 'settings.html');
        else if (cleanUrl.startsWith('ocal://settings#')) targetUrl = 'file://' + path.join(__dirname, 'settings.html') + cleanUrl.substring(15);
        else if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) targetUrl = 'https://' + cleanUrl;
        else {
            const engine = userSettings.searchEngine || 'google';
            let baseUrl = 'https://www.google.com/search?q=';
            if (engine === 'bing') baseUrl = 'https://www.bing.com/search?q=';
            else if (engine === 'duckduckgo') baseUrl = 'https://duckduckgo.com/?q=';
            else if (engine === 'brave') baseUrl = 'https://search.brave.com/search?q=';
            else if (engine === 'yahoo') baseUrl = 'https://search.yahoo.com/search?p=';

            if (engine === 'custom' && userSettings.customSearchUrl) {
                targetUrl = userSettings.customSearchUrl.replace('%s', encodeURIComponent(cleanUrl));
            } else {
                targetUrl = baseUrl + encodeURIComponent(cleanUrl);
            }
        }
    }

    const lowerUrl = targetUrl.toLowerCase();
    const isPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || lowerUrl.includes('.pdf#');

    if (isPdf && !lowerUrl.includes('ocal://pdf-viewer')) {
        const cleanUrl = normalizeDocumentUrl(targetUrl);
        targetUrl = `ocal://pdf-viewer?file=${encodeURIComponent(cleanUrl)}`;
    }

    hideSuggestions();
    activeView.webContents.loadURL(resolveInternalURL(targetUrl));
});

ipcMain.on('nav-back', () => { const v = getActiveViewForNavigation(); if (v?.webContents.navigationHistory.canGoBack()) v.webContents.navigationHistory.goBack(); });
ipcMain.on('nav-forward', () => { const v = getActiveViewForNavigation(); if (v?.webContents.navigationHistory.canGoForward()) v.webContents.navigationHistory.goForward(); });
ipcMain.on('nav-reload', () => { const v = getActiveViewForNavigation(); if (v) v.webContents.reload(); });
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
ipcMain.on('window-close', () => mainWindow.close());

ipcMain.on('window-toggle-pin', () => {
    isAlwaysOnTop = !isAlwaysOnTop;
    mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'screen-saver');
    mainWindow.webContents.send('window-pin-status', isAlwaysOnTop);
});



ipcMain.on('toggle-sidebar', (e, open) => {
    sidebarOpen = (open === undefined) ? !sidebarOpen : open;
    if (sidebarOpen) {
        showSidebarOverlay();
        if (sidebarOverlayView) sidebarOverlayView.webContents.send('toggle-sidebar', true);
    } else {
        if (sidebarOverlayView) sidebarOverlayView.webContents.send('toggle-sidebar', false);
        hideSidebarOverlay(); // This line is now redundant as the overlay will hide itself based on the message
    }
});

ipcMain.on('toggle-ai-sidebar', (e, open) => {
    aiSidebarOpen = (open === undefined) ? !aiSidebarOpen : open;
    if (aiSidebarOpen) showAiSidebar(); else hideAiSidebar();
});

ipcMain.on('set-ai-sidebar-width', (e, width) => {
    aiSidebarWidth = width;
    updateViewBounds();
});

ipcMain.on('start-ai-resize', () => {
    mainWindow.webContents.send('ai-resize-started');
});

ipcMain.on('stop-ai-resize', () => {
    mainWindow.webContents.send('ai-resize-stopped');
});

ipcMain.handle('check-default-browser', () => {
    return app.isDefaultProtocolClient('http');
});

ipcMain.handle('set-as-default-browser', () => {
    const isDefault = app.setAsDefaultProtocolClient('http');
    app.setAsDefaultProtocolClient('https');
    return isDefault;
});

// ── Ocal AI Agent Command Center 2.0 ──────────────────────────────────────

// Global AI Context for Multi-Turn Agentic Capabilities
let aiSessionContext = { mode: null, data: {} };

const AI_SITE_MAP = {
    'instagram': 'https://www.instagram.com',
    'insta': 'https://www.instagram.com',
    'facebook': 'https://www.facebook.com',
    'fb': 'https://www.facebook.com',
    'youtube': 'https://www.youtube.com',
    'yt': 'https://www.youtube.com',
    'twitter': 'https://www.twitter.com',
    'x': 'https://www.twitter.com',
    'netflix': 'https://www.netflix.com',
    'gmail': 'https://mail.google.com',
    'google': 'https://www.google.com',
    'github': 'https://www.github.com'
};

ipcMain.handle('ai-agent-execute', async (event, query) => {
    let prompt = '';
    let fileObj = null;
    if (query && typeof query === 'object') {
        prompt = query.query || 'Analyze this file';
        fileObj = query.file;
    } else {
        prompt = query || '';
    }

    if (!prompt.trim()) return { text: "Hello! I'm your Ocal AI. How can I assist you today?", actions: [] };

    const q = prompt.toLowerCase();
    const actions = [];

    const activeEngine = userSettings.aiEngine || 'local';
    const showReasoning = userSettings.aiShowReasoning !== false;
    const style = userSettings.aiResponseStyle || 'detailed';

    const notifyAction = (text, icon = 'fa-spinner fa-spin') => {
        if (showReasoning && aiSidebarView) {
            aiSidebarView.webContents.send('ai-agent-action', { text, icon });
        }
        actions.push({ text, icon });
    };

    const queryActiveLLM = async (promptText, customStyle = style) => {
        if (activeEngine === 'gemini') {
            return await tryGemini(promptText, userSettings.aiApiKey, customStyle, fileObj);
        } else if (activeEngine === 'openai') {
            return await tryOpenAI(promptText, customStyle, fileObj);
        } else if (activeEngine === 'custom') {
            return await tryCustomProvider(promptText, customStyle, fileObj);
        } else {
            return await queryLocalLLM(promptText, customStyle, fileObj);
        }
    };

    try {
        // --- Early Conversational Intercepts ---
        const GREETINGS = ['hi', 'hello', 'hey', 'yo', 'greetings', 'hola', 'bonjour', 'howdy', 'sup', 'good morning', 'good afternoon', 'good evening'];
        const cleanQuery = q.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
        const isSimpleGreeting = GREETINGS.includes(cleanQuery);

        if (isSimpleGreeting) {
            return {
                text: "Hello! I'm your **Ocal AI Assistant**. I can help you navigate, manage tabs, change settings, analyze pages, and more. What can I do for you?",
                actions: []
            };
        }

        // --- Image Generation Intercept ---
        const isImageGen = 
            /\b(?:gen|generate|create|make|draw|paint)\b.*\b(?:image|picture|drawing|painting|photo|portrait|scene|canvas)\b/i.test(q) ||
            /\b(?:image|picture|drawing|painting|photo|portrait|scene|canvas)\b.*\b(?:gen|generate|create|make|draw|paint)\b/i.test(q);

        if (isImageGen) {
            notifyAction('Generating image using Stable Diffusion...', 'fa-image');
            
            // Extract prompt description and strip common verbs/nouns
            let imgPrompt = prompt.replace(/\b(generate|gen|create|make|draw|paint)\s+(?:me\s+|us\s+|for\s+me\s+|for\s+us\s+)?(?:an?\s+|the\s+)?(?:image|picture|drawing|painting|photo|portrait|scene|canvas)?(?:\s+of)?/i, '').trim();
            imgPrompt = imgPrompt.replace(/^(a|an|the)\s+/i, '');

            if (!imgPrompt) imgPrompt = 'a beautiful scenery';

            const imageUrl = `sd://${encodeURIComponent(imgPrompt)}`;

            return {
                text: `Here is the image generated for **"${imgPrompt}"**:\n\n![Generated Image](${imageUrl})\n\n*(Powered by Stable Diffusion synthesis)*`,
                actions: []
            };
        }

        // ─── SETTINGS MODIFICATION COMMANDS ─────────────────────────────
        // Theme switching
        if ((q.includes('dark mode') || q.includes('dark theme')) && (q.includes('switch') || q.includes('enable') || q.includes('turn on') || q.includes('set') || q.includes('change') || q.includes('use') || q.includes('activate'))) {
            userSettings.themeMode = 'dark';
            saveSettings(userSettings);
            broadcastSettings();
            notifyAction('Switching to Dark Mode...', 'fa-moon');
            return { text: "Done! I've switched Ocal to **Dark Mode**. 🌙", actions: [] };
        }

        if ((q.includes('light mode') || q.includes('light theme')) && (q.includes('switch') || q.includes('enable') || q.includes('turn on') || q.includes('set') || q.includes('change') || q.includes('use') || q.includes('activate'))) {
            userSettings.themeMode = 'light';
            saveSettings(userSettings);
            broadcastSettings();
            notifyAction('Switching to Light Mode...', 'fa-sun');
            return { text: "Done! I've switched Ocal to **Light Mode**. ☀️", actions: [] };
        }

        if (q.includes('theme') && (q.includes('what') || q.includes('current') || q.includes('which'))) {
            const current = userSettings.themeMode || 'dark';
            return { text: `Your current theme is **${current === 'light' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}**.\n\nYou can say *"switch to light mode"* or *"switch to dark mode"* to change it.`, actions: [] };
        }

        // Accent color change
        const accentMatch = prompt.match(/(?:change|set|make|switch)\s+(?:the\s+)?(?:accent|color|theme\s+color)\s+(?:to\s+)?(?:color\s+)?([#a-zA-Z0-9]+)/i);
        if (accentMatch || (q.includes('accent') && q.includes('change')) || (q.includes('accent') && q.includes('set'))) {
            const COLOR_MAP = {
                'red': '#ef4444', 'green': '#09f0a0', 'blue': '#3b82f6', 'purple': '#a855f7',
                'pink': '#ec4899', 'orange': '#f97316', 'yellow': '#eab308', 'cyan': '#06b6d4',
                'lime': '#84cc16', 'teal': '#14b8a6', 'indigo': '#6366f1', 'rose': '#f43f5e',
                'emerald': '#10b981', 'amber': '#f59e0b', 'violet': '#8b5cf6', 'sky': '#0ea5e9',
                'white': '#ffffff', 'neon': '#09f0a0', 'gold': '#fbbf24', 'mint': '#34d399',
                'coral': '#fb7185', 'lavender': '#a78bfa', 'peach': '#fbbf24'
            };

            let newColor = null;
            if (accentMatch) {
                const raw = accentMatch[1].toLowerCase();
                if (raw.startsWith('#') && (raw.length === 4 || raw.length === 7)) {
                    newColor = raw;
                } else if (COLOR_MAP[raw]) {
                    newColor = COLOR_MAP[raw];
                }
            }
            if (!newColor) {
                // Try to find a color name anywhere in the query
                for (const [name, hex] of Object.entries(COLOR_MAP)) {
                    if (q.includes(name)) { newColor = hex; break; }
                }
            }

            if (newColor) {
                userSettings.accentColor = newColor;
                saveSettings(userSettings);
                broadcastSettings();
                notifyAction(`Accent color → ${newColor}`, 'fa-palette');
                return { text: `Done! I've changed the accent color to **${newColor}** 🎨.\n\nThe change is applied across the entire browser immediately.`, actions: [] };
            } else {
                return { text: `I can change the accent color! Just tell me a color name or hex code.\n\n**Available colors:** ${Object.keys(COLOR_MAP).map(c => `\`${c}\``).join(', ')}\n\n**Or use a hex code:** e.g. *"set accent to #ff6600"*`, actions: [] };
            }
        }

        // Search engine change
        if (q.includes('search engine') && (q.includes('change') || q.includes('set') || q.includes('switch') || q.includes('use'))) {
            const ENGINES = { 'google': 'google', 'bing': 'bing', 'duckduckgo': 'duckduckgo', 'ddg': 'duckduckgo', 'yahoo': 'yahoo', 'brave': 'brave', 'ecosia': 'ecosia' };
            let newEngine = null;
            for (const [name, val] of Object.entries(ENGINES)) {
                if (q.includes(name)) { newEngine = val; break; }
            }
            if (newEngine) {
                userSettings.searchEngine = newEngine;
                saveSettings(userSettings);
                broadcastSettings();
                notifyAction(`Search engine → ${newEngine}`, 'fa-magnifying-glass');
                return { text: `Done! Your default search engine is now **${newEngine.charAt(0).toUpperCase() + newEngine.slice(1)}** 🔍.`, actions: [] };
            } else {
                return { text: `I can change your search engine! Options: **Google**, **Bing**, **DuckDuckGo**, **Yahoo**, **Brave**, **Ecosia**.\n\nJust say *"change search engine to DuckDuckGo"*.`, actions: [] };
            }
        }

        // Ad-blocking toggle
        if (q.includes('ad') && (q.includes('block') || q.includes('shield'))) {
            if (q.includes('disable') || q.includes('turn off') || q.includes('off')) {
                userSettings.adBlockEnabled = false;
                saveSettings(userSettings);
                broadcastSettings();
                notifyAction('Ad-blocking disabled', 'fa-shield-halved');
                return { text: "Ad-blocking has been **disabled**. ⚠️\n\n> [!WARNING]\n> Ads and trackers will no longer be blocked. You can re-enable it anytime by saying *\"turn on ad blocking\"*.", actions: [] };
            } else if (q.includes('enable') || q.includes('turn on') || q.includes('on')) {
                userSettings.adBlockEnabled = true;
                saveSettings(userSettings);
                broadcastSettings();
                notifyAction('Ad-blocking enabled', 'fa-shield');
                return { text: "Ad-blocking has been **enabled**! 🛡️\n\nYour browsing is now protected from ads and trackers.", actions: [] };
            } else if (q.includes('status') || q.includes('is it') || q.includes('enabled') || q.includes('on')) {
                return { text: `Ad-blocking is currently **${userSettings.adBlockEnabled ? 'enabled ✅' : 'disabled ❌'}**.`, actions: [] };
            }
        }

        // Sidebar mode
        if (q.includes('sidebar') && (q.includes('hide') || q.includes('show') || q.includes('auto') || q.includes('visible'))) {
            if (q.includes('hide') || q.includes('hidden')) {
                userSettings.sidebarMode = 'hidden';
                saveSettings(userSettings);
                broadcastSettings();
                return { text: "Sidebar is now **hidden**. You can bring it back by saying *\"show sidebar\"*.", actions: [] };
            } else if (q.includes('auto')) {
                userSettings.sidebarMode = 'autohide';
                saveSettings(userSettings);
                broadcastSettings();
                return { text: "Sidebar is now in **auto-hide** mode. It will appear when you hover near the edge.", actions: [] };
            } else {
                userSettings.sidebarMode = 'visible';
                saveSettings(userSettings);
                broadcastSettings();
                return { text: "Sidebar is now **visible** ✅.", actions: [] };
            }
        }

        // Bookmark bar mode
        if (q.includes('bookmark') && q.includes('bar') && (q.includes('show') || q.includes('hide') || q.includes('always') || q.includes('auto'))) {
            if (q.includes('hide') || q.includes('never') || q.includes('off')) {
                userSettings.bookmarkBarMode = 'never';
            } else if (q.includes('always') || q.includes('show') || q.includes('on')) {
                userSettings.bookmarkBarMode = 'always';
            } else {
                userSettings.bookmarkBarMode = 'auto';
            }
            saveSettings(userSettings);
            broadcastSettings();
            return { text: `Bookmark bar mode set to **${userSettings.bookmarkBarMode}**.`, actions: [] };
        }

        // HTTPS upgrade toggle
        if (q.includes('https') && (q.includes('upgrade') || q.includes('force'))) {
            if (q.includes('disable') || q.includes('off')) {
                userSettings.httpsUpgradeEnabled = false;
            } else {
                userSettings.httpsUpgradeEnabled = true;
            }
            saveSettings(userSettings);
            broadcastSettings();
            return { text: `HTTPS upgrade is now **${userSettings.httpsUpgradeEnabled ? 'enabled ✅' : 'disabled ❌'}**.`, actions: [] };
        }

        // CyberStealth toggle
        if (q.includes('stealth') || q.includes('cyber stealth') || q.includes('cyberstealth')) {
            if (q.includes('enable') || q.includes('turn on') || q.includes('on') || q.includes('activate')) {
                userSettings.cyberStealthEnabled = true;
                saveSettings(userSettings);
                broadcastSettings();
                notifyAction('CyberStealth activated', 'fa-user-secret');
                return { text: "**CyberStealth Mode** has been **enabled**! 🕵️\n\nYour fingerprint is now being guarded and traces are sanitized.", actions: [] };
            } else if (q.includes('disable') || q.includes('turn off') || q.includes('off') || q.includes('deactivate')) {
                userSettings.cyberStealthEnabled = false;
                saveSettings(userSettings);
                broadcastSettings();
                return { text: "CyberStealth Mode has been **disabled**.", actions: [] };
            }
        }

        // Battery saver toggle
        if (q.includes('battery') && q.includes('saver')) {
            if (q.includes('enable') || q.includes('turn on') || q.includes('on')) {
                userSettings.batterySaver = true;
            } else {
                userSettings.batterySaver = false;
            }
            saveSettings(userSettings);
            broadcastSettings();
            return { text: `Battery saver is now **${userSettings.batterySaver ? 'enabled 🔋' : 'disabled'}**.`, actions: [] };
        }

        // ─── DEEP BROWSER KNOWLEDGE ─────────────────────────────────
        if (q.includes('who owns') || q.includes('who own') || q.includes('owner of') || q.includes('who is the owner')) {
            if (q.includes('ocal') || q.includes('browser')) {
                return {
                    text: "Ocal Browser is owned and developed by **Gaming Network Studio**.\n\nYou can find more details on their official website: [Gaming Network Studio](https://gamingnetworkstudio.vercel.app).",
                    actions: [{ text: "Visit Gaming Network Studio", icon: "fa-globe", url: "https://gamingnetworkstudio.vercel.app" }]
                };
            }
        }

        // Browser status / system info
        if (q.includes('status') || q.includes('system info') || q.includes('browser info') || q.includes('diagnostics') || (q.includes('how') && q.includes('browser') && q.includes('doing'))) {
            const tabCount = views.length;
            const memInfo = await process.getProcessMemoryInfo();
            const memMB = (memInfo.workingSetSize / 1024).toFixed(0);
            const uptime = Math.floor((Date.now() - sessionStartTime) / 60000);
            const adsBlocked = userSettings.shieldStats?.global?.ads || 0;
            const trackersBlocked = userSettings.shieldStats?.global?.trackers || 0;
            const dataSavedMB = ((userSettings.shieldStats?.global?.dataSaved || 0) / 1024 / 1024).toFixed(1);
            const bmCount = (userSettings.bookmarks || []).length;
            const histCount = (userSettings.history || []).length;
            const extCount = (userSettings.extensions || []).length;

            return {
                text: `### 📊 Ocal Browser Status\n\n| Metric | Value |\n|--------|-------|\n| **Version** | v6.3.0-beta |\n| **Engine** | Electron + Chromium |\n| **Open Tabs** | ${tabCount} |\n| **Memory Usage** | ${memMB} MB |\n| **Session Uptime** | ${uptime} min |\n| **Bookmarks** | ${bmCount} |\n| **History Entries** | ${histCount} |\n| **Extensions** | ${extCount} |\n\n### 🛡️ Shield Stats (Lifetime)\n| Stat | Count |\n|------|-------|\n| **Ads Blocked** | ${adsBlocked.toLocaleString()} |\n| **Trackers Stopped** | ${trackersBlocked.toLocaleString()} |\n| **Data Saved** | ${dataSavedMB} MB |\n\n### ⚙️ Active Settings\n| Setting | Value |\n|---------|-------|\n| **Theme** | ${userSettings.themeMode || 'dark'} |\n| **Search Engine** | ${userSettings.searchEngine || 'google'} |\n| **Ad-Blocking** | ${userSettings.adBlockEnabled ? '✅ On' : '❌ Off'} |\n| **HTTPS Upgrade** | ${userSettings.httpsUpgradeEnabled ? '✅ On' : '❌ Off'} |\n| **CyberStealth** | ${userSettings.cyberStealthEnabled ? '✅ On' : '❌ Off'} |\n| **AI Engine** | ${userSettings.aiEngine || 'local'} |\n| **Accent Color** | ${userSettings.accentColor || '#09f0a0'} |`,
                actions: [{ text: "Open Settings Dashboard", icon: "fa-gauge", command: "open-settings", section: "dashboard" }]
            };
        }

        // Current settings query
        if (q.includes('settings') && (q.includes('what') || q.includes('how') || q.includes('explain') || q.includes('list') || q.includes('show') || q.includes('current') || q.includes('my'))) {
            // Check if they want to OPEN settings or know ABOUT settings
            if (q.includes('open') || q.includes('go to') || q.includes('visit')) {
                const matchedSection = ['general', 'search', 'homepage', 'profiles', 'security', 'extensions', 'shortcuts', 'ai', 'about', 'dashboard'].find(sec => q.includes(sec));
                const sectionToOpen = matchedSection || 'general';
                notifyAction(`Opening settings: ${sectionToOpen}...`, 'fa-gear');
                createNewTab(`ocal://settings#${sectionToOpen}`);
                return {
                    text: `I've opened the **${sectionToOpen.toUpperCase()}** settings page for you.`,
                    actions: [{ text: `Open ${sectionToOpen.toUpperCase()} Settings`, icon: "fa-cog", url: `ocal://settings#${sectionToOpen}` }]
                };
            }

            // Otherwise show settings info
            return {
                text: `### ⚙️ Your Current Ocal Settings\n\n| Setting | Value |\n|---------|-------|\n| **Theme** | ${userSettings.themeMode || 'dark'} |\n| **Accent Color** | ${userSettings.accentColor || '#09f0a0'} |\n| **Search Engine** | ${userSettings.searchEngine || 'google'} |\n| **Ad-Blocking** | ${userSettings.adBlockEnabled ? '✅ On' : '❌ Off'} |\n| **HTTPS Upgrade** | ${userSettings.httpsUpgradeEnabled ? '✅ On' : '❌ Off'} |\n| **Safe Browsing** | ${userSettings.safeBrowsingEnabled ? '✅ On' : '❌ Off'} |\n| **CyberStealth** | ${userSettings.cyberStealthEnabled ? '✅ On' : '❌ Off'} |\n| **Sidebar** | ${userSettings.sidebarMode || 'visible'} |\n| **Bookmark Bar** | ${userSettings.bookmarkBarMode || 'auto'} |\n| **Battery Saver** | ${userSettings.batterySaver ? '✅ On' : '❌ Off'} |\n| **AI Engine** | ${userSettings.aiEngine || 'local'} |\n| **Home Layout** | ${userSettings.homeLayout || 'center'} |\n| **Confirm on Exit** | ${userSettings.confirmExit ? 'Yes' : 'No'} |\n\n> [!TIP]\n> You can change any of these by saying things like:\n> - *"Switch to dark mode"*\n> - *"Change accent color to purple"*\n> - *"Set search engine to DuckDuckGo"*\n> - *"Turn off ad-blocking"*\n> - *"Enable CyberStealth"*`,
                actions: [
                    { text: "Open Settings Page", icon: "fa-cog", command: "open-settings", section: "general" },
                    { text: "Open AI Settings", icon: "fa-robot", command: "open-settings", section: "ai" }
                ]
            };
        }

        if (q.includes('bookmark') && (q.includes('open') || q.includes('go to') || q.includes('visit'))) {
            const searchTerm = q.replace(/open|go to|visit|bookmark/gi, '').trim();
            if (searchTerm && userSettings.bookmarks) {
                const match = userSettings.bookmarks.find(b => b.title.toLowerCase().includes(searchTerm) || b.url.toLowerCase().includes(searchTerm));
                if (match) {
                    notifyAction(`Opening bookmark: ${match.title}...`, 'fa-bookmark');
                    createNewTab(match.url);
                    return {
                        text: `I've found and opened your bookmark **"${match.title}"** (${match.url}).`,
                        actions: [{ text: `Open ${match.title}`, icon: "fa-external-link-alt", url: match.url }]
                    };
                } else {
                    return {
                        text: `I couldn't find any bookmark matching **"${searchTerm}"**.`,
                        actions: []
                    };
                }
            }
        }

        // List bookmarks
        if (q.includes('bookmark') && (q.includes('list') || q.includes('show') || q.includes('all') || q.includes('my'))) {
            const bms = userSettings.bookmarks || [];
            if (bms.length === 0) {
                return { text: "You don't have any bookmarks yet. Press **Ctrl+D** to bookmark the current page!", actions: [] };
            }
            const list = bms.slice(0, 15).map((b, i) => `${i + 1}. **${b.title || 'Untitled'}** — \`${b.url.substring(0, 50)}${b.url.length > 50 ? '...' : ''}\``).join('\n');
            return {
                text: `### 🔖 Your Bookmarks (${bms.length} total)\n\n${list}${bms.length > 15 ? `\n\n*...and ${bms.length - 15} more.*` : ''}\n\n> [!TIP]\n> Say *"open bookmark [name]"* to navigate to any bookmark.`,
                actions: []
            };
        }

        // Clear history
        if (q.includes('clear') && q.includes('history')) {
            const count = (userSettings.history || []).length;
            userSettings.history = [];
            saveSettings(userSettings);
            broadcastSettings();
            notifyAction('Clearing browsing history...', 'fa-broom');
            return { text: `Done! I've cleared **${count}** history entries. 🧹`, actions: [] };
        }

        if (cleanQuery === 'help' || q.includes('what can you do') || q.includes('how to use') || q.includes('capabilities') || q.includes('features')) {
            return {
                text: `### 🚀 What I Can Do\n\n#### 🌐 Navigation\n- *"Open YouTube"* — Quick-launch popular sites\n- *"Open bookmark GitHub"* — Find & open bookmarks\n- *"Go to reddit.com"* — Navigate to any URL\n\n#### 📄 Page Analysis\n- *"Summarize this page"* — AI-powered summary\n- *"Explain this page"* — Detailed analysis\n\n#### ⚙️ Settings Control\n- *"Switch to dark mode"* / *"Switch to light mode"*\n- *"Change accent color to purple"*\n- *"Set search engine to DuckDuckGo"*\n- *"Turn on/off ad-blocking"*\n- *"Enable CyberStealth"*\n- *"Hide sidebar"* / *"Show sidebar"*\n- *"Show bookmark bar"*\n\n#### 📊 Browser Intelligence\n- *"Show browser status"* — Live stats & diagnostics\n- *"Show my settings"* — Current configuration\n- *"List my bookmarks"*\n- *"Clear history"*\n\n#### 📧 Productivity\n- *"Compose email"* — Guided email drafting\n- *"Close this tab"* / *"Show all tabs"*\n\n#### 🔍 Knowledge\n- Ask any question — I'll search the web & synthesize answers\n- *"What is Ocal?"* — Learn about the browser`,
                actions: []
            };
        }

        if (q.includes('how are you') || q.includes('how are you doing') || q.includes('how\'s it going') || q.includes('how is it going') || q.includes('how you doing') || q.includes('how are you today')) {
            const tabCount = views.length;
            const adsBlocked = userSettings.shieldStats?.global?.ads || 0;
            return {
                text: `I'm running great! 🚀\n\nI'm currently managing **${tabCount} tabs**, and I've helped block **${adsBlocked.toLocaleString()} ads** so far. Your browser is healthy and running smoothly on your local system.\n\nHow can I help you today?`,
                actions: []
            };
        }

        if (q.includes('who created you') || q.includes('who made you') || q.includes('who is your creator') || q.includes('who built you')) {
            return {
                text: "I was created by **Gaming Network Studio** as the built-in AI assistant for Ocal Browser. I'm designed to help you browse smarter, manage your workspace, and control your browser settings — all while running locally for maximum privacy. 🚀",
                actions: [{ text: "Visit Gaming Network Studio", icon: "fa-globe", url: "https://gamingnetworkstudio.vercel.app" }]
            };
        }

        if (q.includes('what is ocal') || q.includes('what is ocal browser') || q.includes('tell me about ocal')) {
            return {
                text: `### 🌐 About Ocal Browser\n\n**Ocal** is a modern, high-performance web browser built with Electron, designed for speed, privacy, and intelligence.\n\n#### ✨ Key Features\n- **Built-in Ad Blocker** — Blocks ads & trackers automatically\n- **CyberStealth Mode** — Anti-fingerprinting & trace sanitization\n- **AI Assistant** — That's me! Local or cloud-powered intelligence\n- **Shield Stats** — Real-time security dashboard\n- **Custom Themes** — Dark/light modes with customizable accent colors\n- **Tab Groups** — Organize your workspace\n- **Bookmark Manager** — Quick-access bookmark bar\n- **PDF Explorer** — Built-in document viewer\n- **Extension Support** — Load Chrome extensions\n- **HTTPS Upgrade** — Automatic security upgrades\n- **Multi-profile** — Separate browsing identities\n\n**Version:** v6.3.0-beta\n**Developer:** Gaming Network Studio`,
                actions: [{ text: "Visit Gaming Network Studio", icon: "fa-globe", url: "https://gamingnetworkstudio.vercel.app" }]
            };
        }

        if (q.includes('who are you') || q.includes('your name') || q.includes('what are you')) {
            return {
                text: `I am **Ocal AI**, the built-in intelligent assistant for Ocal Browser.\n\n#### What I can do:\n- 🌐 Navigate to sites & manage tabs\n- ⚙️ Change browser settings on command\n- 📄 Summarize & analyze web pages\n- 🔍 Search the web & synthesize answers\n- 📊 Show you browser stats & diagnostics\n- 📧 Help compose professional emails\n\nI run ${userSettings.aiEngine === 'local' ? 'locally on your device for maximum privacy' : `via ${userSettings.aiEngine} cloud API`}. Ask me anything!`,
                actions: []
            };
        }

        if (q.includes('thank you') || q.includes('thanks')) {
            return {
                text: "You're very welcome! Let me know if there's anything else I can do for you. 😊",
                actions: []
            };
        }

        if (q.includes('i love you') || q.includes('you are awesome') || q.includes('you are great') || q.includes('good job') || q.includes('well done')) {
            return {
                text: "Thank you so much! That's very kind of you. I'm glad I can make your browsing experience better! ❤️",
                actions: []
            };
        }
        // --- Multi-Task Sequencing ---
        // Split by " and then ", " then ", " and " (if followed by a command)
        const subTasks = prompt.split(/\s+and\s+then\s+|\s+then\s+|\s+and\s+followed\s+by\s+|\s+;\s+/gi).map(t => t.trim()).filter(Boolean);

        if (subTasks.length > 1) {
            notifyAction(`Sequencing ${subTasks.length} tasks...`, 'fa-list-check');
            let results = [];
            let allActions = [];

            for (const task of subTasks) {
                const res = await ipcMain.handlers['ai-agent-execute'](event, task);
                if (res.text) results.push(res.text);
                if (res.actions) allActions.push(...res.actions);
            }

            return {
                text: `### 📋 Multi-Task Result\n\n${results.join('\n\n---\n\n')}`,
                actions: allActions
            };
        }

        // --- Phase 0: Context Discovery (What is the user looking at?) ---
        const activeTab = views.find(v => v.id === activeViewId);
        const activeUrl = activeTab ? activeTab.view.webContents.getURL() : '';
        const activeTitle = activeTab ? activeTab.view.webContents.getTitle() : '';
        const pageContext = { url: activeUrl, title: activeTitle };
        const isPdfExplorer = activeUrl.startsWith('ocal://file-manager') || activeUrl.includes('file-manager.html');

        // --- Phase 1: PDF Explorer Agency (If in PDF module) ---
        if (isPdfExplorer) {
            // Local Heuristics for PDF Discovery
            if (q.includes('largest') || q.includes('biggest') || q.includes('find') || q.includes('search')) {
                notifyAction("Querying Local Document Index...", 'fa-database');

                // Fetch the list from the system (reuse existing logic)
                const paths = [
                    app.getPath('downloads'), app.getPath('documents'), app.getPath('desktop'),
                    path.join(app.getPath('home'), 'Pictures'), path.join(app.getPath('home'), 'Videos'), path.join(app.getPath('home'), 'Music')
                ];

                let allFiles = [];
                const scan = (dir, depth = 0) => {
                    if (depth > 2) return;
                    try {
                        const items = fs.readdirSync(dir, { withFileTypes: true });
                        for (const item of items) {
                            const fullPath = path.join(dir, item.name);
                            if (item.isDirectory()) scan(fullPath, depth + 1);
                            else if (item.name.toLowerCase().endsWith('.pdf')) {
                                const stats = fs.statSync(fullPath);
                                allFiles.push({ name: item.name, path: fullPath, size: stats.size });
                            }
                        }
                    } catch (e) { }
                };
                paths.forEach(p => scan(p));

                if (q.includes('largest') || q.includes('biggest')) {
                    const largest = allFiles.sort((a, b) => b.size - a.size)[0];
                    if (largest) {
                        return {
                            text: `In your PDF Library, the largest document is **${largest.name}** (${(largest.size / 1024 / 1024).toFixed(1)} MB).`,
                            actions: [{ text: "Open Largest PDF", icon: "fa-arrow-up-right-from-square", url: `ocal://open-file?path=${encodeURIComponent(largest.path)}` }]
                        };
                    }
                }

                if (q.includes('find') || q.includes('search')) {
                    const searchTerm = query.replace(/find|search for|show me/gi, '').trim();
                    if (searchTerm) {
                        return {
                            text: `I've analyzed your system for **"${searchTerm}"**. I can filter this for you in the active tab.`,
                            actions: [{ text: `Filter for "${searchTerm}"`, icon: "fa-filter", command: "pdf-filter", term: searchTerm }]
                        };
                    }
                }
            }
        }

        // --- Phase 2: Email Agent (Personal Productivity & Context Aware) ---
        const qLower = q.trim();
        if (qLower === 'cancel' || qLower === 'reset' || qLower === 'stop') {
            aiSessionContext = { mode: null, data: {} };
            return { text: "I've cleared the current email task. What else can I help you with?", actions: [] };
        }

        const isEmailIntent = q.includes('email') || q.includes('mail') || (q.includes('gmail') && !q.includes('open'));

        if (isEmailIntent || aiSessionContext.mode === 'email') {
            // Initializing context if new
            if (aiSessionContext.mode !== 'email') {
                aiSessionContext.mode = 'email';
                aiSessionContext.data = { to: '', subject: '', body: '' };
            }

            notifyAction("Initializing Email Workspace...", 'fa-envelope-open-text');

            // 1. Data Collection & Extraction
            const emailMatch = query.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
            if (emailMatch) aiSessionContext.data.to = emailMatch[0];

            const aboutMatch = query.match(/about\s+(.*?)(?:\s+saying|\s+telling|\s+asking|$)/i);
            if (aboutMatch) aiSessionContext.data.subject = aboutMatch[1].trim();

            const contentMatch = query.match(/(?:saying|telling|asking|message)\s+(.*)/i);
            if (contentMatch) aiSessionContext.data.body = contentMatch[1].trim();

            // 2. Intelligent Context Inference (Filling missing gaps)
            if (!emailMatch && !isEmailIntent && aiSessionContext.data.to && !aiSessionContext.data.body) {
                aiSessionContext.data.body = query.trim();
            }

            // 3. Smart Subject Detection (If still missing)
            if (aiSessionContext.data.body && !aiSessionContext.data.subject) {
                const b = aiSessionContext.data.body.toLowerCase();
                if (b.includes('fire') || b.includes('performance')) aiSessionContext.data.subject = "Urgent: Performance Review Update";
                else if (b.includes('meeting') || b.includes('call')) aiSessionContext.data.subject = "Meeting Inquiry";
                else if (b.includes('bug') || b.includes('error')) aiSessionContext.data.subject = "Bug Report / Feedback";
                else aiSessionContext.data.subject = "Personal Message from Ocal Browser";
            }

            // 4. Content Professionalization (Ghostwriting)
            if (aiSessionContext.data.to && aiSessionContext.data.body && !aiSessionContext.data._isProfessionalized) {
                notifyAction("Synthesizing professional draft...", 'fa-wand-magic-sparkles');
                const stylized = await professionalizeEmail(aiSessionContext.data.body, aiSessionContext.data.subject, apiKey, pageContext);
                aiSessionContext.data.body = stylized;
                aiSessionContext.data._isProfessionalized = true; // Mark as processed to avoid loops
            }

            // 5. Action: Automatically Open Gmail if enough high-fidelity data exists
            if (aiSessionContext.data.to && aiSessionContext.data.body && aiSessionContext.data._isProfessionalized) {
                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(aiSessionContext.data.to)}&su=${encodeURIComponent(aiSessionContext.data.subject)}&body=${encodeURIComponent(aiSessionContext.data.body)}`;

                notifyAction("Draft Expanded & Ready! Opening Gmail...", 'fa-paper-plane');
                createNewTab(gmailUrl);

                const responseText = `### 🌟 Professional Draft Prepared!\n\nI've **automatically opened** your rewritten message to **${aiSessionContext.data.to}** in a new Gmail tab.\n\n- **Expanded Subject:** *${aiSessionContext.data.subject}*\n- **Status:** Polished and stylish. Ready for your final review.\n\nOcal Email Sequence complete.`;

                aiSessionContext = { mode: null, data: {} };
                return { text: responseText, actions: [{ text: "Re-open Stylish Draft", icon: "fa-envelope-open", url: gmailUrl }] };
            }

            // 5. Guided Prompting (Phase Transitions)
            if (!aiSessionContext.data.to) {
                return {
                    text: `### 📧 Email Agent Mode\nI'm ready to help you compose or professionalize a message.\n\n**Who is the recipient?**\n(Please provide an email address to start)`,
                    actions: []
                };
            }
            if (!aiSessionContext.data.body) {
                return {
                    text: `### 📧 Drafting Workspace\n**Recipient:** \`${aiSessionContext.data.to}\`\n\n**What would you like the message to say?**\nJust type the main points; I'll polish the tone for you.`,
                    actions: [{ text: "Change Recipient", icon: "fa-user-pen", command: "reset-email" }]
                };
            }
        }

        // Phase 0: Local Agentic Heuristics (Always runs, cloud or local)
        if (q.includes('close') && (q.includes('tab') || q.includes('this'))) {
            notifyAction("Identifying active tab...", 'fa-trash-can');
            const target = views.find(v => v.id === activeViewId);
            if (target) {
                closeTab(target.id);
                return { text: "I've closed the active tab for you.", actions };
            }
        }

        if (q.includes('tabs') && (q.includes('summary') || q.includes('all') || q.includes('everything'))) {
            notifyAction("Crawling entire workspace...", 'fa-network-wired');
            const info = views.map(v => `- **${v.view.webContents.getTitle() || 'Untitled'}** (${v.view.webContents.getURL().substring(0, 40)}...)`).join('\n');
            const summary = `You have **${views.length}** active tabs in your workspace:\n\n${info}\n\n> [!TIP]\n> I can jump to any of these or summarize a specific one if you tell me its name!`;
            return { text: summary, actions };
        }

        // Phase 1: Local Tool & Command Recognition
        if (q.match(/(open|go\s*to|visit|launch|opne|vosit|gho\s*to)\s+(.*)/i)) {
            const intentMatch = q.match(/(?:open|go\s*to|visit|launch|opne|vosit|gho\s*to)\s+([a-z0-9]+)/i);
            const target = intentMatch ? intentMatch[1].toLowerCase() : null;

            if (target) {
                // Fuzzy/Key mapping for popular sites
                const siteKeys = Object.keys(AI_SITE_MAP);
                const bestMatchKey = siteKeys.find(key => target.includes(key) || key.includes(target) || (target.length > 3 && key.startsWith(target.substring(0, 3))));

                if (bestMatchKey) {
                    const url = AI_SITE_MAP[bestMatchKey];
                    notifyAction(`Intelligent Navigation: ${bestMatchKey}...`, 'fa-bolt-lightning');
                    createNewTab(url);
                    const prettyName = bestMatchKey.charAt(0).toUpperCase() + bestMatchKey.slice(1);
                    return {
                        text: `### 🚀 Quick-Launch Success!\n\nI recognized your intent for **${prettyName}** (even with the typo!). Navigating you there now.\n\n> [!TIP]\n> Ocal's Direct Navigation engine is typo-tolerant and instant.`,
                        actions: [{ text: `Launch ${prettyName}`, icon: "fa-rocket", url }]
                    };
                }
            }

            const urlMatch = query.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9]+\.[a-z]{2,})/i);
            if (urlMatch) {
                let url = urlMatch[0];
                if (!url.startsWith('http')) url = 'https://' + url;
                notifyAction(`Navigating to ${url}...`, 'fa-compass');
                createNewTab(url);
                return { text: `I've opened **${url}** for you.`, actions };
            }
        }

        // Phase 3: Page Analysis (Summarize/Explain) — Deep Scraping + AI Synthesis
        const isPageInsight = q.includes('summarize') || q.includes('explain') || q.includes('what is this') || q.includes('analyze') || q.includes('summary');

        if (isPageInsight && !fileObj) {
            const activeView = views.find(v => v.id === activeViewId)?.view;
            if (!activeView) return { text: "Please select a tab first so I can analyze it.", actions };

            const url = activeView.webContents.getURL();
            if (url.startsWith('file://') || url.startsWith('ocal://') || url === 'about:blank') {
                return { text: "I can't analyze internal or local pages. Try a web article or site!", actions };
            }

            notifyAction("Scraping page content...", 'fa-download');

            // ── Deep DOM Scraping ──
            const pageData = await activeView.webContents.executeJavaScript(`
                (function() {
                    // Meta extraction
                    const sel = (s) => document.querySelector(s)?.content || document.querySelector(s)?.innerText || '';
                    const meta = {
                        title: document.title || '',
                        description: sel('meta[name="description"]') || sel('meta[property="og:description"]') || '',
                        author: sel('meta[name="author"]') || sel('meta[property="article:author"]') || '',
                        published: sel('meta[property="article:published_time"]') || sel('time[datetime]') || '',
                        hostname: window.location.hostname,
                        url: window.location.href,
                        lang: document.documentElement.lang || 'en'
                    };

                    // Clone and clean the DOM
                    const clone = document.body.cloneNode(true);
                    const removeSelectors = [
                        'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
                        'nav', 'footer', 'header:not(article header)',
                        'aside', '.ad', '.ads', '.advertisement', '.cookie-banner',
                        '.cookie-consent', '.popup', '.modal', '.overlay',
                        '.sidebar', '.widget', '.social-share', '.share-buttons',
                        '.comments', '.comment-section', '#comments',
                        '.related-posts', '.recommended', '.newsletter',
                        '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
                        '.breadcrumb', '.pagination', '.footer', '.nav'
                    ];
                    removeSelectors.forEach(s => {
                        try { clone.querySelectorAll(s).forEach(e => e.remove()); } catch(e) {}
                    });

                    // Try to find the main content area
                    const contentSelectors = ['article', '[role="main"]', 'main', '.post-content', '.article-content', '.entry-content', '.content', '#content', '.post-body', '.story-body'];
                    let mainContent = null;
                    for (const cs of contentSelectors) {
                        const el = clone.querySelector(cs);
                        if (el && el.innerText.trim().length > 200) {
                            mainContent = el;
                            break;
                        }
                    }
                    if (!mainContent) mainContent = clone;

                    // Extract headings with hierarchy
                    const headings = [];
                    mainContent.querySelectorAll('h1, h2, h3, h4').forEach(h => {
                        const text = h.innerText.trim();
                        if (text.length > 2 && text.length < 200) {
                            headings.push({ level: parseInt(h.tagName[1]), text });
                        }
                    });

                    // Extract paragraphs (the core content)
                    const paragraphs = [];
                    mainContent.querySelectorAll('p').forEach(p => {
                        const text = p.innerText.trim();
                        if (text.length > 40) {
                            paragraphs.push(text);
                        }
                    });

                    // Extract list items
                    const listItems = [];
                    mainContent.querySelectorAll('li').forEach(li => {
                        const text = li.innerText.trim();
                        if (text.length > 15 && text.length < 300) {
                            listItems.push(text);
                        }
                    });

                    // Full text for word count
                    const fullText = mainContent.innerText || '';
                    const wordCount = fullText.split(/\\s+/).filter(w => w.length > 0).length;

                    // Stats
                    const imgCount = mainContent.querySelectorAll('img').length;
                    const linkCount = mainContent.querySelectorAll('a[href]').length;

                    // Build structured content string (capped to avoid token overflow)
                    let structuredContent = '';

                    // Add headings outline
                    if (headings.length > 0) {
                        structuredContent += 'HEADINGS OUTLINE:\\n';
                        headings.slice(0, 20).forEach(h => {
                            structuredContent += '  '.repeat(h.level - 1) + h.text + '\\n';
                        });
                        structuredContent += '\\n';
                    }

                    // Add paragraphs (main content body)
                    if (paragraphs.length > 0) {
                        structuredContent += 'MAIN CONTENT:\\n';
                        let charBudget = 8000;
                        for (const p of paragraphs) {
                            if (charBudget <= 0) break;
                            structuredContent += p + '\\n\\n';
                            charBudget -= p.length;
                        }
                    }

                    // Add key list items
                    if (listItems.length > 0) {
                        structuredContent += 'KEY LIST ITEMS:\\n';
                        listItems.slice(0, 15).forEach(li => {
                            structuredContent += '• ' + li + '\\n';
                        });
                    }

                    return {
                        meta,
                        headings: headings.slice(0, 20),
                        paragraphCount: paragraphs.length,
                        wordCount,
                        imgCount,
                        linkCount,
                        listItemCount: listItems.length,
                        structuredContent: structuredContent.substring(0, 12000)
                    };
                })()
            `).catch(() => null);

            if (!pageData || !pageData.structuredContent || pageData.structuredContent.length < 50) {
                return { text: "I couldn't extract enough content from this page. The page might be dynamically loaded or require login.", actions };
            }

            notifyAction("Analyzing content structure...", 'fa-microchip');

            // Build a rich AI prompt
            const isExplain = q.includes('explain');
            const isAnalyze = q.includes('analyze');
            const taskVerb = isExplain ? 'explain' : isAnalyze ? 'analyze' : 'summarize';

            const aiPrompt = `You are an expert content analyst. ${taskVerb.charAt(0).toUpperCase() + taskVerb.slice(1)} the following web page content.

PAGE METADATA:
- Title: ${pageData.meta.title}
- URL: ${pageData.meta.url}
- Author: ${pageData.meta.author || 'Unknown'}
- Description: ${pageData.meta.description || 'None'}
- Word Count: ~${pageData.wordCount} words
- Images: ${pageData.imgCount} | Links: ${pageData.linkCount}

${pageData.structuredContent}

INSTRUCTIONS:
- Do NOT just copy or rephrase the content. Provide a genuinely useful ${taskVerb === 'explain' ? 'explanation' : taskVerb === 'analyze' ? 'analysis' : 'summary'}.
- Identify the main topic, key arguments, and conclusions.
- Use clear markdown formatting with headers and bullet points.
- ${taskVerb === 'summarize' ? 'Keep it concise (3-5 key points max) but insightful.' : ''}
- ${taskVerb === 'explain' ? 'Break down complex concepts into simple terms. Explain the significance.' : ''}
- ${taskVerb === 'analyze' ? 'Evaluate the content critically. Note strengths, gaps, and the target audience.' : ''}
- Start with a one-sentence TL;DR.
- End with a "Key Takeaways" section.`;

            notifyAction("Generating AI summary...", 'fa-wand-magic-sparkles');
            const results = await queryActiveLLM(aiPrompt, style);

            if (results) {
                let providerNote = "";
                if (activeEngine === 'local') {
                    let resolvedModelName = userSettings.localModel || 'gemma-4';
                    if (resolvedModelName === 'auto') {
                        let endpoint = userSettings.localEndpoint || 'http://127.0.0.1:11434';
                        if (endpoint.includes('localhost')) {
                            endpoint = endpoint.replace('localhost', '127.0.0.1');
                        }
                        try {
                            const tagsUrl = `${endpoint.replace(/\/$/, '')}/api/tags`;
                            const tagsRes = await fetch(tagsUrl, { signal: AbortSignal.timeout(1500) });
                            if (tagsRes.ok) {
                                const tagsData = await tagsRes.json();
                                if (tagsData.models && tagsData.models.length > 0) {
                                    resolvedModelName = tagsData.models[0].name;
                                } else {
                                    resolvedModelName = 'gemma-4';
                                }
                            } else {
                                resolvedModelName = 'gemma-4';
                            }
                        } catch (e) {
                            resolvedModelName = 'gemma-4';
                        }
                    }
                    providerNote = `\n\n> [!NOTE]\n> Analyzed locally using **${resolvedModelName}** for maximum privacy.`;
                } else if (activeEngine === 'gemini') {
                    providerNote = `\n\n> [!NOTE]\n> Analyzed using **Gemini Pro**.`;
                } else if (activeEngine === 'openai') {
                    providerNote = `\n\n> [!NOTE]\n> Analyzed using **ChatGPT**.`;
                } else if (activeEngine === 'custom') {
                    providerNote = `\n\n> [!NOTE]\n> Analyzed using custom model **${userSettings.customModel || 'OpenAI-compatible'}**.`;
                }
                return { text: results + providerNote, actions };
            }

            // ── Fallback: Intelligent Local Heuristic Summary ──
            notifyAction("Performing local content analysis...", 'fa-brain');

            // Extract the actual structured content for heuristic analysis
            const fallbackData = await activeView.webContents.executeJavaScript(`
                (function() {
                    const clone = document.body.cloneNode(true);
                    ['script','style','noscript','iframe','nav','footer','aside','.ad','.cookie-banner','header:not(article header)'].forEach(s => {
                        try { clone.querySelectorAll(s).forEach(e => e.remove()); } catch(e) {}
                    });

                    const contentSelectors = ['article','[role="main"]','main','.post-content','.article-content','.entry-content','.content'];
                    let main = null;
                    for (const cs of contentSelectors) {
                        const el = clone.querySelector(cs);
                        if (el && el.innerText.trim().length > 200) { main = el; break; }
                    }
                    if (!main) main = clone;

                    // Get paragraphs for analysis
                    const paras = [];
                    main.querySelectorAll('p').forEach(p => {
                        const t = p.innerText.trim();
                        if (t.length > 50) paras.push(t);
                    });

                    // Get headings
                    const heads = [];
                    main.querySelectorAll('h1,h2,h3').forEach(h => {
                        const t = h.innerText.trim();
                        if (t.length > 2) heads.push(t);
                    });

                    return { paras, heads, title: document.title };
                })()
            `).catch(() => null);

            if (fallbackData && fallbackData.paras.length > 0) {
                // Score sentences by information density
                const importantKeywords = [
                    'important', 'key', 'main', 'significant', 'conclusion', 'result',
                    'finding', 'shows', 'reveals', 'demonstrates', 'according',
                    'research', 'study', 'data', 'evidence', 'report', 'announced',
                    'feature', 'release', 'update', 'new', 'launch', 'introduce',
                    'because', 'therefore', 'however', 'although', 'moreover',
                    'first', 'second', 'finally', 'overall', 'summary'
                ];

                const scored = fallbackData.paras.map(p => {
                    let score = 0;
                    const lower = p.toLowerCase();
                    // Keyword density scoring
                    importantKeywords.forEach(kw => { if (lower.includes(kw)) score += 3; });
                    // Position bonus: first paragraphs are usually more important
                    score += Math.max(0, 5 - fallbackData.paras.indexOf(p));
                    // Length bonus: not too short, not too long
                    if (p.length > 80 && p.length < 500) score += 2;
                    // Penalize very repetitive or boilerplate text
                    if (lower.includes('cookie') || lower.includes('subscribe') || lower.includes('sign up') || lower.includes('privacy policy')) score -= 10;
                    return { text: p, score };
                }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

                const topPoints = scored.slice(0, 5);

                // Detect the overall topic from headings and top paragraphs
                const allText = (fallbackData.heads.join(' ') + ' ' + topPoints.map(p => p.text).join(' ')).toLowerCase();
                let topic = 'General Content';
                const topicMap = {
                    'technology': ['software', 'app', 'code', 'developer', 'programming', 'api', 'tech', 'digital', 'computer', 'algorithm'],
                    'business': ['company', 'market', 'revenue', 'startup', 'investment', 'industry', 'enterprise', 'growth'],
                    'science': ['research', 'study', 'experiment', 'scientific', 'discovery', 'theory', 'hypothesis'],
                    'news': ['reported', 'announced', 'breaking', 'update', 'latest', 'today', 'yesterday'],
                    'tutorial': ['how to', 'step', 'guide', 'tutorial', 'learn', 'beginner', 'instructions'],
                    'product': ['feature', 'release', 'version', 'launch', 'pricing', 'plan', 'download'],
                    'opinion': ['think', 'believe', 'opinion', 'perspective', 'argument', 'debate']
                };
                for (const [t, keywords] of Object.entries(topicMap)) {
                    const matches = keywords.filter(kw => allText.includes(kw)).length;
                    if (matches >= 2) { topic = t.charAt(0).toUpperCase() + t.slice(1); break; }
                }

                let result = `### 📄 Page Summary: ${pageData.meta.title}\n\n`;
                result += `**Source:** ${pageData.meta.hostname} | **Topic:** ${topic} | **~${pageData.wordCount} words**\n\n`;

                if (pageData.meta.description) {
                    result += `> ${pageData.meta.description}\n\n`;
                }

                // Content outline from headings
                if (fallbackData.heads.length > 1) {
                    result += `#### 📋 Content Outline\n`;
                    fallbackData.heads.slice(0, 8).forEach(h => { result += `- ${h}\n`; });
                    result += '\n';
                }

                // Key insights (not just copied — reframed)
                result += `#### 💡 Key Insights\n`;
                topPoints.forEach((p, i) => {
                    // Truncate long paragraphs and add insight framing
                    const truncated = p.text.length > 200 ? p.text.substring(0, 200) + '...' : p.text;
                    result += `${i + 1}. ${truncated}\n\n`;
                });

                result += `---\n> [!NOTE]\n> This summary was generated using local content analysis heuristics. For AI-powered deep summaries, configure an AI model in Settings → AI Assistant.`;
                return { text: result, actions };
            }

            return { text: "I couldn't extract meaningful content from this page. It may be too dynamic or require scrolling to load content.", actions };
        }

        // Phase 4: General Assistant (Direct Sidebar Answer with Environment Context)
        const tabContext = `[Environment Context] Open Tabs: ${views.length} (${views.map(v => v.view.webContents.getTitle()).join(', ')}).`;

        let finalPrompt = prompt;
        if (fileObj && fileObj.type === 'text') {
            const isPdf = fileObj.name.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                finalPrompt = `[User attached a PDF Document named "${fileObj.name}"].
Here is the extracted text content from the PDF:
=========================================
${fileObj.data}
=========================================

User query regarding this PDF: ${prompt}`;
            } else {
                finalPrompt = `[User attached a text file named "${fileObj.name}"]:
\`\`\`
${fileObj.data}
\`\`\`

User query regarding this file: ${prompt}`;
            }
        }

        const directAnswer = await queryActiveLLM(`${tabContext}\n\nQuery: ${finalPrompt}`, style);
        if (directAnswer) return { text: directAnswer, actions };

        // Final Fallback: Live Web Intelligence (RAG-lite)
        notifyAction("Researching live web data...", 'fa-earth-americas');
        const snippets = await researchWeb(prompt);

        if (snippets && snippets.length > 0) {
            notifyAction("Synthesizing search results...", 'fa-wand-magic-sparkles');
            const synthesisPrompt = `You are Ocal AI, a high-performance browser assistant. Synthesize these search snippets to answer the user query: "${prompt}".
Provide a highly detailed, comprehensive, structured, and thoroughly explained answer. Break down complex points, explain their significance, and present the information clearly with Markdown headings and bullet points.

Search Snippets:
${snippets.map((s, idx) => `[${idx + 1}] (${s.title}): ${s.snippet}`).join('\n')}

Synthesized detailed answer:`;
            
            const synthesis = await queryActiveLLM(synthesisPrompt, style);

            // Construct reference pills HTML
            let referencePillsHtml = `\n\n#### 🔗 References\n<div class="ref-pills-container" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; border-radius: 0 !important;">`;
            snippets.forEach(s => {
                let domain = s.title || 'Source';
                let faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
                if (s.url) {
                    referencePillsHtml += `<a href="${s.url}" class="msg-ref-pill" style="border-radius: 100px !important;"><img src="${faviconUrl}" style="width: 12px; height: 12px; border-radius: 2px; vertical-align: middle; margin-right: 4px; pointer-events: none;" /> ${domain}</a>`;
                } else {
                    referencePillsHtml += `<span class="msg-ref-pill" style="border-radius: 100px !important;"><img src="${faviconUrl}" style="width: 12px; height: 12px; border-radius: 2px; vertical-align: middle; margin-right: 4px;" /> ${domain}</span>`;
                }
            });
            referencePillsHtml += `</div>\n`;

            if (synthesis) {
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(prompt)}`;
                return {
                    text: `### 🌐 Web Intelligence: ${prompt}\n\n${synthesis}${referencePillsHtml}\n\n> [!TIP]\n> You can view the full results or dive deeper into these sources by opening the search page below.`,
                    actions: [...actions, { text: "Open Search Results", icon: "fa-external-link-alt", url: searchUrl }]
                };
            }

            let fallbackSynthesis = `### 🌐 Web Intelligence: ${prompt}\n\n`;
            
            // Core Summary
            const coreSummary = snippets[0].snippet;
            fallbackSynthesis += `#### 📌 Core Summary\n${coreSummary}\n\n`;

            // Detailed Explanation (Moved detailed explanation before references and formatted cleanly with site favicons)
            fallbackSynthesis += `#### 📖 Detailed Explanation\n\n`;
            snippets.forEach((s, i) => {
                let domain = s.title || 'Source';
                let faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
                fallbackSynthesis += `##### <img src="${faviconUrl}" style="width: 16px; height: 16px; border-radius: 3px; vertical-align: middle; margin-right: 6px; display: inline-block;" /> ${domain}\n${s.snippet}\n\n`;
            });

            // References at the very bottom
            fallbackSynthesis += referencePillsHtml;

            fallbackSynthesis += `\n\n---\n\n> [!NOTE]\n> This research was compiled locally via web heuristics. To get fully synthesized conversational answers, you can enable a local LLM or cloud model in settings.`;

            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(prompt)}`;
            return {
                text: fallbackSynthesis,
                actions: [...actions, { text: "Open Search Results", icon: "fa-external-link-alt", url: searchUrl }]
            };
        }

        // Search Fallback if no snippets found
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(prompt)}`;
        return { 
            text: `I couldn't reach any AI models and was unable to fetch web snippets for **"${prompt}"**.\n\nWould you like to search the web in a new tab?`, 
            actions: [...actions, { text: "Search in New Tab", icon: "fa-search", url: searchUrl }] 
        };

    } catch (err) {
        console.error('[Agent Error]', err);
        return { error: "I encountered an issue processing that. Please try again or check your settings." };
    }
});

async function professionalizeEmail(notes, subject, apiKey, context = {}) {
    let contextStr = '';
    if (context && context.title) {
        contextStr = `\nBrowsing Context: User is currently looking at "${context.title}" (${context.url}). Use this to make the email more personal if relevant.`;
    }

    const prompt = `You are Ocal AI Concierge. 
    Mission: Professionalize these notes into a warm, elite, and stylish email draft.
    
    User Notes: "${notes}"
    Subject: "${subject}"
    ${contextStr}
    
    Constraints:
    - NO Markdown Alerts (no > [!TIP] or > [!NOTE]). Do not include technical metadata.
    - NO Placeholders (do not use "[Recipient Name]" or "[Your Name]").
    - Greeting: Start with a warm "Hello," or "Hi," unless a name is explicitly known from notes.
    - Style: High-performance, concise, and human. 
    - Signature: End exactly with this signature block:
    
      Best regards,
      Ocal AI Assistant
      Sent via Ocal Agent | Your High-Performance Browser
      
    Respond ONLY with the email text.`;

    // Try active provider first, with fallbacks
    const activeEngine = userSettings.aiEngine || 'local';
    let result = null;
    try {
        if (activeEngine === 'gemini') {
            result = await tryGemini(prompt, userSettings.aiApiKey, 'formal');
        } else if (activeEngine === 'openai') {
            result = await tryOpenAI(prompt, 'formal');
        } else if (activeEngine === 'custom') {
            result = await tryCustomProvider(prompt, 'formal');
        } else {
            result = await queryLocalLLM(prompt, 'formal');
        }
        if (result && result.length > 10) return result;
    } catch (e) {
        console.warn('[Professionalize] Active AI provider failed:', e.message);
    }

    // Fallbacks
    if (!result && userSettings.aiApiKey) {
        try { result = await tryGemini(prompt, userSettings.aiApiKey, 'formal'); } catch (e) {}
    }
    if (!result && userSettings.openaiApiKey) {
        try { result = await tryOpenAI(prompt, 'formal'); } catch (e) {}
    }
    if (!result && userSettings.customEndpoint) {
        try { result = await tryCustomProvider(prompt, 'formal'); } catch (e) {}
    }
    if (!result) {
        try { result = await queryLocalLLM(prompt, 'formal'); } catch (e) {}
    }
    if (result && result.length > 10) return result;

    // Fallback: Adaptive Premium Template Engine
    const isShort = notes.length < 60;
    let greeting = "Hello,";

    if (isShort) {
        // Human-First Direct Messaging (Natural & Warm)
        let template = `${greeting}\n\nI'm reaching out to **${notes.trim()}**.\n\nI hope you're having a great day! \n\nBest regards,\n\n**Ocal Professional Assistant**\n*Sent via Ocal Agent*`;
        return template;
    }

    let bodyIntro = `I'm reaching out regarding **${subject}**`;
    if (context && context.title) bodyIntro += ` after reviewing the latest details on **${context.title}**`;

    let template = `${greeting}\n\n${bodyIntro}.\n\nSpecifically, I wanted to follow up on the following:\n\n> ${notes}\n\nPlease let me know if there's anything else needed to move this forward.\n\nBest regards,\n\n**Ocal Professional Assistant**\n*Sent via Ocal Agent | Your High-Performance Browser*`;
    return template;
}

/**
/**
 * Helper: Query OpenAI (ChatGPT)
 */
async function tryOpenAI(prompt, style = 'detailed', fileObj = null) {
    const apiKey = userSettings.openaiApiKey;
    if (!apiKey) return null;

    try {
        let stylePrompt = "Keep responses brief and relevant.";
        if (style === 'detailed') {
            stylePrompt = "Provide highly detailed, comprehensive, structured, and thoroughly explained answers. Do not keep them brief.";
        } else if (style === 'creative') {
            stylePrompt = "Provide creative, engaging, and rich answers.";
        }

        const messages = [
            { role: 'system', content: `You are Ocal AI, a helpful browser assistant. Style: ${style}. Format: Markdown. ${stylePrompt}` }
        ];

        if (fileObj && fileObj.type === 'image') {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${fileObj.mimeType};base64,${fileObj.data}`
                        }
                    }
                ]
            });
        } else {
            messages.push({ role: 'user', content: prompt });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || null;
        } else {
            console.warn('[OpenAI Error]', response.statusText);
        }
    } catch (e) {
        console.warn('[OpenAI Request Failed]', e.message);
    }
    return null;
}

/**
 * Helper: Query Custom OpenAI-Compatible Provider
 */
async function tryCustomProvider(prompt, style = 'detailed', fileObj = null) {
    const endpoint = userSettings.customEndpoint;
    const model = userSettings.customModel || 'deepseek-chat';
    const apiKey = userSettings.customApiKey;
    if (!endpoint) return null;

    try {
        const url = `${endpoint.replace(/\/$/, '')}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        let stylePrompt = "Keep responses brief and relevant.";
        if (style === 'detailed') {
            stylePrompt = "Provide highly detailed, comprehensive, structured, and thoroughly explained answers. Do not keep them brief.";
        } else if (style === 'creative') {
            stylePrompt = "Provide creative, engaging, and rich answers.";
        }

        const messages = [
            { role: 'system', content: `You are Ocal AI, a helpful browser assistant. Style: ${style}. Format: Markdown. ${stylePrompt}` }
        ];

        if (fileObj && fileObj.type === 'image') {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${fileObj.mimeType};base64,${fileObj.data}`
                        }
                    }
                ]
            });
        } else {
            messages.push({ role: 'user', content: prompt });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || null;
        } else {
            console.warn('[Custom Provider Error]', response.statusText);
        }
    } catch (e) {
        console.warn('[Custom Provider Request Failed]', e.message);
    }
    return null;
}

/**
 * Helper: Query local LLM (Ollama) if running on the device.
 */
async function queryLocalLLM(prompt, style = 'detailed', fileObj = null) {
    let endpoint = userSettings.localEndpoint || 'http://127.0.0.1:11434';
    if (endpoint.includes('localhost')) {
        endpoint = endpoint.replace('localhost', '127.0.0.1');
    }
    let model = userSettings.localModel || 'gemma-4';

    try {
        // 1. Auto-discover the first available model from Ollama if set to auto
        if (model === 'auto') {
            const tagsUrl = `${endpoint.replace(/\/$/, '')}/api/tags`;
            const tagsRes = await fetch(tagsUrl, { signal: AbortSignal.timeout(1500) });
            if (tagsRes.ok) {
                const tagsData = await tagsRes.json();
                if (tagsData.models && tagsData.models.length > 0) {
                    model = tagsData.models[0].name;
                } else {
                    model = 'gemma-4';
                }
            } else {
                model = 'gemma-4';
            }
        }

        if (model === 'auto') {
            model = 'gemma-4';
        }

        // 2. Post chat query request to Ollama
        const chatUrl = `${endpoint.replace(/\/$/, '')}/api/chat`;
        
        let stylePrompt = "Keep responses brief and relevant.";
        if (style === 'detailed') {
            stylePrompt = "Provide highly detailed, comprehensive, structured, and thoroughly explained answers. Do not keep them brief.";
        } else if (style === 'creative') {
            stylePrompt = "Provide creative, engaging, and rich answers.";
        }

        const sysPrompt = `You are Ocal AI, a high-performance local browser assistant.
        Style: ${style}. Format: Markdown. ${stylePrompt}`;

        const userMessage = { role: 'user', content: prompt };
        if (fileObj && fileObj.type === 'image') {
            userMessage.images = [fileObj.data]; // Array of base64 strings
        }

        const response = await fetch(chatUrl, {
            method: 'POST',
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: sysPrompt },
                    userMessage
                ],
                stream: false
            }),
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000)
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.message?.content;
            if (text) return text;
        }
    } catch (e) {
        console.warn('[Local LLM Warning] Local model query failed:', e.message);
    }
    return null;
}

/**
 * Helper: Refined Gemini fetch logic with model fallback loop.
 */
async function tryGemini(prompt, apiKey, style = 'detailed', fileObj = null) {
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-flash-latest'];
    for (const model of modelsToTry) {
        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            let stylePrompt = "Keep responses brief and relevant.";
            if (style === 'detailed') {
                stylePrompt = "Provide highly detailed, comprehensive, structured, and thoroughly explained answers. Do not keep them brief.";
            } else if (style === 'creative') {
                stylePrompt = "Provide creative, engaging, and rich answers.";
            }

            const sysPrompt = `You are Ocal AI, a high-performance browser assistant. 
            Context: You have access to the user's tabs and browser environment.
            Capabilities: You can summarize pages, navigate to sites, and handle MULTI-TASK requests.
            Style: ${style}. Format: Markdown. Use "> [!TIP]" for insights and "> [!NOTE]" for technical details.
            If a user asks for multiple things, address them sequentially in your response. ${stylePrompt}`;

            const contents = { parts: [] };
            if (fileObj && fileObj.type === 'image') {
                contents.parts.push({
                    inlineData: {
                        mimeType: fileObj.mimeType,
                        data: fileObj.data
                    }
                });
            }
            contents.parts.push({ text: `${sysPrompt}\n\nQuery: ${prompt}` });

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify({ contents: [contents] }),
                headers: { 'Content-Type': 'application/json' }
            });

            const resultData = await response.json();
            if (resultData.error) {
                console.warn(`[Gemini API Warning] ${model}:`, resultData.error.message);
                continue; // Try next model on error (High demand, quota, etc.)
            }
            const aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) return aiText;
        } catch (err) {
            console.warn(`[Gemini Fallback] ${model} failed:`, err.message);
            continue; // Continue to next model regardless of error type
        }
    }
    return null;
}

/**
 * Helper: Perform a background web research for Local AI.
 * Uses a simulated "Headless Search" pattern to extract snippets.
 */
/**
 * Helper: Decode HTML/XML entities in text.
 */
function decodeHtmlEntities(str) {
    if (!str) return '';
    return str
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#x22;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#x26;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&#x3C;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x3E;/g, '>')
        .replace(/&#x2F;/g, '/')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Helper: Perform a background web research for Local AI.
 * Uses a simulated "Headless Search" pattern to extract snippets.
 */
async function researchWeb(query) {
    // 1. Try DuckDuckGo HTML Search first (highly reliable, no robot blocks)
    try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(ddgUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        if (response.ok) {
            const html = await response.text();
            const snippets = [];
            const matches = html.matchAll(/<a[^>]*class="result__snippet"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g);
            for (const match of matches) {
                if (snippets.length >= 4) break;
                let url = match[1];
                const text = match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                
                if (url.includes('uddg=')) {
                    try {
                        url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
                    } catch (e) {}
                }
                
                if (text.length > 20) {
                    let title = 'Source';
                    try {
                        const parsedUrl = new URL(url);
                        title = parsedUrl.hostname.replace('www.', '');
                    } catch(e) {}
                    
                    snippets.push({
                        snippet: decodeHtmlEntities(text),
                        url: url,
                        title: title
                    });
                }
            }
            if (snippets.length > 0) return snippets;
        }
    } catch (e) {
        console.warn('[Research Web] DuckDuckGo fallback failed:', e.message);
    }

    // 2. Fallback to Google Search
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const html = await response.text();
        const snippets = [];

        // Extract using regex, try to associate with google search URL as fallback link
        const matches = html.matchAll(/<div class="VwiC3b y67Nj fOa9pe[^>]*><span>(.*?)<\/span>/g);
        for (const match of matches) {
            if (snippets.length >= 4) break;
            const text = match[1].replace(/<[^>]*>/g, '').trim();
            if (text.length > 30) {
                snippets.push({
                    snippet: decodeHtmlEntities(text),
                    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                    title: 'Google Search'
                });
            }
        }

        if (snippets.length === 0) {
            const matches2 = html.matchAll(/<span class="st">(.*?)<\/span>|<div class="kCrYT"><div><div class="BNeawe s3v9rd AP7Wnd">(.*?)<\/div>/g);
            for (const match of matches2) {
                if (snippets.length >= 4) break;
                const m = match[1] || match[2];
                if (m) {
                    snippets.push({
                        snippet: decodeHtmlEntities(m.replace(/<[^>]*>/g, '').trim()),
                        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                        title: 'Google Search'
                    });
                }
            }
        }

        return snippets.length > 0 ? snippets : null;
    } catch (err) {
        console.error('[Research Web Error]', err);
        return null;
    }
}

// Retro-compatibility for existing AI calls
ipcMain.handle('ai-summarize-page', async (e) => (await ipcMain.emit('ai-agent-execute', e, 'summarize')).text);
ipcMain.handle('ai-search-web', async (e, q) => (await ipcMain.emit('ai-agent-execute', e, `search for ${q}`)).text);
ipcMain.handle('ai-chat-query', async (e, q) => (await ipcMain.emit('ai-agent-execute', e, q)).text);


ipcMain.on('execute-agent-command', (event, action) => {
    if (action.command === 'open-settings') {
        createNewTab(`ocal://settings#${action.section || 'general'}`);
        return;
    }

    const activeTab = views.find(v => v.id === activeViewId);
    if (!activeTab || !activeTab.view || activeTab.view.webContents.isDestroyed()) return;

    if (action.command === 'pdf-filter') {
        activeTab.view.webContents.send('perform-agent-command', action);
    }
});

ipcMain.on('toggle-web-app', (e, url) => {
    if (webAppOpen && currentWebAppUrl === url) {
        hideWebApp();
    } else {
        showWebApp(url);
    }
});

ipcMain.on('pip-video-status', (e, data) => {
    if (pipWindow) {
        pipWindow.webContents.send('pip-video-update', data);
    }
});

ipcMain.handle('get-shield-stats', (e, tabId) => {
    const viewItem = tabId ? views.find(v => v.id === tabId) : null;
    const wc = viewItem ? viewItem.view.webContents : null;
    if (!wc) return { global: userSettings.shieldStats?.global || {}, page: null, sessionStartTime };

    const isYouTube = wc.getURL().includes('youtube.com');
    return {
        global: userSettings.shieldStats.global,
        page: tabShieldStats.get(wc.id) || { ads: 0, trackers: 0 },
        sessionStartTime,
        isYouTube
    };
});

ipcMain.on('pip-control', (e, { action, value }) => {
    if (!pipSourceContents || pipSourceContents.isDestroyed()) return;

    switch (action) {
        case 'toggle-play':
            pipSourceContents.executeJavaScript('const v = document.querySelector("video"); if (v) v.paused ? v.play() : v.pause();');
            break;
        case 'seek':
            pipSourceContents.executeJavaScript(`const v = document.querySelector("video"); if (v) v.currentTime = ${value};`);
            break;
        case 'skip':
            pipSourceContents.executeJavaScript(`const v = document.querySelector("video"); if (v) v.currentTime += ${value};`);
            break;
        case 'toggle-mute':
            pipSourceContents.executeJavaScript('const v = document.querySelector("video"); if (v) v.muted = !v.muted;');
            break;
        case 'toggle-pip-pin':
            if (pipWindow) {
                const isTop = pipWindow.isAlwaysOnTop();
                pipWindow.setAlwaysOnTop(!isTop);
            }
            break;
        case 'next-video':
            // Targets the YouTube "Next" button or general browser navigation as fallback
            pipSourceContents.executeJavaScript(`
                const nextBtn = document.querySelector('.ytp-next-button') || document.querySelector('a.ytp-next-button');
                if (nextBtn) nextBtn.click();
            `);
            break;
        case 'toggle-captions':
            // Targets the YouTube "Subtitles" button
            pipSourceContents.executeJavaScript(`
                const subBtn = document.querySelector('.ytp-subtitles-button');
                if (subBtn) subBtn.click();
            `);
            break;
        case 'toggle-loop':
            pipSourceContents.executeJavaScript('const v = document.querySelector("video"); if (v) v.loop = !v.loop;');
            break;
        case 'volume':
            pipSourceContents.executeJavaScript(`const v = document.querySelector("video"); if (v) { v.volume = ${value}; if (v.volume > 0) v.muted = false; }`);
            break;
        case 'speed':
            pipSourceContents.executeJavaScript(`const v = document.querySelector("video"); if (v) v.playbackRate = ${value};`);
            break;
        case 'return':
            if (mainWindow) {
                mainWindow.focus();
                // Find tab and activate it
                const entry = views.find(v => v.view.webContents === pipSourceContents);
                if (entry) setActiveTab(entry.id);
            }
            break;
    }
});

ipcMain.on('minimize-pip-window', () => {
    if (pipWindow && !pipWindow.isDestroyed()) {
        pipWindow.minimize();
    }
});
ipcMain.on('switch-sidebar-tab', (e, tab) => {
    sidebarOpen = true;
    showSidebarOverlay();
    if (sidebarOverlayView && !sidebarOverlayView.webContents.isDestroyed()) {
        sidebarOverlayView.webContents.send('toggle-sidebar', true);
        sidebarOverlayView.webContents.send('switch-tab-sidebar', tab);
    }
});
ipcMain.on('close-all-sidebars', () => closeOverlays());

ipcMain.on('open-tab-group-popup', (e, { groupId, x, y }) => {
    if (!tabgroupView || !mainWindow) return;
    const group = userSettings.tabGroups.find(g => g.id === groupId);
    if (!group) return;

    if (!mainWindow.getBrowserViews().includes(tabgroupView)) {
        mainWindow.addBrowserView(tabgroupView);
    }

    const popupWidth = 260;
    activePopupGroupId = groupId;

    // Adjust x if it would go off screen
    const contentBounds = mainWindow.getContentBounds();
    let finalX = x;
    if (x + popupWidth > contentBounds.width) finalX = contentBounds.width - popupWidth - 10;

    tabgroupView.setBounds({
        x: 0,
        y: 0,
        width: contentBounds.width,
        height: contentBounds.height
    });

    tabgroupView.webContents.send('show-popup', { x: finalX, y });

    mainWindow.setTopBrowserView(tabgroupView);
    tabgroupView.webContents.send('group-data', group);
});

ipcMain.on('hide-tab-group-popup', () => {
    if (tabgroupView && mainWindow.getBrowserViews().includes(tabgroupView)) {
        mainWindow.removeBrowserView(tabgroupView);
    }
    activePopupGroupId = null;
});

function cleanupEmptyGroups() {
    console.log(`[CLEANUP] Start. Total tabGroups in settings:`, userSettings.tabGroups?.length);
    if (!userSettings.tabGroups) return;
    const activeGroupIds = new Set(views.map(v => v.groupId).filter(Boolean));
    console.log(`[CLEANUP] Active group IDs in views:`, Array.from(activeGroupIds));
    const originalCount = userSettings.tabGroups.length;
    userSettings.tabGroups = userSettings.tabGroups.filter(g => activeGroupIds.has(g.id));
    console.log(`[CLEANUP] Retained groups:`, userSettings.tabGroups.map(g => g.id));
    if (userSettings.tabGroups.length !== originalCount) {
        console.log(`[CLEANUP] Groups length changed from ${originalCount} to ${userSettings.tabGroups.length}. Saving settings.`);
        saveSettings(userSettings);
    }
}

ipcMain.on('show-tab-context', (e, data) => {
    cleanupEmptyGroups();
    if (!tabContextView || !mainWindow) return;

    const zoom = getOptimalZoomFactor();
    const contentBounds = mainWindow.getContentBounds();
    const initialWidth = Math.round(260 * zoom);
    const initialHeight = Math.round(200 * zoom);
    
    let initialX = data.x;
    let initialY = data.y;
    if (initialX + initialWidth > contentBounds.width) initialX = contentBounds.width - initialWidth - 5;
    if (initialY + initialHeight > contentBounds.height) initialY = contentBounds.height - initialHeight - 5;

    tabContextView.setBounds({
        x: Math.round(initialX),
        y: Math.round(initialY),
        width: initialWidth,
        height: initialHeight
    });

    if (!mainWindow.getBrowserViews().includes(tabContextView)) {
        mainWindow.addBrowserView(tabContextView);
    }
    mainWindow.setTopBrowserView(tabContextView);

    tabContextView._x = data.x;
    tabContextView._y = data.y;
    tabContextView.webContents.send('render-tab-context', data);
});

ipcMain.on('hide-tab-context', () => {
    if (tabContextView && mainWindow && mainWindow.getBrowserViews().includes(tabContextView)) {
        mainWindow.removeBrowserView(tabContextView);
    }
});

ipcMain.on('resize-tab-context', (e, data) => {
    if (tabContextView && tabContextView._x !== undefined) {
        const zoom = getOptimalZoomFactor();
        const contentBounds = mainWindow.getContentBounds();
        const scaledWidth = Math.round(data.width * zoom);
        const scaledHeight = Math.round(data.height * zoom);
        let finalX = tabContextView._x;
        let finalY = tabContextView._y;

        if (finalX + scaledWidth > contentBounds.width) finalX = contentBounds.width - scaledWidth - 5;
        if (finalY + scaledHeight > contentBounds.height) finalY = contentBounds.height - scaledHeight - 5;

        tabContextView.setBounds({
            x: Math.round(finalX),
            y: Math.round(finalY),
            width: scaledWidth,
            height: scaledHeight
        });
    }
});

ipcMain.on('tab-context-action', (e, data) => {
    console.log(`[IPC][tab-context-action] Received data:`, data);
    if (tabContextView && mainWindow && mainWindow.getBrowserViews().includes(tabContextView)) {
        console.log(`[IPC][tab-context-action] Removing tabContextView`);
        mainWindow.removeBrowserView(tabContextView);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (data.action === 'close-tab') {
            console.log(`[IPC][tab-context-action] Directly closing tab:`, data.tabId);
            ipcMain.emit('close-tab', null, data.tabId);
        } else if (data.action === 'create-tab-group') {
            console.log(`[IPC][tab-context-action] Directly creating group for tab:`, data.tabId);
            ipcMain.emit('create-tab-group', null, { name: '', color: '#a855f7', tabIds: [data.tabId] });
        } else if (data.action === 'remove-from-group') {
            console.log(`[IPC][tab-context-action] Directly removing tab from group:`, data.tabId);
            ipcMain.emit('remove-from-group', null, data.tabId);
        } else if (data.action === 'add-to-group') {
            console.log(`[IPC][tab-context-action] Directly adding tab to group:`, { tabId: data.tabId, groupId: data.groupId });
            ipcMain.emit('add-to-group', null, { tabId: data.tabId, groupId: data.groupId });
        } else if (data.action === 'set-tab-emoji') {
            const entry = views.find(v => v.id === data.tabId);
            if (entry) {
                if (entry.isSplit) {
                    if (entry.focusedSide === 'right') {
                        entry.emoji2 = data.emoji;
                    } else {
                        entry.emoji = data.emoji;
                    }
                } else {
                    entry.emoji = data.emoji;
                }
                broadcastTabs();
            }
        }
    }
});

function createMediaMasterView() {
    mediaMasterView = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            devTools: false,
            contextIsolation: true
        }
    });
    mediaMasterView.webContents.loadFile('media-popup.html');
}

ipcMain.on('show-media-popup', (e, { x, y, width, tabId }) => {
    if (!mediaMasterView || !mainWindow) return;

    if (!mainWindow.getBrowserViews().includes(mediaMasterView)) {
        mainWindow.addBrowserView(mediaMasterView);
    }

    const { width: winWidth, height: winHeight } = mainWindow.getContentBounds();
    mediaMasterView.setBounds({ x: 0, y: 0, width: winWidth, height: winHeight });
    mainWindow.setTopBrowserView(mediaMasterView);

    mediaMasterView.webContents.send('popup-data', { x, y, width, tabId });
});

// ── Media Master Asset Management ──
const tabMedia = {}; // { tabId: [mediaAssets] }

ipcMain.on('media-detected', (event, mediaList) => {
    const webContents = event.sender;
    const tab = views.find(v => v.view.webContents === webContents);
    if (!tab) return;

    // Merge or replace media for this tab
    if (!tabMedia[tab.id]) tabMedia[tab.id] = [];

    // Simple deduplication by URL
    const existingUrls = new Set(tabMedia[tab.id].map(m => m.url));
    const newItems = mediaList.filter(m => !existingUrls.has(m.url));

    if (newItems.length > 0) {
        tabMedia[tab.id] = [...tabMedia[tab.id], ...newItems];
        // Broadcast to renderer for toolbar icon update
        mainWindow.webContents.send('media-master-updated', {
            tabId: tab.id,
            mediaList: tabMedia[tab.id]
        });
    }
});

ipcMain.handle('get-tab-media', (e, tabId) => {
    return tabMedia[tabId] || [];
});

ipcMain.on('download-media', (e, { url }) => {
    // We send the download request to the main window's webContents or the sender's webContents
    // Electron's downloadURL works on a session or webContents.
    e.sender.downloadURL(url);
});

ipcMain.on('hide-media-popup', () => {
    if (mediaMasterView && mainWindow.getBrowserViews().includes(mediaMasterView)) {
        mainWindow.removeBrowserView(mediaMasterView);
    }
});

ipcMain.on('request-tab-group-data', (e) => {
    if (!activePopupGroupId) return;
    const group = userSettings.tabGroups.find(g => g.id === activePopupGroupId);
    if (group && tabgroupView) {
        tabgroupView.webContents.send('group-data', group);
    }
});

ipcMain.on('set-bar-visible', (e, visible) => { bookmarkBarVisible = visible; updateViewBounds(); });
ipcMain.on('open-screenshot-toolbar', (e, data) => {
    showSidebarOverlay();
    if (sidebarOverlayView) {
        mainWindow.setTopBrowserView(sidebarOverlayView);
        sidebarOverlayView.webContents.send('show-screenshot-toolbar', data);
    }
});
ipcMain.on('execute-app-quit', () => {
    isQuitting = true;
    app.exit(0);
});

// Tab Grouping IPCs
ipcMain.on('create-tab-group', (e, { name, color, tabIds }) => {
    console.log(`[IPC][create-tab-group] Received:`, { name, color, tabIds });
    const groupId = 'group-' + Date.now();
    userSettings.tabGroups.push({ id: groupId, name, color, collapsed: false });
    tabIds.forEach(tid => {
        const v = views.find(v => v.id === tid);
        console.log(`[IPC][create-tab-group] Mapping view ID ${tid}: found? ${!!v}`);
        if (v) v.groupId = groupId;
    });
    saveSettings(userSettings);
    broadcastTabs();
});

ipcMain.on('add-to-group', (e, { tabId, groupId }) => {
    console.log(`[IPC][add-to-group] Received:`, { tabId, groupId });
    const v = views.find(v => v.id === tabId);
    console.log(`[IPC][add-to-group] Mapping view ID ${tabId}: found? ${!!v}`);
    if (v) v.groupId = groupId;
    cleanupEmptyGroups();
    saveSettings(userSettings);
    broadcastTabs();
});

ipcMain.on('remove-from-group', (e, tabId) => {
    console.log(`[IPC][remove-from-group] Received tabId:`, tabId);
    const v = views.find(v => v.id === tabId);
    console.log(`[IPC][remove-from-group] Mapping view ID ${tabId}: found? ${!!v}`);
    if (v) v.groupId = null;
    cleanupEmptyGroups();
    saveSettings(userSettings);
    broadcastTabs();
});

ipcMain.on('toggle-group-collapse', (e, groupId) => {
    const g = userSettings.tabGroups.find(g => g.id === groupId);
    if (g) {
        g.collapsed = !g.collapsed;
        // If the active tab was in this group and it's now collapsed, we might need to switch
        const activeTab = views.find(v => v.id === activeViewId);
        if (g.collapsed && activeTab && activeTab.groupId === groupId) {
            // Find first tab NOT in a collapsed group to switch to
            const nextTab = views.find(v => {
                const group = userSettings.tabGroups.find(vg => vg.id === v.groupId);
                return !group || !group.collapsed;
            });
            if (nextTab) setActiveTab(nextTab.id);
        }
        saveSettings(userSettings);
        broadcastTabs();
        updateViewBounds();
    }
});

ipcMain.on('update-group', (e, { groupId, name, color }) => {
    const g = userSettings.tabGroups.find(g => g.id === groupId);
    if (g) {
        if (name !== undefined) g.name = name;
        if (color !== undefined) g.color = color;
        saveSettings(userSettings);
        broadcastTabs();
    }
});

ipcMain.on('ungroup', (e, groupId) => {
    userSettings.tabGroups = userSettings.tabGroups.filter(g => g.id !== groupId);
    views.forEach(v => { if (v.groupId === groupId) v.groupId = null; });
    saveSettings(userSettings);
    broadcastTabs();
});

ipcMain.on('update-setting', (e, key, val) => {
    userSettings[key] = val;
    saveSettings(userSettings);

    // Broadcast to all relevant views
    broadcastSettings(userSettings);

    if (key === 'compactMode' || key === 'bookmarkBarMode' || key === 'sidebarMode') updateViewBounds();
    if (key === 'dns') console.log(`[DNS] Global resolver updated to: ${val}`);
    if (key === 'batterySaver') applyBatterySaverGlobally();

    if (key === 'adBlockEnabled' || key === 'trackingProtection') {
        applyShieldSettings();
    }

    if (key === 'themeMode') {
        const bgColor = val === 'light' ? '#ffffff' : '#0c0c0e';
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setBackgroundColor(bgColor);
        }
        views.forEach(v => {
            if (v.view && !v.view.webContents.isDestroyed()) {
                v.view.setBackgroundColor('#00000000');
            }
        });
    }
});


ipcMain.handle('import-bookmarks', async (event, browser) => {
    try {
        let bookmarkPath = '';
        const appData = process.env.LOCALAPPDATA;

        if (browser === 'chrome') {
            bookmarkPath = path.join(appData, 'Google/Chrome/User Data/Default/Bookmarks');
        } else if (browser === 'edge') {
            bookmarkPath = path.join(appData, 'Microsoft/Edge/User Data/Default/Bookmarks');
        } else {
            return { success: false, error: 'Unsupported browser' };
        }

        if (!fs.existsSync(bookmarkPath)) {
            if (browser === 'chrome') bookmarkPath = path.join(appData, 'Google/Chrome/User Data/Profile 1/Bookmarks');
            if (browser === 'edge') bookmarkPath = path.join(appData, 'Microsoft/Edge/User Data/Profile 1/Bookmarks');
            if (!fs.existsSync(bookmarkPath)) return { success: false, error: `${browser} bookmarks not found.` };
        }

        const data = JSON.parse(fs.readFileSync(bookmarkPath, 'utf8'));
        const imported = [];
        const folderMap = new Map(); // name -> id

        function getOrCreateFolder(name) {
            if (!name) return null;
            const existing = userSettings.folders.find(f => f.name.toLowerCase() === name.toLowerCase());
            if (existing) return existing.id;
            if (folderMap.has(name)) return folderMap.get(name);

            const newId = 'f-' + Date.now() + Math.random().toString(36).substr(2, 5);
            userSettings.folders.push({ id: newId, name: name });
            folderMap.set(name, newId);
            return newId;
        }

        function parseNode(node, folderId = null) {
            if (node.type === 'url') {
                imported.push({ title: node.name, url: node.url, folderId: folderId, id: Date.now() + Math.random().toString(36).substr(2, 9) });
            } else if (node.type === 'folder' && node.children) {
                const newFolderId = getOrCreateFolder(node.name);
                node.children.forEach(child => parseNode(child, newFolderId || folderId));
            }
        }

        if (data.roots) {
            if (data.roots.bookmark_bar) parseNode(data.roots.bookmark_bar);
            if (data.roots.other) parseNode(data.roots.other);
            if (data.roots.synced) parseNode(data.roots.synced);
        }

        const existingUrls = new Set(userSettings.bookmarks.map(b => b.url));
        const newItems = imported.filter(item => !existingUrls.has(item.url));

        if (newItems.length > 0 || folderMap.size > 0) {
            userSettings.bookmarks = [...userSettings.bookmarks, ...newItems];
            saveSettings(userSettings);
            broadcastBookmarks();
        }

        return { success: true, count: newItems.length };
    } catch (err) {
        console.error('[Import] Failed:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('import-bookmark-file', async (event) => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Bookmark File',
            filters: [
                { name: 'Bookmarks', extensions: ['html', 'htm', 'json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelled' };

        const filePath = filePaths[0];
        const ext = path.extname(filePath).toLowerCase();
        let imported = [];
        const folderMap = new Map();

        function getOrCreateFolder(name) {
            if (!name) return null;
            const existing = userSettings.folders.find(f => f.name.toLowerCase() === name.toLowerCase());
            if (existing) return existing.id;
            if (folderMap.has(name)) return folderMap.get(name);
            const newId = 'f-' + Date.now() + Math.random().toString(36).substr(2, 5);
            userSettings.folders.push({ id: newId, name: name });
            folderMap.set(name, newId);
            return newId;
        }

        if (ext === '.json') {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            function parseNode(node, folderId = null) {
                if (node.type === 'url') imported.push({ title: node.name, url: node.url, folderId: folderId, id: Date.now() + Math.random().toString(36).substr(2, 9) });
                else if (node.type === 'folder' && node.children) {
                    const newFolderId = getOrCreateFolder(node.name);
                    node.children.forEach(child => parseNode(child, newFolderId || folderId));
                }
            }
            if (data.roots) {
                if (data.roots.bookmark_bar) parseNode(data.roots.bookmark_bar);
                if (data.roots.other) parseNode(data.roots.other);
                if (data.roots.synced) parseNode(data.roots.synced);
            }
        } else {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            let currentFolderId = null;

            for (const line of lines) {
                const folderMatch = /<H3[^>]*>(.*?)<\/H3>/i.exec(line);
                if (folderMatch) {
                    currentFolderId = getOrCreateFolder(folderMatch[1]);
                    continue;
                }
                const urlMatch = /<A\s+HREF="([^"]+)"[^>]*>(.*?)<\/A>/i.exec(line);
                if (urlMatch) {
                    imported.push({
                        url: urlMatch[1],
                        title: urlMatch[2],
                        folderId: currentFolderId,
                        id: Date.now() + Math.random().toString(36).substr(2, 9)
                    });
                }
            }
        }

        const existingUrls = new Set(userSettings.bookmarks.map(b => b.url));
        const newItems = imported.filter(item => !existingUrls.has(item.url));

        if (newItems.length > 0 || folderMap.size > 0) {
            userSettings.bookmarks = [...userSettings.bookmarks, ...newItems];
            saveSettings(userSettings);
            broadcastBookmarks();
        }

        return { success: true, count: newItems.length };
    } catch (err) {
        console.error('[Import File] Failed:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.on('clear-bookmarks', (event) => {
    try {
        userSettings.bookmarks = [];
        userSettings.folders = [];
        saveSettings(userSettings);
        broadcastBookmarks();
        console.log('[Bookmarks] wiped by user.');
    } catch (err) {
        console.error('[Clear Bookmarks] Failed:', err);
    }
});
// Common Keyboard Shortcuts
function handleShortcuts(event, input) {
    if (input.type !== 'keyDown') return;
    const { code, control, shift, alt, meta } = input;



    const cmdOrCtrl = process.platform === 'darwin' ? input.meta : input.control;

    // Ctrl + T: New Tab
    if (cmdOrCtrl && input.key.toLowerCase() === 't') {
        event.preventDefault();
        createNewTab();
    }
    // Ctrl + W: Close Tab
    else if (cmdOrCtrl && input.key.toLowerCase() === 'w') {
        event.preventDefault();
        if (activeViewId) handleCloseTabRequest(activeViewId);
    }
    // Ctrl + R: Reload
    else if (cmdOrCtrl && input.key.toLowerCase() === 'r') {
        if (input.shift) {
            // Ctrl + Shift + R: Hard Reload
            const v = views.find(v => v.id === activeViewId)?.view;
            if (v) v.webContents.reloadIgnoringCache();
        } else {
            const v = views.find(v => v.id === activeViewId)?.view;
            if (v) v.webContents.reload();
        }
    }
    // Ctrl + L: Focus Address Bar
    else if (cmdOrCtrl && input.key.toLowerCase() === 'l') {
        event.preventDefault();
        mainWindow.webContents.send('focus-address-bar');
    }
    // Ctrl + Shift + A: AI Sidebar
    else if (cmdOrCtrl && input.shift && input.key.toLowerCase() === 'a') {
        event.preventDefault();
        ipcMain.emit('toggle-ai-sidebar');
    }
    // Sidebar Toggles
    else if (cmdOrCtrl && input.key.toLowerCase() === 'h') {
        event.preventDefault();
        ipcMain.emit('switch-sidebar-tab', null, 'history');
    }
    else if (cmdOrCtrl && input.key.toLowerCase() === 'b') {
        event.preventDefault();
        ipcMain.emit('switch-sidebar-tab', null, 'bookmarks');
    }
    else if (cmdOrCtrl && input.key.toLowerCase() === 'j') {
        event.preventDefault();
        ipcMain.emit('switch-sidebar-tab', null, 'downloads');
    }
    // Alt + S: Open Settings
    else if (input.alt && input.key.toLowerCase() === 's') {
        event.preventDefault();
        const settingsUrl = 'file://' + path.join(__dirname, 'settings.html');
        const existing = views.find(v => v.view.webContents.getURL() === settingsUrl);
        if (existing) setActiveTab(existing.id);
        else createNewTab(settingsUrl);
    }
    // F12, Ctrl + Shift + I: Dynamic DevTools activation
    else if (input.key === 'F12' || (cmdOrCtrl && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault();
        const v = views.find(v => v.id === activeViewId)?.view;
        if (v) {
            const url = v.webContents.getURL();
            const isInternal = url.startsWith('ocal://') || url.startsWith('file://');
            if (!isInternal) {
                v.webContents.toggleDevTools({ mode: 'detach' });
            } else {
                console.log('[Security] Inspect Element blocked for internal path:', url);
            }
        }
    }
    // Ctrl + U: Dynamic View Source
    else if (cmdOrCtrl && input.key.toLowerCase() === 'u') {
        const v = views.find(v => v.id === activeViewId)?.view;
        if (v) {
            const url = v.webContents.getURL();
            const isInternal = url.startsWith('ocal://') || url.startsWith('file://');
            if (isInternal) {
                event.preventDefault();
                console.log('[Security] View Source blocked for internal path:', url);
            }
        }
    }
}

ipcMain.handle('get-settings', () => {
    const resolvedExtensions = (userSettings.extensions || []).map(ext => resolveExtensionMetadata({ ...ext }));
    return { ...userSettings, extensions: resolvedExtensions };
});
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-downloads', () => downloads);
function isNewerVersion(latest, current) {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
        const ln = l[i] || 0;
        const cn = c[i] || 0;
        if (ln > cn) return true;
        if (ln < cn) return false;
    }
    return false;
}

async function checkForUpdatesSilently() {
    if (!userSettings.autoCheckUpdates) return;
    try {
        const { net } = require('electron');
        const request = net.request({
            method: 'GET',
            url: 'https://api.github.com/repos/neelkanth-patel26/Ocal-Browser/releases/latest',
            redirect: 'follow'
        });
        request.setHeader('User-Agent', 'Ocal-Browser');
        request.on('response', (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk.toString());
            response.on('end', () => {
                if (response.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        const latest = json.tag_name.replace(/^v/, '');
                        const current = app.getVersion();
                        if (isNewerVersion(latest, current)) {
                            if (mainWindow) {
                                mainWindow.webContents.send('update-available', {
                                    version: latest,
                                    notes: json.body,
                                    url: json.html_url
                                });
                            }
                        }
                    } catch (e) { }
                }
            });
        });
        request.on('error', () => { });
        request.end();
    } catch (e) { }
}

ipcMain.handle('check-for-update', async () => {
    return new Promise((resolve) => {
        let resolved = false;

        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(null);
            }
        }, 15000); // 15 second timeout

        try {
            const { net } = require('electron');
            const request = net.request({
                method: 'GET',
                url: 'https://api.github.com/repos/neelkanth-patel26/Ocal-Browser/releases/latest',
                redirect: 'follow'
            });
            request.setHeader('User-Agent', 'Ocal-Browser');
            request.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk.toString());
                response.on('end', () => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        if (response.statusCode === 200) {
                            try {
                                const json = JSON.parse(data);
                                resolve({
                                    version: json.tag_name.replace(/^v/, ''),
                                    notes: json.body,
                                    url: json.html_url
                                });
                            } catch (e) {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    }
                });
            });
            request.on('error', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(null);
                }
            });
            request.end();
        } catch (e) {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(null);
            }
        }
    });
});
ipcMain.handle('download-update', async (event) => {
    const downloadWithRetry = async (url, dest, retries = 3) => {
        const { net } = require('electron');
        return new Promise((resolve, reject) => {
            const attempt = (remaining) => {
                const request = net.request({
                    method: 'GET',
                    url: url,
                    redirect: 'follow'
                });
                request.setHeader('User-Agent', 'Ocal-Browser');
                request.on('response', (response) => {
                    if (response.statusCode !== 200) {
                        if (remaining > 0) return setTimeout(() => attempt(remaining - 1), 2000);
                        return reject(new Error(`Download failed with status ${response.statusCode}`));
                    }

                    const totalBytes = parseInt(response.headers['content-length'], 10);
                    let receivedBytes = 0;
                    const fileStream = fs.createWriteStream(dest);

                    response.on('data', (chunk) => {
                        receivedBytes += chunk.length;
                        fileStream.write(chunk);
                        const progress = Math.round((receivedBytes / totalBytes) * 100);
                        if (mainWindow) {
                            mainWindow.webContents.send('update-download-progress', {
                                percent: progress,
                                loaded: (receivedBytes / (1024 * 1024)).toFixed(1),
                                total: (totalBytes / (1024 * 1024)).toFixed(1)
                            });
                        }
                    });

                    response.on('end', () => {
                        fileStream.end();
                        resolve(dest);
                    });
                });
                request.on('error', (err) => {
                    if (remaining > 0) return setTimeout(() => attempt(remaining - 1), 2000);
                    reject(err);
                });
                request.end();
            };
            attempt(retries);
        });
    };

    try {
        return new Promise((resolve, reject) => {
            const { net } = require('electron');
            const request = net.request({
                method: 'GET',
                url: 'https://api.github.com/repos/neelkanth-patel26/Ocal-Browser/releases/latest',
                redirect: 'follow'
            });
            request.setHeader('User-Agent', 'Ocal-Browser');
            request.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk.toString());
                response.on('end', async () => {
                    if (response.statusCode === 200) {
                        try {
                            const json = JSON.parse(data);
                            const arch = process.arch === 'x64' ? 'x64' : (process.arch === 'arm64' ? 'arm64' : '');
                            let asset = json.assets.find(a =>
                                a.name.startsWith('Ocal-') &&
                                a.name.endsWith('Setup.exe') &&
                                (arch ? a.name.includes(arch) : true)
                            );
                            if (!asset) asset = json.assets.find(a => a.name.startsWith('Ocal-') && a.name.endsWith('Setup.exe'));
                            if (!asset) asset = json.assets.find(a => a.name.endsWith('.exe') && a.name.includes('Setup'));
                            if (!asset) return reject(new Error('No compatible installer found.'));

                            const tempPath = path.join(app.getPath('temp'), asset.name);
                            resolve(await downloadWithRetry(asset.browser_download_url, tempPath));
                        } catch (e) { reject(e); }
                    } else { reject(new Error(`API Status ${response.statusCode}`)); }
                });
            });
            request.on('error', reject);
            request.end();
        });
    } catch (e) {
        throw e;
    }
});

ipcMain.on('apply-update', (event, installerPath) => {
    const { spawn } = require('child_process');
    // Run Inno Setup in silent mode
    const child = spawn(installerPath, ['/SILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], {
        detached: true,
        stdio: 'ignore'
    });
    child.unref();
    app.quit();
});

// Bookmark IPCs
ipcMain.handle('get-bookmarks', () => ({ bookmarks: userSettings.bookmarks, folders: userSettings.folders }));
ipcMain.handle('get-history', () => userSettings.history || []);
ipcMain.on('toggle-bookmark', (e, bm) => {
    const exists = userSettings.bookmarks.find(b => b.url === bm.url);
    if (exists) {
        userSettings.bookmarks = userSettings.bookmarks.filter(b => b.url !== bm.url);
    } else {
        bm.id = Date.now().toString();
        userSettings.bookmarks.push(bm);
    }
    saveSettings(userSettings);
    broadcastBookmarks();
});
ipcMain.on('add-bookmark', (e, bm) => { bm.id = Date.now().toString(); userSettings.bookmarks.push(bm); saveSettings(userSettings); broadcastBookmarks(); });
ipcMain.on('remove-bookmark', (e, url) => { userSettings.bookmarks = userSettings.bookmarks.filter(b => b.url !== url); saveSettings(userSettings); broadcastBookmarks(); });
ipcMain.on('edit-bookmark', (e, data) => {
    const b = userSettings.bookmarks.find(x => x.id === data.id);
    if (b) {
        if (data.title !== undefined) b.title = data.title;
        if (data.url !== undefined) b.url = data.url;
        if ('folderId' in data) b.folderId = data.folderId || undefined;
    }
    saveSettings(userSettings);
    broadcastBookmarks();
});
ipcMain.on('reorder-bookmark', (e, { draggedId, targetId }) => {
    const bks = userSettings.bookmarks;
    const draggedIdx = bks.findIndex(b => b.id === draggedId);
    const targetIdx = bks.findIndex(b => b.id === targetId);
    if (draggedIdx > -1 && targetIdx > -1) {
        const [dragged] = bks.splice(draggedIdx, 1);
        bks.splice(targetIdx, 0, dragged);
        saveSettings(userSettings);
        broadcastBookmarks();
    }
});

ipcMain.on('show-shield-popup', (e, { x, y, width, height, tabId }) => {
    if (!mainWindow) return;
    if (!shieldPopupView) createShieldPopupView();

    if (mainWindow.getBrowserViews().includes(shieldPopupView)) {
        mainWindow.removeBrowserView(shieldPopupView);
        return;
    }

    const viewItem = tabId ? views.find(v => v.id === tabId) : null;
    const wc = viewItem ? viewItem.view.webContents : null;
    const isYouTube = wc ? wc.getURL().includes('youtube.com') : false;

    hidePopups();
    mainWindow.addBrowserView(shieldPopupView);

    const zoom = getOptimalZoomFactor();
    const popupWidth = Math.round(320 * zoom);
    const popupHeight = Math.round(750 * zoom);
    const contentBounds = mainWindow.getContentBounds();

    let targetX = x + (width / 2) - (popupWidth / 2);
    if (targetX < 10) targetX = 10;
    if (targetX + popupWidth > contentBounds.width - 10) targetX = contentBounds.width - popupWidth - 10;

    const winOffset = getWinOffset();
    shieldPopupView.setBounds({
        x: Math.round(targetX + winOffset) - 15,
        y: Math.round(y + height + 10 + winOffset),
        width: Math.round(popupWidth) + 30,
        height: Math.round(popupHeight) + 30
    });

    mainWindow.setTopBrowserView(shieldPopupView);
    shieldPopupView.webContents.send('show-popup', { x: 0, y: 0, tabId, isYouTube });
    shieldPopupView.webContents.focus();
});

ipcMain.on('show-bm-dropdown', (e, { x, y, bookmarks, folderId }) => {
    if (!bmDropdownView || !mainWindow) return;

    // Toggle logic: if clicking the same folder, just hide it
    if (activeBMFolderId === folderId) {
        activeBMFolderId = null;
        hidePopups();
        return;
    }

    hidePopups();
    activeBMFolderId = folderId;
    mainWindow.addBrowserView(bmDropdownView);

    const zoom = getOptimalZoomFactor();
    const winOffset = getWinOffset();
    // Initial safe size, will be refined by dropdown-resize IPC
    bmDropdownView.setBounds({
        x: Math.round(x + winOffset) - 15,
        y: Math.round(y + winOffset),
        width: Math.round(360 * zoom),
        height: Math.round(530 * zoom)
    });
    bmDropdownView.webContents.send('show-bm-dropdown', { bookmarks });
    mainWindow.setTopBrowserView(bmDropdownView);
});

ipcMain.on('resize-bm-dropdown', (e, { width, height }) => {
    if (!bmDropdownView || !mainWindow || bmDropdownView.webContents.isDestroyed()) return;
    if (!mainWindow.getBrowserViews().includes(bmDropdownView)) return;
    const bounds = bmDropdownView.getBounds();
    const zoom = getOptimalZoomFactor();
    bmDropdownView.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: Math.round(width * zoom) + 30,
        height: Math.round(height * zoom) + 30
    });
});

ipcMain.on('hide-bm-dropdown', () => {
    hidePopups();
});

ipcMain.on('add-folder', (e, f) => { f.id = Date.now().toString(); userSettings.folders.push(f); saveSettings(userSettings); broadcastBookmarks(); });
ipcMain.on('remove-folder', (e, id) => { userSettings.folders = userSettings.folders.filter(f => f.id !== id); userSettings.bookmarks.forEach(b => { if (b.folderId === id) delete b.folderId; }); saveSettings(userSettings); broadcastBookmarks(); });
ipcMain.on('edit-folder', (e, data) => { const f = userSettings.folders.find(x => x.id === data.id); if (f) Object.assign(f, data); saveSettings(userSettings); broadcastBookmarks(); });

ipcMain.handle('ai-classify-bookmarks', async () => {
    const bms = userSettings.bookmarks || [];
    if (bms.length === 0) {
        return { success: false, error: 'No bookmarks to classify.' };
    }

    const categories = [
        { id: 'folder_ai', name: 'AI', icon: 'fas fa-wand-magic-sparkles' },
        { id: 'folder_research', name: 'Research', icon: 'fas fa-graduation-cap' },
        { id: 'folder_productivity', name: 'Productivity', icon: 'fas fa-briefcase' },
        { id: 'folder_games', name: 'Games', icon: 'fas fa-gamepad' },
        { id: 'folder_dev', name: 'Dev', icon: 'fas fa-code' },
        { id: 'folder_media', name: 'Media', icon: 'fas fa-tv' },
        { id: 'folder_social', name: 'Social', icon: 'fas fa-comments' },
        { id: 'folder_shopping', name: 'Shopping', icon: 'fas fa-cart-shopping' },
        { id: 'folder_news', name: 'News', icon: 'fas fa-newspaper' }
    ];

    let llmResult = '';
    const activeEngine = userSettings.aiEngine || 'local';
    let hasApiKey = false;
    if (activeEngine === 'gemini' && userSettings.aiApiKey) hasApiKey = true;
    if (activeEngine === 'openai' && userSettings.openaiApiKey) hasApiKey = true;

    if (hasApiKey) {
        const prompt = `You are an AI bookmark manager. Group these bookmarks into folders.
The folders can be any of these predefined categories or custom ones:
"AI" (icon: "fas fa-wand-magic-sparkles"),
"Research" (icon: "fas fa-graduation-cap"),
"Productivity" (icon: "fas fa-briefcase"),
"Games" (icon: "fas fa-gamepad"),
"Dev" (icon: "fas fa-code"),
"Media" (icon: "fas fa-tv"),
"Social" (icon: "fas fa-comments"),
"Shopping" (icon: "fas fa-cart-shopping"),
"News" (icon: "fas fa-newspaper").

Here are the bookmarks to classify:
${bms.map(b => `- ID: "${b.id}", Title: "${b.title}", URL: "${b.url}"`).join('\n')}

Output JSON format strictly:
{
  "folders": [
     { "id": "predefined_or_new_id", "name": "Folder Name", "icon": "font-awesome-icon-class-like-fas-fa-code" }
  ],
  "mappings": [
     { "bookmarkId": "bookmark_id", "folderId": "folder_id" }
  ]
}
Return ONLY valid raw JSON without any markdown formatting wrappers or explanations.`;

        try {
            if (activeEngine === 'gemini') {
                llmResult = await tryGemini(prompt, userSettings.aiApiKey, 'formal');
            } else if (activeEngine === 'openai') {
                llmResult = await tryOpenAI(prompt, 'formal');
            }
        } catch (e) {
            console.error('[AI Classify LLM Error]', e);
        }
    }

    let classification = null;
    if (llmResult) {
        try {
            let cleanJson = llmResult.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.substring(7);
            }
            if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.substring(3);
            }
            if (cleanJson.endsWith('```')) {
                cleanJson = cleanJson.substring(0, cleanJson.length - 3);
            }
            classification = JSON.parse(cleanJson.trim());
        } catch (e) {
            console.error('[AI Classify JSON Parse Error]', e, llmResult);
        }
    }

    if (!classification || !classification.mappings || classification.mappings.length === 0) {
        const mappings = [];
        const keywordMap = [
            { id: 'folder_ai', keywords: ['ai', 'gpt', 'llm', 'claude', 'gemini', 'openai', 'midjourney', 'stable diffusion', 'copilot', 'neural', 'huggingface'] },
            { id: 'folder_research', keywords: ['scholar', 'research', 'wiki', 'science', 'nature', 'arxiv', 'pubmed', 'journal', 'nasa', 'academic', 'thesis'] },
            { id: 'folder_productivity', keywords: ['figma', 'notion', 'docs', 'sheet', 'drive', 'trello', 'asana', 'slack', 'zoom', 'meet', 'calendar', 'office', 'teams', 'canva', 'clickup', 'jira'] },
            { id: 'folder_games', keywords: ['game', 'steam', 'roblox', 'epicgames', 'nintendo', 'twitch', 'discord', 'minecraft', 'playstation', 'xbox', 'arcade', 'chess', 'ign'] },
            { id: 'folder_dev', keywords: ['github', 'gitlab', 'npm', 'stackoverflow', 'codepen', 'jsfiddle', 'mdn', 'w3schools', 'typescript', 'python', 'vercel', 'netlify', 'aws', 'docker', 'api', 'console'] },
            { id: 'folder_media', keywords: ['youtube', 'netflix', 'spotify', 'twitch', 'disney', 'anime', 'music', 'soundcloud', 'video', 'movie', 'tv', 'hulu', 'hbo'] },
            { id: 'folder_social', keywords: ['facebook', 'instagram', 'twitter', 'linkedin', 'reddit', 'whatsapp', 'telegram', 'messenger', 'pinterest', 'tiktok'] },
            { id: 'folder_shopping', keywords: ['amazon', 'ebay', 'aliexpress', 'shopify', 'etsy', 'store', 'shop', 'walmart', 'target'] },
            { id: 'folder_news', keywords: ['news', 'bbc', 'cnn', 'nytimes', 'reuters', 'guardian', 'bloomberg', 'medium', 'blog'] }
        ];

        bms.forEach(b => {
            const titleLower = b.title.toLowerCase();
            const urlLower = b.url.toLowerCase();
            let matchedFolderId = null;
            for (const map of keywordMap) {
                if (map.keywords.some(kw => titleLower.includes(kw) || urlLower.includes(kw))) {
                    matchedFolderId = map.id;
                    break;
                }
            }
            if (matchedFolderId) {
                mappings.push({ bookmarkId: b.id, folderId: matchedFolderId });
            }
        });

        classification = {
            folders: categories,
            mappings
        };
    }

    if (!userSettings.folders) userSettings.folders = [];

    const folderIdMap = {};
    classification.folders.forEach(cf => {
        let existingFolder = userSettings.folders.find(f => f.name.toLowerCase() === cf.name.toLowerCase());
        if (!existingFolder) {
            const newId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
            existingFolder = {
                id: newId,
                name: cf.name,
                icon: cf.icon || 'fas fa-folder'
            };
            userSettings.folders.push(existingFolder);
        }
        folderIdMap[cf.id] = existingFolder.id;
    });

    let count = 0;
    classification.mappings.forEach(m => {
        const b = userSettings.bookmarks.find(x => x.id === m.bookmarkId);
        if (b) {
            const realFolderId = folderIdMap[m.folderId] || m.folderId;
            if (userSettings.folders.some(f => f.id === realFolderId)) {
                b.folderId = realFolderId;
                count++;
            }
        }
    });

    saveSettings(userSettings);
    broadcastBookmarks();

    return { success: true, count };
});

function broadcastBookmarks() {
    const data = { bookmarks: userSettings.bookmarks, folders: userSettings.folders };
    mainWindow.webContents.send('bookmarks-changed', data);
    if (sidebarOverlayView) sidebarOverlayView.webContents.send('bookmarks-changed', data);
}

// Extension Dropdown Logic
function createExtensionDropdownView() {
    extensionDropdownView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, devTools: false, sandbox: true }
    });
    extensionDropdownView.webContents.loadFile('extensions-popup.html');
    extensionDropdownView.setBackgroundColor('#00000000');
}

ipcMain.on('show-extensions-dropdown', (e, { x, y, width }) => {
    if (!mainWindow) return;
    if (!extensionDropdownView) createExtensionDropdownView();

    if (mainWindow.getBrowserViews().includes(extensionDropdownView)) {
        mainWindow.removeBrowserView(extensionDropdownView);
        return;
    }

    hidePopups();
    mainWindow.addBrowserView(extensionDropdownView);
    // Align to the right of the button
    const zoom = getOptimalZoomFactor();
    const popupWidth = Math.round(320 * zoom);
    const winOffset = getWinOffset();
    let targetX = x + width - popupWidth;

    extensionDropdownView.setBounds({
        x: Math.round(targetX + winOffset) - 15,
        y: Math.round(y + 10 + winOffset),
        width: popupWidth + 30,
        height: Math.round(530 * zoom)
    });
    mainWindow.setTopBrowserView(extensionDropdownView);
    extensionDropdownView.webContents.send('refresh-extensions');
});

ipcMain.on('hide-extensions-dropdown', () => {
    if (extensionDropdownView && mainWindow.getBrowserViews().includes(extensionDropdownView)) {
        mainWindow.removeBrowserView(extensionDropdownView);
    }
});

ipcMain.on('open-extensions-page', () => {
    hidePopups();
    createNewTab(`file://${__dirname}/extensions.html`);
});

ipcMain.on('action-extension', (e, id) => {
    hidePopups();
    // Native extensions can handle local toggles internally or via specific IPCs.
});

ipcMain.on('toggle-adblock', (e, enabled) => {
    userSettings.adBlockEnabled = enabled;
    saveSettings(userSettings);

    // uBlock native loading handles session injection via ExtensionManager dynamically
    // The legacy ad blocker was removed.

    broadcastSettings(userSettings);
});

// History Management
ipcMain.on('delete-history-item', (e, timestamp) => {
    userSettings.history = userSettings.history.filter(h => h.timestamp !== timestamp);
    saveSettings(userSettings);
    broadcastHistory();
});

ipcMain.on('clear-history', () => {
    userSettings.history = [];
    saveSettings(userSettings);
    broadcastHistory();
});

function updateHistory(view, url) {
    const id = views.find(v => v.view.webContents === view.webContents)?.id;
    if (!id) return;

    if (url.includes('home.html')) {
        mainWindow.webContents.send('url-updated', { id, url: '', title: 'Ocal Home' });
    } else {
        const title = view.webContents.getTitle();
        mainWindow.webContents.send('url-updated', { id, url, title });

        // Find existing tab favicon to save with history
        const entry = views.find(v => v.id === id);
        const favicon = entry?.favicon || '';

        // Check if it is an internal browser page and skip history storage
        const isInternalPage = url.startsWith('ocal://') ||
            (url.startsWith('file://') && url.endsWith('.html')) ||
            [
                'settings.html', 'site-settings.html', 'downloads.html', 'extensions.html',
                'game.html', 'games.html', 'home.html', 'offline.html', 'uninstaller',
                'pip.html', 'sidebars.html', 'sidepanel.html', 'suggestions.html',
                'tab-context.html', 'tabgroup.html', 'shield-popup.html', 'site-info.html',
                'media-popup.html', 'ai-sidebar.html', 'certificate-viewer.html',
                'bm-dropdown.html', 'file-manager.html', 'snake.html', 'tetris.html'
            ].some(page => url.toLowerCase().includes(page.toLowerCase()));

        if (!isInternalPage) {
            // Don't add if the URL is the same as the last item (avoid duplicates from in-page nav)
            if (userSettings.history.length > 0 && userSettings.history[0].url === url) return;

            const historyItem = { title: title || url, url, timestamp: Date.now(), favicon };
            if (!Array.isArray(userSettings.history)) userSettings.history = [];
            userSettings.history = [historyItem, ...userSettings.history].slice(0, 100);
            saveSettings(userSettings);
            broadcastHistory();
        }
    }
}

function broadcastHistory() {
    broadcastSettings(userSettings);
}

ipcMain.on('open-download', (e, filePath) => {
    if (!filePath) return;
    shell.openPath(filePath);
});

ipcMain.on('show-item-in-folder', (e, filePath) => {
    if (!filePath) return;
    shell.showItemInFolder(filePath);
});

ipcMain.on('remove-download-item', (e, id) => {
    const index = downloads.findIndex(dl => dl.id === id);
    if (index !== -1) {
        downloads.splice(index, 1);
        saveDownloadsToSettings();
        broadcastToSidebars('download-updated', downloads);
    }
});

function setupGoogleLoginPartition() {
    const googleSession = session.fromPartition('persist:google_login');
    const googleUA = OCAL_USER_AGENT;
    googleSession.setUserAgent(googleUA);
}

app.whenReady().then(async () => {
    if (isUninstallSurvey) {
        createSurveyWindow();
        return;
    }

    // 1. Core Extension Loading (Highest Priority)
    await extensionManager.loadAll();

    // 2. Register ocal:// protocol
    if (protocol.handle) {
        protocol.handle('ocal', (request) => {
            const url = request.url;
            const resolved = resolveInternalURL(url);
            if (resolved.startsWith('file://')) {
                return require('electron').net.fetch(resolved);
            }
            return new Response('Protocol mismatch', { status: 404 });
        });
    }

    setupGoogleLoginPartition();


    createMainWindow();

    // Update zoom factor when screen resolution or DPI metrics change (safe since app is ready)
    screen.on('display-metrics-changed', () => {
        updateAllUiZoomFactors();
        updateViewBounds();
    });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });

// Screenshot & Thumbnail IPCs
ipcMain.on('capture-thumbnail', async (e) => {
    const activeView = views.find(v => v.id === activeViewId)?.view;
    if (!activeView) return;
    const image = await activeView.webContents.capturePage();
    e.sender.send('thumbnail-captured', image.toDataURL());
});

ipcMain.on('capture-screenshot', async (e, type) => {
    const activeView = views.find(v => v.id === activeViewId)?.view;
    if (!activeView) return;

    let image;
    let filters = [{ name: 'Images', extensions: ['png', 'jpg'] }];

    if (type === 'visible') {
        image = await activeView.webContents.capturePage();
    } else if (type === 'full') {
        const size = await activeView.webContents.executeJavaScript(`({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight})`);
        // Note: resizing for a clean full-page capture
        const originalBounds = activeView.getBounds();
        activeView.setBounds({ x: originalBounds.x, y: originalBounds.y, width: size.w, height: size.h });
        image = await activeView.webContents.capturePage();
        activeView.setBounds(originalBounds);
    } else if (type === 'pdf') {
        const data = await activeView.webContents.printToPDF({});
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Page as PDF',
            defaultPath: path.join(app.getPath('downloads'), `Screenshot_${Date.now()}.pdf`),
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (filePath) {
            const fs = require('fs');
            fs.writeFileSync(filePath, data);
            e.sender.send('screenshot-saved', filePath);
        }
        return;
    }

    if (image) {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Screenshot',
            defaultPath: path.join(app.getPath('downloads'), `Screenshot_${Date.now()}.png`),
            filters
        });
        if (filePath) {
            const fs = require('fs');
            try {
                fs.writeFileSync(filePath, image.toPNG());
                mainWindow.webContents.send('screenshot-saved', filePath);
            } catch (err) {
                console.error("Failed to save screenshot", err);
            }
        }
    }
});

// Deduplicated search utility functions removed here
ipcMain.on('suggest-search', async (e, query) => {
    if (!query) { hideSuggestions(); return; }
    try {
        let suggestions = [];
        let refinements = [];
        let bestMatch = null;

        // 1. Online Suggestions & Refinements
        if (userSettings.searchSuggest !== false) {
            try {
                const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
                const data = await response.json();

                // data[1] contains suggestions
                if (data[1]) {
                    suggestions = data[1].map(s => ({ text: s, type: 'search' }));
                }

                // data[3] or metadata can contain refinements
                if (data[4] && data[4]['google:suggesttype']) {
                    // Extract potential refinements (this is a heuristic for 'chrome' client)
                    refinements = data[1]
                        .filter((_, i) => data[4]['google:suggesttype'][i] === 'NAVIGATION')
                        .slice(0, 5);
                }
            } catch (err) { console.error('Online suggest fetch failed'); }
        }

        // 2. History & Bookmark Integration (Smart Ranking)
        const history = Array.isArray(userSettings.history) ? userSettings.history : [];
        const bookmarks = Array.isArray(userSettings.bookmarks) ? userSettings.bookmarks : [];
        const combinedSaved = [...history, ...bookmarks];

        const savedMatches = combinedSaved
            .filter(h => (h.title && h.title.toLowerCase().includes(query.toLowerCase())) || (h.url && h.url.toLowerCase().includes(query.toLowerCase())))
            .map(h => ({
                text: h.title || h.url,
                url: h.url,
                type: bookmarks.some(b => b.url === h.url) ? 'bookmark' : 'history'
            }));

        // Identify Best Match (pins exact start matches)
        const exactMatch = savedMatches.find(m =>
            m.text.toLowerCase().startsWith(query.toLowerCase()) ||
            (m.url && m.url.toLowerCase().startsWith(query.toLowerCase().replace(/^https?:\/\/(www\.)?/, '')))
        );

        if (exactMatch) {
            bestMatch = exactMatch;
            // Remove from main list to avoid duplication
            const idx = savedMatches.indexOf(exactMatch);
            if (idx > -1) savedMatches.splice(idx, 1);
        }

        // Combine and limit
        const finalSuggestions = [...savedMatches.slice(0, 3), ...suggestions].slice(0, 8);

        if (finalSuggestions.length > 0 || bestMatch || refinements.length > 0) {
            if (suggestionsView) {
                suggestionsView.webContents.send('update-suggestions', {
                    bestMatch,
                    suggestions: finalSuggestions,
                    refinements: refinements.length > 0 ? refinements : []
                });
            }
        } else {
            hideSuggestions();
        }
    } catch (err) { /* Silent fail */ }
});

ipcMain.on('show-suggestions', (e, bounds) => {
    if (!suggestionsView || !mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.getBrowserViews().includes(suggestionsView)) {
        mainWindow.addBrowserView(suggestionsView);
    }
    const winOffset = getWinOffset();
    const zoom = getOptimalZoomFactor();

    suggestionsView.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y + bounds.height + 6),
        width: Math.round(bounds.width),
        height: Math.round(350 * zoom)
    });
    mainWindow.setTopBrowserView(suggestionsView);
});

ipcMain.on('resize-suggestions', (e, height) => {
    if (!suggestionsView || !mainWindow || mainWindow.isDestroyed() || suggestionsView.webContents.isDestroyed()) return;
    if (!mainWindow.getBrowserViews().includes(suggestionsView)) return;
    const bounds = suggestionsView.getBounds();
    const zoom = getOptimalZoomFactor();
    const cappedHeight = Math.min(height, 480); // Cap at 480px for standard dropdown size
    suggestionsView.setBounds({ ...bounds, height: Math.round(cappedHeight * zoom) });
});

ipcMain.on('hide-suggestions', () => hideSuggestions());

ipcMain.on('suggestion-selected', (e, text) => {
    hideSuggestions();
    mainWindow.webContents.send('execute-suggestion', text);
});

// ── Site Info Popup Logic ───────────────────────────────────────────────────
function createSiteInfoView() {
    siteInfoView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, devTools: false, sandbox: true }
    });
    siteInfoView.webContents.loadFile('site-info.html');
    siteInfoView.setBackgroundColor('#00000000');
}

function hideSiteInfo() {
    if (!siteInfoView || !mainWindow) return;
    if (mainWindow.getBrowserViews().includes(siteInfoView)) {
        mainWindow.removeBrowserView(siteInfoView);
    }
}

ipcMain.on('show-site-info', (e, bounds) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!siteInfoView) createSiteInfoView();

    if (mainWindow.getBrowserViews().includes(siteInfoView)) {
        mainWindow.removeBrowserView(siteInfoView);
        return;
    }

    const activeView = views.find(v => v.id === activeViewId)?.view;
    const url = activeView && !activeView.webContents.isDestroyed() ? activeView.webContents.getURL() : '';

    hidePopups();
    mainWindow.addBrowserView(siteInfoView);

    // Position below the address bar identity area with shadow margin
    const zoom = getOptimalZoomFactor();
    siteInfoView.setBounds({
        x: Math.round(bounds.x) - 15,
        y: Math.round(bounds.y + bounds.height + 4),
        width: Math.round(350 * zoom),
        height: Math.round(540 * zoom) // Sufficient height for the content and shadow padding
    });

    mainWindow.setTopBrowserView(siteInfoView);

    // Fetch permissions for this origin to pass to the popup
    let permissions = { notifications: 'allow', popups: 'allow', audio: 'allow' };
    try {
        const origin = new URL(url).origin;
        if (userSettings.sitePermissions[origin]) {
            permissions = { ...permissions, ...userSettings.sitePermissions[origin] };
        }
    } catch (e) { }

    const sendUpdate = () => {
        siteInfoView.webContents.send('update-site-info', { url, permissions });
    };

    if (siteInfoView.webContents.isLoading()) {
        siteInfoView.webContents.once('did-finish-load', sendUpdate);
    } else {
        sendUpdate();
    }
});

ipcMain.on('update-site-permission', (e, { origin, permission, value }) => {
    if (!origin) return;
    if (!userSettings.sitePermissions[origin]) userSettings.sitePermissions[origin] = {};

    // Map internal permission names to Electron ones if needed
    const key = permission === 'sound' ? 'audio' : permission;
    userSettings.sitePermissions[origin][key] = value;
    saveSettings(userSettings);
});

ipcMain.on('hide-site-info', () => hideSiteInfo());

ipcMain.on('open-settings', (e, section) => {
    createNewTab(`ocal://settings#${section}`);
    hideSiteInfo();
});

ipcMain.on('get-site-data', async (event, origin) => {
    try {
        const url = new URL(origin);
        const domain = url.hostname;
        // Search for all cookies related to this domain (including subdomains)
        const cookies = await session.defaultSession.cookies.get({ domain });

        // Extract unique domains
        const domains = [...new Set(cookies.map(c => c.domain.startsWith('.') ? c.domain.substring(1) : c.domain))];

        event.reply('update-site-data', domains);
    } catch (e) {
        event.reply('update-site-data', []);
    }
});

ipcMain.handle('get-site-usage', async (event, origin) => {
    try {
        const url = new URL(origin);
        // We look for all cookies that match or are subdomains of the hostname
        const cookies = await session.defaultSession.cookies.get({ domain: url.hostname });

        // Simplified estimate: each cookie is ~4KB in overhead/storage for the DB
        return {
            bytes: cookies.length * 4096,
            count: cookies.length
        };
    } catch (e) { return { bytes: 0, count: 0 }; }
});

ipcMain.handle('get-host-permissions', (event, origin) => {
    return userSettings.sitePermissions[origin] || {};
});

ipcMain.on('reset-site-permissions', (event, origin) => {
    delete userSettings.sitePermissions[origin];
    saveSettings(userSettings);
});

ipcMain.on('open-site-settings', (event, host) => {
    createNewTab(`ocal://site-settings?host=${host}`);
    hideSiteInfo();
});


ipcMain.handle('delete-site-data', async (event, { origin, domain }) => {
    try {
        const targetOrigin = origin || (domain.includes('://') ? domain : `https://${domain}`);
        const url = new URL(targetOrigin);
        const host = url.hostname;

        // 1. Clear Origin-based data (localStorage, IndexedDB, etc.)
        await session.defaultSession.clearStorageData({
            origin: targetOrigin,
            storages: ['cookies', 'localstorage', 'indexeddb', 'websql', 'serviceworkers', 'cachestorage']
        });

        // 2. Deep clean cookies by domain (catch .domain.com and subdomains)
        const domainPattern = host.startsWith('www.') ? host.substring(4) : host;
        const cookies = await session.defaultSession.cookies.get({ domain: domainPattern });

        for (const cookie of cookies) {
            const cookieUrl = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
            await session.defaultSession.cookies.remove(cookieUrl, cookie.name);
        }

        return true;
    } catch (e) {
        console.error("Failed to thoroughly delete site data", e);
        return false;
    }
});

ipcMain.on('reorder-tabs', (e, { fromIndex, toIndex }) => {
    if (fromIndex < 0 || fromIndex >= views.length || toIndex < 0 || toIndex >= views.length) return;
    const tabEntry = views.splice(fromIndex, 1)[0];
    views.splice(toIndex, 0, tabEntry);
    broadcastTabs();
});

// ── File Manager (System Explorer) IPCs ─────────────────────────────────────
ipcMain.handle('get-system-folders', () => {
    return {
        home: app.getPath('home'),
        documents: app.getPath('documents'),
        downloads: app.getPath('downloads'),
        desktop: app.getPath('desktop'),
        pictures: app.getPath('pictures'),
        videos: app.getPath('videos'),
        music: app.getPath('music')
    };
});

ipcMain.handle('get-directory-entries', async (event, dirPath) => {
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        return entries.map(dirent => {
            const fullPath = path.join(dirPath, dirent.name);
            let stats;
            try { stats = fs.statSync(fullPath); } catch (e) { stats = { size: 0, mtime: new Date() }; }

            return {
                name: dirent.name,
                path: fullPath,
                isDirectory: dirent.isDirectory(),
                size: stats.size,
                mtime: stats.mtime
            };
        });
    } catch (e) { return []; }
});

ipcMain.handle('analyze-system-files', async () => {
    const targets = [
        app.getPath('downloads'),
        app.getPath('documents'),
        app.getPath('desktop'),
        app.getPath('pictures'),
        app.getPath('videos'),
        app.getPath('music')
    ];
    let allPdfs = [];

    const findPdfsRecursive = (dir, depth = 0) => {
        if (depth > 3) return; // Limit depth for performance
        try {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const dirent of entries) {
                const fullPath = path.join(dir, dirent.name);
                if (dirent.isDirectory()) {
                    findPdfsRecursive(fullPath, depth + 1);
                } else if (dirent.isFile() && dirent.name.toLowerCase().endsWith('.pdf')) {
                    try {
                        const stats = fs.statSync(fullPath);
                        allPdfs.push({
                            name: dirent.name,
                            path: fullPath,
                            size: stats.size,
                            mtime: stats.mtime,
                            source: path.basename(dir)
                        });
                    } catch (e) { }
                }
            }
        } catch (e) { }
    };

    for (const target of targets) {
        findPdfsRecursive(target);
    }

    // Sort by most recent first and cap at a reasonable number for UI performance
    return allPdfs.sort((a, b) => b.mtime - a.mtime).slice(0, 500);
});

ipcMain.handle('open-system-item', async (event, fullPath) => {
    return await shell.openPath(fullPath);
});

ipcMain.handle('delete-system-item', async (event, fullPath) => {
    try {
        await shell.trashItem(fullPath);
        return true;
    } catch (e) { return false; }
});

ipcMain.handle('get-certificate-info', async (event, hostname) => {
    return new Promise((resolve) => {
        const https = require('https');
        const options = {
            hostname: hostname,
            port: 443,
            method: 'HEAD',
            agent: false,
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            const cert = res.socket.getPeerCertificate(true);
            if (!cert || Object.keys(cert).length === 0) {
                resolve({ error: "No certificate found" });
                return;
            }

            resolve({
                subject: cert.subject,
                issuer: cert.issuer,
                valid_from: cert.valid_from,
                valid_to: cert.valid_to,
                fingerprint: cert.fingerprint,
                fingerprint256: cert.fingerprint256,
                serialNumber: cert.serialNumber,
                raw: cert.raw ? cert.raw.toString('base64') : null,
                info: cert.info,
                bits: cert.bits,
                pubkey: cert.pubkey ? cert.pubkey.toString('base64') : null
            });
            req.destroy();
        });

        req.on('error', (e) => {
            resolve({ error: e.message });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ error: "Connection timeout" });
        });
        req.end();
    });
});

function getLocalizedExtensionString(str, extensionPath, manifest = {}) {
    if (typeof str !== 'string' || !str.includes('__MSG_')) return str;

    return str.replace(/__MSG_([a-zA-Z0-9_@]+)__/g, (match, key) => {
        const keyLower = key.toLowerCase();

        // Standard predefined Chrome messages
        if (keyLower === 'extension_id') return '';
        if (keyLower === 'ui_locale') {
            try { return app.getLocale(); } catch (e) { return 'en'; }
        }
        if (keyLower === 'bidi_dir') return 'ltr';
        if (keyLower === 'bidi_reversed_dir') return 'rtl';
        if (keyLower === 'bidi_start_edge') return 'left';
        if (keyLower === 'bidi_end_edge') return 'right';

        // Try to locate the message in locales folder
        const localesToTry = [];
        try {
            const appLocale = app.getLocale();
            if (appLocale) {
                localesToTry.push(appLocale);
                localesToTry.push(appLocale.replace('-', '_'));
                const lang = appLocale.split(/[-_]/)[0];
                if (lang) localesToTry.push(lang);
            }
        } catch (e) {}

        if (manifest.default_locale) {
            localesToTry.push(manifest.default_locale);
            localesToTry.push(manifest.default_locale.replace('-', '_'));
            const lang = manifest.default_locale.split(/[-_]/)[0];
            if (lang) localesToTry.push(lang);
        }

        localesToTry.push('en', 'en_US', 'en-US');

        const uniqueLocales = [...new Set(localesToTry)];

        for (const locale of uniqueLocales) {
            const possibleFolders = [locale, locale.toLowerCase(), locale.toUpperCase()];
            if (locale.includes('_')) {
                const dashed = locale.replace('_', '-');
                possibleFolders.push(dashed, dashed.toLowerCase());
            } else if (locale.includes('-')) {
                const underscored = locale.replace('-', '_');
                possibleFolders.push(underscored, underscored.toLowerCase());
            }

            const uniqueFolders = [...new Set(possibleFolders)];

            for (const folderName of uniqueFolders) {
                const localePath = path.join(extensionPath, '_locales', folderName, 'messages.json');
                if (fs.existsSync(localePath)) {
                    try {
                        const content = fs.readFileSync(localePath, 'utf8');
                        const messages = JSON.parse(content);
                        for (const mKey of Object.keys(messages)) {
                            if (mKey.toLowerCase() === keyLower) {
                                if (messages[mKey] && typeof messages[mKey].message === 'string') {
                                    return messages[mKey].message;
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        }
        return match;
    });
}

function resolveExtensionMetadata(ext) {
    if (!ext || !ext.id) return ext;
    const extPath = ext.isLocal ? ext.localPath : path.join(app.getPath('userData'), 'extensions-data', ext.id);
    if (fs.existsSync(extPath)) {
        try {
            const manifestPath = path.join(extPath, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                ext.name = getLocalizedExtensionString(manifest.name || ext.name, extPath, manifest);
                ext.description = getLocalizedExtensionString(manifest.description || ext.description || '', extPath, manifest);
            }
        } catch (e) {
            console.error(`Error resolving metadata for extension ${ext.id}:`, e);
        }
    }
    return ext;
}

// ── Chrome Extension Management Engine ──────────────────────────────────────
class ExtensionManager {
    constructor() {
        this.extensionsPath = path.join(app.getPath('userData'), 'extensions-data');
        if (!fs.existsSync(this.extensionsPath)) fs.mkdirSync(this.extensionsPath, { recursive: true });
        this.loaded = new Map();
    }

    async loadAll() {
        if (!userSettings.extensions) userSettings.extensions = [];
        const activeExtensions = userSettings.extensions.filter(e => e.enabled);
        const targetSessions = [
            session.defaultSession,
            session.fromPartition('persist:google_login')
        ];

        for (const ext of activeExtensions) {
            try {
                const extPath = ext.isLocal ? ext.localPath : path.join(this.extensionsPath, ext.id);
                if (fs.existsSync(extPath)) {
                    for (const ses of targetSessions) {
                        const loaded = await ses.loadExtension(extPath);
                        this.loaded.set(ext.id + '_' + ses.getStoragePath(), loaded);
                    }
                    console.log(`Loaded extension: ${ext.name} (${ext.id}) into all sessions.`);
                }
            } catch (err) {
                console.error(`Failed to load extension ${ext.id}:`, err);
            }
        }

        if (userSettings.ocalFocusEnabled) {
            try {
                const focusPath = path.join(__dirname, 'ocal-focus-extension');
                if (fs.existsSync(focusPath)) {
                    for (const ses of targetSessions) {
                        await ses.loadExtension(focusPath);
                    }
                    console.log('Loaded native module: Ocal Focus (Global)');
                }
            } catch (err) { console.error('Failed to load Ocal Focus:', err); }
        }

        if (userSettings.adBlockEnabled !== false) {
            try {
                const ublockPath = path.join(__dirname, 'ublock-origin-extension', 'uBlock0.chromium');
                if (fs.existsSync(ublockPath)) {
                    for (const ses of targetSessions) {
                        await ses.loadExtension(ublockPath);
                    }
                    console.log('Loaded native module: uBlock Origin (Global)');
                }
            } catch (err) { console.error('Failed to load uBlock Origin:', err); }
        }
        if (userSettings.youtubeDislikeEnabled !== false) {
            try {
                const dislikePath = path.join(__dirname, 'return-youtube-dislike-extension');
                if (fs.existsSync(dislikePath)) {
                    for (const ses of targetSessions) {
                        await ses.loadExtension(dislikePath);
                    }
                    console.log('Loaded native module: Return YouTube Dislike (Global)');
                }
            } catch (err) { console.error('Failed to load Return YouTube Dislike:', err); }
        }

        if (userSettings.mediaMasterEnabled !== false) {
            try {
                const mediaPath = path.join(__dirname, 'ocal-media-master-extension');
                if (fs.existsSync(mediaPath)) {
                    for (const ses of targetSessions) {
                        await ses.loadExtension(mediaPath);
                    }
                    console.log('Loaded native module: Ocal Media Master (Global)');
                }
            } catch (err) { console.error('Failed to load Ocal Media Master:', err); }
        }
    }
    async downloadAndInstall(id) {
        // Strip out the full url if provided
        const extensionId = id.includes('/') ? id.split('/').pop().split('?')[0] : id;
        const downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=110.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;
        const tempPath = path.join(app.getPath('temp'), `${extensionId}.crx`);
        const targetPath = path.join(this.extensionsPath, extensionId);

        try {
            // 1. Download .crx
            const response = await net.fetch(downloadUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(tempPath, buffer);

            // 2. Strip CRX header (adm-zip needs help with CRX structure)
            const zipBuffer = this.stripCrxHeader(buffer);

            // 3. Extract to userData
            const zip = new AdmZip(zipBuffer);
            if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
            fs.mkdirSync(targetPath, { recursive: true });
            zip.extractAllTo(targetPath, true);

            // 4. Load info from manifest
            const manifest = JSON.parse(fs.readFileSync(path.join(targetPath, 'manifest.json'), 'utf8'));
            const extensionInfo = {
                id: extensionId,
                name: getLocalizedExtensionString(manifest.name, targetPath, manifest),
                version: manifest.version,
                description: getLocalizedExtensionString(manifest.description || '', targetPath, manifest),
                enabled: true,
                icons: manifest.icons || {}
            };

            // 5. Register in settings
            if (!userSettings.extensions) userSettings.extensions = [];
            const existingIdx = userSettings.extensions.findIndex(e => e.id === extensionId);
            if (existingIdx > -1) userSettings.extensions[existingIdx] = extensionInfo;
            else userSettings.extensions.push(extensionInfo);
            saveSettings(userSettings);

            // 6. Load into session
            const loaded = await session.defaultSession.loadExtension(targetPath);
            this.loaded.set(extensionId, loaded);

            return extensionInfo;
        } catch (err) {
            console.error('Extension installation failed:', err);
            throw err;
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }

    stripCrxHeader(buffer) {
        const magic = buffer.toString('utf8', 0, 4);
        if (magic !== 'Cr24') return buffer; // Not a CRX file
        const version = buffer.readUInt32LE(4);
        let offset;
        if (version === 2) {
            const publicKeyLength = buffer.readUInt32LE(8);
            const signatureLength = buffer.readUInt32LE(12);
            offset = 16 + publicKeyLength + signatureLength;
        } else if (version === 3) {
            const headerLength = buffer.readUInt32LE(8);
            offset = 12 + headerLength;
        } else {
            throw new Error(`Unsupported CRX version: ${version}`);
        }
        return buffer.slice(offset);
    }

    async remove(id) {
        try {
            const targetPath = path.join(this.extensionsPath, id);
            if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });

            userSettings.extensions = userSettings.extensions.filter(e => e.id !== id);
            saveSettings(userSettings);

            // Note: Native Electron loadExtension doesn't always support easy 'unload'
            // We usually inform the user to restart or handle it by refreshing views.
            this.loaded.delete(id);
            return true;
        } catch (err) {
            console.error('Failed to remove extension:', err);
            return false;
        }
    }
}

const extensionManager = new ExtensionManager();

ipcMain.handle('install-extension', async (e, id) => {
    return await extensionManager.downloadAndInstall(id);
});

ipcMain.handle('load-unpacked-extension', async (e) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Extension Directory',
        properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    const dirPath = result.filePaths[0];

    try {
        const manifestPath = path.join(dirPath, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error("No manifest.json found in directory");
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Ensure critical arrays are initialized
        if (!userSettings.bookmarks) userSettings.bookmarks = [];
        if (!userSettings.folders) userSettings.folders = [];
        if (!userSettings.history) userSettings.history = [];
        if (!userSettings.downloads) userSettings.downloads = [];

        const extensionId = require('crypto').createHash('md5').update(dirPath).digest('hex');

        const extensionInfo = {
            id: extensionId,
            name: getLocalizedExtensionString(manifest.name, dirPath, manifest),
            version: manifest.version,
            description: getLocalizedExtensionString(manifest.description || 'Unpacked Extension', dirPath, manifest),
            enabled: true,
            icons: manifest.icons || {},
            isLocal: true,
            localPath: dirPath
        };

        if (!userSettings.extensions) userSettings.extensions = [];
        const existingIdx = userSettings.extensions.findIndex(ext => ext.id === extensionId);
        if (existingIdx > -1) userSettings.extensions[existingIdx] = extensionInfo;
        else userSettings.extensions.push(extensionInfo);

        saveSettings(userSettings);

        const loaded = await session.defaultSession.loadExtension(dirPath);
        extensionManager.loaded.set(extensionId, loaded);

        return extensionInfo;
    } catch (err) {
        console.error('Local extension error:', err);
        throw err;
    }
});

ipcMain.handle('get-extensions', () => {
    return (userSettings.extensions || []).map(ext => resolveExtensionMetadata({ ...ext }));
});

ipcMain.handle('get-all-extensions', () => {
    const native = [
        { id: 'ai-assistant', name: 'Ocal AI Assistant', desc: 'AI-powered productivity and browsing assistant.', enabled: userSettings.aiAssistantEnabled, type: 'native', icon: 'fa-wand-magic-sparkles' },
        { id: 'cyber-stealth', name: 'Cyber Stealth', desc: 'Fingerprint protection and cross-request anonymity.', enabled: userSettings.cyberStealthEnabled, type: 'native', icon: 'fa-user-secret' },
        { id: 'ad-blocker', name: 'uBlock Origin', desc: 'An efficient ad blocker. Easy on CPU and memory.', enabled: userSettings.adBlockEnabled, type: 'native', icon: 'fa-shield-halved' },
        { id: 'dislike-recovery', name: 'Return YouTube Dislike', desc: 'Standalone extension to restore dislike counts on YouTube.', enabled: userSettings.youtubeDislikeEnabled, type: 'native', icon: 'fa-thumbs-down' },
        { id: 'media-master', name: 'Ocal Media Master', desc: 'Professional video and image downloader for all sites.', enabled: userSettings.mediaMasterEnabled, type: 'native', icon: 'fa-download' },
        { id: 'asset-vault', name: 'Asset Vault', desc: 'High-performance local resource caching.', enabled: userSettings.assetVaultEnabled, type: 'native', icon: 'fa-vault' }
    ];
    const marketplace = (userSettings.extensions || []).map(e => ({
        ...resolveExtensionMetadata({ ...e }),
        type: 'marketplace'
    }));
    return [...native, ...marketplace];
});

ipcMain.handle('toggle-native-extension', (e, { id, enabled }) => {
    if (id === 'ai-assistant') userSettings.aiAssistantEnabled = enabled;
    else if (id === 'cyber-stealth') userSettings.cyberStealthEnabled = enabled;
    else if (id === 'ad-blocker') userSettings.adBlockEnabled = enabled;
    else if (id === 'dislike-recovery') userSettings.youtubeDislikeEnabled = enabled;
    else if (id === 'media-master') userSettings.mediaMasterEnabled = enabled;
    else if (id === 'asset-vault') userSettings.assetVaultEnabled = enabled;

    saveSettings(userSettings);
    broadcastSettings(userSettings);
    return true;
});

ipcMain.handle('remove-extension', async (e, id) => {
    return await extensionManager.remove(id);
});

ipcMain.handle('toggle-extension', async (e, { id, enabled }) => {
    const ext = userSettings.extensions.find(x => x.id === id);
    if (ext) {
        ext.enabled = enabled;
        saveSettings(userSettings);
        // Note: Enabling/Disabling in session often requires a reload
        return true;
    }
    return false;
});

ipcMain.on('install-extension-from-store', (e, id) => {
    extensionManager.downloadAndInstall(id).then(() => {
        if (mainWindow) {
            mainWindow.webContents.send('show-modal', {
                title: 'Success',
                message: `Extension ${id} installed successfully!`,
                type: 'success'
            });
        }
    }).catch(err => {
        if (mainWindow) {
            mainWindow.webContents.send('show-modal', {
                title: 'Installation Failed',
                message: `Failed to install extension: ${err.message}`,
                type: 'error'
            });
        }
    });
});

async function createPipWindow(contents) {
    if (pipWindow && !pipWindow.isDestroyed()) {
        pipWindow.focus();
        return;
    }

    // We KEEP the view in the main window! No more crashes or broken tabs.
    pipSourceContents = contents;

    pipWindow = new BrowserWindow({
        width: 480,
        height: 270,
        frame: false,
        resizable: true,
        alwaysOnTop: true,
        backgroundColor: '#000000',
        minWidth: 320,
        minHeight: 180,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    pipWindow.loadFile('pip.html');

    pipWindow.once('ready-to-show', () => {
        if (!pipWindow || pipWindow.isDestroyed()) return;
        pipWindow.show();

        // Notify source tab that custom PiP is active (to avoid local duplicate render)
        if (pipSourceContents && !pipSourceContents.isDestroyed()) {
            pipSourceContents.send('pip-activated');
        }

        // Setup High-Speed MessageChannel Direct-Link
        const { MessageChannelMain } = electron;
        const { port1, port2 } = new MessageChannelMain();

        // Pipe port1 to the YouTube video tab
        if (!contents.isDestroyed()) {
            contents.postMessage('pip-port', null, [port1]);
        }

        // Pipe port2 to the floating PiP window
        pipWindow.webContents.postMessage('pip-port', null, [port2]);
    });

    pipWindow.on('closed', () => {
        if (pipSourceContents && !pipSourceContents.isDestroyed()) {
            pipSourceContents.send('pip-stop-monitoring');
        }
        pipWindow = null;
        pipSourceContents = null;
    });
}

ipcMain.on('trigger-pip', (e) => {
    e.sender.send('request-smart-pip');
});

ipcMain.on('trigger-smart-pip', (e) => {
    if (e.sender.isDestroyed()) return;
    const activeView = views.find(v => v.id === activeViewId)?.view;
    if (activeView && !activeView.webContents.isDestroyed()) {
        activeView.webContents.send('request-smart-pip');
        return;
    }
    e.sender.send('request-smart-pip');
});

ipcMain.on('video-detected', (e, isPlaying) => {
    if (e.sender.isDestroyed()) return;
    updateTabShieldStats(e.sender.id, 'isPlaying', isPlaying);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video-detected', isPlaying);
    }
});

// Security Hub IPCs
ipcMain.on('set-security-toggle', (e, { key, value }) => {
    userSettings[key] = value;
    // Special Sync: Tracking Protection in Security <-> Ad Shield in Extensions
    // Sync both sessions for AdBlock toggle
    if (key === 'adBlockEnabled' || key === 'trackingProtection') {
        const ublockEnabled = userSettings.adBlockEnabled !== false;
        const ublockPath = path.join(__dirname, 'ublock-origin-extension', 'uBlock0.chromium');

        const sessions = [session.defaultSession, session.fromPartition('persist:google_login')];
        sessions.forEach(ses => {
            if (ublockEnabled && fs.existsSync(ublockPath)) {
                ses.loadExtension(ublockPath).catch(err => console.error(`Failed to reload uBlock in session ${ses.getStoragePath()}:`, err));
            }
        });
    }

    if (key === 'youtubeDislikeEnabled') {
        const dislikePath = path.join(__dirname, 'return-youtube-dislike-extension');
        if (value && fs.existsSync(dislikePath)) {
            session.defaultSession.loadExtension(dislikePath).catch(err => console.error('Failed to load Dislike Extension:', err));
        }
    }

    if (key === 'ocalFocusEnabled') {
        const focusPath = path.join(__dirname, 'ocal-focus-extension');
        if (value && fs.existsSync(focusPath)) {
            session.defaultSession.loadExtension(focusPath).catch(err => console.error('Failed to load Ocal Focus natively:', err));
        }
    }

    saveSettings(userSettings);
    broadcastSettings();

    // Apply Cyber Stealth if toggled
    if (key === 'cyberStealthEnabled') {
        const allWc = webContents.getAllWebContents();
        allWc.forEach(wc => {
            if (wc.isDestroyed()) return;
            const url = wc.getURL();
            const isInternal = url.startsWith('ocal://') || url.startsWith('file://');
            if (value && !isInternal) applyCyberStealth(wc);
            else if (!value) wc.reload(); // Reload to clear the forced dark mode
        });
    }
});
ipcMain.on('set-dns-provider', (e, provider) => {
    userSettings.dnsProvider = provider;
    saveSettings(userSettings);
    broadcastSettings();
});

// ── Profile Management APIs ────────────────────────────────────────────────
ipcMain.on('switch-profile', (e, profileId) => {
    const profile = userSettings.profiles.find(p => p.id === profileId);
    if (!profile) return;

    userSettings.currentProfileId = profileId;
    saveSettings(userSettings);
    broadcastSettings();

    // In a full implementation, we would reload all views with a new session partition.
    // For now, we update the UI state.
    if (mainWindow) {
        mainWindow.webContents.send('show-modal', {
            title: 'Identity Switched',
            message: `Now browsing as ${profile.name}.`,
            type: 'success'
        });
    }
});

ipcMain.handle('create-profile', (e, { name, icon }) => {
    const id = 'profile_' + Date.now();
    const newProfile = { id, name, icon };

    if (!userSettings.profiles) userSettings.profiles = [];
    userSettings.profiles.push(newProfile);

    saveSettings(userSettings);
    broadcastSettings();
    return newProfile;
});

ipcMain.on('delete-profile', (e, profileId) => {
    if (profileId === 'default') return; // Cannot delete primary
    if (userSettings.currentProfileId === profileId) {
        userSettings.currentProfileId = 'default';
    }

    userSettings.profiles = userSettings.profiles.filter(p => p.id !== profileId);
    saveSettings(userSettings);
    broadcastSettings();
});

ipcMain.on('edit-profile', (e, { id, name, icon }) => {
    const profile = userSettings.profiles.find(p => p.id === id);
    if (profile) {
        profile.name = name;
        profile.icon = icon;
        saveSettings(userSettings);
        broadcastSettings();
    }
});

function broadcastSettings() {
    const resolvedExtensions = (userSettings.extensions || []).map(ext => resolveExtensionMetadata({ ...ext }));
    const settingsToSend = { ...userSettings, extensions: resolvedExtensions };
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings-changed', settingsToSend);
    }
    // Also notify the sidebar
    if (sidebarOverlayView && !sidebarOverlayView.webContents.isDestroyed()) {
        sidebarOverlayView.webContents.send('settings-changed', settingsToSend);
    }
    // Also notify the AI sidebar
    if (aiSidebarView && !aiSidebarView.webContents.isDestroyed()) {
        aiSidebarView.webContents.send('settings-changed', settingsToSend);
    }
    // Notify all active views
    views.forEach(v => {
        if (v.view && !v.view.webContents.isDestroyed()) {
            v.view.webContents.send('settings-changed', settingsToSend);
        }
    });
}

// ── Dashboard Real-time Telemetry ──
setInterval(async () => {
    try {
        const memory = await process.getProcessMemoryInfo();
        const systemMemory = process.getSystemMemoryInfo();

        // Broadcast combined shield and system stats
        const payload = {
            ...userSettings.shieldStats,
            memory,
            systemMemory,
            uptime: Date.now() - (app.uptimeStart || Date.now()) // Calculated from init
        };

        const allWebContents = webContents.getAllWebContents();
        allWebContents.forEach(wc => {
            if (!wc.isDestroyed() && wc.getURL().includes('settings.html')) {
                wc.send('shield-stats-updated', payload);
            }
        });
    } catch (e) {
        // Silently handle errors if process info is temporarily unavailable
    }
}, 3000);

function setupContextMenu(contents) {
    contents.on('context-menu', (e, props) => {
        const menu = new Menu();

        if (props.linkURL) {
            menu.append(new MenuItem({ label: 'Open Link in New Tab', click: () => { createNewTab(props.linkURL); } }));
            menu.append(new MenuItem({ label: 'Copy Link Address', click: () => { clipboard.writeText(props.linkURL); } }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        if (props.mediaType === 'image') {
            menu.append(new MenuItem({ label: 'Open Image in New Tab', click: () => { createNewTab(props.srcURL); } }));
            menu.append(new MenuItem({ label: 'Copy Image', click: () => { contents.copyImageAt(props.x, props.y); } }));
            menu.append(new MenuItem({ label: 'Copy Image Address', click: () => { clipboard.writeText(props.srcURL); } }));
            menu.append(new MenuItem({ label: 'Save Image As...', click: () => { contents.downloadURL(props.srcURL); } }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: 'Search with Google Lens', click: () => { createNewTab(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(props.srcURL)}`); } }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        if (props.selectionText) {
            menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: `Search Google for "${props.selectionText.substring(0, 20)}..."`, click: () => { createNewTab(`https://www.google.com/search?q=${encodeURIComponent(props.selectionText)}`); } }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        if (props.isEditable) {
            menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // Navigation
        menu.append(new MenuItem({ label: 'Back', enabled: contents.navigationHistory.canGoBack(), click: () => { contents.navigationHistory.goBack(); } }));
        menu.append(new MenuItem({ label: 'Forward', enabled: contents.navigationHistory.canGoForward(), click: () => { contents.navigationHistory.goForward(); } }));
        menu.append(new MenuItem({ label: 'Reload', click: () => { contents.reload(); } }));

        // Dynamic Inspect Element: Allowed only on non-internal pages
        const ctxUrl = contents.getURL();
        const isInternalCtx = ctxUrl.startsWith('ocal://') || ctxUrl.startsWith('file://');
        if (!isInternalCtx) {
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: 'Inspect Element', click: () => { contents.inspectElement(props.x, props.y); } }));
        }

        menu.popup({ window: BrowserWindow.fromWebContents(contents) });
    });
}

// ── Battery Saver Engine ──
function applyBatterySaverGlobally() {
    const isBatterySaver = userSettings.batterySaver;
    const css = `
        * { 
            animation: none !important; 
            transition: none !important; 
            scroll-behavior: auto !important;
        }
    `;

    // 1. Inject into Chrome (Main UI)
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (isBatterySaver) mainWindow.webContents.insertCSS(css);
        else mainWindow.webContents.reload(); // Simple way to clear injected CSS
    }

    // 2. Inject into all active tabs
    views.forEach(v => {
        if (v.view && !v.view.webContents.isDestroyed()) {
            if (isBatterySaver) {
                v.view.webContents.insertCSS(css);
                // Pause background heavy logic if possible
                v.view.webContents.setAudioMuted(true);
            } else {
                v.view.webContents.setAudioMuted(false);
                v.view.webContents.reload();
            }
        }
    });

    console.log(`[Sustainability] Battery Saver Mode: ${isBatterySaver ? 'ENABLED' : 'DISABLED'}`);
}

// ── Power Monitor ──
powerMonitor.on('on-battery', () => {
    if (!userSettings.batterySaver) {
        const notif = new Notification({
            title: 'Ocal Energy Intelligence',
            body: 'Device is now on battery power. Enable Battery Saver in settings for maximum runtime.',
            icon: path.join(__dirname, 'icon.png')
        });
        notif.show();
        notif.on('click', () => { createNewTab('ocal://settings#general'); });
    }
});

powerMonitor.on('on-ac', () => {
    // Optional: maybe auto-disable? User probably wants choice.
});

// ── Ocal Memory Saver / Tab Suspension Algorithm ──
setInterval(() => {
    try {
        if (userSettings.memorySaverEnabled === false && !userSettings.batterySaver) return;
        
        // Inactivity threshold: 5 minutes on battery, 10 minutes on AC/default
        const thresholdMs = (userSettings.batterySaver) ? 5 * 60 * 1000 : 10 * 60 * 1000;
        const now = Date.now();

        views.forEach(v => {
            if (v.id === activeViewId) return; // Skip active tab
            if (v.suspended) return; // Skip already suspended tabs
            
            const inactiveDuration = now - (v.lastActiveTime || now);
            if (inactiveDuration < thresholdMs) return;

            // Do not suspend if playing media
            let isPlaying = false;
            try {
                if (v.view && v.view.webContents && !v.view.webContents.isDestroyed()) {
                    if (v.view.webContents.isPlayingMedia()) isPlaying = true;
                }
                if (v.view2 && v.view2.webContents && !v.view2.webContents.isDestroyed()) {
                    if (v.view2.webContents.isPlayingMedia()) isPlaying = true;
                }
            } catch (e) {}

            if (isPlaying) return;

            // Suspend the tab
            v.suspended = true;
            if (v.view && v.view.webContents && !v.view.webContents.isDestroyed()) {
                const u = v.view.webContents.getURL();
                if (u && !isHomeURL(u) && !u.startsWith('ocal://suspended')) {
                    v.suspendedUrl = u;
                    v.view.webContents.loadURL(`ocal://suspended?url=${encodeURIComponent(u)}`);
                }
            }
            if (v.view2 && v.view2.webContents && !v.view2.webContents.isDestroyed()) {
                const u = v.view2.webContents.getURL();
                if (u && !isHomeURL(u) && !u.startsWith('ocal://suspended')) {
                    v.suspendedUrl2 = u;
                    v.view2.webContents.loadURL(`ocal://suspended?url=${encodeURIComponent(u)}`);
                }
            }
            console.log(`[Memory Saver] Suspended idle tab ${v.id} (inactive for ${Math.round(inactiveDuration / 60000)} min)`);
        });
    } catch (e) {
        console.error('[Memory Saver Error]', e);
    }
}, 30000);
