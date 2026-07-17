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
const searchInput = document.getElementById('home-search');
const searchBtn = document.getElementById('search-btn');
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
        let searchUrl = 'https://www.google.com/search?q=';
        if (currentSearchEngine === 'bing') searchUrl = 'https://www.bing.com/search?q=';
        else if (currentSearchEngine === 'duckduckgo') searchUrl = 'https://duckduckgo.com/?q=';
        else if (currentSearchEngine === 'brave') searchUrl = 'https://search.brave.com/search?q=';
        else if (currentSearchEngine === 'yahoo') searchUrl = 'https://search.yahoo.com/search?p=';
        
        window.location.href = searchUrl + encodeURIComponent(q);
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
            splitOverlay.style.display = 'grid';
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
