const { ipcRenderer } = require('electron');

const vbRange = document.getElementById('vb-range');
const vbValue = document.getElementById('vb-value');
const vbLevelText = document.getElementById('vb-level-text');
const vbResetBtn = document.getElementById('vb-reset-btn');
const vbCloseBtn = document.getElementById('vb-close-btn');
const popupOverlay = document.getElementById('popup-overlay');
const presetButtons = document.querySelectorAll('.vb-preset');

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(21, 172, 73, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16) || 21;
    const g = parseInt(hex.slice(3, 5), 16) || 172;
    const b = parseInt(hex.slice(5, 7), 16) || 73;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAccent(color) {
    if (!color) return;
    document.body.style.setProperty('--accent', color);
    document.body.style.setProperty('--accent-glow', hexToRgba(color, 0.3));
    document.body.style.setProperty('--accent-dim', hexToRgba(color, 0.12));
}

// Global settings sync
ipcRenderer.on('settings-changed', (e, s) => {
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
    if (s && s.accentColor) applyAccent(s.accentColor);
    if (vbRange) updateSliderProgress(parseInt(vbRange.value, 10));
});

ipcRenderer.invoke('get-settings').then(settings => {
    if (settings && settings.themeMode) document.body.setAttribute('data-theme', settings.themeMode);
    if (settings && settings.accentColor) applyAccent(settings.accentColor);
    syncCurrentBoost();
}).catch(() => {
    syncCurrentBoost();
});

function getLevelLabel(val) {
    if (val <= 100) return 'STANDARD';
    if (val <= 150) return 'BOOSTED';
    if (val <= 250) return 'HIGH';
    if (val <= 400) return 'MAXIMUM';
    return 'EXTREME';
}

function updateSliderProgress(val) {
    if (!vbRange) return;
    const min = parseFloat(vbRange.min) || 100;
    const max = parseFloat(vbRange.max) || 500;
    const pct = ((val - min) / (max - min)) * 100;
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const trackBg = isDark ? 'rgba(140, 150, 165, 0.25)' : '#E2E8F0';
    vbRange.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, ${trackBg} ${pct}%, ${trackBg} 100%)`;
}

function setVolumeUI(val, notify = true) {
    val = Math.max(100, Math.min(500, Math.round(val)));
    if (vbRange) vbRange.value = val;
    if (vbValue) vbValue.textContent = `${val}%`;
    if (vbLevelText) vbLevelText.textContent = getLevelLabel(val);

    presetButtons.forEach(btn => {
        const pVal = parseInt(btn.dataset.preset, 10);
        btn.classList.toggle('active', pVal === val);
    });

    updateSliderProgress(val);

    if (notify) {
        const gain = val / 100;
        ipcRenderer.send('set-volume-boost', { gain });
    }
}

function syncCurrentBoost() {
    ipcRenderer.invoke('get-volume-boost').then(gain => {
        const val = Math.round((gain || 1.0) * 100);
        setVolumeUI(val, false);
    }).catch(() => {
        setVolumeUI(100, false);
    });
}

if (vbRange) {
    vbRange.addEventListener('input', (e) => {
        setVolumeUI(parseInt(e.target.value, 10), true);
    });
}

presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const pVal = parseInt(btn.dataset.preset, 10);
        setVolumeUI(pVal, true);
    });
});

if (vbResetBtn) {
    vbResetBtn.addEventListener('click', () => {
        setVolumeUI(100, false);
        ipcRenderer.send('reset-volume-boost');
    });
}

function closePopup() {
    ipcRenderer.send('hide-volume-boost-popup');
}

if (vbCloseBtn) vbCloseBtn.addEventListener('click', closePopup);
if (popupOverlay) popupOverlay.addEventListener('click', closePopup);

ipcRenderer.on('show-popup', () => {
    syncCurrentBoost();
});
