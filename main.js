const { app, BrowserWindow, BrowserView, ipcMain, dialog, shell, session, Menu, MenuItem, clipboard } = require('electron');
const path = require('path');

// Disable QUIC (fixes Handshake -101 and Connection Reset issues)
app.commandLine.appendSwitch('disable-quic');
// Enable modern TLS features
app.commandLine.appendSwitch('enable-features', 'Tls13EarlyData');
// Hide the fact that we are an automated/embedded browser (Crucial for Google Login)
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
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

let mainWindow;
let welcomeView;
let sidebarOverlayView;
let aiSidebarView;
let suggestionsView;
let views = [];
let downloads = [];
let activeViewId = null;
let sidebarOpen = false;
let aiSidebarOpen = false;
let aiSidebarWidth = 550;
let historySidebarOpen = false;
let downloadsSidebarOpen = false;
let bookmarksSidebarOpen = false;
let bookmarkBarVisible = true; 
let dropdownOpen = false;
let isQuitting = false;

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
  homeTileStyle: 'square' // 'square', 'rectangle', 'monochrome'
};

if (!userSettings.bookmarks) userSettings.bookmarks = [];
if (!userSettings.folders) userSettings.folders = [];
if (!userSettings.bookmarkBarMode) userSettings.bookmarkBarMode = 'auto';
if (!userSettings.homeLayout) userSettings.homeLayout = 'center';
if (!userSettings.homeTileSize) userSettings.homeTileSize = 80;
if (!userSettings.homeTileSpacing) userSettings.homeTileSpacing = 20;
if (!userSettings.homeTileStyle) userSettings.homeTileStyle = 'square';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1350,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Ocal',
    frame: false,
    transparent: false,
    backgroundColor: '#00000000',
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
    showWelcomeWizard();
  }

  mainWindow.setMaxListeners(25);
  mainWindow.on('resize', () => {
    updateViewBounds();
    if (welcomeView) {
      const { width, height } = mainWindow.getContentBounds();
      welcomeView.setBounds({ x: 0, y: 0, width, height });
    }
  });

    mainWindow.webContents.on('did-finish-load', () => {
        if (!sidebarOverlayView) createSidebarOverlay();
        if (!aiSidebarView) createAiSidebar();
        if (!suggestionsView) createSuggestionsView();
    // Always open a tab on startup
    if (views.length === 0) createNewTab();
    setupDownloadHandler();
    setupCompatibilityHandler();
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

    const removeMobileEmulation = async () => {
        try {
            if (contents.debugger.isAttached()) {
                await contents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride');
                await contents.debugger.sendCommand('Network.setUserAgentOverride', { userAgent: desktopUA });
                contents.debugger.detach();
                setTimeout(() => { if (!contents.isDestroyed()) contents.reload(); }, 100);
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
        if (isGoogleLogin && !isCurrentlyMobile) {
            applyMobileEmulation(contents.session === session.fromPartition('persist:google_login'));
        } else if (!isGoogleLogin && isCurrentlyMobile && !url.includes('google.com')) {
            removeMobileEmulation();
        }
    });
});

function setupDownloadHandler() {
    session.defaultSession.on('will-download', (event, item, webContents) => {
        const downloadId = Date.now().toString();
        const fileName = item.getFilename();
        const filePath = lastSaveAsPath || path.join(app.getPath('downloads'), fileName);
        lastSaveAsPath = null;
        item.setSavePath(filePath);

        const dlItem = { id: downloadId, name: fileName, state: 'progressing', received: 0, total: item.getTotalBytes(), path: filePath };
        downloads.push(dlItem);

        if (sidebarOverlayView) {
            sidebarOverlayView.webContents.send('toggle-downloads-sidebar', true);
            sidebarOverlayView.webContents.send('download-updated', downloads);
        }

        item.on('updated', (event, state) => {
            dlItem.state = state;
            if (state === 'progressing') dlItem.received = item.getReceivedBytes();
            if (sidebarOverlayView) sidebarOverlayView.webContents.send('download-updated', downloads);
        });

        item.once('done', (event, state) => {
            dlItem.state = state;
            if (state === 'completed') dlItem.received = dlItem.total;
            if (sidebarOverlayView) sidebarOverlayView.webContents.send('download-updated', downloads);
        });
    });
}

function createSidebarOverlay() {
    sidebarOverlayView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, webviewTag: true },
    });
    sidebarOverlayView.webContents.loadFile('sidebars.html');
    sidebarOverlayView.setBackgroundColor('#00000000');
    setupContextMenu(sidebarOverlayView.webContents);
}

function createAiSidebar() {
    aiSidebarView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, webviewTag: true },
    });
    aiSidebarView.webContents.loadFile('ai-sidebar.html');
    aiSidebarView.setBackgroundColor('#00000000');
    setupContextMenu(aiSidebarView.webContents);
}

function showSidebarOverlay() {
    if (!sidebarOverlayView || !mainWindow) return;
    if (!mainWindow.getBrowserViews().includes(sidebarOverlayView)) {
        mainWindow.addBrowserView(sidebarOverlayView);
    }
    updateViewBounds();
}

function hideSidebarOverlay() {
  if (sidebarOverlayView && mainWindow && mainWindow.getBrowserViews().includes(sidebarOverlayView)) {
    mainWindow.removeBrowserView(sidebarOverlayView);
  }
}

function showAiSidebar() {
    if (!aiSidebarView) createAiSidebar();
    if (!mainWindow.getBrowserViews().includes(aiSidebarView)) {
        mainWindow.addBrowserView(aiSidebarView);
    }
    mainWindow.setTopBrowserView(aiSidebarView);
    updateViewBounds();
}

function hideAiSidebar() {
    if (!aiSidebarView) return;
    if (mainWindow.getBrowserViews().includes(aiSidebarView)) {
        mainWindow.removeBrowserView(aiSidebarView);
    }
}

function createSuggestionsView() {
    suggestionsView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    suggestionsView.webContents.loadFile('suggestions.html');
}

function closeOverlays() {
    sidebarOpen = false;
    aiSidebarOpen = false;
    hideSidebarOverlay();
    hideAiSidebar();
    hideSuggestions();
    mainWindow.webContents.send('sidebars-closed');
}

function hideSuggestions() {
    if (!suggestionsView || !mainWindow) return;
    if (mainWindow.getBrowserViews().includes(suggestionsView)) {
        mainWindow.removeBrowserView(suggestionsView);
    }
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

function createNewTab(url = null) {
  const view = new BrowserView({
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.65 Safari/537.36');

  const id = Date.now().toString();
  views.push({ id, view });

  view.webContents.loadFile('home.html');
  if (url) view.webContents.loadURL(url);

  setActiveTab(id);

  // HTML fullscreen events — hide/show chrome
  view.webContents.on('enter-html-full-screen', () => setHtmlFullscreen(id, true));
  view.webContents.on('leave-html-full-screen', () => setHtmlFullscreen(id, false));

  // Auto-hide overlays on click in the content
  view.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'mouseDown') closeOverlays();
  });

  view.webContents.on('did-navigate', (event, url) => {
    updateHistory(view, url);
  });

  setupContextMenu(view.webContents);

  view.webContents.on('did-navigate-in-page', (event, url) => {
    updateHistory(view, url);
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
        url: v.view.webContents.getURL()
    }));
    mainWindow.webContents.send('tabs-changed', { tabs: tabData, activeTabId: activeViewId });
    if (sidebarOverlayView) sidebarOverlayView.webContents.send('tabs-changed', { tabs: tabData, activeTabId: activeViewId });
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
    mainWindow.webContents.send('url-updated', { id, url: url.includes('home.html') ? '' : url, title: url.includes('home.html') ? 'Ocal Home' : title });
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

function updateViewBounds() {
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  const isFullscreen = !!htmlFullscreenViewId;

  const hTabs = isFullscreen ? 0 : (userSettings.compactMode ? 34 : 42);
  const hNav  = isFullscreen ? 0 : (userSettings.compactMode ? 38 : 46);
  const hBm   = (isFullscreen || !bookmarkBarVisible) ? 0 : (userSettings.compactMode ? 28 : 36);
  const yOffset = hTabs + hNav + hBm;

  // 1. Stack the active tab
  if (activeViewId) {
    const activeViewEntry = views.find(v => v.id === activeViewId);
    if (activeViewEntry) {
      activeViewEntry.view.setBounds({
        x: 0, y: Math.floor(yOffset),
        width: Math.floor(width),
        height: Math.floor(height - yOffset)
      });
      mainWindow.setTopBrowserView(activeViewEntry.view);
    }
  }

  // 2. Stack AI Sidebar (on top of tab, if enabled)
  if (aiSidebarView && mainWindow.getBrowserViews().includes(aiSidebarView)) {
    aiSidebarView.setBounds({ 
        x: Math.floor(width - aiSidebarWidth), 
        y: Math.floor(yOffset), 
        width: Math.floor(aiSidebarWidth), 
        height: Math.floor(height - yOffset) 
    });
    mainWindow.setTopBrowserView(aiSidebarView);
  }

  // 3. Stack Sidebar Overlay (on top of everything else)
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

function closeOverlays() {
    sidebarOpen = false;
    aiSidebarOpen = false;
    mainWindow.webContents.send('sidebars-closed');
    if (sidebarOverlayView) sidebarOverlayView.webContents.send('close-all-sidebars');
    hideSidebarOverlay();
    hideAiSidebar();
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
  let targetUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      if (url.includes('.') && !url.includes(' ')) targetUrl = 'https://' + url;
      else if (url === 'settings') targetUrl = 'file://' + path.join(__dirname, 'settings.html');
      else targetUrl = (userSettings.searchEngine === 'bing' ? 'https://www.bing.com/search?q=' : 'https://www.google.com/search?q=') + encodeURIComponent(url);
  }
  activeView.webContents.loadURL(targetUrl);
});

ipcMain.on('nav-back', () => { const v = views.find(v => v.id === activeViewId)?.view; if (v?.webContents.canGoBack()) v.webContents.goBack(); });
ipcMain.on('nav-forward', () => { const v = views.find(v => v.id === activeViewId)?.view; if (v?.webContents.canGoForward()) v.webContents.goForward(); });
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
ipcMain.on('switch-sidebar-tab', (e, tab) => {
  sidebarOpen = true;
  showSidebarOverlay();
  if (sidebarOverlayView) {
    sidebarOverlayView.webContents.send('toggle-sidebar', true);
    sidebarOverlayView.webContents.send('switch-tab-sidebar', tab);
  }
});
ipcMain.on('close-all-sidebars', () => closeOverlays());

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

ipcMain.on('update-setting', (e, key, val) => { 
  userSettings[key] = val; 
  saveSettings(userSettings); 

  // Broadcast to all relevant views
  mainWindow.webContents.send('settings-changed', userSettings); 
  if (sidebarOverlayView) sidebarOverlayView.webContents.send('settings-changed', userSettings);
  views.forEach(v => v.view.webContents.send('settings-changed', userSettings));

  if (key === 'compactMode') updateViewBounds(); 
});
ipcMain.handle('get-settings', () => userSettings);
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('check-for-update', async () => {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        // Using the user's specific repo: neelkanth-patel26/Ocal-Browser
        const response = await fetch('https://api.github.com/repos/neelkanth-patel26/Ocal-Browser/releases/latest');
        if (!response.ok) throw new Error('GitHub API error');
        const data = await response.json();
        return {
            version: data.tag_name.replace(/^v/, ''),
            notes: data.body,
            url: data.html_url
        };
    } catch (e) {
        console.error('Update check failed:', e);
        return null;
    }
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

function createSuggestionsView() {
    suggestionsView = new BrowserView({
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    suggestionsView.webContents.loadFile('suggestions.html');
    setupContextMenu(suggestionsView.webContents);
}

function hideSuggestions() {
    if (!suggestionsView || !mainWindow) return;
    if (mainWindow.getBrowserViews().includes(suggestionsView)) {
        mainWindow.removeBrowserView(suggestionsView);
    }
}

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

ipcMain.on('reorder-tabs', (e, { fromIndex, toIndex }) => {
    if (fromIndex < 0 || fromIndex >= views.length || toIndex < 0 || toIndex >= views.length) return;
    const tabEntry = views.splice(fromIndex, 1)[0];
    views.splice(toIndex, 0, tabEntry);
    broadcastTabs();
});

function setupContextMenu(contents) {
    contents.on('context-menu', (e, props) => {
        const menu = new Menu();

        if (props.linkURL) {
            menu.append(new MenuItem({ label: 'Open Link in New Tab', click: () => createNewTab(props.linkURL) }));
            menu.append(new MenuItem({ label: 'Copy Link Address', click: () => clipboard.writeText(props.linkURL) }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        if (props.selectionText) {
            menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: `Search Google for "${props.selectionText.substring(0, 20)}..."`, click: () => createNewTab(`https://www.google.com/search?q=${encodeURIComponent(props.selectionText)}`) }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        if (props.isEditable) {
            menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        menu.append(new MenuItem({ label: 'Back', enabled: contents.canGoBack(), click: () => contents.goBack() }));
        menu.append(new MenuItem({ label: 'Forward', enabled: contents.canGoForward(), click: () => contents.goForward() }));
        menu.append(new MenuItem({ label: 'Reload', click: () => contents.reload() }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ label: 'Inspect Element', click: () => contents.inspectElement(props.x, props.y) }));

        menu.popup(BrowserWindow.fromWebContents(contents));
    });
}
