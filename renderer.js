const addressInput = document.getElementById('address-input');
const tabList      = document.getElementById('tab-list');
const newTabBtn    = document.getElementById('new-tab-btn');
const bookmarkBar  = document.getElementById('bookmark-bar');

let tabs = [];
let activeTabId = null;
let currentBookmarks = [];
let currentFolders = [];

// ── HTML Fullscreen ────────────────────────────────────────────────────────
window.electronAPI.onHtmlFullscreen((isFullscreen) => {
    document.body.classList.toggle('fullscreen', isFullscreen);
});

// ── Tab Rendering ──────────────────────────────────────────────────────────
function renderTabs() {
    tabList.innerHTML = '';
    tabs.forEach((tab, index) => {
        const el = document.createElement('div');
        el.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;
        el.draggable = true;

        el.ondragstart = (e) => {
            e.dataTransfer.setData('tab-index', index);
            el.classList.add('dragging');
        };

        el.ondragover = (e) => {
            e.preventDefault();
            el.classList.add('drag-over');
        };

        el.ondragleave = () => el.classList.remove('drag-over');

        el.ondrop = (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer.getData('tab-index'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                window.electronAPI.send('reorder-tabs', { fromIndex, toIndex });
            }
        };

        el.ondragend = () => el.classList.remove('dragging');
        
        const iconHtml = getTabIconHtml(tab.url);
        
        el.innerHTML = `
            ${iconHtml}
            <span class="tab-title">${tab.title || 'New Tab'}</span>
            <i class="fas fa-times tab-close" data-id="${tab.id}"></i>
        `;
        el.onclick = (e) => {
            if (e.target.classList.contains('tab-close')) return;
            activeTabId = tab.id;
            window.electronAPI.switchTab(tab.id);
            renderTabs();
        };
        tabList.appendChild(el);
    });
    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            window.electronAPI.closeTab(btn.getAttribute('data-id'));
        };
    });
}

window.electronAPI.onTabsChanged((data) => {
    tabs = data.tabs;
    activeTabId = data.activeTabId;
    const active = tabs.find(t => t.id === activeTabId);
    if (active && addressInput) {
        syncOmnibox(active.url);
    }
    renderTabs();
});

window.electronAPI.onUpdateURL((data) => {
    const tab = tabs.find(t => t.id === data.id);
    if (tab) { tab.url = data.url; tab.title = data.title; }
    if (data.id === activeTabId && addressInput) {
        syncOmnibox(data.url);
    }
    renderTabs();
});

function syncOmnibox(url) {
    const isHome = !url || url.includes('home.html');
    addressInput.value = isHome ? '' : formatDisplayUrl(url);
    updateOmniboxIcon(url);
    updateHeartStatus(url);
}

function updateHeartStatus(url) {
    const heartBtn = document.getElementById('bookmark-heart-btn');
    if (!heartBtn) return;
    const isBookmarked = currentBookmarks.some(b => b.url === url);
    heartBtn.classList.toggle('active', isBookmarked);
    heartBtn.innerHTML = isBookmarked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
}

function formatDisplayUrl(url) {
    if (!url) return '';
    if (url.includes('home.html')) return '';
    if (url.includes('settings.html')) return 'ocal://settings';
    if (url.includes('game.html')) return 'ocal://game';
    return url;
}

function getTabIconHtml(url) {
    if (!url || url.includes('home.html')) return '<i class="fas fa-house tab-favicon" style="color:var(--accent)"></i>';
    if (url.includes('settings.html')) return '<i class="fas fa-gear tab-favicon" style="color:var(--accent)"></i>';
    if (url.includes('game.html')) return '<i class="fas fa-gamepad tab-favicon" style="color:var(--accent)"></i>';
    
    // Search Engines
    if (url.includes('google.com')) return '<i class="fab fa-google tab-favicon" style="color:#4285F4"></i>';
    if (url.includes('bing.com')) return '<i class="fas fa-b tab-favicon" style="color:#00a1f1"></i>';
    if (url.includes('duckduckgo.com')) return '<i class="fas fa-shield-cat tab-favicon" style="color:#de5833"></i>';
    
    return '<i class="fas fa-globe tab-favicon"></i>';
}

function updateOmniboxIcon(url) {
    const iconContainer = document.querySelector('.omnibox-icon');
    if (!iconContainer) return;

    if (!url || url.includes('home.html')) {
        iconContainer.innerHTML = '<i class="fas fa-house" style="color:var(--accent)"></i>';
    } else if (url.includes('settings.html')) {
        iconContainer.innerHTML = '<i class="fas fa-gear" style="color:var(--accent)"></i>';
    } else if (url.includes('game.html')) {
        iconContainer.innerHTML = '<i class="fas fa-gamepad" style="color:var(--accent)"></i>';
    } else if (url.includes('google.com')) {
        iconContainer.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>`;
    } else if (url.includes('bing.com')) {
        iconContainer.innerHTML = '<i class="fas fa-b" style="color:#00a1f1; font-size: 13px;"></i>';
    } else if (url.includes('duckduckgo.com')) {
        iconContainer.innerHTML = '<i class="fas fa-shield-cat" style="color:#de5833; font-size: 13px;"></i>';
    } else {
        // Default Web icon (Globe) instead of hardcoded Google
        iconContainer.innerHTML = '<i class="fas fa-globe" style="color:var(--text-muted); font-size: 13px;"></i>';
    }
}

window.electronAPI.onUpdateTitle((data) => {
    const tab = tabs.find(t => t.id === data.id);
    if (tab) tab.title = data.title;
    renderTabs();
});

// ── Navigation ─────────────────────────────────────────────────────────────
if (newTabBtn) newTabBtn.onclick = () => window.electronAPI.newTab();

let suggestTimeout;
if (addressInput) {
    addressInput.addEventListener('input', () => {
        clearTimeout(suggestTimeout);
        const query = addressInput.value.trim();
        if (!query) {
            window.electronAPI.send('hide-suggestions');
            return;
        }
        suggestTimeout = setTimeout(() => {
            const omnibox = document.getElementById('omnibox');
            if (!omnibox) return;
            const rect = omnibox.getBoundingClientRect();
            window.electronAPI.send('suggest-search', query);
            window.electronAPI.send('show-suggestions', {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        }, 150);
    });

    addressInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { 
            window.electronAPI.send('hide-suggestions');
            window.electronAPI.navigateTo(addressInput.value); 
            addressInput.blur(); 
        }
        if (e.key === 'Escape') {
            window.electronAPI.send('hide-suggestions');
            addressInput.blur();
        }
    });
    // Select all on focus
    addressInput.addEventListener('focus', () => addressInput.select());
}

window.electronAPI.on('execute-suggestion', (e, text) => {
    addressInput.value = text;
    window.electronAPI.navigateTo(text);
    addressInput.blur();
});

// ── Window Controls + Sidebar Buttons ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const minBtn   = document.getElementById('min-btn');
    const maxBtn   = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');
    if (minBtn)   minBtn.onclick   = () => window.electronAPI.minimize();
    if (maxBtn)   maxBtn.onclick   = () => window.electronAPI.maximize();
    if (closeBtn) closeBtn.onclick = () => window.electronAPI.close();

    window.electronAPI.onMaximized((isMax) => {
        if (maxBtn) maxBtn.innerHTML = isMax
            ? '<i class="far fa-window-restore"></i>'
            : '<i class="far fa-square"></i>';
    });

    const aiBtn  = document.getElementById('ai-toolbar-btn');
    const bmBtn  = document.getElementById('bookmarks-sidebar-btn');
    const hiBtn  = document.getElementById('history-sidebar-btn');
    const mnBtn  = document.getElementById('burger-menu-btn');
    const dlBtn  = document.getElementById('download-icon-btn');

    if (aiBtn) aiBtn.onclick = () => window.electronAPI.send('toggle-ai-sidebar');
    if (bmBtn) bmBtn.onclick = () => { window.electronAPI.send('toggle-sidebar', true); window.electronAPI.send('switch-sidebar-tab', 'bookmarks'); };
    if (hiBtn) hiBtn.onclick = () => { window.electronAPI.send('toggle-sidebar', true); window.electronAPI.send('switch-sidebar-tab', 'history'); };
    if (mnBtn) mnBtn.onclick = () => window.electronAPI.send('toggle-sidebar', true);
    if (dlBtn) dlBtn.onclick = () => { window.electronAPI.send('toggle-sidebar', true); window.electronAPI.send('switch-sidebar-tab', 'downloads'); };

    const heartBtn = document.getElementById('bookmark-heart-btn');
    if (heartBtn) {
        heartBtn.onclick = () => {
            const activeTab = tabs.find(t => t.id === activeTabId);
            if (!activeTab || !activeTab.url || activeTab.url.includes('home.html')) return;
            
            const isBookmarked = currentBookmarks.some(b => b.url === activeTab.url);
            window.electronAPI.send('toggle-bookmark', {
                title: activeTab.title || 'Untitled',
                url: activeTab.url
            });

            showToast(isBookmarked ? 'Removed from Bookmarks' : 'Added to Bookmarks', isBookmarked ? 'fa-heart-crack' : 'fa-heart');
        };
    }

    window.electronAPI.send('request-tabs');
    window.electronAPI.getSettings().then(s => {
        applyGlobalSettings(s);
        currentBookmarks = s.bookmarks || [];
        currentFolders   = s.folders   || [];
        renderBookmarkBar();
    });
});

// ── Settings ───────────────────────────────────────────────────────────────
function applyGlobalSettings(s) {
    if (s.accentColor) document.documentElement.style.setProperty('--accent', s.accentColor);
    document.body.classList.toggle('compact-mode', !!s.compactMode);
}
window.electronAPI.onSettingsChanged((s) => applyGlobalSettings(s));
window.electronAPI.getSettings().then(s => applyGlobalSettings(s));

// ── Bookmark Bar ───────────────────────────────────────────────────────────
function renderBookmarkBar() {
    if (!bookmarkBar) return;
    bookmarkBar.innerHTML = '';

    // Web folder — always first
    const webFolder = document.createElement('div');
    webFolder.className = 'web-folder';
    webFolder.id = 'web-folder-btn';
    webFolder.innerHTML = `<i class="fas fa-folder"></i><span>Web</span><i class="fas fa-chevron-down" style="font-size:7px;opacity:0.5"></i>`;
    webFolder.onclick = (e) => {
        window.electronAPI.send('switch-sidebar-tab', 'bookmarks');
    };
    bookmarkBar.appendChild(webFolder);

    if (currentBookmarks.length > 0 || currentFolders.length > 0) {
        const sep = document.createElement('div');
        sep.style.cssText = 'width:1px;height:14px;background:rgba(255,255,255,0.08);margin:0 6px;flex-shrink:0;align-self:center';
        bookmarkBar.appendChild(sep);
    }

    // Folders from saved data (skip 'Web' — already shown as static button)
    currentFolders.filter(f => f.name.toLowerCase() !== 'web').forEach(f => {
        const el = document.createElement('div');
        el.className = 'bookmark-bar-folder';
        el.innerHTML = `<i class="fas fa-folder"></i><span>${f.name}</span>`;
        el.onclick = (e) => {
            window.electronAPI.send('switch-sidebar-tab', 'bookmarks');
        };
        bookmarkBar.appendChild(el);
    });

    currentBookmarks.filter(b => !b.folderId).forEach(b => {
        const el = document.createElement('div');
        el.className = 'bookmark-bar-item';
        const domain = (() => { try { return new URL(b.url).hostname; } catch { return ''; } })();
        el.innerHTML = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.style.display='none'"><span>${b.title}</span>`;
        el.onclick = () => window.electronAPI.navigateTo(b.url);
        bookmarkBar.appendChild(el);
    });
}

window.electronAPI.onBookmarksUpdated((data) => {
    currentBookmarks = data.bookmarks || (Array.isArray(data) ? data : []);
    currentFolders   = data.folders   || [];
    renderBookmarkBar();
    const active = tabs.find(t => t.id === activeTabId);
    if (active) updateHeartStatus(active.url);
});

function showToast(msg, icon = 'fa-check') {
    const toast = document.getElementById('bm-toast');
    if (!toast) return;
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Screenshot ─────────────────────────────────────────────────────────────
const screenshotBtn = document.getElementById('screenshot-btn');
if (screenshotBtn) {
    screenshotBtn.onclick = (e) => {
        e.stopPropagation();
        const rect = screenshotBtn.getBoundingClientRect();
        window.electronAPI.send('open-screenshot-toolbar', {
            x: rect.left - 50,
            y: rect.bottom + 8
        });
    };
}

// ── Global Click-to-Dismiss ──────────────────────────────────────────────
// ── AI Resizing Logic ───────────────────────────────────────────────────
let isAiResizing = false;
const resizeOverlay = document.createElement('div');
resizeOverlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:ew-resize;display:none;background:transparent;';
document.body.appendChild(resizeOverlay);

window.electronAPI.on('ai-resize-started', () => {
    isAiResizing = true;
    resizeOverlay.style.display = 'block';
});

window.electronAPI.on('ai-resize-stopped', () => {
    isAiResizing = false;
    resizeOverlay.style.display = 'none';
});

window.addEventListener('mousemove', (e) => {
    if (!isAiResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 300 && newWidth <= 950) {
        window.electronAPI.send('set-ai-sidebar-width', newWidth);
    }
});

window.addEventListener('mouseup', () => {
    if (isAiResizing) {
        isAiResizing = false;
        resizeOverlay.style.display = 'none';
        window.electronAPI.send('stop-ai-resize');
    }
});

window.addEventListener('mousedown', (e) => {
    // Only close if we're not clicking a button that's supposed to open/control something
    if (!e.target.closest('.toolbar-actions') && 
        !e.target.closest('.omnibox-actions') && 
        !e.target.closest('.nav-controls') &&
        !e.target.closest('.bookmark-bar')) {
        window.electronAPI.send('close-all-sidebars');
    }
});

window.electronAPI.send('request-tabs');
