const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let installerWindow;

function createInstallerWindow() {
    installerWindow = new BrowserWindow({
        width: 800,
        height: 520,
        frame: false,
        transparent: true,
        resizable: false,
        backgroundColor: '#00000000',
        backgroundMaterial: 'mica',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    installerWindow.loadFile(path.join(__dirname, 'installer', 'index.html'));

    installerWindow.webContents.on('did-finish-load', () => {
        // Detect Update State
        const installDir = path.join(process.env.LOCALAPPDATA, 'Ocal');
        const isUpdate = fs.existsSync(path.join(installDir, 'ocal.exe'));
        installerWindow.webContents.send('installer-state', { isUpdate });
    });

    installerWindow.on('closed', () => {
        app.quit();
    });
}

// IPC Handlers for the Installer UI
ipcMain.handle('select-install-path', async () => {
    const result = await dialog.showOpenDialog(installerWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Installation Folder'
    });
    return result.filePaths[0];
});

ipcMain.handle('select-bookmark-file', async () => {
    const result = await dialog.showOpenDialog(installerWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Bookmark HTML', extensions: ['html', 'htm'] }],
        title: 'Select Bookmarks File'
    });
    return result.filePaths[0];
});

ipcMain.on('start-installation', async (event, config) => {
    const { path: installPath, importData, setDefault, createShortcut } = config;
    
    try {
        // 1. Extraction Simulation
        event.sender.send('install-progress', { status: 'Extracting core components...', progress: 20 });
        await new Promise(r => setTimeout(r, 1500));

        // 2. Real Logic for Importing Data if requested
        if (importData || config.bookmarkFilePath) {
            event.sender.send('install-progress', { status: 'Syncing bookmarks...', progress: 40 });
            const targetDir = path.join(app.getPath('userData'), 'imported');
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            if (config.bookmarkFilePath && fs.existsSync(config.bookmarkFilePath)) {
                // Manual HTML Import
                fs.copyFileSync(config.bookmarkFilePath, path.join(targetDir, 'bookmarks.html'));
            } else {
                // Auto Chrome Import
                const chromePath = path.join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data/Default/Bookmarks');
                if (fs.existsSync(chromePath)) {
                    fs.copyFileSync(chromePath, path.join(targetDir, 'bookmarks'));
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        // 3. System Integration
        event.sender.send('install-progress', { status: 'Creating system shortcuts...', progress: 70 });
        if (createShortcut) {
            // Simplified shortcut logic
            const desktopPath = path.join(process.env.USERPROFILE, 'Desktop');
            // Normally use a library like windows-shortcuts or Electron's squirrel logic
        }

        event.sender.send('install-progress', { status: 'Finalizing installation...', progress: 90 });
        await new Promise(r => setTimeout(r, 800));

        event.sender.send('install-complete');

    } catch (err) {
        event.sender.send('install-error', err.message);
    }
});

ipcMain.on('window-close', () => {
    if (installerWindow) installerWindow.close();
});

ipcMain.on('window-minimize', () => {
    if (installerWindow) installerWindow.minimize();
});

ipcMain.on('launch-app', () => {
    // Relaunch the app without the --install flag
    const args = process.argv.slice(1).filter(arg => arg !== '--install' && arg !== '--squirrel-install');
    app.relaunch({ args });
    app.exit(0);
});

app.whenReady().then(createInstallerWindow);
