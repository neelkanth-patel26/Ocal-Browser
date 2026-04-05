/**
 * Ocal Media Master - Popup logic
 * (C) 2026 Ocal Browser
 */

const { ipcRenderer } = require('electron');

const mediaListEl = document.getElementById('media-list');
const footerActions = document.getElementById('footer-actions');
const downloadAllBtn = document.getElementById('download-all-btn');
const mediaCard = document.getElementById('media-card');
const popupOverlay = document.getElementById('popup-overlay');

let currentTabId = null;

// Catch popup-data from main process
ipcRenderer.on('popup-data', (event, { x, y, width, tabId }) => {
    currentTabId = tabId;
    
    // Position the popup exactly below the Toolbar button
    // The width of the popup is 320px. Offset x to be right-aligned or centered.
    const winWidth = window.innerWidth;
    let finalX = x - 280; // Default align to right of launcher
    if (finalX + 320 > winWidth) finalX = winWidth - 330;
    if (finalX < 10) finalX = 10;

    mediaCard.style.left = finalX + 'px';
    mediaCard.style.top = (y + 10) + 'px';
    mediaCard.classList.add('show');

    // Initial load
    refreshMedia();
});

function refreshMedia() {
    if (!currentTabId) return;
    ipcRenderer.invoke('get-tab-media', currentTabId).then(list => {
        renderMediaUI(list);
    });
}

ipcRenderer.on('media-master-updated', (event, { tabId, mediaList }) => {
    if (tabId === currentTabId) {
        renderMediaUI(mediaList);
    }
});

function renderMediaUI(list) {
    if (!list || list.length === 0) {
        mediaListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                No media detected on this page.<br>
                Try scrolling or playing a video.
            </div>`;
        footerActions.style.display = 'none';
        return;
    }

    const hasImages = list.some(m => m.type === 'image');
    footerActions.style.display = hasImages ? 'block' : 'none';

    mediaListEl.innerHTML = list.map((item, index) => {
        const icon = item.type === 'video' ? 'fa-video' : (item.type === 'stream' ? 'fa-bolt' : 'fa-image');
        const meta = item.type === 'stream' ? 'READY TO STREAM' : (item.type === 'image' ? (item.size || 'Web Image') : (item.quality || 'Standard Quality'));
        const btnIcon = item.type === 'stream' ? 'fa-play' : 'fa-arrow-down';
        
        return `
            <div class="media-item" style="${item.type === 'stream' ? 'border-left: 3px solid var(--accent);' : ''}">
                <div class="media-icon"><i class="fas ${icon}"></i></div>
                <div class="media-info">
                    <div class="media-title">${item.title}</div>
                    <div class="media-meta">${item.origin} • ${meta}</div>
                </div>
                <button class="download-btn" onclick="downloadItem('${item.url}')">
                    <i class="fas ${btnIcon}"></i>
                </button>
            </div>
        `;
    }).join('');
}

window.downloadItem = (url) => {
    ipcRenderer.send('download-media', { url });
};

downloadAllBtn.onclick = () => {
    const btns = document.querySelectorAll('.download-btn');
    btns.forEach((btn, i) => {
        setTimeout(() => btn.click(), i * 350);
    });
};

popupOverlay.onclick = () => {
    mediaCard.classList.remove('show');
    setTimeout(() => ipcRenderer.send('hide-media-popup'), 300);
};

// Close on escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') popupOverlay.onclick();
});
