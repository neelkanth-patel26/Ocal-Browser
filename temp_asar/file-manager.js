const fileGrid = document.getElementById('file-grid');
const breadcrumbs = document.getElementById('breadcrumbs');
const currentPathEl = document.getElementById('current-path');
const itemCountEl = document.getElementById('item-count');
const fileSearch = document.getElementById('file-search');
const analyzeBtn = document.getElementById('analyze-btn');
const contextMenu = document.getElementById('context-menu');

let currentPath = '';
// --- IPC Listeners ---
window.electronAPI.on('perform-agent-command', (e, action) => {
    if (action.command === 'pdf-filter') {
        const query = action.term.toLowerCase();
        const searchInput = document.getElementById('file-search');
        if (searchInput) {
            searchInput.value = action.term;
            searchInput.dispatchEvent(new Event('input'));
        }
    }
});

let currentItems = [];
let systemFolders = {};
let isListView = true;
let selectedItems = new Set();

// Helper to apply accent color dynamically
function applyAccent(accentColor) {
    if (!accentColor) return;
    document.documentElement.style.setProperty('--accent', accentColor);
    
    const hexToRgba = (hex, alpha) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(9, 240, 160, ${alpha})`;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(accentColor, 0.25));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(accentColor, 0.15));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(accentColor, 0.4));
}

// ── Initialization ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch system folders
    systemFolders = await window.electronAPI.invoke('get-system-folders');
    
    // 2. Sync Settings (Accent Color sync)
    window.electronAPI.getSettings().then(s => {
        if (s.accentColor) {
            applyAccent(s.accentColor);
        }
    });

    // 3. Setup Sidebar Nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            const folderKey = btn.getAttribute('data-folder');
            if (systemFolders[folderKey]) {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                navigateTo(systemFolders[folderKey]);
            }
        };
    });

    // 4. View Toggles
    document.getElementById('view-grid').onclick = () => setViewMode(false);
    document.getElementById('view-list').onclick = () => setViewMode(true);
    
    // Set Default View
    setViewMode(true);

    // 5. Search
    fileSearch.oninput = () => {
        const query = fileSearch.value.toLowerCase();
        const filtered = currentItems.filter(item => 
            item.name.toLowerCase().includes(query) && 
            (item.isDirectory || item.name.toLowerCase().endsWith('.pdf'))
        );
        renderFiles(filtered);
    };

    // 6. Global Click Handlers
    document.addEventListener('click', (event) => {
        contextMenu.style.display = 'none';
        if (!event.target.closest('.file-item')) {
            clearSelection();
        }
    });

    // 7. Find all PDFs Feature
    analyzeBtn.onclick = async () => {
        analyzeBtn.disabled = true;
        const originalHtml = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Searching...';
        
        document.querySelector('.page-title').innerText = "All PDF Files";
        
        const pdfOnly = await window.electronAPI.invoke('analyze-system-files');
        currentItems = pdfOnly;
        renderFiles(pdfOnly);
        
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalHtml;
    };

    // Initial Load: Default to the 'PDF Library' (Analyze) view
    analyzeBtn.click();
});

// ── Navigation ─────────────────────────────────────────────────────────────
async function navigateTo(path) {
    if (!path) return;
    currentPath = path;
    
    document.querySelector('.page-title').innerText = "Directory View";

    fileGrid.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-circle-notch fa-spin"></i>
            <span>Opening ${path.split('\\').pop() || path}...</span>
        </div>
    `;

    const items = await window.electronAPI.invoke('get-directory-entries', path);
    currentItems = items;
    renderFiles(items);
    updateBreadcrumbs(path);
    currentPathEl.innerText = path;
}

function updateBreadcrumbs(path) {
    breadcrumbs.innerHTML = '';
    const parts = path.split(/[\/\\]/).filter(p => p);
    
    const rootItem = document.createElement('span');
    rootItem.className = 'breadcrumb-item';
    rootItem.innerText = 'This PC';
    rootItem.onclick = () => navigateTo(systemFolders.home);
    breadcrumbs.appendChild(rootItem);

    let currentBuildPath = '';
    parts.forEach((part, i) => {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.innerText = ' / ';
        breadcrumbs.appendChild(sep);

        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.innerText = part;
        
        currentBuildPath += (i === 0 ? '' : '\\') + part;
        const target = i === 0 ? part + ':\\' : path.split(part)[0] + part;
        
        item.onclick = () => navigateTo(target);
        breadcrumbs.appendChild(item);
    });
}

// ── Rendering ──────────────────────────────────────────────────────────────
function renderFiles(items) {
    fileGrid.innerHTML = '';
    
    // Strict Filter: Only show PDF files
    const filteredItems = items.filter(item => {
        return item.name.toLowerCase().endsWith('.pdf');
    });
    itemCountEl.innerText = `${filteredItems.length} files found`;

    if (filteredItems.length === 0) {
        fileGrid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-file-circle-exclamation" style="opacity: 0.3; font-size: 42px; color: var(--accent);"></i>
                <span>No PDF files found</span>
            </div>
        `;
        return;
    }

    // Sort: Directories first, then names
    const sorted = [...filteredItems].sort((a,b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });

    sorted.forEach(item => {
        const el = document.createElement('div');
        el.className = `file-item ${selectedItems.has(item.path) ? 'selected' : ''}`;
        
        const iconInfo = getFileIcon(item);
        const sizeStr = item.isDirectory ? '--' : formatBytes(item.size);
        const dateStr = new Date(item.mtime).toLocaleDateString();

        el.innerHTML = `
            <div class="file-icon">
                <i class="${iconInfo.icon}"></i>
            </div>
            <div class="file-name" title="${item.name}">${item.name}</div>
            <div class="file-meta-list">
                <span class="meta-size">${sizeStr}</span>
                <span class="meta-date">${dateStr}</span>
            </div>
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            if (!e.ctrlKey) clearSelection();
            toggleSelection(item, el);
        };

        el.ondblclick = () => {
            if (item.isDirectory) {
                navigateTo(item.path);
            } else {
                window.electronAPI.invoke('open-system-item', item.path);
            }
        };

        el.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e, item);
        };

        fileGrid.appendChild(el);
    });
}

function getFileIcon(item) {
    if (item.isDirectory) return { icon: 'fas fa-folder' };
    
    const ext = item.name.split('.').pop().toLowerCase();
    switch(ext) {
        case 'pdf': return { icon: 'fas fa-file-pdf' };
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp': return { icon: 'fas fa-file-image' };
        case 'mp4':
        case 'mkv':
        case 'mov': return { icon: 'fas fa-file-video' };
        case 'mp3':
        case 'wav':
        case 'flac': return { icon: 'fas fa-file-audio' };
        case 'zip':
        case 'rar':
        case '7z': return { icon: 'fas fa-file-zipper' };
        case 'js':
        case 'html':
        case 'css':
        case 'json': return { icon: 'fas fa-file-code' };
        case 'txt':
        case 'md': return { icon: 'fas fa-file-lines' };
        default: return { icon: 'fas fa-file' };
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function setViewMode(isList) {
    isListView = isList;
    fileGrid.classList.toggle('list-view', isList);
    document.getElementById('view-grid').classList.toggle('active', !isList);
    document.getElementById('view-list').classList.toggle('active', isList);
}

function toggleSelection(item, el) {
    if (selectedItems.has(item.path)) {
        selectedItems.delete(item.path);
        el.classList.remove('selected');
    } else {
        selectedItems.add(item.path);
        el.classList.add('selected');
    }
}

// Global exposure for event callbacks
window.setViewMode = setViewMode;

function clearSelection() {
    selectedItems.clear();
    document.querySelectorAll('.file-item.selected').forEach(el => el.classList.remove('selected'));
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── Context Menu ───────────────────────────────────────────────────────────
function showContextMenu(e, item) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';

    contextMenu.innerHTML = `
        <div class="menu-item" onclick="handleOpen('${item.path.replace(/\\/g, '\\\\')}', ${item.isDirectory})">
            <i class="fas fa-arrow-up-right-from-square"></i> Open
        </div>
        <div class="menu-item" onclick="handleCopyPath('${item.path.replace(/\\/g, '\\\\')}')">
            <i class="fas fa-link"></i> Copy Path
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" onclick="handleDelete('${item.path.replace(/\\/g, '\\\\')}')">
            <i class="fas fa-trash"></i> Move to Trash
        </div>
    `;
}

window.handleOpen = (path, isDir) => {
    if (isDir) navigateTo(path);
    else window.electronAPI.invoke('open-system-item', path);
};

window.handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
};

window.handleDelete = async (path) => {
    const success = await window.electronAPI.invoke('delete-system-item', path);
    if (success) {
        if (currentPath) {
            navigateTo(currentPath);
        } else {
            // If in "All PDF Files" view, re-trigger search to update list
            analyzeBtn.click();
        }
    }
};
