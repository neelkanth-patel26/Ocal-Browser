let selectedIndex = -1;
let currentSuggestions = [];

const list = document.getElementById('list');

window.electronAPI.on('update-suggestions', (e, data) => {
    currentSuggestions = data || [];
    renderSuggestions();
});

function renderSuggestions() {
    list.innerHTML = '';
    selectedIndex = -1;
    
    if (currentSuggestions.length === 0) return;

    currentSuggestions.forEach((s, idx) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        const isHistory = s.type === 'history';
        const iconClass = isHistory ? 'fa-clock-rotate-left' : 'fa-magnifying-glass';
        
        item.innerHTML = `
            <div class="icon"><i class="fas ${iconClass}"></i></div>
            <div class="text">${s.text}</div>
            <div class="type">${s.type || 'search'}</div>
        `;
        
        item.onclick = () => {
            window.electronAPI.send('suggestion-selected', s.text);
        };
        
        list.appendChild(item);
    });
}

window.addEventListener('keydown', (e) => {
    const items = document.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelection(items);
    } else if (e.key === 'ArrowUp') {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelection(items);
    } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
            window.electronAPI.send('suggestion-selected', currentSuggestions[selectedIndex].text);
        }
    } else if (e.key === 'Escape') {
        window.electronAPI.send('hide-suggestions');
    }
});

function updateSelection(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === selectedIndex);
    });
    if (selectedIndex >= 0) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
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
