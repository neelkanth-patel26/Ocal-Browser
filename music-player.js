// ── Ocal Browser Hi-Res Studio Music Player & Smart Library ───────────────────
let allTracks = [];
let filteredTracks = [];
let currentTrackIndex = -1;
let activeFilter = 'all';
let isShuffle = false;
let repeatMode = 0; // 0: off, 1: repeat all, 2: repeat one
let isSeeking = false;
let visualizerMode = 'bars'; // 'bars' | 'mirror' | 'wave'
let barPeaks = [];
let barDropDelays = [];
let idleAnimAngle = 0;
let favorites = new Set();

// Audio & Web Audio DSP State
let activeAudio = null;
let audioCtx = null;
let audioSourceNode = null;
let preampNode = null;
let bassNode = null;
let punchNode = null;
let highsNode = null;
let airNode = null;
let eqNodes = [];
let pannerNode = null;
let compressorNode = null;
let analyserNode = null;
let canvasAnimFrame = null;
let spatial8dTimer = null;
let spatial8dAngle = 0;
let surroundMode = 'cinema';

// DOM Elements
const musicScanStatus = document.getElementById('music-scan-status');
const musicStatCount = document.getElementById('music-stat-count');
const playlistCountBadge = document.getElementById('playlist-count-badge');
const playlistTracksContainer = document.getElementById('playlist-tracks-container');
const playlistSearchInput = document.getElementById('playlist-search-input');
const searchClearBtn = document.getElementById('search-clear-btn');

const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingSub = document.getElementById('now-playing-sub');
const trackFormatTag = document.getElementById('track-format-tag');
const vinylArt = document.getElementById('vinyl-art');
const spectrumCanvas = document.getElementById('studio-spectrum-canvas');

const playerTimeCur = document.getElementById('player-time-cur');
const playerTimeDur = document.getElementById('player-time-dur');
const playerSeekBar = document.getElementById('player-seek-bar');
const playerPlayBtn = document.getElementById('player-play-btn');
const playerPrevBtn = document.getElementById('player-prev-btn');
const playerNextBtn = document.getElementById('player-next-btn');
const playerShuffleBtn = document.getElementById('player-shuffle-btn');
const playerRepeatBtn = document.getElementById('player-repeat-btn');
const playerMuteBtn = document.getElementById('player-mute-btn');
const playerVolBar = document.getElementById('player-vol-bar');
const playerVolPct = document.getElementById('player-vol-pct');

const localAudioFileInput = document.getElementById('local-audio-file-input');
const btnImportAudio = document.getElementById('btn-import-audio');
const libraryDropZone = document.getElementById('library-drop-zone');

// ── Initialization ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load favorites from storage
    try {
        const storedFavs = JSON.parse(localStorage.getItem('ocal-music-favs') || '[]');
        favorites = new Set(storedFavs);
    } catch (e) {
        favorites = new Set();
    }

    // 2. Sync theme & accent
    if (window.electronAPI && window.electronAPI.getSettings) {
        window.electronAPI.getSettings().then(s => {
            if (s) {
                if (s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
                if (s.accentColor && window.OcalColorHarmonizer) {
                    window.OcalColorHarmonizer.applyHarmonizedTheme(s.accentColor, s.themeMode || 'dark');
                }
            }
        }).catch(() => {});
    }

    initModeSwitcher();
    initControls();
    initAudioDspSuite();
    initDragAndDrop();
    startSpectrumVisualizer();

    // 3. Scan Device for Music
    await scanDeviceMusic();

    // 4. Handle URL track parameter (e.g. ?song=... or ?track=...)
    handleUrlParams();
});

// ── Studio Mode Switcher (Deck / EQ / 3D / Bass) ───────────────────────────
function initModeSwitcher() {
    const modeBtns = document.querySelectorAll('.mode-tab-btn');
    const viewSections = {
        deck: document.getElementById('view-deck'),
        eq: document.getElementById('view-eq'),
        spatial: document.getElementById('view-spatial'),
        bass: document.getElementById('view-bass')
    };

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.getAttribute('data-view');
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            Object.keys(viewSections).forEach(v => {
                if (viewSections[v]) {
                    viewSections[v].style.display = (v === targetView) ? 'flex' : 'none';
                }
            });
        });
    });

    // Visualizer Mode Selector
    const visBarsBtn = document.getElementById('vis-bars-btn');
    const visMirrorBtn = document.getElementById('vis-mirror-btn');
    const visWaveBtn = document.getElementById('vis-wave-btn');

    function setVisualizerMode(mode) {
        visualizerMode = mode;
        if (visBarsBtn) visBarsBtn.classList.toggle('active', mode === 'bars');
        if (visMirrorBtn) visMirrorBtn.classList.toggle('active', mode === 'mirror');
        if (visWaveBtn) visWaveBtn.classList.toggle('active', mode === 'wave');
        barPeaks = [];
        barDropDelays = [];
    }

    if (visBarsBtn) visBarsBtn.onclick = () => setVisualizerMode('bars');
    if (visMirrorBtn) visMirrorBtn.onclick = () => setVisualizerMode('mirror');
    if (visWaveBtn) visWaveBtn.onclick = () => setVisualizerMode('wave');
}

// ── Device Scanner & Audio Import ──────────────────────────────────────────
async function scanDeviceMusic() {
    if (musicScanStatus) musicScanStatus.innerText = 'Analyzing storage for audio...';

    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            allTracks = await window.electronAPI.invoke('scan-system-audio') || [];
        }
    } catch (e) {
        console.error('Scan error:', e);
        allTracks = [];
    }

    if (allTracks.length === 0) {
        allTracks = [
            {
                name: 'Ambient_Oasis.mp3',
                title: 'Ambient Space Oasis',
                artist: 'Ocal Studio Master',
                path: '',
                size: 4520000,
                format: 'FLAC 24-BIT',
                category: 'chill',
                isSample: true
            },
            {
                name: 'Cyber_Drive_8D.wav',
                title: 'Cyber Drive 8D Spatial',
                artist: 'Electronic Synthesis',
                path: '',
                size: 8900000,
                format: 'WAV LOSSLESS',
                category: 'energy',
                isSample: true
            },
            {
                name: 'Midnight_Acoustic.flac',
                title: 'Midnight Acoustic Melodies',
                artist: 'Unplugged Session',
                path: '',
                size: 14200000,
                format: 'DSD HI-RES',
                category: 'chill',
                isSample: true
            }
        ];
    }

    updateTrackCounts();
    applyFilter();
}

function updateTrackCounts() {
    if (musicStatCount) musicStatCount.innerText = allTracks.length;
    if (playlistCountBadge) playlistCountBadge.innerText = `${allTracks.length} tracks`;
    if (musicScanStatus) musicScanStatus.innerText = `${allTracks.length} Hi-Res Tracks Ready`;
}

function handleUrlParams() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const songParam = urlParams.get('song') || urlParams.get('track') || urlParams.get('file');
        if (songParam) {
            const decoded = decodeURIComponent(songParam);
            const cleanPath = decoded.replace(/^file:\/\/\/?/i, '').replace(/^[A-Za-z]:\//, (m) => m.toUpperCase());

            let targetIdx = allTracks.findIndex(t => t.path && (t.path.toLowerCase().includes(cleanPath.toLowerCase()) || cleanPath.toLowerCase().includes(t.path.toLowerCase())));

            if (targetIdx === -1) {
                const name = cleanPath.split(/[\/\\]/).pop();
                const newTrack = {
                    name: name,
                    title: name.replace(/\.[^/.]+$/, ''),
                    artist: 'Imported Master',
                    path: cleanPath.startsWith('file:') ? cleanPath : ('file:///' + cleanPath.replace(/\\/g, '/')),
                    size: 0,
                    format: (name.split('.').pop() || 'MP3').toUpperCase(),
                    category: 'all'
                };
                allTracks.unshift(newTrack);
                targetIdx = 0;
                updateTrackCounts();
                applyFilter();
            }

            if (targetIdx >= 0) {
                playTrack(targetIdx);
            }
        }
    } catch (e) {
        console.warn('URL params parse error:', e);
    }
}

// ── Drag & Drop and Direct File Import ─────────────────────────────────────
function initDragAndDrop() {
    if (btnImportAudio && localAudioFileInput) {
        btnImportAudio.onclick = () => localAudioFileInput.click();
        localAudioFileInput.onchange = (e) => {
            const files = Array.from(e.target.files || []);
            handleImportedFiles(files);
        };
    }

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (libraryDropZone) libraryDropZone.classList.add('drag-active');
    });

    window.addEventListener('dragleave', (e) => {
        if (!e.relatedTarget && libraryDropZone) {
            libraryDropZone.classList.remove('drag-active');
        }
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        if (libraryDropZone) libraryDropZone.classList.remove('drag-active');
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length > 0) {
            handleImportedFiles(files);
        }
    });
}

function handleImportedFiles(files) {
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|ogg|aac|wma)$/i.test(f.name));
    if (audioFiles.length === 0) return;

    let firstAddedIdx = -1;
    audioFiles.reverse().forEach((file, i) => {
        const filePath = file.path ? ('file:///' + file.path.replace(/\\/g, '/')) : URL.createObjectURL(file);
        const name = file.name;
        const newTrack = {
            name: name,
            title: name.replace(/\.[^/.]+$/, ''),
            artist: 'Imported Master',
            path: filePath,
            size: file.size,
            format: (name.split('.').pop() || 'AUDIO').toUpperCase(),
            category: 'all'
        };
        allTracks.unshift(newTrack);
        if (i === 0) firstAddedIdx = 0;
    });

    updateTrackCounts();
    applyFilter();

    if (firstAddedIdx >= 0) {
        playTrack(firstAddedIdx);
    }
}

// ── Smart Playlist Rendering ───────────────────────────────────────────────
function applyFilter() {
    const query = playlistSearchInput ? playlistSearchInput.value.trim().toLowerCase() : '';

    filteredTracks = allTracks.filter(track => {
        const matchQuery = !query || 
            track.title.toLowerCase().includes(query) || 
            (track.artist && track.artist.toLowerCase().includes(query)) ||
            track.name.toLowerCase().includes(query);

        if (!matchQuery) return false;
        if (activeFilter === 'all') return true;
        if (activeFilter === 'favorites') {
            return favorites.has(track.path || track.name);
        }
        if (activeFilter === 'lossless') {
            const fmt = (track.format || '').toUpperCase();
            return fmt.includes('FLAC') || fmt.includes('WAV') || fmt.includes('DSD') || fmt.includes('LOSSLESS');
        }
        return track.category === activeFilter;
    });

    renderPlaylist();
}

function renderPlaylist() {
    if (!playlistTracksContainer) return;
    playlistTracksContainer.innerHTML = '';

    if (filteredTracks.length === 0) {
        playlistTracksContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-music"></i>
                <span>No matching tracks found</span>
            </div>
        `;
        return;
    }

    filteredTracks.forEach((track) => {
        const isCurrent = (currentTrackIndex >= 0 && allTracks[currentTrackIndex] === track);
        const isPlaying = isCurrent && activeAudio && !activeAudio.paused;
        const trackKey = track.path || track.name;
        const isFav = favorites.has(trackKey);

        const el = document.createElement('div');
        el.className = `track-card-row ${isCurrent ? 'playing' : ''}`;
        
        el.innerHTML = `
            <div class="track-row-left">
                <div class="track-play-indicator">
                    ${isPlaying ? `
                        <div class="playing-equalizer-bars">
                            <span class="eq-bar"></span>
                            <span class="eq-bar"></span>
                            <span class="eq-bar"></span>
                        </div>
                    ` : `<i class="fas ${isCurrent ? 'fa-pause' : 'fa-play'}"></i>`}
                </div>
                <div class="track-info-cluster">
                    <span class="track-item-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</span>
                    <span class="track-item-sub">${escapeHtml(track.artist || 'Local Master')}</span>
                </div>
            </div>
            <div class="track-row-right">
                <span class="track-format-tag">${escapeHtml(track.format || 'AUDIO')}</span>
                <button class="track-fav-btn ${isFav ? 'active' : ''}" title="Favorite Track">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        `;

        // Favorite Button Toggle
        const favBtn = el.querySelector('.track-fav-btn');
        if (favBtn) {
            favBtn.onclick = (e) => {
                e.stopPropagation();
                if (favorites.has(trackKey)) {
                    favorites.delete(trackKey);
                    favBtn.classList.remove('active');
                } else {
                    favorites.add(trackKey);
                    favBtn.classList.add('active');
                }
                localStorage.setItem('ocal-music-favs', JSON.stringify(Array.from(favorites)));
                if (activeFilter === 'favorites') applyFilter();
            };
        }

        el.onclick = () => {
            const realIdx = allTracks.indexOf(track);
            if (realIdx >= 0) {
                if (currentTrackIndex === realIdx && activeAudio) {
                    togglePlay();
                } else {
                    playTrack(realIdx);
                }
            }
        };

        playlistTracksContainer.appendChild(el);
    });
}

// ── Web Audio DSP & Spectrum Visualizer Engine ─────────────────────────────
function ensureAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function initAudioDspSuite() {
    // 10-Band EQ Presets
    const eqPresets = {
        flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass: [6, 5, 3, 1, 0, 0, 0, 0, 0, 0],
        vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
        rock: [5, 3, 1, 0, -1, 0, 2, 3, 4, 4],
        pop: [-1, 1, 3, 4, 4, 3, 1, -1, 2, 3],
        electronic: [5, 4, 1, 0, -2, 2, 1, 2, 4, 5]
    };

    document.querySelectorAll('.preset-pill').forEach(pill => {
        pill.onclick = () => {
            document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const presetName = pill.getAttribute('data-preset');
            const values = eqPresets[presetName] || eqPresets.flat;

            document.querySelectorAll('.v-eq-slider').forEach((slider, idx) => {
                const val = values[idx] || 0;
                slider.value = val;
                const valLbl = slider.closest('.v-fader-col')?.querySelector('.fader-val');
                if (valLbl) valLbl.innerText = (val > 0 ? '+' : '') + val + 'dB';
                if (eqNodes[idx]) eqNodes[idx].gain.value = val;
            });
        };
    });

    // Reset EQ
    const btnResetEq = document.getElementById('btn-reset-eq');
    if (btnResetEq) {
        btnResetEq.onclick = () => {
            document.querySelector('.preset-pill[data-preset="flat"]')?.click();
        };
    }

    // Vertical EQ Sliders
    document.querySelectorAll('.v-eq-slider').forEach((slider, idx) => {
        slider.oninput = () => {
            const val = parseFloat(slider.value);
            const valLbl = slider.closest('.v-fader-col')?.querySelector('.fader-val');
            if (valLbl) valLbl.innerText = (val > 0 ? '+' : '') + val + 'dB';
            if (eqNodes[idx]) eqNodes[idx].gain.value = val;
        };
    });

    // 3D Spatial Chips
    document.querySelectorAll('.spatial-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('.spatial-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            surroundMode = chip.getAttribute('data-mode') || 'cinema';

            if (surroundMode === 'spatial8d') {
                startSpatial8d();
            } else {
                stopSpatial8d();
            }
        };
    });

    // Spatial Depth Slider
    const spatialDepthSlider = document.getElementById('app-spatial-depth-slider');
    const spatialDepthVal = document.getElementById('app-spatial-depth-val');
    if (spatialDepthSlider) {
        spatialDepthSlider.oninput = () => {
            const pct = Math.round(parseFloat(spatialDepthSlider.value) * 100);
            if (spatialDepthVal) spatialDepthVal.innerText = `${pct}%`;
            if (pannerNode && surroundMode !== 'spatial8d') {
                pannerNode.pan.value = (parseFloat(spatialDepthSlider.value) - 0.5) * 0.4;
            }
        };
    }

    // Bass & Highs Sliders
    const bassSlider = document.getElementById('app-bass-slider');
    const highsSlider = document.getElementById('app-highs-slider');

    if (bassSlider) {
        bassSlider.oninput = () => {
            const val = parseFloat(bassSlider.value);
            const valBadge = document.getElementById('app-bass-val');
            if (valBadge) valBadge.innerText = `+${val} dB`;
            if (bassNode) bassNode.gain.value = val;
            if (punchNode) punchNode.gain.value = val * 0.6;
        };
    }

    if (highsSlider) {
        highsSlider.oninput = () => {
            const val = parseFloat(highsSlider.value);
            const valBadge = document.getElementById('app-highs-val');
            if (valBadge) valBadge.innerText = `+${val} dB`;
            if (highsNode) highsNode.gain.value = val;
            if (airNode) airNode.gain.value = val * 0.7;
        };
    }
}

function attachAudioDsp() {
    if (!activeAudio || !audioCtx) return;

    try {
        audioSourceNode = audioCtx.createMediaElementSource(activeAudio);

        // Preamp
        preampNode = audioCtx.createGain();
        preampNode.gain.value = 1.15;

        // Sub-Bass & Punch
        bassNode = audioCtx.createBiquadFilter();
        bassNode.type = 'lowshelf';
        bassNode.frequency.value = 60;
        bassNode.gain.value = parseFloat(document.getElementById('app-bass-slider')?.value || 6);

        punchNode = audioCtx.createBiquadFilter();
        punchNode.type = 'peaking';
        punchNode.frequency.value = 110;
        punchNode.Q.value = 1.2;
        punchNode.gain.value = bassNode.gain.value * 0.6;

        // Vocal Highs & Air Exciter
        highsNode = audioCtx.createBiquadFilter();
        highsNode.type = 'highshelf';
        highsNode.frequency.value = 3600;
        highsNode.gain.value = parseFloat(document.getElementById('app-highs-slider')?.value || 4);

        airNode = audioCtx.createBiquadFilter();
        airNode.type = 'peaking';
        airNode.frequency.value = 10500;
        airNode.Q.value = 1.1;
        airNode.gain.value = highsNode.gain.value * 0.7;

        // 10-Band EQ
        const freqs = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        eqNodes = freqs.map(freq => {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.4;
            const slider = document.querySelector(`.v-eq-slider[data-freq="${freq}"]`);
            filter.gain.value = slider ? parseFloat(slider.value) : 0;
            return filter;
        });

        // 3D Panner
        pannerNode = audioCtx.createStereoPanner();
        pannerNode.pan.value = 0;

        // Mastering Compressor
        compressorNode = audioCtx.createDynamicsCompressor();
        compressorNode.threshold.value = -16;
        compressorNode.knee.value = 24;
        compressorNode.ratio.value = 3.5;
        compressorNode.attack.value = 0.003;
        compressorNode.release.value = 0.22;

        // Visualizer Analyser
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;

        // Connect graph
        let prev = audioSourceNode;
        prev.connect(preampNode);
        prev = preampNode;

        prev.connect(bassNode);
        prev = bassNode;

        prev.connect(punchNode);
        prev = punchNode;

        prev.connect(highsNode);
        prev = highsNode;

        prev.connect(airNode);
        prev = airNode;

        eqNodes.forEach(node => {
            prev.connect(node);
            prev = node;
        });

        prev.connect(pannerNode);
        pannerNode.connect(compressorNode);
        compressorNode.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);

        startSpectrumVisualizer();
    } catch (e) {
        console.warn('Audio DSP graph attach error:', e);
    }
}

// ── Real-Time Spectrum Canvas Visualizer (Studio Grade) ──────────────────
function colorMixHex(color, target, weight) {
    if (!color || !color.startsWith('#')) return color;
    const r1 = parseInt(color.slice(1, 3), 16) || 124;
    const g1 = parseInt(color.slice(3, 5), 16) || 58;
    const b1 = parseInt(color.slice(5, 7), 16) || 237;
    if (target === 'transparent') {
        return `rgba(${r1}, ${g1}, ${b1}, ${weight})`;
    }
    const r2 = target === '#FFFFFF' ? 255 : 0;
    const g2 = target === '#FFFFFF' ? 255 : 0;
    const b2 = target === '#FFFFFF' ? 255 : 0;
    const r = Math.round(r1 + (r2 - r1) * weight);
    const g = Math.round(g1 + (g2 - g1) * weight);
    const b = Math.round(b1 + (b2 - b1) * weight);
    return `rgb(${r}, ${g}, ${b})`;
}

function startSpectrumVisualizer() {
    stopSpectrumVisualizer();
    if (!spectrumCanvas) return;
    const ctx = spectrumCanvas.getContext('2d');

    const render = () => {
        // High-DPI Canvas Resizing
        const rect = spectrumCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.floor(rect.width * dpr);
        const height = Math.floor(rect.height * dpr);

        if (width <= 0 || height <= 0) {
            canvasAnimFrame = requestAnimationFrame(render);
            return;
        }

        if (spectrumCanvas.width !== width || spectrumCanvas.height !== height) {
            spectrumCanvas.width = width;
            spectrumCanvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7C3AED';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.getAttribute('data-theme') === 'dark';
        const isPlaying = activeAudio && !activeAudio.paused && analyserNode;

        const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 128;
        const freqData = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(bufferLength);

        if (isPlaying && analyserNode) {
            analyserNode.getByteFrequencyData(freqData);
            analyserNode.getByteTimeDomainData(timeData);
        } else {
            // Calm idle harmonic wave
            idleAnimAngle += 0.035;
            for (let i = 0; i < bufferLength; i++) {
                const idleWave = Math.sin(idleAnimAngle + i * 0.12) * 16 + Math.cos(idleAnimAngle * 0.7 + i * 0.06) * 10;
                freqData[i] = Math.max(14, Math.min(75, 24 + idleWave));
                timeData[i] = 128 + Math.sin(idleAnimAngle + (i / bufferLength) * Math.PI * 4) * 12;
            }
        }

        if (visualizerMode === 'bars') {
            const barCount = 48;
            const barGap = 3.5 * dpr;
            const barWidth = Math.max(2.5 * dpr, (width - (barCount - 1) * barGap) / barCount);
            const maxBarHeight = height - (8 * dpr);

            // Draw crisp floor baseline
            ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
            ctx.fillRect(0, height - 1.5 * dpr, width, 1.5 * dpr);

            for (let i = 0; i < barCount; i++) {
                // Logarithmic frequency distribution
                const dataIdx = Math.min(bufferLength - 1, Math.floor(Math.pow(i / barCount, 1.35) * bufferLength));
                const rawVal = freqData[dataIdx] || 0;
                const hfBoost = 1.0 + (i / barCount) * 0.75;
                const val = Math.min(255, rawVal * hfBoost);
                const barHeight = Math.max(4 * dpr, (val / 255) * maxBarHeight);

                // Update falling peak indicator
                if (!barPeaks[i] || barHeight >= barPeaks[i]) {
                    barPeaks[i] = barHeight;
                    barDropDelays[i] = 14;
                } else {
                    if (barDropDelays[i] > 0) {
                        barDropDelays[i]--;
                    } else {
                        barPeaks[i] = Math.max(4 * dpr, barPeaks[i] - 1.8 * dpr);
                    }
                }

                const x = i * (barWidth + barGap);
                const y = height - barHeight;

                // Rich gradient with solid bottom contrast
                const grad = ctx.createLinearGradient(0, y, 0, height);
                grad.addColorStop(0, accentColor);
                if (isDark) {
                    grad.addColorStop(0.5, colorMixHex(accentColor, '#FFFFFF', 0.15));
                    grad.addColorStop(1, colorMixHex(accentColor, '#000000', 0.4));
                } else {
                    grad.addColorStop(1, colorMixHex(accentColor, '#1E1B4B', 0.35));
                }

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, [3 * dpr, 3 * dpr, 0, 0]);
                ctx.fill();

                // Floating Peak Cap
                const peakY = height - barPeaks[i] - (3.5 * dpr);
                ctx.fillStyle = isDark ? '#FFFFFF' : accentColor;
                ctx.beginPath();
                ctx.roundRect(x, peakY, barWidth, 2.5 * dpr, 1.5 * dpr);
                ctx.fill();
            }
        } else if (visualizerMode === 'mirror') {
            const barCount = 48;
            const barGap = 3.5 * dpr;
            const barWidth = Math.max(2.5 * dpr, (width - (barCount - 1) * barGap) / barCount);
            const centerY = height / 2;
            const maxHalfHeight = (height / 2) - (6 * dpr);

            // Draw center axis line
            ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
            ctx.fillRect(0, centerY - 0.75 * dpr, width, 1.5 * dpr);

            for (let i = 0; i < barCount; i++) {
                const dataIdx = Math.min(bufferLength - 1, Math.floor(Math.pow(i / barCount, 1.35) * bufferLength));
                const rawVal = freqData[dataIdx] || 0;
                const hfBoost = 1.0 + (i / barCount) * 0.75;
                const val = Math.min(255, rawVal * hfBoost);
                const halfHeight = Math.max(3 * dpr, (val / 255) * maxHalfHeight);

                if (!barPeaks[i] || halfHeight >= barPeaks[i]) {
                    barPeaks[i] = halfHeight;
                    barDropDelays[i] = 14;
                } else {
                    if (barDropDelays[i] > 0) {
                        barDropDelays[i]--;
                    } else {
                        barPeaks[i] = Math.max(3 * dpr, barPeaks[i] - 1.2 * dpr);
                    }
                }

                const x = i * (barWidth + barGap);
                const topY = centerY - halfHeight;

                // Gradient from center outwards
                const grad = ctx.createLinearGradient(0, topY, 0, centerY + halfHeight);
                grad.addColorStop(0, accentColor);
                grad.addColorStop(0.5, colorMixHex(accentColor, isDark ? '#FFFFFF' : '#312E81', 0.2));
                grad.addColorStop(1, accentColor);

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(x, topY, barWidth, halfHeight * 2, [3 * dpr, 3 * dpr, 3 * dpr, 3 * dpr]);
                ctx.fill();

                // Top & Bottom Peak Dots
                const peakHalf = barPeaks[i];
                ctx.fillStyle = isDark ? '#FFFFFF' : accentColor;
                ctx.beginPath();
                ctx.roundRect(x, centerY - peakHalf - (3 * dpr), barWidth, 2 * dpr, 1 * dpr);
                ctx.roundRect(x, centerY + peakHalf + (1 * dpr), barWidth, 2 * dpr, 1 * dpr);
                ctx.fill();
            }
        } else {
            // Mode 3: Fluid Oscilloscope Wave
            ctx.save();
            const sliceWidth = width / (bufferLength - 1);

            // Area Gradient Underneath
            const areaGrad = ctx.createLinearGradient(0, 0, 0, height);
            areaGrad.addColorStop(0, colorMixHex(accentColor, 'transparent', isDark ? 0.35 : 0.25));
            areaGrad.addColorStop(1, 'transparent');

            // Draw Area Fill
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let i = 0; i < bufferLength; i++) {
                const v = timeData[i] / 128.0;
                const y = (v * height) / 2;
                const x = i * sliceWidth;
                if (i === 0) ctx.lineTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fillStyle = areaGrad;
            ctx.fill();

            // Neon Glowing Stroke
            ctx.beginPath();
            ctx.lineWidth = 2.5 * dpr;
            ctx.strokeStyle = accentColor;
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 10 * dpr;

            for (let i = 0; i < bufferLength; i++) {
                const v = timeData[i] / 128.0;
                const y = (v * height) / 2;
                const x = i * sliceWidth;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        canvasAnimFrame = requestAnimationFrame(render);
    };

    canvasAnimFrame = requestAnimationFrame(render);
}

function stopSpectrumVisualizer() {
    if (canvasAnimFrame) {
        cancelAnimationFrame(canvasAnimFrame);
        canvasAnimFrame = null;
    }
    if (spectrumCanvas) {
        const ctx = spectrumCanvas.getContext('2d');
        ctx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    }
}

function startSpatial8d() {
    if (surroundMode !== 'spatial8d') return;
    stopSpatial8d();
    spatial8dTimer = setInterval(() => {
        if (pannerNode && audioCtx) {
            spatial8dAngle += 0.04;
            pannerNode.pan.value = Math.sin(spatial8dAngle) * 0.75;
        }
    }, 40);
}

function stopSpatial8d() {
    if (spatial8dTimer) {
        clearInterval(spatial8dTimer);
        spatial8dTimer = null;
    }
    if (pannerNode) pannerNode.pan.value = 0;
}

// ── Track Playback ─────────────────────────────────────────────────────────
function playTrack(index) {
    if (index < 0 || index >= allTracks.length) return;
    currentTrackIndex = index;
    const track = allTracks[index];

    ensureAudioContext();

    if (nowPlayingTitle) nowPlayingTitle.innerText = track.title;
    if (nowPlayingSub) nowPlayingSub.innerText = `${track.artist || 'Local Master'} • ${track.format || 'AUDIO'}`;
    if (trackFormatTag) trackFormatTag.innerText = track.format || 'MASTER';

    if (activeAudio) {
        activeAudio.pause();
        activeAudio.src = '';
    }

    if (track.isSample || !track.path) {
        simulateSamplePlay();
        updatePlayerUi(true);
        renderPlaylist();
        return;
    }

    const fileUrl = track.path.startsWith('file:') || track.path.startsWith('blob:') ? track.path : ('file:///' + track.path.replace(/\\/g, '/'));
    activeAudio = new Audio(fileUrl);
    activeAudio.crossOrigin = 'anonymous';

    attachAudioDsp();

    activeAudio.addEventListener('loadedmetadata', () => {
        if (playerTimeDur) playerTimeDur.innerText = formatTime(activeAudio.duration || 0);
    });

    activeAudio.addEventListener('timeupdate', () => {
        if (!isSeeking && activeAudio && activeAudio.duration) {
            const progress = (activeAudio.currentTime / activeAudio.duration) * 100;
            if (playerSeekBar) {
                playerSeekBar.value = progress;
                playerSeekBar.style.setProperty('--seek-pct', progress + '%');
            }
            if (playerTimeCur) playerTimeCur.innerText = formatTime(activeAudio.currentTime);
            if (playerTimeDur) playerTimeDur.innerText = formatTime(activeAudio.duration);
        }
    });

    activeAudio.addEventListener('ended', () => {
        if (repeatMode === 2) { // Repeat one
            activeAudio.currentTime = 0;
            activeAudio.play();
        } else if (repeatMode === 1) { // Repeat all
            playNext();
        } else {
            if (currentTrackIndex < allTracks.length - 1) {
                playNext();
            } else {
                updatePlayerUi(false);
            }
        }
    });

    activeAudio.addEventListener('play', () => {
        updatePlayerUi(true);
        startSpatial8d();
    });

    activeAudio.addEventListener('pause', () => {
        updatePlayerUi(false);
        stopSpatial8d();
    });

    activeAudio.play().then(() => {
        updatePlayerUi(true);
    }).catch(e => {
        console.warn('Playback error:', e);
        updatePlayerUi(false);
    });

    renderPlaylist();
}

function simulateSamplePlay() {
    if (playerTimeDur) playerTimeDur.innerText = '3:20';
    if (playerTimeCur) playerTimeCur.innerText = '0:00';
    startSpectrumVisualizer();
}

function togglePlay() {
    ensureAudioContext();
    if (currentTrackIndex === -1 && allTracks.length > 0) {
        playTrack(0);
        return;
    }

    if (activeAudio) {
        if (activeAudio.paused) {
            activeAudio.play();
        } else {
            activeAudio.pause();
        }
    }
}

function playNext() {
    if (allTracks.length === 0) return;
    if (isShuffle) {
        const nextIdx = Math.floor(Math.random() * allTracks.length);
        playTrack(nextIdx);
    } else {
        const nextIdx = (currentTrackIndex + 1) % allTracks.length;
        playTrack(nextIdx);
    }
}

function playPrev() {
    if (allTracks.length === 0) return;
    if (activeAudio && activeAudio.currentTime > 3) {
        activeAudio.currentTime = 0;
        return;
    }
    const prevIdx = (currentTrackIndex - 1 + allTracks.length) % allTracks.length;
    playTrack(prevIdx);
}

function updatePlayerUi(isPlaying) {
    if (playerPlayBtn) {
        playerPlayBtn.innerHTML = `<i class="fas fa-${isPlaying ? 'pause' : 'play'}"></i>`;
    }
    if (vinylArt) {
        vinylArt.style.animationPlayState = isPlaying ? 'running' : 'paused';
    }
    renderPlaylist();
}

// ── Controls Initialization ────────────────────────────────────────────────
function initControls() {
    if (playerPlayBtn) playerPlayBtn.onclick = togglePlay;
    if (playerNextBtn) playerNextBtn.onclick = playNext;
    if (playerPrevBtn) playerPrevBtn.onclick = playPrev;

    if (playerShuffleBtn) {
        playerShuffleBtn.onclick = () => {
            isShuffle = !isShuffle;
            playerShuffleBtn.classList.toggle('active', isShuffle);
        };
    }

    if (playerRepeatBtn) {
        playerRepeatBtn.onclick = () => {
            repeatMode = (repeatMode + 1) % 3;
            playerRepeatBtn.classList.toggle('active', repeatMode > 0);
            playerRepeatBtn.classList.toggle('mode-one', repeatMode === 2);
            playerRepeatBtn.title = repeatMode === 2 ? 'Repeat Current Track' : (repeatMode === 1 ? 'Repeat All Tracks' : 'Repeat Off');
        };
    }

    // Seek bar
    if (playerSeekBar) {
        playerSeekBar.oninput = () => {
            isSeeking = true;
            playerSeekBar.style.setProperty('--seek-pct', playerSeekBar.value + '%');
            if (activeAudio && activeAudio.duration) {
                const time = (playerSeekBar.value / 100) * activeAudio.duration;
                if (playerTimeCur) playerTimeCur.innerText = formatTime(time);
            }
        };
        playerSeekBar.onchange = () => {
            if (activeAudio && activeAudio.duration) {
                activeAudio.currentTime = (playerSeekBar.value / 100) * activeAudio.duration;
            }
            playerSeekBar.style.setProperty('--seek-pct', playerSeekBar.value + '%');
            isSeeking = false;
        };
    }

    // Volume & Mute
    if (playerVolBar) {
        playerVolBar.style.setProperty('--vol-pct', (parseFloat(playerVolBar.value || 1) * 100) + '%');
        playerVolBar.oninput = () => {
            const val = parseFloat(playerVolBar.value);
            playerVolBar.style.setProperty('--vol-pct', (val * 100) + '%');
            if (playerVolPct) playerVolPct.innerText = `${Math.round(val * 100)}%`;
            if (activeAudio) activeAudio.volume = val;
            updateVolIcon(val);
        };
    }

    if (playerMuteBtn) {
        playerMuteBtn.onclick = () => {
            if (!activeAudio) return;
            if (activeAudio.volume > 0) {
                activeAudio.dataset.prevVol = activeAudio.volume;
                activeAudio.volume = 0;
                if (playerVolBar) {
                    playerVolBar.value = 0;
                    playerVolBar.style.setProperty('--vol-pct', '0%');
                }
                if (playerVolPct) playerVolPct.innerText = '0%';
                updateVolIcon(0);
            } else {
                const prev = parseFloat(activeAudio.dataset.prevVol || 1);
                activeAudio.volume = prev;
                if (playerVolBar) {
                    playerVolBar.value = prev;
                    playerVolBar.style.setProperty('--vol-pct', (prev * 100) + '%');
                }
                if (playerVolPct) playerVolPct.innerText = `${Math.round(prev * 100)}%`;
                updateVolIcon(prev);
            }
        };
    }

    function updateVolIcon(vol) {
        if (!playerMuteBtn) return;
        if (vol === 0) {
            playerMuteBtn.innerHTML = '<i class="fas fa-volume-xmark"></i>';
        } else if (vol < 0.5) {
            playerMuteBtn.innerHTML = '<i class="fas fa-volume-low"></i>';
        } else {
            playerMuteBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
        }
    }

    // Smart Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-filter') || 'all';
            applyFilter();
        };
    });

    // Search Input
    if (playlistSearchInput) {
        playlistSearchInput.oninput = () => {
            const hasText = playlistSearchInput.value.trim().length > 0;
            if (searchClearBtn) searchClearBtn.style.display = hasText ? 'flex' : 'none';
            applyFilter();
        };
    }

    if (searchClearBtn) {
        searchClearBtn.onclick = () => {
            if (playlistSearchInput) playlistSearchInput.value = '';
            searchClearBtn.style.display = 'none';
            applyFilter();
        };
    }

    // Global Studio Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'KeyN') {
            playNext();
        } else if (e.code === 'KeyP') {
            playPrev();
        } else if (e.code === 'KeyM') {
            playerMuteBtn?.click();
        } else if (e.code === 'ArrowRight') {
            if (activeAudio) activeAudio.currentTime = Math.min(activeAudio.duration, activeAudio.currentTime + 5);
        } else if (e.code === 'ArrowLeft') {
            if (activeAudio) activeAudio.currentTime = Math.max(0, activeAudio.currentTime - 5);
        }
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#039;');
}
