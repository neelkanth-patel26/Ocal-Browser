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

        if (!bytes || bytes === 0) {
            siteUsageEl.textContent = '0 bytes';
        } else if (bytes < 1024) {
            siteUsageEl.textContent = `${bytes} bytes`;
        } else if (bytes < 1024 * 1024) {
            siteUsageEl.textContent = `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            siteUsageEl.textContent = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }

        siteCookieCountEl.textContent = `${cookies} ${cookies === 1 ? 'cookie' : 'cookies'}`;
    } catch (e) {
        siteUsageEl.textContent = 'Error calculating usage';
    }
}

function renderPermissions(savedPerms) {
    if (!permissionsList) return;
    permissionsList.innerHTML = '';
    
    PERMISSIONS.forEach(p => {
        const row = document.createElement('div');
        row.className = 'row';
        
        const currentVal = savedPerms[p.id] || 'default';
        
        row.innerHTML = `
            <div class="row-icon"><i class="fas ${p.icon}"></i></div>
            <div class="row-content">
                <div class="row-title">${p.label}</div>
                ${p.desc ? `<div class="row-desc">${p.desc}</div>` : ''}
            </div>
            <select data-perm="${p.id}">
                <option value="default" ${currentVal === 'default' ? 'selected' : ''}>${getDefaultLabel(p.id)} (default)</option>
                <option value="allow" ${currentVal === 'allow' ? 'selected' : ''}>Allow</option>
                <option value="block" ${currentVal === 'block' ? 'selected' : ''}>Block</option>
            </select>
        `;
        
        row.querySelector('select').onchange = (e) => {
            updatePermission(p.id, e.target.value);
        };
        
        permissionsList.appendChild(row);
    });
}

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
        await window.electronAPI.invoke('delete-site-data', { origin: targetOrigin, domain: targetHost });
        await refreshUsage();
        deleteDataBtn.disabled = false;
        deleteDataBtn.textContent = 'Delete data';
    };
}

if (resetPermsBtn) {
    resetPermsBtn.onclick = async () => {
        await window.electronAPI.send('reset-site-permissions', targetOrigin);
        const savedPerms = await window.electronAPI.invoke('get-host-permissions', targetOrigin) || {};
        renderPermissions(savedPerms);
    };
}

init();
