// ── State ──────────────────────────────────────────────────────────────────
let currentTab = 'bookmarks';
let bookmarks = [];
let folders = [];
let historyItems = [];
let downloadItems = [];
let searchFilter = '';
let currentSettings = {};
let expandedFolders = new Set();
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
    render();
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

    // Folders
    folders.forEach(f => {
        const folderBms = bookmarks.filter(b => b.folderId === f.id);
        if (q && !f.name.toLowerCase().includes(q) && !folderBms.some(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))) return;

        const wrap = document.createElement('div');
        wrap.className = 'bm-folder';
        wrap.dataset.folderId = f.id;

        const isOpen = expandedFolders.has(f.id);
        const hdr = document.createElement('div');
        hdr.className = 'bm-folder-hdr';
        hdr.draggable = true;
        hdr.innerHTML = `
            <i class="fas fa-chevron-right bm-folder-chevron ${isOpen ? 'open' : ''}"></i>
            <i class="fas fa-folder bm-folder-icon"></i>
            <span class="bm-folder-name">${esc(f.name)}</span>
            <span class="bm-folder-count">${folderBms.length}</span>
            <div class="bm-folder-actions">
                <button class="icon-btn" title="Rename" onclick="renameFolder('${f.id}',this)"><i class="fas fa-pen"></i></button>
                <button class="icon-btn del" title="Delete" onclick="deleteFolder('${f.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // Folder drag (reorder folders)
        hdr.addEventListener('dragstart', e => { dragSrc = { type: 'folder', id: f.id }; e.dataTransfer.effectAllowed = 'move'; });
        hdr.addEventListener('dragover', e => { e.preventDefault(); hdr.classList.add('drag-over'); });
        hdr.addEventListener('dragleave', () => hdr.classList.remove('drag-over'));
        hdr.addEventListener('drop', e => {
            e.preventDefault(); hdr.classList.remove('drag-over');
            if (dragSrc?.type === 'bookmark') {
                // Move bookmark into this folder
                window.electronAPI.send('edit-bookmark', { id: dragSrc.id, folderId: f.id });
                dragSrc = null;
            }
        });

        hdr.onclick = (e) => {
            if (e.target.closest('.bm-folder-actions') || e.target.closest('.icon-btn')) return;
            if (expandedFolders.has(f.id)) expandedFolders.delete(f.id);
            else expandedFolders.add(f.id);
            render();
        };

        wrap.appendChild(hdr);

        if (isOpen) {
            const body = document.createElement('div');
            body.className = 'bm-folder-body';
            if (folderBms.length === 0) {
                body.innerHTML = `<div style="padding:8px 28px;font-size:11px;color:#333;font-style:italic">Empty folder — drag bookmarks here</div>`;
            } else {
                folderBms.forEach(bm => body.appendChild(buildBookmarkItem(bm, true)));
            }
            wrap.appendChild(body);
        }

        sbContent.appendChild(wrap);
    });

    // Loose bookmarks
    const loose = bookmarks.filter(b => !b.folderId);
    const filtered = q ? loose.filter(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) : loose;

    if (filtered.length && folders.length) {
        const lbl = document.createElement('div');
        lbl.className = 'bm-section';
        lbl.textContent = 'Bookmarks';
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
            <button class="icon-btn" title="Edit" onclick="editBookmark('${bm.id}',this)"><i class="fas fa-pen"></i></button>
            <button class="icon-btn" title="Move to folder" onclick="showMoveMenu(event,'${bm.id}')"><i class="fas fa-folder-open" style="font-size:10px"></i></button>
            <button class="icon-btn del" title="Delete" onclick="deleteBookmark('${bm.url}')"><i class="fas fa-trash"></i></button>
        </div>
    `;

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
            
            let iconHtml = `<img class="hist-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.src='https://www.google.com/s2/favicons?domain=google.com&sz=32'">`;
            if (tab.url.includes('home.html')) iconHtml = `<i class="fas fa-house hist-favicon" style="color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px"></i>`;

            item.innerHTML = `
                ${iconHtml}
                <div class="hist-info">
                    <div class="hist-title">${esc(tab.title || 'New Tab')}</div>
                    <div class="hist-meta">${esc(domain || 'ocal://')} · Active Now</div>
                </div>
                ${tab.id === activeTabId ? '<span class="active-badge">CURRENT</span>' : ''}
            `;
            item.onclick = () => {
                window.electronAPI.send('switch-tab', tab.id);
                closeSidebar();
            };
            list.appendChild(item);
        });
        sbContent.appendChild(openWrap);
    }

    // 2. Recommendations (Top 5 Sites) - Only if not searching
    if (!q && historyItems.length > 5) {
        const counts = {};
        historyItems.forEach(h => {
            try {
                const domain = new URL(h.url).hostname;
                counts[domain] = (counts[domain] || 0) + 1;
            } catch {}
        });
        const topDomains = Object.entries(counts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 8);

        const recomWrap = document.createElement('div');
        recomWrap.className = 'hist-recom';
        recomWrap.innerHTML = `<div class="recom-title"><i class="fas fa-star"></i>Recommended</div><div class="recom-grid"></div>`;
        const grid = recomWrap.querySelector('.recom-grid');
        
        topDomains.forEach(([domain, count]) => {
            const item = document.createElement('div');
            item.className = 'recom-item';
            item.innerHTML = `
                <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" onerror="this.onerror=null; this.src='https://www.google.com/s2/favicons?domain=ocal.com&sz=64'">
                <div class="recom-name">${esc(domain.replace('www.',''))}</div>
            `;
            item.onclick = () => window.electronAPI.navigateTo('https://' + domain);
            grid.appendChild(item);
        });
        sbContent.appendChild(recomWrap);
    }

    if (items.length) {
        const clearBtn = document.createElement('div');
        clearBtn.className = 'hist-clear-row';
        clearBtn.innerHTML = '<i class="fas fa-trash"></i>Clear History';
        clearBtn.onclick = () => {
            showModal({
                title: 'Clear History',
                message: 'Are you sure you want to permanently clear all browsing history?',
                onConfirm: () => window.electronAPI.send('clear-history')
            });
        };
        sbContent.appendChild(clearBtn);
    }

    // 2. Group by date + Domain Smart Collapse
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
        lbl.innerHTML = `<i class="fas fa-calendar-day"></i>${label}`;
        sbContent.appendChild(lbl);

        group.forEach((h, i) => {
            const domain = (() => { try { return new URL(h.url).hostname; } catch { return ''; } })();
            const time = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let iconHtml = `<img class="hist-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" onerror="this.src='https://www.google.com/s2/favicons?domain=google.com&sz=32'">`;
            
            // Local page specific icons
            if (h.url.includes('sidebars.html')) iconHtml = `<i class="fas fa-gear hist-favicon" style="color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px"></i>`;
            else if (h.url.includes('home.html')) iconHtml = `<i class="fas fa-house hist-favicon" style="color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px"></i>`;
            else if (h.url.includes('game.html')) iconHtml = `<i class="fas fa-gamepad hist-favicon" style="color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px"></i>`;

            const el = document.createElement('div');
            el.className = 'hist-item';
            el.innerHTML = `
                ${iconHtml}
                <div class="hist-info">
                    <div class="hist-title">${esc(h.title || h.url)}</div>
                    <div class="hist-meta">${esc(domain || 'Local Page')} · ${time}</div>
                </div>
                <i class="fas fa-times hist-del" title="Remove"></i>
            `;
            el.querySelector('.hist-del').onclick = (e) => { e.stopPropagation(); window.electronAPI.send('delete-history-item', h.timestamp); };
            el.onclick = (e) => { if (e.target.classList.contains('hist-del')) return; window.electronAPI.navigateTo(h.url); closeSidebar(); };
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
        const pct = dl.total > 0 ? Math.round((dl.received / dl.total) * 100) : 0;
        el.innerHTML = `
            <div class="dl-icon"><i class="fas fa-file-arrow-down"></i></div>
            <div class="dl-info">
                <div class="dl-name">${esc(dl.name)}</div>
                <div class="dl-status">${dl.state === 'progressing' ? pct + '%' : dl.state}</div>
                <div class="dl-bar-bg"><div class="dl-bar" style="width:${pct}%"></div></div>
            </div>
        `;
        el.onclick = () => window.electronAPI.send('open-download', dl.path);
        sbContent.appendChild(el);
    });
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

// Expose globals needed by inline onclick handlers
window.addFolder = addFolder;
window.renameFolder = renameFolder;
window.deleteFolder = deleteFolder;
window.editBookmark = editBookmark;
window.deleteBookmark = deleteBookmark;
window.showMoveMenu = showMoveMenu;
window.sortBookmarks = sortBookmarks;
window.closeSidebar = closeSidebar;
window.showModal = showModal;
