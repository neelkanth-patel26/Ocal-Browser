const clockH    = document.getElementById('clock-h');
const clockM    = document.getElementById('clock-m');
const greetingEl = document.getElementById('greeting');
const dateEl    = document.getElementById('date-display');
const searchEl  = document.getElementById('home-search');
const orbs      = document.querySelectorAll('.orb');

const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const GREETINGS = {
    morning:   'GOOD MORNING',
    afternoon: 'GOOD AFTERNOON',
    evening:   'GOOD EVENING',
    night:     'GOOD NIGHT'
};

function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    if (clockH) clockH.textContent = String(h).padStart(2, '0');
    if (clockM) clockM.textContent = String(m).padStart(2, '0');

    let group = 'night';
    if (h >= 5  && h < 12) group = 'morning';
    if (h >= 12 && h < 17) group = 'afternoon';
    if (h >= 17 && h < 22) group = 'evening';

    if (greetingEl) greetingEl.textContent = GREETINGS[group];
    if (dateEl) dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

setInterval(tick, 1000);
tick();

// ── Search ───────────────────────────────────────────────────────
if (searchEl) {
    searchEl.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || !searchEl.value.trim()) return;
        const q = searchEl.value.trim();
        if (/^https?:\/\//.test(q)) window.location.href = q;
        else if (/^[\w-]+\.[a-z]{2,}/.test(q) && !q.includes(' ')) window.location.href = 'https://' + q;
        else window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
    });
}

// ── Parallax Orbs ────────────────────────────────────────────────
document.addEventListener('mousemove', e => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / 50;
    const dy = (e.clientY - cy) / 50;
    orbs.forEach((orb, i) => {
        const d = (i + 1) * 0.6;
        orb.style.transform = `translate(${dx * d}px, ${dy * d}px)`;
    });
});

// ── Quick Tiles ──────────────────────────────────────────────────
document.querySelectorAll('.tile').forEach(tile => {
    tile.onclick = () => {
        const url = tile.dataset.url;
        if (url) window.location.href = 'https://' + url;
    };
});

// ── Bottom Bar Actions ───────────────────────────────────────────
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
            window.electronAPI.send('switch-tab-sidebar', 'history');
        }
    };
}

// ── Dynamic Accent & Settings ────────────────────────────────────
function applySettings(s) {
    if (!s) return;
    const root = document.documentElement;

    if (s.accentColor) {
        root.style.setProperty('--accent', s.accentColor);
        const r = parseInt(s.accentColor.slice(1, 3), 16);
        const g = parseInt(s.accentColor.slice(3, 5), 16);
        const b = parseInt(s.accentColor.slice(5, 7), 16);
        root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.25)`);
    }

    if (s.homeTileSize) root.style.setProperty('--tile-size', s.homeTileSize + 'px');
    if (s.homeTileSpacing) root.style.setProperty('--tile-gap', s.homeTileSpacing + 'px');

    // Handle Layout
    const content = document.querySelector('.content');
    if (content && s.homeLayout) {
        content.classList.remove('layout-top', 'layout-center', 'layout-bottom');
        content.classList.add(`layout-${s.homeLayout}`);
    }

    // Handle Tile Style
    if (s.homeTileStyle) {
        document.querySelectorAll('.tile').forEach(tile => {
            tile.classList.remove('style-square', 'style-rectangle', 'style-monochrome');
            tile.classList.add(`style-${s.homeTileStyle}`);
        });
    }
}

if (window.electronAPI) {
    window.electronAPI.onSettingsChanged(s => applySettings(s));
    window.electronAPI.getSettings().then(s => applySettings(s));
}
