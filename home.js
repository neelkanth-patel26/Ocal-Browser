/**
 * Ocal Browser Home Logic - Premium Polish & Entry
 */

if (window.location.hash === '#drag-overlay') {
    document.documentElement.classList.add('drag-overlay-mode');
    if (document.body) {
        document.body.classList.add('drag-overlay-mode');
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.classList.add('drag-overlay-mode');
        });
    }
}

const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// ── Elements ─────────────────────────────────────────────────────
const clockEl = document.getElementById('clock');
const greetingTxt = document.getElementById('greeting-txt');
const dateTxt = document.getElementById('date-txt');
const searchInput = document.getElementById('main-search-input') || document.getElementById('home-search');
const searchBtn = document.getElementById('main-search-btn') || document.getElementById('search-btn');
const todoInput = document.getElementById('todo-input');
const todoListEl = document.getElementById('todo-list');
const timerDisplay = document.getElementById('timer-display');
const timerToggle = document.getElementById('timer-toggle');
const timerReset = document.getElementById('timer-reset');
const dashMain = document.getElementById('dashboard-main');

let currentSearchEngine = 'google';

function updateSearchEngineLogo(engine) {
    const logoContainer = document.getElementById('search-engine-logo');
    if (!logoContainer) return;

    if (engine === 'google') {
        logoContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98 1.06-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>`;
    } else if (engine === 'bing') {
        logoContainer.innerHTML = '<i class="fas fa-b" style="color: #00a1f1; font-size: 18px;"></i>';
    } else if (engine === 'duckduckgo') {
        logoContainer.innerHTML = '<i class="fas fa-shield-cat" style="color: #de5833; font-size: 18px;"></i>';
    } else if (engine === 'brave') {
        logoContainer.innerHTML = '<i class="fa-brands fa-brave" style="color: #ff1b2d; font-size: 20px;"></i>';
    } else if (engine === 'yahoo') {
        logoContainer.innerHTML = '<i class="fa-brands fa-yahoo" style="color: #6001d2; font-size: 20px;"></i>';
    } else {
        logoContainer.innerHTML = '<i class="fas fa-magnifying-glass" style="color: var(--accent); font-size: 18px;"></i>';
    }
}

// ── Entry Animation ──
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// ── Tick (Clock & Dynamic Greeting) ──────────────────────────────
function updateTick() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (clockEl) clockEl.innerHTML = `${String(hours).padStart(2, '0')}<span class="clock-colon">:</span>${String(minutes).padStart(2, '0')}`;

    if (greetingTxt) {
        let greet = 'GOOD NIGHT';
        if (hours >= 5 && hours < 12) greet = 'GOOD MORNING';
        else if (hours >= 12 && hours < 17) greet = 'GOOD AFTERNOON';
        else if (hours >= 17 && hours < 21) greet = 'GOOD EVENING';
        greetingTxt.textContent = greet;
    }

    if (dateTxt) dateTxt.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    const clockMini = document.getElementById('clock-mini');
    if (clockMini) clockMini.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
setInterval(updateTick, 1000);
updateTick();

// ── Search Logic ───────────────────────────────────────────────
function navigateToTargetUrl(url) {
    if (window.electronAPI && typeof window.electronAPI.navigateTo === 'function') {
        window.electronAPI.navigateTo(url);
    } else if (typeof require !== 'undefined') {
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('navigate-to', url);
        } catch (e) {
            window.location.href = url;
        }
    } else {
        window.location.href = url;
    }
}

function executeSearch() {
    const inputEl = document.getElementById('main-search-input') || document.getElementById('home-search');
    if (!inputEl) return;
    const q = inputEl.value.trim();
    if (!q) return;

    let targetUrl = '';
    if (/^https?:\/\//i.test(q)) {
        targetUrl = q;
    } else if (/^[\w-]+\.[a-z]{2,}/i.test(q) && !q.includes(' ')) {
        targetUrl = 'https://' + q;
    } else {
        let searchUrl = 'https://www.google.com/search?q=';
        if (currentSearchEngine === 'bing') searchUrl = 'https://www.bing.com/search?q=';
        else if (currentSearchEngine === 'duckduckgo') searchUrl = 'https://duckduckgo.com/?q=';
        else if (currentSearchEngine === 'brave') searchUrl = 'https://search.brave.com/search?q=';
        else if (currentSearchEngine === 'yahoo') searchUrl = 'https://search.yahoo.com/search?p=';
        
        targetUrl = searchUrl + encodeURIComponent(q);
    }

    navigateToTargetUrl(targetUrl);
}

const activeSearchInput = document.getElementById('main-search-input') || document.getElementById('home-search');
const activeSearchBtn = document.getElementById('main-search-btn') || document.getElementById('search-btn');

if (activeSearchInput) {
    activeSearchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeSearch();
        }
    });
}
if (activeSearchBtn) {
    activeSearchBtn.onclick = (e) => {
        e.preventDefault();
        executeSearch();
    };
}

// ── Quick Launch Shortcuts Manager & AI Icon Engine ─────────────
const DEFAULT_QUICK_SHORTCUTS = [
    { id: 'yt', title: 'YouTube', url: 'https://youtube.com', iconType: 'fa', iconValue: 'fab fa-youtube', isCustom: false },
    { id: 'sp', title: 'Spotify', url: 'https://spotify.com', iconType: 'fa', iconValue: 'fab fa-spotify', isCustom: false },
    { id: 'am', title: 'Amazon', url: 'https://amazon.com', iconType: 'fa', iconValue: 'fab fa-amazon', isCustom: false },
    { id: 'dc', title: 'Discord', url: 'https://discord.com', iconType: 'fa', iconValue: 'fab fa-discord', isCustom: false },
    { id: 'gh', title: 'GitHub', url: 'https://github.com', iconType: 'fa', iconValue: 'fab fa-github', isCustom: false },
    { id: 'tw', title: 'Twitter / X', url: 'https://x.com', iconType: 'fa', iconValue: 'fab fa-x-twitter', isCustom: false },
    { id: 'rd', title: 'Reddit', url: 'https://reddit.com', iconType: 'fa', iconValue: 'fab fa-reddit', isCustom: false }
];

const BRAND_ICON_MAP = {
    'youtube': { icon: 'fab fa-youtube', name: 'YouTube' },
    'youtu.be': { icon: 'fab fa-youtube', name: 'YouTube' },
    'spotify': { icon: 'fab fa-spotify', name: 'Spotify' },
    'amazon': { icon: 'fab fa-amazon', name: 'Amazon' },
    'discord': { icon: 'fab fa-discord', name: 'Discord' },
    'github': { icon: 'fab fa-github', name: 'GitHub' },
    'gitlab': { icon: 'fab fa-gitlab', name: 'GitLab' },
    'twitter': { icon: 'fab fa-x-twitter', name: 'Twitter / X' },
    'x.com': { icon: 'fab fa-x-twitter', name: 'X' },
    'reddit': { icon: 'fab fa-reddit', name: 'Reddit' },
    'google': { icon: 'fab fa-google', name: 'Google' },
    'gmail': { icon: 'fas fa-envelope', name: 'Gmail' },
    'facebook': { icon: 'fab fa-facebook', name: 'Facebook' },
    'fb.com': { icon: 'fab fa-facebook', name: 'Facebook' },
    'instagram': { icon: 'fab fa-instagram', name: 'Instagram' },
    'tiktok': { icon: 'fab fa-tiktok', name: 'TikTok' },
    'linkedin': { icon: 'fab fa-linkedin', name: 'LinkedIn' },
    'twitch': { icon: 'fab fa-twitch', name: 'Twitch' },
    'steam': { icon: 'fab fa-steam', name: 'Steam' },
    'pinterest': { icon: 'fab fa-pinterest', name: 'Pinterest' },
    'whatsapp': { icon: 'fab fa-whatsapp', name: 'WhatsApp' },
    'telegram': { icon: 'fab fa-telegram', name: 'Telegram' },
    'apple': { icon: 'fab fa-apple', name: 'Apple' },
    'microsoft': { icon: 'fab fa-microsoft', name: 'Microsoft' },
    'dropbox': { icon: 'fab fa-dropbox', name: 'Dropbox' },
    'trello': { icon: 'fab fa-trello', name: 'Trello' },
    'slack': { icon: 'fab fa-slack', name: 'Slack' },
    'figma': { icon: 'fab fa-figma', name: 'Figma' },
    'medium': { icon: 'fab fa-medium', name: 'Medium' },
    'dribbble': { icon: 'fab fa-dribbble', name: 'Dribbble' },
    'behance': { icon: 'fab fa-behance', name: 'Behance' },
    'stackoverflow': { icon: 'fab fa-stack-overflow', name: 'Stack Overflow' },
    'wikipedia': { icon: 'fab fa-wikipedia-w', name: 'Wikipedia' },
    'netflix': { icon: 'fas fa-film', name: 'Netflix' },
    'hulu': { icon: 'fas fa-tv', name: 'Hulu' },
    'disneyplus': { icon: 'fas fa-tv', name: 'Disney+' },
    'openai': { icon: 'fas fa-brain', name: 'ChatGPT' },
    'chatgpt': { icon: 'fas fa-brain', name: 'ChatGPT' },
    'claude': { icon: 'fas fa-brain', name: 'Claude AI' },
    'anthropic': { icon: 'fas fa-brain', name: 'Anthropic' },
    'gemini': { icon: 'fas fa-wand-magic-sparkles', name: 'Gemini' },
    'notion': { icon: 'fas fa-book-bookmark', name: 'Notion' },
    'linear': { icon: 'fas fa-list-check', name: 'Linear' },
    'jira': { icon: 'fas fa-list-check', name: 'Jira' },
    'asana': { icon: 'fas fa-list-check', name: 'Asana' },
    'canvas': { icon: 'fas fa-graduation-cap', name: 'Canvas' },
    'zoom': { icon: 'fas fa-video', name: 'Zoom' }
};

function inferShortcutMeta(rawUrl, rawTitle = '') {
    if (!rawUrl) return { title: 'Shortcut', iconType: 'fa', iconValue: 'fas fa-globe', isAiMatched: false, faviconUrl: '' };
    
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    
    let domain = '';
    let host = '';
    try {
        const u = new URL(url);
        host = u.hostname.toLowerCase().replace(/^www\./, '');
        domain = host.split('.')[0];
    } catch (e) {
        host = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        domain = host.split('.')[0];
    }

    let detectedTitle = rawTitle.trim();
    if (!detectedTitle) {
        if (BRAND_ICON_MAP[host]) detectedTitle = BRAND_ICON_MAP[host].name;
        else if (BRAND_ICON_MAP[domain]) detectedTitle = BRAND_ICON_MAP[domain].name;
        else detectedTitle = domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'Shortcut';
    }

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;

    // 1. Direct Brand Match
    if (BRAND_ICON_MAP[host]) {
        return { title: detectedTitle, iconType: 'fa', iconValue: BRAND_ICON_MAP[host].icon, isAiMatched: true, faviconUrl };
    }
    if (BRAND_ICON_MAP[domain]) {
        return { title: detectedTitle, iconType: 'fa', iconValue: BRAND_ICON_MAP[domain].icon, isAiMatched: true, faviconUrl };
    }

    // 2. Semantic Keyword Detection
    const textSearch = (host + ' ' + detectedTitle).toLowerCase();
    const SEMANTIC_PATTERNS = [
        { regex: /code|dev|git|repo|script|api|json|doc/i, icon: 'fas fa-code' },
        { regex: /music|sound|audio|podcast|radio|beat/i, icon: 'fas fa-music' },
        { regex: /video|stream|movie|cinema|film|play|tv|anime/i, icon: 'fas fa-film' },
        { regex: /game|gaming|arcade|play|esport|rpg|mmo/i, icon: 'fas fa-gamepad' },
        { regex: /shop|store|buy|cart|mall|market|cloth|shoe/i, icon: 'fas fa-bag-shopping' },
        { regex: /news|times|post|journal|press|daily|tribune/i, icon: 'fas fa-newspaper' },
        { regex: /bank|crypto|coin|wallet|finance|pay|money|stock/i, icon: 'fas fa-wallet' },
        { regex: /mail|inbox|email|letter|msg/i, icon: 'fas fa-envelope' },
        { regex: /chat|talk|forum|community|discuss/i, icon: 'fas fa-comments' },
        { regex: /book|read|novel|manga|comic|lib/i, icon: 'fas fa-book' },
        { regex: /learn|edu|school|course|academy|study|exam/i, icon: 'fas fa-graduation-cap' },
        { regex: /photo|camera|image|pic|gallery|art|draw/i, icon: 'fas fa-camera' },
        { regex: /cloud|drive|host|server|storage/i, icon: 'fas fa-cloud' },
        { regex: /ai|bot|gpt|neural|intel|model/i, icon: 'fas fa-robot' }
    ];

    for (const pattern of SEMANTIC_PATTERNS) {
        if (pattern.regex.test(textSearch)) {
            return {
                title: detectedTitle,
                iconType: 'fa',
                iconValue: pattern.icon,
                isAiMatched: true,
                faviconUrl
            };
        }
    }

    // 3. Fallback to Website Favicon
    return {
        title: detectedTitle,
        iconType: 'favicon',
        iconValue: faviconUrl,
        isAiMatched: false,
        faviconUrl
    };
}

class ShortcutManager {
    constructor() {
        this.gridEl = document.getElementById('sp-tiles-grid');
        this.overlay = document.getElementById('shortcut-modal-overlay');
        this.urlInput = document.getElementById('new-shortcut-url');
        this.titleInput = document.getElementById('new-shortcut-title');
        this.previewIcon = document.getElementById('sm-preview-icon');
        this.previewTitle = document.getElementById('sm-preview-title');
        this.previewUrl = document.getElementById('sm-preview-url');
        this.previewBadge = document.getElementById('sm-preview-badge-text');
        this.btnModeAi = document.getElementById('sm-mode-ai');
        this.btnModeFavicon = document.getElementById('sm-mode-favicon');
        this.saveBtn = document.getElementById('shortcut-modal-save-btn');
        this.cancelBtn = document.getElementById('shortcut-modal-cancel-btn');
        this.closeBtn = document.getElementById('shortcut-modal-close-btn');

        this.selectedMode = 'ai';
        this.currentMeta = null;

        try {
            this.shortcuts = JSON.parse(localStorage.getItem('ocal-quick-launch-shortcuts') || 'null');
            if (!Array.isArray(this.shortcuts) || this.shortcuts.length === 0) {
                this.shortcuts = [...DEFAULT_QUICK_SHORTCUTS];
            }
        } catch (e) {
            this.shortcuts = [...DEFAULT_QUICK_SHORTCUTS];
        }

        this.initEvents();
        this.render();
    }

    save() {
        localStorage.setItem('ocal-quick-launch-shortcuts', JSON.stringify(this.shortcuts));
    }

    render() {
        if (!this.gridEl) return;
        this.gridEl.innerHTML = '';

        this.shortcuts.forEach(item => {
            const tile = document.createElement('div');
            tile.className = 'sp-tile-item';
            tile.dataset.url = item.url;
            tile.title = `${item.title} (${item.url})`;

            let iconHtml = '';
            if (item.iconType === 'favicon') {
                iconHtml = `<img src="${item.iconValue}" class="sp-tile-favicon" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-globe\\'></i>';" alt="${item.title}">`;
            } else {
                iconHtml = `<i class="${item.iconValue}"></i>`;
            }

            tile.innerHTML = `
                <div class="sp-tile-icon">${iconHtml}</div>
                <span class="sp-tile-label">${item.title}</span>
                <button class="sp-tile-del-btn" title="Remove Shortcut" type="button"><i class="fas fa-xmark"></i></button>
            `;

            tile.onclick = (e) => {
                if (e.target.closest('.sp-tile-del-btn')) return;
                navigateToTargetUrl(item.url);
            };

            const delBtn = tile.querySelector('.sp-tile-del-btn');
            if (delBtn) {
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.delete(item.id);
                };
            }

            this.gridEl.appendChild(tile);
        });

        // Append "+ Add Shortcut" Button
        const addBtn = document.createElement('div');
        addBtn.className = 'sp-tile-item sp-tile-add-btn';
        addBtn.id = 'add-shortcut-trigger-btn';
        addBtn.title = 'Add New Shortcut';
        addBtn.innerHTML = `
            <div class="sp-tile-icon add-icon"><i class="fas fa-plus"></i></div>
            <span class="sp-tile-label">Add Shortcut</span>
        `;
        addBtn.onclick = () => this.openModal();
        this.gridEl.appendChild(addBtn);
    }

    delete(id) {
        this.shortcuts = this.shortcuts.filter(s => s.id !== id);
        this.save();
        this.render();
    }

    openModal() {
        if (!this.overlay) return;
        if (this.urlInput) this.urlInput.value = '';
        if (this.titleInput) this.titleInput.value = '';
        this.selectedMode = 'ai';
        this.updateModeButtons();
        this.updateLivePreview();
        this.overlay.style.display = 'flex';
        setTimeout(() => { if (this.urlInput) this.urlInput.focus(); }, 100);
    }

    closeModal() {
        if (!this.overlay) return;
        this.overlay.style.display = 'none';
    }

    updateModeButtons() {
        if (this.btnModeAi) this.btnModeAi.classList.toggle('active', this.selectedMode === 'ai');
        if (this.btnModeFavicon) this.btnModeFavicon.classList.toggle('active', this.selectedMode === 'favicon');
    }

    updateLivePreview() {
        const rawUrl = this.urlInput ? this.urlInput.value.trim() : '';
        const rawTitle = this.titleInput ? this.titleInput.value.trim() : '';
        
        this.currentMeta = inferShortcutMeta(rawUrl, rawTitle);

        if (this.previewTitle) this.previewTitle.textContent = this.currentMeta.title || 'New Shortcut';
        if (this.previewUrl) this.previewUrl.textContent = rawUrl || 'https://example.com';

        if (this.previewIcon) {
            if (this.selectedMode === 'favicon' || (!this.currentMeta.isAiMatched && this.currentMeta.iconType === 'favicon')) {
                this.previewIcon.innerHTML = `<img src="${this.currentMeta.faviconUrl}" class="sp-tile-favicon" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-globe\\'></i>';" alt="Icon">`;
                if (this.previewBadge) this.previewBadge.textContent = 'Website Favicon';
            } else {
                this.previewIcon.innerHTML = `<i class="${this.currentMeta.iconValue}"></i>`;
                if (this.previewBadge) this.previewBadge.textContent = this.currentMeta.isAiMatched ? 'AI Smart Icon' : 'Default Icon';
            }
        }
    }

    saveShortcut() {
        if (!this.urlInput) return;
        let url = this.urlInput.value.trim();
        if (!url) {
            this.urlInput.focus();
            return;
        }

        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        const title = (this.titleInput && this.titleInput.value.trim()) || this.currentMeta.title || 'Shortcut';

        let iconType = 'fa';
        let iconValue = 'fas fa-globe';

        if (this.selectedMode === 'favicon') {
            iconType = 'favicon';
            iconValue = this.currentMeta.faviconUrl;
        } else {
            iconType = this.currentMeta.iconType;
            iconValue = this.currentMeta.iconValue;
        }

        const newShortcut = {
            id: 'sc_' + Date.now(),
            title,
            url,
            iconType,
            iconValue,
            isCustom: true
        };

        this.shortcuts.push(newShortcut);
        this.save();
        this.render();
        this.closeModal();
    }

    initEvents() {
        if (this.urlInput) {
            this.urlInput.addEventListener('input', () => this.updateLivePreview());
            this.urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.saveShortcut();
            });
        }

        if (this.titleInput) {
            this.titleInput.addEventListener('input', () => this.updateLivePreview());
            this.titleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.saveShortcut();
            });
        }

        if (this.btnModeAi) {
            this.btnModeAi.onclick = () => {
                this.selectedMode = 'ai';
                this.updateModeButtons();
                this.updateLivePreview();
            };
        }

        if (this.btnModeFavicon) {
            this.btnModeFavicon.onclick = () => {
                this.selectedMode = 'favicon';
                this.updateModeButtons();
                this.updateLivePreview();
            };
        }

        if (this.saveBtn) this.saveBtn.onclick = () => this.saveShortcut();
        if (this.cancelBtn) this.cancelBtn.onclick = () => this.closeModal();
        if (this.closeBtn) this.closeBtn.onclick = () => this.closeModal();
        if (this.overlay) {
            this.overlay.onclick = (e) => {
                if (e.target === this.overlay) this.closeModal();
            };
        }
    }
}
new ShortcutManager();

// ── To-Do Manager ──────────────────────────────────────────────
class TodoManager {
    constructor() {
        try {
            this.todos = JSON.parse(localStorage.getItem('ocal-todos') || '[]');
            if (!Array.isArray(this.todos)) this.todos = [];
        } catch (e) {
            console.error('Failed to parse todos:', e);
            this.todos = [];
        }
        this.render();
        if (todoInput) {
            todoInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && todoInput.value.trim()) {
                    this.add(todoInput.value.trim());
                    todoInput.value = '';
                }
            });
        }
    }
    add(text) {
        this.todos.push({ id: Date.now(), text, done: false });
        this.save();
        this.render();
    }
    toggle(id) {
        this.todos = this.todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
        this.save();
        this.render();
    }
    delete(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.save();
        this.render();
    }
    save() { localStorage.setItem('ocal-todos', JSON.stringify(this.todos)); }
    render() {
        const count = this.todos.filter(t => !t.done).length;
        const badge = document.getElementById('todo-count-badge');
        if (badge) badge.textContent = count;
        const badgeHeader = document.getElementById('todo-badge-header');
        if (badgeHeader) badgeHeader.textContent = `${count} Pending`;
        if (!todoListEl) return;
        todoListEl.innerHTML = '';
        this.todos.forEach(todo => {
            const el = document.createElement('div');
            el.className = `todo-card ${todo.done ? 'done' : ''}`;
            el.innerHTML = `
                <div class="todo-checkbox"></div>
                <span class="todo-label">${todo.text}</span>
                <i class="fas fa-trash-can del-todo"></i>
            `;
            el.onclick = () => this.toggle(todo.id);
            el.querySelector('.del-todo').onclick = (e) => {
                e.stopPropagation();
                this.delete(todo.id);
            };
            todoListEl.appendChild(el);
        });
    }
}
new TodoManager();

// ── Focus Timer ───────────────────────────────────────────────
class FocusTimer {
    constructor() {
        this.mode = 'timer'; // 'timer' or 'breathe'
        this.timeLeft = 25 * 60;
        this.timerId = null;
        this.breatheInterval = null;
        
        this.timerToggle = document.getElementById('timer-toggle');
        this.timerReset = document.getElementById('timer-reset');
        this.progressEl = document.getElementById('timer-progress');
        this.timerDisplay = document.getElementById('timer-display');
        this.breatheDisplay = document.getElementById('breathe-display');
        this.timerContainer = document.getElementById('timer-container');
        
        this.modeTimerBtn = document.getElementById('ff-mode-timer');
        this.modeBreatheBtn = document.getElementById('ff-mode-breathe');
        
        this.totalSeconds = 25 * 60;
        
        if (this.timerToggle) this.timerToggle.onclick = () => this.toggle();
        if (this.timerReset) this.timerReset.onclick = () => this.reset();
        
        if (this.modeTimerBtn) this.modeTimerBtn.onclick = () => this.setMode('timer');
        if (this.modeBreatheBtn) this.modeBreatheBtn.onclick = () => this.setMode('breathe');
        
        this.updateDisplay();
    }
    
    setMode(newMode) {
        if (this.mode === newMode) return;
        this.pause();
        this.mode = newMode;
        
        if (this.modeTimerBtn) {
            this.modeTimerBtn.classList.toggle('active', newMode === 'timer');
            this.modeBreatheBtn.classList.toggle('active', newMode === 'breathe');
        }
        
        if (newMode === 'timer') {
            if (this.timerDisplay) this.timerDisplay.style.display = 'block';
            if (this.breatheDisplay) this.breatheDisplay.style.display = 'none';
            if (this.timerContainer) {
                this.timerContainer.classList.remove('breathe-inhale', 'breathe-exhale');
            }
            this.updateDisplay();
        } else {
            if (this.timerDisplay) this.timerDisplay.style.display = 'none';
            if (this.breatheDisplay) {
                this.breatheDisplay.style.display = 'block';
                this.breatheDisplay.textContent = 'READY';
            }
            if (this.progressEl) this.progressEl.style.strokeDashoffset = 0; // Full circle
        }
    }
    
    toggle() {
        if (this.isRunning) this.pause();
        else this.start();
    }
    
    start() {
        this.isRunning = true;
        document.body.classList.add('focus-active');
        if (this.timerToggle) {
            this.timerToggle.innerHTML = '<i class="fas fa-pause"></i>';
            this.timerToggle.classList.add('active');
        }
        
        if (this.mode === 'timer') {
            this.timerId = setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();
                if (this.timeLeft <= 0) this.complete();
            }, 1000);
        } else {
            this.startBreathing();
        }
    }
    
    startBreathing() {
        // 4s Inhale, 4s Exhale rhythm
        let step = 'inhale';
        const breatheCycle = () => {
            if (!this.isRunning) return;
            if (step === 'inhale') {
                if (this.breatheDisplay) this.breatheDisplay.textContent = 'INHALE';
                if (this.timerContainer) {
                    this.timerContainer.classList.remove('breathe-exhale');
                    this.timerContainer.classList.add('breathe-inhale');
                }
                step = 'exhale';
                this.breatheInterval = setTimeout(breatheCycle, 4000);
            } else {
                if (this.breatheDisplay) this.breatheDisplay.textContent = 'EXHALE';
                if (this.timerContainer) {
                    this.timerContainer.classList.remove('breathe-inhale');
                    this.timerContainer.classList.add('breathe-exhale');
                }
                step = 'inhale';
                this.breatheInterval = setTimeout(breatheCycle, 4000);
            }
        };
        breatheCycle();
    }
    
    pause() {
        this.isRunning = false;
        document.body.classList.remove('focus-active');
        clearInterval(this.timerId);
        clearTimeout(this.breatheInterval);
        
        if (this.timerToggle) {
            this.timerToggle.innerHTML = '<i class="fas fa-play"></i>';
            this.timerToggle.classList.remove('active');
        }
        if (this.mode === 'breathe' && this.timerContainer) {
            this.timerContainer.classList.remove('breathe-inhale', 'breathe-exhale');
            if (this.breatheDisplay) this.breatheDisplay.textContent = 'PAUSED';
        }
    }
    
    reset() {
        this.pause();
        if (this.mode === 'timer') {
            this.timeLeft = 25 * 60;
            this.updateDisplay();
        } else {
            if (this.breatheDisplay) this.breatheDisplay.textContent = 'READY';
        }
    }
    
    complete() { 
        this.pause(); 
        alert('Focus session complete!'); 
        this.reset(); 
    }
    
    updateDisplay() {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        if (this.timerDisplay) this.timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        if (this.progressEl) {
            const offset = 471 - (471 * (this.timeLeft / this.totalSeconds));
            this.progressEl.style.strokeDashoffset = offset;
        }
    }
}
new FocusTimer();

// ── Precise Weather Engine ──
const weatherIconMap = {
    '113': 'fa-sun', '116': 'fa-cloud-sun', '119': 'fa-cloud', '122': 'fa-cloud',
    '143': 'fa-smog', '176': 'fa-cloud-rain', '182': 'fa-cloud-meatball',
    '200': 'fa-cloud-bolt', '227': 'fa-snowflake', '230': 'fa-wind',
    '248': 'fa-smog', '260': 'fa-smog', '263': 'fa-cloud-showers-water',
    '266': 'fa-cloud-showers-heavy', '296': 'fa-cloud-rain', '299': 'fa-cloud-showers-heavy',
    '302': 'fa-cloud-showers-heavy', '308': 'fa-cloud-showers-heavy',
    '311': 'fa-cloud-rain', '353': 'fa-cloud-showers-water', '389': 'fa-cloud-bolt'
};

async function updateWeather() {
    // Original Sidebar elements
    const tempEl = document.getElementById('weather-temp');
    const cityEl = document.getElementById('weather-city');
    const iconEl = document.querySelector('.weather-panel .weather-icon');
    const condEl = document.getElementById('weather-condition');
    const humEl = document.getElementById('weather-humidity');
    const windEl = document.getElementById('weather-wind');
    const feelsEl = document.getElementById('weather-feels');
    const locInput = document.getElementById('location-input');

    // Elegant Floating elements
    const fTempEl = document.getElementById('floating-weather-temp');
    const fCityEl = document.getElementById('floating-weather-city');
    const fIconEl = document.getElementById('floating-weather-icon');
    const fLocInput = document.getElementById('floating-location-input');

    const fetchWeather = async (locStr = '') => {
        try {
            const response = await fetch(`https://wttr.in/${locStr}?format=j1`);
            const data = await response.json();
            const current = data.current_condition[0];
            const city = data.nearest_area[0].areaName[0].value;
            const code = current.weatherCode;
            const desc = current.weatherDesc[0].value;

            // Update sidebar elements
            if (tempEl) tempEl.textContent = `${current.temp_C} °C`;
            if (cityEl) cityEl.textContent = city.toUpperCase();
            if (condEl) condEl.textContent = desc.toUpperCase();
            if (humEl) humEl.textContent = `${current.humidity}%`;
            if (windEl) windEl.textContent = `${current.windspeedKmph} KM/H`;
            if (feelsEl) feelsEl.textContent = `${current.FeelsLikeC} °C`;
            if (iconEl && weatherIconMap[code]) {
                iconEl.className = `fas ${weatherIconMap[code]} weather-icon`;
            }

            // Update floating elements
            if (fTempEl) fTempEl.textContent = `${current.temp_C} °C`;
            if (fCityEl) {
                fCityEl.innerHTML = `${city.toUpperCase()} <i class="fas fa-pencil edit-icon-floating"></i>`;
            }
            if (fIconEl && weatherIconMap[code]) {
                fIconEl.className = `fas ${weatherIconMap[code]} weather-icon`;
            }
        } catch (e) { 
            console.warn('Weather fetch failed.', e); 
            if (condEl) condEl.textContent = 'OFFLINE';
            if (fCityEl) fCityEl.innerHTML = `OFFLINE <i class="fas fa-pencil edit-icon-floating"></i>`;
        }
    };

    // Sidebar Location Toggle
    const cityTrigger = document.getElementById('city-trigger');
    if (cityTrigger && locInput) {
        cityTrigger.onclick = () => {
            cityTrigger.style.display = 'none';
            locInput.style.display = 'block';
            locInput.value = cityEl ? cityEl.textContent : '';
            locInput.focus();
            locInput.select();
        };

        const submitLoc = () => {
            const newLoc = locInput.value.trim();
            if (newLoc) {
                if (cityEl) cityEl.textContent = 'SEARCHING...';
                localStorage.setItem('ocal-weather-loc', newLoc);
                fetchWeather(newLoc);
            } else {
                localStorage.removeItem('ocal-weather-loc');
                updateWeather(); // Re-run auto-detect
            }
            cityTrigger.style.display = 'flex';
            locInput.style.display = 'none';
        };

        locInput.onkeydown = (e) => {
            if (e.key === 'Enter') submitLoc();
            if (e.key === 'Escape') {
                cityTrigger.style.display = 'flex';
                locInput.style.display = 'none';
            }
        };
        locInput.onblur = submitLoc;
    }

    // Elegant Floating Location Toggle
    if (fCityEl && fLocInput) {
        fCityEl.onclick = () => {
            fCityEl.style.display = 'none';
            fLocInput.style.display = 'block';
            
            // Extract city text only, removing any icon HTML or extra spaces
            const currentCity = fCityEl.innerText.trim();
            fLocInput.value = currentCity;
            fLocInput.focus();
            fLocInput.select();
        };

        const submitFloatingLoc = () => {
            const newLoc = fLocInput.value.trim();
            if (newLoc) {
                if (fCityEl) fCityEl.innerHTML = `SEARCHING... <i class="fas fa-pencil edit-icon-floating"></i>`;
                localStorage.setItem('ocal-weather-loc', newLoc);
                fetchWeather(newLoc);
            } else {
                localStorage.removeItem('ocal-weather-loc');
                updateWeather(); // Re-run auto-detect
            }
            fCityEl.style.display = 'block';
            fLocInput.style.display = 'none';
        };

        fLocInput.onkeydown = (e) => {
            if (e.key === 'Enter') submitFloatingLoc();
            if (e.key === 'Escape') {
                fCityEl.style.display = 'block';
                fLocInput.style.display = 'none';
            }
        };
        fLocInput.onblur = submitFloatingLoc;
    }

    const savedLoc = localStorage.getItem('ocal-weather-loc');
    if (savedLoc) {
        fetchWeather(savedLoc);
    } else if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
            () => fetchWeather(),
            { timeout: 10000 }
        );
    } else { fetchWeather(); }
}
updateWeather();
setInterval(updateWeather, 30 * 60 * 1000);

// ── Shortcut Click Engine ──────────────────────────────────────
document.querySelectorAll('.tile-item').forEach(tile => {
    tile.onclick = () => {
        const url = tile.dataset.url;
        if (url) window.location.href = 'https://' + url;
    };
});

// ── Global Actions (IPC) ───────────────────────────────────────
const settingsBtn = document.getElementById('settings-btn');
if (settingsBtn) {
    settingsBtn.onclick = () => {
        if (window.electronAPI) window.electronAPI.send('open-settings');
    };
}
const historyBtn = document.getElementById('history-btn');
if (historyBtn) {
    historyBtn.onclick = () => {
        if (window.electronAPI) {
            window.electronAPI.send('toggle-sidebar', true);
            window.electronAPI.send('switch-sidebar-tab', 'history');
        }
    };
}
const bookmarksBtn = document.getElementById('bookmarks-btn');
if (bookmarksBtn) {
    bookmarksBtn.onclick = () => {
        if (window.electronAPI) {
            window.electronAPI.send('toggle-sidebar', true);
            window.electronAPI.send('switch-sidebar-tab', 'bookmarks');
        }
    };
}
const downloadsBtn = document.getElementById('downloads-btn');
if (downloadsBtn) {
    downloadsBtn.onclick = () => {
        window.location.href = 'ocal://downloads';
    };
}

// ── Repaired & Responsive System ──
function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

function applySettings(s) {
    if (!s) return;
    const root = document.documentElement;
    const isLight = s.themeMode === 'light';
    if (s.accentColor) {
        const activeAccent = getModeAccent(s.accentColor, isLight);
        root.style.setProperty('--accent', activeAccent);
        root.style.setProperty('--accent-glow', 'transparent');
        root.style.setProperty('--accent-dim', hexToRgba(activeAccent, 0.15));
        root.style.setProperty('--accent-border', hexToRgba(activeAccent, 0.4));
    }

    if (s.homeLayout && dashMain) {
        dashMain.classList.remove('layout-top', 'layout-center', 'layout-bottom');
        dashMain.classList.add(`layout-${s.homeLayout}`);
    }

    if (s.homeTileSize) root.style.setProperty('--tile-size', `${s.homeTileSize}px`);
    if (s.homeTileSpacing) root.style.setProperty('--tile-gap', `${s.homeTileSpacing}px`);

    const activeStyle = s.homeTileStyle || 'glass-array';
    const tiles = document.querySelectorAll('.tile-box');
    tiles.forEach(tile => {
        tile.classList.remove('style-glass', 'style-matte', 'style-neon');
        if (activeStyle === 'glass-array') tile.classList.add('style-glass');
        else if (activeStyle === 'solid-matte') tile.classList.add('style-matte');
        else if (activeStyle === 'neon-orbit') tile.classList.add('style-neon');
        else tile.classList.add('style-glass');
    });

    // Widget Visibility
    const todoPanel = document.getElementById('todo-panel');
    const timerPanel = document.getElementById('timer-panel');
    const weatherPanel = document.getElementById('weather-panel');
    const leftSidebar = document.getElementById('left-sidebar');
    const rightSidebar = document.getElementById('right-sidebar');
    const floatingWeather = document.getElementById('floating-weather');

    const showTodo = (s.showDailyFocus !== false);
    const showTimer = (s.showFocusFlow !== false);
    const showWeather = (s.showWeather !== false);
    const sidebarsActive = showTodo || showTimer;

    const useFloatingWeather = showWeather && !sidebarsActive;
    const useSidebarWeather = showWeather && sidebarsActive;

    if (todoPanel) todoPanel.style.display = showTodo ? 'flex' : 'none';
    if (timerPanel) timerPanel.style.display = showTimer ? 'flex' : 'none';
    if (weatherPanel) weatherPanel.style.display = useSidebarWeather ? 'flex' : 'none';

    if (leftSidebar) leftSidebar.style.display = showTodo ? 'flex' : 'none';
    if (rightSidebar) rightSidebar.style.display = (showTimer || useSidebarWeather) ? 'flex' : 'none';

    if (floatingWeather) {
        floatingWeather.style.display = useFloatingWeather ? 'flex' : 'none';
    }

    if (dashMain) {
        dashMain.classList.toggle('has-left-sidebar', showTodo);
        dashMain.classList.toggle('has-right-sidebar', showTimer || useSidebarWeather);
    }

    if (s.searchEngine) {
        currentSearchEngine = s.searchEngine;
        updateSearchEngineLogo(s.searchEngine);
    }

    document.body.classList.toggle('battery-saver', !!s.batterySaver);
    document.body.setAttribute('data-theme', s.themeMode || 'dark');
}



if (window.electronAPI) {
    window.electronAPI.onSettingsChanged(s => applySettings(s));
    window.electronAPI.getSettings().then(s => applySettings(s));
}

// ── Style Customizer Logic ──
class StyleCustomizer {
    constructor() {
        this.drawer = document.getElementById('style-drawer');
        this.btnOpen = document.getElementById('style-customizer-btn');
        this.btnClose = document.getElementById('style-drawer-close');
        this.btnReset = document.getElementById('style-reset-btn');
        this.opacitySlider = document.getElementById('opacity-slider');
        this.blurSlider = document.getElementById('blur-slider');
        this.opacityLabel = document.getElementById('opacity-val-label');
        this.blurLabel = document.getElementById('blur-val-label');
        this.options = document.querySelectorAll('.style-option');
        this.accentDots = document.querySelectorAll('.accent-dot');
        this.wallpaperBg = document.querySelector('.wallpaper-bg');

        if (this.btnOpen) this.btnOpen.onclick = (e) => { e.stopPropagation(); this.open(); };
        if (this.btnClose) this.btnClose.onclick = () => this.close();
        if (this.btnReset) this.btnReset.onclick = () => this.resetDefaults();

        document.addEventListener('click', (e) => {
            if (this.drawer && this.drawer.classList.contains('open') && !this.drawer.contains(e.target) && this.btnOpen && !this.btnOpen.contains(e.target)) {
                this.close();
            }
        });

        // Initialize Options
        this.options.forEach(opt => {
            opt.onclick = () => {
                const val = opt.dataset.val;
                const type = opt.dataset.type;
                this.setOption(type, val);
            };
        });

        // Initialize Accent Dots
        this.accentDots.forEach(dot => {
            dot.onclick = () => {
                const color = dot.dataset.color;
                this.setAccent(color);
            };
        });

        if (window.electronAPI) {
            window.electronAPI.onSettingsChanged(s => {
                if (s) {
                    this.updateAccentDots(s.themeMode);
                    if (s.accentColor) {
                        this.accentDots.forEach(dot => {
                            dot.classList.toggle('active', dot.dataset.color.toLowerCase() === s.accentColor.toLowerCase());
                        });
                    }
                    if (s.themeMode) {
                        document.querySelectorAll(`.style-option[data-type="theme"]`).forEach(el => {
                            el.classList.toggle('active', el.dataset.val === s.themeMode);
                        });
                    }
                }
            });
        }

        // Sliders
        if (this.opacitySlider) {
            this.opacitySlider.oninput = () => {
                const val = this.opacitySlider.value;
                this.updateOpacity(val);
            };
        }
        if (this.blurSlider) {
            this.blurSlider.oninput = () => {
                const val = this.blurSlider.value;
                this.updateBlur(val);
            };
        }

        // Initial Load
        this.loadSettings();
    }

    open() {
        if (this.drawer) this.drawer.classList.add('open');
    }

    close() {
        if (this.drawer) this.drawer.classList.remove('open');
    }

    setOption(type, val) {
        // Toggle active visual in drawer
        document.querySelectorAll(`.style-option[data-type="${type}"]`).forEach(el => {
            el.classList.toggle('active', el.dataset.val === val);
        });

        if (type === 'bg') {
            if (this.wallpaperBg) {
                // Clear any existing animation classes
                this.wallpaperBg.classList.remove('animated-aurora', 'animated-cosmic', 'animated-sunset', 'animated-cyber');
            }
            localStorage.setItem('ocal-custom-bg', val);
        } else if (type === 'effect') {
            document.body.classList.remove('effect-glitch', 'effect-wavy-jelly');
            if (val !== 'none') {
                document.body.classList.add(`effect-${val}`);
            }
            localStorage.setItem('ocal-custom-effect', val);
        } else if (type === 'ui') {
            document.body.setAttribute('data-ui-style', val);
            localStorage.setItem('ocal-custom-ui', val);
            // Sync sliders default value for preset
            if (val === 'frosted-glass') { this.updateOpacity(45, true); this.updateBlur(20, true); }
            else if (val === 'ultra-glass') { this.updateOpacity(15, true); this.updateBlur(32, true); }
            else if (val === 'matte-surface') { this.updateOpacity(95, true); this.updateBlur(0, true); }
            else if (val === 'cyberpunk-glow') { this.updateOpacity(85, true); this.updateBlur(10, true); }
        } else if (type === 'font') {
            document.body.setAttribute('data-font-style', val);
            localStorage.setItem('ocal-custom-font', val);
        } else if (type === 'theme') {
            document.body.setAttribute('data-theme', val);
            if (window.electronAPI && window.electronAPI.updateSetting) {
                window.electronAPI.updateSetting('themeMode', val);
            } else {
                localStorage.setItem('ocal-custom-theme', val);
            }
        }
    }

    setAccent(color) {
        this.accentDots.forEach(dot => {
            dot.classList.toggle('active', dot.dataset.color.toLowerCase() === color.toLowerCase());
        });
        if (window.electronAPI && window.electronAPI.updateSetting) {
            window.electronAPI.updateSetting('accentColor', color);
        } else {
            const root = document.documentElement;
            const isLight = document.body.getAttribute('data-theme') === 'light';
            const activeAccent = getModeAccent(color, isLight);
            root.style.setProperty('--accent', activeAccent);
            root.style.setProperty('--accent-glow', 'transparent');
            root.style.setProperty('--accent-dim', hexToRgba(activeAccent, 0.15));
            root.style.setProperty('--accent-border', hexToRgba(activeAccent, 0.4));
        }
    }

    updateOpacity(val, syncSlider = false) {
        document.documentElement.style.setProperty('--card-opacity-val', val / 100);
        if (this.opacityLabel) this.opacityLabel.textContent = `${val}%`;
        if (syncSlider && this.opacitySlider) this.opacitySlider.value = val;
        localStorage.setItem('ocal-custom-opacity', val);
    }

    updateBlur(val, syncSlider = false) {
        document.documentElement.style.setProperty('--card-blur-val', `${val}px`);
        if (this.blurLabel) this.blurLabel.textContent = `${val}px`;
        if (syncSlider && this.blurSlider) this.blurSlider.value = val;
        localStorage.setItem('ocal-custom-blur', val);
    }

    updateAccentDots(themeMode) {
        const isLight = themeMode === 'light';
        const colors = isLight ? [
            '#058f60',
            '#d81b60',
            '#0288d1',
            '#d97706',
            '#6d28d9',
            '#dc2626',
            '#0f172a'
        ] : [
            '#09f0a0',
            '#ff007f',
            '#00e5ff',
            '#ff9100',
            '#7b1fa2',
            '#ef5350',
            '#ffffff'
        ];

        this.accentDots.forEach((dot, index) => {
            if (colors[index]) {
                const color = colors[index];
                dot.style.backgroundColor = color;
                dot.dataset.color = color;
            }
        });
    }

    loadSettings() {
        // Load Background Theme
        const bgVal = localStorage.getItem('ocal-custom-bg') || 'static';
        this.setOption('bg', bgVal);

        // Load Theme Mode (Dark/Light)
        if (window.electronAPI) {
            window.electronAPI.getSettings().then(s => {
                const themeVal = (s && s.themeMode) || 'dark';
                this.setOption('theme', themeVal);
                this.updateAccentDots(themeVal);
                if (s && s.accentColor) {
                    this.accentDots.forEach(dot => {
                        dot.classList.toggle('active', dot.dataset.color.toLowerCase() === s.accentColor.toLowerCase());
                    });
                }
            });
        } else {
            const themeVal = localStorage.getItem('ocal-custom-theme') || 'dark';
            this.setOption('theme', themeVal);
            this.updateAccentDots(themeVal);
        }

        // Load Visual Effect
        const effectVal = localStorage.getItem('ocal-custom-effect') || 'none';
        this.setOption('effect', effectVal);

        // Load UI Card Presets
        const uiVal = localStorage.getItem('ocal-custom-ui') || 'frosted-glass';
        this.setOption('ui', uiVal);

        // Load Font Settings
        const fontVal = localStorage.getItem('ocal-custom-font') || 'mono';
        this.setOption('font', fontVal);

        // Load Fine Tuning
        const opacityVal = localStorage.getItem('ocal-custom-opacity');
        if (opacityVal !== null) {
            this.updateOpacity(parseInt(opacityVal), true);
        }
        const blurVal = localStorage.getItem('ocal-custom-blur');
        if (blurVal !== null) {
            this.updateBlur(parseInt(blurVal), true);
        }
    }

    resetDefaults() {
        localStorage.removeItem('ocal-custom-bg');
        localStorage.removeItem('ocal-custom-effect');
        localStorage.removeItem('ocal-custom-ui');
        localStorage.removeItem('ocal-custom-font');
        localStorage.removeItem('ocal-custom-opacity');
        localStorage.removeItem('ocal-custom-blur');

        // Reset elements
        this.setOption('bg', 'static');
        this.setOption('theme', 'dark');
        this.setOption('effect', 'none');
        this.setOption('ui', 'frosted-glass');
        this.setOption('font', 'mono');
        this.updateOpacity(45, true);
        this.updateBlur(20, true);

        // Reset default accent
        this.setAccent('#09f0a0');
    }
}
new StyleCustomizer();

// Tab drag multitasking overlay (Opera Style)
if (window.electronAPI) {
    const splitOverlay = document.getElementById('split-drop-zones-overlay');
    if (splitOverlay) {
        window.electronAPI.on('tab-drag-start', () => {
            splitOverlay.style.display = 'flex';
            splitOverlay.offsetHeight; 
            splitOverlay.classList.add('active');
        });

        window.electronAPI.on('tab-drag-end', () => {
            splitOverlay.classList.remove('active');
            setTimeout(() => {
                if (!splitOverlay.classList.contains('active')) {
                    splitOverlay.style.display = 'none';
                }
            }, 300);
        });

        window.electronAPI.on('set-split-mode', (e, isSplit) => {
            if (isSplit) {
                document.body.classList.add('split-mode');
            } else {
                document.body.classList.remove('split-mode');
            }
        });

        const zones = document.querySelectorAll('.split-drop-zone');
        zones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const direction = zone.getAttribute('data-direction');
                window.electronAPI.send('drop-tab-to-split', direction);
            });
        });
    }
}

// ── Superpower Tile Navigation, Welcome Greeting & Message of the Day ──
const motdList = [
    "Make today count with focus, clarity, and determination.",
    "Small daily habits lead to extraordinary long-term results.",
    "Your focus determines your reality. Stay clear and driven.",
    "Excellence is not an act, but a daily habit. Keep building.",
    "Code with passion, design with purpose, build with precision.",
    "The secret of getting ahead is simply getting started.",
    "Action is the foundational key to all great achievements.",
    "Simplicity is the soul of true efficiency.",
    "Focus on being productive rather than just being busy.",
    "Great things are done by a series of small things brought together."
];

document.addEventListener('DOMContentLoaded', () => {
    // User name editable title persistence & dynamic greeting
    const userNameTitle = document.getElementById('user-name-title');
    const welcomePrefix = document.getElementById('welcome-prefix');

    if (userNameTitle) {
        const savedName = localStorage.getItem('sp-user-name');
        if (savedName) userNameTitle.textContent = savedName;

        // Dynamic time-based greeting prefix ("Good morning,", "Good afternoon,", "Good evening,", or "Welcome back,")
        if (welcomePrefix) {
            const hour = new Date().getHours();
            let greeting = "Welcome back, ";
            if (hour >= 5 && hour < 12) greeting = "Good morning, ";
            else if (hour >= 12 && hour < 17) greeting = "Good afternoon, ";
            else if (hour >= 17 && hour < 22) greeting = "Good evening, ";
            welcomePrefix.textContent = greeting;
        }

        userNameTitle.addEventListener('blur', () => {
            const name = userNameTitle.textContent.trim() || 'Sophia Caldwell';
            localStorage.setItem('sp-user-name', name);
        });
        userNameTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                userNameTitle.blur();
            }
        });
    }

    // Message of the Day (MOTD)
    const motdTextEl = document.getElementById('motd-text');
    const motdContainer = document.getElementById('message-of-the-day');
    if (motdTextEl) {
        let dayIndex = (new Date().getDate() + new Date().getMonth()) % motdList.length;
        const savedQuoteIdx = localStorage.getItem('sp-motd-idx');
        if (savedQuoteIdx !== null) {
            dayIndex = parseInt(savedQuoteIdx, 10) % motdList.length;
        }
        motdTextEl.textContent = motdList[dayIndex];

        if (motdContainer) {
            motdContainer.addEventListener('click', () => {
                dayIndex = (dayIndex + 1) % motdList.length;
                localStorage.setItem('sp-motd-idx', dayIndex);
                motdTextEl.style.opacity = '0';
                setTimeout(() => {
                    motdTextEl.textContent = motdList[dayIndex];
                    motdTextEl.style.opacity = '1';
                }, 150);
            });
        }
    }

    // Scratchpad notes auto-save
    const notesArea = document.getElementById('scratchpad-notes');
    if (notesArea) {
        notesArea.value = localStorage.getItem('sp-scratchpad-notes') || '';
        notesArea.addEventListener('input', () => {
            localStorage.setItem('sp-scratchpad-notes', notesArea.value);
        });
    }

    // Tiles & launch buttons
    document.querySelectorAll('.sp-tile-item, .tile-item').forEach(tile => {
        tile.addEventListener('click', () => {
            const url = tile.getAttribute('data-url');
            if (url) {
                const targetUrl = url.startsWith('http') ? url : 'https://' + url;
                window.location.href = targetUrl;
            }
        });
    });

    // ── Live News Custom UI Hub Engine ────────────────────────────────
    initNewsHubEngine();
});

function initNewsHubEngine() {
    const newsTriggerBtn = document.getElementById('news-trigger-btn');
    const newsModalOverlay = document.getElementById('news-modal-overlay');
    const newsCloseBtn = document.getElementById('news-close-btn');
    const newsRefreshBtn = document.getElementById('news-refresh-btn');
    const citySearchInput = document.getElementById('weather-city-search-input');

    if (!newsModalOverlay) return;

    // Check opt-out setting
    const checkOptOut = () => {
        if (!newsTriggerBtn) return;
        
        const updateVisibility = (isEnabled) => {
            newsTriggerBtn.style.setProperty('display', isEnabled ? 'inline-flex' : 'none', 'important');
        };

        if (window.electronAPI && window.electronAPI.getSettings) {
            window.electronAPI.getSettings().then(s => {
                const isEnabled = (s && s.showNewsHub !== undefined) ? (s.showNewsHub !== false) : (localStorage.getItem('ocal-show-news') !== 'false');
                updateVisibility(isEnabled);
            }).catch(() => {
                const isEnabled = localStorage.getItem('ocal-show-news') !== 'false';
                updateVisibility(isEnabled);
            });
        } else {
            const isEnabled = localStorage.getItem('ocal-show-news') !== 'false';
            updateVisibility(isEnabled);
        }
    };

    checkOptOut();
    window.addEventListener('storage', checkOptOut);
    window.addEventListener('focus', checkOptOut);

    let currentWeatherLat = 23.0225;
    let currentWeatherLon = 72.5714;
    let currentCityName = localStorage.getItem('ocal-weather-loc') || localStorage.getItem('ocal-settings-weather-location') || 'Ahmedabad';

    // Weather WMO Code mapping helper (Monochrome FontAwesome Icons)
    function getWmoWeatherDetails(code, isDay = 1) {
        const mapping = {
            0: { text: isDay ? 'Clear Sky' : 'Clear Night', icon: isDay ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>' },
            1: { text: 'Mainly Clear', icon: isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>' },
            2: { text: 'Partly Cloudy', icon: isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>' },
            3: { text: 'Overcast', icon: '<i class="fas fa-cloud"></i>' },
            45: { text: 'Foggy', icon: '<i class="fas fa-smog"></i>' },
            48: { text: 'Rime Fog', icon: '<i class="fas fa-smog"></i>' },
            51: { text: 'Light Drizzle', icon: '<i class="fas fa-cloud-rain"></i>' },
            53: { text: 'Moderate Drizzle', icon: '<i class="fas fa-cloud-rain"></i>' },
            55: { text: 'Dense Drizzle', icon: '<i class="fas fa-cloud-showers-heavy"></i>' },
            61: { text: 'Slight Rain', icon: '<i class="fas fa-cloud-rain"></i>' },
            63: { text: 'Moderate Rain', icon: '<i class="fas fa-cloud-showers-heavy"></i>' },
            65: { text: 'Heavy Rain', icon: '<i class="fas fa-cloud-showers-water"></i>' },
            71: { text: 'Slight Snow', icon: '<i class="fas fa-snowflake"></i>' },
            73: { text: 'Moderate Snow', icon: '<i class="fas fa-snowflake"></i>' },
            75: { text: 'Heavy Snow', icon: '<i class="fas fa-snowflake"></i>' },
            80: { text: 'Slight Rain Showers', icon: '<i class="fas fa-cloud-sun-rain"></i>' },
            81: { text: 'Moderate Rain Showers', icon: '<i class="fas fa-cloud-showers-heavy"></i>' },
            82: { text: 'Violent Rain Showers', icon: '<i class="fas fa-cloud-showers-water"></i>' },
            95: { text: 'Thunderstorm', icon: '<i class="fas fa-bolt"></i>' },
            96: { text: 'Thunderstorm & Hail', icon: '<i class="fas fa-cloud-bolt"></i>' },
            99: { text: 'Heavy Thunderstorm', icon: '<i class="fas fa-cloud-bolt"></i>' }
        };
        return mapping[code] || { text: 'Partly Cloudy', icon: isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>' };
    }

    async function loadWeatherHubData(locationQuery) {
        const statusSub = document.getElementById('weather-modal-status-sub');
        if (statusSub) {
            statusSub.innerHTML = `<i class="fas fa-spinner fa-spin" style="color: var(--accent, #09f0a0); margin-right: 6px;"></i> Fetching telemetry for ${locationQuery}...`;
        }

        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=en&format=json`);
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                if (geoData && geoData.results && geoData.results.length > 0) {
                    const loc = geoData.results[0];
                    currentWeatherLat = loc.latitude;
                    currentWeatherLon = loc.longitude;
                    currentCityName = `${loc.name}${loc.country ? ', ' + loc.country : ''}`;
                }
            }

            const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${currentWeatherLat}&longitude=${currentWeatherLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,surface_pressure,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;
            
            const forecastRes = await fetch(forecastUrl);
            if (!forecastRes.ok) return;
            const weather = await forecastRes.json();

            const cur = weather.current || {};
            const daily = weather.daily || {};
            const hourly = weather.hourly || {};
            const wDetails = getWmoWeatherDetails(cur.weather_code ?? 0, cur.is_day ?? 1);

            const modalTitle = document.getElementById('weather-modal-location-title');
            const cityEl = document.getElementById('wh-city-name');
            const tempEl = document.getElementById('wh-main-temp');
            const iconEl = document.getElementById('wh-main-icon');
            const condEl = document.getElementById('wh-main-condition');
            const highEl = document.getElementById('wh-high-temp');
            const lowEl = document.getElementById('wh-low-temp');
            const feelsEl = document.getElementById('wh-feels-like');

            if (modalTitle) modalTitle.textContent = `Weather in ${currentCityName}`;
            if (cityEl) cityEl.textContent = currentCityName;
            if (tempEl) tempEl.textContent = `${Math.round(cur.temperature_2m)}°C`;
            if (iconEl) iconEl.innerHTML = wDetails.icon;
            if (condEl) condEl.textContent = wDetails.text;
            if (highEl) highEl.textContent = `${Math.round(daily.temperature_2m_max?.[0] ?? cur.temperature_2m)}°C`;
            if (lowEl) lowEl.textContent = `${Math.round(daily.temperature_2m_min?.[0] ?? cur.temperature_2m)}°C`;
            if (feelsEl) feelsEl.textContent = `${Math.round(cur.apparent_temperature ?? cur.temperature_2m)}°C`;

            if (statusSub) {
                statusSub.innerHTML = `<i class="fas fa-signal" style="color: var(--accent, #09f0a0); margin-right: 6px;"></i> Meteorological telemetry active &bull; ${currentCityName}`;
            }
        } catch (e) {
            console.warn('Weather telemetry load error:', e);
            if (statusSub) statusSub.innerHTML = `<i class="fas fa-circle-exclamation" style="color: #ef4444; margin-right: 6px;"></i> Meteorological connection error for ${locationQuery}`;
        }
    }

    if (newsTriggerBtn && newsModalOverlay) {
        newsTriggerBtn.onclick = () => {
            newsModalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            loadWeatherHubData(currentCityName);
        };
    }

    if (newsCloseBtn && newsModalOverlay) {
        newsCloseBtn.onclick = () => {
            newsModalOverlay.style.display = 'none';
            document.body.style.overflow = '';
        };
    }

    if (newsModalOverlay) {
        newsModalOverlay.onclick = (e) => {
            if (e.target === newsModalOverlay) {
                newsModalOverlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        };
    }

    if (newsRefreshBtn) {
        newsRefreshBtn.onclick = () => {
            loadWeatherHubData(currentCityName);
        };
    }

    if (citySearchInput) {
        citySearchInput.onkeydown = (e) => {
            if (e.key === 'Enter' && citySearchInput.value.trim()) {
                loadWeatherHubData(citySearchInput.value.trim());
            }
        };
    }

    loadWeatherHubData(currentCityName);
}

function initNewsHubEngine() {
    const newsTriggerBtn = document.getElementById('news-trigger-btn');
    const newsModalOverlay = document.getElementById('news-modal-overlay');
    const newsCloseBtn = document.getElementById('news-close-btn');
    const newsRefreshBtn = document.getElementById('news-refresh-btn');
    const citySearchInput = document.getElementById('weather-city-search-input');

    if (!newsModalOverlay) return;

    // Check opt-out setting
    const checkOptOut = () => {
        if (!newsTriggerBtn) return;
        
        const updateVisibility = (isEnabled) => {
            newsTriggerBtn.style.setProperty('display', isEnabled ? 'inline-flex' : 'none', 'important');
        };

        if (window.electronAPI && window.electronAPI.getSettings) {
            window.electronAPI.getSettings().then(s => {
                const isEnabled = (s && s.showNewsHub !== undefined) ? (s.showNewsHub !== false) : (localStorage.getItem('ocal-show-news') !== 'false');
                updateVisibility(isEnabled);
            }).catch(() => {
                const isEnabled = localStorage.getItem('ocal-show-news') !== 'false';
                updateVisibility(isEnabled);
            });
        } else {
            const isEnabled = localStorage.getItem('ocal-show-news') !== 'false';
            updateVisibility(isEnabled);
        }
    };

    checkOptOut();
    window.addEventListener('storage', checkOptOut);
    window.addEventListener('focus', checkOptOut);

    let currentWeatherLat = 23.0225;
    let currentWeatherLon = 72.5714;
    let currentCityName = localStorage.getItem('ocal-weather-loc') || localStorage.getItem('ocal-settings-weather-location') || 'Ahmedabad';

    // Weather WMO Code mapping helper (Monochrome FontAwesome Icons)
    function getWmoWeatherDetails(code, isDay = 1) {
        const mapping = {
            0: { text: isDay ? 'Clear Sky' : 'Clear Night', icon: isDay ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>' },
            1: { text: 'Mainly Clear', icon: isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>' },
            2: { text: 'Partly Cloudy', icon: isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>' },
            3: { text: 'Overcast', icon: '<i class="fas fa-cloud"></i>' },
            45: { text: 'Foggy', icon: '<i class="fas fa-smog"></i>' },
            48: { text: 'Rime Fog', icon: '<i class="fas fa-smog"></i>' },
            51: { text: 'Light Drizzle', icon: '<i class="fas fa-cloud-rain"></i>' },
            53: { text: 'Moderate Drizzle', icon: '<i class="fas fa-cloud-rain"></i>' },
            55: { text: 'Dense Drizzle', icon: '<i class="fas fa-cloud-showers-heavy"></i>' },
            61: { text: 'Slight Rain', icon: '<i class="fas fa-cloud-rain"></i>' },
            63: { text: 'Moderate Rain', icon: '<i class="fas fa-cloud-showers-heavy"></i>' },
            65: { text: 'Heavy Rain', icon: '<i class="fas fa-cloud-showers-water"></i>' },
            71: { text: 'Slight Snow', icon: '<i class="fas fa-snowflake"></i>' },
            73: { text: 'Moderate Snow', icon: '<i class="fas fa-snowflake"></i>' },
            75: { text: 'Heavy Snow', icon: '<i class="fas fa-snowflake"></i>' },
            80: { text: 'Slight Rain Showers', icon: '<i class="fas fa-cloud-sun-rain"></i>' },
            81: { text: 'Moderate Rain Showers', icon: '<i class="fas fa-cloud-showers-heavy"></i>' },
            82: { text: 'Violent Rain Showers', icon: '<i class="fas fa-cloud-showers-water"></i>' },
            95: { text: 'Thunderstorm', icon: '<i class="fas fa-bolt"></i>' },
            96: { text: 'Thunderstorm & Hail', icon: '<i class="fas fa-cloud-bolt"></i>' },
            99: { text: 'Heavy Thunderstorm', icon: '<i class="fas fa-cloud-bolt"></i>' }
        };
        return mapping[code] || { text: 'Partly Cloudy', icon: isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>' };
    }

    async function loadWeatherHubData(locationQuery) {
        const statusSub = document.getElementById('weather-modal-status-sub');
        if (statusSub) {
            statusSub.innerHTML = `<i class="fas fa-spinner fa-spin" style="color: var(--accent, #09f0a0); margin-right: 6px;"></i> Fetching telemetry for ${locationQuery}...`;
        }

        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=en&format=json`);
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                if (geoData && geoData.results && geoData.results.length > 0) {
                    const loc = geoData.results[0];
                    currentWeatherLat = loc.latitude;
                    currentWeatherLon = loc.longitude;
                    currentCityName = `${loc.name}${loc.country ? ', ' + loc.country : ''}`;
                }
            }

            const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${currentWeatherLat}&longitude=${currentWeatherLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,surface_pressure,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;
            
            const forecastRes = await fetch(forecastUrl);
            if (!forecastRes.ok) return;
            const weather = await forecastRes.json();

            const cur = weather.current || {};
            const daily = weather.daily || {};
            const hourly = weather.hourly || {};
            const wDetails = getWmoWeatherDetails(cur.weather_code ?? 0, cur.is_day ?? 1);

            const modalTitle = document.getElementById('weather-modal-location-title');
            const cityEl = document.getElementById('wh-city-name');
            const tempEl = document.getElementById('wh-main-temp');
            const iconEl = document.getElementById('wh-main-icon');
            const condEl = document.getElementById('wh-main-condition');
            const highEl = document.getElementById('wh-high-temp');
            const lowEl = document.getElementById('wh-low-temp');
            const feelsEl = document.getElementById('wh-feels-like');

            if (modalTitle) modalTitle.textContent = `Weather in ${currentCityName}`;
            if (cityEl) cityEl.textContent = currentCityName;
            if (tempEl) tempEl.textContent = `${Math.round(cur.temperature_2m)}°C`;
            if (iconEl) iconEl.innerHTML = wDetails.icon;
            if (condEl) condEl.textContent = wDetails.text;
            if (highEl) highEl.textContent = `${Math.round(daily.temperature_2m_max?.[0] ?? cur.temperature_2m)}°C`;
            if (lowEl) lowEl.textContent = `${Math.round(daily.temperature_2m_min?.[0] ?? cur.temperature_2m)}°C`;
            if (feelsEl) feelsEl.textContent = `${Math.round(cur.apparent_temperature ?? cur.temperature_2m)}°C`;

            const humEl = document.getElementById('wd-humidity');
            const windEl = document.getElementById('wd-wind');
            const uvEl = document.getElementById('wd-uv');
            const pressEl = document.getElementById('wd-pressure');
            const visEl = document.getElementById('wd-visibility');
            const dewEl = document.getElementById('wd-dew');
            const srEl = document.getElementById('wd-sunrise');
            const ssEl = document.getElementById('wd-sunset');
            const cloudEl = document.getElementById('wd-cloud');
            const gustEl = document.getElementById('wd-gusts');

            if (humEl) humEl.textContent = `${cur.relative_humidity_2m ?? '--'}%`;
            if (windEl) windEl.textContent = `${Math.round(cur.wind_speed_10m ?? 0)} km/h`;
            
            const uvMax = daily.uv_index_max?.[0] ?? 4;
            let uvLevel = 'Low';
            if (uvMax > 8) uvLevel = 'Very High';
            else if (uvMax > 5) uvLevel = 'High';
            else if (uvMax > 2) uvLevel = 'Moderate';
            if (uvEl) uvEl.textContent = `${uvMax.toFixed(1)} (${uvLevel})`;

            if (pressEl) pressEl.textContent = `${Math.round(cur.pressure_msl ?? 1013)} hPa`;
            
            const visKm = ((hourly.visibility?.[0] ?? 10000) / 1000).toFixed(1);
            if (visEl) visEl.textContent = `${visKm} km`;
            
            if (dewEl) dewEl.textContent = `${Math.round(hourly.dew_point_2m?.[0] ?? 18)}°C`;
            
            const srTime = daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:00 AM';
            const ssTime = daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:00 PM';
            if (srEl) srEl.textContent = srTime;
            if (ssEl) ssEl.textContent = ssTime;
            
            if (cloudEl) cloudEl.textContent = `${cur.cloud_cover ?? 0}%`;
            if (gustEl) gustEl.textContent = `${Math.round(cur.wind_gusts_10m ?? cur.wind_speed_10m ?? 0)} km/h`;

            const homeCity = document.getElementById('weather-city');
            const homeTemp = document.getElementById('weather-temp');
            const homeCond = document.getElementById('weather-condition');
            const homeHum = document.getElementById('weather-humidity');
            const homeWind = document.getElementById('weather-wind');
            const homeFeels = document.getElementById('weather-feels');

            if (homeCity) homeCity.textContent = currentCityName.split(',')[0];
            if (homeTemp) homeTemp.textContent = `${Math.round(cur.temperature_2m)}°C`;
            if (homeCond) homeCond.innerHTML = `${wDetails.icon} <span>${wDetails.text}</span>`;
            if (homeHum) homeHum.textContent = `${cur.relative_humidity_2m}%`;
            if (homeWind) homeWind.textContent = `${Math.round(cur.wind_speed_10m)} KM/H`;
            if (homeFeels) homeFeels.textContent = `${Math.round(cur.apparent_temperature)}°C`;

            const hourlySlider = document.getElementById('weather-hourly-slider');
            if (hourlySlider && hourly.time) {
                let hourlyHtml = '';
                const nowHourIdx = new Date().getHours();
                
                for (let i = 0; i < 24; i++) {
                    const idx = (nowHourIdx + i) % hourly.time.length;
                    const timeStr = new Date(hourly.time[idx]).toLocaleTimeString([], { hour: 'numeric', hour12: true });
                    const temp = Math.round(hourly.temperature_2m[idx]);
                    const code = hourly.weather_code[idx];
                    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0;
                    const wind = Math.round(hourly.wind_speed_10m[idx]);
                    const details = getWmoWeatherDetails(code, (i + nowHourIdx) % 24 >= 6 && (i + nowHourIdx) % 24 <= 18 ? 1 : 0);

                    hourlyHtml += `
                        <div class="wh-hourly-card ${i === 0 ? 'now-card' : ''}">
                            <span class="wh-hourly-time">${i === 0 ? 'Now' : timeStr}</span>
                            <span class="wh-hourly-icon">${details.icon}</span>
                            <span class="wh-hourly-temp">${temp}°C</span>
                            <span class="wh-hourly-pop"><i class="fas fa-droplet" style="font-size: 10px;"></i> ${pop}%</span>
                            <span class="wh-hourly-wind"><i class="fas fa-wind" style="font-size: 9px;"></i> ${wind} km/h</span>
                        </div>
                    `;
                }
                hourlySlider.innerHTML = hourlyHtml;
            }

            if (statusSub) {
                statusSub.innerHTML = `<i class="fas fa-signal" style="color: var(--accent, #09f0a0); margin-right: 6px;"></i> Meteorological telemetry active &bull; ${currentCityName}`;
            }

        } catch (e) {
            console.warn('Weather telemetry load error:', e);
            if (statusSub) statusSub.innerHTML = `<i class="fas fa-circle-exclamation" style="color: #ef4444; margin-right: 6px;"></i> Meteorological connection error for ${locationQuery}`;
        }
    }

    if (newsTriggerBtn && newsModalOverlay) {
        newsTriggerBtn.onclick = () => {
            newsModalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            loadWeatherHubData(currentCityName);
        };
    }

    if (newsCloseBtn && newsModalOverlay) {
        newsCloseBtn.onclick = () => {
            newsModalOverlay.style.display = 'none';
            document.body.style.overflow = '';
        };
    }

    if (newsModalOverlay) {
        newsModalOverlay.onclick = (e) => {
            if (e.target === newsModalOverlay) {
                newsModalOverlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        };
    }

    if (newsRefreshBtn) {
        newsRefreshBtn.onclick = () => {
            loadWeatherHubData(currentCityName);
        };
    }

    if (citySearchInput) {
        citySearchInput.onkeydown = (e) => {
            if (e.key === 'Enter' && citySearchInput.value.trim()) {
                loadWeatherHubData(citySearchInput.value.trim());
            }
        };
    }

    loadWeatherHubData(currentCityName);
}

// ── Ocal Start Page Real-Time Autocorrect Engine ────────────────────
(function() {
    const TYPO_MAP = {
        'teh': 'the', 'taht': 'that', 'tihs': 'this', 'waht': 'what', 'wihch': 'which',
        'recieve': 'receive', 'seperate': 'separate', 'definately': 'definitely',
        'definatly': 'definitely', 'becuase': 'because', 'becasue': 'because',
        'beleive': 'believe', 'occured': 'occurred', 'truely': 'truly',
        'tommorow': 'tomorrow', 'tommorrow': 'tomorrow', 'goverment': 'government',
        'enviroment': 'environment', 'maintainance': 'maintenance',
        'pronounciation': 'pronunciation', 'accommodate': 'accommodate',
        'dont': "don't", 'cant': "can't", 'wont': "won't", 'isnt': "isn't",
        'arent': "aren't", 'wasnt': "wasn't", 'werent': "weren't", 'hasnt': "hasn't",
        'havent': "haven't", 'hadnt': "hadn't", 'doesnt': "doesn't",
        'shouldnt': "shouldn't", 'couldnt': "couldn't", 'wouldnt': "wouldn't",
        'didnt': "didn't", 'youre': "you're", 'theyre': "they're",
        'hes': "he's", 'shes': "she's", 'its': "it's", 'whos': "who's",
        'whats': "what's", 'wheres': "where's", 'whens': "when's", 'hows': "how's",
        'theres': "there's", 'heres': "here's", 'im': "I'm", 'ive': "I've",
        'ill': "I'll", 'id': "I'd"
    };

    function matchCase(original, replacement) {
        if (!original || !replacement) return replacement;
        if (original === original.toUpperCase()) return replacement.toUpperCase();
        if (original[0] === original[0].toUpperCase()) {
            return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement.toLowerCase();
    }

    function autocorrectField(target) {
        if (!target) return;
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        const inputType = (target.type || '').toLowerCase();
        if (inputType === 'password' || inputType === 'email' || inputType === 'url' || inputType === 'number') return;

        if (tag === 'input' || tag === 'textarea') {
            const val = target.value;
            const pos = target.selectionStart;
            if (pos === null || pos === undefined) return;

            const textBefore = val.slice(0, pos);
            const match = textBefore.match(/([a-zA-Z']+)([\s,.!?:;]+)$/);
            if (match) {
                const word = match[1];
                const suffix = match[2];
                const cleanLower = word.toLowerCase();
                let corrected = null;

                if (cleanLower === 'i') corrected = 'I';
                else if (TYPO_MAP[cleanLower]) corrected = matchCase(word, TYPO_MAP[cleanLower]);

                if (corrected && corrected !== word) {
                    const wordStart = textBefore.length - match[0].length;
                    const newVal = val.slice(0, wordStart) + corrected + suffix + val.slice(pos);
                    target.value = newVal;
                    const newPos = wordStart + corrected.length + suffix.length;
                    target.setSelectionRange(newPos, newPos);
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
    }

    document.addEventListener('input', (e) => autocorrectField(e.target), true);
    document.addEventListener('keydown', (e) => {
        if ([' ', 'Enter', 'Tab', '.', ',', '!', '?', ';', ':'].includes(e.key)) {
            setTimeout(() => autocorrectField(e.target), 0);
        }
    }, true);
})();
