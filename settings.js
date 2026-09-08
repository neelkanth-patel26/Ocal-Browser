const sleep = ms => new Promise(res => setTimeout(res, ms));

// Navigation
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');

// View sections
function showSection(id) {
    sections.forEach(s => {
        const isActive = s.id === id;
        s.classList.toggle('active', isActive);
    });
    
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === id);
    });

    // Update title for browser tab
    const sectionName = id.charAt(0).toUpperCase() + id.slice(1);
    document.title = 'Ocal Settings';
    
    // Update hash for URL persistence/aesthetics
    if (window.location.hash !== `#${id}`) {
        history.replaceState(null, null, `#${id}`);
    }

    // Dynamic settings path updates
    const pathSpan = document.querySelector('.settings-address-bar .path');
    if (pathSpan) {
        let displayName = sectionName;
        if (id === 'homepage') displayName = 'Home Page';
        else if (id === 'ai') displayName = 'AI Assistant';
        else if (id === 'whatsnew') displayName = "What's New";
        else if (id === 'specials') displayName = "Specials & Ambient";
        pathSpan.textContent = `settings / ${displayName}`;
    }

    // Reset global search on tab changes
    const searchInput = document.getElementById('settings-global-search');
    if (searchInput) {
        searchInput.value = '';
        filterGlobalSettings();
    }
}

navItems.forEach(item => {
    item.onclick = async () => {
        if (item.dataset.section === 'whatsnew') {
            window.electronAPI.newTab('ocal://whats-new');
            return;
        }
        if (item.classList.contains('active')) return;
        
        const current = document.querySelector('.section.active');
        const target = document.getElementById(item.dataset.section);
        
        if (current) {
            current.style.opacity = '0';
            current.style.transform = 'translateY(10px) scale(0.98)';
            await sleep(200);
            current.classList.remove('active');
            current.style.opacity = '';
            current.style.transform = '';
        }

        if (target) {
            showSection(item.dataset.section);
            target.classList.add('active');
            target.style.opacity = '0';
            target.style.transform = 'translateY(-10px) scale(1.02)';
            // Trigger reflow
            target.offsetHeight; 
            target.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            target.style.opacity = '1';
            target.style.transform = 'translateY(0) scale(1)';
        }
    };
});

// Dashboard Range State
let currentRange = '24h';
document.querySelectorAll('.range-pill').forEach(pill => {
    pill.onclick = () => {
        document.querySelectorAll('.range-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentRange = pill.dataset.range;
        if (window._lastShieldStats) updateShieldDashboard(window._lastShieldStats);
    };
});

// Toggle logic
const initToggle = (id, settingKey, initialValue) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('on', !!initialValue);
    el.onclick = () => {
        const newState = !el.classList.contains('on');
        el.classList.toggle('on', newState);
        window.electronAPI.updateSetting(settingKey, newState);
        if (settingKey === 'showNewsHub') {
            localStorage.setItem('ocal-show-news', newState ? 'true' : 'false');
        }
    };
};

// Grid Selectors — works with both .grid-item and .choice-item
function initGridSelector(gridId, settingsKey, transform = null) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll('.grid-item, .choice-item').forEach(item => {
        item.onclick = () => {
            const rawVal = item.dataset.value;
            const val = transform ? transform(rawVal) : rawVal;
            grid.querySelectorAll('.grid-item, .choice-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Check radio button if present
            const radio = item.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
            
            window.electronAPI.updateSetting(settingsKey, val);
            

            // Real-time theme application
            if (gridId === 'theme-mode-grid') {
                applyTheme(val);
            }
        };
    });
}


// Extension Interactions
document.querySelectorAll('.extension-card .btn.secondary, .extension-card .btn.primary').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.innerText === 'INSTALL') {
            btn.innerText = 'INSTALLING...';
            setTimeout(() => {
                btn.innerText = 'ACTIVE';
                btn.className = 'btn primary';
                btn.style.boxShadow = 'none';
            }, 1000);
        }
    });
});
function setGridValue(gridId, value) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll('.grid-item, .choice-item, .search-provider-pill').forEach(item => {
        item.classList.toggle('active', item.dataset.value === value);
    });
}

// Color dots
const dots = document.querySelectorAll('.color-dot');
dots.forEach(dot => {
    dot.onclick = () => {
        const c = dot.dataset.color;
        window.electronAPI.updateSetting('accentColor', c);
        applyAccent(c);
    };
});
function getContrastColor(hex) {
    if (!hex || hex.length < 7) return '#000000';
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 128 ? '#000000' : '#ffffff';
}

let lastColor = null;

function getModeAccent(color, isLight) {
    if (!color) return isLight ? '#058f60' : '#09f0a0';
    if (!isLight) return color;
    const hex = color.toLowerCase();
    if (hex === '#09f0a0' || hex === '#00ffaa' || hex.includes('f0a0')) return '#058f60';
    if (hex === '#ff007f' || hex === '#ff00aa' || hex.includes('ff007') || hex.includes('ff00a')) return '#d81b60';
    if (hex === '#00e5ff' || hex === '#00ffff' || hex === '#3b82f6' || hex.includes('00e5') || hex.includes('00f0') || hex.includes('3b82')) return '#0288d1';
    if (hex === '#ff9100' || hex === '#ffaa00' || hex === '#e8ff47' || hex.includes('ff91') || hex.includes('ffaa') || hex.includes('e8ff')) return '#d97706';
    if (hex === '#8b5cf6' || hex === '#a855f7' || hex === '#9333ea' || hex === '#7b1fa2' || hex.includes('8b5c') || hex.includes('a855') || hex.includes('7b1f')) return '#6d28d9';
    if (hex === '#ff4d4d' || hex === '#ff3333' || hex === '#ef4444' || hex === '#ef5350' || hex.includes('ff4d') || hex.includes('ff33') || hex.includes('ef44') || hex.includes('ef53')) return '#dc2626';
    if (hex === '#ffffff' || hex === '#f4f4f5' || hex === '#e8e8e8' || hex.includes('fff')) return '#0f172a';
    return color;
}

function updateColorDots(themeMode) {
    const isLight = themeMode === 'light';
    const darkColors = ['#09f0a0', '#ffffff', '#a855f7', '#3b82f6', '#ef4444', '#e8ff47'];
    const lightColors = ['#058f60', '#0f172a', '#6d28d9', '#0288d1', '#dc2626', '#d97706'];
    
    dots.forEach((dot, index) => {
        const color = isLight ? lightColors[index] : darkColors[index];
        if (color) {
            dot.style.background = color;
            dot.dataset.color = color;
        }
    });
}

function updateAIGradientPreviews(harmony) {
    if (!harmony) return;
    const p1 = document.getElementById('ai-grad-preview-primary');
    const p2 = document.getElementById('ai-grad-preview-secondary');
    if (p1 && harmony.primary) p1.style.background = harmony.primary;
    if (p2 && harmony.secondary) p2.style.background = harmony.secondary;
}

function applyAccent(color) {
    if (!color) return;
    lastColor = color;
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const activeAccent = getModeAccent(color, isLight);
    const contrastColor = getContrastColor(activeAccent);
    
    document.documentElement.style.setProperty('--accent', activeAccent);
    document.documentElement.style.setProperty('--accent-glow', `color-mix(in srgb, ${activeAccent} 30%, transparent)`);
    document.documentElement.style.setProperty('--accent-dim', `color-mix(in srgb, ${activeAccent} 12%, transparent)`);
    document.documentElement.style.setProperty('--accent-border', activeAccent);
    document.documentElement.style.setProperty('--accent-text', contrastColor);

    document.body.style.setProperty('--accent', activeAccent);
    document.body.style.setProperty('--accent-glow', `color-mix(in srgb, ${activeAccent} 30%, transparent)`);
    document.body.style.setProperty('--accent-dim', `color-mix(in srgb, ${activeAccent} 12%, transparent)`);
    document.body.style.setProperty('--accent-border', activeAccent);
    document.body.style.setProperty('--accent-text', contrastColor);
    
    // AI Harmonic Gradient Synthesis & Live DOM update
    if (window.OcalColorHarmonizer) {
        const harmony = window.OcalColorHarmonizer.applyHarmonizedTheme(activeAccent, isLight ? 'light' : 'dark');
        updateAIGradientPreviews(harmony);
    }

    localStorage.setItem('ocal-settings-accent', color);
    dots.forEach(d => d.classList.toggle('active', d.dataset.color === color));
    document.querySelectorAll('.hbc-swatch').forEach(d => d.classList.toggle('active', d.dataset.color && d.dataset.color.toLowerCase() === color.toLowerCase()));
    const statAccent = document.getElementById('homepage-stat-accent');
    if (statAccent) {
        const accentNames = {
            '#09f0a0': 'Emerald',
            '#ffffff': 'White',
            '#a855f7': 'Purple',
            '#3b82f6': 'Blue',
            '#ef4444': 'Crimson',
            '#e8ff47': 'Yellow',
            '#fb923c': 'Orange',
            '#06b6d4': 'Cyan'
        };
        statAccent.innerText = accentNames[color.toLowerCase()] || 'Custom';
    }
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('ocal-settings-theme', theme);
    updateColorDots(theme);
    if (lastColor) applyAccent(lastColor);
    const statTheme = document.getElementById('homepage-stat-theme');
    if (statTheme) statTheme.innerText = theme === 'dark' ? 'Dark' : 'Light';
    const themeCb = document.getElementById('theme-mode-toggle-cb');
    if (themeCb) themeCb.checked = (theme === 'dark');
}


// Home Page Controls
window.updateHomeLayout = function(layout, skipUpdate = false) {
    document.querySelectorAll('.layout-preview-card').forEach(c => {
        c.classList.toggle('active', c.id === `layout-${layout}`);
    });
    if (!skipUpdate) window.electronAPI.updateSetting('homeLayout', layout);
}
window.updateHomeSetting = function(key, val, skipUpdate = false) {
    const value = parseInt(val);
    if (key === 'homeTileSize') {
        const lbl = document.getElementById('label-tile-size');
        if (lbl) lbl.innerText = value + 'px';
        const inp = document.getElementById('homeTileSize');
        if (inp) inp.value = value;
    }
    if (key === 'homeTileSpacing') {
        const lbl = document.getElementById('label-tile-spacing');
        if (lbl) lbl.innerText = value + 'px';
        const inp = document.getElementById('homeTileSpacing');
        if (inp) inp.value = value;
    }
    if (!skipUpdate) window.electronAPI.updateSetting(key, value);
}

// Shortcut Filtering
const shortcutSearch = document.getElementById('shortcut-search');
const categoryPills  = document.querySelectorAll('.category-pills .pill, .cat-pills .cat-pill');
const shortcutList   = document.getElementById('shortcut-list');

function filterShortcuts() {
    if (!shortcutList) return;
    const query = (shortcutSearch ? shortcutSearch.value : '').toLowerCase();
    const activePill = document.querySelector('.category-pills .pill.active, .cat-pills .cat-pill.active');
    const activeCat  = activePill ? activePill.dataset.cat : 'all';

    // Handle both old shortcut-card and new shortcut-row
    const cards  = shortcutList.querySelectorAll('[data-keywords]');
    const groups = shortcutList.querySelectorAll('[data-category]');

    cards.forEach(card => {
        const keywords = (card.dataset.keywords || '').toLowerCase();
        const group    = card.closest('[data-category]');
        const catMatch = activeCat === 'all' || (group && group.dataset.category.includes(activeCat));
        const queryMatch = !query || keywords.includes(query);
        card.style.display = (catMatch && queryMatch) ? '' : 'none';
    });

    groups.forEach(group => {
        const visibleCards = Array.from(group.querySelectorAll('[data-keywords]')).some(c => c.style.display !== 'none');
        group.style.display = visibleCards ? '' : 'none';
    });
}

if (shortcutSearch) shortcutSearch.addEventListener('input', filterShortcuts);
categoryPills.forEach(pill => {
    pill.onclick = () => {
        categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filterShortcuts();
    };
});

// Extension install button handling
document.querySelectorAll('.ext-card .btn').forEach(btn => {
    btn.onclick = () => {
        const txt = btn.innerText.trim().toUpperCase();
        if (txt === 'INSTALL') {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            btn.classList.add('loading');
            setTimeout(() => {
                btn.innerHTML = 'Active';
                btn.classList.remove('loading', 'secondary');
                btn.classList.add('primary');
                btn.style.boxShadow = 'none';
                const card = btn.closest('.ext-card');
                if (card) card.classList.add('active');
                const status = card?.querySelector('.ext-status');
                if (status) {
                    status.classList.remove('off');
                    status.classList.add('on');
                    status.innerHTML = '<i class="fas fa-circle"></i> Active';
                }
            }, 1500);
        }
    };
});

function filterExtSettings() {
    const query = document.getElementById('ext-search-input')?.value.toLowerCase().trim() || '';
    document.querySelectorAll('#ext-settings-grid .ext-card-row').forEach(card => {
        const name = (card.dataset.extname || card.querySelector('.ext-card-name')?.innerText || '').toLowerCase();
        card.style.display = !query || name.includes(query) ? '' : 'none';
    });
}

function filterExtensions() {
    const query = document.getElementById('ext-search-input')?.value.toLowerCase().trim() || '';
    // Support both old grid and new grid
    const cards = document.querySelectorAll('#ext-settings-grid .ext-card-row, #extensions-grid .ext-item-card');
    cards.forEach(card => {
        const name = (card.dataset.extname || card.querySelector('.ext-card-name, h5')?.innerText || '').toLowerCase();
        card.style.display = !query || name.includes(query) ? '' : 'none';
    });
}

const extSearchInput = document.getElementById('ext-search-input');
if (extSearchInput) extSearchInput.addEventListener('input', filterExtensions);

document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterExtensions();
    });
});

filterExtSettings();
filterExtensions();

// CWS Install from Settings
window.installExtFromSettings = async function() {
    const input = document.getElementById('ext-cws-input');
    const id = input?.value.trim();
    if (!id) return;
    const loader = document.getElementById('ext-install-loader');
    if (loader) loader.style.display = 'flex';
    try {
        const result = await window.electronAPI.invoke('install-extension', id);
        if (input) input.value = '';
        window.electronAPI.getSettings().then(s => renderExtensions(s));
        alert(`Successfully installed ${result.name}!`);
    } catch (err) {
        alert('Failed to install extension. Please check the ID or URL.');
    } finally {
        if (loader) loader.style.display = 'none';
    }
};

// Security Pulse Trigger
const shieldCard = document.querySelector('.shield-card');
if (shieldCard) {
    shieldCard.onclick = () => {
        const halo = shieldCard.querySelector('.pulse-halo');
        if (halo) {
            halo.style.animation = 'none';
            shieldCard.offsetHeight; // trigger reflow
            halo.style.animation = 'halo-pulse 2s cubic-bezier(0.16, 1, 0.3, 1)';
        }
    };
}

const PROFILE_PALETTE = [
    { name: 'Emerald', color: '#09f0a0' },
    { name: 'Cyan', color: '#00e5ff' },
    { name: 'Violet', color: '#a855f7' },
    { name: 'Rose', color: '#ff007f' },
    { name: 'Amber', color: '#ff9100' },
    { name: 'Crimson', color: '#ff4d4d' },
    { name: 'Slate', color: '#64748b' }
];

function renderProfiles(s) {
    if (!s) return;
    window.currentSettings = s;
    const grid = document.getElementById('profile-grid');
    const spotlight = document.getElementById('profile-active-spotlight');
    if (!grid) return;

    const profiles = s.profiles || [];
    const profilesData = s.profilesData || {};
    const curId = s.currentProfileId || 'default';
    const activeProf = profiles.find(p => p.id === curId) || profiles[0] || { id: 'default', name: 'Personal', icon: 'fa-user', color: '#09f0a0' };

    const activeBookmarks = (s.bookmarks || []);
    const activeHistory = (s.history || []);
    const activeColor = activeProf.color || s.accentColor || '#09f0a0';

    // 1. Update Dot-Matrix Stats Bar & Badges
    const statCount = document.getElementById('profile-stat-count');
    const statPartition = document.getElementById('profile-stat-partition');
    const statBookmarks = document.getElementById('profile-stat-bookmarks');
    const countBadge = document.getElementById('profiles-count-badge');

    if (statCount) statCount.textContent = profiles.length.toString();
    if (statPartition) statPartition.textContent = `persist:profile_${curId}`;
    if (countBadge) countBadge.textContent = `${profiles.length} Node${profiles.length === 1 ? '' : 's'}`;

    if (statBookmarks) {
        let totalBm = 0;
        profiles.forEach(p => {
            const pData = profilesData[p.id];
            if (p.id === curId) totalBm += activeBookmarks.length;
            else if (pData && Array.isArray(pData.bookmarks)) totalBm += pData.bookmarks.length;
        });
        statBookmarks.textContent = totalBm.toString();
    }

    // 2. Render Active Profile Hero Spotlight Card (Home Page .sp-card-green-grad style)
    if (spotlight) {
        const safeActiveName = (activeProf.name || 'Personal').replace(/'/g, "\\'");
        const spotlightHtml = `
            <div class="sp-profile-spotlight-content">
                <div class="sp-profile-left">
                    <div class="sp-profile-avatar-giant">
                        <i class="fas ${activeProf.icon || 'fa-user'}"></i>
                        <div class="sp-pulse-ring">
                            <div class="sp-pulse-center"></div>
                        </div>
                    </div>
                    <div class="sp-profile-info-block">
                        <div class="sp-profile-badge-row">
                            <span class="sp-badge sp-badge-lime">ACTIVE IDENTITY NODE</span>
                            <span class="sp-profile-partition-tag"><i class="fas fa-cube"></i> persist:profile_${activeProf.id}</span>
                        </div>
                        <h2 class="sp-profile-active-title">${activeProf.name}</h2>
                        <p class="sp-profile-active-desc">Sandboxed session envelope with isolated cookies, localStorage, and scoped bookmarks.</p>
                    </div>
                </div>

                <div class="sp-profile-metrics-bar">
                    <div class="sp-profile-metric-item">
                        <div class="sp-dot-num sp-metric-num">${activeBookmarks.length}</div>
                        <span class="sp-metric-label">Bookmarks</span>
                    </div>
                    <div class="sp-profile-metric-divider"></div>
                    <div class="sp-profile-metric-item">
                        <div class="sp-dot-num sp-metric-num">${activeHistory.length}</div>
                        <span class="sp-metric-label">History Logs</span>
                    </div>
                    <div class="sp-profile-metric-divider"></div>
                    <div class="sp-profile-actions-stack">
                        <button type="button" class="sp-btn-hero primary" onclick="event.stopPropagation(); window.editProfilePrompt('${activeProf.id}')">
                            <i class="fas fa-pen"></i> <span>Edit Profile</span>
                        </button>
                        <button type="button" class="sp-btn-hero secondary" onclick="event.stopPropagation(); window.clearProfilePrompt('${activeProf.id}', '${safeActiveName}')">
                            <i class="fas fa-broom"></i> <span>Clear Cache</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        if (spotlight.dataset.lastProfId !== activeProf.id || spotlight.innerHTML.length < 50) {
            spotlight.innerHTML = spotlightHtml;
            spotlight.dataset.lastProfId = activeProf.id;
        }
    }

    // 3. Render Profile Nodes Bento Grid (Home Page Bento Cards - Wide Rectangle)
    let html = profiles.map((p) => {
        const isActive = curId === p.id;
        const pData = profilesData[p.id] || {};
        const pBookmarks = isActive ? activeBookmarks : (pData.bookmarks || []);
        const pHistory = isActive ? activeHistory : (pData.history || []);
        const pColor = p.color || (isActive ? activeColor : '#09f0a0');
        const safeName = (p.name || 'Profile').replace(/'/g, "\\'");

        return `
        <div class="profile-node-card ${isActive ? 'is-active' : ''}" 
             style="--node-accent: ${pColor}; cursor: ${isActive ? 'default' : 'pointer'};"
             ${isActive ? '' : `onclick="window.switchProfile('${p.id}')"`}>
            
            <div class="node-top-bar">
                <div class="node-identity-left">
                    <div class="node-avatar-box" style="background: color-mix(in srgb, ${pColor} 14%, transparent); color: ${pColor}; border: 1px solid color-mix(in srgb, ${pColor} 28%, transparent);">
                        <i class="fas ${p.icon || 'fa-user'}"></i>
                    </div>
                    <div class="node-identity-section">
                        <h4 class="node-profile-title" title="${p.name}">${p.name}</h4>
                        <div class="node-profile-subtitle">
                            ${isActive ? '<span class="node-status-text active">Active Workspace Node</span>' : '<span class="node-status-text">Isolated Sandbox Node</span>'}
                        </div>
                    </div>
                </div>
                <div class="node-top-badges">
                    ${isActive ? '<span class="node-active-pill"><span class="node-live-dot"></span> ACTIVE</span>' : '<span class="node-standby-pill">ISOLATED</span>'}
                    <span class="profile-meta-pill partition-pill" title="Partition Isolation: persist:profile_${p.id}">
                        <i class="fas fa-cube"></i> persist:${p.id}
                    </span>
                </div>
            </div>

            <div class="profile-node-pills">
                <span class="profile-meta-pill">
                    <i class="fas fa-bookmark"></i> ${pBookmarks.length} Bookmarks
                </span>
                <span class="profile-meta-pill">
                    <i class="fas fa-clock-rotate-left"></i> ${pHistory.length} History Logs
                </span>
                <span class="profile-meta-pill">
                    <i class="fas fa-shield-halved"></i> Sandboxed
                </span>
            </div>

            <div class="profile-node-footer">
                ${!isActive ? `
                <button type="button" class="node-action-btn switch-btn" onclick="event.stopPropagation(); window.switchProfile('${p.id}')" title="Switch to this identity">
                    <i class="fas fa-right-to-bracket"></i> <span>Switch Node</span>
                </button>` : `
                <button type="button" class="node-action-btn active-state-btn" disabled>
                    <i class="fas fa-check"></i> <span>Current Node</span>
                </button>`}
                
                <div class="node-utility-btns">
                    <button type="button" class="node-mini-btn" onclick="event.stopPropagation(); window.editProfilePrompt('${p.id}')" title="Edit Profile Details">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button type="button" class="node-mini-btn" onclick="event.stopPropagation(); window.clearProfilePrompt('${p.id}', '${safeName}')" title="Clear Cookies & Cache">
                        <i class="fas fa-broom"></i>
                    </button>
                    ${p.id !== 'default' ? `
                    <button type="button" class="node-mini-btn danger" onclick="event.stopPropagation(); window.deleteProfile('${p.id}', '${safeName}')" title="Terminate Node">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
            </div>
        </div>
    `;
    }).join('');

    // Append the dashed "+ Create New Profile" Bento card (Wide Landscape Rectangle)
    html += `
        <div class="add-profile-bento-card" onclick="window.createProfilePrompt()">
            <div class="add-node-content-horizontal">
                <div class="add-avatar-circle">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="add-node-text-wrap">
                    <h4 class="add-node-title">Create New Profile</h4>
                    <p class="add-node-desc">Launch an isolated session node with independent login credentials and bookmarks.</p>
                </div>
                <button type="button" class="btn primary add-node-btn" onclick="event.stopPropagation(); window.createProfilePrompt()">
                    <i class="fas fa-plus"></i> <span>New Identity</span>
                </button>
            </div>
        </div>
    `;

    const profileStateKey = `${curId}_${profiles.map(p => `${p.id}:${p.name}:${p.icon}:${p.color}`).join('|')}`;
    if (grid.dataset.stateKey !== profileStateKey || grid.innerHTML.length < 50) {
        grid.innerHTML = html;
        grid.dataset.stateKey = profileStateKey;
    }
}

window.switchProfile = function(id) {
    if (window.electronAPI && window.electronAPI.switchProfile) {
        window.electronAPI.switchProfile(id);
        if (window.currentSettings) {
            window.currentSettings.currentProfileId = id;
            renderProfiles(window.currentSettings);
        }
    } else {
        console.log('Switch profile to:', id);
    }
};

function showModal(contentHtml) {
    const overlay = document.getElementById('studio-modal-overlay');
    const modal = document.getElementById('studio-modal');
    if (!overlay || !modal) return;
    
    modal.innerHTML = contentHtml;
    overlay.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('studio-modal-overlay');
    const modal = document.getElementById('studio-modal');
    if (!overlay || !modal) return;
    
    overlay.classList.remove('active');
    setTimeout(() => {
        if (!overlay.classList.contains('active')) {
            modal.innerHTML = '';
        }
    }, 200);
}

// Close on overlay click
document.getElementById('studio-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'studio-modal-overlay') closeModal();
});

const PROFILE_ICONS = ['fa-user', 'fa-user-ninja', 'fa-user-astronaut', 'fa-user-secret', 'fa-user-tie', 'fa-ghost', 'fa-robot', 'fa-skull', 'fa-crown', 'fa-eye'];

// Live Preview Helper for Profile Modals
window.updateProfileModalPreview = function() {
    const nameInput = document.getElementById('new-profile-name') || document.getElementById('edit-profile-name');
    const titleEl = document.getElementById('sm-preview-profile-title');
    const iconWrapperEl = document.getElementById('sm-preview-profile-icon');
    const color = window._selectedProfileColor || '#09f0a0';
    const icon = window._selectedProfileIcon || 'fa-user';

    if (titleEl && nameInput) {
        titleEl.textContent = nameInput.value.trim() || 'New Profile';
    }
    if (iconWrapperEl) {
        iconWrapperEl.innerHTML = `<i class="fas ${icon}"></i>`;
        iconWrapperEl.style.background = `color-mix(in srgb, ${color} 14%, transparent)`;
        iconWrapperEl.style.color = color;
        iconWrapperEl.style.border = `1px solid color-mix(in srgb, ${color} 28%, transparent)`;
    }
};

window.selectProfileColor = (el, color) => {
    document.querySelectorAll('.profile-color-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    window._selectedProfileColor = color;
    window.updateProfileModalPreview();
};

window.selectProfileIcon = (el, icon) => {
    document.querySelectorAll('.icon-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    window._selectedProfileIcon = icon;
    window.updateProfileModalPreview();
};

function createProfilePrompt() {
    window._selectedProfileIcon = 'fa-user';
    window._selectedProfileColor = '#09f0a0';

    const content = `
        <div class="sm-modal-wrap">
            <div class="sm-header">
                <div class="sm-title">
                    <div class="sm-icon-badge"><i class="fas fa-user-plus"></i></div>
                    <div class="sm-text-group">
                        <h3>Create User Profile</h3>
                        <span>Isolated sandbox session & scoped bookmarks</span>
                    </div>
                </div>
                <button type="button" class="sm-close-btn" onclick="window.closeModal()" title="Close"><i class="fas fa-times"></i></button>
            </div>

            <div class="sm-body">
                <!-- Live Interactive Preview Card matching Home Page -->
                <div class="sm-preview-card">
                    <div class="sm-preview-left">
                        <div class="sm-preview-tile-icon" id="sm-preview-profile-icon" style="background: color-mix(in srgb, #09f0a0 14%, transparent); color: #09f0a0; border: 1px solid color-mix(in srgb, #09f0a0 28%, transparent);">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="sm-preview-details">
                            <h4 id="sm-preview-profile-title">New Profile</h4>
                            <span>persist:profile_[auto]</span>
                        </div>
                    </div>
                    <div class="sm-preview-badge">
                        <i class="fas fa-shield-halved"></i>
                        <span>SANDBOXED</span>
                    </div>
                </div>

                <!-- Profile Name Input -->
                <div class="sm-field-group">
                    <label for="new-profile-name">Profile Alias / Workspace</label>
                    <div class="sm-input-wrap">
                        <i class="fas fa-pen-to-square sm-input-icon"></i>
                        <input type="text" id="new-profile-name" placeholder="e.g. Work, Personal, Gaming..." autocomplete="off" spellcheck="false" oninput="window.updateProfileModalPreview()">
                    </div>
                </div>

                <!-- Accent Color Swatches -->
                <div class="sm-field-group">
                    <label>Accent Color</label>
                    <div class="profile-color-selector-grid" id="profile-color-selector">
                        ${PROFILE_PALETTE.map(pal => `
                            <div class="profile-color-chip ${pal.color === '#09f0a0' ? 'active' : ''}" 
                                 onclick="window.selectProfileColor(this, '${pal.color}')" 
                                 style="background:${pal.color};" 
                                 title="${pal.name}"></div>
                        `).join('')}
                    </div>
                </div>

                <!-- Profile Avatar Icon Grid -->
                <div class="sm-field-group">
                    <label>Profile Avatar Icon</label>
                    <div class="icon-selector-grid" id="icon-selector">
                        ${PROFILE_ICONS.map(icon => `
                            <div class="icon-chip ${icon === 'fa-user' ? 'active' : ''}" onclick="window.selectProfileIcon(this, '${icon}')">
                                <i class="fas ${icon}"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="sm-footer">
                <button type="button" class="sm-cancel-btn" onclick="window.closeModal()">Cancel</button>
                <button type="button" class="sm-save-btn" onclick="window.confirmCreateProfile()">
                    <i class="fas fa-plus"></i>
                    <span>Create Profile</span>
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
}

async function confirmCreateProfile() {
    const nameInput = document.getElementById('new-profile-name');
    const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'New Profile';
    const icon = window._selectedProfileIcon || 'fa-user';
    const color = window._selectedProfileColor || '#09f0a0';
    
    closeModal();
    if (window.electronAPI && window.electronAPI.createProfile) {
        await window.electronAPI.createProfile({ name, icon, color });
        if (window.electronAPI.getSettings) {
            const s = await window.electronAPI.getSettings();
            if (s) {
                window.currentSettings = s;
                renderProfiles(s);
            }
        }
    }
}

async function editProfilePrompt(id) {
    if (!window.currentSettings) {
        if (window.electronAPI && window.electronAPI.getSettings) {
            window.currentSettings = await window.electronAPI.getSettings();
        }
    }
    const profiles = (window.currentSettings && window.currentSettings.profiles) || [{ id: 'default', name: 'Personal', icon: 'fa-user', color: '#09f0a0' }];
    const profile = profiles.find(p => p.id === id) || profiles[0] || { id, name: 'Personal', icon: 'fa-user', color: '#09f0a0' };
    
    window._selectedProfileIcon = profile.icon || 'fa-user';
    window._selectedProfileColor = profile.color || '#09f0a0';
    
    const content = `
        <div class="sm-modal-wrap">
            <div class="sm-header">
                <div class="sm-title">
                    <div class="sm-icon-badge"><i class="fas fa-user-pen"></i></div>
                    <div class="sm-text-group">
                        <h3>Modify Profile Node</h3>
                        <span>Update identity parameters & visual theme</span>
                    </div>
                </div>
                <button type="button" class="sm-close-btn" onclick="window.closeModal()" title="Close"><i class="fas fa-times"></i></button>
            </div>

            <div class="sm-body">
                <!-- Live Interactive Preview Card matching Home Page -->
                <div class="sm-preview-card">
                    <div class="sm-preview-left">
                        <div class="sm-preview-tile-icon" id="sm-preview-profile-icon" style="background: color-mix(in srgb, ${window._selectedProfileColor} 14%, transparent); color: ${window._selectedProfileColor}; border: 1px solid color-mix(in srgb, ${window._selectedProfileColor} 28%, transparent);">
                            <i class="fas ${window._selectedProfileIcon}"></i>
                        </div>
                        <div class="sm-preview-details">
                            <h4 id="sm-preview-profile-title">${profile.name}</h4>
                            <span>persist:profile_${id}</span>
                        </div>
                    </div>
                    <div class="sm-preview-badge">
                        <i class="fas fa-cube"></i>
                        <span>NODE ${id}</span>
                    </div>
                </div>

                <!-- Profile Name Input -->
                <div class="sm-field-group">
                    <label for="edit-profile-name">Profile Alias / Workspace</label>
                    <div class="sm-input-wrap">
                        <i class="fas fa-pen-to-square sm-input-icon"></i>
                        <input type="text" id="edit-profile-name" value="${profile.name}" autocomplete="off" spellcheck="false" oninput="window.updateProfileModalPreview()">
                    </div>
                </div>

                <!-- Accent Color Swatches -->
                <div class="sm-field-group">
                    <label>Accent Color</label>
                    <div class="profile-color-selector-grid" id="profile-color-selector">
                        ${PROFILE_PALETTE.map(pal => `
                            <div class="profile-color-chip ${pal.color === (profile.color || '#09f0a0') ? 'active' : ''}" 
                                 onclick="window.selectProfileColor(this, '${pal.color}')" 
                                 style="background:${pal.color};" 
                                 title="${pal.name}"></div>
                        `).join('')}
                    </div>
                </div>

                <!-- Profile Avatar Icon Grid -->
                <div class="sm-field-group">
                    <label>Profile Avatar Icon</label>
                    <div class="icon-selector-grid" id="icon-selector">
                        ${PROFILE_ICONS.map(icon => `
                            <div class="icon-chip ${icon === window._selectedProfileIcon ? 'active' : ''}" onclick="window.selectProfileIcon(this, '${icon}')">
                                <i class="fas ${icon}"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="sm-footer">
                <button type="button" class="sm-cancel-btn" onclick="window.closeModal()">Cancel</button>
                <button type="button" class="sm-save-btn" onclick="window.confirmEditProfile('${id}')">
                    <i class="fas fa-check"></i>
                    <span>Save Changes</span>
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
}

async function confirmEditProfile(id) {
    const nameInput = document.getElementById('edit-profile-name');
    const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'Profile';
    const icon = window._selectedProfileIcon || 'fa-user';
    const color = window._selectedProfileColor || '#09f0a0';
    
    closeModal();
    if (window.electronAPI && window.electronAPI.editProfile) {
        window.electronAPI.editProfile({ id, name, icon, color });
        if (window.currentSettings && window.currentSettings.profiles) {
            const p = window.currentSettings.profiles.find(x => x.id === id);
            if (p) {
                p.name = name;
                p.icon = icon;
                p.color = color;
                renderProfiles(window.currentSettings);
            }
        }
    }
}

async function clearProfilePrompt(id, name) {
    const content = `
        <div class="sm-modal-wrap">
            <div class="sm-header">
                <div class="sm-title">
                    <div class="sm-icon-badge warning"><i class="fas fa-broom"></i></div>
                    <div class="sm-text-group">
                        <h3>Clear Profile Storage</h3>
                        <span>Flush isolated cache and session cookies</span>
                    </div>
                </div>
                <button type="button" class="sm-close-btn" onclick="window.closeModal()" title="Close"><i class="fas fa-times"></i></button>
            </div>

            <div class="sm-body">
                <p style="color:var(--text-dim); font-size:13px; line-height:1.5; margin:0;">
                    This will clear all session tokens, cookies, and browsing logs for <strong>${name}</strong> (partition: <code>persist:profile_${id}</code>). Saved bookmarks and node configurations will be preserved.
                </p>
            </div>

            <div class="sm-footer">
                <button type="button" class="sm-cancel-btn" onclick="window.closeModal()">Cancel</button>
                <button type="button" class="sm-save-btn" onclick="window.confirmClearProfile('${id}')">
                    <i class="fas fa-broom"></i>
                    <span>Clear Storage</span>
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
}

async function confirmClearProfile(id) {
    closeModal();
    if (window.electronAPI && window.electronAPI.clearProfileData) {
        window.electronAPI.clearProfileData(id);
    }
}

async function deleteProfile(id, name) {
    const content = `
        <div class="sm-modal-wrap">
            <div class="sm-header">
                <div class="sm-title">
                    <div class="sm-icon-badge danger"><i class="fas fa-triangle-exclamation"></i></div>
                    <div class="sm-text-group">
                        <h3>Terminate Profile Node?</h3>
                        <span>Permanent identity & partition deletion</span>
                    </div>
                </div>
                <button type="button" class="sm-close-btn" onclick="window.closeModal()" title="Close"><i class="fas fa-times"></i></button>
            </div>

            <div class="sm-body">
                <p style="color:var(--text-dim); font-size:13px; line-height:1.5; margin:0;">
                    This action is irreversible. It will permanently delete the <strong>${name}</strong> workspace and wipe all localized cookies, history, and profile bookmarks.
                </p>
            </div>

            <div class="sm-footer">
                <button type="button" class="sm-cancel-btn" onclick="window.closeModal()">Cancel</button>
                <button type="button" class="sm-save-btn danger" onclick="window.confirmDeleteProfile('${id}')">
                    <i class="fas fa-trash"></i>
                    <span>Delete Permanently</span>
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
}

function confirmDeleteProfile(id) {
    closeModal();
    if (window.electronAPI && window.electronAPI.deleteProfile) {
        window.electronAPI.deleteProfile(id);
        if (window.currentSettings && window.currentSettings.profiles) {
            window.currentSettings.profiles = window.currentSettings.profiles.filter(x => x.id !== id);
            renderProfiles(window.currentSettings);
        }
    }
}

// Explicitly bind all modal and action functions to window
window.showModal = showModal;
window.closeModal = closeModal;
window.createProfilePrompt = createProfilePrompt;
window.confirmCreateProfile = confirmCreateProfile;
window.editProfilePrompt = editProfilePrompt;
window.confirmEditProfile = confirmEditProfile;
window.clearProfilePrompt = clearProfilePrompt;
window.confirmClearProfile = confirmClearProfile;
window.deleteProfile = deleteProfile;
window.confirmDeleteProfile = confirmDeleteProfile;

// History Clear
const clearBtn = document.getElementById('clear-data-btn');
if (clearBtn) {
    clearBtn.onclick = () => {
        clearBtn.innerText = 'Clearing...';
        window.electronAPI.send('clear-history');
        setTimeout(() => clearBtn.innerText = 'History Cleared', 800);
        setTimeout(() => { if (clearBtn) clearBtn.innerHTML = '<i class="fas fa-trash-can"></i> Clear History'; }, 2500);
    };
}

const clearBmsBtn = document.getElementById('clear-bookmarks-btn');
if (clearBmsBtn) {
    clearBmsBtn.onclick = () => {
        clearBmsBtn.innerText = 'Blowing up...';
        window.electronAPI.clearBookmarks();
        setTimeout(() => clearBmsBtn.innerText = 'Wiped!', 800);
        setTimeout(() => { if (clearBmsBtn) clearBmsBtn.innerHTML = '<i class="fas fa-bookmark"></i> Clear Bookmarks'; }, 2500);
    };
}

// Current Version & Updates
let currentVer = '0.0.0';

const populateReleaseNotes = (version, notesHtml) => {
    const notesEl = document.getElementById('update-notes');
    const catalogTag = document.getElementById('catalog-ver-tag');
    if (notesEl) notesEl.innerHTML = notesHtml;
    if (catalogTag) catalogTag.textContent = `v${version}`;
};

const formatGitHubMarkdown = (markdown) => {
    if (!markdown) return '';
    
    return `<div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim); white-space: pre-wrap; line-height: 1.6;">` + 
        markdown
        .replace(/^##\s+(.*)/gm, '<div style="font-family: var(--font-title); font-size: 13.5px; font-weight: 800; color: var(--accent); margin-top: 12px; margin-bottom: 6px;">$1</div>')
        .replace(/^###\s+(.*)/gm, '<div style="font-family: var(--font-title); font-size: 12.5px; font-weight: 700; color: var(--text); margin-top: 10px; margin-bottom: 4px;">$1</div>')
        .replace(/^\*\s+(.*)/gm, '<div style="margin-left: 8px;">• $1</div>')
        .replace(/^- \s+(.*)/gm, '<div style="margin-left: 8px;">• $1</div>')
        .replace(/`([^`]+)`/g, '<code style="background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); padding: 1px 5px; border-radius: 4px;">$1</code>') +
        `</div>`;
};

const currentVersionHighlights = `
    <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim); white-space: pre-wrap; line-height: 1.6;">
<div style="font-family: var(--font-title); font-size: 14px; font-weight: 800; color: var(--accent); margin-bottom: 8px;">OCAL BROWSER v7.9.00 STABLE</div>
<div style="color: var(--text); font-weight: 700; margin-bottom: 12px;">Release Highlights & Mega Update</div>

<div style="font-family: var(--font-title); font-size: 12.5px; font-weight: 700; color: var(--accent); margin-top: 10px; margin-bottom: 4px;">🚀 New Features & UI Enhancements</div>
• 500% Volume Booster: Integrated an advanced volume boosting extension allowing users to safely amplify media up to 500% directly within the browser.
• Intelligent Sidebar Theming: Redesigned the sidebar social panel to match the selected theme mode perfectly.
• Refined Aesthetics: Removed distracting zoom-in scaling effects on navigation and address bar buttons for a sleek, responsive experience.
• Improved UI Controls: Standardized close button alignments and tab navigation interactions across all views.

<div style="font-family: var(--font-title); font-size: 12.5px; font-weight: 700; color: var(--accent); margin-top: 12px; margin-bottom: 4px;">🛠️ Bug Fixes & Reliability</div>
• Native In-App PDF Printing: Fixed PDF printing to handle documents completely natively inside Ocal Browser.
• PDF Print Preview Support: Enabled Chrome-style print preview dialogs for PDF documents.
    </div>
`;

const syncReleaseCatalogWithGitHub = async (v) => {
    try {
        const response = await fetch('https://api.github.com/repos/neelkanth-patel26/Ocal-Browser/releases/latest');
        if (!response.ok) throw new Error('API Rate Limit');
        const data = await response.json();
        
        let htmlContent = `<p style="margin-top: 0; color: var(--text); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${data.name}</p>`;
        htmlContent += `<div style="font-size: 12px; color: var(--text-dim); line-height: 1.6;">${formatGitHubMarkdown(data.body)}</div>`;
        
        populateReleaseNotes(data.tag_name.replace('v', ''), htmlContent);
        console.log('GitHub Release Sync: Success');
    } catch (err) {
        console.log('GitHub Release Sync: Falling back to local manifest');
        populateReleaseNotes(v, currentVersionHighlights);
    }
};

window.electronAPI.getAppVersion().then(v => {
    currentVer = v;

    // Version chip in About hero & header
    const disp = document.getElementById('current-version-display');
    if (disp) disp.textContent = `v${v} Stable`;

    const chip = document.getElementById('current-version-chip');
    if (chip) chip.textContent = `v${v}`;

    // Diag cells
    const diagVer = document.getElementById('diag-version');
    if (diagVer) diagVer.textContent = `Chromium v134.0`;

    const buildEl = document.getElementById('diag-build');
    if (buildEl) buildEl.textContent = `Runtime v35.0.0`;

    // Build line under version chip
    const buildLine = document.getElementById('about-build-line');
    if (buildLine) buildLine.innerHTML = `<i class="fas fa-cube"></i> Production Build`;

    // Initialize Catalog (Live Sync)
    syncReleaseCatalogWithGitHub(v);

    // Sidebar footer — show version dynamically
    const sidebarVer = document.getElementById('sidebar-version-label');
    if (sidebarVer) sidebarVer.textContent = `v${v} · Up to date`;
});

const updateBtn      = document.getElementById('update-check-btn');
const downloadBtn    = document.getElementById('download-update-btn');
const updateHub      = document.getElementById('update-dashboard');
const updateStatusT  = document.getElementById('update-status-title');
const updateStatusD  = document.getElementById('update-status-desc');
const updateStatusI  = document.getElementById('update-status-icon');
const updateExpanded = document.getElementById('update-info-expanded');

if (updateBtn) {
    updateBtn.onclick = async () => {
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SEARCHING...';
        updateHub.classList.add('scanning');
        updateStatusD.innerText = "Scanning Ocal network for updates...";

        try {
            // Artificial delay to make it feel deliberate
            await sleep(2500);

            const latest = await Promise.race([
                window.electronAPI.checkForUpdate(),
                new Promise(resolve => setTimeout(() => resolve(null), 15000))
            ]);
            updateHub.classList.remove('scanning');
            
            console.log('Update Check:', {
                currentVersion: currentVer,
                latestVersion: latest ? latest.version : 'none'
            });
            
            if (latest && isNewerVersion(latest.version, currentVer)) {
                showUpdateInfo(latest);
            } else {
                updateHub.classList.add('up-to-date');
                updateStatusT.innerText = "System Up to Date";
                updateStatusD.innerText = "You are running the latest production build of Ocal.";
                updateStatusI.className = "fas fa-check-double";
                updateStatusI.style.color = ""; 
                updateStatusI.style.opacity = "";
                
                updateBtn.innerHTML = 'Up to Date <i class="fas fa-check-circle"></i>';
                updateBtn.classList.remove('primary');
                updateBtn.classList.add('success');
                
                setTimeout(() => { 
                    updateHub.classList.remove('up-to-date');
                    updateStatusT.innerText = "System Check";
                    updateStatusD.innerText = "Scanning for new dimensions of Ocal.";
                    updateStatusI.className = "fas fa-shield-check";
                    updateStatusI.style.color = ""; 
                    updateStatusI.style.opacity = "0.5";
                    updateBtn.innerHTML = 'Check for Update <i class="fas fa-bolt"></i>';
                    updateBtn.classList.remove('success');
                    updateBtn.classList.add('primary');
                    updateBtn.disabled = false;
                }, 5000);
            }
        } catch(e) { 
            updateHub.classList.remove('scanning');
            updateStatusT.innerText = "Check Failed";
            updateStatusD.innerText = "Unable to check for updates. Please try again later.";
            updateBtn.innerHTML = 'Error checking'; 
            updateBtn.disabled = false; 
            console.error('Update check error:', e);
            
            // Reset after 5 seconds
            setTimeout(() => {
                updateStatusT.innerText = "System Check";
                updateStatusD.innerText = "Scanning for new dimensions of Ocal.";
                updateBtn.innerHTML = 'Check for Update <i class="fas fa-bolt"></i>';
                updateBtn.disabled = false;
            }, 5000);
        }
    };
}

function isNewerVersion(latest, current) {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
        const ln = l[i] || 0;
        const cn = c[i] || 0;
        if (ln > cn) return true;
        if (ln < cn) return false;
    }
    return false;
}

// Initialize from Hash
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'whatsnew') {
        window.electronAPI.newTab('ocal://whats-new');
        showSection('search');
        return;
    }
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else {
        showSection('search');
    }
});

function showUpdateInfo(latest) {
    updateStatusT.innerText = "New Update Available";
    updateStatusD.innerText = `Ocal v${latest.version} is now ready for deployment.`;
    updateStatusI.className = "fas fa-cloud-arrow-down";
    updateStatusI.style.color = "var(--accent)";
    updateStatusI.style.opacity = "1";

    updateExpanded.style.setProperty('display', 'block', 'important');
    
    // Build update catalog notes
    const formattedNotes = `
        <p style="margin-top: 0; color: #fff; font-weight: 700;">What's New in v${latest.version}:</p>
        <ul style="padding-left: 20px; list-style-type: disc;">
            ${latest.notes.split('\n').filter(l => l.trim()).map(l => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')}
        </ul>
        <p style="margin-bottom: 0;">Verified and published via GNS-Cloud Secure Delivery.</p>
    `;
    populateReleaseNotes(latest.version, formattedNotes);
    
    updateBtn.style.display = 'none';
    downloadBtn.style.display = 'flex';

    downloadBtn.onclick = async () => {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CONNECTING...';
        
        const progWrapper = document.getElementById('update-progress-wrapper');
        const fill = document.getElementById('update-progress-fill');
        const pText = document.getElementById('update-progress-percent');
        if (progWrapper) progWrapper.style.display = 'block';
        if (fill) fill.style.width = '2%';
        if (pText) pText.innerText = '0%';
        
        try {
            const path = await window.electronAPI.downloadUpdate();
            
            if (fill) fill.style.width = '100%';
            if (pText) pText.innerText = '100% (Ready to Install)';
            
            downloadBtn.innerHTML = 'RESTART TO UPDATE <i class="fas fa-power-off"></i>';
            downloadBtn.style.background = 'var(--accent)';
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => window.electronAPI.applyUpdate(path);
        } catch(err) {
            downloadBtn.innerHTML = '<i class="fas fa-triangle-exclamation"></i> DOWNLOAD FAILED';
            downloadBtn.disabled = false;
            if (pText) pText.innerText = 'Download failed';
        }
    };
}

if (window.electronAPI && window.electronAPI.onUpdateProgress) {
    window.electronAPI.onUpdateProgress(data => {
        const progWrapper = document.getElementById('update-progress-wrapper');
        const fill = document.getElementById('update-progress-fill');
        const pText = document.getElementById('update-progress-percent');
        const p = Math.max(0, Math.min(100, Math.round(data.percent || 0)));
        
        if (progWrapper) progWrapper.style.display = 'block';
        if (fill) fill.style.width = Math.max(2, p) + '%';
        if (pText) {
            if (data.loaded && data.total && data.total !== '?') {
                pText.innerText = `${p}% (${data.loaded} MB / ${data.total} MB)`;
            } else {
                pText.innerText = `${p}%`;
            }
        }
        const dlBtn = document.getElementById('download-update-btn');
        if (dlBtn && dlBtn.disabled) {
            dlBtn.innerHTML = `<i class="fas fa-cloud-arrow-down fa-bounce"></i> DOWNLOADING... ${p}%`;
        }
    });
}

// Initialize Settings
window.electronAPI.getSettings().then(s => {
    if (s.themeMode) applyTheme(s.themeMode);
    else localStorage.setItem('ocal-settings-theme', 'dark'); // Default fallback
    
    if (s.accentColor) applyAccent(s.accentColor);
    renderHomepageSettings(s);
    renderAISettings(s);
    renderSystemSettings(s);
    setGridValue('search-grid', s.searchEngine || 'google');
    setGridValue('dns-grid', s.dns || 'default');
    
    // 1. Compact Workspace Density Toggle
    const compactToggle = document.getElementById('compact-toggle');
    if (compactToggle) {
        const isCompact = !!(s.compactWorkspace || s.compactMode);
        compactToggle.classList.toggle('on', isCompact);
        compactToggle.onclick = () => {
            const newState = !compactToggle.classList.contains('on');
            compactToggle.classList.toggle('on', newState);
            window.electronAPI.updateSetting('compactWorkspace', newState);
            window.electronAPI.updateSetting('compactMode', newState);
            document.body.classList.toggle('compact-density', newState);
            document.documentElement.classList.toggle('compact-density', newState);
        };
    }

    // 2. Dark Theme Toggle
    const themeToggle = document.getElementById('theme-mode-toggle');
    if (themeToggle) {
        const isDark = (s.themeMode || 'dark') === 'dark';
        themeToggle.classList.toggle('on', isDark);
        themeToggle.onclick = () => {
            const newState = !themeToggle.classList.contains('on');
            themeToggle.classList.toggle('on', newState);
            const newTheme = newState ? 'dark' : 'light';
            window.electronAPI.updateSetting('themeMode', newTheme);
            applyTheme(newTheme);
        };
    }

    // 3. Bookmarks Bar Toggle
    const bmToggle = document.getElementById('bookmarks-bar-toggle');
    if (bmToggle) {
        bmToggle.classList.toggle('on', s.bookmarkBarMode === 'always');
        bmToggle.onclick = () => {
            const newState = !bmToggle.classList.contains('on');
            bmToggle.classList.toggle('on', newState);
            window.electronAPI.updateSetting('bookmarkBarMode', newState ? 'always' : 'never');
        };
    }

    // 4. Live News / Weather Hub Toggle
    const newsToggle = document.getElementById('show-news-toggle');
    if (newsToggle) {
        const isShowNews = s.showNewsHub !== false;
        newsToggle.classList.toggle('on', isShowNews);
        newsToggle.onclick = () => {
            const newState = !newsToggle.classList.contains('on');
            newsToggle.classList.toggle('on', newState);
            window.electronAPI.updateSetting('showNewsHub', newState);
            localStorage.setItem('ocal-show-news', newState ? 'true' : 'false');
        };
    }

    // 5. Instant Autocomplete Suggestions Toggle
    const instantToggle = document.getElementById('instant-search-toggle');
    if (instantToggle) {
        const isInstant = s.instantSearchEnabled !== false;
        instantToggle.classList.toggle('on', isInstant);
        instantToggle.onclick = () => {
            const newState = !instantToggle.classList.contains('on');
            instantToggle.classList.toggle('on', newState);
            window.electronAPI.updateSetting('instantSearchEnabled', newState);
        };
    }

    // 6. Safe Search Toggle
    const safeToggle = document.getElementById('safe-search-toggle');
    if (safeToggle) {
        const isSafe = !!s.safeSearchEnabled;
        safeToggle.classList.toggle('on', isSafe);
        safeToggle.onclick = () => {
            const newState = !safeToggle.classList.contains('on');
            safeToggle.classList.toggle('on', newState);
            window.electronAPI.updateSetting('safeSearchEnabled', newState);
        };
    }

    const forceHideToggle = document.getElementById('force-hide-sidebar-toggle');
    if (forceHideToggle) {
        forceHideToggle.checked = (s.forceHideSidebar !== undefined) ? s.forceHideSidebar : true;
        forceHideToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            window.electronAPI.updateSetting('forceHideSidebar', enabled);
            if (enabled) {
                window.electronAPI.updateSetting('sidebarMode', 'hidden');
                setGridValue('sidebar-mode-grid', 'hidden');
            }
        });
    }

    setGridValue('sidebar-mode-grid', s.sidebarMode || 'hidden');
    setGridValue('sidebar-app-width-grid', s.sidebarAppWidth ? String(s.sidebarAppWidth) : '880');
    setGridValue('tile-style-grid', s.homeTileStyle || 'glass-array');
    setGridValue('theme-mode-grid', s.themeMode || 'dark');
    
    // Tab Layout & Vertical Tabs
    setGridValue('tab-layout-grid', s.tabLayout || 'horizontal');
    setGridValue('vt-width-grid', s.verticalTabsWidth ? String(s.verticalTabsWidth) : '240');

    initGridSelector('tab-layout-grid', 'tabLayout');
    initGridSelector('vt-width-grid', 'verticalTabsWidth', (val) => parseInt(val, 10));

    const vtCollapseToggle = document.getElementById('vertical-tabs-collapsed-toggle');
    if (vtCollapseToggle) {
        vtCollapseToggle.checked = !!s.verticalTabsCollapsed;
        vtCollapseToggle.addEventListener('change', (e) => {
            window.electronAPI.updateSetting('verticalTabsCollapsed', e.target.checked);
        });
    }

    initGridSelector('search-grid', 'searchEngine');
    initGridSelector('dns-grid', 'dns');
    initGridSelector('sidebar-mode-grid', 'sidebarMode');
    initGridSelector('sidebar-app-width-grid', 'sidebarAppWidth');
    initGridSelector('tile-style-grid', 'homeTileStyle');
    initGridSelector('theme-mode-grid', 'themeMode');

    if (s.homeLayout) window.updateHomeLayout(s.homeLayout, true);
    if (s.homeTileStyle) setGridValue('tile-style-grid', s.homeTileStyle);

    // Initialize tile style radio buttons
    const tileStyleRadios = document.querySelectorAll('input[name="tile-style"]');
    let initialTileStyle = s.homeTileStyle || 'glass-array';
    if (initialTileStyle === 'square' || initialTileStyle === 'rectangle' || initialTileStyle === 'monochrome') {
        initialTileStyle = 'glass-array';
    }
    tileStyleRadios.forEach(radio => {
        if (radio.dataset.value === initialTileStyle) {
            radio.checked = true;
        }
        radio.addEventListener('change', () => {
            if (radio.checked) {
                window.electronAPI.updateSetting('homeTileStyle', radio.dataset.value);
            }
        });
    });

    document.querySelectorAll('.toggle').forEach(t => {
        if (!t.onclick) {
            t.onclick = () => t.classList.toggle('on');
        }
    });
    
    if (s.homeTileSize) window.updateHomeSetting('homeTileSize', s.homeTileSize, true);
    if (s.homeTileSpacing) window.updateHomeSetting('homeTileSpacing', s.homeTileSpacing, true);
    
    // Weather Location Setting Handler
    const weatherCityInput = document.getElementById('settings-weather-city-input');
    const saveWeatherBtn = document.getElementById('save-weather-city-btn');
    const autoWeatherBtn = document.getElementById('auto-weather-city-btn');

    if (weatherCityInput) {
        const savedLoc = localStorage.getItem('ocal-weather-loc') || s.weatherLocation || '';
        weatherCityInput.value = savedLoc;

        const saveLoc = () => {
            const newLoc = weatherCityInput.value.trim();
            if (newLoc) {
                localStorage.setItem('ocal-weather-loc', newLoc);
                if (window.electronAPI && window.electronAPI.updateSetting) {
                    window.electronAPI.updateSetting('weatherLocation', newLoc);
                }
                if (saveWeatherBtn) {
                    const originalText = saveWeatherBtn.innerHTML;
                    saveWeatherBtn.innerHTML = `<i class="fas fa-check" style="margin-right: 6px; color: var(--accent);"></i> Saved!`;
                    setTimeout(() => { saveWeatherBtn.innerHTML = originalText; }, 1800);
                }
            } else {
                localStorage.removeItem('ocal-weather-loc');
                if (window.electronAPI && window.electronAPI.updateSetting) {
                    window.electronAPI.updateSetting('weatherLocation', '');
                }
            }
        };

        if (saveWeatherBtn) saveWeatherBtn.onclick = saveLoc;
        weatherCityInput.onkeydown = (e) => { if (e.key === 'Enter') saveLoc(); };

        if (autoWeatherBtn) {
            autoWeatherBtn.onclick = () => {
                localStorage.removeItem('ocal-weather-loc');
                weatherCityInput.value = '';
                if (window.electronAPI && window.electronAPI.updateSetting) {
                    window.electronAPI.updateSetting('weatherLocation', '');
                }
                const originalText = autoWeatherBtn.innerHTML;
                autoWeatherBtn.innerHTML = `<i class="fas fa-check" style="margin-right: 6px; color: var(--accent);"></i> Auto GPS!`;
                setTimeout(() => { autoWeatherBtn.innerHTML = originalText; }, 1800);
            };
        }
    }
    
    initToggle('show-news-toggle', 'showNewsHub', s.showNewsHub !== false);
    
    renderSecuritySettings(s);
    initDNSGrid();
    
    window.currentSettings = s;
    renderProfiles(s);
    renderExtensions(s);
    
    renderSearchSettings(s);
    setupSearchEngineCardListeners();
    
    // AI Assistant Settings
    const aiKeyInp = document.getElementById('ai-api-key-input');
    if (aiKeyInp) {
        aiKeyInp.value = s.aiApiKey || '';
        aiKeyInp.onchange = () => window.electronAPI.updateSetting('aiApiKey', aiKeyInp.value);
    }

    const openaiKeyInp = document.getElementById('openai-api-key-input');
    if (openaiKeyInp) {
        openaiKeyInp.value = s.openaiApiKey || '';
        openaiKeyInp.onchange = () => window.electronAPI.updateSetting('openaiApiKey', openaiKeyInp.value);
    }

    const customEndpointInp = document.getElementById('custom-endpoint-input');
    if (customEndpointInp) {
        customEndpointInp.value = s.customEndpoint || '';
        customEndpointInp.onchange = () => window.electronAPI.updateSetting('customEndpoint', customEndpointInp.value);
    }

    const customModelInp = document.getElementById('custom-model-input');
    if (customModelInp) {
        customModelInp.value = s.customModel || '';
        customModelInp.onchange = () => window.electronAPI.updateSetting('customModel', customModelInp.value);
    }

    const customKeyInp = document.getElementById('custom-key-input');
    if (customKeyInp) {
        customKeyInp.value = s.customApiKey || '';
        customKeyInp.onchange = () => window.electronAPI.updateSetting('customApiKey', customKeyInp.value);
    }

    function updateAISettingsVisibility(engine) {
        const geminiRow = document.getElementById('gemini-key-row');
        const openaiKeyRow = document.getElementById('openai-key-row');
        const customEndpointRow = document.getElementById('custom-endpoint-row');
        const customModelRow = document.getElementById('custom-model-row');
        const customKeyRow = document.getElementById('custom-key-row');
        const localModelRow = document.getElementById('local-model-row');
        const localEndpointRow = document.getElementById('local-endpoint-row');

        const isGemini = engine === 'gemini';
        const isOpenAI = engine === 'openai';
        const isCustom = engine === 'custom';
        const isLocal  = engine === 'local';

        if (geminiRow) geminiRow.style.setProperty('display', isGemini ? 'flex' : 'none', 'important');
        if (openaiKeyRow) openaiKeyRow.style.setProperty('display', isOpenAI ? 'flex' : 'none', 'important');
        if (customEndpointRow) customEndpointRow.style.setProperty('display', isCustom ? 'flex' : 'none', 'important');
        if (customModelRow) customModelRow.style.setProperty('display', isCustom ? 'flex' : 'none', 'important');
        if (customKeyRow) customKeyRow.style.setProperty('display', isCustom ? 'flex' : 'none', 'important');
        if (localModelRow) localModelRow.style.setProperty('display', isLocal ? 'flex' : 'none', 'important');
        if (localEndpointRow) localEndpointRow.style.setProperty('display', isLocal ? 'flex' : 'none', 'important');
    }

    const activeEngine = s.aiEngine || 'local';
    setGridValue('ai-engine-grid', activeEngine);
    initGridSelector('ai-engine-grid', 'aiEngine');
    updateAISettingsVisibility(activeEngine);

    const aiEngineGrid = document.getElementById('ai-engine-grid');
    if (aiEngineGrid) {
        aiEngineGrid.querySelectorAll('.choice-item').forEach(item => {
            const originalClick = item.onclick;
            item.onclick = () => {
                if (originalClick) originalClick();
                updateAISettingsVisibility(item.dataset.value);
            };
        });
    }

    // Local Model and Endpoint Settings bindings
    const localModelSelect = document.getElementById('local-model-select');
    const localEndpointInp = document.getElementById('local-endpoint-input');

    const STANDARD_MODELS = [
        { id: 'deepseek-r1:latest', label: 'DeepSeek R1 Reasoning (Latest)' },
        { id: 'llama3.3:latest', label: 'Meta Llama 3.3 70B / 8B' },
        { id: 'llama3.2:latest', label: 'Meta Llama 3.2 (Vision & Fast)' },
        { id: 'qwen2.5:latest', label: 'Qwen 2.5 (Alibaba Open Weight)' },
        { id: 'gemma-4:latest', label: 'Google DeepMind Gemma 4' },
        { id: 'gemma2:latest', label: 'Google Gemma 2 (9B / 27B)' },
        { id: 'mistral:latest', label: 'Mistral 7B / NeMo (Mistral AI)' },
        { id: 'phi4:latest', label: 'Microsoft Phi-4 (14B Reasoning)' }
    ];

    async function fetchOllamaModels(endpoint) {
        if (!localModelSelect) return;
        localModelSelect.innerHTML = '<option value="auto">Auto-detect (Active Local Server)</option>';

        const addedModelIds = new Set();

        // 1. First probe live local endpoint(s) for installed models
        try {
            if (window.electronAPI?.invoke) {
                const res = await window.electronAPI.invoke('get-local-models');
                if (res && res.models && res.models.length > 0) {
                    res.models.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.name;
                        opt.textContent = `⚡ [Installed] ${m.name} (${m.source} - ${m.size})`;
                        localModelSelect.appendChild(opt);
                        addedModelIds.add(m.name);
                    });
                }
            } else {
                const url = `${endpoint.replace(/\/$/, '')}/api/tags`;
                const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
                if (res.ok) {
                    const data = await res.json();
                    if (data.models && Array.isArray(data.models)) {
                        data.models.forEach(model => {
                            const opt = document.createElement('option');
                            opt.value = model.name;
                            opt.textContent = `⚡ [Installed] ${model.name}`;
                            localModelSelect.appendChild(opt);
                            addedModelIds.add(model.name);
                        });
                    }
                }
            }
        } catch (e) {}

        // 2. Add standard modern model suite options
        STANDARD_MODELS.forEach(m => {
            if (!addedModelIds.has(m.id)) {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.label;
                localModelSelect.appendChild(opt);
            }
        });

        localModelSelect.value = s.localModel || 'auto';
    }

    if (localModelSelect) {
        localModelSelect.value = s.localModel || 'gemma-4';
        localModelSelect.onchange = () => window.electronAPI.updateSetting('localModel', localModelSelect.value);
    }
    if (localEndpointInp) {
        localEndpointInp.value = s.localEndpoint || 'http://localhost:11434';
        localEndpointInp.onchange = () => {
            window.electronAPI.updateSetting('localEndpoint', localEndpointInp.value);
            fetchOllamaModels(localEndpointInp.value);
        };
        fetchOllamaModels(localEndpointInp.value);
    }

    initToggle('ai-deep-scrape-toggle', 'aiDeepScrape', s.aiDeepScrape !== false);
    initToggle('ai-show-reasoning-toggle', 'aiShowReasoning', s.aiShowReasoning !== false);
    initToggle('ai-agency-toggle', 'aiAgencyEnabled', s.aiAgencyEnabled !== false);
    initToggle('ai-heuristic-toggle', 'aiHeuristicEnabled', s.aiHeuristicEnabled !== false);
    setGridValue('ai-style-grid', s.aiResponseStyle || 'detailed');
    initGridSelector('ai-style-grid', 'aiResponseStyle');

    // Initialize Temperature Slider
    const tempSlider = document.getElementById('aiTemperature');
    const tempVal = s.aiTemperature !== undefined ? s.aiTemperature : 0.7;
    if (tempSlider) {
        tempSlider.value = tempVal;
        const tempLabel = document.getElementById('label-ai-temp');
        if (tempLabel) tempLabel.innerText = parseFloat(tempVal).toFixed(1);
    }

    // Initialize Max Tokens Slider
    const tokensSlider = document.getElementById('aiMaxTokens');
    const tokensVal = s.aiMaxTokens !== undefined ? s.aiMaxTokens : 2048;
    if (tokensSlider) {
        tokensSlider.value = tokensVal;
        const tokensLabel = document.getElementById('label-ai-tokens');
        if (tokensLabel) tokensLabel.innerText = tokensVal;
    }

    updateShieldDashboard(s.shieldStats || { ads: 0, trackers: 0 });

    // Initial section based on hash
    const hash = window.location.hash.replace('#', '');
    if (hash === 'whatsnew') {
        window.electronAPI.newTab('ocal://whats-new');
        showSection('search');
    } else if (hash && Array.from(sections).some(sec => sec.id === hash)) {
        showSection(hash);
    }
});

window.updateAISetting = function(key, val) {
    const value = parseFloat(val);
    if (key === 'aiTemperature') {
        const lbl = document.getElementById('label-ai-temp');
        if (lbl) lbl.innerText = value.toFixed(1);
        window.electronAPI.updateSetting('aiTemperature', value);
    }
    if (key === 'aiMaxTokens') {
        const lbl = document.getElementById('label-ai-tokens');
        if (lbl) lbl.innerText = Math.round(value);
        window.electronAPI.updateSetting('aiMaxTokens', Math.round(value));
    }
};

function updateShieldDashboard(stats) {
    if (!stats) return;
    
    // Support both old flat stats and new structured stats
    const global = stats.global || (stats.ads !== undefined ? stats : { ads: 0, trackers: 0, dataSaved: 0 });
    
    // UI Elements
    const adsEl = document.getElementById('dash-ads');
    const trackersEl = document.getElementById('dash-trackers');
    const bandwidthEl = document.getElementById('dash-bandwidth');
    const uptimeEl = document.getElementById('dash-uptime');
    const timeEl = document.getElementById('dash-time');
    const dashTimeRing = document.getElementById('time-ring');
    const eventsEl = document.getElementById('dash-security-events');
    const speedEl = document.getElementById('dash-speed-boost');
    const privacyScoreRing = document.getElementById('score-ring');
    const memBar = document.getElementById('memory-bar');
    const memVal = document.getElementById('memory-value');

    // 1. Ads & Trackers
    if (adsEl) animateValue(adsEl, parseInt(adsEl.innerText.replace(/,/g, '') || 0), global.ads || 0);
    if (trackersEl) animateValue(trackersEl, parseInt(trackersEl.innerText.replace(/,/g, '') || 0), global.trackers || 0);
    
    // 2. Bandwidth
    if (bandwidthEl) {
        const bytes = global.dataSaved || 0;
        if (bytes < 1024 * 1024) bandwidthEl.innerText = (bytes / 1024).toFixed(1) + ' KB';
        else if (bytes < 1024 * 1024 * 1024) bandwidthEl.innerText = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        else bandwidthEl.innerText = (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    // 3. Uptime
    if (uptimeEl && stats.sessionStartTime) {
        updateUptime(stats.sessionStartTime);
        if (!window._uptimeInterval) {
            window._uptimeInterval = setInterval(() => updateUptime(stats.sessionStartTime), 60000);
        }
    }
    
    // 4. Time Saved & Speed
    const total = (global.ads || 0) + (global.trackers || 0);
    const totalSeconds = total * 0.05; // 50ms per item
    
    if (timeEl) {
        if (totalSeconds < 60) timeEl.innerText = Math.round(totalSeconds) + 's';
        else if (totalSeconds < 3600) timeEl.innerText = Math.round(totalSeconds / 60) + 'm';
        else timeEl.innerText = (totalSeconds / 3600).toFixed(1) + 'h';
    }

    if (eventsEl) eventsEl.innerText = Math.floor(total / 12);
    
    if (speedEl) {
        const boost = Math.min(Math.floor(total / 50), 45) + 12; // Base 12% boost
        speedEl.innerText = boost + '%';
    }

    if (dashTimeRing) {
        // Circumference for R=62 is ~389
        const timeProgress = Math.min(totalSeconds / 3600, 1);
        dashTimeRing.style.strokeDashoffset = 389 - (timeProgress * 389);
    }

    // 5. Privacy Score
    if (privacyScoreRing) {
        // Circumference for R=62 is ~389
        const score = 98; // Static 98 for Pro Studio index
        const offset = 389 - (389 * score / 100);
        privacyScoreRing.style.strokeDashoffset = offset;
        const scoreLabel = document.querySelector('.score-label');
        if (scoreLabel) scoreLabel.innerText = Math.round(score);
    }

    // 6. System Pulse (Memory)
    if (stats.memory && memBar) {
        const procMB = Math.round(stats.memory.workingSetSize / 1024);
        let totalVal = 16;
        if (stats.systemMemory) {
            totalVal = stats.systemMemory.total / (1024 * 1024);
        }
        const perc = (procMB / (totalVal * 1024)) * 100;
        memBar.style.width = Math.min(Math.max(perc, 5), 100) + '%';
        if (memVal) {
            memVal.innerText = (procMB / 1024).toFixed(1) + ' GB / ' + Math.round(totalVal) + ' GB';
        }
    }

    window._lastShieldStats = stats;
}

function animateValue(obj, start, end) {
    if (start === end) return;
    const duration = 1200;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quint
        const ease = 1 - Math.pow(1 - progress, 5);
        const current = Math.floor(start + (end - start) * ease);
        obj.innerText = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function updateUptime(startTime) {
    const el = document.getElementById('dash-uptime');
    if (!el) return;
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    el.innerText = `${h}h ${m}m`;
}

window.electronAPI.on('shield-stats-updated', (e, stats) => {
    updateShieldDashboard(stats);
});

function updateProtectionLevel(s) {
    const badge = document.getElementById('protection-badge');
    const statShield = document.getElementById('security-stat-shield');
    const statTier = document.getElementById('security-stat-tier');
    if (!badge && !statShield) return;
    
    const isSafe = s.safeBrowsingEnabled !== false && s.safeBrowsingEnabled !== undefined;
    const isTrack = s.trackingProtection !== false;
    const isHttps = s.httpsUpgradeEnabled !== false && s.httpsUpgradeEnabled !== undefined;
    const isAdBlock = s.adBlockEnabled !== false;

    let score = 0;
    if (isSafe) score++;
    if (isTrack) score++;
    if (isHttps) score++;
    if (isAdBlock) score++;
    
    if (score >= 3) {
        if (badge) {
            badge.innerHTML = '<i class="fas fa-circle-check"></i> MAXIMUM PROTECTION';
            badge.className = "hbc-badge security-shield";
            badge.style.background = "rgba(9, 240, 160, 0.12)";
            badge.style.color = "var(--accent, #09f0a0)";
            badge.style.borderColor = "rgba(9, 240, 160, 0.25)";
        }
        if (statShield) statShield.innerText = "Maximum";
        if (statTier) statTier.innerText = "Tier 3";
    } else if (score >= 1) {
        if (badge) {
            badge.innerHTML = '<i class="fas fa-circle-exclamation"></i> STANDARD PROTECTION';
            badge.className = "hbc-badge security-shield";
            badge.style.background = "rgba(234, 179, 8, 0.12)";
            badge.style.color = "#eab308";
            badge.style.borderColor = "rgba(234, 179, 8, 0.25)";
        }
        if (statShield) statShield.innerText = "Standard";
        if (statTier) statTier.innerText = "Tier 2";
    } else {
        if (badge) {
            badge.innerHTML = '<i class="fas fa-triangle-exclamation"></i> PROTECTION REDUCED';
            badge.className = "hbc-badge security-shield";
            badge.style.background = "rgba(239, 68, 68, 0.15)";
            badge.style.color = "#ef4444";
            badge.style.borderColor = "rgba(239, 68, 68, 0.25)";
        }
        if (statShield) statShield.innerText = "Reduced";
        if (statTier) statTier.innerText = "Tier 1";
    }
}

// Extensions Management
window.loadUnpackedExtension = async () => {
    try {
        const result = await window.electronAPI.loadUnpackedExtension();
        if (result) {
            alert(`Successfully loaded local extension: ${result.name}`);
            window.electronAPI.getSettings().then(st => renderExtensions(st));
        }
    } catch (err) {
        alert('Failed to load unpacked extension. Ensure it contains a valid manifest.json.');
    }
};

function renderExtensions(s = null) {
    if (!s) return;

    const builtins = [
        { id: 'adblock',  key: 'adBlockEnabled',     toggleId: 'toggle-adblock',  defaultOn: true },
        { id: 'vault',   key: 'assetVaultEnabled',   toggleId: 'toggle-vault',    defaultOn: false },
        { id: 'ai',      key: 'aiAssistantEnabled',  toggleId: 'toggle-ai',       defaultOn: false },
        { id: 'stealth', key: 'cyberStealthEnabled', toggleId: 'toggle-stealth',  defaultOn: false },
        { id: 'focus',   key: 'ocalFocusEnabled',    toggleId: 'toggle-focus',    defaultOn: false },
    ];

    let builtinsActive = 0;
    builtins.forEach(ext => {
        const card   = document.getElementById(`ext-${ext.id}`);
        const status = document.getElementById(`status-${ext.id}`);
        const toggle = document.getElementById(ext.toggleId);
        if (!card) return;

        const isActive = ext.key === 'adBlockEnabled' ? (s[ext.key] !== false) : !!s[ext.key];
        if (isActive) builtinsActive++;

        // Toggle checkbox state
        if (toggle) toggle.checked = isActive;
        if (isActive) { card.classList.add('is-active'); } else { card.classList.remove('is-active'); }

        // Status indicator
        if (status) {
            status.className = `ext-status-indicator ${isActive ? 'on' : 'off'}`;
            status.innerHTML = `<span class="status-dot"></span><span>${isActive ? 'Active' : 'Idle'}</span>`;
        }
    });

    // Dynamic (installed) extensions
    const grid = document.getElementById('ext-settings-grid');
    let dynamicActive = 0;
    const customCount = (s.extensions && Array.isArray(s.extensions)) ? s.extensions.length : 0;

    if (grid) {
        grid.querySelectorAll('.dynamic-ext').forEach(el => el.remove());

        if (s.extensions && s.extensions.length > 0) {
            s.extensions.forEach(ext => {
                if (ext.enabled) dynamicActive++;
                const el = document.createElement('div');
                el.className = 'card ext-card-row sp-card-white dynamic-ext' + (ext.enabled ? ' is-active' : '');
                el.dataset.extname = (ext.name || '').toLowerCase();
                
                const statusIndicatorClass = ext.enabled ? 'on' : 'off';
                const statusText = ext.enabled ? 'Active' : 'Disabled';
                const tagText = ext.isLocal ? 'LOCAL' : 'INSTALLED';

                el.innerHTML = `
                    <div class="ext-card-header">
                        <div class="ext-card-header-left">
                            <div class="ext-card-icon dynamic-icon">
                                <i class="fas fa-puzzle-piece"></i>
                            </div>
                            <div class="ext-card-identity">
                                <h4 class="ext-card-name">${ext.name}</h4>
                                <div class="ext-card-version">Version ${ext.version || '?'} &middot; ID: ${(ext.id || '').substring(0, 16)}...</div>
                            </div>
                        </div>
                        <label class="ext-toggle-wrap">
                            <input type="checkbox" ${ext.enabled ? 'checked' : ''}
                                onchange="window.electronAPI.toggleExtension('${ext.id}', this.checked); setTimeout(() => window.electronAPI.getSettings().then(st => renderExtensions(st)), 100);">
                            <span class="ext-slider"></span>
                        </label>
                    </div>
                    <div class="ext-card-desc">
                        ${ext.description || 'Custom Chrome Web Store extension loaded into Ocal workspace.'}
                    </div>
                    <div class="ext-card-footer">
                        <span class="ext-card-tag installed">${tagText}</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="ext-status-indicator ${statusIndicatorClass}">
                                <span class="status-dot"></span><span>${statusText}</span>
                            </span>
                            ${!ext.isLocal ? `<button class="ext-action-btn-pill" onclick="window.open('https://chromewebstore.google.com/detail/${ext.id}')"><i class="fas fa-external-link-alt"></i> Store</button>` : ''}
                            <button class="ext-action-btn-pill danger" onclick="window.electronAPI.removeExtension('${ext.id}').then(() => window.electronAPI.getSettings().then(st => renderExtensions(st)))"><i class="fas fa-trash"></i> Remove</button>
                        </div>
                    </div>
                `;
                grid.appendChild(el);
            });
        }
    }

    // Update Home-style Stats Bar Counters
    const activeCount = builtinsActive + dynamicActive;
    const totalCount = builtins.length + customCount;
    const statActiveEl = document.getElementById('ext-stat-active');
    const statCustomEl = document.getElementById('ext-stat-custom');
    const statTotalEl  = document.getElementById('ext-stat-total');
    if (statActiveEl) statActiveEl.innerText = activeCount;
    if (statCustomEl) statCustomEl.innerText = customCount;
    if (statTotalEl)  statTotalEl.innerText  = totalCount;

    if (window.filterExtSettings) window.filterExtSettings();
}

window.installPopularExt = function(id) {
    const input = document.getElementById('ext-cws-input');
    if (input) input.value = id;
    if (typeof installExtFromSettings === 'function') {
        installExtFromSettings();
    }
};

window.toggleExtension = (key) => {
    const btn = event.currentTarget || event.target;
    const isInstalling = btn.classList.contains('primary');
    window.electronAPI.send('set-security-toggle', { key, value: isInstalling });
    
    // Optimistic UI update
    btn.innerText = 'Processing...';
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 500);
};

// Feature Hub Handlers (Search & Security)
window.toggleSecurityFeature = (key, valOrEl) => {
    let value;
    if (typeof valOrEl === 'boolean') {
        value = valOrEl;
    } else if (valOrEl && valOrEl.classList) {
        value = valOrEl.classList.toggle('on');
    } else {
        value = !!valOrEl;
    }
    window.electronAPI.updateSetting(key, value);
    window.electronAPI.send('set-security-toggle', { key, value });
    if (window.currentSettings) {
        window.currentSettings[key] = value;
        renderSecuritySettings(window.currentSettings);
    }
};

window.toggleSearchFeature = window.toggleSecurityFeature;

document.getElementById('custom-search-input')?.addEventListener('input', (e) => {
    window.electronAPI.send('set-security-toggle', { key: 'customSearchUrl', value: e.target.value });
});

function initDNSGrid() {
    const dnsGrid = document.getElementById('dns-grid');
    if (!dnsGrid) return;
    dnsGrid.querySelectorAll('.choice-item').forEach(item => {
        item.onclick = () => {
            const val = item.dataset.value;
            dnsGrid.querySelectorAll('.choice-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            window.electronAPI.updateSetting('dnsProvider', val);
            window.electronAPI.updateSetting('dns', val);
            window.electronAPI.send('set-dns-provider', val);
            if (window.currentSettings) {
                window.currentSettings.dnsProvider = val;
                window.currentSettings.dns = val;
                renderSecuritySettings(window.currentSettings);
            }
        };
    });
}

function renderSecuritySettings(s) {
    if (!s) return;
    
    // Checkboxes
    const safeCb = document.getElementById('safe-browsing-toggle-cb');
    if (safeCb && s.safeBrowsingEnabled !== undefined) safeCb.checked = !!s.safeBrowsingEnabled;

    const trackCb = document.getElementById('tracking-toggle-security-cb');
    if (trackCb && s.trackingProtection !== undefined) trackCb.checked = (s.trackingProtection !== false);

    const httpsCb = document.getElementById('https-toggle-cb');
    if (httpsCb && s.httpsUpgradeEnabled !== undefined) httpsCb.checked = !!s.httpsUpgradeEnabled;

    const dislikeCb = document.getElementById('dislike-toggle-security-cb');
    if (dislikeCb && s.youtubeDislikeEnabled !== undefined) dislikeCb.checked = (s.youtubeDislikeEnabled !== false);

    const mediaMasterCb = document.getElementById('media-master-toggle-security-cb');
    if (mediaMasterCb && s.mediaMasterEnabled !== undefined) mediaMasterCb.checked = (s.mediaMasterEnabled !== false);

    // DNS Grid Provider
    const activeDns = s.dnsProvider || s.dns || 'default';
    const dnsGrid = document.getElementById('dns-grid');
    if (dnsGrid) {
        dnsGrid.querySelectorAll('.choice-item').forEach(item => {
            item.classList.toggle('active', item.dataset.value === activeDns);
        });
    }

    // Update DNS Stat pill
    const statDns = document.getElementById('security-stat-dns');
    if (statDns) {
        const dnsLabels = {
            'default': 'System',
            'cloudflare': '1.1.1.1 DoH',
            'google': '8.8.8.8 DoH',
            'quad9': '9.9.9.9 DoH'
        };
        statDns.innerText = dnsLabels[activeDns] || 'DoH Secure';
    }

    // Protection Level & Stats
    updateProtectionLevel(s);
}

// Dashboard Telemetry Simulation
function startDashboardTelemetry() {
    setInterval(() => {
        const dashboardEl = document.getElementById('dashboard');
        if (dashboardEl && dashboardEl.classList.contains('active')) {
            const mem = (Math.random() * 0.5 + 1.2).toFixed(1);
            const memBar = document.getElementById('memory-bar');
            if (memBar) {
                memBar.style.width = `${(mem / 8) * 100}%`;
                document.getElementById('memory-value').innerText = `${mem} GB`;
            }

            // Simulate neutralized ads increasing
            const ads = document.getElementById('dash-ads');
            if (ads) {
                const current = parseInt(ads.innerText);
                if (Math.random() > 0.8) ads.innerText = current + 1;
            }

            // Animate clock/uptime ring
            const ring = document.getElementById('time-ring');
            if (ring) {
                const uptime = Math.floor((Date.now() - window.sessionStart) / 1000 / 60);
                document.getElementById('dash-time').innerText = `${uptime}m`;
                const offset = 389 - (Math.min(uptime, 60) / 60) * 389;
                ring.style.strokeDashoffset = offset;
            }
        }
    }, 3000);
}

window.sessionStart = Date.now();
document.addEventListener('DOMContentLoaded', startDashboardTelemetry);

// Update Management
window.checkForUpdates = () => {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> SEARCING...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> SYSTEM UP TO DATE';
        btn.style.background = 'rgba(74, 222, 128, 0.2)';
        btn.style.color = '#4ade80';
        btn.style.borderColor = 'rgba(74, 222, 128, 0.4)';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 3000);
    }, 2500);
};

window.electronAPI.onSettingsChanged(s => {
    window.currentSettings = s;
    if (s.accentColor) applyAccent(s.accentColor);
    if (s.themeMode) {
        applyTheme(s.themeMode);
        const themeToggle = document.getElementById('theme-mode-toggle');
        if (themeToggle) themeToggle.classList.toggle('on', s.themeMode !== 'light');
    }
    if (s.searchEngine !== undefined || s.customSearchUrl !== undefined) {
        renderSearchSettings(s);
    }
    renderHomepageSettings(s);
    renderAISettings(s);
    renderSystemSettings(s);
    renderSecuritySettings(s);
    renderExtensions(s);
    renderProfiles(s);
    if (s.shieldStats) {
        updateShieldDashboard(s.shieldStats);
    }
});

// Browser Migration
function initMigration() {
    const chromeBtn = document.getElementById('import-chrome-btn');
    const edgeBtn = document.getElementById('import-edge-btn');
    const status = document.getElementById('import-status');

    async function handleImport(browser) {
        if (!status) return;
        status.style.display = 'block';
        status.style.color = 'var(--accent)';
        status.innerText = `Importing from ${browser}...`;

        const result = await window.electronAPI.importBookmarks(browser);
        if (result.success) {
            status.style.color = '#4ade80';
            status.innerText = `Successfully imported ${result.count} bookmarks!`;
        } else {
            status.style.color = '#f87171';
            status.innerText = `Failed: ${result.error}`;
        }
        setTimeout(() => { status.style.display = 'none'; }, 5000);
    }

    if (chromeBtn) chromeBtn.onclick = () => handleImport('chrome');
    if (edgeBtn) edgeBtn.onclick = () => handleImport('edge');
    
    const fileBtn = document.getElementById('import-file-btn');
    if (fileBtn) {
        fileBtn.onclick = async () => {
            if (!status) return;
            status.style.display = 'block';
            status.style.color = 'var(--accent)';
            status.innerText = `Selecting file...`;

            const result = await window.electronAPI.importBookmarkFile();
            if (result.success) {
                status.style.color = '#4ade80';
                status.innerText = `Successfully imported ${result.count} bookmarks!`;
            } else if (result.error !== 'Cancelled') {
                status.style.color = '#f87171';
                status.innerText = `Failed: ${result.error}`;
            } else {
                status.style.display = 'none';
            }
            if (result.success || (result.error && result.error !== 'Cancelled')) {
                setTimeout(() => { status.style.display = 'none'; }, 5000);
            }
        };
    }
}

// Settings Metadata Links
const metaGithub = document.getElementById('meta-github');
if (metaGithub) {
    metaGithub.addEventListener('click', () => {
        window.electronAPI.send('open-external', 'https://github.com/neelkanth-patel26/Ocal-Browser');
    });
}
const metaDiscord = document.getElementById('meta-discord');
if (metaDiscord) {
metaDiscord.addEventListener('click', () => {
        window.electronAPI.send('open-external', 'https://discord.gg/ocal');
    });
}

// Initialize migration
initMigration();

// Default Browser Logic
async function checkDefaultBrowser() {
    const isDefault = await window.electronAPI.checkDefaultBrowser();
    const statusText = document.getElementById('default-browser-status');
    const setBtn = document.getElementById('set-default-btn');
    const statShell = document.getElementById('system-stat-shell');
    
    if (statusText && setBtn) {
        if (isDefault) {
            statusText.innerText = "Default Browser";
            statusText.className = "system-status-pill status-active";
            if (statShell) statShell.innerText = "Default";
            setBtn.innerText = "Default";
            setBtn.disabled = true;
            setBtn.classList.remove('primary');
            setBtn.classList.add('secondary');
            setBtn.style.opacity = "0.5";
            setBtn.style.cursor = "default";
        } else {
            statusText.innerText = "Not Default";
            statusText.className = "system-status-pill status-warning";
            if (statShell) statShell.innerText = "Not Default";
            setBtn.innerText = "Make Default";
            setBtn.disabled = false;
            setBtn.classList.add('primary');
            setBtn.classList.remove('secondary');
            setBtn.style.opacity = "1";
            setBtn.style.cursor = "pointer";
        }
    }
}

const setDefaultBtn = document.getElementById('set-default-btn');
if (setDefaultBtn) {
    setDefaultBtn.onclick = async () => {
        await window.electronAPI.setAsDefaultBrowser();
        setDefaultBtn.innerText = "Opening Settings...";
        
        let checks = 0;
        const interval = setInterval(async () => {
            await checkDefaultBrowser();
            checks++;
            if (checks > 20) clearInterval(interval);
        }, 1000);
    };
}

checkDefaultBrowser();
window.onfocus = checkDefaultBrowser;

// ── Global Settings Real-time Card Search ──
window.filterGlobalSettings = function() {
    const query = document.getElementById('settings-global-search')?.value.toLowerCase().trim() || '';
    const currentSection = document.querySelector('.section.active');
    if (!currentSection) return;
    
    const groups = currentSection.querySelectorAll('.group');
    const cards = currentSection.querySelectorAll('.card, .pref-module, .ext-card-row, .ext-item-card, .about-card, .update-card, .shortcut-row');
    
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        const match = !query || text.includes(query);
        card.style.display = match ? '' : 'none';
    });
    
    groups.forEach(group => {
        const visibleItems = Array.from(group.querySelectorAll('.card, .pref-module, .ext-card-row, .ext-item-card, .about-card, .update-card, .shortcut-row')).some(c => c.style.display !== 'none');
        group.style.display = (visibleItems || !query) ? '' : 'none';
    });
};

// ── Password Vault Settings Manager (Site-Based Multi-Profile Layout with Windows Auth) ──
window.toggleVaultAuthSession = async function() {
    try {
        const isUnlocked = await window.electronAPI.invoke('passwords:is-unlocked');
        if (isUnlocked) {
            await window.electronAPI.invoke('passwords:lock-vault');
            updateVaultAuthUI(false);
            loadSettingsPasswords(document.getElementById('settings-passwords-search')?.value || '');
        } else {
            const auth = await window.electronAPI.invoke('passwords:authenticate-user');
            if (auth && auth.success) {
                updateVaultAuthUI(true);
                loadSettingsPasswords(document.getElementById('settings-passwords-search')?.value || '');
            }
        }
    } catch (err) {
        console.warn('Vault auth error:', err);
    }
};

function updateVaultAuthUI(isUnlocked) {
    const btnText = document.getElementById('vault-auth-status-text');
    const toggleBtn = document.getElementById('vault-auth-toggle-btn');
    const badge = document.getElementById('vault-lock-badge');

    if (isUnlocked) {
        if (btnText) btnText.innerText = 'Lock Vault';
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-lock-open" style="color: #4ade80;"></i> <span id="vault-auth-status-text">Lock Vault</span>';
        }
        if (badge) {
            badge.innerHTML = '<i class="fas fa-lock-open"></i> VAULT UNLOCKED';
            badge.style.color = '#4ade80';
            badge.style.background = 'rgba(74, 222, 128, 0.12)';
            badge.style.borderColor = 'rgba(74, 222, 128, 0.25)';
        }
    } else {
        if (btnText) btnText.innerText = 'Unlock with Windows';
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-key" style="color: var(--accent);"></i> <span id="vault-auth-status-text">Unlock with Windows</span>';
        }
        if (badge) {
            badge.innerHTML = '<i class="fas fa-lock"></i> WINDOWS PROTECTED';
            badge.style.color = 'var(--accent)';
            badge.style.background = 'color-mix(in srgb, var(--accent) 12%, transparent)';
            badge.style.borderColor = 'color-mix(in srgb, var(--accent) 25%, transparent)';
        }
    }
}

async function loadSettingsPasswords(query = '') {
    const listEl = document.getElementById('settings-passwords-list');
    const countEl = document.getElementById('settings-passwords-count');
    if (!listEl) return;

    let isUnlocked = false;
    try {
        isUnlocked = await window.electronAPI.invoke('passwords:is-unlocked');
    } catch (err) {
        // Fallback if main process was not restarted yet
        isUnlocked = false;
    }
    updateVaultAuthUI(isUnlocked);

    let list = [];
    try {
        const allCreds = await window.electronAPI.invoke('passwords:get-all');
        list = Array.isArray(allCreds) ? allCreds : [];
    } catch (e) {
        console.warn('[Settings] Error retrieving passwords list:', e);
        list = [];
    }

    if (countEl) countEl.innerText = `${list.length} saved ${list.length === 1 ? 'login' : 'logins'}`;

    if (query) {
        const q = query.toLowerCase().trim();
        list = list.filter(c => c && ((c.domain && c.domain.includes(q)) || (c.username && c.username.toLowerCase().includes(q))));
    }

    if (list.length === 0) {
        listEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 32px 12px; color: var(--text-dim);">
                <i class="fas fa-vault" style="font-size: 28px; opacity: 0.4; margin-bottom: 8px; display: block;"></i>
                <span style="font-size: 13.5px; font-weight: 700; display: block;">No saved passwords found</span>
                <span style="font-size: 11.5px;">Saved website logins and user profiles are AES-256 DPAPI encrypted and will appear here.</span>
            </div>
        `;
        return;
    }

        // Group credentials by domain
        const domainGroups = {};
        list.forEach(cred => {
            if (!domainGroups[cred.domain]) domainGroups[cred.domain] = [];
            domainGroups[cred.domain].push(cred);
        });

        listEl.innerHTML = '';
        Object.keys(domainGroups).forEach(domain => {
            const siteCreds = domainGroups[domain];
            const siteCard = document.createElement('div');
            siteCard.className = 'site-vault-card';
            siteCard.style.cssText = `
                grid-column: 1 / -1;
                background: var(--card-bg, rgba(255,255,255,0.03));
                border: 1px solid var(--chrome-border, rgba(255,255,255,0.1));
                border-radius: 12px;
                padding: 12px 16px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                transition: all 0.2s ease;
            `;

            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

            let profilesHtml = '';
            siteCreds.forEach(cred => {
                profilesHtml += `
                    <div class="site-profile-row" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; background: rgba(0,0,0,0.04); border: 1px solid var(--chrome-border); border-radius: 8px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--text);">
                            <i class="fas fa-user-circle" style="color: var(--accent); font-size: 15px;"></i>
                            <span>${cred.username}</span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 6px; font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.1); padding: 4px 10px; border-radius: 6px; color: var(--text);">
                                <span id="settings-mask-${cred.id}">••••••••</span>
                                <i class="fas fa-eye toggle-settings-eye" style="cursor: pointer; opacity: 0.7; font-size: 11px;" data-id="${cred.id}" title="Unlock and show password with Windows authentication"></i>
                            </div>
                            <button class="btn secondary copy-pass-btn" data-id="${cred.id}" style="padding: 5px 12px; font-size: 11px; border-radius: 6px; border: 1px solid var(--chrome-border); display: inline-flex; align-items: center; gap: 4px; font-weight: 600;"><i class="fas fa-copy"></i> Copy</button>
                            <button class="btn danger del-pass-btn" data-id="${cred.id}" style="padding: 5px 10px; font-size: 11px; border-radius: 6px; border: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </div>
                `;
            });

            siteCard.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--chrome-border); padding-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${faviconUrl}" style="width: 18px; height: 18px; border-radius: 4px;" onerror="this.style.display='none'">
                        <span style="font-size: 13.5px; font-weight: 700; color: var(--accent);">${domain}</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; padding: 2px 10px; background: rgba(9, 240, 160, 0.15); color: var(--accent); border-radius: 100px;">${siteCreds.length} ${siteCreds.length === 1 ? 'profile' : 'profiles'}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${profilesHtml}
                </div>
            `;

            // Eye toggles with Windows Authentication
            siteCard.querySelectorAll('.toggle-settings-eye').forEach(btn => {
                const credId = btn.getAttribute('data-id');
                btn.addEventListener('click', async () => {
                    const mask = siteCard.querySelector(`#settings-mask-${credId}`);
                    if (mask.textContent === '••••••••') {
                        btn.className = 'fas fa-spinner fa-spin toggle-settings-eye';
                        try {
                            const res = await window.electronAPI.invoke('passwords:reveal-password', credId);
                            if (res && res.success && res.password) {
                                mask.textContent = res.password;
                                btn.className = 'fas fa-eye-slash toggle-settings-eye';
                                updateVaultAuthUI(true);
                            } else {
                                btn.className = 'fas fa-eye toggle-settings-eye';
                            }
                        } catch (err) {
                            btn.className = 'fas fa-eye toggle-settings-eye';
                        }
                    } else {
                        mask.textContent = '••••••••';
                        btn.className = 'fas fa-eye toggle-settings-eye';
                    }
                });
            });

            // Copy buttons with Windows Authentication
            siteCard.querySelectorAll('.copy-pass-btn').forEach(btn => {
                const credId = btn.getAttribute('data-id');
                btn.addEventListener('click', async () => {
                    const originalHtml = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    btn.disabled = true;
                    try {
                        const res = await window.electronAPI.invoke('passwords:copy-password', credId);
                        if (res && res.success) {
                            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            updateVaultAuthUI(true);
                            setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
                        } else {
                            btn.innerHTML = '<i class="fas fa-shield-halved"></i> Auth Failed';
                            setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
                        }
                    } catch (err) {
                        btn.innerHTML = originalHtml;
                        btn.disabled = false;
                    }
                });
            });

            // Delete buttons
            siteCard.querySelectorAll('.del-pass-btn').forEach(btn => {
                const credId = btn.getAttribute('data-id');
                btn.addEventListener('click', async () => {
                    await window.electronAPI.invoke('passwords:delete', credId);
                    loadSettingsPasswords(document.getElementById('settings-passwords-search')?.value);
                });
            });

            listEl.appendChild(siteCard);
        });
}

const settingsSearch = document.getElementById('settings-passwords-search');
if (settingsSearch) {
    settingsSearch.addEventListener('input', (e) => {
        loadSettingsPasswords(e.target.value);
    });
}

loadSettingsPasswords();


// ══════════════════════════════════════════════════════════════════════════
// SEARCH ENGINE HOME-STYLE HANDLERS
// ══════════════════════════════════════════════════════════════════════════
function setupSearchEngineCardListeners() {
    const cards = document.querySelectorAll('.search-provider-card');
    cards.forEach(card => {
        card.onclick = () => {
            const engine = card.dataset.searchEngine;
            if (!engine) return;
            window.electronAPI.updateSetting('searchEngine', engine);
            window.electronAPI.getSettings().then(st => renderSearchSettings(st));
        };
    });
}

function renderSearchSettings(s) {
    if (!s) return;
    const engine = s.searchEngine || 'google';

    // Highlight active card & check radio
    const cards = document.querySelectorAll('.search-provider-card');
    cards.forEach(card => {
        const isMatch = (card.dataset.searchEngine === engine);
        card.classList.toggle('active', isMatch);
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = isMatch;
        const statusEl = card.querySelector('.spc-status');
        if (statusEl) {
            statusEl.className = isMatch ? 'spc-status active' : 'spc-status';
            statusEl.innerHTML = `<span class="status-dot"></span><span>${isMatch ? 'Active Provider' : 'Available'}</span>`;
        }
    });

    // Provider Metadata (Logos & Names)
    const providerMeta = {
        google: {
            name: 'Google',
            logo: `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98 1.06-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`
        },
        bing: {
            name: 'Microsoft Bing',
            logo: `<i class="fab fa-microsoft" style="color: #00A4EF; font-size: 19px;"></i>`
        },
        duckduckgo: {
            name: 'DuckDuckGo',
            logo: `<i class="fas fa-shield-cat" style="color: #DE5833; font-size: 19px;"></i>`
        },
        brave: {
            name: 'Brave Search',
            logo: `<i class="fab fa-brave" style="color: #FB542B; font-size: 19px;"></i>`
        },
        yahoo: {
            name: 'Yahoo Search',
            logo: `<i class="fab fa-yahoo" style="color: #720DEA; font-size: 19px;"></i>`
        },
        custom: {
            name: 'Custom Engine',
            logo: `<i class="fas fa-sliders" style="color: var(--accent); font-size: 18px;"></i>`
        }
    };

    const meta = providerMeta[engine] || providerMeta.google;

    // Update Stats Bar
    const statEngineEl = document.getElementById('search-stat-engine');
    if (statEngineEl) statEngineEl.innerText = meta.name.split(' ')[0];

    // Update Search Preview Pill
    const previewLogo = document.getElementById('search-preview-logo');
    if (previewLogo) previewLogo.innerHTML = meta.logo;

    const previewInput = document.getElementById('search-preview-input');
    if (previewInput) previewInput.placeholder = `Type a search query to test ${meta.name}...`;

    // Feature switches
    const autoCb = document.getElementById('instant-search-toggle-cb');
    if (autoCb && s.instantSearchEnabled !== undefined) {
        autoCb.checked = (s.instantSearchEnabled !== false);
    }
    const safeCb = document.getElementById('safe-search-toggle-cb');
    if (safeCb && s.safeSearchEnabled !== undefined) {
        safeCb.checked = !!s.safeSearchEnabled;
    }
    updateSearchFeatureBadges();

    // Custom search input
    const customInp = document.getElementById('custom-search-url');
    if (customInp && s.customSearchUrl) {
        customInp.value = s.customSearchUrl;
    }
}

window.updateSearchFeatureBadges = function() {
    const autoCb = document.getElementById('instant-search-toggle-cb');
    const safeCb = document.getElementById('safe-search-toggle-cb');

    const isAuto = autoCb ? autoCb.checked : true;
    const isSafe = safeCb ? safeCb.checked : false;

    const statAuto = document.getElementById('search-stat-autocomplete');
    const statSafe = document.getElementById('search-stat-safesearch');
    if (statAuto) statAuto.innerText = isAuto ? 'Active' : 'Off';
    if (statSafe) statSafe.innerText = isSafe ? 'Filtered' : 'Off';

    const statusAuto = document.getElementById('status-autocomplete');
    const statusSafe = document.getElementById('status-safesearch');
    if (statusAuto) {
        statusAuto.className = `ext-status-indicator ${isAuto ? 'on' : 'off'}`;
        statusAuto.innerHTML = `<span class="status-dot"></span><span>${isAuto ? 'Active' : 'Disabled'}</span>`;
    }
    if (statusSafe) {
        statusSafe.className = `ext-status-indicator ${isSafe ? 'on' : 'off'}`;
        statusSafe.innerHTML = `<span class="status-dot"></span><span>${isSafe ? 'Active' : 'Disabled'}</span>`;
    }
};

window.testSearchPreview = function() {
    const input = document.getElementById('search-preview-input');
    if (!input || !input.value.trim()) return;
    const query = input.value.trim();

    window.electronAPI.getSettings().then(s => {
        const engine = s.searchEngine || 'google';
        let target = '';
        if (engine === 'bing') target = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
        else if (engine === 'duckduckgo') target = 'https://duckduckgo.com/?q=' + encodeURIComponent(query);
        else if (engine === 'brave') target = 'https://search.brave.com/search?q=' + encodeURIComponent(query);
        else if (engine === 'yahoo') target = 'https://search.yahoo.com/search?p=' + encodeURIComponent(query);
        else if (engine === 'custom') {
            const customPattern = s.customSearchUrl || document.getElementById('custom-search-url')?.value;
            if (customPattern && customPattern.includes('%s')) {
                target = customPattern.replace('%s', encodeURIComponent(query));
            } else {
                target = 'https://www.google.com/search?q=' + encodeURIComponent(query);
            }
        } else {
            target = 'https://www.google.com/search?q=' + encodeURIComponent(query);
        }

        if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send('open-external', target);
        } else {
            window.open(target, '_blank');
        }
    });
};

window.saveCustomSearchURL = function() {
    const inp = document.getElementById('custom-search-url');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) {
        alert('Please enter a valid search URL pattern with %s (e.g. https://kagi.com/search?q=%s)');
        return;
    }
    if (!val.includes('%s')) {
        alert('Your search URL must include "%s" as the search query placeholder.');
        return;
    }

    window.electronAPI.updateSetting('customSearchUrl', val);
    window.electronAPI.send('set-security-toggle', { key: 'customSearchUrl', value: val });
    window.electronAPI.updateSetting('searchEngine', 'custom');
    window.electronAPI.getSettings().then(s => {
        s.searchEngine = 'custom';
        s.customSearchUrl = val;
        renderSearchSettings(s);
    });
    alert('Custom search engine saved and set as default!');
};

window.setCustomPreset = function(url, name) {
    const inp = document.getElementById('custom-search-url');
    if (inp) inp.value = url;
    window.saveCustomSearchURL();
};

// ══════════════════════════════════════════════════════════════════════════
// HOMEPAGE & WORKSPACE HOME-STYLE HANDLERS
// ══════════════════════════════════════════════════════════════════════════
window.handleThemeToggle = function(checked) {
    const newTheme = checked ? 'dark' : 'light';
    window.electronAPI.updateSetting('themeMode', newTheme);
    applyTheme(newTheme);
};

window.handleCompactToggle = function(checked) {
    window.electronAPI.updateSetting('compactWorkspace', checked);
    window.electronAPI.updateSetting('compactMode', checked);
    document.body.classList.toggle('compact-density', checked);
    document.documentElement.classList.toggle('compact-density', checked);
};

window.handleBookmarksBarToggle = function(checked) {
    window.electronAPI.updateSetting('bookmarkBarMode', checked ? 'always' : 'never');
};

window.handleNewsToggle = function(checked) {
    window.electronAPI.updateSetting('showNewsHub', checked);
    localStorage.setItem('ocal-show-news', checked ? 'true' : 'false');
};

window.selectTabLayout = function(mode) {
    window.electronAPI.updateSetting('tabLayout', mode);
    const cards = document.querySelectorAll('.tab-choice-card');
    cards.forEach(c => c.classList.toggle('active', c.dataset.value === mode));
    
    const statLayout = document.getElementById('homepage-stat-layout');
    if (statLayout) statLayout.innerText = mode === 'vertical' ? 'Vertical Arc' : 'Horizontal';

    const tuning = document.getElementById('vt-tuning-section');
    if (tuning) {
        tuning.style.opacity = mode === 'vertical' ? '1' : '0.6';
    }
};

window.selectVtWidth = function(width) {
    const val = parseInt(width, 10);
    window.electronAPI.updateSetting('verticalTabsWidth', val);
    const pills = document.querySelectorAll('#vt-width-grid .vt-pill-btn');
    pills.forEach(p => p.classList.toggle('active', parseInt(p.dataset.value, 10) === val));
};

window.handleForceHideSidebar = function(checked) {
    window.electronAPI.updateSetting('forceHideSidebar', checked);
};

window.selectSidebarMode = function(mode) {
    window.electronAPI.updateSetting('sidebarMode', mode);
    const pills = document.querySelectorAll('#sidebar-mode-grid .vt-pill-btn');
    pills.forEach(p => p.classList.toggle('active', p.dataset.value === mode));
};

window.selectSidebarAppWidth = function(width) {
    const val = parseInt(width, 10);
    window.electronAPI.updateSetting('sidebarAppWidth', val);
    const pills = document.querySelectorAll('#sidebar-app-width-grid .vt-pill-btn');
    pills.forEach(p => p.classList.toggle('active', parseInt(p.dataset.value, 10) === val));
};

window.saveWeatherLocation = function() {
    const inp = document.getElementById('settings-weather-city-input');
    const btn = document.getElementById('save-weather-city-btn');
    if (!inp) return;
    const newLoc = inp.value.trim();
    if (newLoc) {
        localStorage.setItem('ocal-weather-loc', newLoc);
        if (window.electronAPI && window.electronAPI.updateSetting) {
            window.electronAPI.updateSetting('weatherLocation', newLoc);
        }
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = `<i class="fas fa-check"></i><span>Saved!</span>`;
            setTimeout(() => { btn.innerHTML = original; }, 1800);
        }
    } else {
        localStorage.removeItem('ocal-weather-loc');
        if (window.electronAPI && window.electronAPI.updateSetting) {
            window.electronAPI.updateSetting('weatherLocation', '');
        }
    }
};

window.autoDetectWeatherLocation = function() {
    localStorage.removeItem('ocal-weather-loc');
    const inp = document.getElementById('settings-weather-city-input');
    if (inp) inp.value = '';
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('weatherLocation', '');
    }
    const btn = document.getElementById('auto-weather-city-btn');
    if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i><span>Auto Set</span>`;
        setTimeout(() => { btn.innerHTML = orig; }, 1800);
    }
};

function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(9, 240, 160, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(9, 240, 160, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hex) {
    if (!hex) return '#FFFFFF';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return '#FFFFFF';
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 140 ? '#0D0E11' : '#FFFFFF';
}

let _accentUpdateTimer = null;
function debouncedSaveAccent(color) {
    if (_accentUpdateTimer) clearTimeout(_accentUpdateTimer);
    _accentUpdateTimer = setTimeout(() => {
        if (window.electronAPI && window.electronAPI.updateSetting) {
            window.electronAPI.updateSetting('accentColor', color);
        }
    }, 100);
}

window.applyAccent = function applyAccent(color, skipIpc = false) {
    if (!color) color = '#09F0A0';
    const root = document.documentElement;
    const body = document.body;
    const isLight = (root.getAttribute('data-theme') === 'light' || body?.getAttribute('data-theme') === 'light');
    const contrast = getContrastColor(color);
    const dim = hexToRgba(color, 0.15);
    const glow = hexToRgba(color, 0.35);

    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-text', contrast);
    root.style.setProperty('--accent-dim', dim);
    root.style.setProperty('--accent-glow', glow);
    root.style.setProperty('--accent-border', color);
    
    if (body) {
        body.style.setProperty('--accent', color);
        body.style.setProperty('--accent-text', contrast);
        body.style.setProperty('--accent-dim', dim);
        body.style.setProperty('--accent-glow', glow);
        body.style.setProperty('--accent-border', color);
    }

    // AI Adaptive Harmonic Gradient Generation
    if (window.OcalColorHarmonizer) {
        const harmony = window.OcalColorHarmonizer.applyHarmonizedTheme(color, isLight ? 'light' : 'dark');
        updateAIGradientPreviews(harmony);
    }
    
    try {
        localStorage.setItem('ocal-settings-accent', color);
    } catch (e) {}

    const dot = document.getElementById('custom-color-dot');
    if (dot) dot.style.background = color;

    if (!skipIpc && window.electronAPI && window.electronAPI.updateSetting) {
        debouncedSaveAccent(color);
    }
};

function applyTheme(theme) {
    const isDark = (theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    try {
        localStorage.setItem('ocal-settings-theme', theme);
    } catch (e) {}

    const themeCb = document.getElementById('theme-mode-toggle-cb');
    if (themeCb) themeCb.checked = isDark;
    const statTheme = document.getElementById('homepage-stat-theme');
    if (statTheme) statTheme.innerText = isDark ? 'Dark' : 'Light';

    // Update preset swatches display color according to active theme
    const swatches = document.querySelectorAll('.hbc-swatch:not(.custom-swatch)');
    swatches.forEach(sw => {
        const swatchColor = isDark ? (sw.dataset.darkColor || sw.dataset.color) : (sw.dataset.color || sw.dataset.darkColor);
        if (swatchColor) {
            sw.style.setProperty('--swatch-color', swatchColor);
        }
    });
}

window.handleThemeToggle = function(checked) {
    const theme = checked ? 'dark' : 'light';
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('themeMode', theme);
    }
    applyTheme(theme);
};

function hsvToRgb(h, s, v) {
    let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return {
        r: Math.round(f(5) * 255),
        g: Math.round(f(3) * 255),
        b: Math.round(f(1) * 255)
    };
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s, v };
}

function rgbToHex(r, g, b) {
    const toH = c => {
        const h = Math.max(0, Math.min(255, Math.round(c))).toString(16);
        return h.length === 1 ? '0' + h : h;
    };
    return `#${toH(r)}${toH(g)}${toH(b)}`.toUpperCase();
}

function hexToRgb(hex) {
    if (!hex) return { r: 139, g: 92, b: 246 };
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return { r: 139, g: 92, b: 246 };
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function renderHomepageSettings(s) {
    if (!s) return;

    // Theme Mode
    const currentTheme = s.themeMode || localStorage.getItem('ocal-settings-theme') || 'dark';
    const isDark = (currentTheme === 'dark');
    applyTheme(currentTheme);

    // Accent
    const currentAccent = (s.accentColor || localStorage.getItem('ocal-settings-accent') || '#09F0A0').toUpperCase();
    applyAccent(currentAccent);

    const presetNames = {
        '#15AC49': 'Emerald Green',
        '#09F0A0': 'Emerald Neon',
        '#2563EB': 'Ocean Sapphire',
        '#3B82F6': 'Electric Sapphire',
        '#7C3AED': 'Neon Violet',
        '#A855F7': 'Cyber Violet',
        '#EA580C': 'Sunset Coral',
        '#FB923C': 'Electric Coral',
        '#E11D48': 'Crimson Rose',
        '#F43F5E': 'Vivid Rose',
        '#D97706': 'Solar Amber',
        '#FACC15': 'Volt Yellow',
        '#0891B2': 'Electric Cyan',
        '#06B6D4': 'Aqua Cyan',
        '#0F172A': 'Slate Minimal',
        '#E2E8F0': 'Pure Slate'
    };

    const statAccent = document.getElementById('homepage-stat-accent');
    const customSwatch = document.getElementById('custom-accent-swatch');
    const customPopover = document.getElementById('custom-color-popover');
    const ccpCloseBtn = document.getElementById('ccp-close-btn');
    const satArea = document.getElementById('ccp-sat-area');
    const satPointer = document.getElementById('ccp-sat-pointer');
    const hueSlider = document.getElementById('ccp-hue-slider');
    const previewSwatch = document.getElementById('ccp-preview-swatch');
    const eyedropperBtn = document.getElementById('ccp-eyedropper-btn');
    const hexInput = document.getElementById('ccp-hex-input');
    const rInput = document.getElementById('ccp-r-input');
    const gInput = document.getElementById('ccp-g-input');
    const bInput = document.getElementById('ccp-b-input');
    const customBadge = document.getElementById('custom-color-badge');
    const customText = document.getElementById('custom-color-text');
    const customDot = document.getElementById('custom-color-dot');
    const presetSwatches = document.querySelectorAll('.hbc-swatch:not(.custom-swatch)');
    const paletteChips = document.querySelectorAll('.ccp-chip');

    let currentHsv = { h: 270, s: 0.63, v: 0.96 };
    let matchedPreset = false;

    function renderAISuggestions(hex) {
        if (!window.OcalColorHarmonizer || typeof window.OcalColorHarmonizer.analyzeColorIntelligence !== 'function') return;
        const info = window.OcalColorHarmonizer.analyzeColorIntelligence(hex);
        if (!info) return;

        const badge = document.getElementById('ccp-ai-mood-badge');
        const subInfo = document.getElementById('ccp-ai-sub-info');
        const grid = document.getElementById('ccp-ai-suggestions-grid');

        if (badge) badge.innerText = info.mood;
        if (subInfo) subInfo.innerHTML = `${info.temp} &bull; ${info.vibrancy} &bull; 98% Readability`;

        if (grid && Array.isArray(info.suggestions)) {
            grid.innerHTML = info.suggestions.map(s => `
                <div class="ccp-ai-chip" data-color="${s.color}" style="--chip-c: ${s.color};" title="Apply ${s.title}">
                    <span class="ccp-aic-dot" style="background: ${s.color};"></span>
                    <div class="ccp-aic-text">
                        <span class="ccp-aic-title">${s.title}</span>
                        <span class="ccp-aic-desc">${s.color}</span>
                    </div>
                    <span class="ccp-aic-tag">${s.tag}</span>
                </div>
            `).join('');

            grid.querySelectorAll('.ccp-ai-chip').forEach(chip => {
                chip.onclick = (e) => {
                    e.stopPropagation();
                    if (chip.dataset.color) {
                        setStudioFromHex(chip.dataset.color);
                    }
                };
            });
        }
    }

    function syncStudioUI(source = 'hsv') {
        const rgb = hsvToRgb(currentHsv.h, currentHsv.s, currentHsv.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

        if (satArea) satArea.style.backgroundColor = `hsl(${currentHsv.h}, 100%, 50%)`;
        if (satPointer) {
            satPointer.style.left = `${currentHsv.s * 100}%`;
            satPointer.style.top = `${(1 - currentHsv.v) * 100}%`;
        }
        if (hueSlider && source !== 'slider') hueSlider.value = currentHsv.h;
        if (previewSwatch) previewSwatch.style.setProperty('--preview-color', hex);
        if (customSwatch) customSwatch.style.setProperty('--swatch-color', hex);

        if (hexInput && source !== 'hex') hexInput.value = hex.replace('#', '');
        if (rInput && source !== 'rgb') rInput.value = rgb.r;
        if (gInput && source !== 'rgb') gInput.value = rgb.g;
        if (bInput && source !== 'rgb') bInput.value = rgb.b;

        if (customBadge) customBadge.style.display = 'inline-flex';
        if (customText) customText.innerText = hex;
        if (customDot) customDot.style.background = hex;
        if (statAccent) statAccent.innerText = `Custom (${hex})`;

        renderAISuggestions(hex);
        applyAccent(hex);
    }

    function setStudioFromHex(hex) {
        const rgb = hexToRgb(hex);
        currentHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        syncStudioUI('hex');
    }

    presetSwatches.forEach(sw => {
        const lightColor = (sw.dataset.color || '').toUpperCase();
        const darkColor = (sw.dataset.darkColor || '').toUpperCase();
        const isMatch = (currentAccent === lightColor || currentAccent === darkColor);
        
        sw.classList.toggle('active', isMatch);
        if (isMatch) {
            matchedPreset = true;
            if (statAccent) statAccent.innerText = sw.getAttribute('title') || presetNames[currentAccent] || 'Preset';
        }

        sw.onclick = () => {
            const chosenColor = isDark ? (sw.dataset.darkColor || sw.dataset.color) : (sw.dataset.color || sw.dataset.darkColor);
            presetSwatches.forEach(s2 => s2.classList.toggle('active', s2 === sw));
            if (customSwatch) customSwatch.classList.remove('active');
            if (customBadge) customBadge.style.display = 'none';
            if (customPopover) customPopover.style.display = 'none';
            
            applyAccent(chosenColor);
            if (statAccent) statAccent.innerText = sw.getAttribute('title') || 'Preset';
        };
    });

    // Custom Color Handling Initialization
    if (!matchedPreset && customSwatch) {
        customSwatch.classList.add('active');
        customSwatch.style.setProperty('--swatch-color', currentAccent);
        setStudioFromHex(currentAccent);
    } else if (customBadge) {
        customBadge.style.display = 'none';
    }

    // Custom Swatch Trigger & Popover Toggle
    if (customSwatch && customPopover) {
        customSwatch.onclick = () => {
            presetSwatches.forEach(s2 => s2.classList.remove('active'));
            customSwatch.classList.add('active');
            const isHidden = (customPopover.style.display === 'none' || !customPopover.style.display);
            customPopover.style.display = isHidden ? 'flex' : 'none';
            if (isHidden) {
                const activeCustom = localStorage.getItem('ocal-settings-accent') || '#8B5CF6';
                setStudioFromHex(activeCustom);
            }
        };
    }

    if (ccpCloseBtn && customPopover) {
        ccpCloseBtn.onclick = (e) => {
            e.stopPropagation();
            customPopover.style.display = 'none';
        };
    }

    // 2D Saturation / Value Canvas Dragging
    if (satArea) {
        const handleSatMove = (e) => {
            const rect = satArea.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let x = (clientX - rect.left) / rect.width;
            let y = (clientY - rect.top) / rect.height;
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));
            currentHsv.s = x;
            currentHsv.v = 1 - y;
            syncStudioUI('sat');
        };

        let isDragging = false;
        satArea.onmousedown = (e) => {
            isDragging = true;
            handleSatMove(e);
            const onMouseMove = (ev) => { if (isDragging) handleSatMove(ev); };
            const onMouseUp = () => {
                isDragging = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        satArea.ontouchstart = (e) => handleSatMove(e);
        satArea.ontouchmove = (e) => {
            e.preventDefault();
            handleSatMove(e);
        };
    }

    // Hue Slider
    if (hueSlider) {
        hueSlider.oninput = (e) => {
            currentHsv.h = parseInt(e.target.value, 10);
            syncStudioUI('slider');
        };
    }

    // Eyedropper API
    if (eyedropperBtn) {
        eyedropperBtn.onclick = async () => {
            if (window.EyeDropper) {
                try {
                    const eyeDropper = new window.EyeDropper();
                    const result = await eyeDropper.open();
                    if (result && result.sRGBHex) {
                        setStudioFromHex(result.sRGBHex);
                    }
                } catch (err) {
                    console.log('EyeDropper cancelled or dismissed');
                }
            } else {
                const hexVal = prompt('Enter color HEX (e.g. #09F0A0):', hexInput ? '#' + hexInput.value : '#8B5CF6');
                if (hexVal) setStudioFromHex(hexVal);
            }
        };
    }

    // Quick Palette Chips
    paletteChips.forEach(chip => {
        chip.onclick = () => {
            const chipColor = chip.dataset.color;
            if (chipColor) setStudioFromHex(chipColor);
        };
    });

    // Inputs: HEX and RGB
    if (hexInput) {
        hexInput.oninput = (e) => {
            let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
            if (val.length === 3 || val.length === 6) {
                setStudioFromHex('#' + val);
            }
        };
    }

    const handleRgbInput = () => {
        const r = Math.max(0, Math.min(255, parseInt(rInput.value, 10) || 0));
        const g = Math.max(0, Math.min(255, parseInt(gInput.value, 10) || 0));
        const b = Math.max(0, Math.min(255, parseInt(bInput.value, 10) || 0));
        currentHsv = rgbToHsv(r, g, b);
        syncStudioUI('rgb');
    };

    if (rInput) rInput.oninput = handleRgbInput;
    if (gInput) gInput.oninput = handleRgbInput;
    if (bInput) bInput.oninput = handleRgbInput;

    // Compact mode
    const compactCb = document.getElementById('compact-toggle-cb');
    if (compactCb) {
        const isCompact = !!(s.compactWorkspace || s.compactMode);
        compactCb.checked = isCompact;
    }

    // Bookmarks bar
    const bmCb = document.getElementById('bookmarks-bar-toggle-cb');
    if (bmCb) bmCb.checked = (s.bookmarkBarMode === 'always');

    // Show news
    const newsCb = document.getElementById('show-news-toggle-cb');
    if (newsCb) newsCb.checked = (s.showNewsHub !== false);

    // Tab Layout
    const tabLayout = s.tabLayout || 'horizontal';
    const tabCards = document.querySelectorAll('.tab-choice-card');
    tabCards.forEach(c => c.classList.toggle('active', c.dataset.value === tabLayout));
    const statLayout = document.getElementById('homepage-stat-layout');
    if (statLayout) statLayout.innerText = tabLayout === 'vertical' ? 'Vertical Arc' : 'Horizontal';

    // Vertical tabs collapse & width
    const vtCollapseCb = document.getElementById('vertical-tabs-collapsed-toggle-cb');
    if (vtCollapseCb) vtCollapseCb.checked = !!s.verticalTabsCollapsed;

    const vtWidth = s.verticalTabsWidth ? parseInt(s.verticalTabsWidth, 10) : 240;
    const vtWidthPills = document.querySelectorAll('#vt-width-grid .vt-pill-btn');
    vtWidthPills.forEach(p => p.classList.toggle('active', parseInt(p.dataset.value, 10) === vtWidth));

    // Force hide sidebar
    const forceHideCb = document.getElementById('force-hide-sidebar-toggle-cb');
    if (forceHideCb) forceHideCb.checked = (s.forceHideSidebar !== false);

    // Sidebar mode
    const sbMode = s.sidebarMode || 'hidden';
    const sbModePills = document.querySelectorAll('#sidebar-mode-grid .vt-pill-btn');
    sbModePills.forEach(p => p.classList.toggle('active', p.dataset.value === sbMode));

    // Sidebar app width
    const sbAppWidth = s.sidebarAppWidth ? parseInt(s.sidebarAppWidth, 10) : 880;
    const sbAppWidthPills = document.querySelectorAll('#sidebar-app-width-grid .vt-pill-btn');
    sbAppWidthPills.forEach(p => p.classList.toggle('active', parseInt(p.dataset.value, 10) === sbAppWidth));

    // Weather Location
    const weatherInp = document.getElementById('settings-weather-city-input');
    if (weatherInp) {
        weatherInp.value = localStorage.getItem('ocal-weather-loc') || s.weatherLocation || '';
    }
}

// ══════════════════════════════════════════════════════════════════════════
// OCAL AI ASSISTANT HOME-STYLE HANDLERS
// ══════════════════════════════════════════════════════════════════════════
window.selectAIEngine = function(engine) {
    window.electronAPI.updateSetting('aiEngine', engine);
    const cards = document.querySelectorAll('.ai-provider-card');
    cards.forEach(c => c.classList.toggle('active', c.dataset.value === engine));
    if (typeof updateAISettingsVisibility === 'function') {
        updateAISettingsVisibility(engine);
    }
    updateAIStats();
};

window.selectAIPersona = function(style) {
    window.electronAPI.updateSetting('aiResponseStyle', style);
    const pills = document.querySelectorAll('.ai-persona-card');
    pills.forEach(p => p.classList.toggle('active', p.dataset.value === style));
};

window.updateAIStats = function() {
    window.electronAPI.getSettings().then(s => {
        const engine = s.aiEngine || 'local';
        const statEngine = document.getElementById('ai-stat-engine');
        const statModel = document.getElementById('ai-stat-model');
        const statAgency = document.getElementById('ai-stat-agency');

        const engineLabels = {
            local: 'Local',
            gemini: 'Gemini',
            openai: 'ChatGPT',
            custom: 'Custom'
        };
        if (statEngine) statEngine.innerText = engineLabels[engine] || 'Local';

        if (statModel) {
            if (engine === 'local') statModel.innerText = (s.localModel || 'gemma-4').split(':')[0];
            else if (engine === 'gemini') statModel.innerText = 'Gemini 1.5';
            else if (engine === 'openai') statModel.innerText = 'GPT-4o';
            else if (engine === 'custom') statModel.innerText = (s.customModel || 'Custom').substring(0, 10);
            else statModel.innerText = 'Neural';
        }

        if (statAgency) {
            const isAgency = (s.aiAgencyEnabled !== false);
            statAgency.innerText = isAgency ? 'Autonomous' : 'Passive';
        }
    });
};

window.testAIPrompt = function() {
    const input = document.getElementById('ai-preview-input');
    if (!input || !input.value.trim()) return;
    const prompt = input.value.trim();

    if (window.electronAPI && window.electronAPI.send) {
        window.electronAPI.send('open-ai-chat-prompt', prompt);
    }
    input.value = '';
    alert(`Ocal AI received query: "${prompt}"\nProcessing with active neural backend...`);
};

function renderAISettings(s) {
    if (!s) return;

    // Active Engine
    const engine = s.aiEngine || 'local';
    const cards = document.querySelectorAll('.ai-provider-card');
    cards.forEach(c => c.classList.toggle('active', c.dataset.value === engine));
    if (typeof updateAISettingsVisibility === 'function') {
        updateAISettingsVisibility(engine);
    }

    // API Keys and inputs
    const geminiInp = document.getElementById('ai-api-key-input');
    if (geminiInp && s.aiApiKey !== undefined) geminiInp.value = s.aiApiKey || '';

    const openaiInp = document.getElementById('openai-api-key-input');
    if (openaiInp && s.openaiApiKey !== undefined) openaiInp.value = s.openaiApiKey || '';

    const customEndInp = document.getElementById('custom-endpoint-input');
    if (customEndInp && s.customEndpoint !== undefined) customEndInp.value = s.customEndpoint || '';

    const customModInp = document.getElementById('custom-model-input');
    if (customModInp && s.customModel !== undefined) customModInp.value = s.customModel || '';

    const customKeyInp = document.getElementById('custom-key-input');
    if (customKeyInp && s.customApiKey !== undefined) customKeyInp.value = s.customApiKey || '';

    const localEndInp = document.getElementById('local-endpoint-input');
    if (localEndInp && s.localEndpoint !== undefined) localEndInp.value = s.localEndpoint || 'http://localhost:11434';

    // Toggles
    const agencyCb = document.getElementById('ai-agency-toggle-cb');
    if (agencyCb && s.aiAgencyEnabled !== undefined) agencyCb.checked = (s.aiAgencyEnabled !== false);

    const heuristicCb = document.getElementById('ai-heuristic-toggle-cb');
    if (heuristicCb && s.aiHeuristicEnabled !== undefined) heuristicCb.checked = (s.aiHeuristicEnabled !== false);

    const deepScrapeCb = document.getElementById('ai-deep-scrape-toggle-cb');
    if (deepScrapeCb && s.aiDeepScrape !== undefined) deepScrapeCb.checked = (s.aiDeepScrape !== false);

    const showReasoningCb = document.getElementById('ai-show-reasoning-toggle-cb');
    if (showReasoningCb && s.aiShowReasoning !== undefined) showReasoningCb.checked = (s.aiShowReasoning !== false);

    // Sliders
    const tempSlider = document.getElementById('aiTemperature');
    const tempLabel = document.getElementById('label-ai-temp');
    if (tempSlider && s.aiTemperature !== undefined) {
        tempSlider.value = s.aiTemperature;
        if (tempLabel) tempLabel.innerText = parseFloat(s.aiTemperature).toFixed(1);
    }

    const tokensSlider = document.getElementById('aiMaxTokens');
    const tokensLabel = document.getElementById('label-ai-tokens');
    if (tokensSlider && s.aiMaxTokens !== undefined) {
        tokensSlider.value = s.aiMaxTokens;
        if (tokensLabel) tokensLabel.innerText = s.aiMaxTokens;
    }

    // Persona
    const persona = s.aiResponseStyle || 'detailed';
    const personaCards = document.querySelectorAll('.ai-persona-card');
    personaCards.forEach(p => p.classList.toggle('active', p.dataset.value === persona));

    // Stats bar
    updateAIStats();
}

// ══════════════════════════════════════════════════════════════════════════
// SYSTEM & HARDWARE HOME-STYLE HANDLERS
// ══════════════════════════════════════════════════════════════════════════
window.handleHardwareAccelToggle = function(checked) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('hardwareAcceleration', checked);
    }
    const statGpu = document.getElementById('system-stat-gpu');
    if (statGpu) statGpu.innerText = checked ? 'Direct3D 11' : 'Software';
};

window.handleConfirmExitToggle = function(checked) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('confirmExit', checked);
    }
};

window.handleBatterySaverToggle = function(checked) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('batterySaver', checked);
    }
};

window.handleMemoryPurgeToggle = function(checked) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('memoryPurge', checked);
    }
};

window.handleAskSaveToggle = function(checked) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('askSaveLocation', checked);
    }
};

window.handlePdfViewerToggle = function(checked) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('pdfViewerSandboxed', checked);
    }
};

window.handleDownloadScanToggle = function(checked) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('downloadSafetyScan', checked);
    }
};

window.handleChangeDownloadPath = async function() {
    if (window.electronAPI && window.electronAPI.invoke) {
        try {
            const selected = await window.electronAPI.invoke('select-download-directory');
            if (selected) {
                window.electronAPI.updateSetting('downloadPath', selected);
                const pathEl = document.getElementById('current-downloads-path');
                if (pathEl) pathEl.innerHTML = `<code>${selected}</code>`;
            }
        } catch (e) {
            console.warn('Dialog invocation fallback');
        }
    }
};

function renderSystemSettings(s) {
    if (!s) return;
    
    // Hardware acceleration
    const hwCb = document.getElementById('hardware-accel-toggle-cb');
    if (hwCb && s.hardwareAcceleration !== undefined) {
        hwCb.checked = (s.hardwareAcceleration !== false);
    }
    const statGpu = document.getElementById('system-stat-gpu');
    if (statGpu) statGpu.innerText = (s.hardwareAcceleration !== false) ? 'Direct3D 11' : 'Software';

    // Confirm exit
    const exitCb = document.getElementById('confirm-exit-toggle-cb');
    if (exitCb && s.confirmExit !== undefined) {
        exitCb.checked = (s.confirmExit !== false);
    }

    // Battery saver
    const battCb = document.getElementById('battery-saver-toggle-cb');
    if (battCb && s.batterySaver !== undefined) {
        battCb.checked = !!s.batterySaver;
    }

    // Memory purge
    const memCb = document.getElementById('memory-purge-toggle-cb');
    if (memCb && s.memoryPurge !== undefined) {
        memCb.checked = (s.memoryPurge !== false);
    }

    // Ask save location
    const saveCb = document.getElementById('ask-save-toggle-cb');
    if (saveCb && s.askSaveLocation !== undefined) {
        saveCb.checked = !!s.askSaveLocation;
    }

    // PDF viewer
    const pdfCb = document.getElementById('pdf-viewer-toggle-cb');
    if (pdfCb && s.pdfViewerSandboxed !== undefined) {
        pdfCb.checked = (s.pdfViewerSandboxed !== false);
    }

    // Download scan
    const scanCb = document.getElementById('download-scan-toggle-cb');
    if (scanCb && s.downloadSafetyScan !== undefined) {
        scanCb.checked = (s.downloadSafetyScan !== false);
    }

    // Download path
    if (s.downloadPath) {
        const pathEl = document.getElementById('current-downloads-path');
        if (pathEl) pathEl.innerHTML = `<code>${s.downloadPath}</code>`;
    }

    // Ambient Sound Studio
    renderAmbientSoundSettings(s);

    // Page Effects Studio
    renderPageFXSettings(s);
}

// ── Ambient Sound & Focus Studio Handlers ────────────────────────────────
let currentAmbientTracks = [];
let localAmbientState = {
    enabled: false,
    track: 'Ocal.mp3',
    volume: 0.35,
    smartDucking: true,
    duckVolume: 0.0
};

function getVolumeDescription(percent) {
    if (percent <= 0) return 'Muted (0%)';
    if (percent <= 15) return `Whisper Soft (${percent}%)`;
    if (percent <= 35) return `Soft & Relaxed (${percent}%)`;
    if (percent <= 65) return `Balanced Focus (${percent}%)`;
    if (percent <= 85) return `Energetic (${percent}%)`;
    return `Full Immersion (${percent}%)`;
}

window.handleAmbientSoundToggle = function(checked) {
    localAmbientState.enabled = checked;
    syncAmbientSettings();
    updateAmbientUIState();
};

window.handleAmbientTrackSelect = function(trackFileName) {
    localAmbientState.track = trackFileName;
    localAmbientState.enabled = true;
    syncAmbientSettings();
    renderAmbientTracks();
    updateAmbientUIState();
};

window.handleAmbientVolumeInput = function(val) {
    const num = parseInt(val, 10);
    const labelEl = document.getElementById('ambient-volume-val-label');
    if (labelEl) labelEl.textContent = getVolumeDescription(num);
    const statVol = document.getElementById('specials-stat-vol');
    if (statVol) statVol.textContent = `${num}%`;
    localAmbientState.volume = Math.max(0, Math.min(1, num / 100));
    syncAmbientSettings();
};

window.handleAmbientVolumeChange = function(val) {
    const num = parseInt(val, 10);
    localAmbientState.volume = Math.max(0, Math.min(1, num / 100));
    syncAmbientSettings();
};

window.handleAmbientVolumePreset = function(pct) {
    const slider = document.getElementById('ambient-volume-slider');
    if (slider) slider.value = pct;
    window.handleAmbientVolumeInput(pct);
    window.handleAmbientVolumeChange(pct);
};

window.handleAmbientDuckingToggle = function(checked) {
    localAmbientState.smartDucking = checked;
    syncAmbientSettings();
};

window.handleImportCustomAmbientTrack = async function() {
    if (window.electronAPI && window.electronAPI.selectCustomAmbientFile) {
        try {
            const newTrack = await window.electronAPI.selectCustomAmbientFile();
            if (newTrack) {
                if (!currentAmbientTracks.some(t => t.id === newTrack.id || t.fileName === newTrack.fileName)) {
                    currentAmbientTracks.push(newTrack);
                }
                localAmbientState.track = newTrack.fileName;
                localAmbientState.enabled = true;
                syncAmbientSettings();
                renderAmbientTracks();
                updateAmbientUIState();
            }
        } catch (err) {
            console.error('[Ambient] Failed to import track:', err);
        }
    }
};

function syncAmbientSettings() {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('ambientSound', { ...localAmbientState });
    }
}

function updateAmbientUIState() {
    const card = document.getElementById('ambient-sound-card');
    const toggleCb = document.getElementById('ambient-sound-toggle-cb');
    const badge = document.getElementById('ambient-status-badge');
    const statState = document.getElementById('specials-stat-state');
    const statStateBadge = document.getElementById('specials-stat-state-badge');
    const statTrack = document.getElementById('specials-stat-track');
    const statVol = document.getElementById('specials-stat-vol');
    
    // Vinyl, Equalizer, Pulse, and Hero Deck elements
    const vinylDisc = document.getElementById('ambient-vinyl-disc');
    const eqBars = document.getElementById('ambient-equalizer-bars');
    const pulseCard = document.getElementById('specials-pulse-card');
    const heroTitle = document.getElementById('ambient-hero-track-title');
    const heroPlayIcon = document.getElementById('ambient-hero-play-icon');

    if (toggleCb) toggleCb.checked = localAmbientState.enabled;
    if (card) {
        card.classList.toggle('ambient-active', localAmbientState.enabled);
    }
    if (badge) {
        if (localAmbientState.enabled) {
            badge.innerHTML = '<i class="fas fa-wave-square"></i> PLAYING LOOP';
            badge.classList.add('badge-playing');
        } else {
            badge.innerHTML = '<i class="fas fa-music"></i> AMBIENT STUDIO';
            badge.classList.remove('badge-playing');
        }
    }
    if (statState) {
        statState.textContent = localAmbientState.enabled ? 'Playing' : 'Ready';
        statState.style.color = localAmbientState.enabled ? 'var(--accent)' : 'inherit';
    }
    if (statStateBadge) {
        statStateBadge.className = localAmbientState.enabled ? 'sp-badge sp-badge-lime' : 'sp-badge sp-badge-gray';
    }
    const found = currentAmbientTracks.find(t => t.fileName === localAmbientState.track || t.id === localAmbientState.track);
    const trackName = found ? (found.name || found.fileName) : (localAmbientState.track || 'Ocal Theme');
    if (statTrack) {
        statTrack.textContent = trackName;
    }
    if (heroTitle) {
        heroTitle.textContent = trackName;
    }
    if (statVol) {
        statVol.textContent = `${Math.round(localAmbientState.volume * 100)}%`;
    }

    if (vinylDisc) {
        vinylDisc.classList.toggle('spinning', localAmbientState.enabled);
    }
    if (eqBars) {
        eqBars.classList.toggle('active', localAmbientState.enabled);
    }
    if (heroPlayIcon) {
        heroPlayIcon.className = localAmbientState.enabled ? 'fas fa-pause' : 'fas fa-play';
    }
    if (pulseCard) {
        const isRunning = localAmbientState.enabled || (localPageFXState && localPageFXState.enabled && localPageFXState.effect !== 'none');
        pulseCard.style.opacity = isRunning ? '1' : '0.7';
    }
}

window.handleAmbientNextTrack = function() {
    if (!currentAmbientTracks || currentAmbientTracks.length === 0) return;
    let idx = currentAmbientTracks.findIndex(t => t.fileName === localAmbientState.track || t.id === localAmbientState.track);
    idx = (idx + 1) % currentAmbientTracks.length;
    handleAmbientTrackSelect(currentAmbientTracks[idx].fileName || currentAmbientTracks[idx].id);
};

window.handleAmbientPrevTrack = function() {
    if (!currentAmbientTracks || currentAmbientTracks.length === 0) return;
    let idx = currentAmbientTracks.findIndex(t => t.fileName === localAmbientState.track || t.id === localAmbientState.track);
    idx = (idx - 1 + currentAmbientTracks.length) % currentAmbientTracks.length;
    handleAmbientTrackSelect(currentAmbientTracks[idx].fileName || currentAmbientTracks[idx].id);
};

window.handleAmbientVolumePreset = function(percent) {
    const slider = document.getElementById('ambient-volume-slider');
    if (slider) slider.value = percent;
    handleAmbientVolumeInput(percent);
    handleAmbientVolumeChange(percent);
};

window.handlePageFXIntensityPreset = function(percent) {
    const slider = document.getElementById('fx-intensity-slider');
    if (slider) slider.value = percent;
    handlePageFXIntensityInput(percent);
    handlePageFXIntensityChange(percent);
};

function renderAmbientTracks() {
    const grid = document.getElementById('ambient-tracks-grid');
    if (!grid) return;

    if (!currentAmbientTracks || currentAmbientTracks.length === 0) {
        currentAmbientTracks = [
            { id: 'Ocal.mp3', fileName: 'Ocal.mp3', name: 'Ocal Theme' },
            { id: 'ocal [usesuno.com].mp3', fileName: 'ocal [usesuno.com].mp3', name: 'Ocal Suno Beats' },
            { id: 'ocal [usesuno.com] (1).mp3', fileName: 'ocal [usesuno.com] (1).mp3', name: 'Ocal Suno Chill' },
            { id: 'ocal [usesuno.com] (2).mp3', fileName: 'ocal [usesuno.com] (2).mp3', name: 'Ocal Suno Focus' }
        ];
    }

    grid.innerHTML = currentAmbientTracks.map((t, idx) => {
        const isSelected = (t.fileName === localAmbientState.track || t.id === localAmbientState.track);
        return `
            <div class="ambient-track-card ${isSelected ? 'selected' : ''}" data-track-index="${idx}">
                <div class="atc-icon-wrap">
                    <i class="fas ${isSelected ? 'fa-circle-play' : 'fa-music'}"></i>
                </div>
                <div class="atc-info">
                    <span class="atc-title">${t.name || t.fileName}</span>
                    <span class="atc-sub">${isSelected ? 'Active Loop Track' : 'Click to select & loop'}</span>
                </div>
                ${isSelected ? '<span class="atc-active-pill"><i class="fas fa-check"></i></span>' : ''}
            </div>
        `;
    }).join('');

    // Safe direct click binding
    grid.querySelectorAll('.ambient-track-card').forEach(card => {
        const idx = parseInt(card.dataset.trackIndex, 10);
        const track = currentAmbientTracks[idx];
        if (track) {
            card.onclick = () => handleAmbientTrackSelect(track.fileName || track.id);
        }
    });
}

async function renderAmbientSoundSettings(s) {
    if (!s) return;
    if (s.ambientSound) {
        localAmbientState = {
            enabled: s.ambientSound.enabled === true,
            track: s.ambientSound.track || 'Ocal.mp3',
            volume: typeof s.ambientSound.volume === 'number' ? s.ambientSound.volume : 0.35,
            smartDucking: s.ambientSound.smartDucking !== false,
            duckVolume: 0.0
        };
    }

    // Load available tracks from main process
    if (window.electronAPI && window.electronAPI.getAmbientTracks) {
        try {
            const tracks = await window.electronAPI.getAmbientTracks();
            if (Array.isArray(tracks) && tracks.length > 0) {
                currentAmbientTracks = tracks;
            }
        } catch (e) {}
    }

    renderAmbientTracks();
    updateAmbientUIState();

    // Volume Slider & Label
    const volPercent = Math.round(localAmbientState.volume * 100);
    const slider = document.getElementById('ambient-volume-slider');
    if (slider) slider.value = volPercent;
    const labelEl = document.getElementById('ambient-volume-val-label');
    if (labelEl) labelEl.textContent = getVolumeDescription(volPercent);

    // Smart ducking checkbox
    const duckingCb = document.getElementById('ambient-ducking-toggle-cb');
    if (duckingCb) duckingCb.checked = localAmbientState.smartDucking;
}

// ── Page Effects & Visual Shaders Studio Handlers ───────────────────────
let localPageFXState = {
    enabled: false,
    effect: 'none',
    intensity: 1.0,
    global: true
};

const PAGE_FX_NAMES = {
    'none': 'Clean / None',
    'screen-broken': 'Screen Broken (Glass Crack)',
    'glitch': 'Cyberpunk Glitch (RGB Split)',
    'bw': 'B/W Noir & Film Grain',
    'system-wave': 'System Wave (Retro CRT)',
    'matrix': 'Matrix Digital Rain',
    'night-vision': 'Night Vision HUD',
    'thermal': 'Thermal Infrared Heatmap',
    'vaporwave': 'Vaporwave Sunset Neon',
    'sepia': 'Vintage Parchment',
    'invert': 'Dark Solarize Invert'
};

window.handlePageFXToggle = function(checked) {
    localPageFXState.enabled = checked;
    if (checked && localPageFXState.effect === 'none') {
        localPageFXState.effect = 'screen-broken';
    }
    syncPageFXSettings();
    updatePageFXUI();
};

window.handlePageFXSelect = function(effectId) {
    localPageFXState.effect = effectId;
    if (effectId !== 'none') {
        localPageFXState.enabled = true;
    }
    syncPageFXSettings();
    updatePageFXUI();
};

window.handlePageFXIntensityInput = function(val) {
    const num = parseInt(val, 10);
    const labelEl = document.getElementById('fx-intensity-val-label');
    if (labelEl) labelEl.textContent = `${num}% (${num > 75 ? 'Full FX' : num > 40 ? 'Moderate' : 'Subtle'})`;
    localPageFXState.intensity = Math.max(0.1, Math.min(1, num / 100));
    syncPageFXSettings();
    updatePageFXPreview();
};

window.handlePageFXIntensityChange = function(val) {
    const num = parseInt(val, 10);
    localPageFXState.intensity = Math.max(0.1, Math.min(1, num / 100));
    syncPageFXSettings();
    updatePageFXPreview();
};

window.handlePageFXIntensityPreset = function(pct) {
    const slider = document.getElementById('fx-intensity-slider');
    if (slider) slider.value = pct;
    window.handlePageFXIntensityInput(pct);
    window.handlePageFXIntensityChange(pct);
};

window.handlePageFXGlobalToggle = function(checked) {
    localPageFXState.global = checked;
    syncPageFXSettings();
};

function syncPageFXSettings() {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('pageEffect', { ...localPageFXState });
    }
}

function updatePageFXUI() {
    const card = document.getElementById('page-fx-card');
    const toggleCb = document.getElementById('page-fx-toggle-cb');
    const badge = document.getElementById('fx-status-badge');
    const statFx = document.getElementById('specials-stat-fx');
    const nameTag = document.getElementById('fx-active-name-tag');
    const cards = document.querySelectorAll('.fx-preset-card');

    if (toggleCb) toggleCb.checked = localPageFXState.enabled;
    if (card) {
        card.classList.toggle('fx-active', localPageFXState.enabled);
    }
    if (badge) {
        if (localPageFXState.enabled && localPageFXState.effect !== 'none') {
            badge.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> SHADER ACTIVE';
            badge.classList.add('badge-active');
        } else {
            badge.innerHTML = '<i class="fas fa-sparkles"></i> PAGE FX';
            badge.classList.remove('badge-active');
        }
    }
    if (statFx) {
        const effectName = localPageFXState.enabled ? (PAGE_FX_NAMES[localPageFXState.effect] || 'Active') : 'Clean';
        statFx.textContent = effectName.split(' ')[0];
        statFx.style.color = localPageFXState.enabled ? 'var(--accent)' : 'inherit';
    }
    if (nameTag) {
        const displayName = localPageFXState.enabled ? (PAGE_FX_NAMES[localPageFXState.effect] || localPageFXState.effect) : 'Clean / None';
        nameTag.textContent = `Effect: ${displayName}`;
    }

    // Highlight active preset card
    cards.forEach(c => {
        const eff = c.dataset.effect;
        const isActive = localPageFXState.enabled ? (eff === localPageFXState.effect) : (eff === 'none');
        c.classList.toggle('active', isActive);
    });

    updatePageFXPreview();
}

function updatePageFXPreview() {
    const layer = document.getElementById('fx-preview-shader-layer');
    if (!layer) return;

    // Reset classes
    layer.className = 'fx-preview-shader-layer';
    layer.style.opacity = localPageFXState.enabled ? `${localPageFXState.intensity}` : '0';

    if (localPageFXState.enabled && localPageFXState.effect !== 'none') {
        const shaderClass = `fx-shader-${localPageFXState.effect}`;
        layer.classList.add(shaderClass);
    }
}

function renderPageFXSettings(s) {
    if (!s) return;
    if (s.pageEffect) {
        localPageFXState = {
            enabled: s.pageEffect.enabled === true,
            effect: s.pageEffect.effect || 'none',
            intensity: typeof s.pageEffect.intensity === 'number' ? s.pageEffect.intensity : 1.0,
            global: s.pageEffect.global !== false
        };
    }

    updatePageFXUI();

    // Slider
    const intensitySlider = document.getElementById('fx-intensity-slider');
    if (intensitySlider) {
        const pct = Math.round(localPageFXState.intensity * 100);
        intensitySlider.value = pct;
        const labelEl = document.getElementById('fx-intensity-val-label');
        if (labelEl) labelEl.textContent = `${pct}% (${pct > 75 ? 'Full FX' : pct > 40 ? 'Moderate' : 'Subtle'})`;
    }

    // Global toggle
    const globalCb = document.getElementById('fx-global-toggle-cb');
    if (globalCb) globalCb.checked = localPageFXState.global;
}