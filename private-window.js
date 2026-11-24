// Private Window Client Logic (Locked Dark Theme & Native Layout)
(function() {
    // ── Enforce & Permanently Lock Dark Theme ─────────────────────────
    function enforceDarkTheme() {
        if (document.documentElement.getAttribute('data-theme') !== 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        if (document.body && document.body.getAttribute('data-theme') !== 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        }
    }
    enforceDarkTheme();

    // Guard against any external or harmonizer theme mutations
    try {
        const themeObserver = new MutationObserver(() => {
            if (document.documentElement.getAttribute('data-theme') !== 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    } catch (e) {}

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
    const btnClearOmnibar = document.getElementById('btn-clear-omnibar');
    const identityBtn = document.getElementById('identity-btn');
    const siteLockIcon = document.getElementById('site-lock-icon');
    const trackerCounter = document.getElementById('tracker-counter');

    let currentTabs = [];
    let currentActiveId = null;
    let currentUrl = '';

    // ── Apple macOS Window Controls ──────────────────────────────────
    if (winMinBtn) winMinBtn.onclick = () => window.electronAPI.send('private-window-minimize');
    if (winCloseBtn) winCloseBtn.onclick = () => window.electronAPI.send('private-window-close');

    // ── Private Session Close Confirmation ──
    const privateModal = document.getElementById('private-session-confirm-modal');
    const privateTitle = document.querySelector('#private-session-confirm-modal h3');
    const privateDesc = document.getElementById('private-session-confirm-desc');
    const privateCloseBtn = document.getElementById('private-session-close-btn');
    const privateCancelBtn = document.getElementById('private-session-cancel-btn');

    function hidePrivateModal() {
        if (privateModal) privateModal.style.display = 'none';
    }

    if (window.electronAPI && window.electronAPI.on) {
        window.electronAPI.on('confirm-private-session-close', (e, data) => {
            const count = data && typeof data.tabCount === 'number' ? data.tabCount : currentTabs.length;
            if (privateTitle) {
                privateTitle.textContent = count > 1 ? 'Close Private Window?' : 'Exit InPrivate Session?';
            }
            if (privateDesc) {
                privateDesc.textContent = count > 1
                    ? `You have ${count} open private tabs. Are you sure you want to close this window and end your private session?`
                    : 'Are you sure you want to close this private window and end your private browsing session?';
            }
            if (privateCloseBtn) {
                privateCloseBtn.textContent = count > 1 ? 'Close Tabs' : 'Close Window';
            }
            if (privateModal) {
                privateModal.style.display = 'flex';
                if (privateCancelBtn) setTimeout(() => privateCancelBtn.focus(), 50);
            }
        });
    }

    if (privateCloseBtn) {
        privateCloseBtn.onclick = () => {
            const dontAsk = document.getElementById('private-dont-ask-cb');
            if (dontAsk && dontAsk.checked && window.electronAPI && window.electronAPI.updateSetting) {
                window.electronAPI.updateSetting('confirmPrivateExit', false);
                window.electronAPI.updateSetting('confirmExit', false);
            }
            hidePrivateModal();
            if (window.electronAPI && window.electronAPI.send) {
                window.electronAPI.send('private-session-close-confirmed');
            }
        };
    }

    if (privateCancelBtn) {
        privateCancelBtn.onclick = () => {
            hidePrivateModal();
            if (window.electronAPI && window.electronAPI.send) {
                window.electronAPI.send('private-session-close-cancelled');
            }
        };
    }

    if (privateModal) {
        privateModal.addEventListener('click', (e) => {
            if (e.target === privateModal) {
                hidePrivateModal();
                if (window.electronAPI && window.electronAPI.send) {
                    window.electronAPI.send('private-session-close-cancelled');
                }
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (privateModal && privateModal.style.display !== 'none') {
            if (e.key === 'Escape') {
                e.preventDefault();
                hidePrivateModal();
                if (window.electronAPI && window.electronAPI.send) {
                    window.electronAPI.send('private-session-close-cancelled');
                }
            }
        }
    });

    if (winMaxBtn) {
        winMaxBtn.onclick = () => window.electronAPI.send('private-window-maximize');
        let hoverTimer = null;
        let snapTriggered = false;

        const triggerNativeSnap = () => {
            clearTimeout(hoverTimer);
            snapTriggered = true;
            if (window.electronAPI && typeof window.electronAPI.triggerNativeSnap === 'function') {
                window.electronAPI.triggerNativeSnap();
            } else if (window.electronAPI && typeof window.electronAPI.send === 'function') {
                window.electronAPI.send('trigger-native-snap');
            }
        };

        winMaxBtn.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimer);
            snapTriggered = false;
            hoverTimer = setTimeout(() => {
                if (!snapTriggered) {
                    triggerNativeSnap();
                }
            }, 280);
        });
        winMaxBtn.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            snapTriggered = false;
        });
        winMaxBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            triggerNativeSnap();
        });
    }

    // ── Omnibar Clear Button Controller ──────────────────────────────
    function updateClearBtnVisibility() {
        if (!btnClearOmnibar) return;
        if (urlInput && urlInput.value && urlInput.value.trim().length > 0) {
            btnClearOmnibar.style.display = 'flex';
        } else {
            btnClearOmnibar.style.display = 'none';
        }
    }

    if (urlInput) {
        urlInput.addEventListener('input', updateClearBtnVisibility);
        urlInput.addEventListener('focus', updateClearBtnVisibility);
    }

    if (btnClearOmnibar) {
        btnClearOmnibar.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (urlInput) {
                urlInput.value = '';
                urlInput.focus();
                updateClearBtnVisibility();
            }
        });
    }

    function updateSiteLock(url) {
        if (!identityBtn) return;
        currentUrl = url || '';

        const isHome = !url || url.includes('home.html') || url.includes('private-home.html') || url.startsWith('ocal://');
        if (isHome) {
            identityBtn.innerHTML = '<i class="fas fa-shield-halved site-lock-icon inprivate" id="site-lock-icon" style="color: #f87d51; font-size: 13px;"></i>';
            identityBtn.title = 'InPrivate Browsing — Zero History & Data Saved';
        } else if (url.startsWith('http://')) {
            identityBtn.innerHTML = '<i class="fas fa-lock-open site-lock-icon insecure" id="site-lock-icon"></i>';
            identityBtn.title = 'Connection is not secure (HTTP)';
        } else {
            identityBtn.innerHTML = '<i class="fas fa-lock site-lock-icon secure" id="site-lock-icon"></i>';
            identityBtn.title = 'Connection is secure (HTTPS)';
        }
    }

    if (identityBtn) {
        identityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = identityBtn.getBoundingClientRect();
            // Show modular site security & permissions info
            window.electronAPI.send('show-site-info', {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        });
    }

    // ── Tab Interactions ─────────────────────────────────────────────
    if (btnNewTab) btnNewTab.onclick = () => window.electronAPI.send('private-new-tab');

    // ── Nav Interactions ─────────────────────────────────────────────
    if (btnBack) btnBack.onclick = () => window.electronAPI.send('private-back');
    if (btnForward) btnForward.onclick = () => window.electronAPI.send('private-forward');
    if (btnReload) btnReload.onclick = () => window.electronAPI.send('private-reload');
    if (btnHome) btnHome.onclick = () => window.electronAPI.send('private-home');

    let privateEngine = 'duckduckgo';
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
            } else if (privateEngine === 'brave') {
                target = `https://search.brave.com/search?q=${encodeURIComponent(raw)}`;
            } else if (privateEngine === 'google') {
                target = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
            } else {
                target = `https://duckduckgo.com/?q=${encodeURIComponent(raw)}`;
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
            tabEl.title = tab.title || 'InPrivate Tab';

            // Favicon
            const favEl = document.createElement('div');
            favEl.className = 'tab-favicon';
            const isHome = tab.url && (tab.url.includes('home.html') || tab.url.includes('private-home.html'));
            if (isHome) {
                favEl.innerHTML = `<i class="fas fa-shield-halved"></i>`;
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

    // ── IPC Listeners ─────────────────────────────────────────────────
    window.electronAPI?.on?.('private-tabs-updated', (event, data) => {
        if (!data) return;
        renderTabs(data.tabs, data.activeTabId);
    });

    window.electronAPI?.on?.('private-tab-state', (event, state) => {
        if (!state) return;
        if (btnBack) btnBack.disabled = !state.canGoBack;
        if (btnForward) btnForward.disabled = !state.canGoForward;

        const url = state.url || '';
        updateSiteLock(url);

        if (document.activeElement !== urlInput) {
            if (url && !url.includes('home.html') && !url.includes('private-home.html')) {
                urlInput.value = url;
            } else {
                urlInput.value = '';
            }
            updateClearBtnVisibility();
        }
        if (state.trackersBlocked !== undefined && trackerCounter) {
            trackerCounter.textContent = `${state.trackersBlocked} Blocked`;
        }
    });

    window.electronAPI?.on?.('private-trackers-updated', (event, count) => {
        if (count !== undefined && trackerCounter) {
            trackerCounter.textContent = `${count} Blocked`;
        }
    });

    window.electronAPI?.on?.('window-is-maximized', (event, isMax) => {
        if (winMaxBtn) {
            winMaxBtn.title = isMax ? 'Restore' : 'Maximize';
            if (isMax) {
                winMaxBtn.innerHTML = '<svg width="7" height="7" viewBox="0 0 10 10"><rect x="3" y="1.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="1.5" y="3" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
            } else {
                winMaxBtn.innerHTML = '<svg width="7" height="7" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
            }
        }
    });

    // ── Keyboard Shortcuts for Private Window ─────────────────────────
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
            window.electronAPI.send('trigger-native-snap');
        }
    });

    // Request tabs and view bounds from main
    window.electronAPI?.send?.('private-window-ready');
})();
