const { ipcRenderer } = require('electron');

const adBlockToggle = document.getElementById('adblock-toggle');
const privacyToggle = document.getElementById('privacy-toggle');
const dislikeToggle = document.getElementById('dislike-toggle');
const adsBlockedCount = document.getElementById('ads-blocked');
const trackersCount = document.getElementById('trackers-blocked');
const compatBanner = document.getElementById('compat-banner');

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(168, 85, 247, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.4));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.1));
}

// Global Settings Sync
ipcRenderer.on('settings-changed', (e, s) => {
    if (s && s.accentColor) applyAccent(s.accentColor);
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
});

// Load Initial State
ipcRenderer.invoke('get-settings').then(settings => {
    applyAccent(settings.accentColor);
    if (settings.themeMode) document.body.setAttribute('data-theme', settings.themeMode);

    adBlockToggle.checked = settings.adBlockEnabled !== false;
    privacyToggle.checked = settings.trackingProtection !== false;
    if (dislikeToggle) dislikeToggle.checked = settings.youtubeDislikeEnabled !== false;
    
    // Stats
    ipcRenderer.invoke('get-shield-stats', window._currentTabId).then(stats => {
        updateUI(stats, settings.isYouTube);
    });
});

function animateValue(obj, start, end) {
    if (start === end) return;
    const duration = 800;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 5); // Ease out quint
        const current = Math.floor(start + (end - start) * ease);
        obj.innerText = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function updateUI(stats, isYouTube = false) {
    if (!stats) return;
    const global = stats.global || stats;
    
    // Update Global Stats (Bottom Section)
    if (adsBlockedCount) {
        const currentAds = parseInt(adsBlockedCount.innerText.replace(/,/g, '') || 0);
        animateValue(adsBlockedCount, currentAds, global.ads || 0);
    }
    if (trackersCount) {
        const currentTrackers = parseInt(trackersCount.innerText.replace(/,/g, '') || 0);
        animateValue(trackersCount, currentTrackers, global.trackers || 0);
    }
    
    // Update Page-Specific Stats (Top Section)
    if (stats.page) {
        const pageAdsEl = document.getElementById('page-ads');
        const pageTimeEl = document.getElementById('page-time');
        
        if (pageAdsEl) pageAdsEl.innerText = stats.page.ads || 0;
        if (pageTimeEl) {
            const totalPageBlocks = (stats.page.ads || 0) + (stats.page.trackers || 0);
            const pageSeconds = totalPageBlocks * 0.05;
            pageTimeEl.innerText = pageSeconds < 1 ? pageSeconds.toFixed(1) + 's' : Math.round(pageSeconds) + 's';
        }
    }
}

adBlockToggle.onchange = () => {
    ipcRenderer.send('update-setting', 'adBlockEnabled', adBlockToggle.checked);
};

privacyToggle.onchange = () => {
    ipcRenderer.send('update-setting', 'trackingProtection', privacyToggle.checked);
};

if (dislikeToggle) {
    dislikeToggle.onchange = () => {
        ipcRenderer.send('update-setting', 'youtubeDislikeEnabled', dislikeToggle.checked);
    };
}

// Listen for stat updates in real-time
ipcRenderer.on('shield-stats-updated', (event, stats) => {
    // 1. ALWAYS update Global stats
    if (stats.global) {
        updateUI({ global: stats.global });
    }
    
    // 2. Only update PAGE stats if it matches our active tab ID
    // The main process sends webContentsId. If we don't have it, we can fallback to the tabId.
    if (stats.page) {
        // If the popup is open for a specific tab, and that tab just got a block, update it.
        // We compare the incoming webContentsId if available, but since this is a 
        // global broadcast to all windows, the popup will just refresh its current view.
        ipcRenderer.invoke('get-shield-stats', window._currentTabId).then(freshStats => {
            updateUI(freshStats);
        });
    }
});



const shieldCard = document.getElementById('shield-card');
const popupOverlay = document.getElementById('popup-overlay');

ipcRenderer.on('show-popup', (event, { x, y, tabId, isYouTube }) => {
    window._currentTabId = tabId;
    shieldCard.style.left = `${x}px`;
    shieldCard.style.top = `${y}px`;
    shieldCard.classList.add('show');
    
    // Refresh stats immediately for the specific tab
    ipcRenderer.invoke('get-shield-stats', tabId).then(stats => updateUI(stats, isYouTube));
});

popupOverlay.onclick = () => {
    shieldCard.classList.remove('show');
    ipcRenderer.send('hide-popups'); 
};
