// ── State ──────────────────────────────────────────────────────────────────
let currentTab = 'bookmarks';
let bookmarks = [];
let folders = [];
let historyItems = [];
let downloadItems = [];
let searchFilter = '';
let currentSettings = {};
let expandedFolders = new Set();
let currentFolderId = null;
let dragSrc = null; // { type: 'bookmark'|'folder', id }
let activeTabs = [];
let activeTabId = null;

const sidebar   = document.getElementById('sidebar');
const backdrop  = document.getElementById('backdrop');
const sbTitle   = document.getElementById('sb-title');
const sbContent = document.getElementById('sb-content');
const sbSearch  = document.getElementById('sb-search');
const bmToolbar = document.getElementById('bm-toolbar');
const tabBtns   = document.querySelectorAll('.tab-pill');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// ── Sidebar open/close ─────────────────────────────────────────────────────
let isClosingSidebar = false;

function openSidebar() {
    isClosingSidebar = false;
    sidebar.classList.remove('closing');
    backdrop.classList.remove('closing');
    sidebar.classList.add('open');
    backdrop.classList.add('show');
}

function closeSidebar() {
    if (!sidebar.classList.contains('open') && !backdrop.classList.contains('show')) {
        window.electronAPI.send?.('sidebar-exit-complete');
        return;
    }
    if (isClosingSidebar) return;
    isClosingSidebar = true;

    sidebar.classList.remove('open');
    sidebar.classList.add('closing');
    backdrop.classList.remove('show');
    backdrop.classList.add('closing');

    setTimeout(() => {
        isClosingSidebar = false;
        sidebar.classList.remove('closing');
        backdrop.classList.remove('closing');
        window.electronAPI.send?.('sidebar-exit-complete');
    }, 280);
}

// ── Tab switching ──────────────────────────────────────────────────────────
tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        showModal({
            title: 'Clear History',
            message: 'Are you sure you want to permanently clear all browsing history?',
            onConfirm: () => window.electronAPI.send('clear-history')
        });
    });
}

function switchTab(id) {
    currentTab = id;
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    const titles = { bookmarks: 'Saves', history: 'History', downloads: 'Files' };
    sbTitle.textContent = titles[id] || id;
    bmToolbar.style.display = id === 'bookmarks' ? 'flex' : 'none';
    
    const dlToolbar = document.getElementById('dl-toolbar');
    if (dlToolbar) dlToolbar.style.display = id === 'downloads' ? 'flex' : 'none';

    if (clearHistoryBtn) {
        clearHistoryBtn.style.display = (id === 'history' && historyItems.length > 0) ? 'flex' : 'none';
    }
    const openDlFolderBtn = document.getElementById('open-dl-folder-btn');
    if (openDlFolderBtn) {
        openDlFolderBtn.style.display = id === 'downloads' ? 'flex' : 'none';
    }
    const clearDlBtn = document.getElementById('clear-downloads-btn');
    if (clearDlBtn) {
        clearDlBtn.style.display = (id === 'downloads' && downloadItems.length > 0) ? 'flex' : 'none';
    }

    sbSearch.placeholder = `Search ${titles[id] || id}...`;
    render();
}

sbSearch.addEventListener('input', e => { searchFilter = e.target.value.toLowerCase(); render(); });

// ── IPC listeners ──────────────────────────────────────────────────────────
window.electronAPI.onToggleSidebar((e, open) => {
    if (open) openSidebar(); else closeSidebar();
});

window.electronAPI.on?.('start-sidebar-exit', () => {
    closeSidebar();
});

window.electronAPI.onSwitchTab((tab) => {
    switchTab(tab);
    openSidebar();
});

window.electronAPI.onBookmarksChanged((data) => {
    bookmarks = data.bookmarks || [];
    folders   = data.folders   || [];
    // If current folder was deleted, go back to root
    if (currentFolderId && !folders.some(f => f.id === currentFolderId)) currentFolderId = null;
    if (currentTab === 'bookmarks') render();
});

// ── Custom Modal Logic ──────────────────────────────────────────
const modalOverlay = document.getElementById('modal-overlay');
const modalContainer = document.getElementById('modal-container');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalConfirmBtn = document.getElementById('modal-confirm');
const modalCancelBtn = document.getElementById('modal-cancel');

let modalCallback = null;

function showModal({ title, message, onConfirm, onCancel }) {
    modalTitle.textContent = title || 'Confirm';
    modalBody.textContent = message || '';
    modalOverlay.classList.add('active');
    
    const cleanup = () => {
        modalOverlay.classList.remove('active');
        modalConfirmBtn.onclick = null;
        modalCancelBtn.onclick = null;
        
        // If no sidebar is currently open, we must notify the main process to 
        // release the interaction layer so the browser remains clickable.
        if (sidebar && !sidebar.classList.contains('open')) {
            window.electronAPI.send('close-all-sidebars');
        }
    };

    modalConfirmBtn.onclick = () => {
        cleanup();
        if (onConfirm) onConfirm();
    };
    modalCancelBtn.onclick = () => {
        cleanup();
        if (onCancel) onCancel();
    };

    // Auto-focus confirm
    setTimeout(() => modalConfirmBtn.focus(), 50);
}

// ── IPC Listeners ────────────────────────────────────────────────
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

window.electronAPI.onShowModal((data) => showModal(data));

function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

window.electronAPI.onSettingsChanged((s) => {
    currentSettings = s || {};
    historyItems = currentSettings.history || [];
    const theme = currentSettings.themeMode || localStorage.getItem('ocal-settings-theme') || 'light';
    const isLight = theme === 'light';
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (window.OcalColorHarmonizer && currentSettings.accentColor) {
        window.OcalColorHarmonizer.applyHarmonizedTheme(currentSettings.accentColor, theme);
    } else if (currentSettings.accentColor) {
        const activeAccent = getModeAccent(currentSettings.accentColor, isLight);
        document.documentElement.style.setProperty('--accent', activeAccent);
        document.documentElement.style.setProperty('--accent-glow', hexToRgba(activeAccent, 0.35));
        document.documentElement.style.setProperty('--accent-dim', hexToRgba(activeAccent, 0.12));
        document.documentElement.style.setProperty('--accent-border', hexToRgba(activeAccent, 0.28));
    }
    if (currentTab === 'history') render();
});

window.electronAPI.onDownloadUpdated((data) => {
    downloadItems = data || [];
    updateDownloadBadge();
    if (currentTab === 'downloads') updateOrRenderDownloads();
});

window.electronAPI.onTabsChanged((data) => {
    activeTabs = data.tabs || [];
    activeTabId = data.activeTabId;
    if (currentTab === 'history') render();
});

// close-all-sidebars from main
window.electronAPI.onCloseAllSidebars(() => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    hideScreenshotToolbar();
});

// ── Screenshot Toolbar Logic ──────────────────────────────
const ssToolbar = document.getElementById('ss-toolbar');

window.electronAPI.on('show-screenshot-toolbar', (data) => {
    if (!ssToolbar) return;
    ssToolbar.style.display = 'flex';
    
    setTimeout(() => {
        document.addEventListener('click', (e) => {
            if (!ssToolbar.contains(e.target)) hideScreenshotToolbar();
        }, { once: true });
    }, 0);
});

function hideScreenshotToolbar() {
    if (ssToolbar && ssToolbar.style.display === 'flex') {
        ssToolbar.style.display = 'none';
        window.electronAPI.send('close-all-sidebars');
    }
}

window.electronAPI.on('show-exit-modal', () => {
    showModal({
        title: 'Confirm Exit',
        message: 'Are you sure you want to close Ocal? All your active tabs will be lost.',
        onConfirm: () => window.electronAPI.send('execute-app-quit')
    });
});

window.handleSS = (type) => {
    if (ssToolbar) ssToolbar.style.display = 'none';
    // Tiny delay to ensure it's gone from DOM/painting before capture
    setTimeout(() => {
        window.electronAPI.send('capture-screenshot', type);
        window.electronAPI.send('close-all-sidebars');
    }, 50);
};

// ── Initial load ───────────────────────────────────────────────────────────
window.electronAPI.getSettings().then(s => {
    currentSettings = s || {};
    historyItems = currentSettings.history || [];
    bookmarks    = currentSettings.bookmarks || [];
    folders      = currentSettings.folders   || [];
    const theme = currentSettings.themeMode || localStorage.getItem('ocal-settings-theme') || 'light';
    const isLight = theme === 'light';
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (window.OcalColorHarmonizer && currentSettings.accentColor) {
        window.OcalColorHarmonizer.applyHarmonizedTheme(currentSettings.accentColor, theme);
    } else if (currentSettings.accentColor) {
        const activeAccent = getModeAccent(currentSettings.accentColor, isLight);
        document.documentElement.style.setProperty('--accent', activeAccent);
        document.documentElement.style.setProperty('--accent-glow', hexToRgba(activeAccent, 0.35));
        document.documentElement.style.setProperty('--accent-dim', hexToRgba(activeAccent, 0.12));
        document.documentElement.style.setProperty('--accent-border', hexToRgba(activeAccent, 0.28));
    }
    
    // Fetch downloads too
    window.electronAPI.getDownloads().then(dl => {
        downloadItems = dl || [];
        render();
    });
});
// Settings nav button
const settingsNavBtn = document.getElementById('settings-nav-btn');
if (settingsNavBtn) {
    settingsNavBtn.onclick = () => {
        window.electronAPI.navigateTo('settings');
        closeSidebar();
    };
}


// ── Master render ──────────────────────────────────────────────────────────
function render() {
    sbContent.innerHTML = '';
    if (currentTab === 'bookmarks') renderBookmarks();
    else if (currentTab === 'history')   renderHistory();
    else if (currentTab === 'downloads') renderDownloads();

    if (!sbContent.children.length) {
        if (currentTab === 'bookmarks') {
            sbContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bookmark"></i>
                    <div class="empty-title">${searchFilter ? 'No matching saves' : 'No saves yet'}</div>
                    <div class="empty-sub">${searchFilter ? 'Try searching for something else' : 'Save your favorite bookmarks to access them quickly anytime'}</div>
                </div>`;
        } else if (currentTab === 'history') {
            sbContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock-rotate-left"></i>
                    <div class="empty-title">${searchFilter ? 'No matching history' : 'No history yet'}</div>
                    <div class="empty-sub">${searchFilter ? 'No visited pages match your search term' : 'Websites and pages you browse will appear here'}</div>
                </div>`;
        } else if (currentTab === 'downloads') {
            sbContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-arrow-down"></i>
                    <div class="empty-title">${searchFilter ? 'No matching files' : 'No downloaded files'}</div>
                    <div class="empty-sub">${searchFilter ? 'Try searching with a different file name' : 'Files you download will appear here for easy access'}</div>
                </div>`;
        } else {
            sbContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ghost"></i>
                    <div class="empty-title">Nothing here yet</div>
                </div>`;
        }
    }
}

// ── Bookmarks ──────────────────────────────────────────────────────────────
function renderBookmarks() {
    const q = searchFilter;

    // If viewing a specific folder
    if (currentFolderId && !q) {
        const f = folders.find(folder => folder.id === currentFolderId);
        if (f) {
            const backRow = document.createElement('div');
            backRow.className = 'bm-back-row';
            backRow.innerHTML = `<i class="fas fa-arrow-left"></i> Back to Saves`;
            backRow.onclick = () => { currentFolderId = null; render(); };
            sbContent.appendChild(backRow);

            const crumbs = document.createElement('div');
            crumbs.className = 'bm-breadcrumb';
            crumbs.innerHTML = `Saves <i class="fas fa-chevron-right"></i> ${esc(f.name)}`;
            sbContent.appendChild(crumbs);

            const folderBms = bookmarks.filter(b => b.folderId === f.id);
            if (folderBms.length === 0) {
                sbContent.innerHTML += `<div class="empty-state" style="padding:60px 20px"><i class="fas fa-folder-open"></i><p>This folder is empty</p></div>`;
            } else {
                folderBms.forEach(bm => sbContent.appendChild(buildBookmarkItem(bm, false)));
            }
            return;
        }
    }

    // Root View / Search View
    // 1. Folders
    folders.forEach(f => {
        const folderBms = bookmarks.filter(b => b.folderId === f.id);
        if (q && !f.name.toLowerCase().includes(q) && !folderBms.some(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))) return;

        const wrap = document.createElement('div');
        wrap.className = 'bm-folder';
        wrap.dataset.folderId = f.id;

        const hdr = document.createElement('div');
        hdr.className = 'bm-folder-hdr';
        hdr.draggable = true;
        hdr.innerHTML = `
            <i class="fas fa-folder bm-folder-icon"></i>
            <span class="bm-folder-name">${esc(f.name)}</span>
            <span class="bm-folder-count">${folderBms.length}</span>
            <div class="bm-folder-actions">
                <button class="icon-btn" id="rename-f-${f.id}" title="Rename"><i class="fas fa-pen"></i></button>
                <button class="icon-btn del" id="delete-f-${f.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `;

        const renBtn = hdr.querySelector(`#rename-f-${f.id}`);
        const delBtn = hdr.querySelector(`#delete-f-${f.id}`);
        if (renBtn) renBtn.onclick = (e) => { e.stopPropagation(); renameFolder(f.id, renBtn); };
        if (delBtn) delBtn.onclick = (e) => { e.stopPropagation(); deleteFolder(f.id); };

        hdr.onclick = (e) => {
            if (e.target.closest('.bm-folder-actions')) return;
            currentFolderId = f.id;
            render();
        };

        wrap.appendChild(hdr);
        sbContent.appendChild(wrap);
    });

    // 2. Loose bookmarks
    const loose = bookmarks.filter(b => !b.folderId);
    const filtered = q ? loose.filter(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) : loose;

    if (filtered.length && folders.length) {
        const lbl = document.createElement('div');
        lbl.className = 'bm-section-label';
        lbl.innerHTML = `<i class="fas fa-bookmark"></i>Other Bookmarks`;
        sbContent.appendChild(lbl);
    }

    filtered.forEach(bm => sbContent.appendChild(buildBookmarkItem(bm, false)));
}

function buildBookmarkItem(bm, indented) {
    const el = document.createElement('div');
    el.className = `bm-item${indented ? ' indented' : ''}`;
    el.draggable = true;
    el.dataset.bmId = bm.id;

    const domain = (() => { try { return new URL(bm.url).hostname; } catch { return ''; } })();
    el.innerHTML = `
        <i class="fas fa-grip-vertical bm-drag-handle"></i>
        <img class="bm-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.style.display='none'">
        <div class="bm-info">
            <div class="bm-title">${esc(bm.title)}</div>
            <div class="bm-url">${esc(domain)}</div>
        </div>
        <div class="bm-item-actions">
            <button class="icon-btn edit-btn" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="icon-btn move-btn" title="Move to folder"><i class="fas fa-folder-open" style="font-size:10px"></i></button>
            <button class="icon-btn del-btn" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
    `;

    const eBtn = el.querySelector('.edit-btn');
    const mBtn = el.querySelector('.move-btn');
    const dBtn = el.querySelector('.del-btn');
    
    if (eBtn) eBtn.onclick = (e) => { e.stopPropagation(); editBookmark(bm.id, eBtn); };
    if (mBtn) mBtn.onclick = (e) => { e.stopPropagation(); showMoveMenu(e, bm.id); };
    if (dBtn) dBtn.onclick = (e) => { e.stopPropagation(); deleteBookmark(bm.url); };

    el.addEventListener('click', (e) => {
        if (e.target.closest('.bm-item-actions') || e.target.closest('.bm-drag-handle')) return;
        window.electronAPI.navigateTo(bm.url);
        closeSidebar();
    });

    // Drag-to-reorder
    el.addEventListener('dragstart', e => {
        dragSrc = { type: 'bookmark', id: bm.id };
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', e => {
        e.preventDefault();
        const mid = el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
        el.classList.remove('drag-over-top', 'drag-over-bottom');
        el.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over-top', 'drag-over-bottom'));
    el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over-top', 'drag-over-bottom');
        if (dragSrc?.type === 'bookmark' && dragSrc.id !== bm.id) {
            window.electronAPI.send('reorder-bookmark', { draggedId: dragSrc.id, targetId: bm.id });
        }
        dragSrc = null;
    });

    return el;
}

// ── Bookmark actions ───────────────────────────────────────────────────────
function editBookmark(id, btn) {
    const titleEl = btn.closest('.bm-item').querySelector('.bm-title');
    titleEl.contentEditable = true;
    titleEl.focus();
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    const save = () => {
        titleEl.contentEditable = false;
        window.electronAPI.send('edit-bookmark', { id, title: titleEl.textContent.trim() });
    };
    titleEl.addEventListener('blur', save, { once: true });
    titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } }, { once: true });
}

function deleteBookmark(url) {
    window.electronAPI.send('remove-bookmark', url);
}

function showMoveMenu(e, bmId) {
    e.stopPropagation();
    closeCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.id = 'ctx-menu';

    if (folders.length === 0) {
        menu.innerHTML = `<div class="ctx-item" style="color:#555;cursor:default"><i class="fas fa-info-circle"></i>No folders yet</div>`;
    } else {
        folders.forEach(f => {
            const item = document.createElement('div');
            item.className = 'ctx-item';
            item.innerHTML = `<i class="fas fa-folder"></i>${esc(f.name)}`;
            item.onclick = () => { window.electronAPI.send('edit-bookmark', { id: bmId, folderId: f.id }); closeCtxMenu(); };
            menu.appendChild(item);
        });
        const sep = document.createElement('div'); sep.className = 'ctx-sep'; menu.appendChild(sep);
        const removeFolder = document.createElement('div');
        removeFolder.className = 'ctx-item';
        removeFolder.innerHTML = `<i class="fas fa-times"></i>Remove from folder`;
        removeFolder.onclick = () => { window.electronAPI.send('edit-bookmark', { id: bmId, folderId: null }); closeCtxMenu(); };
        menu.appendChild(removeFolder);
    }

    document.body.appendChild(menu);
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 10);
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    setTimeout(() => document.addEventListener('click', closeCtxMenu, { once: true }), 0);
}

function closeCtxMenu() {
    const m = document.getElementById('ctx-menu');
    if (m) m.remove();
}

function addFolder() {
    // Use inline input instead of prompt() (blocked in Electron)
    const existing = document.getElementById('new-folder-input-row');
    if (existing) { existing.remove(); return; }

    const row = document.createElement('div');
    row.id = 'new-folder-input-row';
    row.className = 'new-folder-row';
    row.innerHTML = `
        <input id="new-folder-name" class="new-folder-input" type="text" placeholder="Folder name...">
        <button id="new-folder-confirm" class="new-folder-btn">Add</button>
    `;

    // Insert before the panel-body
    const body = document.getElementById('sb-content');
    body.parentNode.insertBefore(row, body);

    const input = document.getElementById('new-folder-name');
    const confirm = document.getElementById('new-folder-confirm');
    input.focus();

    const submit = () => {
        const name = input.value.trim();
        if (name) window.electronAPI.send('add-folder', { name });
        row.remove();
    };
    confirm.onclick = submit;
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') row.remove();
    });
}

function renameFolder(id, btn) {
    const nameEl = btn.closest('.bm-folder-hdr').querySelector('.bm-folder-name');
    nameEl.contentEditable = true;
    nameEl.focus();
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    const save = () => {
        nameEl.contentEditable = false;
        window.electronAPI.send('edit-folder', { id, name: nameEl.textContent.trim() });
    };
    nameEl.addEventListener('blur', save, { once: true });
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } }, { once: true });
}

function deleteFolder(id) {
    showModal({
        title: 'Delete Folder',
        message: 'Delete this folder and all its bookmarks?',
        onConfirm: () => window.electronAPI.send('remove-folder', id)
    });
}

function sortBookmarks() {
    const sorted = [...bookmarks].sort((a, b) => a.title.localeCompare(b.title));
    sorted.forEach((bm, i) => {
        if (bookmarks[i]?.id !== bm.id) {
            window.electronAPI.send('reorder-bookmark', { draggedId: bm.id, targetId: bookmarks[i]?.id });
        }
    });
}

// ── History ────────────────────────────────────────────────────────────────
function getHistoricalIcon(url, title = '', storedIcon = '') {
    const u = String(url || '').toLowerCase();
    
    // 1. Internal Ocal Settings/System Pages
    if (u.includes('extension-store.html') || u.includes('ocal://store') || u.includes('ocal://webstore')) {
        return `<div class="hist-favicon" style="background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-store" style="font-size:11px"></i></div>`;
    }
    if (u.includes('extensions.html') || u.includes('ocal://extensions')) {
        return `<div class="hist-favicon" style="background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-puzzle-piece" style="font-size:11px"></i></div>`;
    }
    if (u.includes('settings.html') || u.includes('ocal://settings')) {
        return `<div class="hist-favicon" style="background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-gear" style="font-size:11px"></i></div>`;
    }
    if (u.includes('home.html') || u.includes('ocal://home') || u === 'ocal://') {
        return `<div class="hist-favicon" style="background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-house" style="font-size:11px"></i></div>`;
    }
    if (u.includes('pdf-viewer.html') || u.includes('.pdf') || u.includes('ocal://pdf')) {
        return `<div class="hist-favicon" style="background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-file-pdf" style="font-size:11px"></i></div>`;
    }
    if (u.includes('sidebars.html') || u.includes('ocal://history') || u.includes('ocal://saves')) {
        return `<div class="hist-favicon" style="background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-clock-rotate-left" style="font-size:11px"></i></div>`;
    }

    // 2. Proactive stored favicon usage
    if (storedIcon) {
        return `<img class="hist-favicon" src="${storedIcon}" 
                onerror="const d=document.createElement('div'); d.className='hist-favicon-fallback'; d.innerHTML='<i class=\\'fas fa-globe\\'></i>'; this.replaceWith(d);">`;
    }

    // 3. Extracted domain for normal websites (Fallback to Google Service)
    let domain = '';
    try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
        if (urlObj.protocol === 'file:') domain = '';
    } catch {}

    if (!domain) {
        return `<div class="hist-favicon-fallback"><i class="fas fa-globe"></i></div>`;
    }

    return `<img class="hist-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" 
            onerror="const d=document.createElement('div'); d.className='hist-favicon-fallback'; d.innerHTML='<i class=\\'fas fa-globe\\'></i>'; this.replaceWith(d);">`;
}

// ── History ────────────────────────────────────────────────────────────────

function getDisplayTitle(item) {
    if (!item) return '';
    const rawUrl = item.url || '';
    let title = (item.title || '').trim();

    // 1. Try to extract search query if it is a search engine URL
    try {
        const u = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
        const host = u.hostname.toLowerCase().replace(/^www\./i, '');
        const path = u.pathname.toLowerCase();

        const isSearchEngine = host.includes('google.') || host.includes('bing.') || host.includes('duckduckgo.') ||
                               host.includes('brave.com') || host.includes('yahoo.') || host.includes('ecosia.org') ||
                               host.includes('kagi.com') || host.includes('startpage.com') || host.includes('qwant.com') ||
                               host.includes('searx') || host.includes('youtube.com') || path.includes('/search') || path.includes('/results');

        if (isSearchEngine) {
            const params = ['q', 'query', 'search_query', 'oq', 'p', 'search', 'term', 'k'];
            for (const param of params) {
                const val = u.searchParams.get(param);
                if (val && val.trim()) {
                    let cleaned = decodeURIComponent(val.replace(/\+/g, ' ')).trim();
                    if (cleaned) {
                        return cleaned;
                    }
                }
            }
        }
    } catch {}

    // 2. If title has " - Google Search" or similar, strip search engine suffix
    if (title) {
        title = title.replace(/\s*[-–—|•]\s*(Google Search|Google|YouTube|Bing|DuckDuckGo|Yahoo Search|Brave Search)$/i, '').trim();
    }

    // 3. If title is still just the raw URL or starts with http/www or contains /search?
    if (!title || title === rawUrl || title.startsWith('http://') || title.startsWith('https://') || title.includes('/search?') || title.includes('/results?')) {
        try {
            const u = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
            if (u.pathname && u.pathname !== '/') {
                return decodeURIComponent(u.pathname.replace(/^\//, '') + u.search);
            }
            return u.hostname.replace(/^www\./i, '');
        } catch {
            return rawUrl;
        }
    }

    return title;
}

function renderHistory() {
    const q = searchFilter;
    const items = historyItems.filter(h => {
        const u = String(h.url || '').toLowerCase();
        if (u.endsWith('.pdf') || u.includes('.pdf?') || u.includes('pdf-viewer.html') || u.includes('ocal://pdf-viewer')) {
            return false;
        }
        if (q) {
            const disp = getDisplayTitle(h).toLowerCase();
            return h.title?.toLowerCase().includes(q) || h.url?.toLowerCase().includes(q) || disp.includes(q);
        }
        return true;
    });

    if (items.length === 0) {
        sbContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock-rotate-left"></i>
                <div class="empty-title">${searchFilter ? 'No matching history' : 'No history yet'}</div>
                <div class="empty-sub">${searchFilter ? 'No visited pages match your search term' : 'Websites and pages you browse will appear here'}</div>
            </div>`;
        if (clearHistoryBtn) clearHistoryBtn.style.display = 'none';
        return;
    }

    // 1. Open Tabs Section (Opera-Style Grouped Card)
    if (!q && activeTabs.length > 0) {
        const openWrap = document.createElement('div');
        openWrap.className = 'hist-open-tabs';
        openWrap.innerHTML = `<div class="hist-date-label"><i class="fas fa-layer-group"></i>Open Tabs</div><div class="hist-date-card"></div>`;
        const list = openWrap.querySelector('.hist-date-card');
        
        activeTabs.forEach(tab => {
            const domain = (() => { try { return new URL(tab.url).hostname.replace(/^www\./i, ''); } catch { return ''; } })();
            const isCurrent = tab.id === activeTabId;
            const item = document.createElement('div');
            item.className = `hist-row ${isCurrent ? 'active-tab-entry current-active' : ''}`;
            
            const iconHtml = getHistoricalIcon(tab.url, tab.title, tab.favicon);

            item.innerHTML = `
                <span class="hist-row-time" style="color:var(--accent);font-weight:700;font-size:10px;letter-spacing:0.04em;">${isCurrent ? 'ACTIVE' : 'TAB'}</span>
                <div class="hist-row-icon">${iconHtml}</div>
                <div class="hist-row-content">
                    <span class="hist-row-domain">${esc(domain || 'ocal://')}</span>
                    <span class="hist-row-title">${esc(tab.title || 'New Tab')}</span>
                </div>
                <span class="open-tab-switch-badge"><i class="fas fa-arrow-right"></i></span>
            `;
            item.onclick = () => {
                window.electronAPI.send('switch-tab', tab.id);
                closeSidebar();
            };
            list.appendChild(item);
        });
        sbContent.appendChild(openWrap);
    }

    // 2. Quick Access / Recommendations (High Resolution Native Web Icons)
    const GOOGLE_SVG = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;
    const YOUTUBE_SVG = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;

    function getHighResWebIcon(dom) {
        const d = String(dom || '').toLowerCase().replace(/^www\./, '');
        
        // 1. Internal Ocal System / Home
        if (d.startsWith('ocal:settings')) {
            return '<i class="fas fa-gear" style="color:var(--accent);font-size:15px;"></i>';
        }
        if (d.startsWith('ocal:home') || d === 'ocal:' || d.includes('ocalsoftware')) {
            return '<img src="assets/icon.png" class="recom-web-icon" alt="Ocal" onerror="this.replaceWith(Object.assign(document.createElement(\'i\'), {className: \'fas fa-compass\', style: \'color:var(--accent);font-size:15px;\'}));">';
        }

        // 2. Official High-Resolution Multi-Color Vector SVGs
        if (d.includes('google.') && !d.includes('chrome') && !d.includes('drive')) {
            return GOOGLE_SVG;
        }
        if (d.includes('youtube.') || d.includes('youtu.be')) {
            return YOUTUBE_SVG;
        }
        if (d.includes('chromewebstore') || d.includes('chrome.google.com')) {
            return '<img src="https://ssl.gstatic.com/chrome/webstore/images/icon_144px.png" class="recom-web-icon" alt="Chrome Web Store" onerror="this.onerror=null; this.src=\'https://www.google.com/s2/favicons?domain=chromewebstore.google.com&sz=128\';">';
        }

        // 3. Stored High-Resolution Native Favicon from Visited Pages
        let storedFavicon = '';
        for (const h of historyItems) {
            if (!h || !h.url || !h.favicon) continue;
            try {
                const u = new URL(h.url);
                if (u.hostname.toLowerCase().replace(/^www\./, '') === d) {
                    storedFavicon = h.favicon;
                    break;
                }
            } catch {}
        }

        if (storedFavicon) {
            return `<img src="${storedFavicon}" class="recom-web-icon" alt="${d}" onerror="this.onerror=null; this.src='https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128'; this.onerror=function(){ this.replaceWith(Object.assign(document.createElement('i'), {className: 'fas fa-globe', style: 'color:var(--text-dim);font-size:14px;'})); };">`;
        }

        // 4. High-Resolution Fallback (Google sz=128 -> DuckDuckGo -> Crisp Vector)
        return `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128" class="recom-web-icon" alt="${d}" onerror="this.onerror=null; this.src='https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico'; this.onerror=function(){ this.replaceWith(Object.assign(document.createElement('i'), {className: 'fas fa-globe', style: 'color:var(--text-dim);font-size:14px;'})); };">`;
    }

    function getQuickAccessName(dom) {
        let name = String(dom || '').replace(/^www\./i, '');
        if (name.includes('chromewebstore')) return 'Web Store';
        if (name.includes('gamingnetworkstudio')) return 'GamingNet';
        if (name.includes('ocalsoftware') || name === 'ocal:home') return 'Ocal';
        if (name === 'ocal:settings') return 'Settings';
        if (name.includes('unboundmusic')) return 'Unbound';
        if (name.includes('gnstudioxrage')) return 'GN Studio';
        if (name.includes('open-meteo')) return 'OpenMeteo';
        if (name.includes('rocketreach')) return 'RocketReach';
        if (name.includes('mongodb')) return 'MongoDB';
        if (name.includes('google')) return 'Google';
        if (name.includes('youtube')) return 'YouTube';
        if (name.includes('github')) return 'GitHub';
        if (name.includes('reddit')) return 'Reddit';
        if (name.includes('discord')) return 'Discord';
        if (name.includes('spotify')) return 'Spotify';

        // Clean suffixes
        name = name.replace(/\.(vercel\.app|wixstudio\.com|netlify\.app|github\.io|pages\.dev)$/i, '');
        name = name.replace(/\.(com|org|net|co|io|app|dev|edu|gov)$/i, '');
        if (name.length <= 11 && /^[a-z0-9]+$/i.test(name)) {
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        return name;
    }

    if (!q && historyItems.length > 5) {
        const counts = {};
        historyItems.forEach(h => {
            try {
                if (h.url.startsWith('ocal://') || h.url.startsWith('file://')) return;
                const u = new URL(h.url);
                if (u.protocol === 'file:' || u.protocol === 'ocal:') return;
                const dom = u.hostname;
                if (dom) counts[dom] = (counts[dom] || 0) + 1;
            } catch {}
        });
        const top = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 8);

        if (top.length > 0) {
            const recomWrap = document.createElement('div');
            recomWrap.className = 'hist-recom';
            recomWrap.innerHTML = `<div class="hist-date-label"><i class="fas fa-compass" style="color:var(--accent);"></i>Quick Access</div><div class="recom-grid"></div>`;
            const grid = recomWrap.querySelector('.recom-grid');
            
            top.forEach(([dom, count]) => {
                const item = document.createElement('div');
                item.className = 'recom-item';
                item.title = `${dom} (${count} visits)`;
                
                const iconHtml = `<div class="icon-wrapper">${getHighResWebIcon(dom)}</div>`;
                const cleanName = getQuickAccessName(dom);

                item.innerHTML = `${iconHtml}<div class="recom-name">${esc(cleanName)}</div>`;
                item.onclick = () => window.electronAPI.navigateTo(dom.startsWith('ocal:') ? (dom === 'ocal:settings' ? 'ocal://settings' : 'ocal://home') : `https://${dom}`);
                grid.appendChild(item);
            });
            sbContent.appendChild(recomWrap);
        }
    }

    // 3. Toggle Header Clear History Button
    if (clearHistoryBtn) {
        clearHistoryBtn.style.display = items.length ? 'flex' : 'none';
    }

    // Helper: Opera-Style Full Date Formatter
    function formatOperaDateHeader(d) {
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
        const fullDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (isToday(d)) {
            return `Today — ${weekday}, ${fullDate}`;
        }
        if (isYesterday(d)) {
            return `Yesterday — ${weekday}, ${fullDate}`;
        }
        return `${weekday}, ${fullDate}`;
    }

    // 4. History List Grouped by Date (Opera-Style Unified Cards)
    const groups = {};
    items.forEach(h => {
        const d = new Date(h.timestamp);
        const dateKey = d.toDateString();
        if (!groups[dateKey]) {
            groups[dateKey] = {
                date: d,
                items: []
            };
        }
        groups[dateKey].items.push(h);
    });

    Object.values(groups).forEach(gData => {
        const d = gData.date;
        const groupItems = gData.items;

        // Date Header
        const dateLabel = document.createElement('div');
        dateLabel.className = 'hist-date-label';
        dateLabel.textContent = formatOperaDateHeader(d);
        sbContent.appendChild(dateLabel);

        // Unified Opera-Style Card Container
        const dateCard = document.createElement('div');
        dateCard.className = 'hist-date-card';
        sbContent.appendChild(dateCard);

        // Group the group's items by domain (preserving chronological order)
        const domainGroups = [];
        const domainMap = new Map();

        groupItems.forEach(h => {
            let domain = (() => { try { return new URL(h.url).hostname; } catch { return ''; } })();
            const normDomain = domain.replace(/^www\./i, '') || 'Local Page';
            
            if (!domainMap.has(normDomain)) {
                const groupObj = {
                    domain: normDomain,
                    rawDomain: domain,
                    items: []
                };
                domainMap.set(normDomain, groupObj);
                domainGroups.push(groupObj);
            }
            domainMap.get(normDomain).items.push(h);
        });

        domainGroups.forEach(g => {
            if (g.items.length === 1) {
                const h = g.items[0];
                const domain = g.rawDomain ? g.rawDomain.replace(/^www\./i, '') : 'Local Page';
                const time = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const iconHtml = getHistoricalIcon(h.url, h.title, h.favicon);
                const displayTitle = getDisplayTitle(h);
                const isSame = displayTitle.toLowerCase() === domain.toLowerCase();

                const el = document.createElement('div');
                el.className = 'hist-row';
                el.innerHTML = `
                    <span class="hist-row-time">${time}</span>
                    <div class="hist-row-icon">${iconHtml}</div>
                    <div class="hist-row-content">
                        <span class="hist-row-domain">${esc(domain)}</span>
                        ${isSame ? '' : `<span class="hist-row-title">${esc(displayTitle)}</span>`}
                    </div>
                    <button class="hist-row-del" title="Remove"><i class="fas fa-trash-can"></i></button>
                `;

                el.querySelector('.hist-row-del').onclick = (e) => {
                    e.stopPropagation();
                    window.electronAPI.send('delete-history-item', h.timestamp);
                    historyItems = historyItems.filter(item => item.timestamp !== h.timestamp);
                    el.remove();
                    if (dateCard.children.length === 0) {
                        dateLabel.remove();
                        dateCard.remove();
                    }
                    if (historyItems.length === 0) {
                        renderHistory();
                    }
                };

                el.onclick = () => {
                    window.electronAPI.navigateTo(h.url);
                    closeSidebar();
                };

                dateCard.appendChild(el);
            } else {
                // Multi-visit domain group (Accordion inside Opera Card)
                const groupWrap = document.createElement('div');
                groupWrap.className = 'hist-group-wrapper';

                const latestItem = g.items[0];
                const latestTime = new Date(latestItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const iconHtml = getHistoricalIcon(latestItem.url, latestItem.title, latestItem.favicon);

                const header = document.createElement('div');
                header.className = 'hist-row hist-group-row';
                header.innerHTML = `
                    <i class="fas fa-chevron-right toggle-chevron"></i>
                    <span class="hist-row-time">${latestTime}</span>
                    <div class="hist-row-icon">${iconHtml}</div>
                    <div class="hist-row-content">
                        <span class="hist-row-domain">${esc(g.domain)}</span>
                        <span class="hist-group-badge">${g.items.length} pages visited</span>
                    </div>
                    <button class="hist-row-del hist-group-del" title="Remove all"><i class="fas fa-trash-can"></i></button>
                `;

                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'hist-group-children';
                childrenContainer.style.display = 'none';

                g.items.forEach(h => {
                    const time = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const childIconHtml = getHistoricalIcon(h.url, h.title, h.favicon);
                    const childDisplayTitle = getDisplayTitle(h);
                    
                    const childEl = document.createElement('div');
                    childEl.className = 'hist-row hist-child-row';
                    childEl.innerHTML = `
                        <span class="hist-row-time">${time}</span>
                        <div class="hist-row-icon" style="opacity:0.75;">${childIconHtml}</div>
                        <div class="hist-row-content">
                            <span class="hist-row-title">${esc(childDisplayTitle)}</span>
                        </div>
                        <button class="hist-row-del" title="Remove"><i class="fas fa-trash-can"></i></button>
                    `;

                    childEl.querySelector('.hist-row-del').onclick = (e) => {
                        e.stopPropagation();
                        window.electronAPI.send('delete-history-item', h.timestamp);
                        historyItems = historyItems.filter(item => item.timestamp !== h.timestamp);
                        childEl.remove();
                        const remaining = childrenContainer.querySelectorAll('.hist-child-row').length;
                        if (remaining === 0) {
                            groupWrap.remove();
                            if (dateCard.children.length === 0) {
                                dateLabel.remove();
                                dateCard.remove();
                            }
                        } else {
                            header.querySelector('.hist-group-badge').textContent = `${remaining} pages visited`;
                        }
                        if (historyItems.length === 0) {
                            renderHistory();
                        }
                    };

                    childEl.onclick = () => {
                        window.electronAPI.navigateTo(h.url);
                        closeSidebar();
                    };

                    childrenContainer.appendChild(childEl);
                });

                header.onclick = (e) => {
                    if (e.target.closest('.hist-row-del')) return;
                    const isExpanded = header.classList.toggle('expanded');
                    childrenContainer.style.display = isExpanded ? 'block' : 'none';
                };

                // Group deletion: works directly and instantly, exactly like individual items!
                header.querySelector('.hist-group-del').onclick = (e) => {
                    e.stopPropagation();
                    const timestamps = g.items.map(h => h.timestamp);
                    if (window.electronAPI && window.electronAPI.send) {
                        window.electronAPI.send('delete-history-items', timestamps);
                        timestamps.forEach(ts => window.electronAPI.send('delete-history-item', ts));
                    }
                    const tsSet = new Set(timestamps);
                    historyItems = historyItems.filter(h => !tsSet.has(h.timestamp));

                    groupWrap.remove();
                    if (dateCard.children.length === 0) {
                        dateLabel.remove();
                        dateCard.remove();
                    }
                    if (historyItems.length === 0) {
                        renderHistory();
                    }
                };

                groupWrap.appendChild(header);
                groupWrap.appendChild(childrenContainer);
                dateCard.appendChild(groupWrap);
            }
        });
    });
}

function isToday(d) { const n = new Date(); return d.toDateString() === n.toDateString(); }
function isYesterday(d) { const y = new Date(); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString(); }

// ── Downloads ──────────────────────────────────────────────────────────────

let currentDlFilter = 'all';

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = (bytes / Math.pow(k, i)).toFixed(i >= 2 ? 1 : 0);
    return `${val} ${sizes[i]}`;
}

function formatEta(sec) {
    if (!sec || sec <= 0 || !isFinite(sec)) return '';
    if (sec < 60) return `~${sec}s left`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `~${m}m ${s}s left`;
    const h = Math.floor(m / 60);
    return `~${h}h ${m % 60}m left`;
}

function formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    if (isToday(d)) {
        return 'Today, ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isYesterday(d)) {
        return 'Yesterday, ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function updateDownloadBadge() {
    const badge = document.getElementById('tab-dl-badge');
    if (!badge) return;
    const active = downloadItems.filter(d => d.state === 'progressing');
    if (active.length > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = active.length;
        badge.classList.add('active-pulse');
    } else {
        badge.style.display = 'none';
        badge.classList.remove('active-pulse');
    }
}

function matchesFilter(dl, filter) {
    if (filter === 'all') return true;
    const type = getFileType(dl.name);
    if (filter === 'media') return type === 'img' || type === 'media';
    if (filter === 'docs') return type === 'pdf' || type === 'code' || type === 'doc';
    if (filter === 'archives') return type === 'archive';
    return true;
}

function updateOrRenderDownloads() {
    if (!sbContent) return;
    const active = downloadItems.filter(d => d.state === 'progressing');
    const activeContainer = document.getElementById('dl-active-container');
    if (activeContainer && active.length > 0) {
        let matches = true;
        for (const dl of active) {
            const card = document.getElementById(`dl-active-${dl.id}`);
            if (!card) { matches = false; break; }
        }
        if (matches) {
            for (const dl of active) {
                const pct = dl.total > 0 ? Math.round((dl.received / dl.total) * 100) : 0;
                const bar = document.getElementById(`dl-active-bar-${dl.id}`);
                if (bar) bar.style.width = pct + '%';
                const pctEl = document.getElementById(`dl-active-pct-${dl.id}`);
                if (pctEl) pctEl.textContent = pct + '%';
                const sizeEl = document.getElementById(`dl-active-size-${dl.id}`);
                if (sizeEl) sizeEl.textContent = `${formatBytes(dl.received)} / ${formatBytes(dl.total)}`;
                const speedEl = document.getElementById(`dl-active-speed-${dl.id}`);
                if (speedEl) speedEl.textContent = dl.speed > 0 ? `${formatBytes(dl.speed)}/s` : 'Downloading...';
                const etaEl = document.getElementById(`dl-active-eta-${dl.id}`);
                if (etaEl) etaEl.textContent = formatEta(dl.eta);
            }
            return;
        }
    }
    render();
}

function renderDownloads() {
    const q = (searchFilter || '').trim().toLowerCase();
    const filtered = downloadItems.filter(dl => {
        if (q && !dl.name.toLowerCase().includes(q)) return false;
        return matchesFilter(dl, currentDlFilter);
    });

    if (!filtered.length) {
        sbContent.innerHTML = `
            <div class="dl-empty-state">
                <div class="dl-empty-icon-wrap"><i class="fas fa-cloud-arrow-down"></i></div>
                <div class="dl-empty-title">${q ? 'No matching downloads' : 'No Downloads Yet'}</div>
                <div class="dl-empty-sub">${q ? 'Try searching with another filename or keyword' : 'Files, images, and documents you download or save will appear here.'}</div>
                ${!q ? `<button class="dl-empty-folder-btn" id="empty-open-dl-btn"><i class="fas fa-folder-open"></i> Open Downloads Folder</button>` : ''}
            </div>
        `;
        const emptyBtn = document.getElementById('empty-open-dl-btn');
        if (emptyBtn) emptyBtn.onclick = () => window.electronAPI.send('open-downloads-folder');
        return;
    }

    const active = filtered.filter(d => d.state === 'progressing');
    const finished = filtered.filter(d => d.state !== 'progressing');

    if (active.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'dl-section-label';
        lbl.textContent = `Active Downloads (${active.length})`;
        sbContent.appendChild(lbl);

        const container = document.createElement('div');
        container.id = 'dl-active-container';

        active.forEach(dl => {
            const pct = dl.total > 0 ? Math.round((dl.received / dl.total) * 100) : 0;
            const icon = getFileIcon(dl.name);
            const speedStr = dl.speed > 0 ? `${formatBytes(dl.speed)}/s` : 'Downloading...';
            const etaStr = formatEta(dl.eta);
            const sizeStr = dl.total > 0 ? `${formatBytes(dl.received)} / ${formatBytes(dl.total)}` : formatBytes(dl.received);

            const card = document.createElement('div');
            card.className = 'dl-hero-card';
            card.id = `dl-active-${dl.id}`;
            card.innerHTML = `
                <div class="dl-hero-top">
                    <div class="dl-hero-icon"><i class="fas ${icon}"></i></div>
                    <div class="dl-hero-title-box">
                        <div class="dl-hero-name" title="${esc(dl.name)}">${esc(dl.name)}</div>
                        <div class="dl-hero-metrics">
                            <span class="dl-hero-badge">DOWNLOADING</span>
                            <span class="dl-hero-speed" id="dl-active-speed-${dl.id}">${speedStr}</span>
                            <span class="dl-hero-eta" id="dl-active-eta-${dl.id}">${etaStr}</span>
                        </div>
                    </div>
                    <button class="dl-hero-cancel-btn" title="Cancel Download"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="dl-hero-bar-bg">
                    <div class="dl-hero-bar-fill" id="dl-active-bar-${dl.id}" style="width: ${pct}%;"></div>
                </div>
                <div class="dl-hero-bottom">
                    <span id="dl-active-size-${dl.id}">${sizeStr}</span>
                    <span id="dl-active-pct-${dl.id}" style="font-weight:700; color:var(--text);">${pct}%</span>
                </div>
            `;

            card.querySelector('.dl-hero-cancel-btn').onclick = (e) => {
                e.stopPropagation();
                window.electronAPI.send('cancel-download', dl.id);
            };

            container.appendChild(card);
        });
        sbContent.appendChild(container);
    }

    if (finished.length > 0) {
        const lbl = document.createElement('div');
        lbl.className = 'dl-section-label';
        lbl.innerHTML = `<i class="fas fa-circle-check"></i>Completed & Saved Files (${finished.length})`;
        sbContent.appendChild(lbl);

        const finContainer = document.createElement('div');
        finContainer.id = 'dl-finished-container';

        finished.forEach(dl => {
            const el = document.createElement('div');
            el.className = 'dl-item';
            const type = getFileType(dl.name);
            el.dataset.type = type;
            const icon = getFileIcon(dl.name);
            const sizeInfo = dl.total > 0 ? formatBytes(dl.total) : (dl.received > 0 ? formatBytes(dl.received) : 'File');
            const timeStr = formatTimestamp(dl.timestamp);

            const hasPreview = type === 'img' && dl.state === 'completed' && dl.path;
            const fileUrl = hasPreview ? 'file:///' + dl.path.replace(/\\/g, '/') : '';

            el.innerHTML = `
                <div class="dl-icon">
                    ${hasPreview 
                        ? `<img class="dl-preview" src="${fileUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <i class="fas ${icon}" style="display:none; align-items:center; justify-content:center;"></i>`
                        : `<i class="fas ${icon}"></i>`
                    }
                </div>
                <div class="dl-info">
                    <div class="dl-name">${esc(dl.name)}</div>
                    <div class="dl-meta-row">
                        <span class="dl-status-chip">${dl.state === 'completed' ? 'Completed' : dl.state}</span>
                        <span class="dl-dot-separator"></span>
                        <span>${sizeInfo}</span>
                        ${timeStr ? `<span class="dl-dot-separator"></span><span>${timeStr}</span>` : ''}
                    </div>
                </div>
                <div class="dl-actions">
                    <button class="dl-action-btn folder-btn" title="Show in folder"><i class="fas fa-folder-open"></i></button>
                    <button class="dl-action-btn del del-btn" title="Remove from list"><i class="fas fa-xmark"></i></button>
                </div>
            `;

            el.querySelector('.folder-btn').onclick = (e) => {
                e.stopPropagation();
                window.electronAPI.send('show-item-in-folder', dl.path);
            };
            el.querySelector('.del-btn').onclick = (e) => {
                e.stopPropagation();
                window.electronAPI.send('remove-download-item', dl.id);
            };
            el.onclick = () => window.electronAPI.send('open-download', dl.path);

            finContainer.appendChild(el);
        });
        sbContent.appendChild(finContainer);
    }
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        pdf: 'fa-file-pdf',
        doc: 'fa-file-word',
        docx: 'fa-file-word',
        txt: 'fa-file-lines',
        md: 'fa-file-lines',
        zip: 'fa-file-zipper',
        rar: 'fa-file-zipper',
        '7z': 'fa-file-zipper',
        tar: 'fa-file-zipper',
        gz: 'fa-file-zipper',
        iso: 'fa-compact-disc',
        exe: 'fa-box-archive',
        msi: 'fa-box-archive',
        js:  'fa-file-code',
        ts:  'fa-file-code',
        css: 'fa-file-code',
        html: 'fa-file-code',
        py: 'fa-file-code',
        json: 'fa-file-code',
        jpg: 'fa-file-image',
        jpeg: 'fa-file-image',
        png: 'fa-file-image',
        svg: 'fa-file-image',
        gif: 'fa-file-image',
        avif: 'fa-file-image',
        webp: 'fa-file-image',
        mp4: 'fa-file-video',
        mov: 'fa-file-video',
        mkv: 'fa-file-video',
        mp3: 'fa-file-audio',
        wav: 'fa-file-audio'
    };
    return map[ext] || 'fa-file-arrow-down';
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md', 'epub'].includes(ext)) return 'doc';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'avif', 'webp', 'bmp', 'ico'].includes(ext)) return 'img';
    if (['mp4', 'mov', 'mp3', 'wav', 'm4a', 'flac', 'webm', 'mkv', 'avi'].includes(ext)) return 'media';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'exe', 'msi', 'dmg', 'pkg', 'apk'].includes(ext)) return 'archive';
    if (['js', 'html', 'css', 'json', 'py', 'cpp', 'rs', 'go', 'ts', 'jsx', 'tsx', 'java', 'c'].includes(ext)) return 'code';
    return 'other';
}


// ── Helpers ────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ── AI Smart Bookmark Classifier ──────────────────────────────────────────
async function handleAiClassify() {
    const btn = document.getElementById('ai-classify-btn');
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Grouping...';
    btn.disabled = true;
    try {
        const res = await window.electronAPI.invoke('ai-classify-bookmarks');
        if (res.success) {
            btn.innerHTML = `<i class="fas fa-check"></i> Grouped ${res.count}!`;
            setTimeout(() => {
                btn.innerHTML = orig;
                btn.disabled = false;
            }, 2500);
        } else {
            alert(res.error || 'No bookmarks found.');
            btn.innerHTML = orig;
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        btn.innerHTML = orig;
        btn.disabled = false;
    }
}

// ── Final Event Listener Assignment ──────────────────────────────────────
if (backdrop) backdrop.addEventListener('click', closeSidebar);
const sbCloseBtn = document.getElementById('sb-close-btn');
if (sbCloseBtn) sbCloseBtn.addEventListener('click', closeSidebar);

const addFolderBtn = document.getElementById('add-folder-btn');
if (addFolderBtn) addFolderBtn.addEventListener('click', addFolder);

const sortBmsBtn = document.getElementById('sort-bms-btn');
if (sortBmsBtn) sortBmsBtn.addEventListener('click', sortBookmarks);

const aiClassifyBtn = document.getElementById('ai-classify-btn');
if (aiClassifyBtn) aiClassifyBtn.addEventListener('click', handleAiClassify);

const ssVisible = document.getElementById('ss-visible');
if (ssVisible) ssVisible.addEventListener('click', () => handleSS('visible'));

const ssFull = document.getElementById('ss-full');
if (ssFull) ssFull.addEventListener('click', () => handleSS('full'));

const ssPdf = document.getElementById('ss-pdf');
if (ssPdf) ssPdf.addEventListener('click', () => handleSS('pdf'));

// ── Initial Data Fetch & First Render ─────────────────────────────────────
if (window.electronAPI && window.electronAPI.getSettings) {
    window.electronAPI.getSettings().then(s => {
        if (s) {
            currentSettings = s;
            historyItems = s.history || [];
            bookmarks = s.bookmarks || [];
            folders = s.folders || s.bookmarkFolders || [];
            const isLight = s.themeMode === 'light';
            document.body.setAttribute('data-theme', s.themeMode || 'dark');
            if (s.accentColor) {
                const activeAccent = getModeAccent(s.accentColor, isLight);
                document.documentElement.style.setProperty('--accent', activeAccent);
                document.documentElement.style.setProperty('--accent-glow', hexToRgba(activeAccent, 0.35));
                document.documentElement.style.setProperty('--accent-dim', hexToRgba(activeAccent, 0.12));
                document.documentElement.style.setProperty('--accent-border', hexToRgba(activeAccent, 0.28));
            }
            render();
        }
    }).catch(() => {});
}
if (window.electronAPI && window.electronAPI.invoke) {
    window.electronAPI.invoke('get-bookmarks').then(data => {
        if (data) {
            if (Array.isArray(data.bookmarks)) bookmarks = data.bookmarks;
            if (Array.isArray(data.folders)) folders = data.folders;
            if (currentTab === 'bookmarks') render();
        }
    }).catch(() => {});
}
if (window.electronAPI && window.electronAPI.getDownloads) {
    window.electronAPI.getDownloads().then(dls => {
        if (dls) {
            downloadItems = dls;
            if (currentTab === 'downloads') render();
        }
    }).catch(() => {});
}

// ── Downloads Toolbar & Filter Listeners ─────────────────────────────
document.querySelectorAll('.dl-filter-btn[data-filter]').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.dl-filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDlFilter = btn.dataset.filter;
        render();
    };
});

const quickFolderBtn = document.getElementById('quick-folder-btn');
if (quickFolderBtn) {
    quickFolderBtn.onclick = () => window.electronAPI.send('open-downloads-folder');
}

const headerOpenFolderBtn = document.getElementById('open-dl-folder-btn');
if (headerOpenFolderBtn) {
    headerOpenFolderBtn.onclick = () => window.electronAPI.send('open-downloads-folder');
}

const headerClearDlBtn = document.getElementById('clear-downloads-btn');
if (headerClearDlBtn) {
    headerClearDlBtn.onclick = () => {
        showModal({
            title: 'Clear Downloads List',
            message: 'Are you sure you want to clear your completed downloads list? The files on your disk will not be deleted.',
            onConfirm: () => window.electronAPI.send('clear-all-downloads')
        });
    };
}
