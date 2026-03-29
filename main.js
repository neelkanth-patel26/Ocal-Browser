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
    shell, session, Menu, MenuItem, clipboard, protocol, net 
} = electron;

// Disable deprecation warnings in the console (silences punycode and setPreloads from 3rd-party libs)
process.noDeprecation = true;

// Register internal protocol as standard/secure to allow 'self' in CSP
protocol.registerSchemesAsPrivileged([
  { scheme: 'ocal', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);
const path = require('path');
const AdmZip = require('adm-zip');
const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch').default || require('cross-fetch');

// Disable QUIC (fixes Handshake -101 and Connection Reset issues)
app.commandLine.appendSwitch('disable-quic');
// Enable modern TLS features
app.commandLine.appendSwitch('enable-features', 'Tls13EarlyData');
// Hide the fact that we are an automated/embedded browser (Crucial for Google Login)
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

const OCAL_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
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
        } catch (err) {}
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
        } catch (err) {}
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
  accentColor: '#a855f7',
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
  homeTileStyle: 'square', // 'square', 'rectangle', 'monochrome'
  autoCheckUpdates: true,
  tabGroups: [], // { id, name, color, collapsed }
  adBlockEnabled: true,
  assetVaultEnabled: true,
  aiAssistantEnabled: true,
  cyberStealthEnabled: false,
  aiApiKey: '',
  aiEngine: 'local', // 'local' or 'gemini'
  aiDeepScrape: true,
  aiShowReasoning: true,
  aiResponseStyle: 'concise',
  customSearchUrl: 'https://www.google.com/search?q=%s',
  askSavePath: false,
  downloads: [],
  shieldStats: { ads: 0, trackers: 0, dataSaved: 0 }
};

if (!userSettings.bookmarks) userSettings.bookmarks = [];
if (!userSettings.folders) userSettings.folders = [];
if (!userSettings.bookmarkBarMode) userSettings.bookmarkBarMode = 'auto';
if (!userSettings.homeLayout) userSettings.homeLayout = 'center';
if (!userSettings.homeTileSize) userSettings.homeTileSize = 80;
if (!userSettings.sitePermissions) userSettings.sitePermissions = {};
if (!userSettings.homeTileSpacing) userSettings.homeTileSpacing = 20;
if (!userSettings.homeTileStyle) userSettings.homeTileStyle = 'square';
if (userSettings.autoCheckUpdates === undefined) userSettings.autoCheckUpdates = true;
if (!userSettings.tabGroups) userSettings.tabGroups = [];
if (!userSettings.customSearchUrl) userSettings.customSearchUrl = 'https://www.google.com/search?q=%s';
if (userSettings.askSavePath === undefined) userSettings.askSavePath = false;
if (!userSettings.downloads) userSettings.downloads = [];
if (userSettings.adBlockEnabled === undefined) userSettings.adBlockEnabled = true;
if (userSettings.vpnEnabled === undefined) userSettings.vpnEnabled = false;
if (userSettings.vpnRegion === undefined) userSettings.vpnRegion = 'auto'; // Default VPN region
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

if (!userSettings.shieldStats) userSettings.shieldStats = { ads: 0, trackers: 0, dataSaved: 0 };
if (userSettings.shieldStats.dataSaved === undefined) userSettings.shieldStats.dataSaved = 0;

// Non-persistent page stats: Map<webContentsId, { ads, trackers }>
const tabShieldStats = new Map();
const sessionStartTime = Date.now();

function updateTabShieldStats(wcId, type) {
    if (!wcId) return;
    if (!tabShieldStats.has(wcId)) {
        tabShieldStats.set(wcId, { ads: 0, trackers: 0, isPlaying: false });
    }
    const stats = tabShieldStats.get(wcId);
    if (stats) {
        if (type === 'ads' || type === 'trackers') stats[type]++;
        else if (type === 'isPlaying') stats.isPlaying = !!arguments[2]; // Use 3rd arg for boolean
    }
}

function broadcastShieldStats(wcId = null) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const globalStats = userSettings.shieldStats;
    webContents.getAllWebContents().forEach(wc => {
        try {
            if (wc.isDestroyed()) return;
            const pageStats = wcId ? tabShieldStats.get(wcId) : null;
            wc.send('shield-stats-updated', { 
                global: globalStats,
                page: pageStats,
                webContentsId: wcId,
                sessionStartTime
            });
        } catch(e) {}
    });
}

let pipWindow = null;
let pipSourceContents = null;

var mainWindow;
var welcomeView;
var sidebarOverlayView = null;
var aiSidebarView = null;
var suggestionsView = null;
var siteInfoView = null;
var webAppView = null;
var tabgroupView = null;
var downloadsView = null;
var views = [];
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
let bmDropdownView = null;
let extensionDropdownView = null;
let activeBMFolderId = null;
let isQuitting = false;
let activePopupGroupId = null;
let webAppOpen = false;
let currentWebAppUrl = null;
// AdBlocker Instance (Consolidated Interceptor approach)
let adBlockerInstance = null;
if (!userSettings.sitePermissions) userSettings.sitePermissions = {};

function applyShieldSettings() {
  const active = (userSettings.adBlockEnabled !== false) || (userSettings.trackingProtection !== false);
  
  if (!active) {
      if (adBlockerInstance && adBlockerInstance.isBlockingEnabled(session.defaultSession)) {
          try { adBlockerInstance.disableBlockingInSession(session.defaultSession); } catch {}
          try { adBlockerInstance.disableBlockingInSession(session.fromPartition('persist:google_login')); } catch {}
      }
      return;
  }

  // If already initialized and active in session, we skip (logic is now in the manual wrappers)
  if (adBlockerInstance && adBlockerInstance.isBlockingEnabled(session.defaultSession)) return;

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
      adBlockerInstance = blocker;

      // Master Interceptor Setup: Ocal manually manages the session instead of the library.
      const ses = session.defaultSession;
      const sesGoogle = session.fromPartition('persist:google_login');

      const masterOnBeforeRequest = (details, callback) => {
          if (!details.url) { callback({}); return; }
          const url = details.url.toLowerCase();
          const initiator = details.initiator ? details.initiator.toLowerCase() : '';

          // 1. YouTube & Ocal Neutral Zone: Fully bypass all blocker logic.
          const isYouTube = url.includes('youtube.com') || url.includes('googlevideo.com') || url.includes('ytimg.com');
          const isFromYouTube = initiator.includes('youtube.com') || initiator.includes('googlevideo.com');
          const isInternal = url.includes('ocal://');

          if (isYouTube || isFromYouTube || isInternal) {
              callback({});
              return;
          }

          // VPN v4: National Country Redirect (NCR) Force
          // If VPN is on and we are hitting a local google domain, force the US/Global version.
          if (userSettings.vpnEnabled && url.includes('google.') && (url.includes('.co.in') || url.includes('.de') || url.includes('.co.uk'))) {
              // Only apply /ncr (No Country Redirect) to the root or search page to set the global preference cookie
              let globalUrl;
              if (url.includes('/search') || url.length < (url.indexOf('google.') + 15)) {
                  globalUrl = url.replace(/google\.[a-z\.]+/i, 'google.com/ncr');
              } else {
                  // For sub-resources (like /pagead or /client_204), just swap the host to avoid invalid paths
                  globalUrl = url.replace(/google\.[a-z\.]+/i, 'google.com');
              }
              
              if (globalUrl !== details.url) {
                  console.log(`[VPN v4] Forcing NCR/Global: ${url} -> ${globalUrl}`);
                  callback({ redirectURL: globalUrl });
                  return;
              }
          }

          // 2. Settings Check: Respect Ad Block / Strict Privacy toggles.
          const anyActive = (userSettings.adBlockEnabled !== false) || (userSettings.trackingProtection !== false);
          if (!anyActive) {
              callback({});
              return;
          }

          // 3. Delegation: Only call blocker for protected domains.
          try {
              adBlockerInstance.onBeforeRequest(details, callback);
          } catch (err) {
              console.error('[Shield] request interceptor error', err);
              callback({});
          }
      };

      const masterOnBeforeSendHeaders = (details, callback) => {
          if (!userSettings.vpnEnabled) {
              callback({ requestHeaders: details.requestHeaders });
              return;
          }

          // Force Regional Masking Headers
          details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
          details.requestHeaders['X-Forwarded-For'] = currentVpnRegion === 'us' ? '161.35.63.136' : '178.62.115.158';
          
          callback({ requestHeaders: details.requestHeaders });
      };

      const masterOnHeadersReceived = (details, callback) => {
          const url = details.url.toLowerCase();
          const initiator = details.initiator ? details.initiator.toLowerCase() : '';

          // Same bypass logic for headers (TrustedScript fix)
          const isYouTube = url.includes('youtube.com') || url.includes('googlevideo.com');
          const isFromYouTube = initiator.includes('youtube.com') || initiator.includes('googlevideo.com');
          const isInternal = url.includes('ocal://');

          if (isYouTube || isFromYouTube || isInternal) {
              callback({});
              return;
          }

          try {
              adBlockerInstance.onHeadersReceived(details, callback);
          } catch (err) {
              console.error('[Shield] headers interceptor error', err);
              callback({});
          }
      };

      // Manually register handlers ONLY ONCE with Ocal's master wrappers.
      // We do NOT call adBlockerInstance.enableBlockingInSession() as that would register "ghost" listeners.
      ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, masterOnBeforeRequest);
      ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, masterOnHeadersReceived);
      ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, masterOnBeforeSendHeaders);
      
      sesGoogle.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, masterOnBeforeRequest);
      sesGoogle.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, masterOnHeadersReceived);
      sesGoogle.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, masterOnBeforeSendHeaders);

      // Force library to think it's enabled to prevent recursive registrations if we call it again.
      adBlockerInstance.isBlockingEnabled = () => true;

      console.log('Ocal Shield: Manual Opera-Style Lifecycle Active');
  }).catch(err => console.error('[Shield] failed to stabilize blocker', err));
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
    } catch (e) {}
    callback(true);
  });

  ses.setPermissionCheckHandler((webContents, permission, origin) => {
    const res = checkPermission(origin, permission);
    if (res !== null) return res;
    return true;
  });


  applyShieldSettings();

  // Initial Proxy Setup
  if (userSettings.vpnEnabled) {
      applyProxy(userSettings.vpnRegion);
  }
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

// Ocal VPN v3: The Global Rescue Pool (Multi-Protocol Failover)
const VPN_RESCUE_POOL = {
    'us': [
        'SOCKS5 161.35.105.105:3128', 'SOCKS4 161.35.105.105:3128', 'HTTPS 161.35.63.136:3128', 'PROXY 161.35.63.136:3128',
        'SOCKS5 159.203.111.111:3128', 'HTTPS 159.203.111.111:3128', 'PROXY 159.203.111.111:3128'
    ],
    'uk': [
        'SOCKS5 188.166.166.166:3128', 'SOCKS4 188.166.166.166:3128', 'HTTPS 178.62.115.158:3128', 'PROXY 178.62.115.158:3128',
        'SOCKS5 139.59.59.59:3128', 'HTTPS 139.59.59.59:3128', 'PROXY 139.59.59.59:3128'
    ],
    'de': [
        'SOCKS5 46.101.101.101:3128', 'SOCKS4 46.101.101.101:3128', 'HTTPS 165.22.122.21:3128', 'PROXY 165.22.122.21:3128',
        'SOCKS5 138.68.68.68:3128', 'HTTPS 138.68.68.68:3128', 'PROXY 138.68.68.68:3128'
    ],
    'auto': [
        'SOCKS5 161.35.105.105:3128', 'SOCKS5 188.166.166.166:3128', 'SOCKS5 46.101.101.101:3128',
        'HTTPS 161.35.63.136:3128', 'HTTPS 178.62.115.158:3128', 'HTTPS 165.22.122.21:3128'
    ]
};

function generateVpnPACv3(region = 'auto') {
    const pool = VPN_RESCUE_POOL[region] || VPN_RESCUE_POOL['auto'];
    const pacRules = pool.join('; ');

    return `function FindProxyForURL(url, host) {
        if (shExpMatch(host, "*.youtube.com") || 
            shExpMatch(host, "*.googlevideo.com") || 
            shExpMatch(host, "*.ytimg.com") ||
            shExpMatch(host, "*.local") ||
            shExpMatch(host, "*.ocal") ||
            isPlainHostName(host) ||
            localHostOrDomainIs(host, "127.0.0.1")) {
            return "DIRECT";
        }
        return "${pacRules}; DIRECT";
    }`;
}

let currentVpnRegion = 'auto';

function broadcastVpnStatus(status, details = '') {
    if (shieldPopupView) {
        shieldPopupView.webContents.send('vpn-status-updated', { status, details });
    }
}

function applyProxy(region = 'auto') {
    currentVpnRegion = region;
    const pacCode = generateVpnPACv3(region);
    const pacScript = 'data:application/x-ns-proxy-autoconfig;base64,' + 
                      Buffer.from(pacCode).toString('base64');

    broadcastVpnStatus('Connecting');

    const setProxyFor = (sess) => {
        // VPN v3: Professional Multi-Protocol failover via Rescue PAC engine
        return sess.setProxy({ pacScript })
            .then(() => {
                const displayRegion = region === 'auto' ? 'RESCUE POOL' : region.toUpperCase();
                console.log(`[VPN v3] Rescue Pool Active (${displayRegion})`);
                broadcastVpnStatus('Connected', displayRegion);
            })
            .catch((err) => {
                console.error(`[VPN v3] Initialization Error: ${err}`);
                broadcastVpnStatus('Error');
                return sess.setProxy({ proxyRules: '' });
            });
    };

    setProxyFor(session.defaultSession);
    setProxyFor(session.fromPartition('persist:google_login'));
}

function handleVpnFailure(contents, code) {
    if (userSettings.vpnEnabled) {
        console.warn(`[VPN v3] Connection Failure (Code: ${code}) for URL: ${contents.getURL()}`);
        
        // If it's a timeout or connection reset, try switching to 'auto' (RESCUE POOL)
        if (code === -105 || code === -102 || code === -118) {
            console.log('[VPN v3] Proactive Failover to RESCUE POOL initiated.');
            broadcastVpnStatus('Retrying', 'Failing over...');
            applyProxy('auto');
            setTimeout(() => {
                if (!contents.isDestroyed()) contents.reload();
            }, 1000);
        } else {
            broadcastVpnStatus('Error', `Code ${code}`);
        }
    }
}

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

    webContents.executeJavaScript(stealthScript).catch(() => {});
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
            // Force Standard Chrome Sec-Fetch headers to avoid Anti-Bot detection
            requestHeaders['User-Agent'] = OCAL_USER_AGENT;
            requestHeaders['Sec-Ch-Ua'] = '"Chromium";v="134", "Not:A-Brand";v="99"';
            requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
            requestHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
            
            // If it's a media request, ensure it doesn't have suspicious 'X-Requested-With'
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
    titleBarStyle: 'hidden',
    frame: false,
    transparent: false,
    backgroundColor: '#0c0c0e', // Solid background for better Win10 stability
    backgroundMaterial: 'mica',
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  if (!userSettings.setupComplete) {
    importChromiumBookmarks();
    showWelcomeWizard();
  }

  mainWindow.setMaxListeners(50);
  mainWindow.on('resize', () => {
    updateViewBounds();
    if (welcomeView) {
      const { width, height } = mainWindow.getContentBounds();
      welcomeView.setBounds({ x: 0, y: 0, width, height });
    }
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
    if (!bmDropdownView) createBMDropdownView();
    // Always open a tab on startup
    if (views.length === 0) {
        const startupUrl = getArgumentURL(process.argv);
        createNewTab(startupUrl);
    }
    
    // Proactive background update check
    setTimeout(checkForUpdatesSilently, 3000); 
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send('window-is-maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-is-maximized', false));

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      showSidebarOverlay();
      if (sidebarOverlayView) {
        mainWindow.setTopBrowserView(sidebarOverlayView);
        sidebarOverlayView.webContents.send('show-exit-modal');
      }
    }
  });
}

function createSurveyWindow() {
  const surveyWindow = new BrowserWindow({
    width: 600,
    height: 500,
    frame: false,
    resizable: false,
    backgroundColor: '#0c0c0e',
    backgroundMaterial: 'mica',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  surveyWindow.loadFile(path.join(__dirname, 'uninstaller', 'index.html'));

  ipcMain.on('uninstall-survey-complete', (e, mailtoLink) => {
    shell.openExternal(mailtoLink);
    setTimeout(() => app.quit(), 500);
  });

  ipcMain.on('uninstall-survey-close', () => {
    app.quit();
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
    const desktopUA = OCAL_USER_AGENT;
    const mobileUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230805.019) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

    const applyMobileEmulation = async (isPopup = false) => {
        try {
            if (!contents.debugger.isAttached()) contents.debugger.attach('1.3');
            const metrics = isPopup ? { width: 412, height: 915 } : { width: 0, height: 0 };
            await contents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
                width: metrics.width, height: metrics.height, deviceScaleFactor: 2.6, mobile: true,
                screenOrientation: { type: 'portraitPrimary', angle: 0 }
            });
            await contents.debugger.sendCommand('Network.setUserAgentOverride', { userAgent: mobileUA });
            await contents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true, configuration: 'mobile' });
        } catch (e) {}
    };

    const removeMobileEmulation = async (skipReload = false) => {
        try {
            if (contents.debugger.isAttached()) {
                await contents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride');
                await contents.debugger.sendCommand('Network.setUserAgentOverride', { userAgent: desktopUA });
                contents.debugger.detach();
                if (!skipReload) {
                    setTimeout(() => { if (!contents.isDestroyed()) contents.reload(); }, 100);
                }
            }
        } catch (e) {}
    };

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
        const isCurrentlyMobile = contents.debugger.isAttached();

        if (isGoogleAccounts && isSignFlow && !isPostLogin) {
            if (!isCurrentlyMobile) {
                applyMobileEmulation(contents.session === session.fromPartition('persist:google_login'));
            }
        } else if (isCurrentlyMobile) {
            removeMobileEmulation(true); 
        }
    });

    contents.on('did-stop-navigation', () => {
        const url = contents.getURL();
        const isGoogleAccounts = url.includes('accounts.google.com') || url.includes('google.com/accounts');
        if (!isGoogleAccounts && contents.debugger.isAttached()) {
            removeMobileEmulation(true);
        }
    });

    contents.on('did-fail-load', (e, code, desc, url, isMain) => {
        if (isMain) {
            handleVpnFailure(contents, code);
        }
    });
});

function setupDownloadHandler() {
    session.defaultSession.on('will-download', (event, item, webContents) => {
        const downloadId = Date.now().toString();
        const fileName = item.getFilename();
        
        let savePath = lastSaveAsPath;
        if (!savePath || userSettings.askSavePath) {
            const result = dialog.showSaveDialogSync(mainWindow, {
                title: 'Save File',
                defaultPath: path.join(app.getPath('downloads'), fileName),
                buttonLabel: 'Save',
                filters: [{ name: 'All Files', extensions: ['*'] }]
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
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, webviewTag: true },
    });
    sidebarOverlayView.webContents.loadFile('sidebars.html');
    sidebarOverlayView.setBackgroundColor('#00000000');
    setupContextMenu(sidebarOverlayView.webContents);
    setupInteractionDismissal(sidebarOverlayView.webContents);
}

function createAiSidebar() {
    aiSidebarView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, webviewTag: true },
    });
    aiSidebarView.webContents.loadFile('ai-sidebar.html');
    aiSidebarView.setBackgroundColor('#00000000');
    setupContextMenu(aiSidebarView.webContents);
    setupInteractionDismissal(aiSidebarView.webContents);
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
}

function hideAiSidebar() {
    if (!aiSidebarView || aiSidebarView.webContents.isDestroyed()) return;
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserViews().includes(aiSidebarView)) {
        mainWindow.removeBrowserView(aiSidebarView);
    }
    aiSidebarOpen = false;
    updateViewBounds();
}

function createSuggestionsView() {
    suggestionsView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    suggestionsView.webContents.loadFile('suggestions.html');
    setupInteractionDismissal(suggestionsView.webContents);
}

function createTabgroupView() {
    tabgroupView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    tabgroupView.webContents.loadFile('tabgroup.html');
    tabgroupView.setBackgroundColor('#00000000');
    setupInteractionDismissal(tabgroupView.webContents);
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
    if (shieldPopupView && !shieldPopupView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.getBrowserViews().includes(shieldPopupView)) {
            mainWindow.removeBrowserView(shieldPopupView);
        }
    }
    activeBMFolderId = null;
    hideDownloadsPopup();
    hideWebApp();
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
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
}

function createBMDropdownView() {
    if (bmDropdownView) return;
    bmDropdownView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    bmDropdownView.webContents.loadFile('bm-dropdown.html');
    bmDropdownView.setBackgroundColor('#00000000');
    setupInteractionDismissal(bmDropdownView.webContents);

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
}

let lastDownloadsBlurTime = 0;

function createDownloadsView() {
    downloadsView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    downloadsView.webContents.loadFile('downloads.html');
    downloadsView.setBackgroundColor('#00000000');
    setupContextMenu(downloadsView.webContents);
    setupInteractionDismissal(downloadsView.webContents);
}

function hideDownloadsPopup() {
    if (!downloadsView || downloadsView.webContents.isDestroyed()) return;
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.getBrowserViews().includes(downloadsView)) {
        mainWindow.removeBrowserView(downloadsView);
    }
}

ipcMain.on('toggle-downloads-popup', (e, bounds) => {
    if (!downloadsView) createDownloadsView();
    
    if (mainWindow.getBrowserViews().includes(downloadsView)) {
        hideDownloadsPopup();
    } else {
        // Prevent immediate re-opening if the user clicked the toggle button to close it
        if (Date.now() - lastDownloadsBlurTime < 150) return;

        closeOverlays();
        
        mainWindow.addBrowserView(downloadsView);
        mainWindow.setTopBrowserView(downloadsView);
        
        let targetX = bounds.x - 180;
        let contentBounds = mainWindow.getContentBounds();
        
        // Ensure it doesn't bleed off the right edge bounds map
        if (targetX + 350 > contentBounds.width) {
            targetX = contentBounds.width - 360;
        }
        
        downloadsView.setBounds({
            x: 0,
            y: 0,
            width: contentBounds.width,
            height: contentBounds.height
        });
        
        downloadsView.webContents.send('show-popup', { x: targetX, y: bounds.y });
        downloadsView.webContents.focus();
        downloadsView.webContents.send('download-updated', downloads);
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
    setupInteractionDismissal(shieldPopupView.webContents);
    
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
    setupInteractionDismissal(welcomeView.webContents);
}

function resolveInternalURL(url) {
  if (!url) return url;
  
  // Strip query and hash for path matching
  const basePart = url.split(/[?#]/)[0];
  const cleanBase = basePart.toLowerCase().replace(/\/$/, ''); // remove trailing slash for comparison
  
  // 1. Exact Page Mappings
  if (cleanBase === 'settings' || cleanBase === 'ocal://settings') return 'file://' + path.join(__dirname, 'settings.html');
  if (url.startsWith('ocal://settings#')) return 'file://' + path.join(__dirname, 'settings.html') + url.substring(15);
  
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
  const view = new BrowserView({
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });

  view.webContents.setUserAgent(OCAL_USER_AGENT);

  // Intercept PDF view navigation and internal ocal:// links
  setupInteractionDismissal(view.webContents);
  view.webContents.on('will-navigate', (event, targetUrl) => {
    // 1. If it's already an internal URL, just resolve and load (prevents loops)
    if (targetUrl.startsWith('ocal://')) {
        event.preventDefault();
        view.webContents.loadURL(targetUrl);
        return;
    }

    // 2. Intercept remote PDFs
    const isPdf = /\.pdf($|\?)/i.test(targetUrl);
    if (isPdf && !targetUrl.includes('ocal://pdf-viewer') && !targetUrl.includes('pdf-viewer.html')) {
        event.preventDefault();
        const cleanUrl = normalizeDocumentUrl(targetUrl);
        view.webContents.loadURL(`ocal://pdf-viewer/?file=${encodeURIComponent(cleanUrl)}`);
        return;
    }
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('ocal://')) {
        createNewTab(url);
        return { action: 'deny' };
    }
    // Intercept PDFs in window popups too
    if (/\.pdf($|\?)/i.test(url) && !url.includes('ocal://pdf-viewer') && !url.includes('pdf-viewer.html')) {
        const cleanUrl = normalizeDocumentUrl(url);
        createNewTab(`ocal://pdf-viewer?file=${encodeURIComponent(cleanUrl)}`);
        return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const id = Date.now().toString();
  views.push({ id, view });

  // Initial Load Resolution
  let finalUrl = url;
  if (url && !url.startsWith('ocal://')) {
      const isPdf = /\.pdf($|\?)/i.test(url);
      if (isPdf) {
          // Normalize before encoding to prevent %2520
          // Use trailing slash to fix CSP relative path issues
          try {
              const cleanUrl = decodeURI(url);
              finalUrl = `ocal://pdf-viewer/?file=${encodeURIComponent(cleanUrl)}`;
          } catch(e) {
              finalUrl = `ocal://pdf-viewer/?file=${encodeURIComponent(url)}`;
          }
      }
  }
  
  // Load the ocal:// URL directly so the address bar stays clean
  // The protocol handler will resolve it internally.
  if (finalUrl) {
      view.webContents.loadURL(finalUrl);
  } else {
      view.webContents.loadFile('home.html');
  }

  setActiveTab(id);

  // HTML fullscreen events — hide/show chrome
  view.webContents.on('enter-html-full-screen', () => setHtmlFullscreen(id, true));
  view.webContents.on('leave-html-full-screen', () => setHtmlFullscreen(id, false));

  // Auto-hide overlays on click in the content
  view.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'mouseDown') closeOverlays();
    handleShortcuts(event, input);
  });

  view.webContents.on('page-favicon-updated', (event, favicons) => {
    if (favicons && favicons.length > 0) {
      const entry = views.find(v => v.id === id);
      if (entry) {
        entry.favicon = favicons[0];
        mainWindow.webContents.send('favicon-updated', { id, favicon: favicons[0] });
      }
    }
  });

  view.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
    if (isMainFrame) {
      hideSuggestions();
      // Proactively tell renderer to hide BM bar if navigating away from home
      const tabEntry = views.find(v => v.id === id);
      if (tabEntry) {
          tabEntry.url = url;
          broadcastTabs();
          updateViewBounds(url);
      }
    }
  });

  view.webContents.on('did-finish-load', () => {
    if (userSettings.cyberStealthEnabled) {
        applyCyberStealth(view.webContents);
    }
  });

  view.webContents.on('did-navigate', (event, url) => {
    updateHistory(view, url);
    const tabEntry = views.find(v => v.id === id);
    if (tabEntry) tabEntry.url = url;
    broadcastTabs();
    updateViewBounds(url);
  });

  setupContextMenu(view.webContents);

  // Intercept window.open; load in the same view per user request
  view.webContents.setWindowOpenHandler(({ url }) => {
    view.webContents.loadURL(url);
    return { action: 'deny' };
  });

  view.webContents.on('did-navigate-in-page', (event, url) => {
    updateHistory(view, url);
    const tabEntry = views.find(v => v.id === id);
    if (tabEntry) tabEntry.url = url;
    broadcastTabs();
    updateViewBounds(url);
  });

  view.webContents.on('page-title-updated', (event, title) => {
      const url = view.webContents.getURL();
      mainWindow.webContents.send('title-updated', { id, title: url.includes('home.html') ? 'Ocal Home' : title });
  });

  view.webContents.on('did-start-loading', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('load-progress', { id, progress: 15 });
    }
  });

  view.webContents.on('dom-ready', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('load-progress', { id, progress: 75 });
    }
  });

  view.webContents.on('did-stop-loading', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('load-progress', { id, progress: 100 });
    }
  });

  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame) {
          handleVpnFailure(view.webContents, errorCode);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (isMainFrame && userSettings.vpnEnabled) {
            // Detect and broadcast proxy-specific errors (-130: TIMED_OUT, -107: PROXY_CONNECTION_FAILED, etc.)
            const proxyErrors = [-130, -118, -136, -107];
            if (proxyErrors.includes(errorCode)) {
                mainWindow.webContents.send('proxy-error', {
                    region: userSettings.vpnRegion,
                    error: errorDescription
                });
            }
        }
        mainWindow.webContents.send('load-progress', { id, progress: 0 });
    }
  });

  broadcastTabs();
}

function broadcastTabs() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const tabData = views.map(v => ({
        id: v.id,
        title: v.view.webContents.isDestroyed() ? 'Ocal Home' : (v.view.webContents.getTitle() || 'Ocal Home'),
        url: v.view.webContents.isDestroyed() ? '' : v.view.webContents.getURL(),
        favicon: v.favicon || null,
        groupId: v.groupId || null,
        audible: v.view.webContents.isDestroyed() ? false : v.view.webContents.isCurrentlyAudible()
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
  const oldWc = oldViewEntry?.view.webContents;
  
  // Auto-PiP Logic: If previous tab was playing a video and we are switching away, request native PiP.
  if (oldWc && tabShieldStats.get(oldWc.id)?.isPlaying) {
      oldWc.send('request-smart-pip');
  }

  if (oldViewEntry) mainWindow.removeBrowserView(oldViewEntry.view);
  activeViewId = id;
  const newViewEntry = views.find(v => v.id === id);
  
  if (newViewEntry) {
    const newWc = newViewEntry.view.webContents;
    
    // If the new tab is the one currently in PiP, close the PiP window
    if (pipWindow && pipSourceContents && pipSourceContents.id === newWc.id) {
        pipWindow.close();
    }

    mainWindow.addBrowserView(newViewEntry.view);
    updateViewBounds();
    const url = newWc.getURL();
    const title = newWc.getTitle();
    mainWindow.webContents.send('url-updated', { 
        id, 
        url: url.includes('home.html') ? '' : url, 
        title: url.includes('home.html') ? 'Ocal Home' : title,
        favicon: newViewEntry.favicon || null
    });
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
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  const isFullscreen = !!htmlFullscreenViewId;

  const hTabs = isFullscreen ? 0 : (userSettings.compactMode ? 34 : 42);
  const hNav  = isFullscreen ? 0 : (userSettings.compactMode ? 38 : 46);
  
  // Bookmark Bar Logic
  let isBmVisible = bookmarkBarVisible;
  const activeViewEntry = views.find(v => v.id === activeViewId);
  const activeView = activeViewEntry?.view;
  const url = forcedUrl || (activeView ? activeView.webContents.getURL() : '');
  const isHome = isHomeURL(url);
  
  if (userSettings.bookmarkBarMode === 'always') isBmVisible = true;
  else if (userSettings.bookmarkBarMode === 'never') isBmVisible = false;
  else if (userSettings.bookmarkBarMode === 'auto') isBmVisible = isHome;

  // Notify renderer of our source-of-truth visibility (crucial to prevent gaps!)
  mainWindow.webContents.send('sync-bookmark-visibility', isBmVisible);

  const hBm = (isFullscreen || !isBmVisible) ? 0 : (userSettings.compactMode ? 28 : 36);
  const yOffset = hTabs + hNav + hBm;
  if (activeViewEntry && activeViewEntry.view) {
    // Only update bounds and stack order if the view is currently attached to mainWindow
    // (Prevents crashes when the view is detached in a Portal PiP window)
    if (mainWindow.getBrowserViews().includes(activeViewEntry.view)) {
        activeViewEntry.view.setBounds({
          x: 0, 
          y: Math.floor(yOffset),
          width: Math.floor(width),
          height: Math.floor(height - yOffset)
        });
        mainWindow.setTopBrowserView(activeViewEntry.view);
    }
  }

  // Hide any views that are in collapsed groups to prevent them from staying on top
  views.forEach(v => {
    const group = userSettings.tabGroups.find(g => g.id === v.groupId);
    if (v.id !== activeViewId && group && group.collapsed) {
        mainWindow.removeBrowserView(v.view);
    }
  });

  // 1. Stack AI Sidebar (on the right)
  if (aiSidebarView && mainWindow.getBrowserViews().includes(aiSidebarView)) {
    aiSidebarView.setBounds({ 
        x: Math.floor(width - aiSidebarWidth), 
        y: Math.floor(yOffset), 
        width: Math.floor(aiSidebarWidth), 
        height: Math.floor(height - yOffset) 
    });
    mainWindow.setTopBrowserView(aiSidebarView);
  }

  // 2. Stack Sidebar Overlay (on the left, covering the whole window for backdrop)
  if (sidebarOverlayView && mainWindow.getBrowserViews().includes(sidebarOverlayView)) {
    sidebarOverlayView.setBounds({ 
        x: 0, 
        y: Math.floor(yOffset), 
        width: Math.floor(width), 
        height: Math.floor(height - yOffset) 
    });
    mainWindow.setTopBrowserView(sidebarOverlayView);
  }
}

// Deduplicated closeOverlays removed here
function hideWebApp() {
    webAppOpen = false;
    currentWebAppUrl = null;
    if (webAppView && mainWindow) mainWindow.removeBrowserView(webAppView);
    mainWindow.webContents.send('web-app-closed');
    updateViewBounds();
}

function showWebApp(url) {
    if (!webAppView) {
        webAppView = new BrowserView({
            webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
        });
        setupContextMenu(webAppView.webContents);
        setupInteractionDismissal(webAppView.webContents);
        webAppView.webContents.setWindowOpenHandler(({ url }) => { createNewTab(url); return { action: 'deny' }; });
    }

    if (currentWebAppUrl !== url) {
        webAppView.webContents.loadURL(url);
        currentWebAppUrl = url;
    }

    if (!mainWindow.getBrowserViews().includes(webAppView)) mainWindow.addBrowserView(webAppView);
    
    webAppOpen = true;
    updateViewBounds();
}

// ── Persistence & Global Logic ──────────────────────────────────────────

ipcMain.on('update-setting', (e, key, val) => {
    userSettings[key] = val;
    saveSettings(userSettings);
    
    // Broadcast change to all open webContents (for UI sync)
    webContents.getAllWebContents().forEach(wc => {
        try { wc.send('settings-changed', userSettings); } catch(err) {}
    });
});

// IPC Handlers
ipcMain.on('new-tab', () => createNewTab());
ipcMain.on('switch-tab', (e, id) => setActiveTab(id));
ipcMain.on('request-tabs', () => broadcastTabs());
ipcMain.on('hide-popups', () => hidePopups());
ipcMain.on('close-tab', async (e, id) => {
  if (views.length === 1) {
    mainWindow.close();
  } else {
    const index = views.findIndex(v => v.id === id);
    if (index !== -1) {
        const [removed] = views.splice(index, 1);
        mainWindow.removeBrowserView(removed.view);
        removed.view.webContents.destroy();
        if (activeViewId === id) {
            activeViewId = views.length > 0 ? views[Math.max(0, index - 1)].id : null;
            if (activeViewId) setActiveTab(activeViewId); else updateViewBounds();
        }
        broadcastTabs();
    }
  }
});

ipcMain.on('navigate-to', (e, url) => {
  const activeView = views.find(v => v.id === activeViewId)?.view;
  if (!activeView) return;
  
  // Clean the input (strip whitespace and common quotes from copy-pasting)
  let cleanUrl = url.trim();
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
      cleanUrl = cleanUrl.substring(1, cleanUrl.length - 1);
  }

  let targetUrl = cleanUrl;

  // 1. Detect Local Drive Paths (e.g., C:/...)
  const isLocalDrive = /^[a-zA-Z]:[/\\]/.test(cleanUrl);
  const isAbsPath = cleanUrl.startsWith('/') || cleanUrl.startsWith('\\\\');
  if ((isLocalDrive || isAbsPath) && !cleanUrl.startsWith('file://')) {
      targetUrl = 'file:///' + cleanUrl.replace(/\\/g, '/');
  }

  // 2. Protocol Resolution
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

  // 3. Final PDF Interception (More robust detection for history clicks)
  const lowerUrl = targetUrl.toLowerCase();
  const isPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || lowerUrl.includes('.pdf#');
  
  if (isPdf && !lowerUrl.includes('ocal://pdf-viewer')) {
      const cleanUrl = normalizeDocumentUrl(targetUrl);
      targetUrl = `ocal://pdf-viewer?file=${encodeURIComponent(cleanUrl)}`;
  }

  hideSuggestions();
  activeView.webContents.loadURL(resolveInternalURL(targetUrl));
});

ipcMain.on('nav-back', () => { const v = views.find(v => v.id === activeViewId)?.view; if (v?.webContents.navigationHistory.canGoBack()) v.webContents.navigationHistory.goBack(); });
ipcMain.on('nav-forward', () => { const v = views.find(v => v.id === activeViewId)?.view; if (v?.webContents.navigationHistory.canGoForward()) v.webContents.navigationHistory.goForward(); });
ipcMain.on('nav-reload', () => (views.find(v => v.id === activeViewId)?.view)?.webContents.reload());
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
ipcMain.on('window-close', () => mainWindow.close());

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

// ── Ocal AI Agent Command Center 2.0 ──────────────────────────────────────

/**
 * Executes a sophisticated, agentic task using optional Gemini API power.
 */
ipcMain.handle('ai-agent-execute', async (event, query) => {
    if (!query || !query.trim()) return { text: "Hello! I'm your Ocal AI. How can I assist you today?", actions: [] };

    const q = query.toLowerCase();
    const actions = [];
    
    // Load current AI context from settings
    const apiKey = userSettings.aiApiKey;
    const showReasoning = userSettings.aiShowReasoning !== false;
    const style = userSettings.aiResponseStyle || 'concise';
    const useGemini = userSettings.aiEngine === 'gemini' && apiKey && apiKey.length > 20;

    const notifyAction = (text, icon = 'fa-spinner fa-spin') => {
        if (showReasoning && aiSidebarView) {
            aiSidebarView.webContents.send('ai-agent-action', { text, icon });
        }
        actions.push({ text, icon });
    };

    try {
        // Phase 1: Local Tool & Command Recognition
        if (q.includes('open') || q.includes('go to') || q.includes('visit') || q.includes('bring me to')) {
            const urlMatch = query.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9]+\.[a-z]{2,})/i);
            if (urlMatch) {
                let url = urlMatch[0];
                if (!url.startsWith('http')) url = 'https://' + url;
                notifyAction(`Navigating to ${url}...`, 'fa-compass');
                createNewTab(url);
                return { text: `I've opened **${url}** for you.`, actions };
            }
        }

        if ((q.includes('tab') || q.includes('view') || q.includes('list')) && (q.includes('tab') || q.includes('open'))) {
            if (q.includes('tab') && (q.includes('list') || q.includes('show') || q.includes('all') || q.includes('what'))) {
                notifyAction("Crawling active tab session...", 'fa-layer-group');
                const tabList = views.map((v, i) => `${i + 1}. **${v.view.webContents.getTitle() || 'Blank Page'}**`).join('\n');
                return { text: `You have **${views.length}** tabs open:\n\n${tabList}`, actions };
            }
        }

        // Phase 2: Explicit Search Override (Force New Tab)
        if (q.startsWith('search for ') || q.startsWith('find ') || q.startsWith('look up ')) {
            const searchQuery = query.replace(/(search for|find|look up)/i, '').trim();
            notifyAction("Searching the web...", 'fa-magnifying-glass');
            createNewTab(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);
            return { text: `I've opened a search for **${searchQuery}** in a new tab.`, actions };
        }

        // Phase 3: Page Analysis (Summarize/Explain)
        const isPageInsight = q.includes('summarize') || q.includes('explain') || q.includes('what is this') || q.includes('analyze');
        
        if (isPageInsight) {
            const activeView = views.find(v => v.id === activeViewId)?.view;
            if (!activeView) return { text: "Please select a tab first so I can analyze it.", actions };
            
            const url = activeView.webContents.getURL();
            const title = activeView.webContents.getTitle();

            if (url.startsWith('file://') || url.startsWith('ocal://') || url === 'about:blank') {
                return { text: "I can't analyze internal or local pages. Try a web article or site!", actions };
            }

            notifyAction("Extracting semantic page structure...", 'fa-microchip');
            const pageData = await activeView.webContents.executeJavaScript(`
                (function() {
                    const sel = (s) => document.querySelector(s)?.content || document.querySelector(s)?.innerText || '';
                    const meta = { title: document.title, description: sel('meta[name="description"]') || sel('meta[property="og:description"]'), hostname: window.location.hostname, canonical: window.location.href };
                    const headers = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()).filter(t => t.length > 5).slice(0, 10);
                    const clone = document.body.cloneNode(true);
                    clone.querySelectorAll('script, style, nav, footer, header, aside, .ad, .cookie-banner').forEach(e => e.remove());
                    const text = clone.innerText.split(/\\n+/).filter(l => l.trim().length > 40).slice(0, 40).join(' ');
                    return { meta, headers, text };
                })()
            `).catch(() => null);

            if (pageData && (pageData.text || pageData.meta.description)) {
                if (useGemini) {
                    notifyAction("Synthesizing AI Narrative (Gemini)...", 'fa-wand-magic-sparkles');
                    const results = await tryGemini(`Analyze this page: ${pageData.meta.title}\nContent: ${pageData.text.substring(0, 3000)}\n\nProvide a ${style} analysis in Markdown.`, apiKey, style);
                    if (results) return { text: results, actions };
                }

                notifyAction("Synthesizing Local Intelligence...", 'fa-bolt-lightning');
                let localResult = `## Intelligence Takeaway: ${pageData.meta.title}\n\n`;
                if (pageData.meta.description) localResult += `> ${pageData.meta.description}\n\n`;
                const summaryPoints = pageData.text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 50).slice(0, 3);
                summaryPoints.forEach(p => localResult += `* ${p}.\n`);
                return { text: localResult, actions };
            }
        }

        // Phase 4: General Assistant (Direct Sidebar Answer with Environment Context)
        if (useGemini) {
            notifyAction("Consulting AI Intelligence...", 'fa-brain');
            const tabContext = `[Environment Context] Open Tabs: ${views.length} (${views.map(v => v.view.webContents.getTitle()).join(', ')}).`;
            const directAnswer = await tryGemini(`${tabContext}\n\nQuery: ${query}`, apiKey, style);
            if (directAnswer) return { text: directAnswer, actions };
        }

        // Final Fallback: Search the web
        notifyAction("Researching context (Search Fallback)...", 'fa-magnifying-glass');
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        createNewTab(searchUrl);
        return { text: `I've looked up "${query}" for you. Results are ready in the new tab.`, actions };

    } catch (err) {
        console.error('[Agent Error]', err);
        return { error: "I encountered an issue processing that. Please try again or check your settings." };
    }
});

/**
 * Helper: Refined Gemini fetch logic with model fallback loop.
 */
async function tryGemini(prompt, apiKey, style = 'concise') {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro-latest'];
    for (const model of modelsToTry) {
        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const sysPrompt = `You are Ocal AI, a premium browser assistant. Style: ${style}. Format: Markdown. Use "> [!TIP]" for insights.`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify({ contents: [{ parts: [{ text: `${sysPrompt}\n\nQuery: ${prompt}` }] }] }),
                headers: { 'Content-Type': 'application/json' }
            });

            const resultData = await response.json();
            if (resultData.error) {
                if (resultData.error.status === 'NOT_FOUND') continue;
                throw new Error(resultData.error.message);
            }
            const aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) return aiText;
        } catch (err) {
            console.warn(`[Gemini Fallback] ${model} failed:`, err.message);
            if (!err.message.includes('NOT_FOUND')) break; 
        }
    }
    return null;
}





// Retro-compatibility for existing AI calls
ipcMain.handle('ai-summarize-page', async (e) => (await ipcMain.emit('ai-agent-execute', e, 'summarize')).text);
ipcMain.handle('ai-search-web', async (e, q) => (await ipcMain.emit('ai-agent-execute', e, `search for ${q}`)).text);
ipcMain.handle('ai-chat-query', async (e, q) => (await ipcMain.emit('ai-agent-execute', e, q)).text);


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

ipcMain.on('apply-proxy', (e, { enabled, region }) => {
    if (enabled) {
        applyProxy(region);
    } else {
        session.defaultSession.setProxy({ proxyRules: '' })
            .then(() => console.log('[Proxy] Reverted to direct connection'))
            .catch(err => console.error(`[Proxy] Failed to clear proxy: ${err}`));
    }
});

ipcMain.handle('get-shield-stats', (e, wcId) => {
    const viewItem = wcId ? views.find(v => v.id === wcId) : null;
    const wc = viewItem ? viewItem.view.webContents : null;
    const isYouTube = wc ? wc.getURL().includes('youtube.com') : false;
    return {
        global: userSettings.shieldStats,
        page: wcId ? tabShieldStats.get(wcId) : null,
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
        case 'volume':
            pipSourceContents.executeJavaScript(`const v = document.querySelector("video"); if (v) v.volume = ${value};`);
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
    app.quit();
});

// Tab Grouping IPCs
ipcMain.on('create-tab-group', (e, { name, color, tabIds }) => {
    const groupId = 'group-' + Date.now();
    userSettings.tabGroups.push({ id: groupId, name, color, collapsed: false });
    tabIds.forEach(tid => {
        const v = views.find(v => v.id === tid);
        if (v) v.groupId = groupId;
    });
    saveSettings(userSettings);
    broadcastTabs();
});

ipcMain.on('add-to-group', (e, { tabId, groupId }) => {
    const v = views.find(v => v.id === tabId);
    if (v) v.groupId = groupId;
    saveSettings(userSettings);
    broadcastTabs();
});

ipcMain.on('remove-from-group', (e, tabId) => {
    const v = views.find(v => v.id === tabId);
    if (v) v.groupId = null;
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
  mainWindow.webContents.send('settings-changed', userSettings); 
  if (sidebarOverlayView) sidebarOverlayView.webContents.send('settings-changed', userSettings);
  views.forEach(v => v.view.webContents.send('settings-changed', userSettings));

  if (key === 'compactMode' || key === 'bookmarkBarMode') updateViewBounds(); 
  if (key === 'dns') console.log(`[DNS] Global resolver updated to: ${val}`);

  if (key === 'adBlockEnabled' || key === 'trackingProtection') {
      applyShieldSettings();
  }

  if (key === 'vpnEnabled') {
      if (val) applyProxy(userSettings.vpnRegion);
      else {
          session.defaultSession.setProxy({ proxyRules: '' }).catch(() => {});
          session.fromPartition('persist:google_login').setProxy({ proxyRules: '' }).catch(() => {});
      }
  }

  if (key === 'vpnRegion' && userSettings.vpnEnabled) {
      applyProxy(val);
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
                imported.push({ title: node.name, url: node.url, folderId: folderId, id: Date.now() + Math.random().toString(36).substr(2,9) });
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
                if (node.type === 'url') imported.push({ title: node.name, url: node.url, folderId: folderId, id: Date.now() + Math.random().toString(36).substr(2,9) });
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
                        id: Date.now() + Math.random().toString(36).substr(2,9)
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

    const cmdOrCtrl = process.platform === 'darwin' ? input.meta : input.control;

    // Ctrl + T: New Tab
    if (cmdOrCtrl && input.key.toLowerCase() === 't') {
        event.preventDefault();
        createNewTab();
    }
    // Ctrl + W: Close Tab
    else if (cmdOrCtrl && input.key.toLowerCase() === 'w') {
        event.preventDefault();
        if (activeViewId) ipcMain.emit('close-tab', null, activeViewId);
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
    // F12: DevTools
    else if (input.key === 'F12') {
        const v = views.find(v => v.id === activeViewId)?.view;
        if (v) v.webContents.openDevTools({ mode: 'detach' });
    }
}

ipcMain.handle('get-settings', () => userSettings);
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
                    } catch (e) {}
                }
            });
        });
        request.on('error', () => {});
        request.end();
    } catch (e) {}
}

ipcMain.handle('check-for-update', async () => {
    return new Promise((resolve) => {
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
                });
            });
            request.on('error', () => resolve(null));
            request.end();
        } catch (e) {
            resolve(null);
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
    if (data.url   !== undefined) b.url   = data.url;
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
    
    const popupWidth = 320;
    const popupHeight = 750;
    const contentBounds = mainWindow.getContentBounds();
    
    let targetX = x + (width / 2) - (popupWidth / 2);
    if (targetX < 10) targetX = 10;
    if (targetX + popupWidth > contentBounds.width - 10) targetX = contentBounds.width - popupWidth - 10;

    shieldPopupView.setBounds({ 
        x: Math.round(targetX), 
        y: Math.round(y + height + 10), 
        width: popupWidth, 
        height: popupHeight 
    });
    
    mainWindow.setTopBrowserView(shieldPopupView);
    shieldPopupView.webContents.send('show-popup', { x: 0, y: 0, tabId, isYouTube });
    shieldPopupView.webContents.focus();
});

ipcMain.on('show-bm-dropdown', (e, { x, y, bookmarks, folderId }) => {
    if (!bmDropdownView || !mainWindow) return;
    
    // Toggle logic: if clicking the same folder, just hide it
    if (activeBMFolderId === folderId) {
        hidePopups();
        return;
    }

    hidePopups();
    activeBMFolderId = folderId;
    mainWindow.addBrowserView(bmDropdownView);
    
    // Initial safe size, will be refined by dropdown-resize IPC
    bmDropdownView.setBounds({ x: Math.round(x), y: Math.round(y), width: 330, height: 500 });
    bmDropdownView.webContents.send('show-bm-dropdown', { bookmarks });
    mainWindow.setTopBrowserView(bmDropdownView);
});

ipcMain.on('resize-bm-dropdown', (e, { width, height }) => {
    if (!bmDropdownView || !mainWindow) return;
    const bounds = bmDropdownView.getBounds();
    bmDropdownView.setBounds({ x: bounds.x, y: bounds.y, width: Math.round(width), height: Math.round(height) });
});

ipcMain.on('hide-bm-dropdown', () => {
    hidePopups();
});

ipcMain.on('add-folder', (e, f) => { f.id = Date.now().toString(); userSettings.folders.push(f); saveSettings(userSettings); broadcastBookmarks(); });
ipcMain.on('remove-folder', (e, id) => { userSettings.folders = userSettings.folders.filter(f => f.id !== id); userSettings.bookmarks.forEach(b => { if (b.folderId === id) delete b.folderId; }); saveSettings(userSettings); broadcastBookmarks(); });
ipcMain.on('edit-folder', (e, data) => { const f = userSettings.folders.find(x => x.id === data.id); if (f) Object.assign(f, data); saveSettings(userSettings); broadcastBookmarks(); });

function broadcastBookmarks() {
    const data = { bookmarks: userSettings.bookmarks, folders: userSettings.folders };
    mainWindow.webContents.send('bookmarks-changed', data);
    if (sidebarOverlayView) sidebarOverlayView.webContents.send('bookmarks-changed', data);
}

// Extension Dropdown Logic
function createExtensionDropdownView() {
    extensionDropdownView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
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
    const popupWidth = 340;
    extensionDropdownView.setBounds({ 
        x: Math.round(x + width - popupWidth), 
        y: Math.round(y + 40), 
        width: popupWidth, 
        height: 500 
    });
    mainWindow.setTopBrowserView(extensionDropdownView);
    extensionDropdownView.webContents.send('refresh-extensions');
});

ipcMain.on('hide-extensions-dropdown', () => {
    if (extensionDropdownView && mainWindow.getBrowserViews().includes(extensionDropdownView)) {
        mainWindow.removeBrowserView(extensionDropdownView);
    }
});

ipcMain.on('toggle-adblock', (e, enabled) => {
    userSettings.adBlockEnabled = enabled;
    saveSettings(userSettings);

    if (enabled) {
        if (adBlockerInstance) {
            adBlockerInstance.enableBlockingInSession(session.defaultSession);
        } else {
            ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blockerInstance) => {
                adBlockerInstance = blockerInstance;
                adBlockerInstance.enableBlockingInSession(session.defaultSession);
            });
        }
    } else {
        if (adBlockerInstance) {
            try {
                adBlockerInstance.disableBlockingInSession(session.defaultSession);
            } catch {
                // fallback to minimal session refresh if API not available
                session.defaultSession.clearCache();
            }
        }
    }

    broadcastSettings();
});

ipcMain.on('toggle-vpn', (e, enabled) => {
    userSettings.vpnEnabled = enabled;
    saveSettings(userSettings);
    if (enabled) {
        applyProxy(userSettings.vpnRegion);
    } else {
        session.defaultSession.setProxy({});
        const googleSession = session.fromPartition('persist:google_login');
        googleSession.setProxy({});
    }
    broadcastSettings();
});

ipcMain.on('set-vpn-region', (e, region) => {
    userSettings.vpnRegion = region;
    saveSettings(userSettings);
    if (userSettings.vpnEnabled) {
        applyProxy(region);
    }
    broadcastSettings();
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
        
        // Don't add if the URL is the same as the last item (avoid duplicates from in-page nav)
        if (userSettings.history.length > 0 && userSettings.history[0].url === url) return;

        const historyItem = { title: title || url, url, timestamp: Date.now() };
        userSettings.history = [historyItem, ...(userSettings.history || [])].slice(0, 100);
        saveSettings(userSettings);
        broadcastHistory();
    }
}

function broadcastHistory() {
    mainWindow.webContents.send('settings-changed', userSettings);
    if (sidebarOverlayView) sidebarOverlayView.webContents.send('settings-changed', userSettings);
}

ipcMain.on('open-download', (e, filePath) => {
    shell.showItemInFolder(filePath);
});

function setupGoogleLoginPartition() {
    const googleSession = session.fromPartition('persist:google_login');
    const googleUA = OCAL_USER_AGENT;
    googleSession.setUserAgent(googleUA);
}

app.whenReady().then(() => {
    // Register ocal:// protocol
    if (protocol.handle) { // Modern Electron
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
    extensionManager.loadAll();
    
    // Apply initial proxy settings via shared implementation
    if (userSettings.vpnEnabled) {
        applyProxy(userSettings.vpnRegion || 'auto');
    }

    createMainWindow();
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
        let results = [];
        
        // 1. Online Suggestions (only if enabled)
        if (userSettings.searchSuggest !== false) {
            try {
                const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
                const data = await response.json();
                results = data[1].map(s => ({ text: s, type: 'search' }));
            } catch (err) { console.error('Online suggest fetch failed'); }
        }

        // 2. History Suggestions (always included unless query is empty)
        if (userSettings.history && Array.isArray(userSettings.history)) {
            const hResults = userSettings.history
                .filter(h => (h.title && h.title.toLowerCase().includes(query.toLowerCase())) || (h.url && h.url.toLowerCase().includes(query.toLowerCase())))
                .slice(0, 3)
                .map(h => ({ text: h.title, url: h.url, type: 'history' }));
            results.unshift(...hResults);
        }

        if (results.length > 0) {
            if (suggestionsView) suggestionsView.webContents.send('update-suggestions', results.slice(0, 8));
        } else {
            hideSuggestions();
        }
    } catch (err) { /* Silent fail */ }
});

ipcMain.on('show-suggestions', (e, bounds) => {
    if (!suggestionsView || !mainWindow) return;
    if (!mainWindow.getBrowserViews().includes(suggestionsView)) {
        mainWindow.addBrowserView(suggestionsView);
    }
    suggestionsView.setBounds({
        x: Math.floor(bounds.x),
        y: Math.floor(bounds.y + bounds.height),
        width: Math.floor(bounds.width),
        height: 350
    });
    mainWindow.setTopBrowserView(suggestionsView);
});

ipcMain.on('hide-suggestions', () => hideSuggestions());

ipcMain.on('suggestion-selected', (e, text) => {
    hideSuggestions();
    mainWindow.webContents.send('execute-suggestion', text);
});

// ── Site Info Popup Logic ───────────────────────────────────────────────────
function createSiteInfoView() {
    siteInfoView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
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
    if (!mainWindow) return;
    if (!siteInfoView) createSiteInfoView();
    
    const activeView = views.find(v => v.id === activeViewId)?.view;
    const url = activeView ? activeView.webContents.getURL() : '';
    
    if (!mainWindow.getBrowserViews().includes(siteInfoView)) {
        mainWindow.addBrowserView(siteInfoView);
    }
    
    // Position below the address bar identity area
    siteInfoView.setBounds({
        x: Math.floor(bounds.x),
        y: Math.floor(bounds.y + bounds.height + 4),
        width: 320,
        height: 480 // Sufficient height for the content
    });
    
    mainWindow.setTopBrowserView(siteInfoView);
    
    // Fetch permissions for this origin to pass to the popup
    let permissions = { notifications: 'allow', popups: 'allow', audio: 'allow' };
    try {
        const origin = new URL(url).origin;
        if (userSettings.sitePermissions[origin]) {
            permissions = { ...permissions, ...userSettings.sitePermissions[origin] };
        }
    } catch (e) {}

    siteInfoView.webContents.send('update-site-info', { url, permissions });
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
        
        for (const ext of activeExtensions) {
            try {
                const extPath = path.join(this.extensionsPath, ext.id);
                if (fs.existsSync(extPath)) {
                    const loaded = await session.defaultSession.loadExtension(extPath);
                    this.loaded.set(ext.id, loaded);
                    console.log(`Loaded extension: ${ext.name} (${ext.id})`);
                }
            } catch (err) {
                console.error(`Failed to load extension ${ext.id}:`, err);
            }
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
                name: manifest.name,
                version: manifest.version,
                description: manifest.description || '',
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

ipcMain.handle('get-extensions', () => {
    return userSettings.extensions || [];
});

ipcMain.handle('get-all-extensions', () => {
    const native = [
        { id: 'ai-assistant', name: 'Ocal AI Assistant', desc: 'AI-powered productivity and browsing assistant.', enabled: userSettings.aiAssistantEnabled, type: 'native', icon: 'fa-wand-magic-sparkles' },
        { id: 'cyber-stealth', name: 'Cyber Stealth', desc: 'Fingerprint protection and cross-request anonymity.', enabled: userSettings.cyberStealthEnabled, type: 'native', icon: 'fa-user-secret' },
        { id: 'ad-blocker', name: 'Ad & Tracker Block', desc: 'Removes intrusive ads and behavioral trackers.', enabled: userSettings.adBlockEnabled, type: 'native', icon: 'fa-shield-halved' },
        { id: 'asset-vault', name: 'Asset Vault', desc: 'High-performance local resource caching.', enabled: userSettings.assetVaultEnabled, type: 'native', icon: 'fa-vault' }
    ];
    const marketplace = (userSettings.extensions || []).map(e => ({ ...e, type: 'marketplace' }));
    return [...native, ...marketplace];
});

ipcMain.handle('toggle-native-extension', (e, { id, enabled }) => {
    if (id === 'ai-assistant') userSettings.aiAssistantEnabled = enabled;
    else if (id === 'cyber-stealth') userSettings.cyberStealthEnabled = enabled;
    else if (id === 'ad-blocker') userSettings.adBlockEnabled = enabled;
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
    if (activeView && !activeView.isDestroyed()) {
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
    if (key === 'adBlockEnabled') {
        const toggleVal = value !== false;
        // Broadcast specifically for extensions UI refresh
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

function applyCyberStealth(wc) {
    if (!userSettings.cyberStealthEnabled || wc.isDestroyed()) return;
    
    const url = wc.getURL();
    // NEVER apply to internal pages, settings, or PDF viewer - they are already dark/themed
    if (url.startsWith('ocal://') || url.includes('home.html') || url.includes('settings.html') || url.includes('pdf-viewer.html')) return;

    const darkCSS = `
        html, body { background: #0c0c0e !important; color: #eee !important; }
        html { filter: invert(0.9) hue-rotate(180deg) !important; background: #000 !important; }
        img, video, iframe, canvas, [style*="background-image"] { filter: invert(1.1) hue-rotate(180deg) !important; }
    `;
    wc.insertCSS(darkCSS).catch(() => {});
}

ipcMain.on('set-dns-provider', (e, provider) => {
    userSettings.dnsProvider = provider;
    saveSettings(userSettings);
    broadcastSettings();
});

function broadcastSettings() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings-changed', userSettings);
    }
    // Notify all active views
    views.forEach(v => {
        if (v.view && !v.view.webContents.isDestroyed()) {
            v.view.webContents.send('settings-changed', userSettings);
        }
    });
}

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
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ label: 'Inspect Element', click: () => { contents.inspectElement(props.x, props.y); } }));

        menu.popup({ window: BrowserWindow.fromWebContents(contents) });
    });
}
