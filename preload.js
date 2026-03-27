const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation
  newTab:       ()        => ipcRenderer.send('new-tab'),
  switchTab:    (id)      => ipcRenderer.send('switch-tab', id),
  closeTab:     (id)      => ipcRenderer.send('close-tab', id),
  navigateTo:   (url)     => ipcRenderer.send('navigate-to', url),
  goBack:       ()        => ipcRenderer.send('nav-back'),
  goForward:    ()        => ipcRenderer.send('nav-forward'),
  reload:       ()        => ipcRenderer.send('nav-reload'),

  // Window
  minimize:     ()        => ipcRenderer.send('window-minimize'),
  maximize:     ()        => ipcRenderer.send('window-maximize'),
  close:        ()        => ipcRenderer.send('window-close'),

  // Updates
  getAppVersion:  () => ipcRenderer.invoke('get-app-version'),
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),

  // Settings
  getSettings:    ()          => ipcRenderer.invoke('get-settings'),
  updateSetting:  (key, val)  => ipcRenderer.send('update-setting', key, val),

  // Bookmarks
  toggleBookmark: (bm)    => ipcRenderer.send('toggle-bookmark', bm),

  // Generic send/receive
  send: (channel, data)   => ipcRenderer.send(channel, data),
  on:   (channel, cb)     => ipcRenderer.on(channel, (e, d) => cb(e, d)),

  // ── Listeners ──────────────────────────────────────────────────────────
  onTabsChanged:       (cb) => ipcRenderer.on('tabs-changed',          (e, d)    => cb(d)),
  onUpdateURL:         (cb) => ipcRenderer.on('url-updated',           (e, d)    => cb(d)),
  onUpdateTitle:       (cb) => ipcRenderer.on('title-updated',         (e, d)    => cb(d)),
  onSettingsChanged:   (cb) => ipcRenderer.on('settings-changed',      (e, s)    => cb(s)),

  // Both renderer and sidebars use bookmarks-changed; renderer gets full object
  onBookmarksUpdated:  (cb) => ipcRenderer.on('bookmarks-changed',     (e, d)    => cb(d)),
  onBookmarksChanged:  (cb) => ipcRenderer.on('bookmarks-changed',     (e, d)    => cb(d)),
  onSuggestionsUpdated: (cb) => ipcRenderer.on('update-suggestions',   (e, d)    => cb(e, d)),

  onDownloadUpdated:   (cb) => ipcRenderer.on('download-updated',      (e, dl)   => cb(dl)),
  onToggleSidebar:     (cb) => ipcRenderer.on('toggle-sidebar',  (e, open) => cb(e, open)),
  onSwitchTab:         (cb) => ipcRenderer.on('switch-tab-sidebar',    (e, tab)  => cb(tab)),
  onMaximized:         (cb) => ipcRenderer.on('window-is-maximized',   (e, s)    => cb(s)),
  onCloseAllSidebars:  (cb) => ipcRenderer.on('close-all-sidebars',    ()        => cb()),
  onHtmlFullscreen:    (cb) => ipcRenderer.on('html-fullscreen',       (e, v)    => cb(v)),
  onShowModal:         (cb) => ipcRenderer.on('show-modal',            (e, d)    => cb(d)),
});
