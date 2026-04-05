const addressInput = document.getElementById('address-input');
const tabList      = document.getElementById('tab-list');
const newTabBtn    = document.getElementById('new-tab-btn');
const bookmarkBar  = document.getElementById('bookmark-bar');

let tabs = [];
let activeTabId = null;
let currentBookmarks = [];
let currentFolders = [];
let tabGroups = [];
let lastSettings = null;

// ── HTML Fullscreen ────────────────────────────────────────────────────────
window.electronAPI.onHtmlFullscreen((isFullscreen) => {
    document.body.classList.toggle('fullscreen', isFullscreen);
});

const loadingBar = document.getElementById('loading-bar');

window.electronAPI.on('load-progress', (e, { id, progress }) => {
    // 1. Update the loading-bar for the active tab
    if (id === activeTabId) {
        if (progress === 100) {
            loadingBar.style.width = '100%';
            loadingBar.classList.add('finished');
            setTimeout(() => {
                loadingBar.style.width = '0%';
                loadingBar.classList.remove('active', 'finished');
            }, 600);
        } else if (progress === 0) {
            loadingBar.style.width = '0%';
            loadingBar.classList.remove('active', 'finished');
        } else {
            loadingBar.classList.remove('finished');
            loadingBar.classList.add('active');
            loadingBar.style.width = progress + '%';
        }
    }

    // 2. Update the specific tab's internal loading state
    const targetTab = tabs.find(t => t.id === id);
    if (targetTab) {
        const wasLoading = targetTab.loading;
        targetTab.loading = progress > 0 && progress < 100;
        
        // Only re-render if the loading state actually changed (start or finish)
        if (wasLoading !== targetTab.loading) {
            renderTabs();
        }
    }
});

// ── Tab Rendering ──────────────────────────────────────────────────────────
function renderTabs() {
    tabList.innerHTML = '';
    const processedGroups = new Set();

    tabs.forEach((tab, index) => {
        // If tab is in a group and we haven't rendered the group header yet
        if (tab.groupId && !processedGroups.has(tab.groupId)) {
            const group = tabGroups.find(g => g.id === tab.groupId);
            if (group) {
                const header = document.createElement('div');
                header.className = 'tab-group-header';
                header.innerHTML = `
                    <div class="tab-group-dot" style="background: ${group.color}; color: ${group.color}"></div>
                    <span class="tab-group-name" style="color: ${group.color}; text-shadow: 0 0 8px ${group.color}44;">${group.name}</span>
                `;
                header.onclick = () => window.electronAPI.send('toggle-group-collapse', group.id);
                
                header.ondragover = (e) => {
                    e.preventDefault();
                    header.classList.add('drag-over');
                };
                header.ondragleave = () => header.classList.remove('drag-over');
                header.ondrop = (e) => {
                    e.preventDefault();
                    header.classList.remove('drag-over');
                    const tabIndex = parseInt(e.dataTransfer.getData('tab-index'));
                    const tab = tabs[tabIndex];
                    if (tab && tab.id) {
                        window.electronAPI.send('add-to-group', { tabId: tab.id, groupId: group.id });
                    }
                };

                header.oncontextmenu = (e) => {
                    e.preventDefault();
                    const rect = header.getBoundingClientRect();
                    window.electronAPI.send('open-tab-group-popup', { 
                        groupId: group.id, 
                        x: rect.left, 
                        y: rect.bottom + 5 
                    });
                };
                tabList.appendChild(header);
                processedGroups.add(tab.groupId);
            }
        }

        const group = tab.groupId ? tabGroups.find(g => g.id === tab.groupId) : null;
        const isCollapsed = group && group.collapsed;

        const el = document.createElement('div');
        el.className = `tab-item ${tab.id === activeTabId ? 'active' : ''} ${tab.groupId ? 'grouped' : ''} ${isCollapsed ? 'collapsed' : ''}`;
        if (tab.groupId && group) el.style.borderColor = group.color;
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
        el.oncontextmenu = (e) => {
            e.preventDefault();
            showTabContextMenu(e, tab.id);
        };
        
        const iconHtml = getTabIconHtml(tab, group ? group.color : null);
        
        el.innerHTML = `
            ${iconHtml}
            <span class="tab-title" style="${group ? `color: ${group.color}; opacity: 0.9;` : ''}">${tab.title || 'New Tab'}</span>
            ${tab.audible ? '<i class="fas fa-volume-high tab-audio-icon"></i>' : ''}
            <i class="fas fa-times tab-close" data-id="${tab.id}"></i>
        `;
        el.onclick = (e) => {
            if (e.target.classList.contains('tab-close')) return;
            activeTabId = tab.id;
            window.electronAPI.switchTab(tab.id);
            renderTabs();
            updatePageTimeChip(tab.id);
            updateMediaMasterIcon(tab.id);
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
    tabGroups = data.groups || [];
    const active = tabs.find(t => t.id === activeTabId);
    if (active && addressInput) {
        syncOmnibox(active.url);
        updatePageTimeChip(active.id);
    }
    if (lastSettings) applyGlobalSettings(lastSettings);
    renderTabs();
    if (activeTabId) updateMediaMasterIcon(activeTabId);
});

window.electronAPI.onUpdateURL((data) => {
    const tab = tabs.find(t => t.id === data.id);
    if (tab) { 
        tab.url = data.url; 
        tab.title = data.title;
        if (data.favicon) tab.favicon = data.favicon;
    }
    if (data.id === activeTabId && addressInput) {
        syncOmnibox(data.url);
        updatePageTimeChip(data.id);
        if (lastSettings) applyGlobalSettings(lastSettings);
        updateMediaMasterIcon(data.id); // Refresh for navigation
    }
    renderTabs();
});

window.electronAPI.onFaviconUpdated((data) => {
    const tab = tabs.find(t => t.id === data.id);
    if (tab) {
        tab.favicon = data.favicon;
        renderTabs();
    }
});

window.electronAPI.on('tab-audio-status-changed', (e, { id, isAudible }) => {
    const tab = tabs.find(t => t.id === id);
    if (tab) {
        tab.audible = isAudible;
        renderTabs();
    }
});

function syncOmnibox(url) {
    const isHome = !url || url.includes('home.html');
    const displayUrl = isHome ? '' : formatDisplayUrl(url);
    if (addressInput) addressInput.value = displayUrl;

    const identityBtn = document.getElementById('identity-btn');
    
    if (identityBtn) {
        if (isHome || url.startsWith('ocal://')) {
            identityBtn.style.display = 'none';
        } else {
            identityBtn.style.display = 'flex';
        }
    }
    
    updatePrettyUrl(displayUrl);
    updateOmniboxIcon(url);
    updateHeartStatus(url);
}

function updatePrettyUrl(url) {
    const prettyEl = document.getElementById('pretty-url');
    if (!prettyEl) return;
    if (!url) { prettyEl.innerHTML = ''; return; }

    if (url.startsWith('ocal://')) {
        const parts = url.split(' / ');
        if (parts.length > 1) {
            prettyEl.innerHTML = `<span class="protocol">ocal://</span><span class="domain">${parts[0].replace('ocal://', '')}</span><span class="path"> / ${parts[1]}</span>`;
        } else {
            prettyEl.innerHTML = `<span class="protocol">ocal://</span><span class="domain">${url.replace('ocal://', '')}</span>`;
        }
        return;
    }

    try {
        const urlObj = new URL(url.startsWith('http') || url.startsWith('file:') || url.startsWith('ocal:') ? url : 'https://' + url);
        const protocol = urlObj.protocol + '//';
        const domain = urlObj.hostname || (urlObj.protocol === 'file:' ? 'Local File' : '');
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        
        prettyEl.innerHTML = `<span class="protocol">${protocol}</span>${domain ? `<span class="domain">${domain}</span>` : ''}<span class="path">${path === '/' || path === '///' ? '' : path}</span>`;
    } catch (e) {
        prettyEl.innerText = url;
    }
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
    if (url.includes('settings.html')) {
        try {
            const hash = new URL(url).hash.replace('#', '');
            if (hash) {
                const section = hash.charAt(0).toUpperCase() + hash.slice(1);
                return `ocal://settings / ${section}`;
            }
        } catch(e) {}
        return 'ocal://settings';
    }
    if (url.includes('game.html')) return 'ocal://game';
    return url;
}

function getTabIconHtml(tab, tintColor) {
    if (tab.loading) {
        return `<i class="fas fa-circle-notch tab-favicon spinner" style="color:${tintColor || 'var(--accent)'}"></i>`;
    }
    if (tab.favicon) return `<img src="${tab.favicon}" class="tab-favicon">`;
    
    const url = tab.url;
    const accentColor = tintColor || 'var(--accent)';
    
    if (!url || url.includes('home.html')) return `<i class="fas fa-house tab-favicon" style="color:${accentColor}"></i>`;
    if (url.includes('settings.html')) return `<i class="fas fa-gear tab-favicon" style="color:${accentColor}"></i>`;
    if (url.includes('pdf-viewer.html') || url.endsWith('.pdf')) return `<i class="fas fa-file-pdf tab-favicon" style="color:${accentColor}"></i>`;
    if (url.includes('game.html')) return `<i class="fas fa-gamepad tab-favicon" style="color:${accentColor}"></i>`;
    
    // Search Engines
    if (url.includes('google.com')) return '<i class="fab fa-google tab-favicon" style="color:#4285F4"></i>';
    if (url.includes('bing.com')) return '<i class="fas fa-b tab-favicon" style="color:#00a1f1"></i>';
    if (url.includes('duckduckgo.com')) return '<i class="fas fa-shield-cat tab-favicon" style="color:#de5833"></i>';
    if (url.includes('brave.com')) return '<i class="fa-brands fa-brave tab-favicon" style="color:#ff1b2d"></i>';
    if (url.includes('yahoo.com')) return '<i class="fa-brands fa-yahoo tab-favicon" style="color:#6001d2"></i>';
    
    return `<i class="fas fa-globe tab-favicon" ${tintColor ? `style="color:${tintColor}"` : ''}></i>`;
}

function updateOmniboxIcon(url) {
    const iconContainer = document.querySelector('.omnibox-icon');
    if (!iconContainer) return;

    if (url && (url.includes('settings.html') || url.startsWith('ocal://settings'))) {
        iconContainer.innerHTML = '<i class="fas fa-gear" style="color:var(--accent)"></i>';
        return;
    }
    if (url && (url.includes('pdf-viewer.html') || url.endsWith('.pdf'))) {
        iconContainer.innerHTML = '<i class="fas fa-file-pdf" style="color:var(--accent)"></i>';
        return;
    }

    // specific search domains
    if (url && url.includes('google.com')) {
        iconContainer.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;
        return;
    }
    if (url && url.includes('bing.com')) {
        iconContainer.innerHTML = '<i class="fas fa-b" style="color:#00a1f1; font-size: 13px;"></i>';
        return;
    }
    if (url && url.includes('duckduckgo.com')) {
        iconContainer.innerHTML = '<i class="fas fa-shield-cat" style="color:#de5833; font-size: 13px;"></i>';
        return;
    }
    if (url && url.includes('brave.com')) {
        iconContainer.innerHTML = '<i class="fa-brands fa-brave" style="color:#ff1b2d; font-size: 14px;"></i>';
        return;
    }
    if (url && url.includes('yahoo.com')) {
        iconContainer.innerHTML = '<i class="fa-brands fa-yahoo" style="color:#6001d2; font-size: 14px;"></i>';
        return;
    }

    // Default: Show CURRENT SEARCH ENGINE icon if on home/internal
    const engine = lastSettings?.searchEngine || 'google';
    if (engine === 'google') {
        iconContainer.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;
    } else if (engine === 'bing') {
        iconContainer.innerHTML = '<i class="fas fa-b" style="color:#00a1f1; font-size:13px;"></i>';
    } else if (engine === 'duckduckgo') {
        iconContainer.innerHTML = '<i class="fas fa-shield-cat" style="color:#de5833; font-size:13px;"></i>';
    } else if (engine === 'brave') {
        iconContainer.innerHTML = '<i class="fa-brands fa-brave" style="color:#ff1b2d; font-size:14px;"></i>';
    } else if (engine === 'yahoo') {
        iconContainer.innerHTML = '<i class="fa-brands fa-yahoo" style="color:#6001d2; font-size:14px;"></i>';
    } else {
        iconContainer.innerHTML = '<i class="fas fa-magnifying-glass" style="color:var(--accent); font-size:13px;"></i>';
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
            if (lastSettings && lastSettings.instantSearchEnabled === false) return;
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

window.electronAPI.on('focus-address-bar', () => {
    if (addressInput) {
        addressInput.focus();
        addressInput.select();
    }
});

// ── Window Controls + Sidebar Buttons ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const minBtn   = document.getElementById('min-btn');
    const maxBtn   = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');
    if (minBtn)   minBtn.onclick   = () => window.electronAPI.minimize();
    if (maxBtn)   maxBtn.onclick   = () => window.electronAPI.maximize();
    if (closeBtn) closeBtn.onclick = () => window.electronAPI.close();

    // ── Navigation Controls ─────────────────────────────
    const backBtn    = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const reloadBtn  = document.getElementById('reload-btn');

    if (backBtn)    backBtn.onclick    = () => window.electronAPI.send('nav-back');
    if (forwardBtn) forwardBtn.onclick = () => window.electronAPI.send('nav-forward');
    if (reloadBtn)  reloadBtn.onclick  = () => window.electronAPI.send('nav-reload');

    window.electronAPI.onMaximized((isMax) => {
        document.body.classList.toggle('maximized', isMax);
        if (maxBtn) maxBtn.innerHTML = isMax
            ? '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3,0.5 H9.5 V7 M0.5,3 H7 V9.5 H0.5 Z" fill="none" stroke="currentColor" stroke-width="1"/></svg>'
            : '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor"/></svg>';
    });

    const aiBtn  = document.getElementById('ai-toolbar-btn');
    const bmBtn  = document.getElementById('bookmarks-sidebar-btn');
    const hiBtn  = document.getElementById('history-sidebar-btn');
    const mnBtn  = document.getElementById('burger-menu-btn');
    const dlBtn  = document.getElementById('download-icon-btn');
    const extBtn = document.getElementById('extensions-toolbar-btn');

    if (aiBtn) aiBtn.onclick = () => window.electronAPI.send('toggle-ai-sidebar');
    if (bmBtn) bmBtn.onclick = () => { window.electronAPI.send('toggle-sidebar', true); window.electronAPI.send('switch-sidebar-tab', 'bookmarks'); };
    if (hiBtn) hiBtn.onclick = () => { window.electronAPI.send('toggle-sidebar', true); window.electronAPI.send('switch-sidebar-tab', 'history'); };
    if (mnBtn) mnBtn.onclick = () => window.electronAPI.send('toggle-sidebar', true);
    
    if (extBtn) extBtn.onclick = () => {
        const rect = extBtn.getBoundingClientRect();
        window.electronAPI.send('show-extensions-dropdown', { x: rect.left, y: rect.bottom, width: rect.width });
    };
    
    // Wire to new dedicated Downloads Module
    if (dlBtn) dlBtn.onclick = () => { 
        const rect = dlBtn.getBoundingClientRect();
        window.electronAPI.send('toggle-downloads-popup', { x: rect.left, y: rect.bottom + 10 }); 
    };
    
    // Auto-reveal the popup when a background download starts
    window.electronAPI.on('open-downloads-popup-ui', () => {
        if (dlBtn) dlBtn.onclick();
    });

    const mediaBtn = document.getElementById('media-master-btn');
    if (mediaBtn) {
        mediaBtn.onclick = (e) => {
            e.stopPropagation();
            const rect = mediaBtn.getBoundingClientRect();
            window.electronAPI.send('show-media-popup', {
                x: rect.left,
                y: rect.bottom + 5,
                width: rect.width,
                tabId: activeTabId
            });
        };
    }

    const pipBtn = document.getElementById('pip-btn');
    if (pipBtn) pipBtn.onclick = () => window.electronAPI.send('trigger-smart-pip');

    window.electronAPI.on('video-detected', (e, detected) => {
        if (pipBtn) pipBtn.style.display = detected ? 'flex' : 'none';
        // Auto-hide PIP button after 10s if no update
        if (detected) {
            setTimeout(() => { if (pipBtn) pipBtn.style.display = 'none'; }, 10000);
        }
    });

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
        
        // Initial Power-Up Icon state
        const sStatus = document.getElementById('shield-status');
        const pStatus = document.getElementById('proxy-status');
        
        if (sStatus) {
            sStatus.style.display = 'flex';
            sStatus.classList.toggle('inactive', s.adBlockEnabled === false && s.trackingProtection === false);
            sStatus.onclick = (e) => {
                e.stopPropagation();
                const rect = sStatus.getBoundingClientRect();
                window.electronAPI.send('show-shield-popup', { 
                    x: rect.left, 
                    y: rect.top, 
                    width: rect.width, 
                    height: rect.height,
                    tabId: activeTabId
                });
            };
        }
        
        if (pStatus) {
            pStatus.style.display = s.vpnEnabled ? 'flex' : 'none';
            pStatus.onclick = (e) => {
                e.stopPropagation();
                const rect = pStatus.getBoundingClientRect();
                window.electronAPI.send('show-shield-popup', { 
                    x: rect.left, 
                    y: rect.top, 
                    width: rect.width, 
                    height: rect.height 
                });
            };
        }
    });
});

// ── Settings ───────────────────────────────────────────────────────────────
function applyGlobalSettings(s) {
    lastSettings = s;
    if (s.accentColor) document.documentElement.style.setProperty('--accent', s.accentColor);
    document.body.classList.toggle('compact-mode', !!s.compactMode);
    
    // Update Power-Up Icons
    const sStatus = document.getElementById('shield-status');
    const pStatus = document.getElementById('proxy-status');
    const aiBtn = document.getElementById('ai-toolbar-btn');

    if (sStatus) {
        sStatus.style.display = 'flex';
        sStatus.classList.toggle('inactive', s.adBlockEnabled === false && s.trackingProtection === false);
    }
    if (pStatus) pStatus.style.display = s.vpnEnabled ? 'flex' : 'none';
    if (aiBtn) aiBtn.style.display = s.aiAssistantEnabled ? 'flex' : 'none';
}

window.electronAPI.on('sync-bookmark-visibility', (isBmVisible) => {
    document.body.classList.toggle('hide-bookmarks', !isBmVisible);
});
window.electronAPI.onSettingsChanged((s) => {
    lastSettings = s;
    applyGlobalSettings(s);
    const active = tabs.find(t => t.id === activeTabId);
    if (active) updateOmniboxIcon(active.url);
});
function updatePageTimeChip(tabId) {
    window.electronAPI.invoke('get-shield-stats', tabId).then(stats => {
        const chip = document.getElementById('page-time-chip');
        if (!chip) return;

        if (stats && stats.page) {
            const total = (stats.page.ads || 0) + (stats.page.trackers || 0);
            if (total > 0) {
                const s = total * 0.05;
                chip.innerText = s < 1 ? s.toFixed(1) + 's' : Math.round(s) + 's';
                chip.style.display = 'inline-block';
            } else {
                chip.style.display = 'none';
            }
        } else {
            chip.style.display = 'none';
        }
    });
}
window.electronAPI.on('shield-stats-updated', (e, stats) => {
    if (stats.webContentsId === activeTabId && stats.page) {
        const total = (stats.page.ads || 0) + (stats.page.trackers || 0);
        const chip = document.getElementById('page-time-chip');
        if (chip) {
            if (total > 0) {
                const s = total * 0.05;
                chip.innerText = s < 1 ? s.toFixed(1) + 's' : Math.round(s) + 's';
                chip.style.display = 'inline-block';
            } else {
                chip.style.display = 'none';
            }
        }
    }
});

function updateMediaMasterIcon(tabId) {
    window.electronAPI.invoke('get-tab-media', tabId).then(list => {
        const btn = document.getElementById('media-master-btn');
        const chip = document.getElementById('media-count-chip');
        if (!btn || !chip) return;

        if (list && list.length > 0) {
            btn.style.display = 'flex';
            chip.innerText = list.length;
        } else {
            btn.style.display = 'none';
        }
    });
}

window.electronAPI.on('media-master-updated', (e, { tabId, mediaList }) => {
    if (tabId === activeTabId) {
        const btn = document.getElementById('media-master-btn');
        const chip = document.getElementById('media-count-chip');
        if (!btn || !chip) return;

        if (mediaList && mediaList.length > 0) {
            btn.style.display = 'flex';
            chip.innerText = mediaList.length;
        } else {
            btn.style.display = 'none';
        }
    }
});

// ── YouTube Specific Trigger Bridge ──
window.addEventListener('trigger-media-popup-internal', () => {
    const btn = document.getElementById('media-master-btn');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        window.electronAPI.send('show-media-popup', {
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.bottom),
            width: Math.round(rect.width),
            tabId: activeTabId
        });
    }
});

window.electronAPI.getSettings().then(s => applyGlobalSettings(s));

window.electronAPI.on('proxy-error', (e, data) => {
    showToast(`Proxy Unstable: ${data.region.toUpperCase()} timed out. Try another region.`, 'fa-circle-exclamation');
});

// ── Bookmark Bar ───────────────────────────────────────────────────────────
function showFolderDropdown(e, folderId) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    const folderBms = folderId === 'all' 
        ? currentBookmarks 
        : currentBookmarks.filter(b => b.folderId === folderId);

    window.electronAPI.send('show-bm-dropdown', {
        x: rect.left,
        y: rect.bottom + 5,
        bookmarks: folderBms,
        folderId: folderId
    });
}

function renderBookmarkBar() {
    if (!bookmarkBar) return;
    bookmarkBar.innerHTML = '';

    // Web folder — always first
    const webFolder = document.createElement('div');
    webFolder.className = 'web-folder';
    webFolder.id = 'web-folder-btn';
    webFolder.innerHTML = `<i class="fas fa-folder"></i><span>Saves</span><i class="fas fa-chevron-down" style="font-size:7px;opacity:0.5;margin-left:4px;"></i>`;
    webFolder.onclick = (e) => showFolderDropdown(e, 'all');
    bookmarkBar.appendChild(webFolder);

    if (currentBookmarks.length > 0 || currentFolders.length > 0) {
        const sep = document.createElement('div');
        sep.style.cssText = 'width:1px;height:14px;background:rgba(255,255,255,0.08);margin:0 6px;flex-shrink:0;align-self:center';
        bookmarkBar.appendChild(sep);
    }

    // Folders from saved data
    currentFolders.forEach(f => {
        if (f.name.toLowerCase() === 'web') return; // Skip if named Web (we use 'Saves' above)
        const el = document.createElement('div');
        el.className = 'bookmark-bar-folder';
        el.innerHTML = `<i class="fas fa-folder"></i><span>${f.name}</span><i class="fas fa-chevron-down" style="font-size:7px;opacity:0.5;margin-left:4px;"></i>`;
        el.onclick = (e) => showFolderDropdown(e, f.id);
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
        !e.target.closest('.bookmark-bar') &&
        !e.target.closest('.custom-context-menu')) {
        window.electronAPI.send('close-all-sidebars');
        window.electronAPI.send('hide-tab-group-popup');
        window.electronAPI.send('hide-downloads-popup');
        hideContextMenu();
    }
});

// ── Context Menus ──────────────────────────────────────────────────────
function showTabContextMenu(e, tabId) {
    const tab = tabs.find(t => t.id === tabId);
    const menu = createContextMenu(e);
    
    // Group options
    if (tab.groupId) {
        addMenuOption(menu, 'Remove from Group', 'fa-object-ungroup', () => {
            window.electronAPI.send('remove-from-group', tabId);
            hideContextMenu();
        });
    } else {
        const groupSub = addMenuSub(menu, 'Add to Group', 'fa-object-group');
        addMenuOption(groupSub, 'New Group', 'fa-plus', () => {
            window.electronAPI.send('create-tab-group', { name: 'New Group', color: '#a855f7', tabIds: [tabId] });
            hideContextMenu();
        });
        tabGroups.forEach(g => {
            addMenuOption(groupSub, g.name, 'fa-circle', () => {
                window.electronAPI.send('add-to-group', { tabId, groupId: g.id });
                hideContextMenu();
            }, g.color);
        });
    }

    addMenuSeparator(menu);
    addMenuOption(menu, 'Close Tab', 'fa-xmark', () => {
        window.electronAPI.send('close-tab', tabId);
        hideContextMenu();
    });
}

function showGroupContextMenu(e, group) {
    // Legacy - replaced by tabgroup.html popup
}

function createContextMenu(e) {
    hideContextMenu();
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    document.body.appendChild(menu);
    return menu;
}

function addMenuOption(parent, label, icon, onClick, color) {
    const opt = document.createElement('div');
    opt.className = 'menu-option';
    opt.innerHTML = `<i class="fas ${icon}" style="${color ? 'color:'+color : ''}"></i> <span>${label}</span>`;
    opt.onclick = onClick;
    parent.appendChild(opt);
}

function addMenuSub(parent, label, icon) {
    const opt = document.createElement('div');
    opt.className = 'menu-option has-sub';
    opt.innerHTML = `<i class="fas ${icon}"></i> <span>${label}</span> <i class="fas fa-chevron-right" style="font-size:8px; margin-left:auto;"></i>`;
    const sub = document.createElement('div');
    sub.className = 'menu-sub';
    opt.appendChild(sub);
    parent.appendChild(opt);
    return sub;
}

function addMenuSeparator(parent) {
    const sep = document.createElement('div');
    sep.className = 'menu-separator';
    parent.appendChild(sep);
}

function hideContextMenu() {
    const old = document.querySelector('.custom-context-menu');
    if (old) old.remove();
}

window.electronAPI.send('request-tabs');

// ── Site Info Popup Logic ───────────────────────────────────────────────────
const identityBtn = document.getElementById('identity-btn');

if (identityBtn) {
    identityBtn.onclick = (e) => {
        e.stopPropagation();
        const rect = identityBtn.getBoundingClientRect();
        // Request the main process to show the modular site info popup
        window.electronAPI.send('show-site-info', {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        });
    };
}
