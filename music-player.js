// ── Ocal Browser Hi-Res Studio Music Player & Smart Library ───────────────────
let allTracks = [];
let filteredTracks = [];
let currentTrackIndex = -1;
let activeFilter = 'all';
let isShuffle = false;
let isRepeat = false;
let isSeeking = false;

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
const musicHeaderTitle = document.getElementById('music-header-title');
const scanStatusText = document.getElementById('scan-status-text');
const musicStatCount = document.getElementById('music-stat-count');
const playlistCountBadge = document.getElementById('playlist-count-badge');
const playlistTracksContainer = document.getElementById('playlist-tracks-container');
const playlistSearchInput = document.getElementById('playlist-search-input');

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

const fxPanelToggleBtn = document.getElementById('fx-panel-toggle-btn');
const studioFxCard = document.getElementById('studio-fx-card');
const fxCardClose = document.getElementById('fx-card-close');

// ── Initialization ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sync theme & accent
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

    initControls();
    initAudioDspSuite();

    // 2. Scan Device for Music
    await scanDeviceMusic();

    // 3. Handle URL track parameter (e.g. ?song=... or ?track=...)
    handleUrlParams();
});

// ── Device Scanner ─────────────────────────────────────────────────────────
async function scanDeviceMusic() {
    if (scanStatusText) scanStatusText.innerText = 'Analyzing device for audio tracks...';

    try {
        if (window.electronAPI && window.electronAPI.invoke) {
            allTracks = await window.electronAPI.invoke('scan-system-audio') || [];
        }
    } catch (e) {
        console.error('Scan error:', e);
        allTracks = [];
    }

    if (allTracks.length === 0) {
        // Sample fallback suggestions if device has no local audio
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
                category: 'acoustic',
                isSample: true
            }
        ];
    }

    if (musicStatCount) musicStatCount.innerText = allTracks.length;
    if (playlistCountBadge) playlistCountBadge.innerText = `${allTracks.length} tracks`;
    if (scanStatusText) scanStatusText.innerText = `${allTracks.length} Hi-Res Tracks Ready`;

    applyFilter();
}

function handleUrlParams() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const songParam = urlParams.get('song') || urlParams.get('track') || urlParams.get('file');
        if (songParam) {
            const decoded = decodeURIComponent(songParam);
            const cleanPath = decoded.replace(/^file:\/\/\/?/i, '').replace(/^[A-Za-z]:\//, (m) => m.toUpperCase());

            // Check if exists in allTracks or add it
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
        if (activeFilter === 'recent') return true;
        if (activeFilter === 'top') return true;
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
                <i class="fas fa-music" style="opacity: 0.25; font-size: 38px; color: var(--accent);"></i>
                <span>No matching tracks found</span>
            </div>
        `;
        return;
    }

    filteredTracks.forEach((track, idx) => {
        const isCurrent = (currentTrackIndex >= 0 && allTracks[currentTrackIndex] === track);
        const isPlaying = isCurrent && activeAudio && !activeAudio.paused;
        const el = document.createElement('div');
        el.className = `track-item-card ${isCurrent ? 'playing' : ''}`;
        
        el.innerHTML = `
            <div class="track-info-left">
                <div class="track-icon-box">
                    <i class="fas ${isPlaying ? 'fa-volume-high' : 'fa-play'}"></i>
                </div>
                <div class="track-text-details">
                    <span class="track-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</span>
                    <span class="track-sub">${escapeHtml(track.artist || 'Local Master')} • ${escapeHtml(track.format || 'AUDIO')}</span>
                </div>
            </div>
            <div class="track-action-badge">
                <i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}" style="font-size: 10px;"></i>
            </div>
        `;

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
                const valLbl = slider.closest('.v-eq-col')?.querySelector('.v-val');
                if (valLbl) valLbl.innerText = (val > 0 ? '+' : '') + val + 'dB';
                if (eqNodes[idx]) eqNodes[idx].gain.value = val;
            });
        };
    });

    // Vertical EQ Sliders
    document.querySelectorAll('.v-eq-slider').forEach((slider, idx) => {
        slider.oninput = () => {
            const val = parseFloat(slider.value);
            const valLbl = slider.closest('.v-eq-col')?.querySelector('.v-val');
            if (valLbl) valLbl.innerText = (val > 0 ? '+' : '') + val + 'dB';
            if (eqNodes[idx]) eqNodes[idx].gain.value = val;
        };
    });

    // 3D Surround Dropdown
    const sTrigger = document.getElementById('app-surround-trigger');
    const sMenu = document.getElementById('app-surround-menu');
    if (sTrigger && sMenu) {
        sTrigger.onclick = (e) => {
            e.stopPropagation();
            sMenu.classList.toggle('open');
        };

        sMenu.querySelectorAll('.fx-dropdown-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                sMenu.querySelectorAll('.fx-dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                surroundMode = item.getAttribute('data-value') || 'cinema';
                const curVal = document.getElementById('app-surround-val');
                if (curVal) curVal.innerHTML = item.innerHTML;
                sMenu.classList.remove('open');

                if (surroundMode === 'spatial8d') {
                    startSpatial8d();
                } else {
                    stopSpatial8d();
                }
            };
        });
    }

    // DSP Tabs Switching (EQ / 3D / Bass)
    const tabs = [
        { btn: 'tab-btn-eq', section: 'section-eq' },
        { btn: 'tab-btn-3d', section: 'section-3d' },
        { btn: 'tab-btn-bass', section: 'section-bass' }
    ];

    tabs.forEach(({ btn, section }) => {
        const btnEl = document.getElementById(btn);
        if (btnEl) {
            btnEl.onclick = () => {
                document.querySelectorAll('.fx-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.fx-section-panel').forEach(s => s.style.display = 'none');
                btnEl.classList.add('active');
                const secEl = document.getElementById(section);
                if (secEl) secEl.style.display = 'flex';
            };
        }
    });

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
        analyserNode.fftSize = 128;

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

// ── Real-Time Spectrum Canvas Visualizer ───────────────────────────────────
function startSpectrumVisualizer() {
    stopSpectrumVisualizer();
    if (!spectrumCanvas || !analyserNode) return;
    const ctx = spectrumCanvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
        if (!activeAudio || activeAudio.paused || !analyserNode) {
            ctx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
            if (vinylArt) {
                vinylArt.style.boxShadow = '';
                vinylArt.style.transform = '';
            }
            return;
        }

        analyserNode.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);

        const barCount = 48;
        const barWidth = (spectrumCanvas.width / barCount) - 3;
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#15AC49';

        let bassSum = 0;
        for (let i = 0; i < 4; i++) bassSum += dataArray[i] || 0;
        const bassLevel = (bassSum / 4) / 255;

        // Dynamic vinyl beat pulsing
        if (vinylArt) {
            const glowSize = 35 + bassLevel * 50;
            const scale = 1 + bassLevel * 0.04;
            vinylArt.style.boxShadow = `0 14px 40px rgba(0, 0, 0, 0.45), 0 0 ${glowSize}px var(--accent-glow)`;
            vinylArt.style.transform = `scale(${scale})`;
        }

        for (let i = 0; i < barCount; i++) {
            const dataIdx = Math.floor((i / barCount) * bufferLength * 0.85);
            const val = dataArray[dataIdx] || 0;
            const barHeight = Math.max(4, (val / 255) * spectrumCanvas.height * 0.95);
            const x = i * (barWidth + 3);
            const y = spectrumCanvas.height - barHeight;

            const grad = ctx.createLinearGradient(0, y, 0, spectrumCanvas.height);
            grad.addColorStop(0, accentColor);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
            ctx.fill();
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
    if (vinylArt) {
        vinylArt.style.boxShadow = '';
        vinylArt.style.transform = '';
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
        // Fallback demo synth tone if track is sample
        simulateSamplePlay();
        updatePlayerUi(true);
        renderPlaylist();
        return;
    }

    const fileUrl = track.path.startsWith('file:') ? track.path : ('file:///' + track.path.replace(/\\/g, '/'));
    activeAudio = new Audio(fileUrl);
    activeAudio.crossOrigin = 'anonymous';

    attachAudioDsp();

    activeAudio.addEventListener('loadedmetadata', () => {
        if (playerTimeDur) playerTimeDur.innerText = formatTime(activeAudio.duration || 0);
    });

    activeAudio.addEventListener('timeupdate', () => {
        if (!isSeeking && activeAudio && activeAudio.duration) {
            const progress = (activeAudio.currentTime / activeAudio.duration) * 100;
            if (playerSeekBar) playerSeekBar.value = progress;
            if (playerTimeCur) playerTimeCur.innerText = formatTime(activeAudio.currentTime);
            if (playerTimeDur) playerTimeDur.innerText = formatTime(activeAudio.duration);
        }
    });

    activeAudio.addEventListener('ended', () => {
        if (isRepeat) {
            activeAudio.currentTime = 0;
            activeAudio.play();
        } else {
            playNext();
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
            isRepeat = !isRepeat;
            playerRepeatBtn.classList.toggle('active', isRepeat);
        };
    }

    // Seek bar
    if (playerSeekBar) {
        playerSeekBar.oninput = () => {
            isSeeking = true;
            if (activeAudio && activeAudio.duration) {
                const time = (playerSeekBar.value / 100) * activeAudio.duration;
                if (playerTimeCur) playerTimeCur.innerText = formatTime(time);
            }
        };
        playerSeekBar.onchange = () => {
            if (activeAudio && activeAudio.duration) {
                activeAudio.currentTime = (playerSeekBar.value / 100) * activeAudio.duration;
            }
            isSeeking = false;
        };
    }

    // Volume & Mute
    if (playerVolBar) {
        playerVolBar.oninput = () => {
            const val = parseFloat(playerVolBar.value);
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
                if (playerVolBar) playerVolBar.value = 0;
                updateVolIcon(0);
            } else {
                const prev = parseFloat(activeAudio.dataset.prevVol || 1);
                activeAudio.volume = prev;
                if (playerVolBar) playerVolBar.value = prev;
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

    // DSP Suite Card Toggle
    if (fxPanelToggleBtn) {
        fxPanelToggleBtn.onclick = () => {
            if (studioFxCard) {
                const isHidden = (studioFxCard.style.display === 'none' || !studioFxCard.style.display);
                studioFxCard.style.display = isHidden ? 'flex' : 'none';
                fxPanelToggleBtn.classList.toggle('active', isHidden);
            }
        };
    }

    if (fxCardClose) {
        fxCardClose.onclick = () => {
            if (studioFxCard) studioFxCard.style.display = 'none';
            if (fxPanelToggleBtn) fxPanelToggleBtn.classList.remove('active');
        };
    }

    // Smart Filter Tabs
    document.querySelectorAll('.smart-tab').forEach(tab => {
        tab.onclick = () => {
            if (tab.id === 'more-categories-trigger') return;
            document.querySelectorAll('.smart-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.getAttribute('data-filter') || 'all';
            applyFilter();
        };
    });

    // More Categories Dropdown
    const moreTrigger = document.getElementById('more-categories-trigger');
    const moreMenu = document.getElementById('more-categories-menu');
    if (moreTrigger && moreMenu) {
        moreTrigger.onclick = (e) => {
            e.stopPropagation();
            moreMenu.classList.toggle('open');
        };

        moreMenu.querySelectorAll('.fx-dropdown-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.smart-tab').forEach(t => t.classList.remove('active'));
                moreTrigger.classList.add('active');
                activeFilter = item.getAttribute('data-filter') || 'all';
                moreMenu.classList.remove('open');
                applyFilter();
            };
        });
    }

    // Search Input
    if (playlistSearchInput) {
        playlistSearchInput.oninput = () => {
            applyFilter();
        };
    }

    // Close Dropdowns on Click Outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.fx-dropdown-menu').forEach(m => m.classList.remove('open'));
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
