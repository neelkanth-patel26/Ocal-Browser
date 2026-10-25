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
    if (winMaxBtn) {
        winMaxBtn.onclick = () => window.electronAPI.send('private-window-maximize');
        let hoverTimer = null;
        const triggerPrivateFlyout = () => {
            clearTimeout(hoverTimer);
            const rect = winMaxBtn.getBoundingClientRect();
            window.electronAPI.send('show-snap-flyout', {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        };

        winMaxBtn.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(triggerPrivateFlyout, 150);
        });
        winMaxBtn.addEventListener('mousemove', () => {
            if (!hoverTimer) hoverTimer = setTimeout(triggerPrivateFlyout, 150);
        });
        winMaxBtn.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            window.electronAPI.send('hide-snap-flyout', 450);
        });
        winMaxBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            triggerPrivateFlyout();
        });

        window.addEventListener('keydown', (e) => {
            if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                triggerPrivateFlyout();
            } else if (e.key === 'Escape') {
                window.electronAPI.send('hide-snap-flyout', 0);
            }
        });
    }
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
        } else if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            toggleSnapFlyout();
        } else if (e.key === 'Escape') {
            hideSnapFlyout();
        }
    });

    // ── Windows 11 Snap Layouts Flyout Engine ────────────────────────
    const snapFlyout = document.getElementById('win11-snap-flyout');
    let showTimer = null;
    let hideTimer = null;

    function showSnapFlyout() {
        if (!snapFlyout || !winMaxBtn) return;
        clearTimeout(hideTimer);
        clearTimeout(showTimer);
        const rect = winMaxBtn.getBoundingClientRect();
        snapFlyout.style.display = 'block';
        const rightMargin = Math.max(10, window.innerWidth - rect.right - 20);
        snapFlyout.style.right = rightMargin + 'px';
        snapFlyout.style.top = (rect.bottom + 6) + 'px';
    }

    function hideSnapFlyout(delay = 0) {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        if (delay > 0) {
            hideTimer = setTimeout(() => {
                if (snapFlyout) snapFlyout.style.display = 'none';
            }, delay);
        } else {
            if (snapFlyout) snapFlyout.style.display = 'none';
        }
    }

    function toggleSnapFlyout() {
        if (!snapFlyout) return;
        if (snapFlyout.style.display === 'none' || !snapFlyout.style.display) {
            showSnapFlyout();
        } else {
            hideSnapFlyout();
        }
    }

    if (winMaxBtn && snapFlyout) {
        winMaxBtn.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            clearTimeout(showTimer);
            showTimer = setTimeout(showSnapFlyout, 320);
        });

        winMaxBtn.addEventListener('mouseleave', () => {
            hideSnapFlyout(260);
        });

        winMaxBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showSnapFlyout();
        });

        snapFlyout.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            clearTimeout(showTimer);
        });

        snapFlyout.addEventListener('mouseleave', () => {
            hideSnapFlyout(220);
        });

        snapFlyout.querySelectorAll('.snap-zone').forEach(zoneEl => {
            zoneEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const zone = zoneEl.getAttribute('data-zone');
                if (zone && window.electronAPI && typeof window.electronAPI.snapWindow === 'function') {
                    window.electronAPI.snapWindow(zone);
                }
                hideSnapFlyout();
            });
        });

        document.addEventListener('pointerdown', (e) => {
            if (snapFlyout.style.display !== 'none' && !snapFlyout.contains(e.target) && e.target !== winMaxBtn) {
                hideSnapFlyout();
            }
        });
    }

    // Initial ready signal to request tabs
    window.electronAPI?.send?.('private-window-ready');
})();
