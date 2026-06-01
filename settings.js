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
    document.title = `Ocal Settings — ${sectionName}`;
    
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
    };
};

// Grid Selectors — works with both .grid-item and .choice-item
function initGridSelector(gridId, settingsKey) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll('.grid-item, .choice-item').forEach(item => {
        item.onclick = () => {
            const val = item.dataset.value;
            grid.querySelectorAll('.grid-item, .choice-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            window.electronAPI.updateSetting(settingsKey, val);
            
            // Special case for custom search visibility
            if (gridId === 'search-grid') {
                const customContainer = document.getElementById('custom-search-container');
                if (customContainer) customContainer.style.display = (val === 'custom') ? 'block' : 'none';
            }

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
    grid.querySelectorAll('.grid-item, .choice-item').forEach(item => {
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
function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    const glow = color.replace(')', ', 0.3)').replace('rgb', 'rgba').replace('hsl', 'hsla');
    document.documentElement.style.setProperty('--accent-glow', glow);
    
    dots.forEach(d => d.classList.toggle('active', d.dataset.color === color));
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('ocal-settings-theme', theme);
}


// Home Page Controls
window.updateHomeLayout = function(layout, skipUpdate = false) {
    document.querySelectorAll('#homepage .choice-item').forEach(c => {
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
    
    let html = (s.profiles || []).map((p, index) => `
        <div class="choice-item profile-card ${s.currentProfileId === p.id ? 'active' : ''}" 
             onclick="window.electronAPI.switchProfile('${p.id}')"
             style="display: flex; flex-direction: column; align-items: center; padding: 24px; gap: 14px; position: relative; transition: var(--spring-transition); border-radius: var(--radius-lg); background: var(--glass); border: 1px solid var(--glass-border); cursor: pointer;">
            
            <div style="position: relative;">
                <div class="profile-avatar-wrap" style="width: 64px; height: 64px; background: ${s.currentProfileId === p.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${s.currentProfileId === p.id ? '#000' : 'var(--text-dim)'}; font-size: 26px; border: 2px solid ${s.currentProfileId === p.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)'}; transition: all 0.3s;">
                    <i class="fas ${p.icon || 'fa-user'}"></i>
                </div>
                ${s.currentProfileId === p.id ? '<div style="position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; background: #4ade80; border-radius: 50%; border: 2px solid var(--background); display: flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="font-size: 9px; color: #000;"></i></div>' : ''}
            </div>

            <div style="text-align: center; width: 100%;">
                <h4 style="font-size: 15px; margin: 0 0 4px 0; font-weight: 700; color: var(--text); display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${p.name}
                    ${s.currentProfileId === p.id ? '<span style="font-size: 9px; color: #4ade80; font-weight: 800; background: rgba(74, 222, 128, 0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(74, 222, 128, 0.2);">ACTIVE</span>' : ''}
                </h4>
                <p style="font-size: 12px; color: var(--text-dim); line-height: 1.4; margin: 0;">
                    ${s.currentProfileId === p.id ? 'Active node session' : 'Isolated sandboxed node'}
                </p>
            </div>

            <div style="display: flex; gap: 8px; width: 100%; margin-top: 10px; justify-content: center;" onclick="event.stopPropagation();">
                <button class="btn secondary" onclick="editProfilePrompt('${p.id}')" 
                        style="flex: 1; max-width: 100px; padding: 6px 12px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 600;">
                    <i class="fas fa-pen" style="font-size: 9px;"></i>
                    <span>Edit</span>
                </button>
                ${p.id !== 'default' ? `
                <button class="btn secondary" onclick="deleteProfile('${p.id}', '${p.name}')" 
                        style="flex: 1; max-width: 100px; padding: 6px 12px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 600; color: #ef4444; border-color: rgba(239, 68, 68, 0.15); background: rgba(239, 68, 68, 0.04);" 
                        onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444';" 
                        onmouseout="this.style.background='rgba(239, 68, 68, 0.04)';">
                    <i class="fas fa-trash" style="font-size: 9px;"></i>
                    <span>Delete</span>
                </button>` : ''}
            </div>
        </div>
    `).join('');

    // Append the dashed "+ Create New Node" card
    html += `
        <div class="choice-item add-profile-card" onclick="createProfilePrompt()" 
             style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 14px; border-radius: var(--radius-lg); cursor: pointer; transition: var(--spring-transition); min-height: 184px; text-align: center;">
            <div class="add-avatar-circle" style="width: 52px; height: 52px; border-radius: 50%; border: 1px dashed var(--text-muted); display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 20px; transition: all 0.3s; background: rgba(255, 255, 255, 0.02);">
                <i class="fas fa-plus"></i>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 13px; font-weight: 700; color: var(--text-dim); transition: color 0.2s;">Create New Node</span>
                <span style="font-size: 11px; color: var(--text-muted);">Launch isolated workspace</span>
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
    
    // Convert to the minimalist catalog style
    return `<div style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 11px; color: var(--text-dim); white-space: pre-wrap;">` + 
        markdown
        .replace(/^##\s+(.*)/gm, '<strong style="color: var(--text);">$1</strong>')
        .replace(/^###\s+(.*)/gm, '<strong style="color: var(--accent);">$1</strong>')
        .replace(/^\*\s+(.*)/gm, '• $1')
        .replace(/^- \s+(.*)/gm, '• $1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1') +
        `</div>`;
};

const currentVersionHighlights = `
    <div style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 11px; color: var(--text-dim); white-space: pre-wrap; line-height: 1.5; padding: 10px;">
<strong style="color: var(--text); font-size: 13px;">V4.3.09-BETA</strong>
OCAL BROWSER - UPDATE CATALOG Version: 4.3.09-beta Release Date: April 15, 2026 ----------------------------------------------------------------------- [UI & AESTHETICS: GLASS 3.0] ----------
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

• COMPLETED MODERNIZATION: Fully implemented the "Glass 3.0" design language across 
  all core browser components.
• MODAL SYSTEM: Refined the "Confirm Exit" and general modal interfaces with 
  multi-layered glass borders, high-saturation backdrop blurs, and premium fade-in animations.
• TAB DEEP STYLE: Replaced complex tab gradients with a flat, minimalist 
  accent-colored side indicator to match the "Home" page aesthetic.
• FLOATING ISLANDS: Standardized 10px spacing and 16px corner rounding across 
  all contextual dropdowns and persistent UI modules.
• LIGHT MODE (FLASHBANG): Implemented a perfectly flat, high-contrast professional 
  aesthetic. System-wide removal of box-shadow and blur for maximum clarity.

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
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
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else {
        showSection('dashboard');
    }
});

function showUpdateInfo(latest) {
    updateStatusT.innerText = "New Update Available";
    updateStatusD.innerText = `Ocal v${latest.version} is now ready for deployment.`;
    updateStatusI.className = "fas fa-cloud-arrow-down";
    updateStatusI.style.color = "var(--accent)";
    updateStatusI.style.opacity = "1";

    updateExpanded.style.display = 'block';
    
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
        try {
            const path = await window.electronAPI.downloadUpdate();
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
    if (fill) fill.style.width = data.percent + '%';
    if (downloadBtn) downloadBtn.innerHTML = `<i class="fas fa-download"></i> Downloading... ${data.percent}%`;
});

// Initialize Settings
window.electronAPI.getSettings().then(s => {
    if (s.accentColor) applyAccent(s.accentColor);
    setGridValue('search-grid', s.searchEngine || 'google');
    setGridValue('dns-grid', s.dns || 'default');
    setGridValue('bookmark-bar-grid', s.bookmarkBarMode || 'auto');
    setGridValue('tile-style-grid', s.homeTileStyle || 'glass-array');
    
    initGridSelector('search-grid', 'searchEngine');
    initGridSelector('dns-grid', 'dns');
    initGridSelector('bookmark-bar-grid', 'bookmarkBarMode');
    initGridSelector('tile-style-grid', 'homeTileStyle');
    initGridSelector('theme-mode-grid', 'themeMode');
    
    if (s.themeMode) applyTheme(s.themeMode);
    else localStorage.setItem('ocal-settings-theme', 'dark'); // Default fallback
    setGridValue('theme-mode-grid', s.themeMode || 'dark');
    
    // Custom Search URL Specific Logic
    const customInp = document.getElementById('custom-search-input');
    if (customInp) {
        customInp.value = s.customSearchUrl || '';
        customInp.onchange = () => {
            window.electronAPI.updateSetting('customSearchUrl', customInp.value);
        };
    }
    const customContainer = document.getElementById('custom-search-container');
    if (customContainer) {
        customContainer.style.display = (s.searchEngine === 'custom') ? 'block' : 'none';
    }

    if (s.homeLayout) window.updateHomeLayout(s.homeLayout, true);
    if (s.homeTileStyle) setGridValue('tile-style-grid', s.homeTileStyle);
    
    // Initialize tile style radio buttons
    const tileStyleRadios = document.querySelectorAll('input[name="tile-style"]');
    tileStyleRadios.forEach(radio => {
        if (radio.dataset.value === s.homeTileStyle) {
            radio.checked = true;
        }
        radio.addEventListener('change', () => {
            if (radio.checked) {
                window.electronAPI.updateSetting('homeTileStyle', radio.dataset.value);
            }
        });
    });
    
    if (s.homeTileSize) window.updateHomeSetting('homeTileSize', s.homeTileSize, true);
    if (s.homeTileSpacing) window.updateHomeSetting('homeTileSpacing', s.homeTileSpacing, true);
    
    // Homepage Widgets
    initToggle('show-todo-toggle', 'showDailyFocus', s.showDailyFocus !== false);
    initToggle('show-timer-toggle', 'showFocusFlow', s.showFocusFlow !== false);
    initToggle('show-weather-toggle', 'showWeather', s.showWeather !== false);

    initToggle('compact-toggle', 'compactMode', s.compactMode);
    initToggle('ask-save-toggle', 'askSavePath', s.askSavePath);
    initToggle('pdf-viewer-toggle', 'pdfViewerEnabled', s.pdfViewerEnabled !== false);
    initToggle('search-suggest-toggle', 'searchSuggest', s.searchSuggest);
    initToggle('auto-update-toggle', 'autoCheckUpdates', s.autoCheckUpdates);
    initToggle('confirm-exit-toggle', 'confirmExit', s.confirmExit !== false);
    initToggle('battery-saver-toggle', 'batterySaver', s.batterySaver);
    
    // Security Hub Toggles
    initToggle('safe-browsing-toggle', 'safeBrowsingEnabled', s.safeBrowsingEnabled);
    initToggle('tracking-toggle-security', 'trackingProtection', s.trackingProtection);
    initToggle('https-toggle', 'httpsUpgradeEnabled', s.httpsUpgradeEnabled);
    initToggle('dislike-toggle-security', 'youtubeDislikeEnabled', s.youtubeDislikeEnabled !== false);
    initToggle('media-master-toggle-security', 'mediaMasterEnabled', s.mediaMasterEnabled !== false);

    if (s.dnsProvider) setGridValue('dns-grid', s.dnsProvider);
    initGridSelector('dns-grid', 'dnsProvider');
    
    updateProtectionLevel(s);
    renderProfiles(s);
    renderExtensions(s);
    
    if (s.searchEngine) setGridValue('search-engine-grid', s.searchEngine);
    
    // Initialize search engine radio buttons
    const searchEngineRadios = document.querySelectorAll('input[name="search-engine"]');
    const searchEngineRows = document.querySelectorAll('[data-search-engine]');
    
    searchEngineRadios.forEach(radio => {
        if (radio.value === s.searchEngine) {
            radio.checked = true;
        }
    });
    
    searchEngineRows.forEach(row => {
        row.addEventListener('click', () => {
            const engine = row.dataset.searchEngine;
            const radio = row.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                window.electronAPI.updateSetting('searchEngine', engine);
                
                // Show/hide custom search container
                const customContainer = document.getElementById('custom-search-container');
                if (customContainer) {
                    customContainer.style.display = (engine === 'custom') ? 'block' : 'none';
                }
            }
        });
    });
    
    if (s.customSearchUrl) {
        const customInput = document.getElementById('custom-search-input');
        if (customInput) customInput.value = s.customSearchUrl;
        if (s.searchEngine === 'custom') document.getElementById('custom-search-container').style.display = 'block';
    }

    initToggle('instant-search-toggle', 'instantSearchEnabled', s.instantSearchEnabled);
    initToggle('safe-search-toggle', 'safeSearchEnabled', s.safeSearchEnabled);
    
    // AI Assistant Settings
    const aiKeyInp = document.getElementById('ai-api-key-input');
    if (aiKeyInp) {
        aiKeyInp.value = s.aiApiKey || '';
        aiKeyInp.onchange = () => window.electronAPI.updateSetting('aiApiKey', aiKeyInp.value);
    }
    setGridValue('ai-engine-grid', s.aiEngine || 'local');
    initGridSelector('ai-engine-grid', 'aiEngine');

    initToggle('ai-deep-scrape-toggle', 'aiDeepScrape', s.aiDeepScrape !== false);
    initToggle('ai-show-reasoning-toggle', 'aiShowReasoning', s.aiShowReasoning !== false);
    initToggle('ai-agency-toggle', 'aiAgencyEnabled', s.aiAgencyEnabled !== false);
    initToggle('ai-heuristic-toggle', 'aiHeuristicEnabled', s.aiHeuristicEnabled !== false);
    setGridValue('ai-style-grid', s.aiResponseStyle || 'concise');
    initGridSelector('ai-style-grid', 'aiResponseStyle');

    updateShieldDashboard(s.shieldStats || { ads: 0, trackers: 0 });

    // Initial section based on hash
    const hash = window.location.hash.replace('#', '');
    if (hash && Array.from(sections).some(sec => sec.id === hash)) {
        showSection(hash);
    }
});


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
    const heroIcon = document.querySelector('.shield-hero-icon i');
    const heroDesc = document.querySelector('.shield-desc');
    if(!badge) return;
    
    const score = (s.safeBrowsingEnabled ? 1 : 0) + (s.adBlockEnabled !== false ? 1 : 0) + (s.httpsUpgradeEnabled ? 1 : 0);
    
    if (score === 3) {
        badge.innerHTML = '<i class="fas fa-circle-check"></i> Maximum Protection Active';
        badge.className = "shield-status-badge ok";
        if (heroIcon) heroIcon.className = "fas fa-shield-halved";
        if (heroDesc) heroDesc.innerText = "All protection layers are active and monitoring your connection.";
    } else if (score >= 1) {
        badge.innerHTML = '<i class="fas fa-circle-exclamation"></i> Standard Protection';
        badge.className = "shield-status-badge warning";
        if (heroIcon) heroIcon.className = "fas fa-shield-halved";
        if (heroDesc) heroDesc.innerText = "Some protection layers are disabled. Review your settings for maximum safety.";
    } else {
        badge.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Protection Reduced';
        badge.className = "shield-status-badge warning";
        badge.style.background = "rgba(239, 68, 68, 0.15)";
        badge.style.color = "#ef4444";
        if (heroIcon) heroIcon.className = "fas fa-shield";
        if (heroDesc) heroDesc.innerText = "Your browsing logic is currently at risk. Enable safeguards to stay protected.";
    }
}

// Security Feature Handlers
window.toggleSecurityFeature = (key, el) => {
    const isOn = el.classList.toggle('on');
    window.electronAPI.send('set-security-toggle', { key, value: isOn });
};

// Extensions Management
window.loadUnpackedExtension = async () => {
    try {
        const result = await window.electronAPI.loadUnpackedExtension();
        if (result) {
            alert(`Successfully loaded local extension: ${result.name}`);
            window.electronAPI.getSettings().then(s => renderExtensions(s));
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

    builtins.forEach(ext => {
        const card   = document.getElementById(`ext-${ext.id}`);
        const status = document.getElementById(`status-${ext.id}`);
        const toggle = document.getElementById(ext.toggleId);
        if (!card) return;

        const isActive = ext.key === 'adBlockEnabled' ? (s[ext.key] !== false) : !!s[ext.key];

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
    if (!grid) return;

    grid.querySelectorAll('.dynamic-ext').forEach(el => el.remove());

    if (s.extensions && s.extensions.length > 0) {
        s.extensions.forEach(ext => {
            const el = document.createElement('div');
            el.className = 'card ext-card-row dynamic-ext' + (ext.enabled ? ' is-active' : '');
            el.dataset.extname = (ext.name || '').toLowerCase();
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.padding = '20px';
            el.innerHTML = `
                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: rgba(251,146,60,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fb923c; font-size: 18px; flex-shrink: 0;">
                            <i class="fas fa-puzzle-piece"></i>
                        </div>
                        <div>
                            <h4 style="font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 4px 0;">${ext.name}</h4>
                            <div style="font-size: 11px; color: var(--text-muted);">Version ${ext.version || '?'} &middot; ID: ${ext.id}</div>
                        </div>
                    </div>
                    <label class="ext-toggle-wrap">
                        <input type="checkbox" ${ext.enabled ? 'checked' : ''}
                            onchange="window.electronAPI.toggleExtension('${ext.id}', this.checked); setTimeout(() => window.electronAPI.getSettings().then(s => renderExtensions(s)), 100);">
                        <span class="ext-slider"></span>
                    </label>
                </div>
                <div style="font-size: 13px; color: var(--text-dim); line-height: 1.5; flex: 1;">
                    ${ext.description || 'No description provided.'}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--glass-border);">
                    <span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; color: var(--text-muted); letter-spacing: 0.5px;">${ext.isLocal ? 'LOCAL' : 'INSTALLED'}</span>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: ${ext.enabled ? '#4ade80' : 'var(--text-muted)'};">
                            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${ext.enabled ? '#4ade80' : 'var(--text-muted)'};"></span>
                            ${ext.enabled ? 'Active' : 'Disabled'}
                        </span>
                        ${ext.isLocal ? `<button class="btn secondary" style="padding: 4px 10px; font-size: 11px;" onclick="window.electronAPI.removeExtension('${ext.id}').then(() => window.electronAPI.getSettings().then(s => renderExtensions(s)))"><i class="fas fa-trash"></i> Remove</button>` : `<button class="btn secondary" style="padding: 4px 10px; font-size: 11px;" onclick="window.open('https://chromewebstore.google.com/detail/${ext.id}')">View</button>`}
                    </div>
                </div>
            `;
            grid.appendChild(el);
        });
    }

    if (window.filterExtSettings) window.filterExtSettings();
}

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
window.toggleSecurityFeature = (key, el) => {
    const isOn = el.classList.toggle('on');
    window.electronAPI.send('set-security-toggle', { key, value: isOn });
};

window.toggleSearchFeature = window.toggleSecurityFeature;

document.getElementById('custom-search-input')?.addEventListener('input', (e) => {
    window.electronAPI.send('set-security-toggle', { key: 'customSearchUrl', value: e.target.value });
});

// DNS Grid
document.getElementById('dns-grid').addEventListener('click', (e) => {
    const item = e.target.closest('.choice-item');
    if (!item) return;
    const val = item.dataset.value;
    setGridValue('dns-grid', val);
    window.electronAPI.send('set-dns-provider', val);
});

// Dashboard Telemetry Simulation
function startDashboardTelemetry() {
    setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
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
    updateProtectionLevel(s);
    renderExtensions(s);
    renderProfiles(s);
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
    
    if (statusText && setBtn) {
        if (isDefault) {
            statusText.innerText = "Ocal is your default browser.";
            setBtn.innerText = "Default";
            setBtn.disabled = true;
            setBtn.classList.remove('primary');
            setBtn.classList.add('secondary');
            setBtn.style.opacity = "0.5";
            setBtn.style.cursor = "default";
        } else {
            statusText.innerText = "Ocal is not currently your default browser.";
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
        const success = await window.electronAPI.setAsDefaultBrowser();
        setDefaultBtn.innerText = "Opening Settings...";
        
        // Re-check periodically for a few seconds as the user might change it in the OS settings
        let checks = 0;
        const interval = setInterval(async () => {
            await checkDefaultBrowser();
            checks++;
            if (checks > 20) clearInterval(interval);
        }, 1000);
    };
}

// Initial check
checkDefaultBrowser();

// Also check when window regains focus (user might have changed it in OS settings)
window.onfocus = checkDefaultBrowser;

// ── Global Settings Real-time Card Search ──
window.filterGlobalSettings = function() {
    const query = document.getElementById('settings-global-search')?.value.toLowerCase().trim() || '';
    const currentSection = document.querySelector('.section.active');
    if (!currentSection) return;
    
    // Filter cards and rows inside the active section
    const groups = currentSection.querySelectorAll('.group');
    const cards = currentSection.querySelectorAll('.card, .pref-module, .ext-card-row, .ext-item-card, .about-card, .update-card, .shortcut-row');
    
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        const match = !query || text.includes(query);
        card.style.display = match ? '' : 'none';
    });
    
    // Filter parent groups / grids based on visibility
    groups.forEach(group => {
        const visibleItems = Array.from(group.querySelectorAll('.card, .pref-module, .ext-card-row, .ext-item-card, .about-card, .update-card, .shortcut-row')).some(c => c.style.display !== 'none');
        group.style.display = (visibleItems || !query) ? '' : 'none';
    });
};
