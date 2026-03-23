const { app, BrowserWindow, BrowserView, ipcMain, shell, session } = require('electron');
const path = require('path');

let mainWindow;
let views = []; // Array of { id, view }
let activeViewId = null;
let sidebarOpen = false;

// Settings Management
let userSettings = {
  searchEngine: 'google',
  dns: 'default',
  accentColor: '#a855f7',
  compactMode: false,
  trackingProtection: true,
  bookmarks: [] // { title, url, id }
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1350,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Ocal',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMaxListeners(25); // Prevent EventEmitter leak warning for many tabs/reloads

  mainWindow.on('resize', updateViewBounds);
  
  mainWindow.webContents.on('did-finish-load', () => {
    if (views.length === 0) {
      createNewTab();
    }
  });
}

function createNewTab(url = null) {
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const id = Date.now().toString();
  views.push({ id, view });

  view.webContents.loadFile('home.html');
  if (url) view.webContents.loadURL(url);

  setActiveTab(id);

  // Sync address bar and title
  view.webContents.on('did-navigate', (event, url) => {
    if (url.includes('home.html')) {
      mainWindow.webContents.send('url-updated', { id, url: '', title: 'Speed Dial' });
    } else {
      const title = view.webContents.getTitle();
      mainWindow.webContents.send('url-updated', { id, url, title });
    }
  });

  view.webContents.on('page-title-updated', (event, title) => {
      mainWindow.webContents.send('title-updated', { id, title });
  });

  // Handle new window / link clicks
  view.webContents.setWindowOpenHandler(({ url }) => {
    createNewTab(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.send('tab-created', { id, title: 'Speed Dial' });
}

function setActiveTab(id) {
  const oldViewEntry = views.find(v => v.id === activeViewId);
  if (oldViewEntry) {
    mainWindow.removeBrowserView(oldViewEntry.view);
  }

  activeViewId = id;
  const newViewEntry = views.find(v => v.id === id);
  if (newViewEntry) {
    mainWindow.addBrowserView(newViewEntry.view);
    updateViewBounds();

    // Sync address bar on switch
    const url = newViewEntry.view.webContents.getURL();
    const title = newViewEntry.view.webContents.getTitle();
    mainWindow.webContents.send('url-updated', { 
        id, 
        url: url.includes('home.html') ? '' : url, 
        title 
    });
  }
}

function updateViewBounds() {
  if (!mainWindow || !activeViewId) return;
  const activeViewEntry = views.find(v => v.id === activeViewId);
  if (!activeViewEntry) return;

  const { width, height } = mainWindow.getContentBounds();
  
  const hasBookmarks = userSettings.bookmarks && userSettings.bookmarks.length > 0;
  const isCompact = userSettings.compactMode;
  const x = 0;

  // Row heights: Tab bar / Navigation / Bookmark bar
  const hTabs = isCompact ? 28 : 38;
  const hNav = isCompact ? 34 : 42;
  const hBookmarks = (hasBookmarks) ? (isCompact ? 26 : 32) : 0;
  
  const y = hTabs + hNav + hBookmarks;
  const viewWidth = sidebarOpen ? width - 300 : width; // Shrink if sidebar is open
  const viewHeight = height - y;
  
  activeViewEntry.view.setBounds({
    x: Math.floor(x),
    y: Math.floor(y),
    width: Math.floor(viewWidth),
    height: Math.floor(viewHeight)
  });
}

// IPC Handlers
ipcMain.on('new-tab', () => createNewTab());
ipcMain.on('switch-tab', (e, id) => setActiveTab(id));
ipcMain.on('close-tab', async (e, id) => {
  // If last tab, show confirmation
  if (views.length === 1) {
    const { dialog } = require('electron');
    const result = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      defaultId: 1,
      title: 'Confirm Exit',
      message: 'This is your last tab. Do you want to close Ocal?',
      cancelId: 1
    });

    if (result === 0) {
      app.quit();
    } else {
      // Return to home instead of closing
      const viewEntry = views.find(v => v.id === id);
      if (viewEntry) viewEntry.view.webContents.loadFile('home.html');
      // Tell renderer to keep the tab but reset its state
      mainWindow.webContents.send('url-updated', { id, url: '', title: 'Speed Dial' });
    }
    return;
  }

  const index = views.findIndex(v => v.id === id);
  if (index !== -1) {
    const [removed] = views.splice(index, 1);
    mainWindow.removeBrowserView(removed.view);
    removed.view.webContents.destroy();
    
    if (activeViewId === id) {
      activeViewId = views.length > 0 ? views[Math.max(0, index - 1)].id : null;
      if (activeViewId) setActiveTab(activeViewId);
      else updateViewBounds();
    }
    // Tell renderer the tab is officially gone
    mainWindow.webContents.send('tab-closed', id);
  }
});

ipcMain.on('navigate-to', (event, url) => {
  const activeView = views.find(v => v.id === activeViewId)?.view;
  if (!activeView) return;

  let targetUrl = url;
  // Allow file:// protocols or internal references
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
    if (url.includes('.') && !url.includes(' ')) {
      targetUrl = 'https://' + url;
    } else if (url === 'settings') {
      targetUrl = 'file://' + path.join(__dirname, 'settings.html');
    } else {
      const engine = userSettings.searchEngine || 'google';
      const searchUrls = {
        google: 'https://www.google.com/search?q=',
        bing: 'https://www.bing.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q='
      };
      targetUrl = (searchUrls[engine] || searchUrls.google) + encodeURIComponent(url);
    }
  }
  activeView.webContents.loadURL(targetUrl);
});

ipcMain.on('nav-back', () => {
    const view = views.find(v => v.id === activeViewId)?.view;
    if (view && view.webContents.canGoBack()) view.webContents.goBack();
});

ipcMain.on('nav-forward', () => {
    const view = views.find(v => v.id === activeViewId)?.view;
    if (view && view.webContents.canGoForward()) view.webContents.goForward();
});

ipcMain.on('nav-reload', () => {
    const view = views.find(v => v.id === activeViewId)?.view;
    if (view) view.webContents.reload();
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

ipcMain.on('toggle-sidebar', (event, isOpen) => {
    sidebarOpen = isOpen;
    console.log(`Sidebar toggled: ${isOpen ? 'OPEN' : 'CLOSED'}`);
    updateViewBounds();
});

// Settings Side Effects (DNS, Privacy)
function applySettings(settings) {
    const ses = session.defaultSession;
    
    // 1. DNS Over HTTPS (Note: Changing DoH at runtime requires deeper integration)
    // We update the setting but skip the invalid API call to prevent crashes

    // 2. Tracking Protection
    if (settings.trackingProtection) {
      const filter = { urls: ['*://*.doubleclick.net/*', '*://*.google-analytics.com/*', '*://*.facebook.com/tr/*'] };
      ses.webRequest.onBeforeRequest(filter, (details, callback) => callback({ cancel: true }));
    } else {
      ses.webRequest.onBeforeRequest(null);
    }
}

ipcMain.handle('get-settings', () => userSettings);

ipcMain.on('update-setting', (event, key, value) => {
    userSettings[key] = value;
    applySettings(userSettings);
    // Broadcast
    mainWindow.webContents.send('settings-changed', userSettings);
    views.forEach(v => v.view.webContents.send('settings-changed', userSettings));
});

ipcMain.on('switch-profile', (event, profileId) => {
    // For now, we simulate profile switching by updating the ID and name
    const profile = userSettings.profiles.find(p => p.id === profileId);
    if (profile) {
        userSettings.currentProfileId = profileId;
        // In a real app we'd swap out the whole settings object
        mainWindow.webContents.send('settings-changed', userSettings);
        console.log(`Switched to profile: ${profile.name}`);
    }
});

ipcMain.on('clear-browsing-data', async () => {
    await session.defaultSession.clearStorageData();
});

ipcMain.on('toggle-bookmark', (event, bookmark) => {
    const index = userSettings.bookmarks.findIndex(b => b.url === bookmark.url);
    if (index === -1) {
        userSettings.bookmarks.push(bookmark);
    } else {
        userSettings.bookmarks.splice(index, 1);
    }
    // Broadcast update
    mainWindow.webContents.send('bookmarks-updated', userSettings.bookmarks);
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
