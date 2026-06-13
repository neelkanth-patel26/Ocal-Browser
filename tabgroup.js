let currentGroupId = null;
const popupPanel = document.getElementById('popup-panel');
const backdrop = document.getElementById('backdrop');

function hidePopup() {
    if (popupPanel) popupPanel.style.display = 'none';
    window.electronAPI.send('hide-tab-group-popup');
}

backdrop.addEventListener('mousedown', () => {
    hidePopup();
});

window.electronAPI.on('show-popup', (e, pos) => {
    if (popupPanel) {
        popupPanel.style.left = Math.round(pos.x) + 'px';
        popupPanel.style.top = Math.round(pos.y) + 'px';
        popupPanel.style.display = 'flex';
    }
});

window.electronAPI.on('group-data', (event, data) => {
    currentGroupId = data.id;
    document.getElementById('group-name').value = data.name || '';
    const dots = document.querySelectorAll('.color-dot');
    dots.forEach(dot => {
        dot.classList.toggle('active', dot.dataset.color === data.color);
    });
    
    // Globally sync the group color to the whole DOM
    const color = data.color || '#a855f7';
    document.documentElement.style.setProperty('--accent', color);
});

document.getElementById('group-name').addEventListener('input', (e) => {
    if (!currentGroupId) return;
    window.electronAPI.send('update-group', { groupId: currentGroupId, name: e.target.value });
});

document.querySelectorAll('.color-dot').forEach(dot => {
    dot.onclick = () => {
        if (!currentGroupId) return;
        const color = dot.dataset.color;
        window.electronAPI.send('update-group', { groupId: currentGroupId, color: color });
        
        // UI feedback
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        
        // Sync global accent color
        document.documentElement.style.setProperty('--accent', color);
    };
});

document.getElementById('ungroup-btn').onclick = () => {
    if (!currentGroupId) return;
    window.electronAPI.send('ungroup', currentGroupId);
    hidePopup();
};

document.getElementById('close-btn').onclick = () => {
    hidePopup();
};

// Close on escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePopup();
});

// Request initial data
window.electronAPI.send('request-tab-group-data');

// Sync settings
window.electronAPI.invoke('get-settings').then(s => {
    if (s && s.themeMode) {
        document.body.setAttribute('data-theme', s.themeMode);
    }
});
window.electronAPI.on('settings-changed', (e, s) => {
    if (s && s.themeMode) {
        document.body.setAttribute('data-theme', s.themeMode);
    }
});
