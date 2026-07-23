let selectedIndex = -1;
let flatItems = [];

// ── DOM References ────────────────────────────────────────────────────────
const list = document.getElementById('suggestion-list');

// Inject refinements bar dynamically if not present
let refinementsBar = document.getElementById('refinements');
if (!refinementsBar) {
    refinementsBar = document.createElement('div');
    refinementsBar.id = 'refinements';
    refinementsBar.style.cssText = 'display:none; flex-wrap:wrap; gap:6px; padding:6px 10px 2px;';
    const container = document.getElementById('container');
    if (container) container.insertBefore(refinementsBar, list);
}

// ── IPC: Receive suggestions from main process ────────────────────────────
// preload.js: onSuggestionsUpdated: (cb) => ipcRenderer.on('update-suggestions', (e, d) => cb(d))
// callback receives (data) only
window.electronAPI.onSuggestionsUpdated((data) => {
    renderSuggestions(data);
});

function renderSuggestions(data) {
    if (!list) return;
    list.innerHTML = '';
    if (refinementsBar) {
        refinementsBar.innerHTML = '';
        refinementsBar.style.display = 'none';
    }
    flatItems = [];
    selectedIndex = -1;

    if (!data) return;

    // 1. Render Refinements (horizontal pills)
    if (refinementsBar && data.refinements && data.refinements.length > 0) {
        refinementsBar.style.display = 'flex';
        data.refinements.forEach(r => {
            const pill = document.createElement('div');
            pill.className = 'refinement-pill';
            pill.textContent = r;
            pill.onclick = () => window.electronAPI.send('suggestion-selected', r);
            refinementsBar.appendChild(pill);
        });
    }

    // 2. Best Match
    if (data.bestMatch) {
        addHeader('Top Result');
        addSuggestionItem(data.bestMatch, true);
    }

    // 3. History/bookmarks + search suggestions
    const history = (data.suggestions || []).filter(s => s.type === 'history' || s.type === 'bookmark');
    const search  = (data.suggestions || []).filter(s => s.type === 'search');

    if (history.length > 0) {
        addHeader('Recently Visited');
        history.forEach(s => addSuggestionItem(s));
    }
    if (search.length > 0) {
        addHeader('Search Suggestions');
        search.forEach(s => addSuggestionItem(s));
    }
}

function addHeader(text) {
    const header = document.createElement('div');
    header.className = 'section-header';
    header.textContent = text;
    list.appendChild(header);
}

function addSuggestionItem(s, isBest = false) {
    const item = document.createElement('li');
    item.className = `suggestion-item${isBest ? ' best-match' : ''}`;

    const iconClass = s.type === 'history'  ? 'fa-clock-rotate-left' :
                      s.type === 'bookmark' ? 'fa-bookmark' : 'fa-magnifying-glass';

    let iconHtml = `<i class="fas ${iconClass}"></i>`;
    if ((s.type === 'history' || s.type === 'bookmark') && s.url) {
        try {
            const domain = new URL(s.url.startsWith('http') ? s.url : 'https://' + s.url).hostname;
            if (domain && domain.includes('.')) {
                iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" class="suggestion-favicon" onerror="const i=document.createElement('i');i.className='fas ${iconClass}';this.replaceWith(i);">`;
            }
        } catch (e) {}
    }

    const badge = s.type === 'history' ? 'Visit' : s.type === 'bookmark' ? 'Saved' : 'Search';

    item.innerHTML = `
        <div class="icon">${iconHtml}</div>
        <div class="text-group">
            <span class="query">${s.text || s.url || ''}</span>
        </div>
        <div class="action-badge">${badge}</div>`;

    item.onclick = () => {
        window.electronAPI.send('suggestion-selected', s.url || s.text);
    };

    flatItems.push({ element: item, data: s });
    list.appendChild(item);
}

// ── Keyboard Navigation ───────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
    if (flatItems.length === 0) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % flatItems.length;
        updateSelection();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + flatItems.length) % flatItems.length;
        updateSelection();
    } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
            const item = flatItems[selectedIndex].data;
            window.electronAPI.send('suggestion-selected', item.url || item.text);
        }
    } else if (e.key === 'Escape') {
        window.electronAPI.send('hide-suggestions');
    }
});

function updateSelection() {
    flatItems.forEach((item, idx) => {
        item.element.classList.toggle('selected', idx === selectedIndex);
    });
    if (selectedIndex >= 0) {
        flatItems[selectedIndex].element.scrollIntoView({ block: 'nearest' });
    }
}

// ── Dynamic Resize ────────────────────────────────────────────────────────
const resizeObserver = new ResizeObserver(() => {
    window.electronAPI.send('resize-suggestions', document.body.offsetHeight);
});
resizeObserver.observe(document.body);

// ── Settings & Theme ──────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
    if (!hex || hex.length < 7) return `rgba(21, 172, 73, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
}

function applyTheme(settings) {
    if (!settings) return;
    if (settings.themeMode) document.body.setAttribute('data-theme', settings.themeMode);
    if (settings.accentColor) applyAccent(settings.accentColor);
}

// Initial settings load
window.electronAPI.getSettings().then(s => applyTheme(s));

// Live updates — preload: onSettingsChanged: (cb) => cb(s) — data only
window.electronAPI.onSettingsChanged(s => applyTheme(s));
