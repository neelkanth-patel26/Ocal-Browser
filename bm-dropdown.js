const container = document.getElementById('menu-container');

// Theme Synchronization — immediate from IPC
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
    // For now accent color applies but neon-lime is the main bookmark accent
    document.documentElement.style.setProperty('--accent', hex);
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
                <div class="empty-icon-wrap">
                    <i class="fa-regular fa-bookmark"></i>
                </div>
                <div class="empty-title">No bookmarks yet</div>
                <div class="empty-subtitle">Press <span class="kbd">Ctrl</span> + <span class="kbd">D</span> to save this page</div>
            </div>`;
    } else {
        // Header with count badge
        const header = document.createElement('div');
        header.className = 'dropdown-header';
        header.innerHTML = `
            <div class="header-icon-wrap">
                <i class="fa-solid fa-bookmark header-icon"></i>
            </div>
            <span class="header-label">Bookmarks</span>
            <span class="header-count">${bms.length}</span>`;
        container.appendChild(header);

        bms.forEach((bm, i) => {
            const domain = (() => { try { return new URL(bm.url).hostname.replace('www.', ''); } catch { return ''; } })();
            const icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

            const opt = document.createElement('div');
            opt.className = 'menu-option';
            opt.style.animationDelay = `${i * 25}ms`;

            opt.innerHTML = `
                <div class="favicon-wrap">
                    <img src="${icon}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" alt="">
                    <div class="favicon-fallback" style="display:none">${getFirstLetter(bm.title)}</div>
                </div>
                <div class="bm-text">
                    <span class="bm-title">${bm.title || domain}</span>
                    ${domain ? `<span class="bm-domain">${domain}</span>` : ''}
                </div>
                <i class="fa-solid fa-chevron-right nav-arrow"></i>`;

            opt.onclick = () => {
                if (bm && bm.url) {
                    window.electronAPI.send('navigate-to', bm.url);
                }
                window.electronAPI.send('hide-bm-dropdown');
            };
            container.appendChild(opt);
        });
    }

    // Resize the BrowserView to fit content
    const rect = container.getBoundingClientRect();
    window.electronAPI.send('resize-bm-dropdown', { width: rect.width + 20, height: rect.height + 20 });
});
