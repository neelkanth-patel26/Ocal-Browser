// Private Window Client Logic
(function() {
    const tabsStrip = document.getElementById('tabs-strip');
    const btnNewTab = document.getElementById('btn-new-tab');
    const winMinBtn = document.getElementById('win-min-btn');
    const winMaxBtn = document.getElementById('win-max-btn');
    const winCloseBtn = document.getElementById('win-close-btn');

    const btnBack = document.getElementById('btn-back');
    const btnForward = document.getElementById('btn-forward');
    const btnReload = document.getElementById('btn-reload');
    const btnHome = document.getElementById('btn-home');
    const urlInput = document.getElementById('url-input');
    const trackerCounter = document.getElementById('tracker-counter');

    let currentTabs = [];
    let currentActiveId = null;

    // Window controls
    if (winMinBtn) winMinBtn.onclick = () => window.electronAPI.send('private-window-minimize');
    if (winMaxBtn) winMaxBtn.onclick = () => window.electronAPI.send('private-window-maximize');
    if (winCloseBtn) winCloseBtn.onclick = () => window.electronAPI.send('private-window-close');

    // Tab interactions
    if (btnNewTab) btnNewTab.onclick = () => window.electronAPI.send('private-new-tab');

    // Nav interactions
    if (btnBack) btnBack.onclick = () => window.electronAPI.send('private-back');
    if (btnForward) btnForward.onclick = () => window.electronAPI.send('private-forward');
    if (btnReload) btnReload.onclick = () => window.electronAPI.send('private-reload');
    if (btnHome) btnHome.onclick = () => window.electronAPI.send('private-home');

    let privateEngine = 'ocal';
    if (window.electronAPI?.getSettings) {
        window.electronAPI.getSettings().then(s => {
            if (s?.searchEngine) privateEngine = s.searchEngine;
        }).catch(() => {});
    }

    window.handleNavigate = function(e) {
        if (e) e.preventDefault();
        const raw = (urlInput.value || '').trim();
        if (!raw) return;

        let target = raw;
        const isUrl = /^(https?:\/\/|[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$)/i.test(raw);
        if (isUrl) {
            if (!target.startsWith('http://') && !target.startsWith('https://')) {
                target = 'https://' + target;
            }
        } else {
            if (privateEngine === 'ocal') {
                target = `http://localhost:8080/search?q=${encodeURIComponent(raw)}`;
            } else if (privateEngine === 'duckduckgo') {
                target = `https://duckduckgo.com/?q=${encodeURIComponent(raw)}`;
            } else if (privateEngine === 'brave') {
                target = `https://search.brave.com/search?q=${encodeURIComponent(raw)}`;
            } else {
                target = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
            }
        }

        window.electronAPI.send('private-navigate', target);
    };

    function renderTabs(tabs, activeId) {
        currentTabs = tabs || [];
        currentActiveId = activeId;
        tabsStrip.innerHTML = '';

        currentTabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = `private-tab ${tab.id === activeId ? 'active' : ''}`;
            tabEl.title = tab.title || 'Private Tab';

            // Favicon
            const favEl = document.createElement('div');
            favEl.className = 'tab-favicon';
            const isHome = tab.url && (tab.url.includes('home.html') || tab.url.includes('private-home.html'));
            if (isHome) {
                favEl.innerHTML = `<i class="fa-solid fa-user-secret" style="color: #c084fc;"></i>`;
            } else if (tab.favicon && !tab.favicon.includes('default')) {
                favEl.innerHTML = `<img src="${tab.favicon}" alt="" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-shield-halved\\'></i>'">`;
            } else {
                favEl.innerHTML = `<i class="fas fa-shield-halved"></i>`;
            }

            // Title
            const titleEl = document.createElement('span');
            titleEl.className = 'tab-title-text';
            titleEl.textContent = isHome ? 'InPrivate' : (tab.title || (tab.url ? tab.url.replace(/^https?:\/\//i, '') : 'New Tab'));

            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close-btn';
            closeBtn.innerHTML = '<i class="fas fa-xmark"></i>';
            closeBtn.title = 'Close Tab (Ctrl+W)';
            closeBtn.onclick = (ev) => {
                ev.stopPropagation();
                window.electronAPI.send('private-close-tab', tab.id);
            };

            tabEl.appendChild(favEl);
            tabEl.appendChild(titleEl);
            tabEl.appendChild(closeBtn);

            tabEl.onclick = () => {
                if (tab.id !== currentActiveId) {
                    window.electronAPI.send('private-switch-tab', tab.id);
                }
            };

            tabsStrip.appendChild(tabEl);
        });

        // Ensure active tab is visible
        const activeTabEl = tabsStrip.querySelector('.private-tab.active');
        if (activeTabEl) {
            activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    // IPC Listeners
    window.electronAPI?.on?.('private-tabs-updated', (event, data) => {
        if (!data) return;
        renderTabs(data.tabs, data.activeTabId);
    });

    window.electronAPI?.on?.('private-tab-state', (event, state) => {
        if (!state) return;
        btnBack.disabled = !state.canGoBack;
        btnForward.disabled = !state.canGoForward;

        if (document.activeElement !== urlInput) {
            if (state.url && !state.url.includes('home.html') && !state.url.includes('private-home.html')) {
                urlInput.value = state.url;
            } else {
                urlInput.value = '';
            }
        }
        if (state.trackersBlocked !== undefined) {
            trackerCounter.textContent = `${state.trackersBlocked} Blocked`;
        }
    });

    window.electronAPI?.on?.('private-trackers-updated', (event, count) => {
        if (count !== undefined) {
            trackerCounter.textContent = `${count} Blocked`;
        }
    });

    window.electronAPI?.on?.('window-is-maximized', (event, isMax) => {
        if (winMaxBtn) {
            winMaxBtn.innerHTML = isMax ? '<i class="far fa-window-restore"></i>' : '<i class="far fa-square"></i>';
            winMaxBtn.title = isMax ? 'Restore' : 'Maximize';
        }
    });

    // Keyboard Shortcuts for Private Window
    window.addEventListener('keydown', (e) => {
        const cmdOrCtrl = e.metaKey || e.ctrlKey;
        if (cmdOrCtrl && e.key.toLowerCase() === 't') {
            e.preventDefault();
            window.electronAPI.send('private-new-tab');
        } else if (cmdOrCtrl && e.key.toLowerCase() === 'w') {
            e.preventDefault();
            if (currentActiveId) window.electronAPI.send('private-close-tab', currentActiveId);
        } else if (cmdOrCtrl && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            window.electronAPI.send('private-reload');
        } else if (cmdOrCtrl && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            urlInput.focus();
            urlInput.select();
        } else if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            window.electronAPI.send('private-back');
        } else if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            window.electronAPI.send('private-forward');
        }
    });

    // Initial ready signal to request tabs
    window.electronAPI?.send?.('private-window-ready');
})();
