const { ipcRenderer } = require('electron');

// We use the exposed electronAPI if available, but since this is a separate window, 
// we might need to use ipcRenderer directly if contextIsolation is on and it's not preloaded.
// Actually, I'll assume we use the same preload.js or similar.

const playPauseBtn = document.getElementById('play-pause-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const bufferBar = document.getElementById('buffer-bar');
const timeDisplay = document.getElementById('time-display');
const volumeSlider = document.getElementById('volume-slider');
const closeBtn = document.getElementById('close-btn');
const returnBtn = document.getElementById('return-btn');
const speedBtn = document.getElementById('speed-btn');
const videoTitle = document.getElementById('video-title');
const windowTitle = document.getElementById('window-title');
const minimizeBtn = document.getElementById('minimize-btn');
const pipCanvas = document.getElementById('pip-canvas');
const ctx = pipCanvas.getContext('2d', { alpha: false });
const loader = document.getElementById('pip-loader');
const thumbnail = document.getElementById('pip-thumbnail');

let isPlaying = false;
let duration = 0;
let currentTime = 0;
let currentSpeed = 1.0;
let firstFrameReceived = false;

// Direct-Link MessagePort Receiver
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
            
            // Update UI
            playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            const progress = (currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
            
            if (bufferBar && data.buffered !== undefined) {
                bufferBar.style.width = `${data.buffered}%`;
            }

            timeDisplay.innerText = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            speedBtn.innerText = `${currentSpeed.toFixed(1)}X`;
            
            if (data.title) {
                videoTitle.innerText = data.title;
                windowTitle.innerText = data.title || 'Video Pop-out';
            }
            
            // Sync volume slider if it hasn't been touched
            if (document.activeElement !== volumeSlider) {
                volumeSlider.value = data.volume * 100;
            }
        }
    };
});

playPauseBtn.onclick = () => {
    ipcRenderer.send('pip-control', { action: 'toggle-play' });
};

speedBtn.onclick = () => {
    const speeds = [1.0, 1.5, 2.0];
    let nextIdx = (speeds.indexOf(currentSpeed) + 1) % speeds.length;
    let nextSpeed = speeds[nextIdx];
    ipcRenderer.send('pip-control', { action: 'speed', value: nextSpeed });
};

progressContainer.onclick = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    ipcRenderer.send('pip-control', { action: 'seek', value: percentage * duration });
};

volumeSlider.oninput = () => {
    ipcRenderer.send('pip-control', { action: 'volume', value: volumeSlider.value / 100 });
};

minimizeBtn.onclick = () => {
    ipcRenderer.send('minimize-pip-window');
};

closeBtn.onclick = () => {
    window.close();
};

returnBtn.onclick = () => {
    ipcRenderer.send('pip-control', { action: 'return' });
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
