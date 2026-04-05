const { ipcRenderer } = require('electron');

const container = document.getElementById('pip-container');
const overlay = document.getElementById('controls-overlay');
const pipCanvas = document.getElementById('pip-canvas');
const ctx = pipCanvas.getContext('2d', { alpha: false });
const loader = document.getElementById('pip-loader');
const thumbnail = document.getElementById('pip-thumbnail');

const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const skipBackBtn = document.getElementById('skip-back-btn');
const nextBtn = document.getElementById('next-btn');
const volumeBtn = document.getElementById('volume-icon-btn');
const volumeIcon = document.getElementById('volume-icon');
const pinBtn = document.getElementById('pin-btn');
const captionsBtn = document.getElementById('captions-btn');
const returnBtn = document.getElementById('return-btn');
const closeBtn = document.getElementById('close-btn');

const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const timeDisplay = document.getElementById('time-display');
const speedIndicator = document.getElementById('speed-indicator');

let isPlaying = false;
let duration = 0;
let currentTime = 0;
let currentSpeed = 1.0;
let isMuted = false;
let firstFrameReceived = false;
let controlsTimeout;

// ── Hover / Visibility Logic ──────────────────────────────────────────
function showControls() {
    container.classList.add('show-controls');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
        if (isPlaying) container.classList.remove('show-controls');
    }, 3500);
}

container.onmousemove = showControls;
container.onclick = showControls;

// ── Accent Palette Logic ──────────────────────────────────────────────
document.querySelectorAll('.accent-dot').forEach(dot => {
    dot.onclick = (e) => {
        e.stopPropagation();
        const color = dot.getAttribute('data-color');
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-glow', color + '66'); // 40% alpha in hex
        
        document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
    };
});

// ── Direct-Link MessagePort Receiver ──────────────────────────────────
ipcRenderer.on('pip-port', (event) => {
    const port = event.ports[0];
    port.start();
    
    port.onmessage = (e) => {
        if (e.data.type === 'frame') {
            const { buffer, width, height } = e.data;
            if (pipCanvas.width !== width || pipCanvas.height !== height) {
                pipCanvas.width = width;
                pipCanvas.height = height;
            }
            
            const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
            ctx.putImageData(imageData, 0, 0);
            
            if (!firstFrameReceived) {
                firstFrameReceived = true;
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 400);
            }
        } else if (e.data.type === 'status') {
            const data = e.data.data;
            isPlaying = data.isPlaying;
            duration = data.duration;
            currentTime = data.currentTime;
            currentSpeed = data.speed || 1.0;
            isMuted = data.muted || false;
            
            // Update UI
            playIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
            const progress = (currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
            
            timeDisplay.innerText = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            speedIndicator.innerText = `${currentSpeed.toFixed(1)}X`;

            // Style Volume Icon
            volumeIcon.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
            volumeBtn.style.color = isMuted ? '#ef4444' : 'white';
        }
    };
});

// ── Control Actions ───────────────────────────────────────────────────
playPauseBtn.onclick = (e) => {
    e.stopPropagation();
    ipcRenderer.send('pip-control', { action: 'toggle-play' });
};

skipBackBtn.onclick = (e) => {
    e.stopPropagation();
    ipcRenderer.send('pip-control', { action: 'skip', value: -10 });
};

nextBtn.onclick = (e) => {
    e.stopPropagation();
    ipcRenderer.send('pip-control', { action: 'next-video' });
};

volumeBtn.onclick = (e) => {
    e.stopPropagation();
    ipcRenderer.send('pip-control', { action: 'toggle-mute' });
};

pinBtn.onclick = (e) => {
    e.stopPropagation();
    ipcRenderer.send('toggle-pip-pin');
    pinBtn.style.color = pinBtn.style.color === 'var(--accent)' ? 'white' : 'var(--accent)';
};

captionsBtn.onclick = (e) => {
    e.stopPropagation();
    ipcRenderer.send('pip-control', { action: 'toggle-captions' });
};

speedIndicator.onclick = (e) => {
    e.stopPropagation();
    const speeds = [0.5, 1.0, 1.5, 2.0];
    let currentIdx = speeds.indexOf(parseFloat(currentSpeed.toFixed(1)));
    if (currentIdx === -1) currentIdx = 1;
    let nextIdx = (currentIdx + 1) % speeds.length;
    ipcRenderer.send('pip-control', { action: 'speed', value: speeds[nextIdx] });
};

progressContainer.onclick = (e) => {
    e.stopPropagation();
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    ipcRenderer.send('pip-control', { action: 'seek', value: percentage * duration });
};

returnBtn.onclick = (e) => {
    e.stopPropagation();
    ipcRenderer.send('pip-control', { action: 'return' });
    window.close();
};

closeBtn.onclick = (e) => {
    e.stopPropagation();
    window.close();
};

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Initial show
showControls();
