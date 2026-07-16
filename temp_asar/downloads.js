const dlList = document.getElementById('dl-list');
const popupPanel = document.getElementById('popup-panel');
const backdrop = document.getElementById('backdrop');

// Close when clicking the invisible fullscreen background
backdrop.addEventListener('mousedown', () => {
    window.electronAPI.send('hide-downloads-popup');
});

// Full UI expansion button
const openSidebarBtn = document.getElementById('open-sidebar-btn');
if (openSidebarBtn) {
    openSidebarBtn.onclick = () => {
        // Toggle the entire main sidebar open
        window.electronAPI.send('toggle-sidebar', true);
        window.electronAPI.send('switch-sidebar-tab', 'downloads');
        // Hide this mini widget
        window.electronAPI.send('hide-downloads-popup');
    };
}

// Receive absolute coordinates for the floating panel element
window.electronAPI.on('show-popup', (e, pos) => {
    if (popupPanel) {
        popupPanel.style.left = Math.round(pos.x) + 'px';
        popupPanel.style.top = Math.round(pos.y) + 'px';
    }
});

// Listen for updates from main process
window.electronAPI.on('download-updated', (e, downloads) => {
    renderDownloads(downloads);
});

function renderDownloads(items) {
    dlList.innerHTML = '';
    
    if (!items || items.length === 0) {
        dlList.innerHTML = `<div class="empty-state"><i class="fas fa-ghost"></i> No recent downloads</div>`;
        return;
    }

    // Sort newest first
    const sorted = [...items].reverse();

    sorted.forEach((dl) => {
        const el = document.createElement('div');
        el.className = 'dl-item';
        
        let iconHtml = '<i class="fas fa-file-arrow-down"></i>';
        if (dl.state === 'completed') iconHtml = '<i class="fas fa-check"></i>';
        if (dl.state === 'cancelled' || dl.state === 'interrupted') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';

        const pct = dl.total > 0 ? Math.round((dl.received / dl.total) * 100) : 0;
        let pbar = '';
        if (dl.state === 'progressing') {
            pbar = `<div class="dl-bar-bg"><div class="dl-bar" style="width:${pct}%"></div></div>`;
        }

        const fileSizeStr = dl.total > 0 ? `(${formatBytes(dl.total)})` : '';
        
        el.innerHTML = `
            <div class="dl-icon" style="${dl.state==='completed'?'color:#10b981':''}">${iconHtml}</div>
            <div class="dl-info">
                <div class="dl-name">${esc(dl.name)} ${fileSizeStr}</div>
                <div class="dl-status">${dl.state === 'progressing' ? pct + '% - Downloading' : dl.state}</div>
                ${pbar}
            </div>
            ${dl.state === 'completed' ? `<div class="dl-actions"><button class="dl-action-btn" title="Open File"><i class="fas fa-folder-open"></i></button></div>` : ''}
        `;

        if (dl.state === 'completed') {
            const btn = el.querySelector('.dl-action-btn');
            if (btn) btn.onclick = (ev) => {
                ev.stopPropagation();
                window.electronAPI.send('open-download', dl.path);
            };
        }

        el.onclick = () => {
            if (dl.state === 'completed') {
                window.electronAPI.send('open-download', dl.path);
            }
        };

        dlList.appendChild(el);
    });
}

function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
