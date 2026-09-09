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

// Media Modal Elements
const mediaPlayerModal = document.getElementById('media-player-modal');
const mediaModalBackdrop = document.getElementById('media-modal-backdrop');
const mediaModalClose = document.getElementById('media-modal-close');
const mediaModalName = document.getElementById('media-modal-name');
const mediaModalIcon = document.getElementById('media-modal-icon');
const mediaModalBody = document.getElementById('media-modal-body');
const audioEnhancerToolbar = document.getElementById('audio-enhancer-toolbar');

const mediaTimeCurrent = document.getElementById('media-time-current');
const mediaTimeDuration = document.getElementById('media-time-duration');
const mediaSeekBar = document.getElementById('media-seek-bar');
const mediaPlayBtn = document.getElementById('media-play-btn');
const mediaMuteBtn = document.getElementById('media-mute-btn');
const mediaVolBar = document.getElementById('media-vol-bar');
const mediaRewBtn = document.getElementById('media-rew-btn');
const mediaFwdBtn = document.getElementById('media-fwd-btn');
const mediaFsBtn = document.getElementById('media-fs-btn');
const mediaOpenTabBtn = document.getElementById('media-open-tab-btn');

// Photo Editor Modal Elements
const photoEditorModal = document.getElementById('photo-editor-modal');
const editorFilename = document.getElementById('editor-filename');
const editorImgTarget = document.getElementById('editor-img-target');
const editorCloseBtn = document.getElementById('editor-close-btn');
const editorSaveBtn = document.getElementById('editor-save-btn');

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

// Active Media State
let currentMediaItem = null;
let currentMediaType = null; // 'audio' or 'video'
let activeAudio = null;
let activeVideo = null;
let isSeeking = false;
let audioCtx = null;
let audioSourceNode = null;
let preampNode = null;
let bassNode = null;
let punchNode = null;
let highsNode = null;
let airNode = null;
let eqNodes = [];
let pannerNode = null;
let compressorNode = null;
let analyserNode = null;
let visualizerAnimFrame = null;
let spatial8dTimer = null;
let spatial8dAngle = 0;
let surroundMode = 'cinema';

// Photo Editor State
let currentPhotoItem = null;
let photoTransform = { rotate: 0, flipH: 1, flipV: 1, scale: 1 };
let photoFilters = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0 };

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
    
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(accentColor, 0.28));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(accentColor, 0.12));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(accentColor, 0.35));
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
        const dropdownMenu = document.getElementById('surround-dropdown-menu');
        if (dropdownMenu && !event.target.closest('#custom-surround-dropdown')) {
            dropdownMenu.classList.remove('open');
        }
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
            if (currentInspectedItem) openItem(currentInspectedItem);
        };
    }

    // Initialize Media Controls & Photo Studio
    initMediaStudioControls();
    initPhotoEditorControls();

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
        if (query && !item.name.toLowerCase().includes(query)) return false;

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

    // Sort items
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

        el.onclick = (e) => {
            e.stopPropagation();
            if (!e.ctrlKey && !e.shiftKey) clearSelection();
            toggleSelection(item, el);
            inspectItem(item);
        };

        el.ondblclick = (e) => {
            e.stopPropagation();
            openItem(item);
        };

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
            inspectorPreviewBox.innerHTML = `<i class="fas fa-folder" style="font-size: 48px; color: #F59E0B;"></i>`;
        } else if (isImageFile(item.name)) {
            inspectorPreviewBox.innerHTML = `<img src="${fileUrl}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px;" alt="">`;
        } else if (['mp4', 'webm', 'mov'].includes(ext)) {
            inspectorPreviewBox.innerHTML = `<i class="fas fa-file-video" style="font-size: 48px; color: #8B5CF6;"></i>`;
        } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
            inspectorPreviewBox.innerHTML = `<i class="fas fa-file-audio" style="font-size: 48px; color: #10B981;"></i>`;
        } else if (ext === 'pdf') {
            inspectorPreviewBox.innerHTML = `<i class="fas fa-file-pdf" style="font-size: 48px; color: #EF4444;"></i>`;
        } else {
            const iconInfo = getFileIcon(item);
            inspectorPreviewBox.innerHTML = `<i class="${iconInfo.icon}" style="font-size: 48px; color:${iconInfo.color || 'var(--text-dim)'}"></i>`;
        }
    }
}

// ── Open Item Router ───────────────────────────────────────────────────────
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
    } else if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma'].includes(ext)) {
        openAudioStudio(item);
    } else if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
        openVideoStudio(item);
    } else if (isImageFile(item.name)) {
        openPhotoStudio(item);
    } else {
        if (window.electronAPI && window.electronAPI.invoke) {
            window.electronAPI.invoke('open-system-item', item.path);
        }
    }
}

// ── AUDIO STUDIO & WEB AUDIO DSP ENGINE ────────────────────────────────────
function ensureAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function initAudioDspPipeline() {
    if (!activeAudio || !audioCtx) return;

    try {
        audioSourceNode = audioCtx.createMediaElementSource(activeAudio);

        // 1. Preamp Node (clean headroom boost)
        preampNode = audioCtx.createGain();
        preampNode.gain.value = 1.15;

        // 2. Dual-Stage Sub-Bass & Punch Filter
        bassNode = audioCtx.createBiquadFilter();
        bassNode.type = 'lowshelf';
        bassNode.frequency.value = 60;
        const bassVal = parseFloat(document.getElementById('fx-bass-slider')?.value || 6);
        bassNode.gain.value = bassVal;

        punchNode = audioCtx.createBiquadFilter();
        punchNode.type = 'peaking';
        punchNode.frequency.value = 110;
        punchNode.Q.value = 1.2;
        punchNode.gain.value = bassVal * 0.6;

        // 3. Dual-Stage Vocal & Highs Air Exciter
        highsNode = audioCtx.createBiquadFilter();
        highsNode.type = 'highshelf';
        highsNode.frequency.value = 3600;
        const clarityOn = document.getElementById('fx-clarity-toggle')?.classList.contains('active');
        const highsVal = parseFloat(document.getElementById('fx-highs-slider')?.value || 4);
        highsNode.gain.value = clarityOn ? highsVal : 0;

        airNode = audioCtx.createBiquadFilter();
        airNode.type = 'peaking';
        airNode.frequency.value = 10500;
        airNode.Q.value = 1.1;
        airNode.gain.value = clarityOn ? highsVal * 0.7 : 0;

        // 4. 10-Band Graphic EQ Nodes
        const freqs = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        eqNodes = freqs.map(freq => {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.4;
            const slider = document.querySelector(`.eq-slider[data-freq="${freq}"]`);
            filter.gain.value = slider ? parseFloat(slider.value) : 0;
            return filter;
        });

        // 5. Stereo Panner Node (Spatial & 3D)
        pannerNode = audioCtx.createStereoPanner();
        pannerNode.pan.value = 0;

        // 6. Studio Mastering Compressor (glues mix, enhances loudness & punch)
        compressorNode = audioCtx.createDynamicsCompressor();
        compressorNode.threshold.value = -16;
        compressorNode.knee.value = 24;
        compressorNode.ratio.value = 3.5;
        compressorNode.attack.value = 0.003;
        compressorNode.release.value = 0.22;

        // 7. Live Real-Time Beat Analyser Node
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64;

        // Connect graph
        let prev = audioSourceNode;
        prev.connect(preampNode);
        prev = preampNode;

        prev.connect(bassNode);
        prev = bassNode;

        prev.connect(punchNode);
        prev = punchNode;

        prev.connect(highsNode);
        prev = highsNode;

        prev.connect(airNode);
        prev = airNode;

        eqNodes.forEach(node => {
            prev.connect(node);
            prev = node;
        });

        prev.connect(pannerNode);
        pannerNode.connect(compressorNode);
        compressorNode.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);

        startBeatVisualizer();
    } catch (err) {
        console.warn('Web Audio DSP graph connection fallback:', err);
    }
}

function startBeatVisualizer() {
    stopBeatVisualizer();
    if (!analyserNode) return;
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const tick = () => {
        if (!activeAudio || activeAudio.paused || !analyserNode) {
            const vinyl = document.getElementById('spinning-vinyl');
            if (vinyl) {
                vinyl.style.boxShadow = '';
                vinyl.style.transform = '';
            }
            return;
        }

        analyserNode.getByteFrequencyData(dataArray);
        let bassSum = 0;
        for (let i = 0; i < 4; i++) {
            bassSum += dataArray[i] || 0;
        }
        const bassLevel = (bassSum / 4) / 255;

        const vinyl = document.getElementById('spinning-vinyl');
        if (vinyl) {
            const glowSize = 35 + bassLevel * 45;
            const scale = 1 + bassLevel * 0.04;
            vinyl.style.boxShadow = `0 14px 40px rgba(0, 0, 0, 0.45), 0 0 ${glowSize}px var(--accent-glow)`;
            vinyl.style.transform = `scale(${scale})`;
        }

        visualizerAnimFrame = requestAnimationFrame(tick);
    };

    visualizerAnimFrame = requestAnimationFrame(tick);
}

function stopBeatVisualizer() {
    if (visualizerAnimFrame) {
        cancelAnimationFrame(visualizerAnimFrame);
        visualizerAnimFrame = null;
    }
    const vinyl = document.getElementById('spinning-vinyl');
    if (vinyl) {
        vinyl.style.boxShadow = '';
        vinyl.style.transform = '';
    }
}

function openAudioStudio(item) {
    stopCurrentMedia();
    currentMediaItem = item;
    currentMediaType = 'audio';

    ensureAudioContext();

    const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

    if (mediaModalName) mediaModalName.innerText = item.name;
    if (mediaModalIcon) mediaModalIcon.className = 'fas fa-music';
    if (audioEnhancerToolbar) audioEnhancerToolbar.style.display = 'block';
    if (mediaFsBtn) mediaFsBtn.style.display = 'none';

    // Turntable Vinyl Stage
    mediaModalBody.innerHTML = `
        <div class="audio-art-stage">
            <div class="spinning-vinyl-art" id="spinning-vinyl">
                <div class="vinyl-groove-ring ring-1"></div>
                <div class="vinyl-groove-ring ring-2"></div>
                <div class="vinyl-center-pin">
                    <i class="fas fa-compact-disc"></i>
                </div>
            </div>
            <div class="audio-track-info">
                <span class="audio-track-title">${escapeHtml(item.name.replace(/\.[^/.]+$/, ''))}</span>
                <span class="audio-track-sub">Local Audio Studio • 3D DSP Active</span>
            </div>
        </div>
    `;

    // Create audio element
    activeAudio = new Audio(fileUrl);
    activeAudio.crossOrigin = 'anonymous';

    // Attach Web Audio DSP
    initAudioDspPipeline();

    // Wire events
    activeAudio.addEventListener('loadedmetadata', () => {
        if (mediaTimeDuration) mediaTimeDuration.innerText = formatTime(activeAudio.duration || 0);
    });

    activeAudio.addEventListener('timeupdate', () => {
        if (!isSeeking && activeAudio && activeAudio.duration) {
            const progress = (activeAudio.currentTime / activeAudio.duration) * 100;
            if (mediaSeekBar) mediaSeekBar.value = progress;
            if (mediaTimeCurrent) mediaTimeCurrent.innerText = formatTime(activeAudio.currentTime);
            if (mediaTimeDuration) mediaTimeDuration.innerText = formatTime(activeAudio.duration);
        }
    });

    activeAudio.addEventListener('ended', () => {
        updatePlayBtnState(false);
    });

    activeAudio.addEventListener('play', () => {
        updatePlayBtnState(true);
        startSpatial8d();
    });

    activeAudio.addEventListener('pause', () => {
        updatePlayBtnState(false);
        stopSpatial8d();
    });

    // Start playback
    activeAudio.play().then(() => {
        updatePlayBtnState(true);
    }).catch(err => {
        console.warn('Audio auto-play policy:', err);
        updatePlayBtnState(false);
    });

    mediaPlayerModal.style.display = 'flex';
}

function openVideoStudio(item) {
    stopCurrentMedia();
    currentMediaItem = item;
    currentMediaType = 'video';

    const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

    if (mediaModalName) mediaModalName.innerText = item.name;
    if (mediaModalIcon) mediaModalIcon.className = 'fas fa-video';
    if (audioEnhancerToolbar) audioEnhancerToolbar.style.display = 'none';
    if (mediaFsBtn) mediaFsBtn.style.display = 'flex';

    mediaModalBody.innerHTML = `
        <video id="active-video-player" src="${fileUrl}" style="width:100%; max-height:420px; border-radius:14px; background:#000; outline:none;"></video>
    `;

    activeVideo = document.getElementById('active-video-player');

    activeVideo.addEventListener('loadedmetadata', () => {
        if (mediaTimeDuration) mediaTimeDuration.innerText = formatTime(activeVideo.duration || 0);
    });

    activeVideo.addEventListener('timeupdate', () => {
        if (!isSeeking && activeVideo && activeVideo.duration) {
            const progress = (activeVideo.currentTime / activeVideo.duration) * 100;
            if (mediaSeekBar) mediaSeekBar.value = progress;
            if (mediaTimeCurrent) mediaTimeCurrent.innerText = formatTime(activeVideo.currentTime);
            if (mediaTimeDuration) mediaTimeDuration.innerText = formatTime(activeVideo.duration);
        }
    });

    activeVideo.addEventListener('ended', () => {
        updatePlayBtnState(false);
    });

    activeVideo.addEventListener('play', () => {
        updatePlayBtnState(true);
    });

    activeVideo.addEventListener('pause', () => {
        updatePlayBtnState(false);
    });

    activeVideo.play().then(() => {
        updatePlayBtnState(true);
    }).catch(() => {
        updatePlayBtnState(false);
    });

    mediaPlayerModal.style.display = 'flex';
}

function stopCurrentMedia() {
    stopSpatial8d();
    stopBeatVisualizer();
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.src = '';
        activeAudio = null;
    }
    if (activeVideo) {
        activeVideo.pause();
        activeVideo.src = '';
        activeVideo = null;
    }
    updatePlayBtnState(false);
    if (mediaSeekBar) mediaSeekBar.value = 0;
    if (mediaTimeCurrent) mediaTimeCurrent.innerText = '0:00';
    if (mediaTimeDuration) mediaTimeDuration.innerText = '0:00';
}

function updatePlayBtnState(isPlaying) {
    if (mediaPlayBtn) {
        mediaPlayBtn.innerHTML = `<i class="fas fa-${isPlaying ? 'pause' : 'play'}"></i>`;
    }
    const vinyl = document.getElementById('spinning-vinyl');
    if (vinyl) {
        vinyl.style.animationPlayState = isPlaying ? 'running' : 'paused';
    }
}

function toggleMediaPlay() {
    ensureAudioContext();
    if (currentMediaType === 'audio' && activeAudio) {
        if (activeAudio.paused) {
            activeAudio.play();
        } else {
            activeAudio.pause();
        }
    } else if (currentMediaType === 'video' && activeVideo) {
        if (activeVideo.paused) {
            activeVideo.play();
        } else {
            activeVideo.pause();
        }
    }
}

function startSpatial8d() {
    if (surroundMode !== 'spatial8d') return;
    stopSpatial8d();
    spatial8dTimer = setInterval(() => {
        if (pannerNode && audioCtx) {
            spatial8dAngle += 0.04;
            const depth = parseFloat(document.getElementById('fx-surround-width')?.value || 0.7);
            pannerNode.pan.value = Math.sin(spatial8dAngle) * depth;
        }
    }, 40);
}

function stopSpatial8d() {
    if (spatial8dTimer) {
        clearInterval(spatial8dTimer);
        spatial8dTimer = null;
    }
    if (pannerNode) pannerNode.pan.value = 0;
}

// ── Initialize Media Controls ──────────────────────────────────────────────
function initMediaStudioControls() {
    if (mediaPlayBtn) mediaPlayBtn.onclick = toggleMediaPlay;

    if (mediaModalClose) {
        mediaModalClose.onclick = () => {
            stopCurrentMedia();
            mediaPlayerModal.style.display = 'none';
        };
    }

    if (mediaModalBackdrop) {
        mediaModalBackdrop.onclick = () => {
            stopCurrentMedia();
            mediaPlayerModal.style.display = 'none';
        };
    }

    // Seek Bar
    if (mediaSeekBar) {
        mediaSeekBar.oninput = () => {
            isSeeking = true;
            const target = activeAudio || activeVideo;
            if (target && target.duration) {
                const time = (mediaSeekBar.value / 100) * target.duration;
                if (mediaTimeCurrent) mediaTimeCurrent.innerText = formatTime(time);
            }
        };

        mediaSeekBar.onchange = () => {
            const target = activeAudio || activeVideo;
            if (target && target.duration) {
                target.currentTime = (mediaSeekBar.value / 100) * target.duration;
            }
            isSeeking = false;
        };
    }

    // Volume Slider & Mute
    if (mediaVolBar) {
        mediaVolBar.oninput = () => {
            const val = parseFloat(mediaVolBar.value);
            if (activeAudio) activeAudio.volume = val;
            if (activeVideo) activeVideo.volume = val;
            updateVolumeIcon(val);
        };
    }

    if (mediaMuteBtn) {
        mediaMuteBtn.onclick = () => {
            const target = activeAudio || activeVideo;
            if (!target) return;
            if (target.volume > 0) {
                target.dataset.prevVol = target.volume;
                target.volume = 0;
                if (mediaVolBar) mediaVolBar.value = 0;
                updateVolumeIcon(0);
            } else {
                const prev = parseFloat(target.dataset.prevVol || 1);
                target.volume = prev;
                if (mediaVolBar) mediaVolBar.value = prev;
                updateVolumeIcon(prev);
            }
        };
    }

    function updateVolumeIcon(vol) {
        if (!mediaMuteBtn) return;
        if (vol === 0) {
            mediaMuteBtn.innerHTML = '<i class="fas fa-volume-xmark"></i>';
        } else if (vol < 0.5) {
            mediaMuteBtn.innerHTML = '<i class="fas fa-volume-low"></i>';
        } else {
            mediaMuteBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
        }
    }

    // Rewind 10s & Forward 10s
    if (mediaRewBtn) {
        mediaRewBtn.onclick = () => {
            const target = activeAudio || activeVideo;
            if (target) target.currentTime = Math.max(0, target.currentTime - 10);
        };
    }

    if (mediaFwdBtn) {
        mediaFwdBtn.onclick = () => {
            const target = activeAudio || activeVideo;
            if (target && target.duration) target.currentTime = Math.min(target.duration, target.currentTime + 10);
        };
    }

    // Open in Tab
    if (mediaOpenTabBtn) {
        mediaOpenTabBtn.onclick = () => {
            if (currentMediaItem) {
                const fileUrl = 'file:///' + currentMediaItem.path.replace(/\\/g, '/');
                if (window.electronAPI && window.electronAPI.newTab) {
                    window.electronAPI.newTab(fileUrl);
                }
            }
        };
    }

    // Fullscreen for video
    if (mediaFsBtn) {
        mediaFsBtn.onclick = () => {
            if (activeVideo) {
                if (activeVideo.requestFullscreen) activeVideo.requestFullscreen();
            }
        };
    }

    // Audio FX Tab Switching
    const tabs = [
        { btn: 'enhancer-tab-3d', panel: 'panel-3d' },
        { btn: 'enhancer-tab-clarity', panel: 'panel-clarity' },
        { btn: 'enhancer-tab-bass', panel: 'panel-bass' },
        { btn: 'enhancer-tab-eq', panel: 'panel-eq' }
    ];

    tabs.forEach(({ btn, panel }) => {
        const tabEl = document.getElementById(btn);
        if (tabEl) {
            tabEl.onclick = () => {
                document.querySelectorAll('.enhancer-pill-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.enhancer-panel').forEach(p => p.style.display = 'none');
                tabEl.classList.add('active');
                const panelEl = document.getElementById(panel);
                if (panelEl) panelEl.style.display = (panel === 'panel-eq' ? 'flex' : 'flex');
            };
        }
    });

    // Surround Dropdown
    const trigger = document.getElementById('surround-dropdown-trigger');
    const menu = document.getElementById('surround-dropdown-menu');
    if (trigger && menu) {
        trigger.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        };

        menu.querySelectorAll('.fx-dropdown-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                menu.querySelectorAll('.fx-dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                surroundMode = item.getAttribute('data-value') || 'cinema';
                const currentVal = document.getElementById('surround-current-val');
                if (currentVal) currentVal.innerHTML = item.innerHTML;
                menu.classList.remove('open');

                if (surroundMode === 'spatial8d') {
                    startSpatial8d();
                } else {
                    stopSpatial8d();
                }
            };
        });
    }

    // Spatial Depth Slider
    const surroundWidthSlider = document.getElementById('fx-surround-width');
    if (surroundWidthSlider) {
        surroundWidthSlider.oninput = () => {
            if (pannerNode && surroundMode !== 'spatial8d') {
                pannerNode.pan.value = (parseFloat(surroundWidthSlider.value) - 0.5) * 0.4;
            }
        };
    }

    // Clarity Toggle & Slider
    const clarityToggle = document.getElementById('fx-clarity-toggle');
    const highsSlider = document.getElementById('fx-highs-slider');
    if (clarityToggle) {
        clarityToggle.onclick = () => {
            clarityToggle.classList.toggle('active');
            const isOn = clarityToggle.classList.contains('active');
            clarityToggle.innerText = isOn ? 'ON' : 'OFF';
            const val = parseFloat(highsSlider?.value || 4);
            if (highsNode) highsNode.gain.value = isOn ? val : 0;
            if (airNode) airNode.gain.value = isOn ? val * 0.7 : 0;
        };
    }
    if (highsSlider) {
        highsSlider.oninput = () => {
            const val = parseFloat(highsSlider.value);
            if (clarityToggle?.classList.contains('active')) {
                if (highsNode) highsNode.gain.value = val;
                if (airNode) airNode.gain.value = val * 0.7;
            }
        };
    }

    // Bass Boost Slider
    const bassSlider = document.getElementById('fx-bass-slider');
    if (bassSlider) {
        bassSlider.oninput = () => {
            const val = parseFloat(bassSlider.value);
            if (bassNode) bassNode.gain.value = val;
            if (punchNode) punchNode.gain.value = val * 0.6;
        };
    }

    // 10-Band EQ Presets
    const eqPresets = {
        flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass: [6, 5, 3, 1, 0, 0, 0, 0, 0, 0],
        vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
        rock: [5, 3, 1, 0, -1, 0, 2, 3, 4, 4],
        pop: [-1, 1, 3, 4, 4, 3, 1, -1, 2, 3],
        electronic: [5, 4, 1, 0, -2, 2, 1, 2, 4, 5]
    };

    document.querySelectorAll('.eq-preset-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const presetName = btn.getAttribute('data-preset');
            const values = eqPresets[presetName] || eqPresets.flat;

            document.querySelectorAll('.eq-slider').forEach((slider, idx) => {
                const val = values[idx] || 0;
                slider.value = val;
                const valLabel = slider.parentElement?.querySelector('.eq-val');
                if (valLabel) valLabel.innerText = (val > 0 ? '+' : '') + val;
                if (eqNodes[idx]) eqNodes[idx].gain.value = val;
            });
        };
    });

    // EQ Sliders Drag
    document.querySelectorAll('.eq-slider').forEach((slider, idx) => {
        slider.oninput = () => {
            const val = parseFloat(slider.value);
            const valLabel = slider.parentElement?.querySelector('.eq-val');
            if (valLabel) valLabel.innerText = (val > 0 ? '+' : '') + val;
            if (eqNodes[idx]) eqNodes[idx].gain.value = val;
        };
    });
}

// ── PHOTO STUDIO & VIEWER ──────────────────────────────────────────────────
function openPhotoStudio(item) {
    currentPhotoItem = item;
    const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

    photoTransform = { rotate: 0, flipH: 1, flipV: 1, scale: 1 };
    photoFilters = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0 };

    if (editorFilename) editorFilename.innerText = item.name;
    if (editorImgTarget) {
        editorImgTarget.src = fileUrl;
        applyPhotoTransforms();
    }

    // Reset sliders in UI
    const bSlider = document.getElementById('slider-brightness');
    const cSlider = document.getElementById('slider-contrast');
    const sSlider = document.getElementById('slider-saturation');
    const sepSlider = document.getElementById('slider-sepia');
    const blurSlider = document.getElementById('slider-blur');

    if (bSlider) bSlider.value = 100;
    if (cSlider) cSlider.value = 100;
    if (sSlider) sSlider.value = 100;
    if (sepSlider) sepSlider.value = 0;
    if (blurSlider) blurSlider.value = 0;

    document.querySelectorAll('.editor-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.editor-chip[data-preset="normal"]')?.classList.add('active');

    if (photoEditorModal) photoEditorModal.style.display = 'flex';
}

function applyPhotoTransforms() {
    if (!editorImgTarget) return;
    const { rotate, flipH, flipV, scale } = photoTransform;
    const { brightness, contrast, saturation, sepia, blur } = photoFilters;

    editorImgTarget.style.transform = `scale(${scale}) scaleX(${flipH}) scaleY(${flipV}) rotate(${rotate}deg)`;
    editorImgTarget.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) blur(${blur}px)`;
}

function initPhotoEditorControls() {
    if (editorCloseBtn) {
        editorCloseBtn.onclick = () => {
            if (photoEditorModal) photoEditorModal.style.display = 'none';
        };
    }

    if (editorSaveBtn) {
        editorSaveBtn.onclick = () => {
            if (currentPhotoItem) {
                const fileUrl = 'file:///' + currentPhotoItem.path.replace(/\\/g, '/');
                if (window.electronAPI && window.electronAPI.newTab) {
                    window.electronAPI.newTab(fileUrl);
                }
            }
        };
    }

    // Rotate Left & Right
    document.getElementById('tool-rotate-left')?.addEventListener('click', () => {
        photoTransform.rotate = (photoTransform.rotate - 90) % 360;
        applyPhotoTransforms();
    });

    document.getElementById('tool-rotate-right')?.addEventListener('click', () => {
        photoTransform.rotate = (photoTransform.rotate + 90) % 360;
        applyPhotoTransforms();
    });

    // Flip Horizontal & Vertical
    document.getElementById('tool-flip-h')?.addEventListener('click', () => {
        photoTransform.flipH *= -1;
        applyPhotoTransforms();
    });

    document.getElementById('tool-flip-v')?.addEventListener('click', () => {
        photoTransform.flipV *= -1;
        applyPhotoTransforms();
    });

    // Zoom
    document.getElementById('tool-zoom-in')?.addEventListener('click', () => {
        photoTransform.scale = Math.min(3, photoTransform.scale + 0.25);
        applyPhotoTransforms();
    });

    document.getElementById('tool-zoom-out')?.addEventListener('click', () => {
        photoTransform.scale = Math.max(0.25, photoTransform.scale - 0.25);
        applyPhotoTransforms();
    });

    document.getElementById('tool-fit')?.addEventListener('click', () => {
        photoTransform.scale = 1;
        applyPhotoTransforms();
    });

    document.getElementById('tool-reset')?.addEventListener('click', () => {
        photoTransform = { rotate: 0, flipH: 1, flipV: 1, scale: 1 };
        photoFilters = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0 };
        applyPhotoTransforms();
    });

    // Photo Presets
    const presets = {
        normal: { brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0 },
        vivid: { brightness: 110, contrast: 125, saturation: 140, sepia: 0, blur: 0 },
        bw: { brightness: 105, contrast: 120, saturation: 0, sepia: 0, blur: 0 },
        sepia: { brightness: 95, contrast: 110, saturation: 80, sepia: 75, blur: 0 },
        cyber: { brightness: 115, contrast: 135, saturation: 180, sepia: 0, blur: 0 },
        warm: { brightness: 105, contrast: 105, saturation: 120, sepia: 30, blur: 0 }
    };

    document.querySelectorAll('.editor-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('.editor-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const p = presets[chip.getAttribute('data-preset')] || presets.normal;
            photoFilters = { ...p };
            applyPhotoTransforms();
        };
    });

    // Sliders
    const bSlider = document.getElementById('slider-brightness');
    const cSlider = document.getElementById('slider-contrast');
    const sSlider = document.getElementById('slider-saturation');
    const sepSlider = document.getElementById('slider-sepia');
    const blurSlider = document.getElementById('slider-blur');

    if (bSlider) {
        bSlider.oninput = () => {
            photoFilters.brightness = bSlider.value;
            document.getElementById('val-brightness').innerText = bSlider.value + '%';
            applyPhotoTransforms();
        };
    }
    if (cSlider) {
        cSlider.oninput = () => {
            photoFilters.contrast = cSlider.value;
            document.getElementById('val-contrast').innerText = cSlider.value + '%';
            applyPhotoTransforms();
        };
    }
    if (sSlider) {
        sSlider.oninput = () => {
            photoFilters.saturation = sSlider.value;
            document.getElementById('val-saturation').innerText = sSlider.value + '%';
            applyPhotoTransforms();
        };
    }
    if (sepSlider) {
        sepSlider.oninput = () => {
            photoFilters.sepia = sepSlider.value;
            document.getElementById('val-sepia').innerText = sepSlider.value + '%';
            applyPhotoTransforms();
        };
    }
    if (blurSlider) {
        blurSlider.oninput = () => {
            photoFilters.blur = blurSlider.value;
            document.getElementById('val-blur').innerText = blurSlider.value + 'px';
            applyPhotoTransforms();
        };
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
        <div class="context-menu-item" onclick="handleOpenItem('${safePath}', ${item.isDirectory})">
            <i class="fas fa-arrow-up-right-from-square"></i> Open
        </div>
        <div class="context-menu-item" onclick="handleCopyPath('${safePath}')">
            <i class="fas fa-copy"></i> Copy Path
        </div>
        ${!item.isDirectory ? `
        <div class="context-menu-item" onclick="handleOpenFolder('${safePath}')">
            <i class="fas fa-folder-open"></i> Show in Folder
        </div>` : ''}
        <div class="menu-divider" style="height:1px; background:var(--border-color); margin:4px 0;"></div>
        <div class="context-menu-item danger" style="color:#EF4444;" onclick="handleDeleteItem('${safePath}')">
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
        case 'm4a':
        case 'aac':
        case 'wma': return { icon: 'fas fa-file-audio', color: '#10B981' };
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

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
