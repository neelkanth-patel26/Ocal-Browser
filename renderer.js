const addressInput = document.getElementById('address-input');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const tabList = document.getElementById('tab-list');
const newTabBtn = document.getElementById('new-tab-btn');

// State
let tabs = [];
let activeTabId = null;

// Tab Management UI
function renderTabs() {
    tabList.innerHTML = '';
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;
        tabEl.innerHTML = `
            <i class="fas fa-globe" style="font-size: 10px; opacity: 0.7;"></i>
            <span class="tab-title">${tab.title || 'New Tab'}</span>
            <i class="fas fa-times tab-close" data-id="${tab.id}"></i>
        `;
        tabEl.onclick = (e) => {
            if (e.target.classList.contains('tab-close')) return;
            activeTabId = tab.id;
            window.electronAPI.switchTab(tab.id);
            renderTabs();
        };
        tabList.appendChild(tabEl);
    });

    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            window.electronAPI.closeTab(id);
            // Don't filter here - wait for 'tab-closed' event from main process
        };
    });
}

window.electronAPI.onTabClosed((id) => {
    tabs = tabs.filter(t => t.id !== id);
    if (activeTabId === id) {
        activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
    }
    renderTabs();
});

window.electronAPI.onTabCreated((tab) => {
    tabs.push(tab);
    activeTabId = tab.id;
    renderTabs();
});

window.electronAPI.onUpdateURL((data) => {
    const tab = tabs.find(t => t.id === data.id);
    if (tab) {
        tab.url = data.url;
        tab.title = data.title;
        if (data.id === activeTabId) {
            addressInput.value = data.url;
            updateHeartIcon(); // Ensure bookmark icon also updates
        }
    }
    renderTabs();
});

window.electronAPI.onUpdateTitle((data) => {
    const tab = tabs.find(t => t.id === data.id);
    if (tab) {
        tab.title = data.title;
    }
    renderTabs();
});

newTabBtn.onclick = () => window.electronAPI.newTab();

// Navigation Controls
addressInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    window.electronAPI.navigateTo(addressInput.value);
    addressInput.blur();
  }
});

backBtn.onclick = () => window.electronAPI.goBack();
forwardBtn.onclick = () => window.electronAPI.goForward();
reloadBtn.onclick = () => window.electronAPI.reload();

// Window Controls
document.getElementById('min-btn').onclick = () => window.electronAPI.minimize();
document.getElementById('max-btn').onclick = () => window.electronAPI.maximize();
document.getElementById('close-btn').onclick = () => window.electronAPI.close();

// Right Sidebar Logic
const sidebar = document.getElementById('right-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const sidebarSettings = document.getElementById('sidebar-settings-btn');
const burgerBtn = document.getElementById('burger-menu-btn');
const mainBody = document.getElementById('main-body');
let sidebarOpenState = false;

function toggleSidebar(forceClose = false) {
    if (forceClose) sidebarOpenState = false;
    else sidebarOpenState = !sidebarOpenState;
    
    if (sidebarOpenState) {
        sidebar.classList.add('open');
    } else {
        sidebar.classList.remove('open');
    }
    
    // Tell main process to adjust View bounds
    window.electronAPI.toggleSidebar(sidebarOpenState);
}

burgerBtn.onclick = (e) => {
    e.stopPropagation();
    toggleSidebar();
};

closeSidebar.onclick = () => toggleSidebar(true);

sidebarSettings.onclick = () => {
    window.electronAPI.navigateTo('settings');
    toggleSidebar(true);
};

// Global click to close sidebar if clicking outside
window.onclick = (e) => {
    if (sidebarOpenState && !sidebar.contains(e.target) && !burgerBtn.contains(e.target)) {
        toggleSidebar(true);
    }
};

function changeBg(color) {
    mainBody.style.backgroundImage = 'none';
    mainBody.style.background = color;
    document.querySelector('.tab-bar').style.background = color;
    window.electronAPI.updateSetting('accentColor', color);
}

function changeWp(url) {
    if (url === 'default') {
        mainBody.style.backgroundImage = 'none';
        mainBody.style.background = '#070707';
    } else {
        mainBody.style.backgroundImage = `url('${url}')`;
        mainBody.style.backgroundSize = 'cover';
        mainBody.style.backgroundPosition = 'center';
    }
    window.electronAPI.updateSetting('homeBackground', url);
    
    // Update active state in UI
    document.querySelectorAll('.wp-card').forEach(c => {
        if (c.getAttribute('onclick').includes(url)) c.classList.add('active');
        else c.classList.remove('active');
    });
}

window.changeBg = changeBg;
window.changeWp = changeWp;

// Applying Global Settings
function applyGlobalSettings(settings) {
    if (settings.accentColor) {
        document.documentElement.style.setProperty('--accent', settings.accentColor);
    }
    if (settings.compactMode) {
        document.body.classList.add('compact-mode');
    } else {
        document.body.classList.remove('compact-mode');
    }
}

// Initial Load
window.electronAPI.getSettings().then(settings => {
    applyGlobalSettings(settings);
    syncTopbarSettings(settings); // Initial sync
});

// Topbar Settings Sync
const engineIconTop = document.getElementById('engine-icon-top');

async function syncTopbarSettings(settings = null) {
    const currentSettings = settings || await window.electronAPI.getSettings();
    const engine = currentSettings.searchEngine;
    
    const icons = {
        google: 'fab fa-google',
        bing: 'fas fa-b',
        duckduckgo: 'fas fa-duck'
    };
    
    if (engineIconTop) {
        engineIconTop.className = icons[engine] || 'fas fa-search';
    }
}

window.electronAPI.onSettingsChanged((settings) => {
    syncTopbarSettings(settings);
    applyGlobalSettings(settings);
});

syncTopbarSettings();

// Bookmark System
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarksList = document.getElementById('bookmarks-list');
const topBookmarkBar = document.getElementById('top-bookmark-bar');
let currentBookmarks = [];

function renderBookmarks() {
    if (!bookmarksList) return;
    
    // Render Sidebar List
    if (currentBookmarks.length === 0) {
        bookmarksList.innerHTML = '<div class="empty-msg">No bookmarks yet.</div>';
    } else {
        bookmarksList.innerHTML = currentBookmarks.map(b => `
            <div class="bookmark-item" onclick="window.electronAPI.navigateTo('${b.url}'); toggleSidebar(true);">
                <i class="fas fa-bookmark"></i>
                <div class="bookmark-info">
                    <span class="bookmark-title">${b.title}</span>
                    <span class="bookmark-url">${b.url}</span>
                </div>
            </div>
        `).join('');
    }

    // Render Top Bookmark Bar
    if (topBookmarkBar) {
        if (currentBookmarks.length === 0) {
            topBookmarkBar.innerHTML = '';
            topBookmarkBar.classList.add('hidden');
        } else {
            topBookmarkBar.classList.remove('hidden');
            topBookmarkBar.innerHTML = currentBookmarks.map(b => `
                <div class="bookmark-bar-item" onclick="window.electronAPI.navigateTo('${b.url}')">
                    <i class="far fa-folder"></i>
                    <span>${b.title}</span>
                </div>
            `).join('');
        }
    }

    // Update heart icon state
    updateHeartIcon();
}

function updateHeartIcon() {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab || !currentTab.url) {
        bookmarkBtn.className = 'far fa-heart action-icon';
        return;
    }

    const isBookmarked = currentBookmarks.some(b => b.url === currentTab.url);
    bookmarkBtn.className = isBookmarked ? 'fas fa-heart action-icon' : 'far fa-heart action-icon';
    if (isBookmarked) bookmarkBtn.style.color = 'var(--accent, #a855f7)';
    else bookmarkBtn.style.color = '';
}

bookmarkBtn.onclick = () => {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab && currentTab.url) {
        window.electronAPI.toggleBookmark({
            title: currentTab.title || 'Untitled',
            url: currentTab.url
        });
    }
};

window.electronAPI.onBookmarksUpdated((bookmarks) => {
    currentBookmarks = bookmarks;
    renderBookmarks();
});

// Initial load
window.electronAPI.getSettings().then(settings => {
    if (settings.bookmarks) {
        currentBookmarks = settings.bookmarks;
        renderBookmarks();
    }
});

// Update icons when tab switches or URL changes
window.electronAPI.onUpdateURL(() => {
    // wait for data to settle or just react
    setTimeout(updateHeartIcon, 100);
});
