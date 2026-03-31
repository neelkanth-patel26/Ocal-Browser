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

// ── Sidebar open/close ─────────────────────────────────────────────────────
function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
}
function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    window.electronAPI.send('close-all-sidebars');
}

// ── Tab switching ──────────────────────────────────────────────────────────
tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

function switchTab(id) {
    currentTab = id;
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    const titles = { bookmarks: 'Saves', history: 'History', downloads: 'Files' };
    sbTitle.textContent = titles[id] || id;
    bmToolbar.style.display = id === 'bookmarks' ? 'flex' : 'none';
    sbSearch.placeholder = `Search ${titles[id] || id}...`;
    render();
}

sbSearch.addEventListener('input', e => { searchFilter = e.target.value.toLowerCase(); render(); });

// ── IPC listeners ──────────────────────────────────────────────────────────
window.electronAPI.onToggleSidebar((e, open) => {
    if (open) openSidebar(); else closeSidebar();
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
window.electronAPI.onShowModal((data) => showModal(data));

window.electronAPI.onSettingsChanged((s) => {
    currentSettings = s;
    historyItems = s.history || [];
    if (s.accentColor) document.documentElement.style.setProperty('--accent', s.accentColor);
    if (currentTab === 'history') render();
});

window.electronAPI.onDownloadUpdated((data) => {
    downloadItems = data;
    if (currentTab === 'downloads') render();
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
    currentSettings = s;
    historyItems = s.history || [];
    bookmarks    = s.bookmarks || [];
    folders      = s.folders   || [];
    if (s.accentColor) document.documentElement.style.setProperty('--accent', s.accentColor);
    
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
        sbContent.innerHTML = `<div class="empty-state"><i class="fas fa-ghost"></i><p>Nothing here yet</p></div>`;
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
    row.style.cssText = 'display:flex;gap:6px;padding:6px 12px 4px;flex-shrink:0';
    row.innerHTML = `
        <input id="new-folder-name" type="text" placeholder="Folder name..."
            style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(168,85,247,0.4);
                   border-radius:7px;padding:6px 10px;color:#fff;font-size:12px;
                   font-family:Inter,sans-serif;outline:none">
        <button id="new-folder-confirm"
            style="padding:6px 12px;border-radius:7px;background:rgba(168,85,247,0.2);
                   border:1px solid rgba(168,85,247,0.4);color:#fff;font-size:11px;
                   font-family:Inter,sans-serif;cursor:pointer">Add</button>
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
    if (u.includes('settings.html') || u.includes('ocal://settings')) {
        return `<div class="hist-favicon" style="background:rgba(168,85,247,0.12);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-gear" style="font-size:11px"></i></div>`;
    }
    if (u.includes('home.html') || u.includes('ocal://home') || u === 'ocal://') {
        return `<div class="hist-favicon" style="background:rgba(168,85,247,0.12);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-house" style="font-size:11px"></i></div>`;
    }
    if (u.includes('pdf-viewer.html') || u.includes('.pdf') || u.includes('ocal://pdf')) {
        return `<div class="hist-favicon" style="background:rgba(168,85,247,0.12);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-file-pdf" style="font-size:11px"></i></div>`;
    }
    if (u.includes('sidebars.html') || u.includes('ocal://history') || u.includes('ocal://saves')) {
        return `<div class="hist-favicon" style="background:rgba(168,85,247,0.12);color:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-clock-rotate-left" style="font-size:11px"></i></div>`;
    }

    // 2. Proactive stored favicon usage
    if (storedIcon) {
        return `<img class="hist-favicon" src="${storedIcon}" 
                onerror="this.outerHTML='<div class=\'hist-favicon-fallback\'><i class=\'fas fa-globe\'></i></div>'">`;
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
            onerror="this.outerHTML='<div class=\'hist-favicon-fallback\'><i class=\'fas fa-globe\'></i></div>'">`;
}

// ── History ────────────────────────────────────────────────────────────────
function renderHistory() {
    const q = searchFilter;
    const items = q
        ? historyItems.filter(h => h.title?.toLowerCase().includes(q) || h.url?.toLowerCase().includes(q))
        : historyItems;

    // 1. Open Tabs Section
    if (!q && activeTabs.length > 0) {
        const openWrap = document.createElement('div');
        openWrap.className = 'hist-open-tabs';
        openWrap.innerHTML = `<div class="recom-title"><i class="fas fa-layer-group"></i>Open Tabs</div><div class="open-tabs-list"></div>`;
        const list = openWrap.querySelector('.open-tabs-list');
        
        activeTabs.forEach(tab => {
            const domain = (() => { try { return new URL(tab.url).hostname; } catch { return ''; } })();
            const item = document.createElement('div');
            item.className = 'hist-item active-tab-entry';
            if (tab.id === activeTabId) item.classList.add('current-active');
            
            const iconHtml = getHistoricalIcon(tab.url, tab.title, tab.favicon);

            item.innerHTML = `
                ${iconHtml}
                <div class="hist-info">
                    <div class="hist-title">${esc(tab.title || 'New Tab')}</div>
                    <div class="hist-meta">${esc(domain || 'ocal://')} · Open Now</div>
                </div>
            `;
            item.onclick = () => {
                window.electronAPI.send('switch-tab', tab.id);
                closeSidebar();
            };
            list.appendChild(item);
        });
        sbContent.appendChild(openWrap);
    }

    // 2. Recommendations (Top Domains)
    if (!q && historyItems.length > 5) {
        const counts = {};
        historyItems.forEach(h => {
            try {
                const u = new URL(h.url);
                let dom = u.hostname;
                if (!dom && u.protocol === 'file:') {
                    if (u.pathname.includes('settings.html')) dom = 'ocal:settings';
                    else if (u.pathname.includes('home.html')) dom = 'ocal:home';
                    else dom = 'ocal:local';
                }
                if (dom) counts[dom] = (counts[dom] || 0) + 1;
            } catch {}
        });
        const top = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 8);

        const recomWrap = document.createElement('div');
        recomWrap.className = 'hist-recom';
        recomWrap.innerHTML = `<div class="recom-title"><i class="fas fa-bolt"></i>Quick Access</div><div class="recom-grid"></div>`;
        const grid = recomWrap.querySelector('.recom-grid');
        
        top.forEach(([dom, count]) => {
            const item = document.createElement('div');
            item.className = 'recom-item';
            
            let iconHtml = '';
            let name = dom.replace('www.','');
            
            if (dom.startsWith('ocal:')) {
                const isSettings = dom === 'ocal:settings';
                name = isSettings ? 'Settings' : 'Home';
                iconHtml = `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:rgba(168,85,247,0.1);border-radius:8px;color:var(--accent);font-size:14px;"><i class="fas ${isSettings?'fa-gear':'fa-house'}"></i></div>`;
            } else {
                iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${dom}&sz=64" onerror="this.outerHTML='<div class=\'hist-favicon-fallback\' style=\'width:28px;height:28px;font-size:14px;\'><i class=\'fas fa-globe\'></i></div>'">`;
            }

            item.innerHTML = `${iconHtml}<div class="recom-name">${esc(name)}</div>`;
            item.onclick = () => window.electronAPI.navigateTo(dom.startsWith('ocal:') ? `ocal://${name.toLowerCase()}` : `https://${dom}`);
            grid.appendChild(item);
        });
        sbContent.appendChild(recomWrap);
    }

    // 3. Clear History
    if (items.length) {
        const clearBtn = document.createElement('div');
        clearBtn.className = 'hist-clear-row';
        clearBtn.innerHTML = '<i class="fas fa-trash-can"></i>Clear History';
        clearBtn.onclick = () => {
            showModal({
                title: 'Clear History',
                message: 'Are you sure you want to permanently clear all browsing history?',
                onConfirm: () => window.electronAPI.send('clear-history')
            });
        };
        sbContent.appendChild(clearBtn);
    }

    // 4. History List Grouped by Date
    const groups = {};
    items.forEach(h => {
        const d = new Date(h.timestamp);
        const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!groups[label]) groups[label] = [];
        groups[label].push(h);
    });

    Object.entries(groups).forEach(([label, group]) => {
        const lbl = document.createElement('div');
        lbl.className = 'hist-date-label';
        lbl.innerHTML = label;
        sbContent.appendChild(lbl);

        group.forEach(h => {
            const domain = (() => { try { return new URL(h.url).hostname; } catch { return ''; } })();
            const time = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const iconHtml = getHistoricalIcon(h.url, h.title, h.favicon);

            const el = document.createElement('div');
            el.className = 'hist-item';
            el.innerHTML = `
                ${iconHtml}
                <div class="hist-info">
                    <div class="hist-title">${esc(h.title || h.url)}</div>
                    <div class="hist-meta">${esc(domain || 'Local Page')} · ${time}</div>
                </div>
                <div class="hist-del" title="Remove"><i class="fas fa-xmark"></i></div>
            `;
            el.querySelector('.hist-del').onclick = (e) => { e.stopPropagation(); window.electronAPI.send('delete-history-item', h.timestamp); };
            el.onclick = () => { window.electronAPI.navigateTo(h.url); closeSidebar(); };
            sbContent.appendChild(el);
        });
    });
}

function isToday(d) { const n = new Date(); return d.toDateString() === n.toDateString(); }
function isYesterday(d) { const y = new Date(); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString(); }

// ── Downloads ──────────────────────────────────────────────────────────────
function renderDownloads() {
    if (!downloadItems.length) return;
    downloadItems.forEach(dl => {
        const el = document.createElement('div');
        el.className = 'dl-item';
        const isFinished = dl.state === 'completed' || dl.state === 'cancelled' || dl.state === 'interrupted';
        const pct = isFinished ? (dl.state === 'completed' ? 100 : 0) : (dl.total > 0 ? Math.round((dl.received / dl.total) * 100) : 0);
        const icon = getFileIcon(dl.name);
        
        const sizeInfo = dl.total > 0 
            ? `${(dl.received / (1024*1024)).toFixed(1)} / ${(dl.total / (1024*1024)).toFixed(1)} MB`
            : `${(dl.received / (1024*1024)).toFixed(1)} MB`;

        el.innerHTML = `
            <div class="dl-icon"><i class="fas ${icon}"></i></div>
            <div class="dl-info">
                <div class="dl-name" title="${esc(dl.name)}">${esc(dl.name)}</div>
                <div class="dl-status">
                    <span style="${dl.state === 'completed' ? 'color:var(--accent);font-weight:700' : ''}">${dl.state === 'progressing' ? sizeInfo : dl.state}</span>
                    ${dl.state === 'progressing' ? `<span>${pct}%</span>` : ''}
                </div>
                ${dl.state === 'progressing' ? `<div class="dl-bar-bg"><div class="dl-bar" style="width:${pct}%"></div></div>` : ''}
            </div>
            <div class="dl-actions">
                <button class="dl-action-btn folder-btn" title="Show in folder"><i class="fas fa-folder-open"></i></button>
                <button class="dl-action-btn del del-btn" title="Remove"><i class="fas fa-times"></i></button>
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
        sbContent.appendChild(el);
    });
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        pdf: 'fa-file-pdf',
        zip: 'fa-file-zipper',
        rar: 'fa-file-zipper',
        exe: 'fa-file-code',
        js:  'fa-file-code',
        css: 'fa-file-code',
        html: 'fa-file-code',
        jpg: 'fa-file-image',
        jpeg: 'fa-file-image',
        png: 'fa-file-image',
        svg: 'fa-file-image',
        gif: 'fa-file-image',
        mp4: 'fa-file-video',
        mov: 'fa-file-video',
        mp3: 'fa-file-audio',
        wav: 'fa-file-audio'
    };
    return map[ext] || 'fa-file-arrow-down';
}


// ── Helpers ────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showModal({ title, message, onConfirm }) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    if (!overlay || !confirmBtn || !cancelBtn) return;

    // Custom Icon for Exit
    const iconEl = document.getElementById('modal-icon');
    if (iconEl) {
        if (title === 'Confirm Exit') {
            iconEl.innerHTML = '<i class="fas fa-power-off"></i>';
            iconEl.style.color = '#ef4444';
            iconEl.style.background = 'rgba(239, 68, 68, 0.1)';
            iconEl.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            iconEl.style.boxShadow = '0 10px 30px rgba(239, 68, 68, 0.2)';
        } else {
            iconEl.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
            iconEl.style.color = 'var(--accent)';
            iconEl.style.background = 'var(--accent-dim)';
            iconEl.style.borderColor = 'var(--accent-border)';
            iconEl.style.boxShadow = '0 10px 30px var(--accent-glow)';
        }
    }

    titleEl.textContent = title;
    bodyEl.textContent = message;
    overlay.style.display = 'flex';

    const close = () => { 
        overlay.style.display = 'none'; 
        // Important: tell main to hide the overlay view if no sidebar is open
        window.electronAPI.send('close-all-sidebars');
    };

    confirmBtn.onclick = () => { onConfirm(); close(); };
    cancelBtn.onclick = close;
    
    // Backdrop click to dismiss
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };
}

// ── Final Event Listener Assignment ──────────────────────────────────────
if (backdrop) backdrop.addEventListener('click', closeSidebar);
const sbCloseBtn = document.getElementById('sb-close-btn');
if (sbCloseBtn) sbCloseBtn.addEventListener('click', closeSidebar);

const addFolderBtn = document.getElementById('add-folder-btn');
if (addFolderBtn) addFolderBtn.addEventListener('click', addFolder);

const sortBmsBtn = document.getElementById('sort-bms-btn');
if (sortBmsBtn) sortBmsBtn.addEventListener('click', sortBookmarks);

const ssVisible = document.getElementById('ss-visible');
if (ssVisible) ssVisible.addEventListener('click', () => handleSS('visible'));

const ssFull = document.getElementById('ss-full');
if (ssFull) ssFull.addEventListener('click', () => handleSS('full'));

const ssPdf = document.getElementById('ss-pdf');
if (ssPdf) ssPdf.addEventListener('click', () => handleSS('pdf'));
