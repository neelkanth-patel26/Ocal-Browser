const electron = require('electron');

// Environment Check: Ensure we are running in the Electron Main Process
if (typeof electron === 'string' || !electron.app) {
    console.error('\n[FATAL ERROR] Ocal Browser must be run with the Electron executable.');
    console.error('Detected environment: ' + (typeof electron === 'string' ? 'Node.js (resolved to path string)' : 'Unknown'));
    // If you are seeing this, it means you might be running "node main.js" instead of "npm start" or "electron ."
    process.exit(1);
}

const { 
    app, BrowserWindow, BrowserView, ipcMain, dialog, 
    shell, session, Menu, MenuItem, clipboard, protocol, net 
} = electron;

// Register internal protocol as standard/secure to allow 'self' in CSP
protocol.registerSchemesAsPrivileged([
  { scheme: 'ocal', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);
const path = require('path');

// Disable QUIC (fixes Handshake -101 and Connection Reset issues)
app.commandLine.appendSwitch('disable-quic');
// Enable modern TLS features
app.commandLine.appendSwitch('enable-features', 'Tls13EarlyData');
// Hide the fact that we are an automated/embedded browser (Crucial for Google Login)
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

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
  customSearchUrl: 'https://www.google.com/search?q=%s',
  askSavePath: false,
  downloads: []
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
let activeBMFolderId = null;
let isQuitting = false;
let activePopupGroupId = null;
let webAppOpen = false;
let currentWebAppUrl = null;
if (!userSettings.sitePermissions) userSettings.sitePermissions = {};

function setupSessionHandlers() {
  const ses = session.defaultSession;
  
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
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.205 Safari/537.36';
    session.defaultSession.setUserAgent(ua);
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const { requestHeaders } = details;
        delete requestHeaders['X-Electron-Id'];
        delete requestHeaders['X-Requested-With'];
        callback({ requestHeaders });
    });
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (['display-capture', 'media', 'fullscreen'].includes(permission)) callback(true);
        else callback(false);
    });
}

app.on('web-contents-created', (event, contents) => {
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.205 Safari/537.36';
    const mobileUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230805.019) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.205 Mobile Safari/537.36';

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
        
        const isGoogleLogin = url.includes('accounts.google.com') || url.includes('google.com/accounts');
        const isCurrentlyMobile = contents.debugger.isAttached();

        if (isGoogleLogin) {
            if (!isCurrentlyMobile) {
                applyMobileEmulation(contents.session === session.fromPartition('persist:google_login'));
            }
        } else if (isCurrentlyMobile) {
            // If we've left the Google login flow, revert to desktop mode.
            // Since we're already starting a new navigation, we skip the manual reload to avoid interference.
            removeMobileEmulation(true); 
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
    if (sidebarOverlayView) sidebarOverlayView.webContents.send(channel, data);
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
  if (sidebarOverlayView && mainWindow && mainWindow.getBrowserViews().includes(sidebarOverlayView)) {
    mainWindow.removeBrowserView(sidebarOverlayView);
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
    if (!aiSidebarView) return;
    if (mainWindow.getBrowserViews().includes(aiSidebarView)) {
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
    
    if (tabgroupView && mainWindow && mainWindow.getBrowserViews().includes(tabgroupView)) {
        mainWindow.removeBrowserView(tabgroupView);
    }
    if (bmDropdownView && mainWindow && mainWindow.getBrowserViews().includes(bmDropdownView)) {
        mainWindow.removeBrowserView(bmDropdownView);
    }
    activeBMFolderId = null;
    hideDownloadsPopup();
    hideWebApp();
    mainWindow.webContents.send('sidebars-closed');
}

function hidePopups() {
    closeOverlays();
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
    if (!suggestionsView || !mainWindow) return;
    if (mainWindow.getBrowserViews().includes(suggestionsView)) {
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
    if (!downloadsView || !mainWindow) return;
    if (mainWindow.getBrowserViews().includes(downloadsView)) {
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

function createNewTab(url = null) {
  const view = new BrowserView({
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.65 Safari/537.36');

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
    if (isPdf && !targetUrl.includes('ocal://pdf-viewer')) {
        event.preventDefault();
        // Normalize before encoding to prevent %2520
        // Use trailing slash to fix CSP relative path issues
        try {
            const cleanUrl = decodeURI(targetUrl);
            view.webContents.loadURL(`ocal://pdf-viewer/?file=${encodeURIComponent(cleanUrl)}`);
        } catch(e) {
            view.webContents.loadURL(`ocal://pdf-viewer/?file=${encodeURIComponent(targetUrl)}`);
        }
        return;
    }
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('ocal://')) {
        createNewTab(url);
        return { action: 'deny' };
    }
    // Intercept PDFs in window popups too
    if (/\.pdf($|\?)/i.test(url) && !url.includes('ocal://pdf-viewer')) {
        createNewTab(`ocal://pdf-viewer?file=${encodeURIComponent(url)}`);
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

  broadcastTabs();
}

function broadcastTabs() {
    if (!mainWindow) return;
    const tabData = views.map(v => ({
        id: v.id,
        title: v.view.webContents.getTitle() || 'Ocal Home',
        url: v.view.webContents.getURL(),
        favicon: v.favicon || null,
        groupId: v.groupId || null
    }));
    mainWindow.webContents.send('tabs-changed', { 
        tabs: tabData, 
        activeTabId: activeViewId,
        groups: userSettings.tabGroups 
    });
    if (sidebarOverlayView) sidebarOverlayView.webContents.send('tabs-changed', { 
        tabs: tabData, 
        activeTabId: activeViewId,
        groups: userSettings.tabGroups
    });
}

function setActiveTab(id) {
  const oldViewEntry = views.find(v => v.id === activeViewId);
  if (oldViewEntry) mainWindow.removeBrowserView(oldViewEntry.view);
  activeViewId = id;
  const newViewEntry = views.find(v => v.id === id);
  if (newViewEntry) {
    mainWindow.addBrowserView(newViewEntry.view);
    updateViewBounds();
    const url = newViewEntry.view.webContents.getURL();
    const title = newViewEntry.view.webContents.getTitle();
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
    // CONTENT OVERLAY: Active view always fills the entire window (minus chrome)
    // so sidebars (AI, Saves, etc.) float above it without causing resizing.
    activeViewEntry.view.setBounds({
      x: 0, 
      y: Math.floor(yOffset) - 1,
      width: Math.floor(width),
      height: Math.floor(height - yOffset) + 1
    });
    mainWindow.setTopBrowserView(activeViewEntry.view);
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

// IPC Handlers
ipcMain.on('new-tab', () => createNewTab());
ipcMain.on('switch-tab', (e, id) => setActiveTab(id));
ipcMain.on('request-tabs', () => broadcastTabs());
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
      targetUrl = `ocal://pdf-viewer?file=${encodeURIComponent(targetUrl)}`;
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

ipcMain.on('toggle-web-app', (e, url) => {
    if (webAppOpen && currentWebAppUrl === url) {
        hideWebApp();
    } else {
        showWebApp(url);
    }
});
ipcMain.on('switch-sidebar-tab', (e, tab) => {
  sidebarOpen = true;
  showSidebarOverlay();
  if (sidebarOverlayView) {
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
                                a.name.endsWith('.exe') && 
                                a.name.includes('Setup') && 
                                (arch ? a.name.includes(arch) : true)
                            );
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
    const googleUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230805.019) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.205 Mobile Safari/537.36';
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
            rejectUnauthorized: false // We still want to see the cert even if it's invalid
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
