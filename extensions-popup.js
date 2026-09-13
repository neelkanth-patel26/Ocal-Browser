// Ocal Browser - Extensions Hub Popup Controller

(function () {
    const listEl = document.getElementById('ext-list');
    const manageBtn = document.getElementById('btn-manage-ext');
    const storeBtn = document.getElementById('btn-open-store');
    const searchContainer = document.getElementById('ext-search-container');
    const searchInput = document.getElementById('ext-search-input');
    const countBadge = document.getElementById('ext-count-badge');

    let allExtensions = [];

    if (manageBtn) {
        manageBtn.onclick = () => {
            if (window.electronAPI && window.electronAPI.send) {
                window.electronAPI.send('hide-extensions-dropdown');
                window.electronAPI.send('open-extensions-page');
            } else {
                window.open('file://' + __dirname + '/extensions.html');
            }
        };
    }

    if (storeBtn) {
        storeBtn.onclick = () => {
            if (window.electronAPI && window.electronAPI.navigateTo) {
                window.electronAPI.navigateTo('ocal://store');
                window.electronAPI.send('hide-extensions-dropdown');
            } else {
                window.open('file://' + __dirname + '/extension-store.html');
            }
        };
    }

    if (searchInput) {
        searchInput.oninput = () => {
            applyFilter();
        };
    }

    function applyFilter() {
        const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
        if (!q) {
            renderList(allExtensions);
            return;
        }
        const filtered = allExtensions.filter(x => {
            const name = (x.name || '').toLowerCase();
            const desc = (x.desc || x.description || '').toLowerCase();
            return name.includes(q) || desc.includes(q);
        });
        renderList(filtered, true);
    }

    async function loadExtensions() {
        if (!window.electronAPI) return;

        try {
            const all = await (window.electronAPI.getAllExtensions ? window.electronAPI.getAllExtensions() : window.electronAPI.getExtensions());
            allExtensions = all || [];
            if (countBadge) {
                countBadge.innerText = allExtensions.length;
            }
            if (searchContainer) {
                searchContainer.style.display = allExtensions.length > 2 ? 'flex' : 'none';
            }
            applyFilter();
        } catch (err) {
            console.error('Failed to load extensions in dropdown:', err);
        }
    }

    function renderList(items, isSearching = false) {
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!items || items.length === 0) {
            if (isSearching) {
                listEl.innerHTML = `
                    <div style="padding: 20px 10px; text-align: center; color: var(--text-secondary); font-size: 11px;">
                        <i class="fas fa-magnifying-glass" style="font-size: 20px; margin-bottom: 8px; opacity: 0.4;"></i>
                        <div>No matching extensions found.</div>
                    </div>
                `;
            } else {
                listEl.innerHTML = `
                    <div style="padding: 24px 12px; text-align: center; color: var(--text-secondary); font-size: 11px;">
                        <i class="fas fa-puzzle-piece" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
                        <div>No extensions installed yet.</div>
                        <div style="margin-top: 4px; font-size: 10px; color: var(--accent); cursor: pointer;" id="empty-store-link">Explore Extension Store</div>
                    </div>
                `;
                const emptyLink = document.getElementById('empty-store-link');
                if (emptyLink) {
                    emptyLink.onclick = () => {
                        if (window.electronAPI && window.electronAPI.navigateTo) {
                            window.electronAPI.navigateTo('ocal://store');
                            window.electronAPI.send('hide-extensions-dropdown');
                        }
                    };
                }
            }
            return;
        }

        const marketplace = items.filter(x => x.type !== 'native');
        const native = items.filter(x => x.type === 'native');

        if (marketplace.length > 0) {
            const label = document.createElement('div');
            label.className = 'list-section-label';
            label.innerText = `Installed Extensions (${marketplace.length})`;
            listEl.appendChild(label);

            marketplace.forEach(ext => {
                const item = createExtensionItem(ext, false);
                listEl.appendChild(item);
            });
        }

        if (native.length > 0) {
            const label = document.createElement('div');
            label.className = 'list-section-label';
            label.style.marginTop = marketplace.length > 0 ? '8px' : '0px';
            label.innerText = `Built-in Modules (${native.length})`;
            listEl.appendChild(label);

            native.forEach(ext => {
                const item = createExtensionItem(ext, true);
                listEl.appendChild(item);
            });
        }
    }

    function createExtensionItem(ext, isNative) {
        const item = document.createElement('div');
        item.className = 'ext-item';

        let iconHtml;
        if (ext.iconData) {
            iconHtml = `<img src="${ext.iconData}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 4px;" alt="" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fas fa-puzzle-piece\\'></i>';">`;
        } else if (ext.icon && ext.icon.startsWith('fa-')) {
            iconHtml = `<i class="fas ${ext.icon}"></i>`;
        } else {
            iconHtml = `<i class="fas fa-puzzle-piece"></i>`;
        }

        const isPinned = Boolean(ext.pinned);
        const hasPopup = Boolean(ext.hasPopup || ext.popup);
        const hasOptions = Boolean(ext.hasOptions || ext.optionsPage);

        item.innerHTML = `
            <div class="ext-icon-wrapper" style="cursor: pointer;" title="Activate ${ext.name}">
                ${iconHtml}
            </div>
            <div class="ext-info" style="cursor: pointer;">
                <div class="ext-title" title="${ext.name}">${ext.name}</div>
                <div class="ext-desc">${ext.desc || ext.description || (isNative ? 'Built-in module' : (hasPopup ? 'Interactive Popup' : (hasOptions ? 'Settings Available' : 'Background Module')))}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
                ${hasPopup ? `
                    <button class="icon-btn-pill btn-open-popup" title="Open Extension Popup">
                        <i class="fas fa-arrow-up-right-from-square"></i>
                    </button>
                ` : ''}
                ${hasOptions && !isNative ? `
                    <button class="icon-btn-pill btn-options" title="Extension Options">
                        <i class="fas fa-gear"></i>
                    </button>
                ` : ''}
                ${!isNative ? `
                    <button class="icon-btn-pill btn-pin ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin from toolbar' : 'Pin to toolbar'}">
                        <i class="fas fa-thumbtack"></i>
                    </button>
                ` : ''}
                <label class="switch">
                    <input type="checkbox" class="ext-toggle" ${ext.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;

        // Action: Open popup or activate extension when clicking icon, info, or popup button
        const openPopupHandler = (e) => {
            e.stopPropagation();
            if (window.electronAPI) {
                if (window.electronAPI.send) {
                    window.electronAPI.send('hide-extensions-dropdown');
                }
                if (window.electronAPI.openExtensionPopup) {
                    const rect = item.getBoundingClientRect();
                    window.electronAPI.openExtensionPopup(ext.id, {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                    });
                }
            }
        };

        const iconWrapper = item.querySelector('.ext-icon-wrapper');
        if (iconWrapper) iconWrapper.onclick = openPopupHandler;
        const infoEl = item.querySelector('.ext-info');
        if (infoEl) infoEl.onclick = openPopupHandler;
        const popupBtn = item.querySelector('.btn-open-popup');
        if (popupBtn) popupBtn.onclick = openPopupHandler;

        // Action: Open Options page
        const optBtn = item.querySelector('.btn-options');
        if (optBtn) {
            optBtn.onclick = (e) => {
                e.stopPropagation();
                if (window.electronAPI && window.electronAPI.send) {
                    window.electronAPI.send('hide-extensions-dropdown');
                    window.electronAPI.send('new-tab', `chrome-extension://${ext.id}/${(ext.optionsPage || '').replace(/^\//, '')}`);
                }
            };
        }

        // Action: Toggle Pin
        const pinBtn = item.querySelector('.btn-pin');
        if (pinBtn) {
            pinBtn.onclick = async (e) => {
                e.stopPropagation();
                if (window.electronAPI && window.electronAPI.togglePinExtension) {
                    const pinned = await window.electronAPI.togglePinExtension(ext.id);
                    ext.pinned = pinned;
                    pinBtn.classList.toggle('pinned', Boolean(pinned));
                    pinBtn.title = pinned ? 'Unpin from toolbar' : 'Pin to toolbar';
                }
            };
        }

        // Action: Toggle Enable/Disable
        const toggle = item.querySelector('.ext-toggle');
        if (toggle) {
            toggle.onchange = async (e) => {
                const enabled = e.target.checked;
                ext.enabled = enabled;
                if (isNative) {
                    if (window.electronAPI && window.electronAPI.toggleNativeExtension) {
                        await window.electronAPI.toggleNativeExtension({ id: ext.id, enabled });
                    }
                } else {
                    if (window.electronAPI && window.electronAPI.toggleExtension) {
                        await window.electronAPI.toggleExtension(ext.id, enabled);
                    }
                }
            };
        }

        return item;
    }

    // Theme & Accent Color Synchronization Engine
    function applyThemeSettings(s) {
        if (!s) return;
        const isLight = s.themeMode === 'light';
        const mode = isLight ? 'light' : 'dark';
        document.body.setAttribute('data-theme', mode);
        document.documentElement.setAttribute('data-theme', mode);

        function getContrast(hex) {
            if (!hex || typeof hex !== 'string') return '#ffffff';
            hex = hex.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            if (hex.length !== 6) return '#ffffff';
            const r = parseInt(hex.substring(0, 2), 16) || 0;
            const g = parseInt(hex.substring(2, 4), 16) || 0;
            const b = parseInt(hex.substring(4, 6), 16) || 0;
            const yiq = (r * 299 + g * 587 + b * 114) / 1000;
            return yiq >= 145 ? '#0d1117' : '#ffffff';
        }

        function getModeAccent(color, light) {
            if (!color) return light ? '#058f60' : '#09f0a0';
            if (!light) return color;
            const hex = color.toLowerCase();
            if (hex === '#09f0a0' || hex === '#00ffaa' || hex.includes('f0a0')) return '#058f60';
            if (hex === '#ff007f' || hex === '#ff00aa' || hex.includes('ff007') || hex.includes('ff00a')) return '#d81b60';
            if (hex === '#00e5ff' || hex === '#00ffff' || hex.includes('00e5') || hex.includes('00f0')) return '#0288d1';
            if (hex === '#ff9100' || hex === '#ffaa00' || hex.includes('ff91') || hex.includes('ffaa')) return '#d97706';
            if (hex === '#8b5cf6' || hex === '#a855f7' || hex === '#9333ea' || hex.includes('8b5c') || hex.includes('a855')) return '#6d28d9';
            if (hex === '#ff4d4d' || hex === '#ff3333' || hex.includes('ff4d') || hex.includes('ff33')) return '#dc2626';
            if (hex === '#ffffff' || hex === '#f4f4f5' || hex === '#e8e8e8' || hex.includes('fff')) return '#0f172a';
            return color;
        }

        const rawAccent = s.accentColor || (isLight ? '#058f60' : '#09f0a0');
        const accent = getModeAccent(rawAccent, isLight);
        const contrast = getContrast(accent);

        document.documentElement.style.setProperty('--accent', accent);
        document.documentElement.style.setProperty('--accent-glow', `color-mix(in srgb, ${accent} 30%, transparent)`);
        document.documentElement.style.setProperty('--accent-dim', `color-mix(in srgb, ${accent} 15%, transparent)`);
        document.documentElement.style.setProperty('--accent-border', `color-mix(in srgb, ${accent} 35%, transparent)`);
        document.documentElement.style.setProperty('--accent-text', contrast);

        document.body.style.setProperty('--accent', accent);
        document.body.style.setProperty('--accent-glow', `color-mix(in srgb, ${accent} 30%, transparent)`);
        document.body.style.setProperty('--accent-dim', `color-mix(in srgb, ${accent} 15%, transparent)`);
        document.body.style.setProperty('--accent-border', `color-mix(in srgb, ${accent} 35%, transparent)`);
        document.body.style.setProperty('--accent-text', contrast);

        try {
            localStorage.setItem('ocal-settings-theme', mode);
            localStorage.setItem('ocal-settings-accent', accent);
        } catch (e) {}
    }

    // Refresh listener
    if (window.electronAPI) {
        if (window.electronAPI.getSettings) {
            window.electronAPI.getSettings().then(applyThemeSettings).catch(() => {});
        }
        if (window.electronAPI.on) {
            window.electronAPI.on('settings-changed', (e, s) => applyThemeSettings(s));
        }

        if (window.electronAPI.onRefreshExtensions) {
            window.electronAPI.onRefreshExtensions((data) => {
                if (Array.isArray(data)) {
                    allExtensions = data;
                    if (countBadge) countBadge.innerText = allExtensions.length;
                    applyFilter();
                } else {
                    loadExtensions();
                }
            });
        }
        if (window.electronAPI.onExtensionsChanged) {
            window.electronAPI.onExtensionsChanged((data) => {
                if (Array.isArray(data)) {
                    allExtensions = data;
                    if (countBadge) countBadge.innerText = allExtensions.length;
                    applyFilter();
                } else {
                    loadExtensions();
                }
            });
        }
    }

    // Initial load
    loadExtensions();
})();
