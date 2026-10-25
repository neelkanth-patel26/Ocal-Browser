const { ipcRenderer } = require('electron');

const vbRange = document.getElementById('vb-range');
const vbValue = document.getElementById('vb-value');
const vbStatusSub = document.getElementById('vb-status-sub');
const vbLevelText = document.getElementById('vb-level-text');
const vbResetBtn = document.getElementById('vb-reset-btn');
const boostMasterToggle = document.getElementById('boost-master-toggle');
const limiterToggle = document.getElementById('limiter-toggle');
const presetButtons = document.querySelectorAll('.vb-preset');

let previousBoostValue = 150;

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(21, 172, 73, ${alpha})`;
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.slice(0, 2), 16) || 21;
    const g = parseInt(cleanHex.slice(2, 4), 16) || 172;
    const b = parseInt(cleanHex.slice(4, 6), 16) || 73;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getModeAccent(color, isLight) {
    if (!color) return isLight ? '#058f60' : '#09f0a0';
    if (!isLight) return color;
    const hex = color.toLowerCase();
    if (hex === '#09f0a0' || hex === '#00ffaa' || hex.includes('f0a0')) return '#058f60';
    if (hex === '#ff007f' || hex === '#ff00aa' || hex.includes('ff007') || hex.includes('ff00a')) return '#d81b60';
    if (hex === '#00e5ff' || hex === '#00ffff' || hex.includes('00e5') || hex.includes('00f0')) return '#0288d1';
    if (hex === '#ff9100' || hex === '#ffaa00' || hex.includes('ff91') || hex.includes('ffaa')) return '#d97706';
    if (hex === '#8b5cf6' || hex === '#a855f7' || hex === '#9333ea' || hex.includes('8b5c') || hex.includes('a855')) return '#6d28d9';
    if (hex === '#ff4d4d' || hex === '#ff3333' || hex.includes('ff4d') || hex.includes('ff33')) return '#dc2626';
    if (hex === '#ffffff' || hex === '#f4f4f5' || hex === '#e8e8e8' || hex.includes('fff')) return '#0f172a';
    return color;
}

function applyAccent(color) {
    if (!color) return;
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const activeAccent = getModeAccent(color, isLight);
    document.body.style.setProperty('--accent', activeAccent);
    document.body.style.setProperty('--accent-glow', hexToRgba(activeAccent, 0.35));
    document.body.style.setProperty('--accent-dim', hexToRgba(activeAccent, 0.12));
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

function updateSliderProgress(val) {
    if (!vbRange) return;
    const min = parseFloat(vbRange.min) || 100;
    const max = parseFloat(vbRange.max) || 500;
    const pct = ((val - min) / (max - min)) * 100;
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const trackBg = isDark ? 'rgba(140, 150, 165, 0.22)' : '#E2E8F0';
    vbRange.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, ${trackBg} ${pct}%, ${trackBg} 100%)`;
}

function setVolumeUI(val, notify = true) {
    val = Math.max(100, Math.min(500, Math.round(val)));
    
    if (vbRange) vbRange.value = val;
    if (vbValue) vbValue.textContent = `${val}%`;

    if (vbStatusSub) {
        if (val === 100) {
            vbStatusSub.textContent = 'Standard Output';
        } else if (val <= 200) {
            vbStatusSub.textContent = `Amplified ${(val / 100).toFixed(1)}x`;
        } else if (val <= 400) {
            vbStatusSub.textContent = `High Boost ${(val / 100).toFixed(1)}x`;
        } else {
            vbStatusSub.textContent = 'Maximum Power';
        }
    }

    if (vbLevelText) {
        if (val === 100) {
            vbLevelText.textContent = 'STANDARD';
            vbLevelText.style.background = 'var(--accent-dim)';
            vbLevelText.style.color = 'var(--accent)';
        } else if (val <= 200) {
            vbLevelText.textContent = 'BOOSTED';
            vbLevelText.style.background = 'var(--accent)';
            vbLevelText.style.color = 'var(--accent-text)';
        } else if (val <= 400) {
            vbLevelText.textContent = 'HIGH';
            vbLevelText.style.background = 'var(--accent)';
            vbLevelText.style.color = 'var(--accent-text)';
        } else {
            vbLevelText.textContent = 'MAXIMUM';
            vbLevelText.style.background = 'var(--accent)';
            vbLevelText.style.color = 'var(--accent-text)';
        }
    }

    if (boostMasterToggle) {
        boostMasterToggle.checked = val > 100;
    }

    if (val > 100) {
        previousBoostValue = val;
    }

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

if (boostMasterToggle) {
    boostMasterToggle.addEventListener('change', () => {
        if (boostMasterToggle.checked) {
            setVolumeUI(previousBoostValue > 100 ? previousBoostValue : 150, true);
        } else {
            setVolumeUI(100, false);
            ipcRenderer.send('reset-volume-boost');
        }
    });
}

// Restore saved state of anti-clipping limiter
try {
    const savedLimiter = localStorage.getItem('ocal-vb-limiter');
    if (limiterToggle && savedLimiter !== null) {
        limiterToggle.checked = savedLimiter === 'true';
    }
} catch (e) {}

if (limiterToggle) {
    limiterToggle.addEventListener('change', () => {
        try {
            localStorage.setItem('ocal-vb-limiter', limiterToggle.checked ? 'true' : 'false');
        } catch (e) {}
    });
}

ipcRenderer.on('show-popup', () => {
    syncCurrentBoost();
});
