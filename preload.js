const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  newTab: () => ipcRenderer.send('new-tab'),
  switchTab: (id) => ipcRenderer.send('switch-tab', id),
  closeTab: (id) => ipcRenderer.send('close-tab', id),
  navigateTo: (url) => ipcRenderer.send('navigate-to', url),
  goBack: () => ipcRenderer.send('nav-back'),
  goForward: () => ipcRenderer.send('nav-forward'),
  reload: () => ipcRenderer.send('nav-reload'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleSidebar: (isOpen) => ipcRenderer.send('toggle-sidebar', isOpen),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key, value) => ipcRenderer.send('update-setting', key, value),
  toggleBookmark: (bookmark) => ipcRenderer.send('toggle-bookmark', bookmark),
  
    onTabCreated: (callback) => ipcRenderer.on('tab-created', (e, tab) => callback(tab)),
    onTabClosed: (callback) => ipcRenderer.on('tab-closed', (e, id) => callback(id)),
    onUpdateURL: (callback) => ipcRenderer.on('url-updated', (e, data) => callback(data)),
  onUpdateTitle: (callback) => ipcRenderer.on('title-updated', (e, data) => callback(data))
});
