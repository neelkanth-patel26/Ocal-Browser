const container = document.getElementById('menu-container');

// Theme Synchronization
window.electronAPI.invoke('get-settings').then(s => {
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
    if (s && s.accentColor) applyAccent(s.accentColor);
});

window.electronAPI.on('settings-changed', (s) => {
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
    if (s && s.accentColor) applyAccent(s.accentColor);
});

function applyAccent(hex) {
    if (!hex || hex.length < 7) return;
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.10)`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.25)`);
}

function getFirstLetter(title) {
    return (title || '?').charAt(0).toUpperCase();
}

window.electronAPI.onShowBMDropdown((data) => {
    container.innerHTML = '';
    const bms = data.bookmarks || [];

    if (bms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-bookmark"></i>
                <div class="empty-title">No bookmarks yet</div>
                <div class="empty-subtitle">Press Ctrl+D to save a page</div>
            </div>`;
    } else {
        // Header
        const header = document.createElement('div');
        header.className = 'dropdown-header';
        header.innerHTML = `<i class="fa-solid fa-bookmark"></i> Bookmarks`;
        container.appendChild(header);

        bms.forEach((bm, i) => {
            const domain = (() => { try { return new URL(bm.url).hostname.replace('www.', ''); } catch { return ''; } })();
            const icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

            const opt = document.createElement('div');
            opt.className = 'menu-option';
            opt.style.animationDelay = `${i * 30}ms`;

            opt.innerHTML = `
                <div class="favicon-wrap">
                    <img src="${icon}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" alt="">
                    <div class="favicon-fallback" style="display:none">${getFirstLetter(bm.title)}</div>
                </div>
                <div class="bm-text">
                    <span class="bm-title">${bm.title || domain}</span>
                    ${domain ? `<span class="bm-domain">${domain}</span>` : ''}
                </div>
                <i class="fa-solid fa-arrow-right nav-arrow"></i>`;

            opt.onclick = () => {
                if (bm && bm.url) {
                    window.electronAPI.send('navigate-to', bm.url);
                }
                window.electronAPI.send('hide-bm-dropdown');
            };
            container.appendChild(opt);
        });
    }

    // Resize the BrowserView to fit
    const rect = container.getBoundingClientRect();
    window.electronAPI.send('resize-bm-dropdown', { width: rect.width + 20, height: rect.height + 20 });
});
