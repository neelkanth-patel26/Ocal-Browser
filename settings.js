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
}

navItems.forEach(item => {
    item.onclick = async () => {
        if (item.classList.contains('active')) return;
        
        const current = document.querySelector('.section.active');
        const target = document.getElementById(item.dataset.section);
        
        if (current) {
            current.style.opacity = '0';
            current.style.filter = 'blur(10px) brightness(0.5)';
            current.style.transform = 'translateY(10px) scale(0.98)';
            await sleep(250);
            current.classList.remove('active');
            current.style.opacity = '';
            current.style.filter = '';
            current.style.transform = '';
        }

        if (target) {
            showSection(item.dataset.section);
            target.classList.add('active');
            target.style.opacity = '0';
            target.style.transform = 'translateY(-10px) scale(1.02)';
            target.style.filter = 'blur(10px)';
            // Trigger reflow
            target.offsetHeight; 
            target.style.transition = 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
            target.style.opacity = '1';
            target.style.transform = 'translateY(0) scale(1)';
            target.style.filter = 'blur(0px)';
        }
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
        };
    });
}
// Professional Update Sync
document.getElementById('update-check-btn').addEventListener('click', async () => {
    const btn = document.getElementById('update-check-btn');
    const title = document.getElementById('update-status-title');
    const desc = document.getElementById('update-status-desc');
    const fill = document.getElementById('update-progress-fill');
    const icon = document.getElementById('update-status-icon');

    btn.disabled = true;
    title.innerText = 'Checking for updates...';
    desc.innerText = 'Connecting to Ocal update servers.';
    icon.className = 'fas fa-arrows-rotate fa-spin';
    
    for(let i=0; i<=100; i+=5) {
        fill.style.width = i + '%';
        await sleep(40);
    }
    
    title.innerText = 'System up to date';
    desc.innerText = 'You are running the latest architectural build.';
    icon.className = 'fas fa-check';
    btn.innerText = 'UP TO DATE';
    btn.style.opacity = '0.5';
});

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
            }, 1500);
        }
    };
});

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

// Profiles
function renderProfiles(s) {
    const grid = document.getElementById('profile-grid');
    if (!grid) return;
    grid.innerHTML = s.profiles.map(p => `
        <div class="glass-card profile-card ${s.currentProfileId === p.id ? 'active' : ''}" onclick="window.electronAPI.switchProfile('${p.id}')">
            <div class="profile-icon-container" style="background: ${s.currentProfileId === p.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}; color: ${s.currentProfileId === p.id ? '#000' : 'var(--text)'};">
                <i class="fas ${p.icon}"></i>
            </div>
            <h5>${p.name}</h5>
            ${s.currentProfileId === p.id ? '<div class="protection-badge" style="background: var(--accent); color:#000; font-size:9px; margin-top:8px;">ACTIVE</div>' : ''}
        </div>
    `).join('') + `
        <div class="glass-card profile-card" style="opacity:0.4; border-style:dashed; cursor: pointer;">
            <div class="profile-icon-container"><i class="fas fa-plus"></i></div>
            <h5>New Profile</h5>
        </div>
    `;
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

            const latest = await window.electronAPI.checkForUpdate();
            updateHub.classList.remove('scanning');
            
            console.log('Update Check:', {
                currentVersion: currentVer,
                latestVersion: latest ? latest.version : 'none'
            });
            
            if (latest && isNewerVersion(latest.version, currentVer)) {
                showUpdateInfo(latest);
            } else {
                updateStatusT.innerText = "Version Up to Date";
                updateStatusD.innerText = "You are running the latest production build of Ocal.";
                updateStatusI.className = "fas fa-check-double";
                updateStatusI.style.color = "#10b981";
                updateStatusI.style.opacity = "1";
                
                updateBtn.innerHTML = 'Up to Date <i class="fas fa-check"></i>';
                updateBtn.style.background = '#10b981';
                
                setTimeout(() => { 
                    updateStatusT.innerText = "System Check";
                    updateStatusD.innerText = "Scanning for new dimensions of Ocal.";
                    updateStatusI.className = "fas fa-shield-check";
                    updateStatusI.style.color = ""; updateStatusI.style.opacity = "0.5";
                    updateBtn.innerHTML = 'Check for Update <i class="fas fa-bolt"></i>';
                    updateBtn.style.background = ''; updateBtn.disabled = false;
                }, 4000);
            }
        } catch(e) { 
            updateHub.classList.remove('scanning');
            updateBtn.innerText = 'Error checking'; updateBtn.disabled = false; 
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
        showSection('general');
    }
});

function showUpdateInfo(latest) {
    updateStatusT.innerText = "New Update Available";
    updateStatusD.innerText = `Ocal v${latest.version} is now ready for deployment.`;
    updateStatusI.className = "fas fa-cloud-arrow-down";
    updateStatusI.style.color = "var(--accent)";
    updateStatusI.style.opacity = "1";

    updateExpanded.style.display = 'block';
    document.getElementById('update-notes').innerHTML = `<h4>WHAT'S NEW IN V${latest.version}</h4>` + 
        latest.notes.split('\n').filter(l => l.trim()).map(l => `<p>${l.replace(/^-\s*/, '')}</p>`).join('');
    
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
    setGridValue('tile-style-grid', s.homeTileStyle || 'square');
    
    initGridSelector('search-grid', 'searchEngine');
    initGridSelector('dns-grid', 'dns');
    initGridSelector('bookmark-bar-grid', 'bookmarkBarMode');
    initGridSelector('tile-style-grid', 'homeTileStyle');
    
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
    
    if (s.homeTileSize) window.updateHomeSetting('homeTileSize', s.homeTileSize, true);
    if (s.homeTileSpacing) window.updateHomeSetting('homeTileSpacing', s.homeTileSpacing, true);
    
    initToggle('compact-toggle', 'compactMode', s.compactMode);
    initToggle('ask-save-toggle', 'askSavePath', s.askSavePath);
    initToggle('tracking-toggle', 'trackingProtection', s.trackingProtection);
    initToggle('tracking-toggle-security', 'trackingProtection', s.trackingProtection);
    initToggle('search-suggest-toggle', 'searchSuggest', s.searchSuggest);
    initToggle('safe-browsing-toggle', 'safeBrowsing', s.safeBrowsing);
    initToggle('auto-update-toggle', 'autoCheckUpdates', s.autoCheckUpdates);
    
    updateProtectionLevel(s);
    renderProfiles(s);

    // Initial section based on hash
    const hash = window.location.hash.replace('#', '');
    if (hash && Array.from(sections).some(sec => sec.id === hash)) {
        showSection(hash);
    }
});

function updateProtectionLevel(s) {
    const badge = document.getElementById('protection-badge');
    if(!badge) return;
    
    const score = (s.safeBrowsing ? 1 : 0) + (s.trackingProtection ? 1 : 0);
    if (score === 2) {
        badge.innerText = "Maximum Protection Active";
        badge.style.background = "var(--accent)";
        badge.style.color = "#000";
    } else if (score === 1) {
        badge.innerText = "Standard Protection";
        badge.style.background = "rgba(245, 158, 11, 0.2)";
        badge.style.color = "#f59e0b";
    } else {
        badge.innerText = "Minimal Protection";
        badge.style.background = "rgba(239, 68, 68, 0.2)";
        badge.style.color = "#ef4444";
    }
}

window.electronAPI.onSettingsChanged(s => {
    if (s.accentColor) applyAccent(s.accentColor);
    updateProtectionLevel(s);
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
