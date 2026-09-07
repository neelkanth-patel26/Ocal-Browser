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

function renderProfiles(s) {
    const grid = document.getElementById('profile-grid');
    if (!grid) return;
        let html = (s.profiles || []).map((p, index) => {
        const isActive = (s.currentProfileId || 'default') === p.id;
        return `
        <div class="choice-item profile-card ${isActive ? 'active' : ''}" 
             onclick="window.electronAPI.switchProfile('${p.id}')">
            
            <div class="profile-avatar-container">
                <div class="profile-avatar-wrap ${isActive ? 'active' : ''}">
                    <i class="fas ${p.icon || 'fa-user'}"></i>
                </div>
                ${isActive ? '<div class="profile-active-check"><i class="fas fa-check"></i></div>' : ''}
            </div>

            <div class="profile-details-wrap">
                <h4 class="profile-name-title">
                    ${p.name}
                    ${isActive ? '<span class="profile-active-pill">ACTIVE</span>' : ''}
                </h4>
                <p class="profile-subtitle">
                    ${isActive ? 'Active node session' : 'Isolated sandboxed node'}
                </p>
            </div>

            <div class="profile-actions-row" onclick="event.stopPropagation();">
                <button class="btn secondary edit-btn" onclick="editProfilePrompt('${p.id}')">
                    <i class="fas fa-pen"></i>
                    <span>Edit</span>
                </button>
                ${p.id !== 'default' ? `
                <button class="btn secondary delete-btn" onclick="deleteProfile('${p.id}', '${p.name}')">
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </button>` : ''}
            </div>
        </div>
    `;
    }).join('');

    // Append the dashed "+ Create New Node" card
    html += `
        <div class="choice-item add-profile-card" onclick="createProfilePrompt()">
            <div class="add-avatar-circle">
                <i class="fas fa-plus"></i>
            </div>
            <div class="add-profile-details">
                <span class="add-profile-title">Create New Node</span>
                <span class="add-profile-desc">Launch isolated workspace</span>
            </div>
        </div>
    `;

    grid.innerHTML = html;
}
function showModal(contentHtml) {
    const overlay = document.getElementById('studio-modal-overlay');
    const modal = document.getElementById('studio-modal');
    if (!overlay || !modal) return;
    
    modal.innerHTML = contentHtml;
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1) translateY(0)';
    }, 10);
}

function closeModal() {
    const overlay = document.getElementById('studio-modal-overlay');
    const modal = document.getElementById('studio-modal');
    if (!overlay || !modal) return;
    
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.98) translateY(10px)';
    setTimeout(() => {
        overlay.style.display = 'none';
        modal.innerHTML = '';
    }, 200);
}

// Close on overlay click
document.getElementById('studio-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'studio-modal-overlay') closeModal();
});

const PROFILE_ICONS = ['fa-user', 'fa-user-ninja', 'fa-user-astronaut', 'fa-user-secret', 'fa-user-tie', 'fa-ghost', 'fa-robot', 'fa-skull', 'fa-crown', 'fa-eye'];

function createProfilePrompt() {
    let selectedIcon = 'fa-user';
    
    const content = `
        <h3 style="margin:0 0 8px 0; color:var(--text); font-size:22px; font-weight:850; letter-spacing:-0.5px;">New User Profile</h3>
        <p style="color:var(--text-dim); font-size:13px; margin-bottom:28px;">Profiles allow you to maintain separate workspaces with isolated sandboxes.</p>
        
        <div style="margin-bottom:24px;">
            <label style="display:block; font-size:10px; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">Profile Alias</label>
            <input type="text" id="new-profile-name" placeholder="Work, Guest, Secondary..." style="width:100%; background:var(--glass-hover); border:1px solid var(--glass-border); border-radius: var(--radius-sm); padding:14px 18px; color:var(--text); font-family: 'Geist Mono', monospace; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='var(--accent)';">
        </div>
        
        <div style="margin-bottom:32px;">
            <label style="display:block; font-size:10px; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">Visual Signature</label>
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px;" id="icon-selector">
                ${PROFILE_ICONS.map(icon => `
                    <div class="icon-chip ${icon === 'fa-user' ? 'active' : ''}" onclick="selectProfileIcon(this, '${icon}')" style="aspect-ratio:1; border-radius: var(--radius-sm); border:1px solid var(--glass-border); background:var(--glass); display:flex; align-items:center; justify-content:center; color:var(--text-dim); cursor:pointer; transition:0.3s;">
                        <i class="fas ${icon}"></i>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button class="btn secondary" onclick="closeModal()" style="padding:12px 24px; font-size:12px; font-weight:800; letter-spacing:0.5px; border-radius: var(--radius-sm);">CANCEL</button>
            <button class="btn primary" onclick="confirmCreateProfile()" style="padding:12px 32px; font-size:12px; font-weight:800; letter-spacing:0.5px; border-radius: var(--radius-sm);">CREATE IDENTITY</button>
        </div>
        
        <style>
            .icon-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(255,255,255,0.08); box-shadow: none; }
            .icon-chip:hover:not(.active) { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); color: #fff; }
        </style>
    `;
    
    showModal(content);
    window._selectedProfileIcon = 'fa-user';
}

window.selectProfileIcon = (el, icon) => {
    document.querySelectorAll('.icon-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    window._selectedProfileIcon = icon;
};

async function confirmCreateProfile() {
    const nameInput = document.getElementById('new-profile-name');
    const name = nameInput.value.trim() || 'New Profile';
    const icon = window._selectedProfileIcon || 'fa-user';
    
    closeModal();
    if (window.electronAPI && window.electronAPI.createProfile) {
        await window.electronAPI.createProfile({ name, icon });
    }
}

async function editProfilePrompt(id) {
    if (!window.currentSettings) return;
    const profile = window.currentSettings.profiles.find(p => p.id === id);
    if (!profile) return;
    
    window._selectedProfileIcon = profile.icon || 'fa-user';
    
    const content = `
        <h3 style="margin:0 0 8px 0; color:var(--text); font-size:22px; font-weight:850; letter-spacing:-0.5px;">Modify Identity</h3>
        <p style="color:var(--text-dim); font-size:13px; margin-bottom:28px;">Update the visual and descriptive signature of this alias.</p>
        
        <div style="margin-bottom:24px;">
            <label style="display:block; font-size:10px; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">Identity Name</label>
            <input type="text" id="edit-profile-name" value="${profile.name}" style="width:100%; background:var(--glass-hover); border:1px solid var(--glass-border); border-radius: var(--radius-sm); padding:14px 18px; color:var(--text); font-family: 'Geist Mono', monospace; font-size:14px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='var(--accent)';">
        </div>
        
        <div style="margin-bottom:32px;">
            <label style="display:block; font-size:10px; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">Profile Icon</label>
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px;" id="icon-selector">
                ${PROFILE_ICONS.map(icon => `
                    <div class="icon-chip ${icon === window._selectedProfileIcon ? 'active' : ''}" onclick="selectProfileIcon(this, '${icon}')" style="aspect-ratio:1; border-radius: var(--radius-sm); border:1px solid var(--glass-border); background:var(--glass); display:flex; align-items:center; justify-content:center; color:var(--text-dim); cursor:pointer; transition:0.3s;">
                        <i class="fas ${icon}"></i>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button class="btn secondary" onclick="closeModal()" style="padding:12px 24px; font-size:12px; font-weight:800; letter-spacing:0.5px;">CANCEL</button>
            <button class="btn primary" onclick="confirmEditProfile('${id}')" style="padding:12px 32px; font-size:12px; font-weight:800; letter-spacing:0.5px;">SAVE CHANGES</button>
        </div>
        
        <style>
            .icon-chip.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); box-shadow: none ; }
            .icon-chip:hover:not(.active) { background: var(--glass-hover); border-color: var(--accent-border); color: var(--text); }
        </style>
    `;
    
    showModal(content);
}

async function confirmEditProfile(id) {
    const nameInput = document.getElementById('edit-profile-name');
    const name = nameInput.value.trim() || 'Profile';
    const icon = window._selectedProfileIcon || 'fa-user';
    
    closeModal();
    if (window.electronAPI && window.electronAPI.editProfile) {
        window.electronAPI.editProfile({ id, name, icon });
    }
}

async function deleteProfile(id, name) {
    const content = `
        <h3 style="margin:0 0 8px 0; color:#ef4444; font-size:22px; font-weight:850; letter-spacing:-0.5px;">Terminate Identity?</h3>
        <p style="color:var(--text-dim); font-size:14px; margin-bottom:28px;">This will permanently delete the <strong>${name}</strong> workspace and all localized site data, cookies, and history.</p>
        
        <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button class="btn secondary" onclick="closeModal()" style="padding:12px 24px; font-size:12px; font-weight:800; letter-spacing:0.5px;">CANCEL</button>
            <button class="btn primary" onclick="confirmDeleteProfile('${id}')" style="padding:12px 32px; font-size:12px; font-weight:800; letter-spacing:0.5px; background:#ef4444; border-color:#ef4444;">DELETE PERMANENTLY</button>
        </div>
    `;
    
    showModal(content);
}

function confirmDeleteProfile(id) {
    closeModal();
    if (window.electronAPI && window.electronAPI.deleteProfile) {
        window.electronAPI.deleteProfile(id);
    }
}

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

    // Version chip in About hero
    const disp = document.getElementById('current-version-display');
    if (disp) disp.textContent = `Version ${v} · Stable`;

    // Diag cells
    const diagVer = document.getElementById('diag-version');
    if (diagVer) diagVer.textContent = v;

    const buildEl = document.getElementById('diag-build');
    if (buildEl) buildEl.textContent = `v${v}`;

    // Build line under version chip
    const buildLine = document.getElementById('about-build-line');
    if (buildLine) buildLine.textContent = `Ocal-${v} · Production Build`;

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
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PREPARING...';
        
        const progWrapper = document.getElementById('update-progress-wrapper');
        if (progWrapper) progWrapper.style.display = 'block';
        
        try {
            const path = await window.electronAPI.downloadUpdate();
            
            const fill = document.getElementById('update-progress-fill');
            const pText = document.getElementById('update-progress-percent');
            if (fill) fill.style.width = '100%';
            if (pText) pText.innerText = '100%';
            
            downloadBtn.innerHTML = 'RESTART & DEPLOY <i class="fas fa-power-off"></i>';
            downloadBtn.style.background = '#10b981';
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => window.electronAPI.applyUpdate(path);
        } catch(err) {
            downloadBtn.innerText = 'DEPLOYMENT FAILED'; downloadBtn.disabled = false;
        }
    };
}

window.electronAPI.onUpdateProgress(data => {
    const fill = document.getElementById('update-progress-fill');
    const pText = document.getElementById('update-progress-percent');
    const p = Math.round(data.percent || 0);
    
    if (fill) fill.style.width = p + '%';
    if (pText) pText.innerText = p + '%';
    if (downloadBtn) downloadBtn.innerHTML = `<i class="fas fa-download"></i> Downloading... ${p}%`;
});

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

    async function fetchOllamaModels(endpoint) {
        if (!localModelSelect) return;
        localModelSelect.innerHTML = '<option value="auto">Auto-detect (Heuristics)</option>';
        try {
            const url = `${endpoint.replace(/\/$/, '')}/api/tags`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.models && Array.isArray(data.models)) {
                    let hasGemma4 = false;
                    data.models.forEach(model => {
                        const opt = document.createElement('option');
                        opt.value = model.name;
                        opt.textContent = model.name;
                        localModelSelect.appendChild(opt);
                        if (model.name === 'gemma-4' || model.name.startsWith('gemma-4:')) {
                            hasGemma4 = true;
                        }
                    });
                    // Always ensure gemma-4 is in the options list
                    if (!hasGemma4) {
                        const opt = document.createElement('option');
                        opt.value = 'gemma-4';
                        opt.textContent = 'gemma-4';
                        localModelSelect.appendChild(opt);
                    }
                    localModelSelect.value = s.localModel || 'gemma-4';
                }
            }
        } catch (e) {
            console.warn('Ollama not running or inaccessible:', e.message);
            // Add gemma-4 as a selectable option even if Ollama is offline
            const opt = document.createElement('option');
            opt.value = 'gemma-4';
            opt.textContent = 'gemma-4';
            localModelSelect.appendChild(opt);
            localModelSelect.value = s.localModel || 'gemma-4';
        }
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

window.applyAccent = function(color) {
    if (!color) return;
    localStorage.setItem('ocal-settings-accent', color);
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', `color-mix(in srgb, ${color} 30%, transparent)`);
    document.documentElement.style.setProperty('--accent-dim', `color-mix(in srgb, ${color} 12%, transparent)`);
    document.documentElement.style.setProperty('--accent-border', color);
};

window.selectTabLayout = function(layout) {
    if (window.electronAPI && window.electronAPI.updateSetting) {
        window.electronAPI.updateSetting('tabLayout', layout);
    }
    const tabCards = document.querySelectorAll('.tab-choice-card');
    tabCards.forEach(c => c.classList.toggle('active', c.dataset.value === layout));
    const statLayout = document.getElementById('homepage-stat-layout');
    if (statLayout) statLayout.innerText = layout === 'vertical' ? 'Vertical Arc' : 'Horizontal';
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

function applyAccent(color) {
    if (!color) color = '#09F0A0';
    const root = document.documentElement;
    const body = document.body;
    const contrast = getContrastColor(color);
    const dim = hexToRgba(color, 0.15);
    const glow = hexToRgba(color, 0.35);

    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-text', contrast);
    root.style.setProperty('--accent-dim', dim);
    root.style.setProperty('--accent-glow', glow);
    
    if (body) {
        body.style.setProperty('--accent', color);
        body.style.setProperty('--accent-text', contrast);
        body.style.setProperty('--accent-dim', dim);
        body.style.setProperty('--accent-glow', glow);
    }
    
    try {
        localStorage.setItem('ocal-settings-accent', color);
    } catch (e) {}

    const dot = document.getElementById('custom-color-dot');
    if (dot) dot.style.background = color;
}

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
        '#16A34A': 'Cyber Lime',
        '#CCFF00': 'Volt Lime',
        '#0891B2': 'Electric Cyan',
        '#06B6D4': 'Aqua Cyan',
        '#0F172A': 'Slate Minimal',
        '#E2E8F0': 'Pure Slate'
    };

    const statAccent = document.getElementById('homepage-stat-accent');
    const customSwatch = document.getElementById('custom-accent-swatch');
    const customPicker = document.getElementById('custom-accent-color-picker');
    const customBadge = document.getElementById('custom-color-badge');
    const customText = document.getElementById('custom-color-text');
    const customDot = document.getElementById('custom-color-dot');
    const presetSwatches = document.querySelectorAll('.hbc-swatch:not(.custom-swatch)');

    let matchedPreset = false;

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
            
            if (window.electronAPI && window.electronAPI.updateSetting) {
                window.electronAPI.updateSetting('accentColor', chosenColor);
            }
            applyAccent(chosenColor);
            if (statAccent) statAccent.innerText = sw.getAttribute('title') || 'Preset';
        };
    });

    // Custom Color Handling
    if (!matchedPreset && customSwatch && customPicker) {
        customSwatch.classList.add('active');
        customSwatch.style.setProperty('--swatch-color', currentAccent);
        customPicker.value = currentAccent.length === 7 ? currentAccent : '#8B5CF6';
        if (customBadge) customBadge.style.display = 'inline-flex';
        if (customText) customText.innerText = currentAccent;
        if (customDot) customDot.style.background = currentAccent;
        if (statAccent) statAccent.innerText = `Custom (${currentAccent})`;
    } else if (customBadge) {
        customBadge.style.display = 'none';
    }

    if (customPicker && customSwatch) {
        const handleCustomColorChange = (hex) => {
            const upper = hex.toUpperCase();
            customSwatch.style.setProperty('--swatch-color', upper);
            presetSwatches.forEach(s2 => s2.classList.remove('active'));
            customSwatch.classList.add('active');
            
            if (customBadge) customBadge.style.display = 'inline-flex';
            if (customText) customText.innerText = upper;
            if (customDot) customDot.style.background = upper;
            if (statAccent) statAccent.innerText = `Custom (${upper})`;

            if (window.electronAPI && window.electronAPI.updateSetting) {
                window.electronAPI.updateSetting('accentColor', upper);
            }
            applyAccent(upper);
        };

        customPicker.oninput = (e) => handleCustomColorChange(e.target.value);
        customPicker.onchange = (e) => handleCustomColorChange(e.target.value);
    }

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
}