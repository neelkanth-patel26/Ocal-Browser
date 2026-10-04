// ── Ocal Browser Bento File Hub & Media Studio ──────────────────────────────

// DOM Elements
const fileGrid = document.getElementById('file-grid');
const breadcrumbs = document.getElementById('breadcrumbs');
const directPathInput = document.getElementById('direct-path-input');
const pathDisplayBox = document.getElementById('path-display-box');
const editPathBtn = document.getElementById('edit-path-btn');
const copyPathBtn = document.getElementById('copy-path-btn');

const pageTitle = document.getElementById('page-title');
const pageEyebrow = document.getElementById('page-eyebrow');
const currentPathEl = document.getElementById('current-path');
const itemCountEl = document.getElementById('item-count');
const statItemsCount = document.getElementById('stat-items-count');
const statSelectedCount = document.getElementById('stat-selected-count');
const statSelectedSize = document.getElementById('stat-selected-size');
const statusFreeSpace = document.getElementById('status-free-space');

const navBackBtn = document.getElementById('nav-back-btn');
const navForwardBtn = document.getElementById('nav-forward-btn');
const navUpBtn = document.getElementById('nav-up-btn');
const refreshDirBtn = document.getElementById('refresh-dir-btn');
const refreshDrivesBtn = document.getElementById('refresh-drives-btn');

const fileSearch = document.getElementById('file-search');
const searchClearBtn = document.getElementById('search-clear-btn');
const searchCountBadge = document.getElementById('search-count-badge');
const cleanModePill = document.getElementById('clean-mode-pill');
const togglePreviewsBtn = document.getElementById('toggle-previews-btn');

const viewGridBtn = document.getElementById('view-grid');
const viewListBtn = document.getElementById('view-list');
const viewCompactBtn = document.getElementById('view-compact');

const sortMenuBtn = document.getElementById('sort-menu-btn');
const sortDropdownMenu = document.getElementById('sort-dropdown-menu');
const sortCurrentLbl = document.getElementById('sort-current-lbl');
const sortOrderToggle = document.getElementById('sort-order-toggle');
const sortOrderIcon = document.getElementById('sort-order-icon');
const sortOrderLbl = document.getElementById('sort-order-lbl');

const sidebarNewFolderBtn = document.getElementById('sidebar-new-folder-btn');
const topNewFolderBtn = document.getElementById('top-new-folder-btn');
const drivesListEl = document.getElementById('drives-list');
const contextMenu = document.getElementById('context-menu');

// Inspector Elements
const previewInspector = document.getElementById('preview-inspector');
const toggleInspectorBtn = document.getElementById('toggle-inspector-btn');
const inspectorCloseBtn = document.getElementById('inspector-close-btn');
const inspectorOpenBtn = document.getElementById('inspector-open-btn');
const inspectorShowFolderBtn = document.getElementById('inspector-show-folder-btn');
const inspectorTrashBtn = document.getElementById('inspector-trash-btn');
const inspectorCopyPathBtn = document.getElementById('inspector-copy-path-btn');
const inspectorPreviewBox = document.getElementById('inspector-preview-box');
const inspectorFileName = document.getElementById('inspector-file-name');
const inspectorType = document.getElementById('inspector-type');
const inspectorSize = document.getElementById('inspector-size');
const inspectorDate = document.getElementById('inspector-date');
const inspectorCreated = document.getElementById('inspector-created');
const inspectorPath = document.getElementById('inspector-path');
const inspectorSnippetCard = document.getElementById('inspector-snippet-card');
const snippetCode = document.getElementById('snippet-code');
const snippetLen = document.getElementById('snippet-len');

// Input Modal Elements (New Folder / Rename)
const inputModal = document.getElementById('input-modal');
const modalTitle = document.getElementById('modal-title');
const modalIconBadge = document.getElementById('modal-icon-badge');
const modalInputLabel = document.getElementById('modal-input-label');
const modalInputField = document.getElementById('modal-input-field');
const modalErrorMsg = document.getElementById('modal-error-msg');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');

// Media Modal Elements
const mediaPlayerModal = document.getElementById('media-player-modal');
const mediaModalBackdrop = document.getElementById('media-modal-backdrop');
const mediaModalClose = document.getElementById('media-modal-close');
const mediaModalName = document.getElementById('media-modal-name');
const mediaModalIcon = document.getElementById('media-modal-icon');
const mediaModalBody = document.getElementById('media-modal-body');
const mediaTimeCurrent = document.getElementById('media-time-current');
const mediaTimeDuration = document.getElementById('media-time-duration');
const mediaSeekBar = document.getElementById('media-seek-bar');
const mediaPlayBtn = document.getElementById('media-play-btn');
const mediaMuteBtn = document.getElementById('media-mute-btn');
const mediaVolBar = document.getElementById('media-vol-bar');
const mediaRewBtn = document.getElementById('media-rew-btn');
const mediaFwdBtn = document.getElementById('media-fwd-btn');
const mediaFsBtn = document.getElementById('media-fs-btn');
const mediaOpenMusicPlayerBtn = document.getElementById('media-open-music-player-btn');

// Photo Editor Modal Elements
const photoEditorModal = document.getElementById('photo-editor-modal');
const editorFilename = document.getElementById('editor-filename');
const editorImgTarget = document.getElementById('editor-img-target');
const editorCloseBtn = document.getElementById('editor-close-btn');
const editorSaveBtn = document.getElementById('editor-save-btn');
const editorCompareBtn = document.getElementById('editor-compare-btn');
const editorCopyBtn = document.getElementById('editor-copy-btn');
const editorOpenTabBtn = document.getElementById('editor-open-tab-btn');

// ── State ──────────────────────────────────────────────────────────────────
let currentPath = '';
let currentItems = [];
let systemFolders = {};
let systemDrives = [];
let historyStack = [];
let historyIndex = -1;

let viewMode = localStorage.getItem('ocal-fm-view-mode') || 'grid'; // 'grid' | 'list' | 'compact'
let showPreviews = localStorage.getItem('ocal-fm-previews') !== 'false';
let cleanMode = localStorage.getItem('ocal-fm-clean-mode') !== 'false'; // Default TRUE: hide junk
let inspectorOpen = localStorage.getItem('ocal-fm-inspector') === 'true';

let selectedItems = new Set(); // Stores item paths
let activeCategory = 'all';
let currentInspectedItem = null;
let sortField = localStorage.getItem('ocal-fm-sort-field') || 'name';
let sortAsc = localStorage.getItem('ocal-fm-sort-asc') !== 'false';

let modalAction = null; // { type: 'new-folder' | 'rename', targetItem?: item }

// Audio DSP State
let currentMediaItem = null;
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
let photoTransform = { rotate: 0, flipH: 1, flipV: 1, scale: 1, panX: 0, panY: 0 };
let photoFilters = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0, invert: 0 };
let isPanningPhoto = false;
let panStartX = 0;
let panStartY = 0;
let isComparingPhoto = false;

// ── Unwanted Files & Clutter Filter Definitions ────────────────────────────
const UNWANTED_EXACT = new Set([
    'desktop.ini', 'thumbs.db', 'ehthumbs.db',
    'system volume information', '$recycle.bin', 'recovery',
    'config.msi', 'msocache', 'bootmgr', 'bootnxt', 'bootstat.dat',
    'pagefile.sys', 'swapfile.sys', 'hiberfil.sys', 'dumpstack.log.tmp',
    'dumpstack.log', 'ntuser.ini', '.ds_store', '.localized',
    'onedrivetemp', 'documents and settings'
]);

const WINDOWS_JUNCTIONS = new Set([
    'application data', 'cookies', 'local settings', 'nethood',
    'printhood', 'recent', 'sendto', 'start menu', 'templates', 'my documents'
]);

// Helper to filter out unwanted system files and clutter
function isUnwantedFile(item) {
    if (!item || !item.name) return true;
    const name = item.name;
    const lower = name.toLowerCase();

    // 1. Always exclude core OS files, crash dumps, and recycle bins
    if (UNWANTED_EXACT.has(lower)) return true;
    if (lower.startsWith('$')) return true;
    if (lower.startsWith('ntuser.dat') || lower.startsWith('usrclass.dat')) return true;
    if (name.startsWith('~$')) return true; // Office temporary lock files

    // 2. Filter out Windows restricted junction directories
    if (WINDOWS_JUNCTIONS.has(lower)) return true;

    // 3. Clean mode suppresses dot-files, AppData, and temporary downloads
    if (cleanMode) {
        if (name.startsWith('.')) return true;
        if (lower === 'appdata') return true;
        if (lower.endsWith('.tmp') || lower.endsWith('.crdownload') || lower.endsWith('.part')) return true;
    }

    return false;
}

// ── Dynamic Theme & Accent Helper ──────────────────────────────────────────
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
    await loadSystemEnvironment();

    // 3. Setup Navigation History Controls
    if (navBackBtn) navBackBtn.onclick = () => goBack();
    if (navForwardBtn) navForwardBtn.onclick = () => goForward();
    if (navUpBtn) navUpBtn.onclick = () => navigateUp();
    if (refreshDirBtn) refreshDirBtn.onclick = () => refreshCurrentDirectory();
    if (refreshDrivesBtn) refreshDrivesBtn.onclick = () => loadSystemEnvironment();

    // 4. Setup Omnibar & Direct Path Editing
    setupOmnibarControls();

    // 5. Setup Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            const folderKey = btn.getAttribute('data-folder');
            if (systemFolders[folderKey]) {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.drive-bento-card').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (pageTitle) pageTitle.innerText = btn.querySelector('.nav-label')?.innerText || 'Local Storage';
                if (pageEyebrow) pageEyebrow.innerText = 'Quick Access';
                navigateTo(systemFolders[folderKey]);
            }
        };
    });

    // 6. View Mode Controls
    setupViewModeControls();

    // 7. Clean Mode Pill (Suppresses unwanted OS files)
    if (cleanModePill) {
        updateCleanModeUi();
        cleanModePill.onclick = () => {
            cleanMode = !cleanMode;
            localStorage.setItem('ocal-fm-clean-mode', cleanMode);
            updateCleanModeUi();
            renderCurrentFiles();
        };
    }

    // 8. Previews Toggle
    if (togglePreviewsBtn) {
        togglePreviewsBtn.classList.toggle('active', showPreviews);
        togglePreviewsBtn.onclick = () => {
            showPreviews = !showPreviews;
            localStorage.setItem('ocal-fm-previews', showPreviews);
            togglePreviewsBtn.classList.toggle('active', showPreviews);
            renderCurrentFiles();
        };
    }

    // 9. Sort Menu Controls
    setupSortControls();

    // 10. Search Controls
    setupSearchControls();

    // 11. Category Ribbon Filters
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.onclick = () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-cat') || 'all';
            renderCurrentFiles();
        };
    });

    // 12. Inspector Controls
    setupInspectorControls();

    // 13. Dialog Modals (New Folder / Rename)
    setupModalControls();

    // 14. Media Players & Photo Studio Controls
    initMediaStudioControls();
    initPhotoEditorControls();

    // 15. Global Click Handlers & Keyboard Shortcuts
    setupGlobalShortcuts();

    // 16. Initial Load: Home folder
    const initialDir = systemFolders.home || systemFolders.downloads || systemFolders.desktop || 'C:\\';
    navigateTo(initialDir);
});

// ── Environment & Drives Loading ───────────────────────────────────────────
async function loadSystemEnvironment() {
    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            systemFolders = await window.electronAPI.invoke('get-system-folders') || {};
            systemDrives = await window.electronAPI.invoke('get-system-drives') || [];
        }
    } catch (e) {
        console.error('Failed to load system environment:', e);
    }
    renderDrivesList();
}

function renderDrivesList() {
    if (!drivesListEl) return;
    drivesListEl.innerHTML = '';
    
    if (systemDrives.length === 0) {
        drivesListEl.innerHTML = `
            <div class="drive-bento-card" onclick="navigateTo('C:\\\\')">
                <div class="drive-card-top">
                    <div class="drive-info-cluster">
                        <i class="fas fa-hard-drive drive-icon-wrap"></i>
                        <span class="drive-title-text">Local Disk</span>
                    </div>
                    <span class="drive-letter-chip">C:</span>
                </div>
            </div>
        `;
        return;
    }

    systemDrives.forEach(drive => {
        const card = document.createElement('div');
        card.className = `drive-bento-card ${currentPath.startsWith(drive.path) ? 'active' : ''}`;
        
        const percent = typeof drive.percentUsed === 'number' ? drive.percentUsed : 0;
        let fillClass = '';
        if (percent >= 90) fillClass = 'danger';
        else if (percent >= 75) fillClass = 'warning';

        const freeStr = drive.freeBytes ? `${formatBytes(drive.freeBytes)} free` : '';
        const totalStr = drive.totalBytes ? formatBytes(drive.totalBytes) : '';
        const spaceSub = freeStr ? `${freeStr} of ${totalStr}` : drive.path;

        card.innerHTML = `
            <div class="drive-card-top">
                <div class="drive-info-cluster">
                    <i class="fas ${drive.isMobile ? 'fa-mobile-screen' : 'fa-hard-drive'} drive-icon-wrap"></i>
                    <span class="drive-title-text" title="${escapeHtml(drive.name)}">${escapeHtml(drive.name)}</span>
                </div>
                <span class="drive-letter-chip">${escapeHtml(drive.letter ? drive.letter + ':' : 'VOL')}</span>
            </div>
            ${drive.totalBytes > 0 ? `
            <div class="drive-track-wrap">
                <div class="drive-fill-bar ${fillClass}" style="width: ${percent}%;"></div>
            </div>
            <div class="drive-meta-sub">
                <span>${escapeHtml(spaceSub)}</span>
                <span>${percent}%</span>
            </div>
            ` : ''}
        `;

        card.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.drive-bento-card').forEach(b => b.classList.remove('active'));
            card.classList.add('active');
            if (pageTitle) pageTitle.innerText = drive.name;
            if (pageEyebrow) pageEyebrow.innerText = 'Storage Volume';
            navigateTo(drive.path);
        };

        drivesListEl.appendChild(card);
    });
}

// ── Navigation & History Stack ─────────────────────────────────────────────
async function navigateTo(targetPath, pushHistory = true) {
    if (!targetPath) return;
    targetPath = targetPath.trim();
    if (/^[a-zA-Z]:$/i.test(targetPath)) targetPath += '\\';

    currentPath = targetPath;

    // Update History Stack
    if (pushHistory) {
        historyStack = historyStack.slice(0, historyIndex + 1);
        historyStack.push(targetPath);
        historyIndex = historyStack.length - 1;
    }
    updateHistoryButtons();

    // Update Status and Title
    if (currentPathEl) currentPathEl.innerText = targetPath;
    updateBreadcrumbs(targetPath);
    updateDriveActiveState(targetPath);

    fileGrid.innerHTML = `
        <div class="empty-state-card">
            <i class="fas fa-circle-notch fa-spin empty-state-icon-wrap" style="box-shadow:none; background:transparent; font-size:32px;"></i>
            <span style="font-size:13px; color:var(--text-muted); font-weight:600;">Loading files...</span>
        </div>
    `;

    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            const items = await window.electronAPI.invoke('get-directory-entries', targetPath, { showHidden: !cleanMode });
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

function refreshCurrentDirectory() {
    if (!currentPath) return;
    if (refreshDirBtn) {
        const icon = refreshDirBtn.querySelector('i');
        if (icon) {
            icon.classList.add('fa-spin');
            setTimeout(() => icon.classList.remove('fa-spin'), 600);
        }
    }
    navigateTo(currentPath, false);
}

function goBack() {
    if (historyIndex > 0) {
        historyIndex--;
        navigateTo(historyStack[historyIndex], false);
    }
}

function goForward() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        navigateTo(historyStack[historyIndex], false);
    }
}

function navigateUp() {
    if (!currentPath) return;
    const normalized = currentPath.replace(/[\/\\]+$/, '');
    const lastSlash = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
    if (lastSlash > 0) {
        let parentPath = normalized.slice(0, lastSlash);
        if (/^[a-zA-Z]:$/i.test(parentPath)) parentPath += '\\';
        navigateTo(parentPath);
    } else if (lastSlash === 0) {
        navigateTo('/');
    } else {
        // Fallback to PC root
        navigateTo(systemFolders.home || 'C:\\');
    }
}

function updateHistoryButtons() {
    if (navBackBtn) navBackBtn.disabled = historyIndex <= 0;
    if (navForwardBtn) navForwardBtn.disabled = historyIndex >= historyStack.length - 1;
}

function updateDriveActiveState(targetPath) {
    document.querySelectorAll('.drive-bento-card').forEach(card => {
        const titleEl = card.querySelector('.drive-title-text');
        const letterEl = card.querySelector('.drive-letter-chip');
        const letter = letterEl?.innerText?.replace(':', '');
        if (letter && targetPath.toUpperCase().startsWith(letter.toUpperCase() + ':')) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// ── Breadcrumbs & Omnibar Controls ─────────────────────────────────────────
function setupOmnibarControls() {
    if (editPathBtn && directPathInput && breadcrumbs) {
        editPathBtn.onclick = () => toggleDirectPathInput(true);

        directPathInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const newPath = directPathInput.value.trim();
                toggleDirectPathInput(false);
                if (newPath) navigateTo(newPath);
            } else if (e.key === 'Escape') {
                toggleDirectPathInput(false);
            }
        };

        directPathInput.onblur = () => {
            toggleDirectPathInput(false);
        };
    }

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
}

function toggleDirectPathInput(showInput) {
    if (!directPathInput || !breadcrumbs) return;
    if (showInput) {
        directPathInput.value = currentPath;
        directPathInput.style.display = 'block';
        breadcrumbs.style.display = 'none';
        directPathInput.focus();
        directPathInput.select();
    } else {
        directPathInput.style.display = 'none';
        breadcrumbs.style.display = 'flex';
    }
}

function updateBreadcrumbs(pathStr) {
    if (!breadcrumbs) return;
    breadcrumbs.innerHTML = '';
    const parts = pathStr.split(/[\/\\]/).filter(p => p);

    const rootItem = document.createElement('span');
    rootItem.className = 'breadcrumb-item';
    rootItem.innerHTML = '<i class="fas fa-computer" style="margin-right:4px;"></i> This PC';
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

    breadcrumbs.scrollLeft = breadcrumbs.scrollWidth;
}

// ── Clean Mode UI ──────────────────────────────────────────────────────────
function updateCleanModeUi() {
    if (!cleanModePill) return;
    cleanModePill.classList.toggle('active', cleanMode);
    cleanModePill.innerHTML = cleanMode ?
        '<i class="fas fa-sparkles"></i> <span>Clean Mode</span>' :
        '<i class="fas fa-eye"></i> <span>Show Hidden</span>';
    cleanModePill.title = cleanMode ?
        'Clean Mode: Unwanted system files, dumps, and desktop.ini are hidden (Click to show all)' :
        'Showing all files including dotfiles (Click for Clean Mode)';
}

// ── View Mode Controls ─────────────────────────────────────────────────────
function setupViewModeControls() {
    setViewMode(viewMode, false);

    if (viewGridBtn) viewGridBtn.onclick = () => setViewMode('grid');
    if (viewListBtn) viewListBtn.onclick = () => setViewMode('list');
    if (viewCompactBtn) viewCompactBtn.onclick = () => setViewMode('compact');
}

function setViewMode(mode, save = true) {
    viewMode = mode;
    if (save) localStorage.setItem('ocal-fm-view-mode', mode);

    fileGrid.classList.remove('grid-mode', 'list-mode', 'compact-mode');
    fileGrid.classList.add(`${mode}-mode`);

    if (viewGridBtn) viewGridBtn.classList.toggle('active', mode === 'grid');
    if (viewListBtn) viewListBtn.classList.toggle('active', mode === 'list');
    if (viewCompactBtn) viewCompactBtn.classList.toggle('active', mode === 'compact');

    renderCurrentFiles();
}

// ── Sort Controls ──────────────────────────────────────────────────────────
function setupSortControls() {
    if (sortMenuBtn && sortDropdownMenu) {
        sortMenuBtn.onclick = (e) => {
            e.stopPropagation();
            sortDropdownMenu.classList.toggle('open');
        };

        document.querySelectorAll('.sort-item[data-sort]').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.sort-item[data-sort]').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                sortField = item.getAttribute('data-sort');
                localStorage.setItem('ocal-fm-sort-field', sortField);
                if (sortCurrentLbl) sortCurrentLbl.innerText = item.innerText.trim();
                sortDropdownMenu.classList.remove('open');
                renderCurrentFiles();
            };
        });

        if (sortOrderToggle) {
            sortOrderToggle.onclick = (e) => {
                e.stopPropagation();
                sortAsc = !sortAsc;
                localStorage.setItem('ocal-fm-sort-asc', sortAsc);
                updateSortOrderUi();
                renderCurrentFiles();
            };
        }
    }
    updateSortOrderUi();
}

function updateSortOrderUi() {
    if (sortOrderIcon) sortOrderIcon.className = sortAsc ? 'fas fa-arrow-up-wide-short' : 'fas fa-arrow-down-wide-short';
    if (sortOrderLbl) sortOrderLbl.innerText = sortAsc ? 'Ascending' : 'Descending';
}

// ── Search Controls ────────────────────────────────────────────────────────
function setupSearchControls() {
    if (fileSearch) {
        fileSearch.oninput = () => {
            const hasText = Boolean(fileSearch.value.trim());
            if (searchClearBtn) searchClearBtn.style.display = hasText ? 'flex' : 'none';
            renderCurrentFiles();
        };
    }

    if (searchClearBtn) {
        searchClearBtn.onclick = () => {
            fileSearch.value = '';
            searchClearBtn.style.display = 'none';
            if (searchCountBadge) searchCountBadge.style.display = 'none';
            renderCurrentFiles();
            fileSearch.focus();
        };
    }
}

// ── Inspector Controls ─────────────────────────────────────────────────────
function setupInspectorControls() {
    if (toggleInspectorBtn) {
        toggleInspectorBtn.classList.toggle('active', inspectorOpen);
        if (previewInspector) previewInspector.style.display = inspectorOpen ? 'flex' : 'none';

        toggleInspectorBtn.onclick = () => {
            inspectorOpen = !inspectorOpen;
            localStorage.setItem('ocal-fm-inspector', inspectorOpen);
            toggleInspectorBtn.classList.toggle('active', inspectorOpen);
            if (previewInspector) previewInspector.style.display = inspectorOpen ? 'flex' : 'none';
            if (inspectorOpen && currentInspectedItem) inspectItem(currentInspectedItem);
        };
    }

    if (inspectorCloseBtn) {
        inspectorCloseBtn.onclick = () => {
            inspectorOpen = false;
            localStorage.setItem('ocal-fm-inspector', false);
            if (toggleInspectorBtn) toggleInspectorBtn.classList.remove('active');
            if (previewInspector) previewInspector.style.display = 'none';
        };
    }

    if (inspectorOpenBtn) {
        inspectorOpenBtn.onclick = () => {
            if (currentInspectedItem) openItem(currentInspectedItem);
        };
    }

    if (inspectorShowFolderBtn) {
        inspectorShowFolderBtn.onclick = () => {
            if (currentInspectedItem) showInNativeFolder(currentInspectedItem.path);
        };
    }

    if (inspectorTrashBtn) {
        inspectorTrashBtn.onclick = () => {
            if (currentInspectedItem) deleteSystemItem(currentInspectedItem.path);
        };
    }

    if (inspectorCopyPathBtn) {
        inspectorCopyPathBtn.onclick = () => {
            if (currentInspectedItem) {
                navigator.clipboard.writeText(currentInspectedItem.path);
                inspectorCopyPathBtn.innerHTML = '<i class="fas fa-check" style="color:var(--accent)"></i>';
                setTimeout(() => {
                    inspectorCopyPathBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 1500);
            }
        };
    }
}

// ── Rendering & Filtering Files ────────────────────────────────────────────
function renderCurrentFiles() {
    fileGrid.innerHTML = '';

    const query = fileSearch ? fileSearch.value.trim().toLowerCase() : '';

    // 1. Filter out unwanted junk & system clutter
    let visible = currentItems.filter(item => !isUnwantedFile(item));

    // 2. Search query filter
    if (query) {
        visible = visible.filter(item => item.name.toLowerCase().includes(query));
        if (searchCountBadge) {
            searchCountBadge.innerText = visible.length;
            searchCountBadge.style.display = 'inline-block';
        }
    } else {
        if (searchCountBadge) searchCountBadge.style.display = 'none';
    }

    // 3. Category ribbon filter
    if (activeCategory !== 'all') {
        visible = visible.filter(item => {
            if (activeCategory === 'folders') return item.isDirectory;
            if (item.isDirectory) return false;

            const ext = getExtension(item.name);
            switch (activeCategory) {
                case 'docs':
                    return ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xlsx', 'xls', 'csv', 'pptx', 'ppt', 'md'].includes(ext);
                case 'images':
                    return isImageFile(item.name);
                case 'audio':
                    return ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma', 'opus'].includes(ext);
                case 'videos':
                    return ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv'].includes(ext);
                case 'code':
                    return ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'c', 'cpp', 'rs', 'go', 'java', 'cs', 'php', 'rb', 'sql', 'sh', 'bat'].includes(ext);
                case 'archives':
                    return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext);
                default:
                    return true;
            }
        });
    }

    // Update Counts & Status Summary
    const totalCount = visible.length;
    const foldersCount = visible.filter(i => i.isDirectory).length;
    const filesCount = totalCount - foldersCount;
    
    if (statItemsCount) statItemsCount.innerText = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
    if (itemCountEl) itemCountEl.innerText = `${totalCount} items (${foldersCount} folder${foldersCount === 1 ? '' : 's'}, ${filesCount} file${filesCount === 1 ? '' : 's'})`;
    updateSelectedSummary();

    // 4. Empty State
    if (visible.length === 0) {
        fileGrid.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon-wrap">
                    <i class="fas ${query ? 'fa-magnifying-glass' : 'fa-folder-open'}"></i>
                </div>
                <div class="empty-state-title">${query ? 'No matching files found' : 'This folder is clean & empty'}</div>
                <div class="empty-state-sub">${query ? 'Try checking your spelling or adjusting your category filter.' : 'You can create a new folder or drop files here anytime.'}</div>
                ${!query ? `<button class="action-btn primary" onclick="promptNewFolder()"><i class="fas fa-plus"></i> New Folder</button>` : ''}
            </div>
        `;
        return;
    }

    // 5. Sort Items (Folders first, then files)
    const sorted = [...visible].sort((a, b) => {
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

    // 6. Render based on active view mode
    if (viewMode === 'list') {
        renderListView(sorted);
    } else if (viewMode === 'compact') {
        renderCompactView(sorted);
    } else {
        renderGridView(sorted);
    }
}

// ── Bento Grid View ────────────────────────────────────────────────────────
function renderGridView(items) {
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `file-item grid-card ${selectedItems.has(item.path) ? 'selected' : ''}`;
        card.dataset.path = item.path;

        const iconInfo = getFileIcon(item);
        const sizeStr = item.isDirectory ? 'Folder' : formatBytes(item.size);
        const dateStr = item.mtime ? new Date(item.mtime).toLocaleDateString() : '--';
        const isImg = isImageFile(item.name);
        const isAudio = ['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(getExtension(item.name));
        const ext = getExtension(item.name);
        const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

        let visualHtml = '';
        if (item.isDirectory) {
            visualHtml = `<i class="fas fa-folder card-icon-emblem" style="color:#F59E0B"></i>`;
        } else if (showPreviews && isImg) {
            visualHtml = `
                <img src="${fileUrl}" class="card-img-preview" alt="" onerror="this.parentElement.innerHTML='<i class=\\'${iconInfo.icon} card-icon-emblem\\' style=\\'color:${iconInfo.color}\\'></i>'">
                <span class="card-type-chip">${escapeHtml(ext || 'IMG')}</span>
            `;
        } else if (isAudio) {
            visualHtml = `
                <i class="fas fa-music card-icon-emblem" style="color:#10B981"></i>
                <button class="card-audio-play-btn" title="Play Track" onclick="event.stopPropagation(); window.handleOpenItem('${escapePath(item.path)}', false)">
                    <i class="fas fa-play"></i>
                </button>
                <span class="card-type-chip">AUDIO</span>
            `;
        } else {
            visualHtml = `
                <i class="${iconInfo.icon} card-icon-emblem" style="color:${iconInfo.color}"></i>
                ${ext ? `<span class="card-type-chip">${escapeHtml(ext)}</span>` : ''}
            `;
        }

        card.innerHTML = `
            <div class="card-stage">
                ${visualHtml}
            </div>
            <div class="card-meta-cluster">
                <div class="card-name-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                <div class="card-sub-info">
                    <span>${sizeStr}</span>
                    <span>${dateStr}</span>
                </div>
            </div>
            <div class="card-hover-actions">
                <button class="card-action-mini-btn" title="Open" onclick="event.stopPropagation(); window.handleOpenItem('${escapePath(item.path)}', ${item.isDirectory})">
                    <i class="fas fa-arrow-up-right-from-square"></i>
                </button>
                <button class="card-action-mini-btn" title="Show in Folder" onclick="event.stopPropagation(); window.handleShowFolder('${escapePath(item.path)}')">
                    <i class="fas fa-folder-open"></i>
                </button>
                <button class="card-action-mini-btn" title="Copy Path" onclick="event.stopPropagation(); window.handleCopyPath('${escapePath(item.path)}')">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="card-action-mini-btn danger" title="Delete" onclick="event.stopPropagation(); window.handleDeleteItem('${escapePath(item.path)}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        bindItemEvents(card, item);
        fileGrid.appendChild(card);
    });
}

// ── List View ──────────────────────────────────────────────────────────────
function renderListView(items) {
    const getSortIcon = (field) => {
        if (sortField !== field) return '<i class="fas fa-sort" style="opacity:0.35; margin-left:4px; font-size:10px;"></i>';
        return `<i class="fas fa-chevron-${sortAsc ? 'up' : 'down'}" style="color:var(--accent); margin-left:4px; font-size:10px;"></i>`;
    };

    const header = document.createElement('div');
    header.className = 'list-table-header';
    header.innerHTML = `
        <div class="sortable col-name" onclick="toggleSortColumn('name')">Name ${getSortIcon('name')}</div>
        <div class="sortable col-date" onclick="toggleSortColumn('date')">Date Modified ${getSortIcon('date')}</div>
        <div class="sortable col-type" onclick="toggleSortColumn('type')">Type ${getSortIcon('type')}</div>
        <div class="sortable col-size" onclick="toggleSortColumn('size')">Size ${getSortIcon('size')}</div>
        <div class="col-actions">Actions</div>
    `;
    fileGrid.appendChild(header);

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = `file-item list-row ${selectedItems.has(item.path) ? 'selected' : ''}`;
        row.dataset.path = item.path;

        const iconInfo = getFileIcon(item);
        const sizeStr = item.isDirectory ? '--' : formatBytes(item.size);
        const dateStr = item.mtime ? new Date(item.mtime).toLocaleString() : '--';
        const typeLabel = item.isDirectory ? 'Folder' : getFileTypeLabel(item.name);

        row.innerHTML = `
            <div class="col-name">
                <div class="col-icon-mini" style="color: ${iconInfo.color}">
                    <i class="${iconInfo.icon}"></i>
                </div>
                <span class="file-name-text" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
            </div>
            <div class="col-date">${dateStr}</div>
            <div class="col-type"><span class="file-type-pill">${escapeHtml(typeLabel)}</span></div>
            <div class="col-size">${sizeStr}</div>
            <div class="col-actions">
                <button class="list-action-btn" title="Open" onclick="event.stopPropagation(); window.handleOpenItem('${escapePath(item.path)}', ${item.isDirectory})"><i class="fas fa-arrow-up-right-from-square"></i></button>
                <button class="list-action-btn" title="Show in Folder" onclick="event.stopPropagation(); window.handleShowFolder('${escapePath(item.path)}')"><i class="fas fa-folder-open"></i></button>
                <button class="list-action-btn" title="Copy Path" onclick="event.stopPropagation(); window.handleCopyPath('${escapePath(item.path)}')"><i class="fas fa-copy"></i></button>
                <button class="list-action-btn danger" title="Delete" onclick="event.stopPropagation(); window.handleDeleteItem('${escapePath(item.path)}')"><i class="fas fa-trash"></i></button>
            </div>
        `;

        bindItemEvents(row, item);
        fileGrid.appendChild(row);
    });
}

// ── Compact View ───────────────────────────────────────────────────────────
function renderCompactView(items) {
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `file-item compact-card ${selectedItems.has(item.path) ? 'selected' : ''}`;
        card.dataset.path = item.path;

        const iconInfo = getFileIcon(item);

        card.innerHTML = `
            <i class="${iconInfo.icon} compact-icon" style="color:${iconInfo.color}"></i>
            <span class="compact-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        `;

        bindItemEvents(card, item);
        fileGrid.appendChild(card);
    });
}

// ── Item Interactions & Selection ──────────────────────────────────────────
function bindItemEvents(el, item) {
    el.onclick = (e) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
            toggleSelection(item, el);
        } else if (e.shiftKey) {
            rangeSelection(item);
        } else {
            clearSelection();
            selectItem(item, el);
        }
        inspectItem(item);
    };

    el.ondblclick = (e) => {
        e.stopPropagation();
        openItem(item);
    };

    el.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedItems.has(item.path)) {
            clearSelection();
            selectItem(item, el);
            inspectItem(item);
        }
        showContextMenu(e, item);
    };
}

function selectItem(item, el) {
    selectedItems.add(item.path);
    el.classList.add('selected');
    updateSelectedSummary();
}

function toggleSelection(item, el) {
    if (selectedItems.has(item.path)) {
        selectedItems.delete(item.path);
        el.classList.remove('selected');
    } else {
        selectedItems.add(item.path);
        el.classList.add('selected');
    }
    updateSelectedSummary();
}

function clearSelection() {
    selectedItems.clear();
    document.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected'));
    updateSelectedSummary();
}

function updateSelectedSummary() {
    if (statSelectedCount) statSelectedCount.innerText = `${selectedItems.size} selected`;
    
    if (statSelectedSize) {
        if (selectedItems.size > 0) {
            let totalBytes = 0;
            currentItems.forEach(i => {
                if (selectedItems.has(i.path) && !i.isDirectory) totalBytes += (i.size || 0);
            });
            statSelectedSize.innerText = totalBytes > 0 ? `(${formatBytes(totalBytes)})` : '';
        } else {
            statSelectedSize.innerText = '';
        }
    }
}

// ── Inspector Panel Display ────────────────────────────────────────────────
async function inspectItem(item) {
    currentInspectedItem = item;
    if (!previewInspector || !inspectorOpen) return;

    if (inspectorFileName) inspectorFileName.innerText = item.name;
    if (inspectorType) inspectorType.innerText = item.isDirectory ? 'File Folder' : getFileTypeLabel(item.name);
    if (inspectorSize) inspectorSize.innerText = item.isDirectory ? '--' : formatBytes(item.size);
    if (inspectorDate) inspectorDate.innerText = item.mtime ? new Date(item.mtime).toLocaleString() : '--';
    if (inspectorCreated) inspectorCreated.innerText = item.birthtime ? new Date(item.birthtime).toLocaleString() : (item.mtime ? new Date(item.mtime).toLocaleString() : '--');
    if (inspectorPath) inspectorPath.innerText = item.path;

    // Reset preview stage
    if (inspectorPreviewBox) {
        inspectorPreviewBox.innerHTML = '';
        const ext = getExtension(item.name);
        const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

        if (item.isDirectory) {
            inspectorPreviewBox.innerHTML = `<i class="fas fa-folder" style="font-size: 58px; color: #F59E0B;"></i>`;
        } else if (isImageFile(item.name)) {
            inspectorPreviewBox.innerHTML = `<img src="${fileUrl}" class="inspector-preview-img" alt="">`;
        } else if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
            inspectorPreviewBox.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <i class="fas fa-file-video" style="font-size: 58px; color: #8B5CF6;"></i>
                    <span style="font-size:11px; color:var(--text-muted); font-weight:700;">VIDEO MEDIA</span>
                </div>
            `;
        } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
            inspectorPreviewBox.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <i class="fas fa-file-audio" style="font-size: 58px; color: #10B981;"></i>
                    <span style="font-size:11px; color:var(--text-muted); font-weight:700;">AUDIO TRACK</span>
                </div>
            `;
        } else if (ext === 'pdf') {
            inspectorPreviewBox.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <i class="fas fa-file-pdf" style="font-size: 58px; color: #EF4444;"></i>
                    <span style="font-size:11px; color:var(--text-muted); font-weight:700;">PDF DOCUMENT</span>
                </div>
            `;
        } else {
            const iconInfo = getFileIcon(item);
            inspectorPreviewBox.innerHTML = `<i class="${iconInfo.icon}" style="font-size: 58px; color:${iconInfo.color}"></i>`;
        }
    }

    // Code & Text snippet preview
    if (inspectorSnippetCard && snippetCode) {
        const textExts = new Set(['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'py', 'c', 'cpp', 'rs', 'go', 'java', 'xml', 'yaml', 'yml', 'log', 'ini']);
        const ext = getExtension(item.name);

        if (!item.isDirectory && textExts.has(ext) && item.size < 500000) {
            try {
                if (window.electronAPI && window.electronAPI.invoke) {
                    const content = await window.electronAPI.invoke('read-file-content', item.path);
                    if (content) {
                        const lines = content.split('\n').slice(0, 40).join('\n');
                        snippetCode.innerText = lines;
                        if (snippetLen) snippetLen.innerText = `${content.length} bytes`;
                        inspectorSnippetCard.style.display = 'flex';
                        return;
                    }
                }
            } catch (e) {}
        }
        inspectorSnippetCard.style.display = 'none';
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

function showInNativeFolder(fullPath) {
    if (window.electronAPI && window.electronAPI.invoke) {
        window.electronAPI.invoke('show-item-in-folder', fullPath);
    } else if (window.electronAPI && window.electronAPI.send) {
        window.electronAPI.send('show-item-in-folder', fullPath);
    }
}

async function deleteSystemItem(fullPath) {
    if (window.electronAPI && window.electronAPI.invoke) {
        const success = await window.electronAPI.invoke('delete-system-item', fullPath);
        if (success) {
            selectedItems.delete(fullPath);
            refreshCurrentDirectory();
        }
    }
}

// ── New Folder & Rename Modals ─────────────────────────────────────────────
function setupModalControls() {
    if (sidebarNewFolderBtn) sidebarNewFolderBtn.onclick = () => promptNewFolder();
    if (topNewFolderBtn) topNewFolderBtn.onclick = () => promptNewFolder();

    if (modalCloseBtn) modalCloseBtn.onclick = () => closeInputModal();
    if (modalCancelBtn) modalCancelBtn.onclick = () => closeInputModal();

    if (modalConfirmBtn) modalConfirmBtn.onclick = () => executeModalAction();

    if (modalInputField) {
        modalInputField.onkeydown = (e) => {
            if (e.key === 'Enter') executeModalAction();
            else if (e.key === 'Escape') closeInputModal();
        };
    }
}

function promptNewFolder() {
    modalAction = { type: 'new-folder' };
    if (modalTitle) modalTitle.innerText = 'New Folder';
    if (modalIconBadge) modalIconBadge.innerHTML = '<i class="fas fa-folder-plus"></i>';
    if (modalInputLabel) modalInputLabel.innerText = 'Folder Name:';
    if (modalInputField) {
        modalInputField.value = 'New Folder';
        modalInputField.select();
    }
    if (modalErrorMsg) modalErrorMsg.style.display = 'none';
    if (inputModal) inputModal.style.display = 'flex';
    setTimeout(() => modalInputField?.focus(), 50);
}

function promptRename(item) {
    modalAction = { type: 'rename', targetItem: item };
    if (modalTitle) modalTitle.innerText = 'Rename Item';
    if (modalIconBadge) modalIconBadge.innerHTML = '<i class="fas fa-pen"></i>';
    if (modalInputLabel) modalInputLabel.innerText = 'New Name:';
    if (modalInputField) {
        modalInputField.value = item.name;
        modalInputField.select();
    }
    if (modalErrorMsg) modalErrorMsg.style.display = 'none';
    if (inputModal) inputModal.style.display = 'flex';
    setTimeout(() => modalInputField?.focus(), 50);
}

function closeInputModal() {
    if (inputModal) inputModal.style.display = 'none';
    modalAction = null;
}

async function executeModalAction() {
    if (!modalAction || !modalInputField) return;
    const value = modalInputField.value.trim();
    if (!value) {
        showModalError('Name cannot be empty.');
        return;
    }

    if (/[\\/:*?"<>|]/.test(value)) {
        showModalError('Name contains invalid characters (/ \\ : * ? " < > |).');
        return;
    }

    if (modalAction.type === 'new-folder') {
        const newDirPath = currentPath + (currentPath.endsWith('\\') || currentPath.endsWith('/') ? '' : '\\') + value;
        try {
            if (window.electronAPI && window.electronAPI.invoke) {
                const ok = await window.electronAPI.invoke('create-directory', newDirPath);
                if (ok) {
                    closeInputModal();
                    refreshCurrentDirectory();
                } else {
                    showModalError('Failed to create folder. Check permissions.');
                }
            }
        } catch (err) {
            showModalError(err.message || 'Error creating folder');
        }
    } else if (modalAction.type === 'rename') {
        const item = modalAction.targetItem;
        if (!item) return;
        const parentDir = item.path.substring(0, Math.max(item.path.lastIndexOf('\\'), item.path.lastIndexOf('/')));
        const newPath = parentDir + (parentDir.endsWith('\\') || parentDir.endsWith('/') ? '' : '\\') + value;
        try {
            if (window.electronAPI && window.electronAPI.invoke) {
                const ok = await window.electronAPI.invoke('rename-system-item', { oldPath: item.path, newPath });
                if (ok) {
                    closeInputModal();
                    refreshCurrentDirectory();
                } else {
                    showModalError('Failed to rename item.');
                }
            }
        } catch (err) {
            showModalError(err.message || 'Error renaming item');
        }
    }
}

function showModalError(msg) {
    if (modalErrorMsg) {
        modalErrorMsg.innerText = msg;
        modalErrorMsg.style.display = 'block';
    }
}

// ── Custom Glass Context Menu ──────────────────────────────────────────────
function showContextMenu(e, item) {
    if (!contextMenu) return;
    contextMenu.style.display = 'flex';
    
    // Position within viewport boundaries
    const menuWidth = 200;
    const menuHeight = 220;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    const ext = getExtension(item.name);
    const isAudio = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma'].includes(ext);

    contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="window.handleOpenItem('${safePath}', ${item.isDirectory})">
            <i class="fas fa-arrow-up-right-from-square"></i> Open
        </div>
        ${!item.isDirectory ? (isAudio ? `
        <div class="context-menu-item" onclick="window.handleOpenInMusicPlayer('${safePath}')">
            <i class="fas fa-compact-disc"></i> Open in Music Player
        </div>` : `
        <div class="context-menu-item" onclick="window.handleOpenInTab('${safePath}')">
            <i class="fas fa-table-columns"></i> Open in New Tab
        </div>`) : ''}
        <div class="context-menu-item" onclick="window.handleShowFolder('${safePath}')">
            <i class="fas fa-folder-open"></i> Show in Folder
        </div>
        <div class="context-menu-item" onclick="window.handleCopyPath('${safePath}')">
            <i class="fas fa-copy"></i> Copy Path
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" onclick="window.handleRenameItem('${safePath}')">
            <i class="fas fa-pen"></i> Rename
        </div>
        <div class="context-menu-item danger" onclick="window.handleDeleteItem('${safePath}')">
            <i class="fas fa-trash"></i> Move to Trash
        </div>
    `;
}

// ── Global Event Handlers & Window Binds ───────────────────────────────────
function setupGlobalShortcuts() {
    document.addEventListener('click', (e) => {
        if (contextMenu) contextMenu.style.display = 'none';
        if (sortDropdownMenu && !e.target.closest('.sort-menu-wrap')) {
            sortDropdownMenu.classList.remove('open');
        }
        if (!e.target.closest('.file-item') && !e.target.closest('#preview-inspector') && !e.target.closest('.content-header') && !e.target.closest('.sidebar')) {
            clearSelection();
        }
    });

    document.addEventListener('keydown', (e) => {
        // Ctrl+F or F3 to Search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            fileSearch?.focus();
            fileSearch?.select();
        }
        // Ctrl+L to focus Path Bar
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            toggleDirectPathInput(true);
        }
        // Ctrl+N or Ctrl+Shift+N for New Folder
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            promptNewFolder();
        }
        // Ctrl+1 / Ctrl+2 / Ctrl+3 View Modes
        else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
            e.preventDefault();
            setViewMode('grid');
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
            e.preventDefault();
            setViewMode('list');
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
            e.preventDefault();
            setViewMode('compact');
        }
        // Ctrl+I to Toggle Inspector Panel
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            toggleInspectorBtn?.click();
        }
        // F2 to Rename selected item
        else if (e.key === 'F2' && selectedItems.size === 1 && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
            const selectedPath = Array.from(selectedItems)[0];
            const item = currentItems.find(i => i.path === selectedPath);
            if (item) promptRename(item);
        }
        // Enter to Open selected item
        else if (e.key === 'Enter' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            if (selectedItems.size > 0) {
                e.preventDefault();
                const selectedPath = Array.from(selectedItems)[0];
                const item = currentItems.find(i => i.path === selectedPath);
                if (item) openItem(item);
            }
        }
        // Arrow Navigation in File Grid
        else if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key) && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            const visibleDoms = Array.from(document.querySelectorAll('.file-item'));
            if (visibleDoms.length > 0) {
                e.preventDefault();
                let currentIdx = visibleDoms.findIndex(el => selectedItems.has(el.dataset.path));
                let nextIdx = 0;
                if (currentIdx !== -1) {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        nextIdx = (currentIdx + 1) % visibleDoms.length;
                    } else {
                        nextIdx = (currentIdx - 1 + visibleDoms.length) % visibleDoms.length;
                    }
                }
                const targetDom = visibleDoms[nextIdx];
                const targetPath = targetDom.dataset.path;
                const item = currentItems.find(i => i.path === targetPath);
                if (item) {
                    clearSelection();
                    selectItem(item, targetDom);
                    inspectItem(item);
                    targetDom.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
        // Alt+Left to Go Back
        else if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            goBack();
        }
        // Alt+Right to Go Forward
        else if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            goForward();
        }
        // Alt+Up or Backspace to Go Up
        else if ((e.altKey && e.key === 'ArrowUp') || (e.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName))) {
            e.preventDefault();
            navigateUp();
        }
        // F5 or Ctrl+R to Refresh
        else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) {
            e.preventDefault();
            refreshCurrentDirectory();
        }
        // Delete to Trash selected items
        else if (e.key === 'Delete' && selectedItems.size > 0 && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
            selectedItems.forEach(p => deleteSystemItem(p));
        }
        // Ctrl+A to Select All
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
            currentItems.forEach(i => selectedItems.add(i.path));
            document.querySelectorAll('.file-item').forEach(el => el.classList.add('selected'));
            updateSelectedSummary();
        }
        // Escape to dismiss
        else if (e.key === 'Escape') {
            if (inputModal && inputModal.style.display !== 'none') closeInputModal();
            else if (mediaPlayerModal && mediaPlayerModal.style.display !== 'none') closeMediaModal();
            else if (photoEditorModal && photoEditorModal.style.display !== 'none') photoEditorModal.style.display = 'none';
            else clearSelection();
        }
    });
}

// Window Exposed Handlers for Inline Clicks
window.handleOpenItem = (pathStr, isDir) => {
    if (isDir) {
        navigateTo(pathStr);
    } else {
        const item = currentItems.find(i => i.path === pathStr) || { name: pathStr.split(/[\\\/]/).pop(), path: pathStr, isDirectory: false };
        openItem(item);
    }
};

window.handleOpenInTab = (pathStr) => {
    const fileUrl = 'file:///' + pathStr.replace(/\\/g, '/');
    if (window.electronAPI && window.electronAPI.newTab) {
        window.electronAPI.newTab(fileUrl);
    }
};

window.handleOpenInMusicPlayer = (pathStr) => {
    const targetUrl = 'ocal://music-player?file=' + encodeURIComponent(pathStr);
    if (window.electronAPI && window.electronAPI.newTab) {
        window.electronAPI.newTab(targetUrl);
    } else if (window.electronAPI && window.electronAPI.navigateTo) {
        window.electronAPI.navigateTo(targetUrl);
    } else {
        window.location.href = targetUrl;
    }
};

window.handleShowFolder = (pathStr) => {
    showInNativeFolder(pathStr);
};

window.handleCopyPath = (pathStr) => {
    navigator.clipboard.writeText(pathStr);
};

window.handleDeleteItem = (pathStr) => {
    deleteSystemItem(pathStr);
};

window.handleRenameItem = (pathStr) => {
    const item = currentItems.find(i => i.path === pathStr);
    if (item) promptRename(item);
};

window.toggleSortColumn = (field) => {
    if (sortField === field) {
        sortAsc = !sortAsc;
    } else {
        sortField = field;
        sortAsc = true;
    }
    localStorage.setItem('ocal-fm-sort-field', sortField);
    localStorage.setItem('ocal-fm-sort-asc', sortAsc);
    updateSortOrderUi();
    renderCurrentFiles();
};

window.promptNewFolder = promptNewFolder;

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

function launchMusicPlayerFromItem(item) {
    if (!item || !item.path) return;
    const pathStr = item.path;
    closeMediaModal();
    if (window.electronAPI && typeof window.electronAPI.newTab === 'function') {
        window.electronAPI.newTab(`ocal://music-player?file=${encodeURIComponent(pathStr)}`);
    } else {
        window.open(`music-player.html?file=${encodeURIComponent(pathStr)}`, '_blank');
    }
}

function initAudioDspPipeline() {
    if (!activeAudio || !audioCtx) return;

    try {
        audioSourceNode = audioCtx.createMediaElementSource(activeAudio);

        preampNode = audioCtx.createGain();
        preampNode.gain.value = 1.15;

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

        highsNode = audioCtx.createBiquadFilter();
        highsNode.type = 'highshelf';
        highsNode.frequency.value = 3600;
        const clarityOn = document.getElementById('fx-clarity-toggle')?.classList.contains('active');
        const highsVal = parseFloat(document.getElementById('fx-highs-slider')?.value || 5);
        highsNode.gain.value = clarityOn ? highsVal : 0;

        airNode = audioCtx.createBiquadFilter();
        airNode.type = 'peaking';
        airNode.frequency.value = 10500;
        airNode.Q.value = 1.1;
        airNode.gain.value = clarityOn ? highsVal * 0.7 : 0;

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

        pannerNode = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
        if (pannerNode) pannerNode.pan.value = 0;

        compressorNode = audioCtx.createDynamicsCompressor();
        compressorNode.threshold.value = -16;
        compressorNode.knee.value = 24;
        compressorNode.ratio.value = 3.5;
        compressorNode.attack.value = 0.003;
        compressorNode.release.value = 0.22;

        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 128;

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

        if (pannerNode) {
            prev.connect(pannerNode);
            prev = pannerNode;
        }

        prev.connect(compressorNode);
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
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('media-beat-canvas');
    let ctx = null;
    if (canvas) {
        ctx = canvas.getContext('2d');
    }

    const tick = () => {
        if (!activeAudio || activeAudio.paused || !analyserNode) {
            const vinyl = document.getElementById('spinning-vinyl');
            if (vinyl) {
                vinyl.style.boxShadow = '';
                vinyl.style.transform = '';
            }
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        analyserNode.getByteFrequencyData(dataArray);

        // Sub-bass frequency reactive beat pump
        let bassSum = 0;
        for (let i = 0; i < 4; i++) bassSum += dataArray[i];
        const bassAvg = bassSum / 4;
        const pumpScale = 1 + (bassAvg / 255) * 0.07;

        const vinyl = document.getElementById('spinning-vinyl');
        if (vinyl) {
            vinyl.style.transform = `scale(${pumpScale})`;
            vinyl.style.boxShadow = `0 8px ${24 + bassAvg * 0.25}px var(--accent-glow)`;
        }

        // 8D spatial orbit panning
        if (surroundMode === 'spatial8d' && pannerNode) {
            spatial8dAngle += 0.024;
            pannerNode.pan.value = Math.sin(spatial8dAngle) * 0.82;
        } else if (pannerNode && surroundMode !== 'spatial8d') {
            pannerNode.pan.value = 0;
        }

        // Render dynamic frequency spectrum bars on canvas
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const numBars = 32;
            const barWidth = (canvas.width / numBars) - 2;
            const accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#15AC49';

            for (let i = 0; i < numBars; i++) {
                const val = dataArray[i * 2] || 0;
                const percent = val / 255;
                const barHeight = Math.max(3, percent * (canvas.height - 4));
                const x = i * (barWidth + 2);
                const y = canvas.height - barHeight;

                ctx.fillStyle = accentColor;
                ctx.globalAlpha = 0.35 + percent * 0.65;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, 3);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
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
}

function openAudioStudio(item) {
    currentMediaItem = item;
    const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

    if (mediaModalName) mediaModalName.innerText = item.name;
    if (mediaModalIcon) mediaModalIcon.className = 'fas fa-music';

    const ext = (item.extension || '').toLowerCase().replace('.', '');
    const chipEl = document.getElementById('media-format-chip');
    if (chipEl) {
        if (ext === 'flac') chipEl.innerText = 'FLAC LOSSLESS';
        else if (ext === 'wav') chipEl.innerText = 'WAV PCM AUDIO';
        else if (ext === 'm4a' || ext === 'aac') chipEl.innerText = 'AAC HI-RES';
        else if (ext === 'ogg' || ext === 'opus') chipEl.innerText = 'OGG OPUS';
        else chipEl.innerText = `${ext.toUpperCase() || 'MP3'} AUDIO`;
    }

    if (mediaModalBody) {
        mediaModalBody.innerHTML = `
            <div class="spinning-vinyl paused" id="spinning-vinyl">
                <div class="vinyl-groove groove-1"></div>
                <div class="vinyl-groove groove-2"></div>
                <div class="vinyl-center-dot">
                    <i class="fas fa-compact-disc"></i>
                </div>
            </div>
            <canvas id="media-beat-canvas" width="580" height="40" class="media-beat-canvas"></canvas>
            <audio id="active-media-audio" src="${fileUrl}" preload="auto"></audio>
        `;
    }

    activeAudio = document.getElementById('active-media-audio');
    activeVideo = null;

    if (mediaFsBtn) mediaFsBtn.style.display = 'none';
    const enhancer = document.getElementById('audio-enhancer-toolbar');
    if (enhancer) enhancer.style.display = 'flex';

    if (activeAudio) {
        activeAudio.onloadedmetadata = () => {
            if (mediaTimeDuration) mediaTimeDuration.innerText = formatTime(activeAudio.duration);
            if (mediaSeekBar) mediaSeekBar.max = activeAudio.duration;
        };

        activeAudio.ontimeupdate = () => {
            if (!isSeeking && mediaSeekBar && activeAudio) {
                mediaSeekBar.value = activeAudio.currentTime;
                if (mediaTimeCurrent) mediaTimeCurrent.innerText = formatTime(activeAudio.currentTime);
            }
        };

        activeAudio.onplay = () => {
            ensureAudioContext();
            if (!audioSourceNode) initAudioDspPipeline();
            const vinyl = document.getElementById('spinning-vinyl');
            if (vinyl) vinyl.classList.remove('paused');
            if (mediaPlayBtn) mediaPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
            startBeatVisualizer();
        };

        activeAudio.onpause = () => {
            const vinyl = document.getElementById('spinning-vinyl');
            if (vinyl) vinyl.classList.add('paused');
            if (mediaPlayBtn) mediaPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
            stopBeatVisualizer();
        };

        // When track playback is done, automatically open music-player.html
        activeAudio.onended = () => {
            const vinyl = document.getElementById('spinning-vinyl');
            if (vinyl) vinyl.classList.add('paused');
            if (mediaPlayBtn) mediaPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
            stopBeatVisualizer();
            if (currentMediaItem) {
                launchMusicPlayerFromItem(currentMediaItem);
            }
        };

        activeAudio.play().catch(() => {});
    }

    if (mediaPlayerModal) mediaPlayerModal.style.display = 'flex';
}

function openVideoStudio(item) {
    currentMediaItem = item;
    const fileUrl = 'file:///' + item.path.replace(/\\/g, '/');

    if (mediaModalName) mediaModalName.innerText = item.name;
    if (mediaModalIcon) mediaModalIcon.className = 'fas fa-video';

    const chipEl = document.getElementById('media-format-chip');
    if (chipEl) {
        const ext = (item.extension || 'mp4').toLowerCase().replace('.', '');
        chipEl.innerText = `${ext.toUpperCase()} VIDEO`;
    }

    if (mediaModalBody) {
        mediaModalBody.innerHTML = `
            <video id="active-media-video" src="${fileUrl}" style="max-width:100%; max-height:360px; border-radius:14px;" playsinline></video>
        `;
    }

    activeVideo = document.getElementById('active-media-video');
    activeAudio = null;

    if (mediaFsBtn) mediaFsBtn.style.display = 'flex';
    const enhancer = document.getElementById('audio-enhancer-toolbar');
    if (enhancer) enhancer.style.display = 'none';

    if (activeVideo) {
        activeVideo.onloadedmetadata = () => {
            if (mediaTimeDuration) mediaTimeDuration.innerText = formatTime(activeVideo.duration);
            if (mediaSeekBar) mediaSeekBar.max = activeVideo.duration;
        };

        activeVideo.ontimeupdate = () => {
            if (!isSeeking && mediaSeekBar && activeVideo) {
                mediaSeekBar.value = activeVideo.currentTime;
                if (mediaTimeCurrent) mediaTimeCurrent.innerText = formatTime(activeVideo.currentTime);
            }
        };

        activeVideo.onplay = () => {
            if (mediaPlayBtn) mediaPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        };

        activeVideo.onpause = () => {
            if (mediaPlayBtn) mediaPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        };

        activeVideo.play().catch(() => {});
    }

    if (mediaPlayerModal) mediaPlayerModal.style.display = 'flex';
}

function closeMediaModal() {
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
    stopBeatVisualizer();
    if (mediaPlayerModal) mediaPlayerModal.style.display = 'none';
}

function initMediaStudioControls() {
    if (mediaModalClose) mediaModalClose.onclick = () => closeMediaModal();
    if (mediaModalBackdrop) mediaModalBackdrop.onclick = () => closeMediaModal();

    if (mediaPlayBtn) {
        mediaPlayBtn.onclick = () => {
            const current = activeAudio || activeVideo;
            if (!current) return;
            if (current.paused) current.play();
            else current.pause();
        };
    }

    if (mediaSeekBar) {
        mediaSeekBar.oninput = () => { isSeeking = true; };
        mediaSeekBar.onchange = () => {
            const current = activeAudio || activeVideo;
            if (current) {
                current.currentTime = parseFloat(mediaSeekBar.value);
            }
            isSeeking = false;
        };
    }

    if (mediaVolBar) {
        mediaVolBar.oninput = () => {
            const current = activeAudio || activeVideo;
            const val = parseFloat(mediaVolBar.value);
            if (current) current.volume = val;
            if (mediaMuteBtn) {
                mediaMuteBtn.innerHTML = val === 0 ? '<i class="fas fa-volume-xmark"></i>' : (val < 0.5 ? '<i class="fas fa-volume-low"></i>' : '<i class="fas fa-volume-high"></i>');
            }
        };
    }

    if (mediaMuteBtn) {
        mediaMuteBtn.onclick = () => {
            const current = activeAudio || activeVideo;
            if (!current) return;
            current.muted = !current.muted;
            mediaMuteBtn.innerHTML = current.muted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-high"></i>';
        };
    }

    if (mediaRewBtn) {
        mediaRewBtn.onclick = () => {
            const current = activeAudio || activeVideo;
            if (current) current.currentTime = Math.max(0, current.currentTime - 10);
        };
    }

    if (mediaFwdBtn) {
        mediaFwdBtn.onclick = () => {
            const current = activeAudio || activeVideo;
            if (current) current.currentTime = Math.min(current.duration || 0, current.currentTime + 10);
        };
    }

    // Direct Launch into music-player.html
    if (mediaOpenMusicPlayerBtn) {
        mediaOpenMusicPlayerBtn.onclick = () => {
            if (currentMediaItem) {
                launchMusicPlayerFromItem(currentMediaItem);
            }
        };
    }

    // Audio DSP Tabs
    const tabs = ['3d', 'clarity', 'bass', 'eq'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`enhancer-tab-${tab}`);
        const panel = document.getElementById(`panel-${tab}`);
        if (btn && panel) {
            btn.onclick = () => {
                tabs.forEach(t => {
                    document.getElementById(`enhancer-tab-${t}`)?.classList.remove('active');
                    const p = document.getElementById(`panel-${t}`);
                    if (p) p.style.display = 'none';
                });
                btn.classList.add('active');
                panel.style.display = (tab === 'eq' || tab === 'bass') ? 'flex' : 'grid';
            };
        }
    });

    // Custom Surround Dropdown
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
                const val = item.getAttribute('data-value');
                surroundMode = val;
                const currentValSpan = document.getElementById('surround-current-val');
                if (currentValSpan) currentValSpan.innerHTML = item.innerHTML;
                menu.classList.remove('open');
            };
        });
    }

    document.addEventListener('click', () => {
        if (menu && menu.classList.contains('open')) {
            menu.classList.remove('open');
        }
    });

    // Surround Width Slider
    const widthSlider = document.getElementById('fx-surround-width');
    const valSurroundDepth = document.getElementById('val-surround-depth');
    if (widthSlider) {
        widthSlider.oninput = () => {
            const val = parseFloat(widthSlider.value);
            if (valSurroundDepth) valSurroundDepth.innerText = `${Math.round(val * 100)}%`;
        };
    }

    // Clarity Toggle & Highs Slider
    const clarityToggle = document.getElementById('fx-clarity-toggle');
    const highsSlider = document.getElementById('fx-highs-slider');
    const valHighs = document.getElementById('val-highs');

    if (clarityToggle) {
        clarityToggle.onclick = () => {
            clarityToggle.classList.toggle('active');
            const on = clarityToggle.classList.contains('active');
            clarityToggle.innerText = on ? 'ENABLED' : 'BYPASS';
            const val = parseFloat(highsSlider?.value || 5);
            if (highsNode) highsNode.gain.value = on ? val : 0;
            if (airNode) airNode.gain.value = on ? val * 0.7 : 0;
        };
    }

    if (highsSlider) {
        highsSlider.oninput = () => {
            const val = parseFloat(highsSlider.value);
            if (valHighs) valHighs.innerText = `+${val} dB`;
            const on = clarityToggle?.classList.contains('active');
            if (on) {
                if (highsNode) highsNode.gain.value = val;
                if (airNode) airNode.gain.value = val * 0.7;
            }
        };
    }

    // Bass Slider
    const bassSlider = document.getElementById('fx-bass-slider');
    const valBass = document.getElementById('val-bass');
    if (bassSlider) {
        bassSlider.oninput = () => {
            const val = parseFloat(bassSlider.value);
            if (valBass) valBass.innerText = `+${val} dB`;
            if (bassNode) bassNode.gain.value = val;
            if (punchNode) punchNode.gain.value = val * 0.6;
        };
    }

    // 10-Band EQ Presets
    const eqPresets = {
        flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass: [5, 4, 3, 1, 0, 0, 0, 0, 0, 0],
        vocal: [-1, -1, 0, 2, 4, 4, 3, 1, 0, 0],
        rock: [4, 3, 2, 0, -1, 0, 2, 3, 4, 4],
        pop: [-1, 1, 3, 3, 2, 0, 1, 2, 3, 3],
        electronic: [5, 5, 3, 0, -1, 1, 2, 4, 5, 5]
    };

    document.querySelectorAll('.eq-preset-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const presetKey = btn.getAttribute('data-preset');
            const curve = eqPresets[presetKey] || eqPresets.flat;
            const sliders = document.querySelectorAll('.eq-slider');
            sliders.forEach((slider, idx) => {
                const targetVal = curve[idx] !== undefined ? curve[idx] : 0;
                slider.value = targetVal;
                const valLabel = slider.parentElement?.querySelector('.eq-val');
                if (valLabel) valLabel.innerText = (targetVal > 0 ? '+' : '') + targetVal;
                if (eqNodes[idx]) eqNodes[idx].gain.value = targetVal;
            });
        };
    });

    // EQ Sliders
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

    photoTransform = { rotate: 0, flipH: 1, flipV: 1, scale: 1, panX: 0, panY: 0 };
    photoFilters = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0, invert: 0 };
    isComparingPhoto = false;

    if (editorFilename) editorFilename.innerText = item.name;
    const dimText = document.getElementById('photo-dim-text');
    const sizeText = document.getElementById('photo-size-text');
    const detailPath = document.getElementById('detail-path');
    const detailSize = document.getElementById('detail-size');

    if (sizeText) sizeText.innerText = formatBytes(item.size);
    if (detailSize) detailSize.innerText = formatBytes(item.size);
    if (detailPath) detailPath.innerText = item.path;

    if (editorImgTarget) {
        editorImgTarget.onload = () => {
            const w = editorImgTarget.naturalWidth || 0;
            const h = editorImgTarget.naturalHeight || 0;
            const dimStr = `${w} × ${h} px`;
            if (dimText) dimText.innerText = dimStr;
            const detailRes = document.getElementById('detail-res');
            if (detailRes) detailRes.innerText = dimStr;

            const detailAspect = document.getElementById('detail-aspect');
            if (detailAspect && w > 0 && h > 0) {
                const ratioStr = `${(w / h).toFixed(2)}:1`;
                detailAspect.innerText = ratioStr;
            }
        };
        editorImgTarget.src = fileUrl;
        applyPhotoTransforms();
    }

    syncPhotoSlidersUi();

    if (photoEditorModal) photoEditorModal.style.display = 'flex';
}

function syncPhotoSlidersUi() {
    const sliders = [
        { id: 'slider-brightness', val: photoFilters.brightness, badgeId: 'val-brightness', unit: '%' },
        { id: 'slider-contrast', val: photoFilters.contrast, badgeId: 'val-contrast', unit: '%' },
        { id: 'slider-saturation', val: photoFilters.saturation, badgeId: 'val-saturation', unit: '%' },
        { id: 'slider-sepia', val: photoFilters.sepia, badgeId: 'val-sepia', unit: '%' },
        { id: 'slider-blur', val: photoFilters.blur, badgeId: 'val-blur', unit: 'px' },
        { id: 'slider-invert', val: photoFilters.invert, badgeId: 'val-invert', unit: '%' }
    ];

    sliders.forEach(({ id, val, badgeId, unit }) => {
        const slider = document.getElementById(id);
        const badge = document.getElementById(badgeId);
        if (slider) slider.value = val;
        if (badge) badge.innerText = `${val}${unit}`;
    });
}

function applyPhotoTransforms() {
    if (!editorImgTarget) return;

    if (isComparingPhoto) {
        editorImgTarget.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)';
        editorImgTarget.style.filter = 'none';
        return;
    }

    const { rotate, flipH, flipV, scale, panX, panY } = photoTransform;
    const { brightness, contrast, saturation, sepia, blur, invert } = photoFilters;

    editorImgTarget.style.transform = `translate(${panX}px, ${panY}px) scale(${scale}) scaleX(${flipH}) scaleY(${flipV}) rotate(${rotate}deg)`;
    editorImgTarget.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) blur(${blur}px) invert(${invert}%)`;

    const valZoom = document.getElementById('val-zoom');
    if (valZoom) valZoom.innerText = `${Math.round(scale * 100)}%`;
}

function initPhotoEditorControls() {
    if (editorCloseBtn) editorCloseBtn.onclick = () => { if (photoEditorModal) photoEditorModal.style.display = 'none'; };

    // Zoom & Rotate Controls
    document.getElementById('tool-zoom-in')?.addEventListener('click', () => {
        photoTransform.scale = Math.min(5, photoTransform.scale + 0.25);
        applyPhotoTransforms();
    });

    document.getElementById('tool-zoom-out')?.addEventListener('click', () => {
        photoTransform.scale = Math.max(0.25, photoTransform.scale - 0.25);
        applyPhotoTransforms();
    });

    document.getElementById('tool-fit')?.addEventListener('click', () => {
        photoTransform.scale = 1;
        photoTransform.panX = 0;
        photoTransform.panY = 0;
        applyPhotoTransforms();
    });

    document.getElementById('tool-rotate-left')?.addEventListener('click', () => {
        photoTransform.rotate = (photoTransform.rotate - 90) % 360;
        applyPhotoTransforms();
    });

    document.getElementById('tool-rotate-right')?.addEventListener('click', () => {
        photoTransform.rotate = (photoTransform.rotate + 90) % 360;
        applyPhotoTransforms();
    });

    document.getElementById('tool-flip-h')?.addEventListener('click', () => {
        photoTransform.flipH *= -1;
        applyPhotoTransforms();
    });

    document.getElementById('tool-flip-v')?.addEventListener('click', () => {
        photoTransform.flipV *= -1;
        applyPhotoTransforms();
    });

    document.getElementById('tool-reset')?.addEventListener('click', () => {
        photoTransform = { rotate: 0, flipH: 1, flipV: 1, scale: 1, panX: 0, panY: 0 };
        photoFilters = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0, invert: 0 };
        syncPhotoSlidersUi();
        applyPhotoTransforms();
    });

    // Compare Button (Hold down)
    if (editorCompareBtn) {
        editorCompareBtn.onmousedown = () => { isComparingPhoto = true; applyPhotoTransforms(); };
        editorCompareBtn.onmouseup = () => { isComparingPhoto = false; applyPhotoTransforms(); };
        editorCompareBtn.onmouseleave = () => { isComparingPhoto = false; applyPhotoTransforms(); };
    }

    // Open in Tab Button
    if (editorOpenTabBtn) {
        editorOpenTabBtn.onclick = () => {
            if (currentPhotoItem) window.handleOpenInTab(currentPhotoItem.path);
        };
    }

    // Dock Tabs Switcher
    document.querySelectorAll('.dock-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.dock-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.dock-panel').forEach(p => p.style.display = 'none');
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            const panel = document.getElementById(`dock-panel-${targetTab}`);
            if (panel) panel.style.display = 'flex';
        };
    });

    // Sliders
    const bindSlider = (id, badgeId, key, unit) => {
        const slider = document.getElementById(id);
        const badge = document.getElementById(badgeId);
        if (!slider) return;
        slider.oninput = () => {
            const val = parseFloat(slider.value);
            photoFilters[key] = val;
            if (badge) badge.innerText = `${val}${unit}`;
            applyPhotoTransforms();
        };
    };

    bindSlider('slider-brightness', 'val-brightness', 'brightness', '%');
    bindSlider('slider-contrast', 'val-contrast', 'contrast', '%');
    bindSlider('slider-saturation', 'val-saturation', 'saturation', '%');
    bindSlider('slider-sepia', 'val-sepia', 'sepia', '%');
    bindSlider('slider-blur', 'val-blur', 'blur', 'px');
    bindSlider('slider-invert', 'val-invert', 'invert', '%');
}

// ── File Icon & Utility Helpers ────────────────────────────────────────────
function getExtension(filename) {
    if (!filename || !filename.includes('.')) return '';
    return filename.split('.').pop().toLowerCase();
}

function isImageFile(filename) {
    const ext = getExtension(filename);
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext);
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
        case 'jsx':
        case 'tsx':
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
        case 'log': return { icon: 'fas fa-file-lines', color: '#94A3B8' };
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
        default: return { icon: 'fas fa-file', color: '#94A3B8' };
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

function escapePath(pathStr) {
    if (!pathStr) return '';
    return pathStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
