let selectedIndex = -1;
let flatItems = []; // To track keyboard-navigable items

const list = document.getElementById('list');
const refinementsBar = document.getElementById('refinements');

window.electronAPI.on('update-suggestions', (e, data) => {
    renderSuggestions(data);
});

function renderSuggestions(data) {
    list.innerHTML = '';
    refinementsBar.innerHTML = '';
    refinementsBar.style.display = 'none';
    flatItems = [];
    selectedIndex = -1;

    if (!data) return;

    // 1. Render Refinements (Horizontal Bar)
    if (data.refinements && data.refinements.length > 0) {
        refinementsBar.style.display = 'flex';
        data.refinements.forEach(r => {
            const pill = document.createElement('div');
            pill.className = 'refinement-pill';
            pill.textContent = r;
            pill.onclick = () => window.electronAPI.send('suggestion-selected', r);
            refinementsBar.appendChild(pill);
        });
    }

    // 2. Render Best Match
    if (data.bestMatch) {
        addHeader('Top Result');
        addSuggestionItem(data.bestMatch, true);
    }

    // 3. Render Suggestions Grouped by Type
    const history = data.suggestions.filter(s => s.type === 'history' || s.type === 'bookmark');
    const search = data.suggestions.filter(s => s.type === 'search');

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
    header.className = 'category-header';
    header.textContent = text;
    list.appendChild(header);
}

function addSuggestionItem(s, isBest = false) {
    const item = document.createElement('div');
    item.className = `suggestion-item ${isBest ? 'best-match' : ''}`;
    
    const iconClass = s.type === 'history' ? 'fa-clock-rotate-left' : 
                     s.type === 'bookmark' ? 'fa-bookmark' : 'fa-magnifying-glass';
    
    let iconHtml = `<i class="fas ${iconClass}"></i>`;
    if ((s.type === 'history' || s.type === 'bookmark') && s.url) {
        try {
            const domain = new URL(s.url.startsWith('http') ? s.url : 'https://' + s.url).hostname;
            if (domain && domain.includes('.')) {
                iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" class="suggestion-favicon" onerror="const i=document.createElement('i'); i.className='fas ${iconClass}'; this.replaceWith(i);">`;
            }
        } catch (e) {}
    }
    
    item.innerHTML = `
        <div class="icon">${iconHtml}</div>
        <div class="text">${s.text}</div>
        <div class="type">${s.type || 'search'}</div>
    `;
    
    item.onclick = () => {
        window.electronAPI.send('suggestion-selected', s.url || s.text);
    };
    
    flatItems.push({ element: item, data: s });
    list.appendChild(item);
}

window.addEventListener('keydown', (e) => {
    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % flatItems.length;
        updateSelection();
    } else if (e.key === 'ArrowUp') {
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

// ── Dynamic Resizing for Rounded Corners ────────────────────────────────────
// Reports the actual content height back to the main process so the window 
// can be resized to prevent clipping of the bottom rounded corners.
const resizeObserver = new ResizeObserver(() => {
    const height = document.body.offsetHeight;
    window.electronAPI.send('resize-suggestions', height);
});
resizeObserver.observe(document.body);

// ── Accent Color Synchronization ─────────────────────────────────────────────
function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(168, 85, 247, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.4));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.12));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(color, 0.25));
}

// Initial fetch
window.electronAPI.getSettings().then(s => {
    if (s && s.accentColor) applyAccent(s.accentColor);
});

// Real-time updates
window.electronAPI.onSettingsChanged(s => {
    if (s && s.accentColor) applyAccent(s.accentColor);
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
});

// Theme Initialization
window.electronAPI.getSettings().then(s => {
    if (s && s.accentColor) applyAccent(s.accentColor);
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
});


