// This runs in the Site Info popup module
let currentOrigin = '';

window.electronAPI.onUpdateSiteInfo((data) => {
    const mainTitle = document.querySelector('#main-screen .sip-title');
    const secDomain = document.querySelector('#security-screen .sip-domain');
    
    try {
        const url = new URL(data.url);
        currentOrigin = url.origin;
        if (mainTitle) mainTitle.textContent = url.hostname;
        if (secDomain) secDomain.textContent = url.hostname;
    } catch (e) {
        if (mainTitle) mainTitle.textContent = data.url;
        if (secDomain) secDomain.textContent = data.url;
    }

    // Restore toggle states from passed data (fetched from session in main process)
    if (data.permissions) {
        updateToggle('toggle-notifications', data.permissions.notifications);
        updateToggle('toggle-popups', data.permissions.popups);
        updateToggle('toggle-sound', data.permissions.audio);
    }
});

function updateToggle(id, state) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('on', state === 'allow' || state === true);
}

// Navigation
const mainScreen = document.getElementById('main-screen');
const securityScreen = document.getElementById('security-screen');
const cookiesScreen = document.getElementById('cookies-screen');

document.getElementById('go-to-security').onclick = () => {
    mainScreen.classList.remove('active');
    securityScreen.classList.add('active');
};

document.getElementById('back-sec-to-main').onclick = () => {
    securityScreen.classList.remove('active');
    mainScreen.classList.add('active');
};

document.getElementById('cookies-btn').onclick = () => {
    mainScreen.classList.remove('active');
    cookiesScreen.classList.add('active');
    refreshCookiesList();
};

document.getElementById('back-cook-to-main').onclick = () => {
    cookiesScreen.classList.remove('active');
    mainScreen.classList.add('active');
};

document.getElementById('cookies-done-btn').onclick = () => {
    cookiesScreen.classList.remove('active');
    mainScreen.classList.add('active');
};

// Site Data Management
async function refreshCookiesList() {
    const list = document.getElementById('cookies-list');
    list.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>`;
    
    window.electronAPI.send('get-site-data', currentOrigin);
}

window.electronAPI.on('update-site-data', (domains) => {
    const list = document.getElementById('cookies-list');
    const domainDisplay = document.querySelector('#cookies-screen .sip-domain');
    try { domainDisplay.textContent = new URL(currentOrigin).hostname; } catch(e) {}

    if (!domains || domains.length === 0) {
        list.innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--text-muted); font-size:12px;">No data stored on your device.</div>`;
        return;
    }

    list.innerHTML = '';
    domains.forEach(domain => {
        const item = document.createElement('div');
        item.className = 'cookie-item';
        item.innerHTML = `
            <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" class="cookie-favicon">
            <div class="cookie-domain">${domain}</div>
            <div class="cookie-action" data-domain="${domain}"><i class="fas fa-trash-can"></i></div>
        `;
        
        item.querySelector('.cookie-action').onclick = () => {
            window.electronAPI.send('delete-site-data', { origin: currentOrigin, domain });
            item.style.opacity = '0.5';
            item.style.pointerEvents = 'none';
        };
        
        list.appendChild(item);
    });
});

document.getElementById('view-cert-btn').onclick = () => {
    try {
        const host = new URL(currentOrigin).hostname;
        window.electronAPI.send('new-tab', `ocal://certificate-viewer?host=${host}`);
        window.electronAPI.send('hide-site-info');
    } catch(e) {}
};

document.getElementById('manage-data-link').onclick = (e) => {
    e.preventDefault();
    window.electronAPI.send('open-settings', 'general');
};

// Close Logic
document.querySelectorAll('.sip-close').forEach(btn => {
    btn.onclick = () => window.electronAPI.send('hide-site-info');
});

// Permission Toggling
document.querySelectorAll('.sip-toggle').forEach(toggle => {
    toggle.onclick = (e) => {
        e.stopPropagation();
        const isOn = toggle.classList.toggle('on');
        const permission = toggle.id.replace('toggle-', ''); // notifications, popups, sound
        
        window.electronAPI.send('update-site-permission', {
            origin: currentOrigin,
            permission: permission,
            value: isOn ? 'allow' : 'block'
        });
    };
});

document.getElementById('site-settings-btn').onclick = () => {
    try {
        const host = new URL(currentOrigin).hostname;
        window.electronAPI.send('open-site-settings', host);
    } catch(e) {}
};

window.onblur = () => {
    window.electronAPI.send('hide-site-info');
};

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

async function applyTheme() {
    try {
        const s = await window.electronAPI.invoke('get-settings');
        if (s.themeMode === 'light') {
            document.body.setAttribute('data-theme', 'light');
        } else {
            document.body.removeAttribute('data-theme');
        }
        if (s.accentColor) {
            const isLight = s.themeMode === 'light';
            const accent = getModeAccent(s.accentColor, isLight);
            document.body.style.setProperty('--accent', accent);
            const r = parseInt(accent.slice(1,3), 16), g = parseInt(accent.slice(3,5), 16), b = parseInt(accent.slice(5,7), 16);
            document.body.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.2)`);
            document.body.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.12)`);
            document.body.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.2)`);
        }
    } catch(e) {}
}
applyTheme();
window.electronAPI.on('settings-changed', (e, s) => {
    if (s.themeMode === 'light') {
        document.body.setAttribute('data-theme', 'light');
    } else {
        document.body.removeAttribute('data-theme');
    }
    if (s.accentColor) {
        const isLight = s.themeMode === 'light';
        const accent = getModeAccent(s.accentColor, isLight);
        document.body.style.setProperty('--accent', accent);
        const r = parseInt(accent.slice(1,3), 16), g = parseInt(accent.slice(3,5), 16), b = parseInt(accent.slice(5,7), 16);
        document.body.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.2)`);
        document.body.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.12)`);
        document.body.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.2)`);
    }
});

