const siteHostnameEl = document.getElementById('site-hostname');
const siteUsageEl = document.getElementById('site-usage');
const siteCookieCountEl = document.getElementById('site-cookie-count');
const permissionsList = document.getElementById('permissions-list');
const deleteDataBtn = document.getElementById('delete-data-btn');
const resetPermsBtn = document.getElementById('reset-perms-btn');

const urlParams = new URLSearchParams(window.location.search);
const targetHost = urlParams.get('host') || 'www.google.com';
const targetOrigin = `https://${targetHost}`;

const PERMISSIONS = [
    { id: 'geolocation', label: 'Location', icon: 'fa-location-dot' },
    { id: 'camera', label: 'Camera', icon: 'fa-video' },
    { id: 'microphone', label: 'Microphone', icon: 'fa-microphone' },
    { id: 'sensors', label: 'Motion sensors', icon: 'fa-compass' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
    { id: 'javascript', label: 'JavaScript', icon: 'fa-code', desc: 'Allows interactive scripts to run' },
    { id: 'images', label: 'Images', icon: 'fa-image', desc: 'Display visual media content' },
    { id: 'popups', label: 'Pop-ups and redirects', icon: 'fa-window-restore' },
    { id: 'background-sync', label: 'Background sync', icon: 'fa-rotate-right' },
    { id: 'audio', label: 'Sound', icon: 'fa-volume-high' },
    { id: 'downloads', label: 'Automatic downloads', icon: 'fa-download' },
    { id: 'midi', label: 'MIDI device control', icon: 'fa-keyboard' },
    { id: 'usb', label: 'USB devices', icon: 'fa-usb' },
    { id: 'serial', label: 'Serial ports', icon: 'fa-plug' },
    { id: 'hid', label: 'HID devices', icon: 'fa-keyboard' },
    { id: 'clipboard', label: 'Clipboard', icon: 'fa-clipboard-check' },
    { id: 'payments', label: 'Payment handlers', icon: 'fa-credit-card' }
];

async function init() {
    siteHostnameEl.textContent = targetHost;
    
    // 1. Fetch Usage
    refreshUsage();

    // 2. Fetch Permissions
    try {
        const savedPerms = await window.electronAPI.invoke('get-host-permissions', targetOrigin) || {};
        renderPermissions(savedPerms);
    } catch (e) {
        console.error("Failed to fetch permissions:", e);
        permissionsList.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">Failed to load permissions. Please try again.</div>';
    }
}

async function refreshUsage() {
    siteUsageEl.textContent = 'Calculating...';
    siteCookieCountEl.textContent = '';
    
    try {
        const stats = await window.electronAPI.invoke('get-site-usage', targetOrigin);
        const bytes = stats.bytes || 0;
        const cookies = stats.count || 0;
        const storageItems = stats.storageItems || 0;

        if (!bytes || bytes === 0) {
            siteUsageEl.textContent = '0 bytes';
        } else if (bytes < 1024) {
            siteUsageEl.textContent = `${bytes} bytes`;
        } else if (bytes < 1024 * 1024) {
            siteUsageEl.textContent = `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            siteUsageEl.textContent = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }

        if (cookies > 0 && storageItems > 0) {
            siteCookieCountEl.textContent = `${cookies} ${cookies === 1 ? 'cookie' : 'cookies'} · local data`;
        } else if (cookies > 0) {
            siteCookieCountEl.textContent = `${cookies} ${cookies === 1 ? 'cookie' : 'cookies'}`;
        } else if (bytes > 0) {
            siteCookieCountEl.textContent = '0 cookies · local site data';
        } else {
            siteCookieCountEl.textContent = '0 cookies';
        }
    } catch (e) {
        siteUsageEl.textContent = '0 bytes';
        siteCookieCountEl.textContent = '0 cookies';
    }
}

function renderPermissions(savedPerms) {
    if (!permissionsList) return;
    permissionsList.innerHTML = '';
    
    PERMISSIONS.forEach(p => {
        const row = document.createElement('div');
        row.className = 'row';
        
        const currentVal = savedPerms[p.id] || 'default';
        const defaultLabel = getDefaultLabel(p.id);
        
        row.innerHTML = `
            <div class="row-icon"><i class="fas ${p.icon}"></i></div>
            <div class="row-content">
                <div class="row-title">${p.label}</div>
                ${p.desc ? `<div class="row-desc">${p.desc}</div>` : ''}
            </div>
        `;
        
        const customSelect = createCustomSelect(p.id, currentVal, defaultLabel);
        row.appendChild(customSelect);
        
        permissionsList.appendChild(row);
    });
}

function createCustomSelect(permId, currentVal, defaultLabel) {
    const options = [
        { value: 'default', label: `${defaultLabel} (default)` },
        { value: 'allow', label: 'Allow' },
        { value: 'block', label: 'Block' }
    ];

    const currentOpt = options.find(o => o.value === currentVal) || options[0];

    const container = document.createElement('div');
    container.className = 'custom-select-container';
    container.setAttribute('data-perm', permId);

    container.innerHTML = `
        <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="custom-select-value">${currentOpt.label}</span>
            <i class="fas fa-chevron-down custom-select-arrow"></i>
        </button>
        <div class="custom-select-menu" role="listbox">
            ${options.map(opt => `
                <div class="custom-select-option ${opt.value === currentVal ? 'selected' : ''}" data-value="${opt.value}" role="option" aria-selected="${opt.value === currentVal}">
                    <span>${opt.label}</span>
                    ${opt.value === currentVal ? '<i class="fas fa-check"></i>' : ''}
                </div>
            `).join('')}
        </div>
    `;

    const trigger = container.querySelector('.custom-select-trigger');
    const valueEl = container.querySelector('.custom-select-value');

    trigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = container.classList.contains('open');
        // Close all other open custom selects
        document.querySelectorAll('.custom-select-container.open').forEach(el => {
            if (el !== container) el.classList.remove('open');
        });
        container.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
    };

    container.querySelectorAll('.custom-select-option').forEach(optEl => {
        optEl.onclick = (e) => {
            e.stopPropagation();
            const newVal = optEl.getAttribute('data-value');
            
            // Update UI selection
            container.querySelectorAll('.custom-select-option').forEach(o => {
                o.classList.remove('selected');
                o.setAttribute('aria-selected', 'false');
                const check = o.querySelector('i.fa-check');
                if (check) check.remove();
            });
            optEl.classList.add('selected');
            optEl.setAttribute('aria-selected', 'true');
            if (!optEl.querySelector('i.fa-check')) {
                optEl.insertAdjacentHTML('beforeend', '<i class="fas fa-check"></i>');
            }
            valueEl.textContent = optEl.querySelector('span').textContent;
            container.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');

            // Dispatch update to main process
            updatePermission(permId, newVal);
        };
    });

    return container;
}

// Global click-outside & escape listeners to dismiss open menus
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-container.open').forEach(el => {
        el.classList.remove('open');
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.custom-select-container.open').forEach(el => {
            el.classList.remove('open');
        });
    }
});

function getDefaultLabel(permId) {
    const allows = ['audio', 'background-sync', 'javascript', 'images', 'popups'];
    if (allows.includes(permId)) return 'Allow';
    if (permId === 'notifications') return 'Block';
    return 'Ask';
}

async function updatePermission(permission, value) {
    await window.electronAPI.send('update-site-permission', {
        origin: targetOrigin,
        permission: permission,
        value: value
    });
}

if (deleteDataBtn) {
    deleteDataBtn.onclick = async () => {
        deleteDataBtn.disabled = true;
        deleteDataBtn.textContent = 'Deleting...';
        try {
            await window.electronAPI.invoke('delete-site-data', { origin: targetOrigin, domain: targetHost });
            siteUsageEl.textContent = '0 bytes';
            siteCookieCountEl.textContent = '0 cookies';
            await new Promise(r => setTimeout(r, 250));
            await refreshUsage();
        } catch (e) {
            console.error("Failed to delete site data:", e);
        } finally {
            deleteDataBtn.disabled = false;
            deleteDataBtn.textContent = 'Delete data';
        }
    };
}

if (resetPermsBtn) {
    resetPermsBtn.onclick = async () => {
        await window.electronAPI.send('reset-site-permissions', targetOrigin);
        const savedPerms = await window.electronAPI.invoke('get-host-permissions', targetOrigin) || {};
        renderPermissions(savedPerms);
    };
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

// Theme & Accent Color Synchronization
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
            document.documentElement.style.setProperty('--accent', accent);
            const r = parseInt(accent.slice(1,3), 16), g = parseInt(accent.slice(3,5), 16), b = parseInt(accent.slice(5,7), 16);
            document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.2)`);
            document.documentElement.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.12)`);
            document.documentElement.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.2)`);
        }
    } catch(e) {
        console.error("Failed to apply theme in site settings:", e);
    }
}

applyTheme();
init();

window.electronAPI.on('settings-changed', (s) => {
    if (s.themeMode === 'light') {
        document.body.setAttribute('data-theme', 'light');
    } else {
        document.body.removeAttribute('data-theme');
    }
    if (s.accentColor) {
        const isLight = s.themeMode === 'light';
        const accent = getModeAccent(s.accentColor, isLight);
        document.documentElement.style.setProperty('--accent', accent);
        const r = parseInt(accent.slice(1,3), 16), g = parseInt(accent.slice(3,5), 16), b = parseInt(accent.slice(5,7), 16);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.2)`);
        document.documentElement.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.12)`);
        document.documentElement.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.2)`);
    }
});
