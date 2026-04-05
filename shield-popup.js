const { ipcRenderer } = require('electron');

const adBlockToggle = document.getElementById('adblock-toggle');
const privacyToggle = document.getElementById('privacy-toggle');
const vpnToggle = document.getElementById('vpn-toggle');
const dislikeToggle = document.getElementById('dislike-toggle');
const selectTrigger = document.getElementById('select-trigger');
const selectOptions = document.getElementById('select-options');
const selectedText = document.getElementById('selected-region-text');
const options = document.querySelectorAll('.option');
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
});

// Load Initial State
ipcRenderer.invoke('get-settings').then(settings => {
    applyAccent(settings.accentColor);
    adBlockToggle.checked = settings.adBlockEnabled !== false;
    privacyToggle.checked = settings.trackingProtection !== false;
    vpnToggle.checked = settings.vpnEnabled === true;
    if (dislikeToggle) dislikeToggle.checked = settings.youtubeDislikeEnabled !== false;
    
    // Update selection text and active state
    const currentRegion = settings.vpnRegion || 'auto';
    updateSelectionUI(currentRegion);
    
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

vpnToggle.onchange = () => {
    ipcRenderer.send('update-setting', 'vpnEnabled', vpnToggle.checked);
    ipcRenderer.send('apply-proxy', { 
        enabled: vpnToggle.checked, 
        region: getSelectedValue()
    });
};

selectTrigger.onclick = () => {
    selectOptions.classList.toggle('open');
};

options.forEach(opt => {
    opt.onclick = () => {
        const val = opt.getAttribute('data-value');
        updateSelectionUI(val);
        selectOptions.classList.remove('open');
        
        if (vpnToggle.checked) {
            ipcRenderer.send('apply-proxy', { 
                enabled: true, 
                region: val 
            });
        }
        ipcRenderer.send('update-setting', 'vpnRegion', val);
    };
});

function updateSelectionUI(val) {
    options.forEach(opt => {
        const match = opt.getAttribute('data-value') === val;
        opt.classList.toggle('active', match);
        if (match) selectedText.innerText = opt.innerText;
    });
}

function getSelectedValue() {
    const active = document.querySelector('.option.active');
    return active ? active.getAttribute('data-value') : 'auto';
}

// Close dropdown if clicking outside (inside the popup window)
window.addEventListener('click', (e) => {
    if (!selectTrigger.contains(e.target) && !selectOptions.contains(e.target)) {
        selectOptions.classList.remove('open');
    }
});

// Listen for stat updates in real-time
ipcRenderer.on('shield-stats-updated', (event, stats) => {
    // 1. ALWAYS update Global stats (it shows in every tab's popup)
    if (stats.global) {
        updateUI({ global: stats.global });
    }
    
    // 2. Only update PAGE stats if it matches our active tab ID
    // We need to resolve the tabId to the webContentsId on the main side, 
    // but main already did that and passed it as 'webContentsId'.
    // However, shield-popup.js stores window._currentTabId (the string timestamp ID).
    // We'll trust the main process to only send 'page' stats when relevant or 
    // we could keep it simple and just update global. 
    // Wait, the main process broadcasts THIS page's updates.
    
    ipcRenderer.invoke('get-shield-stats', window._currentTabId).then(freshStats => {
        updateUI(freshStats);
    });
});

// VPN Status Handling
const vpnStatusDot = document.getElementById('vpn-status-dot');
const vpnStatusText = document.getElementById('vpn-status-text');

ipcRenderer.on('vpn-status-updated', (event, { status, details }) => {
    if (!vpnStatusDot || !vpnStatusText) return;
    
    vpnStatusDot.classList.remove('active', 'connecting');
    vpnStatusText.style.color = 'inherit';

    if (status === 'Connected') {
        vpnStatusDot.classList.add('active');
        vpnStatusText.innerText = `Connected (${details || 'OK'})`;
        vpnStatusText.style.color = 'var(--success)';
    } else if (status === 'Connecting' || status === 'Retrying' || status === 'Healing' || status === 'Rescue Switch') {
        vpnStatusDot.classList.add('connecting');
        if (status === 'Rescue Switch') {
            vpnStatusText.innerText = `Rescue: Switching to ${details}`;
        } else if (status === 'Healing') {
            vpnStatusText.innerText = 'Optimizing Node...';
        } else {
            vpnStatusText.innerText = status === 'Retrying' ? 'Retrying Node...' : 'Connecting...';
        }
    } else if (status === 'Error') {
        vpnStatusText.innerText = 'Service Error';
        vpnStatusText.style.color = 'var(--danger)';
    } else {
        vpnStatusText.innerText = 'OFF';
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
