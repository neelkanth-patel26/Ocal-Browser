/**
 * Ocal Browser Home Logic - Premium Polish & Entry
 */

const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// ── Elements ─────────────────────────────────────────────────────
const clockEl = document.getElementById('clock');
const greetingTxt = document.getElementById('greeting-txt');
const dateTxt = document.getElementById('date-txt');
const searchInput = document.getElementById('home-search');
const searchBtn = document.getElementById('search-btn');
const todoInput = document.getElementById('todo-input');
const todoListEl = document.getElementById('todo-list');
const timerDisplay = document.getElementById('timer-display');
const timerToggle = document.getElementById('timer-toggle');
const timerReset = document.getElementById('timer-reset');
const dashMain = document.getElementById('dashboard-main');

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
}
setInterval(updateTick, 1000);
updateTick();

// ── Search Logic ───────────────────────────────────────────────
function executeSearch() {
    if (!searchInput) return;
    const q = searchInput.value.trim();
    if (!q) return;

    if (/^https?:\/\//.test(q)) {
        window.location.href = q;
    } else if (/^[\w-]+\.[a-z]{2,}/.test(q) && !q.includes(' ')) {
        window.location.href = 'https://' + q;
    } else {
        window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
    }
}

if (searchInput) {
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') executeSearch();
    });
}
if (searchBtn) searchBtn.onclick = () => executeSearch();

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
    const tempEl = document.getElementById('weather-temp');
    const cityEl = document.getElementById('weather-city');
    const iconEl = document.querySelector('.weather-icon');
    const condEl = document.getElementById('weather-condition');
    const humEl = document.getElementById('weather-humidity');
    const windEl = document.getElementById('weather-wind');
    const feelsEl = document.getElementById('weather-feels');
    const locInput = document.getElementById('location-input');

    const fetchWeather = async (locStr = '') => {
        try {
            const response = await fetch(`https://wttr.in/${locStr}?format=j1`);
            const data = await response.json();
            const current = data.current_condition[0];
            const city = data.nearest_area[0].areaName[0].value;
            const code = current.weatherCode;
            const desc = current.weatherDesc[0].value;

            if (tempEl) tempEl.textContent = `${current.temp_C}°C`;
            if (cityEl) cityEl.textContent = city.toUpperCase();
            if (condEl) condEl.textContent = desc.toUpperCase();
            if (humEl) humEl.textContent = `${current.humidity}%`;
            if (windEl) windEl.textContent = `${current.windspeedKmph} KM/H`;
            if (feelsEl) feelsEl.textContent = `${current.FeelsLikeC}°C`;
            
            if (iconEl && weatherIconMap[code]) {
                iconEl.className = `fas ${weatherIconMap[code]} weather-icon`;
            }
        } catch (e) { 
            console.warn('Weather fetch failed.'); 
            if (condEl) condEl.textContent = 'OFFLINE';
        }
    };

    // Manual Location Toggle
    const cityTrigger = document.getElementById('city-trigger');
    if (cityTrigger && locInput) {
        cityTrigger.onclick = () => {
            cityTrigger.style.display = 'none';
            locInput.style.display = 'block';
            locInput.value = cityEl.textContent;
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
            window.electronAPI.send('switch-tab-sidebar', 'history');
        }
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

function applySettings(s) {
    if (!s) return;
    const root = document.documentElement;
    if (s.accentColor) {
        root.style.setProperty('--accent', s.accentColor);
        root.style.setProperty('--accent-glow', hexToRgba(s.accentColor, 0.45));
        root.style.setProperty('--accent-dim', hexToRgba(s.accentColor, 0.15));
        root.style.setProperty('--accent-border', hexToRgba(s.accentColor, 0.4));
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

    if (todoPanel) todoPanel.style.display = (s.showDailyFocus !== false) ? 'flex' : 'none';
    if (timerPanel) timerPanel.style.display = (s.showFocusFlow !== false) ? 'flex' : 'none';
    if (weatherPanel) weatherPanel.style.display = (s.showWeather !== false) ? 'flex' : 'none';

    document.body.classList.toggle('battery-saver', !!s.batterySaver);
    document.body.setAttribute('data-theme', s.themeMode || 'dark');
}



if (window.electronAPI) {
    window.electronAPI.onSettingsChanged(s => applySettings(s));
    window.electronAPI.getSettings().then(s => applySettings(s));
}
