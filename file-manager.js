const fileGrid = document.getElementById('file-grid');
const breadcrumbs = document.getElementById('breadcrumbs');
const currentPathEl = document.getElementById('current-path');
const itemCountEl = document.getElementById('item-count');
const fileSearch = document.getElementById('file-search');
const searchClearBtn = document.getElementById('search-clear-btn');
const contextMenu = document.getElementById('context-menu');
const pageTitle = document.getElementById('page-title');
const navBackBtn = document.getElementById('nav-back-btn');
const copyPathBtn = document.getElementById('copy-path-btn');
const refreshDirBtn = document.getElementById('refresh-dir-btn');
const drivesListEl = document.getElementById('drives-list');
const togglePreviewsBtn = document.getElementById('toggle-previews-btn');

const statItemsCount = document.getElementById('stat-items-count');
const statSelectedCount = document.getElementById('stat-selected-count');
const statModeBadge = document.getElementById('stat-mode-badge');

const previewInspector = document.getElementById('preview-inspector');
const inspectorCloseBtn = document.getElementById('inspector-close-btn');
const inspectorOpenBtn = document.getElementById('inspector-open-btn');
const inspectorPreviewBox = document.getElementById('inspector-preview-box');
const inspectorFileName = document.getElementById('inspector-file-name');
const inspectorType = document.getElementById('inspector-type');
const inspectorSize = document.getElementById('inspector-size');
const inspectorDate = document.getElementById('inspector-date');
const inspectorPath = document.getElementById('inspector-path');

const mediaPlayerModal = document.getElementById('media-player-modal');
const mediaModalBackdrop = document.getElementById('media-modal-backdrop');
const mediaModalClose = document.getElementById('media-modal-close');
const mediaModalName = document.getElementById('media-modal-name');
const mediaModalIcon = document.getElementById('media-modal-icon');
const mediaModalBody = document.getElementById('media-modal-body');

let currentPath = '';
let currentItems = [];
let systemFolders = {};
let systemDrives = [];
let isListView = false;
let showPreviews = true;
let selectedItems = new Set();
let activeCategory = 'all';
let currentInspectedItem = null;
let sortField = 'name';
let sortAsc = true;

// Helper to apply accent color dynamically
function applyAccent(accentColor) {
    if (!accentColor) return;
    document.documentElement.style.setProperty('--accent', accentColor);
    
    const hexToRgba = (hex, alpha) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(21, 172, 73, ${alpha})`;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(accentColor, 0.25));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(accentColor, 0.12));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(accentColor, 0.3));
}

// ── Initialization ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sync Settings (Accent & Theme)
    if (window.electronAPI && window.electronAPI.getSettings) {
        window.electronAPI.getSettings().then(s => {
            if (s) {
                if (s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
                if (s.accentColor) applyAccent(s.accentColor);
            }
        }).catch(() => {});
    }

    if (window.electronAPI && window.electronAPI.on) {
        window.electronAPI.on('settings-changed', (s) => {
            if (s) {
                if (s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
                if (s.accentColor) applyAccent(s.accentColor);
            }
        });
    }

    // 2. Fetch system folders & drives
    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            systemFolders = await window.electronAPI.invoke('get-system-folders') || {};
            systemDrives = await window.electronAPI.invoke('get-system-drives') || [];
        }
    } catch (e) {
        console.error('Failed to load system folders:', e);
    }

    // Render drives in sidebar
    renderDrivesList();

    // 3. Setup Sidebar Nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            const folderKey = btn.getAttribute('data-folder');
            if (systemFolders[folderKey]) {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (pageTitle) {
                    pageTitle.innerText = btn.querySelector('span')?.innerText || 'Local Explorer';
                }
                navigateTo(systemFolders[folderKey]);
            }
        };
    });

    // 4. View Toggles (Grid / List)
    const gridBtn = document.getElementById('view-grid');
    const listBtn = document.getElementById('view-list');
    if (gridBtn) gridBtn.onclick = () => setViewMode(false);
    if (listBtn) listBtn.onclick = () => setViewMode(true);

    // Previews Toggle
    if (togglePreviewsBtn) {
        togglePreviewsBtn.onclick = () => {
            showPreviews = !showPreviews;
            togglePreviewsBtn.classList.toggle('active', showPreviews);
            togglePreviewsBtn.querySelector('span').innerText = showPreviews ? 'Previews ON' : 'Previews OFF';
            renderCurrentFiles();
        };
    }

    // Refresh Button
    if (refreshDirBtn) {
        refreshDirBtn.onclick = () => {
            if (currentPath) navigateTo(currentPath);
        };
    }

    // Back / Up Button
    if (navBackBtn) {
        navBackBtn.onclick = () => {
            navigateUp();
        };
    }

    // Copy Path Button
    if (copyPathBtn) {
        copyPathBtn.onclick = () => {
            if (currentPath) {
                navigator.clipboard.writeText(currentPath);
                copyPathBtn.innerHTML = '<i class="fas fa-check" style="color:var(--accent)"></i>';
                setTimeout(() => {
                    copyPathBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 1500);
            }
        };
    }

    // Category Filter Pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.onclick = () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-cat') || 'all';
            renderCurrentFiles();
        };
    });

    // 5. Search
    if (fileSearch) {
        fileSearch.oninput = () => {
            if (searchClearBtn) {
                searchClearBtn.style.display = fileSearch.value ? 'flex' : 'none';
            }
            renderCurrentFiles();
        };
    }
    if (searchClearBtn) {
        searchClearBtn.onclick = () => {
            fileSearch.value = '';
            searchClearBtn.style.display = 'none';
            renderCurrentFiles();
            fileSearch.focus();
        };
    }

    // 6. Global Click Handlers (Context Menu & Selection)
    document.addEventListener('click', (event) => {
        if (contextMenu) contextMenu.style.display = 'none';
        if (!event.target.closest('.file-item') && !event.target.closest('#preview-inspector')) {
            clearSelection();
        }
    });

    // Inspector handlers
    if (inspectorCloseBtn) {
        inspectorCloseBtn.onclick = () => {
            if (previewInspector) previewInspector.style.display = 'none';
        };
    }
    if (inspectorOpenBtn) {
        inspectorOpenBtn.onclick = () => {
            if (currentInspectedItem) {
                openItem(currentInspectedItem);
            }
        };
    }

    // Media modal handlers
    if (mediaModalClose) {
        mediaModalClose.onclick = closeMediaModal;
    }
    if (mediaModalBackdrop) {
        mediaModalBackdrop.onclick = closeMediaModal;
    }

    // 7. Initial Load: Open Home or Downloads folder
    const initialDir = systemFolders.home || systemFolders.downloads || systemFolders.desktop || 'C:\\';
    navigateTo(initialDir);
});

// ── Drives Rendering ────────────────────────────────────────────────────────
function renderDrivesList() {
    if (!drivesListEl) return;
    drivesListEl.innerHTML = '';
    
    if (systemDrives.length === 0) {
        drivesListEl.innerHTML = `
            <button class="nav-item drive-nav-item" onclick="navigateTo('C:\\\\')">
                <i class="fas fa-hard-drive"></i>
                <span class="drive-label">Local Disk (C:)</span>
            </button>
        `;
        return;
    }

    systemDrives.forEach(drive => {
        const btn = document.createElement('button');
        btn.className = 'nav-item drive-nav-item';
        btn.innerHTML = `
            <i class="fas ${drive.isMobile ? 'fa-mobile-screen' : 'fa-hard-drive'}"></i>
            <span class="drive-label">${escapeHtml(drive.name)}</span>
        `;
        btn.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (pageTitle) pageTitle.innerText = drive.name;
            navigateTo(drive.path);
        };
        drivesListEl.appendChild(btn);
    });
}

// ── Navigation ─────────────────────────────────────────────────────────────
async function navigateTo(targetPath) {
    if (!targetPath) return;
    currentPath = targetPath;

    if (currentPathEl) currentPathEl.innerText = targetPath;
    updateBreadcrumbs(targetPath);

    fileGrid.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Loading folder contents...</span>
        </div>
    `;

    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            const items = await window.electronAPI.invoke('get-directory-entries', targetPath);
            currentItems = Array.isArray(items) ? items : [];
        } else {
            currentItems = [];
        }
    } catch (err) {
        console.error('Failed to get directory entries:', err);
        currentItems = [];
    }

    renderCurrentFiles();
}

function navigateUp() {
    if (!currentPath) return;
    const normalized = currentPath.replace(/[\/\\]+$/, '');
    const lastSlash = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
    if (lastSlash > 0) {
        const parentPath = normalized.slice(0, lastSlash);
        navigateTo(parentPath.includes(':') && !parentPath.includes('\\') && !parentPath.includes('/') ? parentPath + '\\' : parentPath);
    } else if (lastSlash === 0) {
        navigateTo('/');
    }
}

function updateBreadcrumbs(pathStr) {
    if (!breadcrumbs) return;
    breadcrumbs.innerHTML = '';
    const parts = pathStr.split(/[\/\\]/).filter(p => p);

    const rootItem = document.createElement('span');
    rootItem.className = 'breadcrumb-item';
    rootItem.innerText = 'This PC';
    rootItem.onclick = () => navigateTo(systemFolders.home || 'C:\\');
    breadcrumbs.appendChild(rootItem);

    let buildPath = '';
    parts.forEach((part, i) => {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.innerText = ' / ';
        breadcrumbs.appendChild(sep);

        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.innerText = part;

        if (i === 0 && /^[A-Z]:$/i.test(part)) {
            buildPath = part + '\\';
        } else {
            buildPath += (buildPath.endsWith('\\') || buildPath.endsWith('/') ? '' : '\\') + part;
        }

        const target = buildPath;
        item.onclick = () => navigateTo(target);
        breadcrumbs.appendChild(item);
    });
}

// ── Rendering & Filtering ──────────────────────────────────────────────────
function renderCurrentFiles() {
    fileGrid.innerHTML = '';

    const query = fileSearch ? fileSearch.value.trim().toLowerCase() : '';

    const filtered = currentItems.filter(item => {
        // Search query
        if (query && !item.name.toLowerCase().includes(query)) return false;

        // Category filter
        if (activeCategory === 'all') return true;
        if (activeCategory === 'folders') return item.isDirectory;
        if (item.isDirectory) return false;

        const ext = getExtension(item.name);
        switch (activeCategory) {
            case 'pdfs':
                return ext === 'pdf';
            case 'images':
                return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
            case 'audio':
                return ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma'].includes(ext);
            case 'videos':
                return ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv'].includes(ext);
            case 'docs':
                return ['doc', 'docx', 'txt', 'pdf', 'xlsx', 'xls', 'pptx', 'ppt', 'csv', 'md', 'json', 'xml', 'log'].includes(ext);
            default:
                return true;
        }
    });

    // Update dot matrix counters
    if (statItemsCount) statItemsCount.innerText = filtered.length;
    if (itemCountEl) itemCountEl.innerText = `${filtered.length} items`;
    updateSelectedCount();

    if (filtered.length === 0) {
        fileGrid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-folder-open" style="opacity: 0.25; font-size: 42px; color: var(--accent);"></i>
                <span>${query ? 'No matching files found' : 'This folder is empty'}</span>
            </div>
        `;
        return;
    }

    // Sort items based on sortField and sortAsc
    const sorted = [...filtered].sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;

        let res = 0;
        if (sortField === 'name') {
            res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else if (sortField === 'date') {
            res = (new Date(a.mtime || 0).getTime()) - (new Date(b.mtime || 0).getTime());
        } else if (sortField === 'type') {
            const extA = getExtension(a.name);
            const extB = getExtension(b.name);
            res = extA.localeCompare(extB);
        } else if (sortField === 'size') {
            res = (a.size || 0) - (b.size || 0);
        }
        return sortAsc ? res : -res;
    });

    if (isListView) {
        const getSortIcon = (field) => {
            if (sortField !== field) return '<i class="fas fa-sort" style="opacity:0.35; margin-left:4px; font-size:10px;"></i>';
            return `<i class="fas fa-chevron-${sortAsc ? 'up' : 'down'}" style="color:var(--accent); margin-left:4px; font-size:10px;"></i>`;
        };

        const header = document.createElement('div');
        header.className = 'list-table-header';
        header.innerHTML = `
            <div class="sortable col-name" onclick="toggleSort('name')">Name ${getSortIcon('name')}</div>
            <div class="sortable col-date" onclick="toggleSort('date')">Date Modified ${getSortIcon('date')}</div>
            <div class="sortable col-type" onclick="toggleSort('type')">Type ${getSortIcon('type')}</div>
            <div class="sortable col-size" onclick="toggleSort('size')">Size ${getSortIcon('size')}</div>
            <div class="col-actions">Actions</div>
        `;
        fileGrid.appendChild(header);
    }

    sorted.forEach(item => {
        const el = document.createElement('div');
        el.dataset.path = item.path;

        const iconInfo = getFileIcon(item);
        const sizeStr = item.isDirectory ? (isListView ? '--' : 'Folder') : formatBytes(item.size);
        const dateStr = item.mtime ? new Date(item.mtime).toLocaleDateString() : '--';
        const isImg = isImageFile(item.name);
        const typeLabel = item.isDirectory ? 'DIR' : getFileTypeLabel(item.name);
        const safePath = item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        if (isListView) {
            el.className = `file-item list-row ${selectedItems.has(item.path) ? 'selected' : ''}`;
            el.innerHTML = `
                <div class="col-name">
                    <div class="file-icon-mini" style="color: ${iconInfo.color || 'inherit'}">
                        <i class="${iconInfo.icon}"></i>
                    </div>
                    <span class="file-name-text" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                </div>
                <div class="col-date">${dateStr}</div>
                <div class="col-type"><span class="file-type-pill">${escapeHtml(typeLabel)}</span></div>
                <div class="col-size">${sizeStr}</div>
                <div class="col-actions">
                    <button class="list-action-btn" title="Open" onclick="event.stopPropagation(); window.handleOpenItem('${safePath}', ${item.isDirectory})"><i class="fas fa-arrow-up-right-from-square"></i></button>
                    <button class="list-action-btn" title="Copy Path" onclick="event.stopPropagation(); window.handleCopyPath('${safePath}')"><i class="fas fa-copy"></i></button>
                </div>
            `;
        } else {
            el.className = `file-item grid-card ${selectedItems.has(item.path) ? 'selected' : ''}`;

            let previewContent = '';
            if (showPreviews && isImg && !item.isDirectory) {
                const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');
                previewContent = `<img src="${fileUrl}" class="file-preview-img" onerror="this.parentElement.innerHTML='<div class=\\'file-icon\\' style=\\'color:${iconInfo.color}\\'><i class=\\'${iconInfo.icon}\\'></i></div>'" alt="">`;
            } else {
                previewContent = `<div class="file-icon" style="color: ${iconInfo.color || 'inherit'}"><i class="${iconInfo.icon}"></i></div>`;
            }

            el.innerHTML = `
                <div class="file-preview-container">
                    ${previewContent}
                </div>
                <div class="file-details">
                    <div class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                    <div class="file-meta-row">
                        <span class="file-type-pill">${escapeHtml(typeLabel)}</span>
                        <span class="meta-size">${sizeStr}</span>
                    </div>
                </div>
                <div class="file-card-actions">
                    <button class="card-action-btn" title="Open" onclick="event.stopPropagation(); window.handleOpenItem('${safePath}', ${item.isDirectory})"><i class="fas fa-arrow-up-right-from-square"></i></button>
                    <button class="card-action-btn" title="Copy Path" onclick="event.stopPropagation(); window.handleCopyPath('${safePath}')"><i class="fas fa-copy"></i></button>
                </div>
            `;
        }

        // Click handler -> Selection & Inspector
        el.onclick = (e) => {
            e.stopPropagation();
            if (!e.ctrlKey && !e.shiftKey) clearSelection();
            toggleSelection(item, el);
            inspectItem(item);
        };

        // Double click handler -> Navigate or Open
        el.ondblclick = (e) => {
            e.stopPropagation();
            openItem(item);
        };

        // Context menu handler
        el.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e, item);
        };

        fileGrid.appendChild(el);
    });
}

// ── Selection & Inspector ──────────────────────────────────────────────────
function toggleSelection(item, el) {
    if (selectedItems.has(item.path)) {
        selectedItems.delete(item.path);
        el.classList.remove('selected');
    } else {
        selectedItems.add(item.path);
        el.classList.add('selected');
    }
    updateSelectedCount();
}

function clearSelection() {
    selectedItems.clear();
    document.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected'));
    updateSelectedCount();
}

function updateSelectedCount() {
    if (statSelectedCount) statSelectedCount.innerText = selectedItems.size;
}

function inspectItem(item) {
    if (!previewInspector) return;
    currentInspectedItem = item;
    previewInspector.style.display = 'flex';

    if (inspectorFileName) inspectorFileName.innerText = item.name;
    if (inspectorType) inspectorType.innerText = item.isDirectory ? 'File Folder' : getFileTypeLabel(item.name);
    if (inspectorSize) inspectorSize.innerText = item.isDirectory ? '--' : formatBytes(item.size);
    if (inspectorDate) inspectorDate.innerText = item.mtime ? new Date(item.mtime).toLocaleString() : '--';
    if (inspectorPath) inspectorPath.innerText = item.path;

    if (inspectorPreviewBox) {
        inspectorPreviewBox.innerHTML = '';
        const ext = getExtension(item.name);
        const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

        if (item.isDirectory) {
            inspectorPreviewBox.innerHTML = `<i class="fas fa-folder" style="font-size: 48px; color: var(--accent);"></i>`;
        } else if (isImageFile(item.name)) {
            inspectorPreviewBox.innerHTML = `<img src="${fileUrl}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px;" alt="">`;
        } else if (['mp4', 'webm', 'mov'].includes(ext)) {
            inspectorPreviewBox.innerHTML = `<video src="${fileUrl}" controls style="max-width:100%; max-height:100%; border-radius:8px;"></video>`;
        } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
            inspectorPreviewBox.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <i class="fas fa-music" style="font-size:36px; color:var(--accent);"></i>
                    <audio src="${fileUrl}" controls style="width:100%; max-width:200px; height:32px;"></audio>
                </div>
            `;
        } else if (ext === 'pdf') {
            inspectorPreviewBox.innerHTML = `<i class="fas fa-file-pdf" style="font-size: 48px; color: #EF4444;"></i>`;
        } else {
            const iconInfo = getFileIcon(item);
            inspectorPreviewBox.innerHTML = `<i class="${iconInfo.icon}" style="font-size: 48px; color:${iconInfo.color || 'var(--text-dim)'}"></i>`;
        }
    }
}

// ── Open Item Actions ──────────────────────────────────────────────────────
function openItem(item) {
    if (item.isDirectory) {
        navigateTo(item.path);
        return;
    }

    const ext = getExtension(item.name);
    const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

    if (ext === 'pdf') {
        const targetUrl = `ocal://pdf-viewer?file=${encodeURIComponent(fileUrl)}`;
        if (window.electronAPI && window.electronAPI.newTab) {
            window.electronAPI.newTab(targetUrl);
        } else if (window.electronAPI && window.electronAPI.navigateTo) {
            window.electronAPI.navigateTo(targetUrl);
        }
    } else if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'mp4', 'webm', 'mov'].includes(ext)) {
        openMediaModal(item);
    } else {
        if (window.electronAPI && window.electronAPI.invoke) {
            window.electronAPI.invoke('open-system-item', item.path);
        }
    }
}

// ── Media Modal ────────────────────────────────────────────────────────────
function openMediaModal(item) {
    if (!mediaPlayerModal) return;
    const ext = getExtension(item.name);
    const isVideo = ['mp4', 'webm', 'mov', 'mkv'].includes(ext);
    const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

    if (mediaModalName) mediaModalName.innerText = item.name;
    if (mediaModalIcon) mediaModalIcon.className = `fas ${isVideo ? 'fa-video' : 'fa-music'}`;

    if (mediaModalBody) {
        if (isVideo) {
            mediaModalBody.innerHTML = `<video src="${fileUrl}" controls autoplay style="width:100%; max-height:460px; border-radius:12px; outline:none; background:#000;"></video>`;
        } else {
            mediaModalBody.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:16px; padding:20px;">
                    <div style="width:90px; height:90px; border-radius:50%; background:var(--accent-dim); display:flex; align-items:center; justify-content:center; color:var(--accent); font-size:36px; box-shadow:0 0 24px var(--accent-glow);">
                        <i class="fas fa-music"></i>
                    </div>
                    <audio src="${fileUrl}" controls autoplay style="width:100%; max-width:360px; outline:none;"></audio>
                </div>
            `;
        }
    }

    mediaPlayerModal.style.display = 'flex';
}

function closeMediaModal() {
    if (mediaPlayerModal) {
        mediaPlayerModal.style.display = 'none';
        if (mediaModalBody) mediaModalBody.innerHTML = '';
    }
}

// ── Context Menu ───────────────────────────────────────────────────────────
function showContextMenu(e, item) {
    if (!contextMenu) return;
    contextMenu.style.display = 'block';
    contextMenu.style.left = Math.min(e.pageX, window.innerWidth - 200) + 'px';
    contextMenu.style.top = Math.min(e.pageY, window.innerHeight - 180) + 'px';

    const safePath = item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    contextMenu.innerHTML = `
        <div class="menu-item" onclick="handleOpenItem('${safePath}', ${item.isDirectory})">
            <i class="fas fa-arrow-up-right-from-square"></i> Open
        </div>
        <div class="menu-item" onclick="handleCopyPath('${safePath}')">
            <i class="fas fa-copy"></i> Copy Path
        </div>
        ${!item.isDirectory ? `
        <div class="menu-item" onclick="handleOpenFolder('${safePath}')">
            <i class="fas fa-folder-open"></i> Show in Folder
        </div>` : ''}
        <div class="menu-divider"></div>
        <div class="menu-item danger" onclick="handleDeleteItem('${safePath}')">
            <i class="fas fa-trash"></i> Move to Trash
        </div>
    `;
}

window.handleOpenItem = (pathStr, isDir) => {
    if (isDir) {
        navigateTo(pathStr);
    } else {
        const item = currentItems.find(i => i.path === pathStr) || { name: pathStr.split(/[\\\/]/).pop(), path: pathStr, isDirectory: false };
        openItem(item);
    }
};

window.handleCopyPath = (pathStr) => {
    navigator.clipboard.writeText(pathStr);
};

window.handleOpenFolder = (pathStr) => {
    if (window.electronAPI && window.electronAPI.invoke) {
        window.electronAPI.invoke('open-system-item', currentPath || pathStr);
    }
};

window.handleDeleteItem = async (pathStr) => {
    if (window.electronAPI && window.electronAPI.invoke) {
        const success = await window.electronAPI.invoke('delete-system-item', pathStr);
        if (success && currentPath) {
            navigateTo(currentPath);
        }
    }
};

// ── View Mode & Helpers ────────────────────────────────────────────────────
function setViewMode(isList) {
    isListView = isList;
    fileGrid.classList.toggle('list-view', isList);
    const gridBtn = document.getElementById('view-grid');
    const listBtn = document.getElementById('view-list');
    if (gridBtn) gridBtn.classList.toggle('active', !isList);
    if (listBtn) listBtn.classList.toggle('active', isList);
    if (statModeBadge) statModeBadge.innerText = isList ? 'LIST' : 'GRID';
    renderCurrentFiles();
}
window.setViewMode = setViewMode;

window.toggleSort = (field) => {
    if (sortField === field) {
        sortAsc = !sortAsc;
    } else {
        sortField = field;
        sortAsc = true;
    }
    renderCurrentFiles();
};

function getExtension(filename) {
    if (!filename || !filename.includes('.')) return '';
    return filename.split('.').pop().toLowerCase();
}

function isImageFile(filename) {
    const ext = getExtension(filename);
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
}

function getFileIcon(item) {
    if (item.isDirectory) return { icon: 'fas fa-folder', color: '#F59E0B' };

    const ext = getExtension(item.name);
    switch (ext) {
        case 'pdf': return { icon: 'fas fa-file-pdf', color: '#EF4444' };
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'svg':
        case 'bmp':
        case 'ico': return { icon: 'fas fa-file-image', color: '#06B6D4' };
        case 'mp4':
        case 'mkv':
        case 'mov':
        case 'webm':
        case 'avi': return { icon: 'fas fa-file-video', color: '#8B5CF6' };
        case 'mp3':
        case 'wav':
        case 'flac':
        case 'ogg':
        case 'm4a': return { icon: 'fas fa-file-audio', color: '#10B981' };
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz': return { icon: 'fas fa-file-zipper', color: '#EC4899' };
        case 'js':
        case 'ts':
        case 'html':
        case 'css':
        case 'json':
        case 'py':
        case 'cpp':
        case 'c':
        case 'java':
        case 'cs': return { icon: 'fas fa-file-code', color: '#6366F1' };
        case 'txt':
        case 'md':
        case 'log': return { icon: 'fas fa-file-lines', color: '#9CA3AF' };
        case 'doc':
        case 'docx': return { icon: 'fas fa-file-word', color: '#2563EB' };
        case 'xls':
        case 'xlsx':
        case 'csv': return { icon: 'fas fa-file-excel', color: '#059669' };
        case 'ppt':
        case 'pptx': return { icon: 'fas fa-file-powerpoint', color: '#EA580C' };
        case 'exe':
        case 'msi':
        case 'bat':
        case 'cmd': return { icon: 'fas fa-gear', color: '#64748B' };
        default: return { icon: 'fas fa-file', color: '#9CA3AF' };
    }
}

function getFileTypeLabel(filename) {
    const ext = getExtension(filename).toUpperCase();
    return ext ? `${ext} File` : 'File';
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
