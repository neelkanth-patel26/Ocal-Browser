const container = document.getElementById('menu-container');

window.electronAPI.onShowBMDropdown((data) => {
    container.innerHTML = '';
    const bms = data.bookmarks || [];
    
    if (bms.length === 0) {
        container.innerHTML = `<div class="empty-label">No bookmarks found</div>`;
    } else {
        bms.forEach(bm => {
            const domain = (() => { try { return new URL(bm.url).hostname; } catch { return ''; } })();
            const icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            
            const opt = document.createElement('div');
            opt.className = 'menu-option';
            opt.innerHTML = `<img src="${icon}" onerror="this.src='/favicon.ico'; this.onerror=null;"> <span>${bm.title}</span>`;
            opt.onclick = () => {
                window.electronAPI.send('navigate-to', bm.url);
                window.electronAPI.send('hide-bm-dropdown');
            };
            container.appendChild(opt);
        });
    }

    // Adjust container width to fit content (it's in a fit-content container)
    // The main process will resize the view to match this container
    const rect = container.getBoundingClientRect();
    window.electronAPI.send('resize-bm-dropdown', { width: rect.width + 12, height: rect.height + 12 });
});
