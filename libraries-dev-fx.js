/**
 * Libraries.dev FX Suite for Ocal Browser
 * Directly embeds the official algorithms from:
 * 1. border-beam (v1.3.0)      - Conical gradient perimeter beam & pulse aura
 * 2. thinking-orbs (v0.3.1)    - 3D-to-2D particle orbits, globe, wave, web, rubik canvas
 * 3. liquid-gooey (v0.2.1)     - SVG Binarize Matrix + gelatinous fluid UI physics
 * 4. voice-glow (v0.2.0)       - Multi-band reactive audio glow & speech transcription
 * 5. img-fx (v0.5.1)           - Three.js / WebGL FBM simplex noise pixel-mosaic shader
 */

(function (window, document) {
    'use strict';

    // ─── 1. BORDER BEAM FX (border-beam) ──────────────────────────────────────────
    const BorderBeamFX = {
        styleInjected: false,
        activeBeams: new Set(),

        injectStyles() {
            if (this.styleInjected) return;
            this.styleInjected = true;
            const style = document.createElement('style');
            style.id = 'border-beam-fx-styles';
            style.textContent = `
                @keyframes border-beam-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes border-beam-pulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
                .border-beam-host {
                    position: relative !important;
                }
                .border-beam-layer {
                    position: absolute;
                    inset: -1.5px;
                    border-radius: inherit;
                    pointer-events: none;
                    z-index: 5;
                    overflow: hidden;
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    mask-composite: exclude;
                    padding: var(--bb-width, 2px);
                    box-sizing: border-box;
                    transition: opacity 0.3s ease;
                }
                .border-beam-gradient {
                    position: absolute;
                    inset: -200%;
                    width: 500%;
                    height: 500%;
                    transform-origin: center center;
                    animation: border-beam-spin var(--bb-duration, 5s) linear infinite;
                    opacity: var(--bb-opacity, 0.95);
                    will-change: transform;
                }
                .border-beam-layer.preset-accent .border-beam-gradient {
                    background: conic-gradient(
                        from 0deg at 50% 50%,
                        transparent 0deg,
                        var(--accent, #09F0A0) 60deg,
                        color-mix(in srgb, var(--accent, #09F0A0) 70%, #ffffff) 100deg,
                        transparent 140deg,
                        transparent 360deg
                    );
                }
                .border-beam-layer.preset-colorful .border-beam-gradient {
                    background: conic-gradient(
                        from 0deg at 50% 50%,
                        transparent 0deg,
                        #FF4678 40deg,
                        #3CBEFF 90deg,
                        #AF46FF 140deg,
                        transparent 190deg,
                        transparent 360deg
                    );
                }
                .border-beam-layer.preset-ocean .border-beam-gradient {
                    background: conic-gradient(
                        from 0deg at 50% 50%,
                        transparent 0deg,
                        #508CFF 50deg,
                        #28C8E6 100deg,
                        #785AFF 145deg,
                        transparent 180deg,
                        transparent 360deg
                    );
                }
                .border-beam-layer.preset-sunset .border-beam-gradient {
                    background: conic-gradient(
                        from 0deg at 50% 50%,
                        transparent 0deg,
                        #FF6E3C 50deg,
                        #FFB428 100deg,
                        #FF3C5A 140deg,
                        transparent 180deg,
                        transparent 360deg
                    );
                }
                .border-beam-layer.pulse {
                    animation: border-beam-pulse 2.2s ease-in-out infinite;
                }
            `;
            document.head.appendChild(style);
        },

        attach(targetEl, options = {}) {
            if (!targetEl) return null;
            this.injectStyles();
            targetEl.classList.add('border-beam-host');

            // Remove existing beam on this target if present
            const existing = targetEl.querySelector(':scope > .border-beam-layer');
            if (existing) existing.remove();

            const layer = document.createElement('div');
            layer.className = `border-beam-layer preset-${options.preset || 'accent'} ${options.pulse ? 'pulse' : ''}`;
            if (options.className) layer.classList.add(options.className);

            const duration = options.duration || '5s';
            const width = options.width || '2px';
            const opacity = options.opacity || '0.95';
            layer.style.setProperty('--bb-duration', duration);
            layer.style.setProperty('--bb-width', width);
            layer.style.setProperty('--bb-opacity', opacity);

            const grad = document.createElement('div');
            grad.className = 'border-beam-gradient';
            if (options.customGradient) {
                grad.style.background = options.customGradient;
            }
            layer.appendChild(grad);
            targetEl.appendChild(layer);

            const controller = {
                element: layer,
                setPreset(preset) {
                    layer.className = `border-beam-layer preset-${preset} ${options.pulse ? 'pulse' : ''}`;
                },
                setSpeed(speedSec) {
                    layer.style.setProperty('--bb-duration', `${speedSec}s`);
                },
                setOpacity(val) {
                    layer.style.setProperty('--bb-opacity', val);
                },
                destroy() {
                    layer.remove();
                    BorderBeamFX.activeBeams.delete(controller);
                }
            };
            this.activeBeams.add(controller);
            return controller;
        }
    };


    // ─── 2. THINKING ORBS FX (thinking-orbs) ──────────────────────────────────────
    const ThinkingOrbFX = {
        // Pure projection and 3D rotation math based on thinking-orbs engine
        createOrb(container, options = {}) {
            if (!container) return null;
            const size = options.size || 38;
            const canvas = document.createElement('canvas');
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            canvas.style.display = 'block';
            canvas.style.cursor = 'pointer';
            canvas.className = 'thinking-orb-canvas';
            container.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            let mode = options.mode || 'orbits'; // orbits, globe, wave, web, rubik, braid, ring
            let isRunning = true;
            let time = 0;
            let speed = options.speed || 1.8;
            let animId = null;

            function rotProj(rx, ry, cx, cy, rad) {
                const sinY = Math.sin(ry), cosY = Math.cos(ry);
                const sinX = Math.sin(rx), cosX = Math.cos(rx);
                return (x, y, z) => {
                    const ex = x * cosX + z * sinX;
                    const lz = -x * sinX + z * cosX;
                    const dy = y * cosY - lz * sinY;
                    const wz = y * sinY + lz * cosY;
                    return [cx + ex * rad, cy - dy * rad, wz];
                };
            }

            function fibonacciSphere(index, total) {
                const phi = Math.PI * (3 - Math.sqrt(5));
                const y = 1 - (index / (total - 1)) * 2;
                const radius = Math.sqrt(Math.max(0, 1 - y * y));
                const theta = phi * index;
                return [Math.cos(theta) * radius, y, Math.sin(theta) * radius];
            }

            function getAccentRGB() {
                const theme = document.documentElement.getAttribute('data-theme') || 'dark';
                const isDark = theme === 'dark';
                // Try reading CSS accent color
                const comp = getComputedStyle(document.documentElement);
                const acc = comp.getPropertyValue('--accent').trim() || '#09F0A0';
                // Convert hex to rgb
                let r = 9, g = 240, b = 160;
                if (acc.startsWith('#')) {
                    const hex = acc.slice(1);
                    if (hex.length === 6) {
                        r = parseInt(hex.slice(0, 2), 16);
                        g = parseInt(hex.slice(2, 4), 16);
                        b = parseInt(hex.slice(4, 6), 16);
                    }
                }
                return { r, g, b, isDark };
            }

            function renderFrame() {
                if (!isRunning) return;
                time += 0.016 * speed;
                const w = canvas.width;
                const h = canvas.height;
                ctx.clearRect(0, 0, w, h);

                const cx = w / 2;
                const cy = h / 2;
                const rad = (w / 2) * 0.76;
                const { r: ar, g: ag, b: ab, isDark } = getAccentRGB();

                const dots = [];
                const lines = [];

                if (mode === 'orbits') {
                    const proj = rotProj(time * 0.45, 0.35, cx, cy, rad);
                    const count = options.particleCount || 28;
                    for (let i = 0; i < count; i++) {
                        const phi = (i / count) * Math.PI * 2 + time * 0.8;
                        const inclination = (i % 4) * (Math.PI / 4) + 0.2;
                        const px = Math.cos(phi) * Math.sin(inclination);
                        const py = Math.sin(phi) * Math.sin(inclination);
                        const pz = Math.cos(inclination);
                        const [sx, sy, sz] = proj(px, py, pz);
                        const depth = (sz + 1) / 2;
                        dots.push({
                            x: sx, y: sy, z: sz,
                            r: (1.2 + depth * 2.2) * (w / 64),
                            alpha: 0.3 + depth * 0.7,
                            isCore: i % 2 === 0
                        });
                    }
                    // Inner glowing nucleus
                    dots.push({
                        x: cx, y: cy, z: 0.5,
                        r: 3.5 * (w / 64),
                        alpha: 0.95,
                        isCore: true
                    });
                } else if (mode === 'globe') {
                    const proj = rotProj(time * 0.6, 0.4, cx, cy, rad);
                    const rings = 10;
                    for (let lat = 0; lat <= rings; lat++) {
                        const v = -Math.PI / 2 + (lat / rings) * Math.PI;
                        const cosV = Math.cos(v);
                        const sinV = Math.sin(v);
                        const lonCount = Math.max(1, Math.round(Math.abs(cosV) * 20));
                        for (let lon = 0; lon < lonCount; lon++) {
                            const u = (lon / lonCount) * Math.PI * 2;
                            const [sx, sy, sz] = proj(cosV * Math.cos(u), sinV, cosV * Math.sin(u));
                            const depth = (sz + 1) / 2;
                            const scan = Math.sin(u + time * 2.0);
                            dots.push({
                                x: sx, y: sy, z: sz,
                                r: (0.8 + depth * 1.5 + (scan > 0.8 ? 0.8 : 0)) * (w / 64),
                                alpha: 0.2 + depth * 0.7,
                                isCore: scan > 0.8
                            });
                        }
                    }
                } else if (mode === 'wave') {
                    const proj = rotProj(time * 0.3, 0.35, cx, cy, rad);
                    const rings = 12;
                    for (let p = 0; p <= rings; p++) {
                        const e = -Math.PI / 2 + (p / rings) * Math.PI;
                        const cosE = Math.cos(e);
                        const sinE = Math.sin(e);
                        const wave = Math.sin(time * 3.0 - p * 0.6) * 0.15;
                        const rEff = 1.0 + wave;
                        const lonCount = Math.max(2, Math.round(Math.abs(cosE) * 22));
                        for (let g = 0; g < lonCount; g++) {
                            const b = (g / lonCount) * Math.PI * 2;
                            const [sx, sy, sz] = proj(cosE * Math.cos(b) * rEff, sinE * rEff, cosE * Math.sin(b) * rEff);
                            const depth = (sz + 1) / 2;
                            dots.push({
                                x: sx, y: sy, z: sz,
                                r: (0.9 + depth * 1.6) * (w / 64),
                                alpha: 0.25 + depth * 0.75,
                                isCore: Math.abs(wave) > 0.1
                            });
                        }
                    }
                } else if (mode === 'web') {
                    const proj = rotProj(time * 0.25, 0.3, cx, cy, rad);
                    const nodes = 18;
                    const coords = [];
                    for (let i = 0; i < nodes; i++) {
                        const pt = fibonacciSphere(i, nodes);
                        const [sx, sy, sz] = proj(pt[0], pt[1], pt[2]);
                        coords.push({ x: sx, y: sy, z: sz });
                        dots.push({
                            x: sx, y: sy, z: sz,
                            r: (1.2 + ((sz + 1) / 2) * 1.8) * (w / 64),
                            alpha: 0.4 + ((sz + 1) / 2) * 0.6,
                            isCore: true
                        });
                    }
                    for (let i = 0; i < nodes; i++) {
                        for (let j = i + 1; j < nodes; j++) {
                            const dist = Math.hypot(coords[i].x - coords[j].x, coords[i].y - coords[j].y);
                            if (dist < rad * 0.9) {
                                lines.push({
                                    x1: coords[i].x, y1: coords[i].y,
                                    x2: coords[j].x, y2: coords[j].y,
                                    alpha: (1 - dist / (rad * 0.9)) * 0.4
                                });
                            }
                        }
                    }
                } else if (mode === 'ring') {
                    const proj = rotProj(time * 0.4, 0.5, cx, cy, rad);
                    const segs = 36;
                    for (let i = 0; i < segs; i++) {
                        const theta = (i / segs) * Math.PI * 2;
                        const wobble = Math.sin(theta * 3 + time * 2) * 0.12;
                        const [sx, sy, sz] = proj(Math.cos(theta) * (1 + wobble), wobble * 0.5, Math.sin(theta) * (1 + wobble));
                        const depth = (sz + 1) / 2;
                        dots.push({
                            x: sx, y: sy, z: sz,
                            r: (1.2 + depth * 2.0) * (w / 64),
                            alpha: 0.3 + depth * 0.7,
                            isCore: i % 3 === 0
                        });
                    }
                }

                // Render lines
                for (const l of lines) {
                    ctx.beginPath();
                    ctx.moveTo(l.x1, l.y1);
                    ctx.lineTo(l.x2, l.y2);
                    ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${l.alpha})`;
                    ctx.lineWidth = 0.8 * dpr;
                    ctx.stroke();
                }

                // Sort dots by depth
                dots.sort((a, b) => a.z - b.z);

                // Render dots
                for (const d of dots) {
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, Math.max(0.6 * dpr, d.r * dpr), 0, Math.PI * 2);
                    if (d.isCore) {
                        ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${d.alpha})`;
                    } else {
                        const baseColor = isDark ? '255, 255, 255' : '30, 30, 35';
                        ctx.fillStyle = `rgba(${baseColor}, ${d.alpha * 0.75})`;
                    }
                    ctx.fill();
                }

                animId = requestAnimationFrame(renderFrame);
            }

            renderFrame();

            // Interactive state change on click
            const MODES_LIST = ['orbits', 'globe', 'wave', 'web', 'ring'];
            canvas.addEventListener('click', (e) => {
                e.stopPropagation();
                const nextIdx = (MODES_LIST.indexOf(mode) + 1) % MODES_LIST.length;
                mode = MODES_LIST[nextIdx];
                canvas.setAttribute('data-orb-mode', mode);
            });

            return {
                canvas,
                setMode(newMode) {
                    if (MODES_LIST.includes(newMode)) {
                        mode = newMode;
                        canvas.setAttribute('data-orb-mode', mode);
                    }
                },
                setState(aiState) {
                    // Mapping standard AI states to thinking-orbs modes
                    const map = {
                        idle: 'orbits',
                        thinking: 'web',
                        searching: 'globe',
                        listening: 'wave',
                        speaking: 'ring',
                        working: 'orbits'
                    };
                    if (map[aiState]) {
                        mode = map[aiState];
                        canvas.setAttribute('data-orb-state', aiState);
                    }
                },
                setSpeed(s) {
                    speed = s;
                },
                destroy() {
                    isRunning = false;
                    if (animId) cancelAnimationFrame(animId);
                    canvas.remove();
                }
            };
        }
    };


    // ─── 3. LIQUID GOOEY FX (liquid-gooey) ─────────────────────────────────────────
    const LiquidGooeyFX = {
        filterInjected: false,

        injectSVGFilter() {
            if (this.filterInjected) return;
            this.filterInjected = true;

            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.id = 'liquid-gooey-filter-svg';
            svg.style.position = 'absolute';
            svg.style.width = '0';
            svg.style.height = '0';
            svg.style.pointerEvents = 'none';
            svg.setAttribute('aria-hidden', 'true');

            svg.innerHTML = `
                <defs>
                    <filter id="liquid-gooey-effect" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur"></feGaussianBlur>
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 45 -22" result="gooey"></feColorMatrix>
                        <feComposite in="SourceGraphic" in2="gooey" operator="atop"></feComposite>
                    </filter>
                    <filter id="liquid-gooey-subtle" x="-10%" y="-10%" width="120%" height="120%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"></feGaussianBlur>
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -15" result="gooey"></feColorMatrix>
                        <feComposite in="SourceGraphic" in2="gooey" operator="atop"></feComposite>
                    </filter>
                </defs>
            `;
            document.body.appendChild(svg);

            // Inject accompanying gooey elastic CSS
            const style = document.createElement('style');
            style.id = 'liquid-gooey-styles';
            style.textContent = `
                .liquid-gooey-container {
                    filter: url(#liquid-gooey-subtle);
                    transition: filter 0.2s ease;
                }
                .liquid-gooey-active {
                    filter: url(#liquid-gooey-effect) !important;
                }
                .liquid-gooey-chip {
                    transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease;
                    will-change: transform;
                }
                .liquid-gooey-chip:hover {
                    transform: scale(1.06) translateY(-1px);
                }
                .liquid-gooey-chip:active {
                    transform: scale(0.94) translateY(1px);
                }
            `;
            document.head.appendChild(style);
        },

        applyToGroup(containerEl) {
            // Complex gooey hover animation disabled per user preference
            return;
        }
    };


    // ─── 4. VOICE GLOW FX (voice-glow) ───────────────────────────────────────────
    const VoiceGlowFX = {
        styleInjected: false,
        audioContext: null,
        analyser: null,
        microphoneStream: null,
        recognition: null,
        isRecording: false,
        activeBeam: null,
        onTranscriptCallback: null,

        injectStyles() {
            if (this.styleInjected) return;
            this.styleInjected = true;
            const style = document.createElement('style');
            style.id = 'voice-glow-styles';
            style.textContent = `
                @keyframes voice-glow-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.85; }
                    50% { transform: scale(1.08); opacity: 1; }
                }
                .voice-btn-active {
                    background: var(--accent, #09F0A0) !important;
                    color: #FFFFFF !important;
                    box-shadow: 0 0 16px var(--accent-glow, rgba(9, 240, 160, 0.45)) !important;
                    animation: voice-glow-pulse 1.6s ease-in-out infinite alternate !important;
                }
                .voice-wave-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 24px;
                    pointer-events: none;
                    z-index: 4;
                    opacity: 0;
                    transition: opacity 0.25s ease;
                    border-radius: 0 0 var(--radius-lg, 24px) var(--radius-lg, 24px);
                    overflow: hidden;
                }
                .voice-wave-overlay.visible {
                    opacity: 1;
                }
                .voice-wave-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                }
            `;
            document.head.appendChild(style);
        },

        initVoiceInput(micBtn, inputContainer, textareaEl) {
            if (!micBtn || !inputContainer) return;
            this.injectStyles();

            // Create voice wave canvas overlay inside inputContainer
            const waveOverlay = document.createElement('div');
            waveOverlay.className = 'voice-wave-overlay';
            const waveCanvas = document.createElement('canvas');
            waveCanvas.className = 'voice-wave-canvas';
            waveOverlay.appendChild(waveCanvas);
            inputContainer.appendChild(waveOverlay);

            const waveCtx = waveCanvas.getContext('2d');
            let animId = null;

            // Speech Recognition setup (Web Speech API)
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                this.recognition = new SpeechRec();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = 'en-US';

                this.recognition.onresult = (event) => {
                    let fullTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        fullTranscript += event.results[i][0].transcript;
                    }
                    if (textareaEl && fullTranscript.trim()) {
                        textareaEl.value = fullTranscript.trim();
                        textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                };

                this.recognition.onerror = (err) => {
                    console.warn('Speech recognition status:', err.error);
                    if (err.error === 'not-allowed') {
                        VoiceGlowFX.stopRecording(micBtn, waveOverlay, waveCanvas);
                    }
                };

                this.recognition.onend = () => {
                    if (VoiceGlowFX.isRecording) {
                        try { VoiceGlowFX.recognition.start(); } catch (e) {}
                    }
                };
            }

            const startAudioGlow = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    VoiceGlowFX.microphoneStream = stream;
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    VoiceGlowFX.audioContext = new AudioCtx();
                    const source = VoiceGlowFX.audioContext.createMediaStreamSource(stream);
                    VoiceGlowFX.analyser = VoiceGlowFX.audioContext.createAnalyser();
                    VoiceGlowFX.analyser.fftSize = 64;
                    source.connect(VoiceGlowFX.analyser);

                    const bufferLength = VoiceGlowFX.analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);

                    // Resize canvas
                    const rect = waveCanvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    waveCanvas.width = (rect.width || 300) * dpr;
                    waveCanvas.height = 24 * dpr;

                    function drawWave() {
                        if (!VoiceGlowFX.isRecording) return;
                        animId = requestAnimationFrame(drawWave);
                        VoiceGlowFX.analyser.getByteFrequencyData(dataArray);

                        const w = waveCanvas.width;
                        const h = waveCanvas.height;
                        waveCtx.clearRect(0, 0, w, h);

                        // Draw reactive multi-color audio waves
                        const barWidth = w / bufferLength;
                        let x = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            const barHeight = (dataArray[i] / 255) * h * 0.9;
                            const hue = (i / bufferLength) * 120 + 130; // Emerald to Cyan glow
                            waveCtx.fillStyle = `hsla(${hue}, 90%, 55%, 0.75)`;
                            waveCtx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
                            x += barWidth;
                        }
                    }
                    drawWave();
                } catch (err) {
                    console.warn('Audio capture not permitted or failed:', err);
                }
            };

            micBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (!VoiceGlowFX.isRecording) {
                    // START
                    VoiceGlowFX.isRecording = true;
                    micBtn.classList.add('voice-btn-active');
                    micBtn.setAttribute('title', 'Listening... Click to stop');
                    waveOverlay.classList.add('visible');

                    // Attach border beam glow during voice active
                    VoiceGlowFX.activeBeam = BorderBeamFX.attach(inputContainer, {
                        preset: 'ocean',
                        duration: '2.5s',
                        width: '3px',
                        pulse: true
                    });

                    if (VoiceGlowFX.recognition) {
                        try { VoiceGlowFX.recognition.start(); } catch (e) {}
                    }
                    await startAudioGlow();
                } else {
                    // STOP
                    VoiceGlowFX.stopRecording(micBtn, waveOverlay, waveCanvas);
                }
            });
        },

        stopRecording(micBtn, waveOverlay, waveCanvas) {
            VoiceGlowFX.isRecording = false;
            if (micBtn) {
                micBtn.classList.remove('voice-btn-active');
                micBtn.setAttribute('title', 'Voice Dictation');
            }
            if (waveOverlay) waveOverlay.classList.remove('visible');

            if (VoiceGlowFX.activeBeam) {
                VoiceGlowFX.activeBeam.destroy();
                VoiceGlowFX.activeBeam = null;
            }

            if (VoiceGlowFX.recognition) {
                try { VoiceGlowFX.recognition.stop(); } catch (e) {}
            }

            if (VoiceGlowFX.microphoneStream) {
                VoiceGlowFX.microphoneStream.getTracks().forEach(t => t.stop());
                VoiceGlowFX.microphoneStream = null;
            }

            if (VoiceGlowFX.audioContext && VoiceGlowFX.audioContext.state !== 'closed') {
                VoiceGlowFX.audioContext.close();
                VoiceGlowFX.audioContext = null;
            }
        }
    };


    // ─── 5. AUTHENTIC LIBRARIES.DEV IMAGE GENERATION FX (img-fx) ───────────────────
    // A high-crafted WebGL image-generation loader built on a churning pixel-mosaic
    // shader that dissolves in real images. Ported 1:1 from https://libraries.dev/image
    const ImageGenerationFX = (() => {
        const PRESETS = {
        "pixels-organic": {
                "name": "pixels-organic",
                "modes": {
                        "dark": {
                                "theme": "dark",
                                "effectIndex": 22,
                                "colors": [
                                        "#08090D",
                                        "#00F0FF",
                                        "#8B5CF6",
                                        "#38BDF8",
                                        "#1E1B4B",
                                        "#10B981",
                                        "#E2E8F0"
                                ],
                                "alphas": [
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1
                                ],
                                "cardBg": "#08090D",
                                "dotMode": 1,
                                "pixelConfig": {
                                        "cellSize": 0.22,
                                        "gap": 0.14,
                                        "dotOpacity": 0.9,
                                        "dotSize": 0.85,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.8,
                                        "fillOpacity": 0.44,
                                        "edgeFade": 24,
                                        "fadeStr": 1
                                },
                                "dotConfig": {
                                        "cellSize": 0.58,
                                        "gap": 0,
                                        "dotOpacity": 1,
                                        "dotSize": 0.25,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.3,
                                        "fillOpacity": 0,
                                        "edgeFade": 34,
                                        "fadeStr": 0.34
                                },
                                "direction": 0,
                                "speed": 0.55,
                                "intensity": 1.25,
                                "scale": 1.1,
                                "softness": 0.76,
                                "distortion": 0.35,
                                "complexity": 0.3,
                                "shape": 0.52,
                                "blur": 1,
                                "highlight": 0.5,
                                "vignette": 0.26,
                                "vigOpacity": 1,
                                "shaderOpacity": 1,
                                "revealConfig": {
                                        "duration": 2.4,
                                        "easing": "easeOutCubic",
                                        "maskShape": "shaderColor4",
                                        "softness": 0.5,
                                        "blur": 0,
                                        "pixDuration": 2.1,
                                        "pixEasing": "easeOutCubic",
                                        "dotDuration": 1.8,
                                        "dotEasing": "easeOutCubic"
                                },
                                "effect": "Chromium Flow"
                        },
                        "light": {
                                "theme": "light",
                                "effectIndex": 22,
                                "colors": [
                                        "#FFFFFF",
                                        "#0284C7",
                                        "#00D2FF",
                                        "#2563EB",
                                        "#6366F1",
                                        "#0D9488",
                                        "#38BDF8"
                                ],
                                "alphas": [
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1
                                ],
                                "cardBg": "#F8FAFC",
                                "dotMode": 1,
                                "pixelConfig": {
                                        "cellSize": 0.22,
                                        "gap": 0.14,
                                        "dotOpacity": 0.88,
                                        "dotSize": 0.85,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.8,
                                        "fillOpacity": 0.38,
                                        "edgeFade": 20,
                                        "fadeStr": 1
                                },
                                "dotConfig": {
                                        "cellSize": 0.58,
                                        "gap": 0,
                                        "dotOpacity": 1,
                                        "dotSize": 0.25,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.3,
                                        "fillOpacity": 0,
                                        "edgeFade": 34,
                                        "fadeStr": 0.34
                                },
                                "direction": 25,
                                "speed": 0.55,
                                "intensity": 1.15,
                                "scale": 1.1,
                                "softness": 0.76,
                                "distortion": 0.35,
                                "complexity": 0.3,
                                "shape": 0.52,
                                "blur": 1,
                                "highlight": 0.55,
                                "vignette": 0,
                                "vigOpacity": 0,
                                "shaderOpacity": 1,
                                "revealConfig": {
                                        "duration": 2.4,
                                        "easing": "easeOutCubic",
                                        "maskShape": "shaderColor4",
                                        "softness": 0.5,
                                        "blur": 0,
                                        "pixDuration": 2.1,
                                        "pixEasing": "easeOutCubic",
                                        "dotDuration": 1.8,
                                        "dotEasing": "easeOutCubic"
                                },
                                "effect": "Chromium Flow"
                        }
                }
        },
        "pixels-mechanic": {
                "name": "pixels-mechanic",
                "modes": {
                        "dark": {
                                "theme": "dark",
                                "effectIndex": 11,
                                "colors": [
                                        "#0D0F14",
                                        "#10B981",
                                        "#84CC16",
                                        "#06B6D4",
                                        "#64748B",
                                        "#3B82F6",
                                        "#F59E0B"
                                ],
                                "alphas": [
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1
                                ],
                                "cardBg": "#0D0F14",
                                "dotMode": 1,
                                "pixelConfig": {
                                        "cellSize": 0.22,
                                        "gap": 0.14,
                                        "dotOpacity": 0.9,
                                        "dotSize": 0.85,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.8,
                                        "fillOpacity": 0.44,
                                        "edgeFade": 24,
                                        "fadeStr": 1
                                },
                                "dotConfig": {
                                        "cellSize": 0.58,
                                        "gap": 0,
                                        "dotOpacity": 1,
                                        "dotSize": 0.25,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.3,
                                        "fillOpacity": 0,
                                        "edgeFade": 34,
                                        "fadeStr": 0.34
                                },
                                "direction": 0,
                                "speed": 0.65,
                                "intensity": 1.25,
                                "scale": 1.4,
                                "softness": 0.76,
                                "distortion": 0.3,
                                "flicker": 0.5,
                                "complexity": 0.25,
                                "shape": 0.52,
                                "blur": 1,
                                "highlight": 0.5,
                                "vignette": 0.26,
                                "vigOpacity": 1,
                                "shaderOpacity": 1,
                                "revealConfig": {
                                        "duration": 2.4,
                                        "easing": "easeOutCubic",
                                        "maskShape": "shaderColor4",
                                        "softness": 0.5,
                                        "blur": 0,
                                        "pixDuration": 2.1,
                                        "pixEasing": "easeOutCubic",
                                        "dotDuration": 1.8,
                                        "dotEasing": "easeOutCubic"
                                },
                                "effect": "Nebula"
                        },
                        "light": {
                                "theme": "light",
                                "effectIndex": 11,
                                "colors": [
                                        "#F0FDF4",
                                        "#059669",
                                        "#0284C7",
                                        "#7C3AED",
                                        "#2563EB",
                                        "#047857",
                                        "#0EA5E9"
                                ],
                                "alphas": [
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1
                                ],
                                "cardBg": "#F0FDF4",
                                "dotMode": 1,
                                "pixelConfig": {
                                        "cellSize": 0.22,
                                        "gap": 0.14,
                                        "dotOpacity": 0.88,
                                        "dotSize": 0.85,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.8,
                                        "fillOpacity": 0.38,
                                        "edgeFade": 20,
                                        "fadeStr": 1
                                },
                                "dotConfig": {
                                        "cellSize": 0.58,
                                        "gap": 0,
                                        "dotOpacity": 1,
                                        "dotSize": 0.25,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.3,
                                        "fillOpacity": 0,
                                        "edgeFade": 34,
                                        "fadeStr": 0.34
                                },
                                "direction": 0,
                                "speed": 0.65,
                                "intensity": 1.15,
                                "scale": 1.3,
                                "softness": 0.76,
                                "distortion": 0.3,
                                "flicker": 0.5,
                                "complexity": 0.25,
                                "shape": 0.52,
                                "blur": 1,
                                "highlight": 0.5,
                                "vignette": 0,
                                "vigOpacity": 0,
                                "shaderOpacity": 1,
                                "revealConfig": {
                                        "duration": 2.4,
                                        "easing": "easeOutCubic",
                                        "maskShape": "shaderColor4",
                                        "softness": 0.5,
                                        "blur": 0,
                                        "pixDuration": 2.1,
                                        "pixEasing": "easeOutCubic",
                                        "dotDuration": 1.8,
                                        "dotEasing": "easeOutCubic"
                                },
                                "effect": "Nebula"
                        }
                }
        },
        "sweep-gradient": {
                "name": "sweep-gradient",
                "modes": {
                        "dark": {
                                "theme": "dark",
                                "effectIndex": 25,
                                "colors": [
                                        "#090A0F",
                                        "#EC4899",
                                        "#F59E0B",
                                        "#8B5CF6",
                                        "#F43F5E",
                                        "#06B6D4",
                                        "#E0E7FF"
                                ],
                                "alphas": [
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1
                                ],
                                "cardBg": "#090A0F",
                                "dotMode": 1,
                                "pixelConfig": {
                                        "cellSize": 0.22,
                                        "gap": 0.14,
                                        "dotOpacity": 0.9,
                                        "dotSize": 0.85,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.8,
                                        "fillOpacity": 0.44,
                                        "edgeFade": 24,
                                        "fadeStr": 1
                                },
                                "dotConfig": {
                                        "cellSize": 0.58,
                                        "gap": 0,
                                        "dotOpacity": 1,
                                        "dotSize": 0.25,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.3,
                                        "fillOpacity": 0,
                                        "edgeFade": 34,
                                        "fadeStr": 0.34
                                },
                                "direction": 45,
                                "speed": 0.65,
                                "intensity": 1.3,
                                "scale": 1.2,
                                "softness": 0.76,
                                "distortion": 0.3,
                                "flicker": 0.5,
                                "complexity": 0.2,
                                "shape": 0.52,
                                "blur": 1,
                                "highlight": 0.5,
                                "vignette": 0.26,
                                "vigOpacity": 1,
                                "shaderOpacity": 1,
                                "revealConfig": {
                                        "duration": 2.4,
                                        "easing": "easeOutCubic",
                                        "maskShape": "shaderColor4",
                                        "softness": 0.5,
                                        "blur": 0,
                                        "pixDuration": 2.1,
                                        "pixEasing": "easeOutCubic",
                                        "dotDuration": 1.8,
                                        "dotEasing": "easeOutCubic"
                                },
                                "effect": "Gradient Sweep"
                        },
                        "light": {
                                "theme": "light",
                                "effectIndex": 25,
                                "colors": [
                                        "#FFFBEB",
                                        "#F97316",
                                        "#E11D48",
                                        "#7C3AED",
                                        "#D946EF",
                                        "#F59E0B",
                                        "#FB7185"
                                ],
                                "alphas": [
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1,
                                        1
                                ],
                                "cardBg": "#FFFBEB",
                                "dotMode": 1,
                                "pixelConfig": {
                                        "cellSize": 0.22,
                                        "gap": 0.14,
                                        "dotOpacity": 0.88,
                                        "dotSize": 0.85,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.8,
                                        "fillOpacity": 0.38,
                                        "edgeFade": 20,
                                        "fadeStr": 1
                                },
                                "dotConfig": {
                                        "cellSize": 0.58,
                                        "gap": 0,
                                        "dotOpacity": 1,
                                        "dotSize": 0.25,
                                        "dotSoftness": 0.1,
                                        "hlScale": 0.3,
                                        "fillOpacity": 0,
                                        "edgeFade": 34,
                                        "fadeStr": 0.34
                                },
                                "direction": 45,
                                "speed": 0.65,
                                "intensity": 1.2,
                                "scale": 1.2,
                                "softness": 0.76,
                                "distortion": 0.3,
                                "flicker": 0.5,
                                "complexity": 0.2,
                                "shape": 0.52,
                                "blur": 1,
                                "highlight": 0.55,
                                "vignette": 0,
                                "vigOpacity": 0,
                                "shaderOpacity": 1,
                                "revealConfig": {
                                        "duration": 2.4,
                                        "easing": "easeOutCubic",
                                        "maskShape": "shaderColor4",
                                        "softness": 0.5,
                                        "blur": 0,
                                        "pixDuration": 2.1,
                                        "pixEasing": "easeOutCubic",
                                        "dotDuration": 1.8,
                                        "dotEasing": "easeOutCubic"
                                },
                                "effect": "Gradient Sweep"
                        }
                }
        }
};
        const EASINGS = {
            linear: t => t,
            smoothstep: t => t * t * (3 - 2 * t),
            easeOutCubic: t => 1 - Math.pow(1 - t, 3),
            easeOutQuint: t => 1 - Math.pow(1 - t, 5),
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        };

        function ease(key, t) {
            return (EASINGS[key] || EASINGS.easeOutCubic)(Math.max(0, Math.min(1, t)));
        }

        function parseHex(hex) {
            if (!hex || typeof hex !== 'string') return [0.1, 0.1, 0.1];
            hex = hex.replace('#', '').trim();
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const num = parseInt(hex, 16);
            if (isNaN(num)) return [0.1, 0.1, 0.1];
            return [
                ((num >> 16) & 255) / 255,
                ((num >> 8) & 255) / 255,
                (num & 255) / 255
            ];
        }

        const VERTEX_SHADER = [
            'attribute vec2 position;',
            'void main() {',
            '    gl_Position = vec4(position, 0.0, 1.0);',
            '}'
        ].join('\n');

        const FRAGMENT_SHADER = [
            '#ifdef GL_FRAGMENT_PRECISION_HIGH',
            'precision highp float;',
            'precision highp int;',
            '#else',
            'precision mediump float;',
            'precision mediump int;',
            '#endif',
            "\n  uniform vec2 u_resolution;\n  uniform float u_dpr;\n  uniform float u_time;\n  uniform vec3 u_color1, u_color2, u_color3, u_color4, u_color5, u_color6, u_color7, u_cardBg;\n  uniform float u_alpha1, u_alpha2, u_alpha3, u_alpha4, u_alpha5, u_alpha6, u_alpha7;\n  uniform float u_speed, u_intensity, u_scale, u_direction;\n  uniform float u_softness, u_distortion, u_complexity, u_shape, u_flicker;\n  uniform float u_vignette, u_vigOpacity, u_blur, u_highlight, u_shaderOpacity;\n  uniform float u_cellSize, u_gap, u_dotSize, u_dotSoftness, u_dotOpacity, u_hlScale, u_fillOpacity, u_edgeFade, u_fadeStr;\n  uniform float u_dotMode;\n  uniform int u_effect;\n  uniform int u_sweepEase;\n\n  // Reference card edge length (CSS px) at which the original preset cellSize\n  // gives the canonical cell count. Cell PIXEL size stays constant across card\n  // sizes by scaling gridSize proportionally to (currentCssDim / REF_DIM).\n  const float REF_DIM = 320.0;\n\n  /** Anisotropic cell count: returns the number of cells along x and y so that\n   *  each cell stays SQUARE in screen space regardless of the card's aspect\n   *  ratio. A 600×300 card gets twice as many cells horizontally as vertically;\n   *  cells stay the same physical size as on a 300×300 card. */\n  vec2 gridCounts(float baseCount) {\n    vec2 cssRes = u_resolution / max(u_dpr, 0.0001);\n    return max(vec2(2.0), floor(baseCount * cssRes / REF_DIM));\n  }\n\n  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }\n  vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }\n  vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }\n\n  float snoise(vec2 v) {\n    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\n    vec2 i = floor(v + dot(v, C.yy));\n    vec2 x0 = v - i + dot(i, C.xx);\n    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n    vec4 x12 = x0.xyxy + C.xxzz;\n    x12.xy -= i1;\n    i = mod289v2(i);\n    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n    m = m * m; m = m * m;\n    vec3 x_ = 2.0 * fract(p * C.www) - 1.0;\n    vec3 h = abs(x_) - 0.5;\n    vec3 ox = floor(x_ + 0.5);\n    vec3 a0 = x_ - ox;\n    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\n    vec3 g;\n    g.x = a0.x * x0.x + h.x * x0.y;\n    g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n    return 130.0 * dot(m, g);\n  }\n\n  float fbm(vec2 p, float oct) {\n    float val = 0.0, amp = 0.5;\n    val += amp * snoise(p); p *= 2.0; amp *= 0.5;\n    if (oct > 1.5) { val += amp * snoise(p); p *= 2.0; amp *= 0.5; }\n    if (oct > 2.5) { val += amp * snoise(p); p *= 2.0; amp *= 0.5; }\n    if (oct > 3.5) { val += amp * snoise(p); }\n    return val;\n  }\n\n  float nfbm(vec2 p) { return fbm(p, 2.0 + u_complexity * 2.0); }\n\n  vec3 palette(float t) {\n    t = clamp(t, 0.0, 1.0);\n    t = t * t * (3.0 - 2.0 * t);\n    float k = 64.0;\n    float w1 = u_alpha1 * exp(-k * t * t);\n    float w2 = u_alpha2 * exp(-k * (t - 0.25) * (t - 0.25));\n    float w3 = u_alpha3 * exp(-k * (t - 0.5)  * (t - 0.5));\n    float w4 = u_alpha4 * exp(-k * (t - 0.75) * (t - 0.75));\n    float w5 = u_alpha5 * exp(-k * (t - 1.0)  * (t - 1.0));\n    float total = w1 + w2 + w3 + w4 + w5 + 0.0001;\n    return (u_color1*w1 + u_color2*w2 + u_color3*w3 + u_color4*w4 + u_color5*w5) / total;\n  }\n\n  vec3 softBlend(float a, float b, float c) {\n    a = clamp(a, 0.0, 1.0); a *= a;\n    b = clamp(b, 0.0, 1.0); b *= b;\n    c = clamp(c, 0.0, 1.0); c *= c;\n    float d = clamp(a * 0.7 + c * 0.3, 0.0, 1.0); d *= d;\n    float e = clamp(b * 0.5 + c * 0.5, 0.0, 1.0); e *= e;\n    a *= u_alpha1; b *= u_alpha2; c *= u_alpha3; d *= u_alpha4; e *= u_alpha5;\n    float total = a + b + c + d + e;\n    float floorW = max(0.001 - total, 0.0);\n    vec3 fallback = (u_color1 + u_color2 + u_color3 + u_color4 + u_color5) * 0.2;\n    return (u_color1 * a + u_color2 * b + u_color3 * c + u_color4 * d + u_color5 * e + fallback * floorW) / (total + floorW);\n  }\n\n  vec2 warp(vec2 p, float t) {\n    float str = u_distortion * 2.0;\n    return vec2(\n      nfbm(p + vec2(t * 0.1, 0.0)),\n      nfbm(p + vec2(0.0, t * 0.12) + 5.0)\n    ) * str;\n  }\n\n  float sweepEase(float x) {\n    if (u_sweepEase == 1) return x * x * (3.0 - 2.0 * x);\n    if (u_sweepEase == 2) {\n      float p = 1.0 - x;\n      return 1.0 - p * p * p;\n    }\n    if (u_sweepEase == 3) {\n      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) * 0.5;\n    }\n    if (u_sweepEase == 4) return 1.0 - pow(2.0, -10.0 * x) * (1.0 - x);\n    return x;\n  }\n\n  float blob(vec2 p, vec2 center, float radius) {\n    float r = radius * (0.5 + u_shape * 0.8);\n    float soft = 0.05 + u_softness * 0.4;\n    return smoothstep(r + soft, r - soft * 0.5, length(p - center));\n  }\n\n  vec3 computeEffect(vec2 uv, float aspect, float t, float dist, float soft, float cpx, float shp) {\n    vec2 p = (uv - 0.5) * u_scale;\n    p.x *= aspect;\n    p += vec2(cos(u_direction), sin(u_direction)) * t * 0.15;\n    vec3 col = vec3(0.0);\n\n    if (u_effect == 0) {\n      float val = sin(p.x * 3.0 + t) * 0.5 + 0.5;\n      val += sin(p.y * 2.0 + t * 0.7) * 0.3;\n      val += sin((p.x + p.y) * (1.0 + cpx * 3.0) - t * 0.5) * 0.2;\n      vec2 w = warp(p, t);\n      val += (w.x + w.y) * 0.15;\n      col = palette(clamp(val * u_intensity, 0.0, 1.0));\n\n    } else if (u_effect == 1) {\n      float freq = 3.0 + cpx * 8.0;\n      float val = 0.0;\n      val += sin(p.x * freq + t);\n      val += sin(p.y * freq + t * 1.3);\n      val += sin((p.x + p.y) * freq * 0.7 + t * 0.7);\n      val += sin(length(p) * freq * 0.8 - t * 1.5);\n      vec2 w = warp(p, t);\n      val += (w.x + w.y) * dist;\n      val = val * 0.2 * u_intensity + 0.5;\n      col = palette(clamp(val, 0.0, 1.0));\n\n    } else if (u_effect == 2) {\n      vec2 q = vec2(nfbm(p + t * 0.3), nfbm(p + vec2(5.2, 1.3) + t * 0.2));\n      float val = nfbm(p + q * (1.0 + dist * 3.0) + t * 0.1);\n      val = val * u_intensity * 0.5 + 0.5;\n      col = palette(clamp(val, 0.0, 1.0));\n\n    } else if (u_effect == 3) {\n      float d = length(p);\n      float val = sin(d * (3.0 + cpx * 6.0) - t * 2.0) * 0.5 + 0.5;\n      val *= exp(-d * (0.3 + shp * 1.0));\n      val += sin(atan(p.y, p.x) * (1.5 + cpx * 2.0) + t) * 0.15;\n      col = palette(clamp(val * u_intensity, 0.0, 1.0));\n\n    } else if (u_effect == 4) {\n      vec2 q = vec2(nfbm(p * (0.5 + shp * 0.6) + vec2(t * 0.12, t * 0.08)), nfbm(p * (0.5 + shp * 0.6) + vec2(t * 0.09, -t * 0.11)));\n      vec2 r = vec2(nfbm(p + q * (1.0 + dist * 2.0) + vec2(1.7, 9.2) + t * 0.06), nfbm(p + q * (1.0 + dist * 2.0) + vec2(8.3, 2.8) - t * 0.08));\n      float val = nfbm(p + r * 2.0);\n      float lo = -0.3 - soft * 0.5;\n      float hi = 0.5 + soft * 0.5;\n      val = smoothstep(lo, hi, val * u_intensity);\n      col = palette(val);\n\n    } else if (u_effect == 5) {\n      float n1 = nfbm(vec2(p.x * 0.5 + t * 0.15, p.y * (1.0 + cpx * 1.5)));\n      float n2 = nfbm(vec2(p.x * 0.3 - t * 0.1, p.y * (0.8 + cpx * 1.0) + 3.0));\n      float band = sin(p.y * 3.0 + n1 * (1.0 + dist * 2.0) + t * 0.3) * 0.5 + 0.5;\n      float shimmer = sin(p.y * 4.0 + n2 * 1.5 - t * 0.2) * 0.5 + 0.5;\n      float w1 = band * (0.5 + 0.5 * sin(p.x * 1.5 + t * 0.2 + n1));\n      float w2 = shimmer * (0.5 + 0.5 * cos(p.x * 1.0 - t * 0.15 + n2));\n      float w3 = nfbm(p * 0.5 + t * 0.05) * 0.5 + 0.5;\n      col = softBlend(w1 * u_intensity, w2 * u_intensity, w3 * 0.6 * u_intensity);\n\n    } else if (u_effect == 6) {\n      vec2 wp = warp(p * 1.2, t);\n      float blobR = 0.15 + shp * 0.2;\n      float b1 = blob(p, vec2(sin(t * 0.3) * 0.3, cos(t * 0.2) * 0.4) + wp * 0.2, blobR);\n      float b2 = blob(p, vec2(cos(t * 0.25) * 0.4, sin(t * 0.35) * 0.3 - 0.2) + wp * 0.15, blobR * 1.2);\n      float b3 = blob(p, vec2(-sin(t * 0.2) * 0.3, -cos(t * 0.3) * 0.35) + wp * 0.18, blobR);\n      float bg = nfbm(p * 0.5 + t * 0.05) * 0.3 + 0.15;\n      col = softBlend((b1 + bg * 0.5) * u_intensity, (b2 + bg * 0.3) * u_intensity, (b3 + bg * 0.4) * u_intensity);\n\n    } else if (u_effect == 7) {\n      float sz = 0.4 + shp * 0.6;\n      float sigma = sz * sz * 2.0;\n      vec2 a1 = vec2(-0.45 + sin(t * 0.07) * 0.06, 0.45 + cos(t * 0.09) * 0.05);\n      vec2 a2 = vec2(0.45 + cos(t * 0.08) * 0.06, 0.45 + sin(t * 0.06) * 0.05);\n      vec2 a3 = vec2(0.0 + sin(t * 0.05) * 0.1, 0.0 + cos(t * 0.07) * 0.1);\n      vec2 a4 = vec2(-0.4 + cos(t * 0.06) * 0.07, -0.3 + sin(t * 0.08) * 0.06);\n      vec2 a5 = vec2(0.4 + sin(t * 0.07) * 0.06, -0.4 + cos(t * 0.05) * 0.06);\n      float g1 = exp(-dot(p - a1, p - a1) / sigma);\n      float g2 = exp(-dot(p - a2, p - a2) / sigma);\n      float g3 = exp(-dot(p - a3, p - a3) / sigma);\n      float g4 = exp(-dot(p - a4, p - a4) / sigma);\n      float g5 = exp(-dot(p - a5, p - a5) / sigma);\n      float nudge = dist > 0.01 ? snoise(p * (0.5 + cpx) + t * 0.04) * dist * 0.08 : 0.0;\n      float w1 = (g1 + g4 + nudge) * u_intensity;\n      float w2 = (g2 + g5 + nudge) * u_intensity;\n      float w3 = (g3 + nudge) * u_intensity;\n      col = softBlend(w1, w2, w3);\n\n    } else if (u_effect == 8) {\n      vec2 w1 = vec2(nfbm(p * (0.7 + cpx * 0.5) + t * 0.1), nfbm(p * (0.7 + cpx * 0.5) + vec2(3.3, 7.7) + t * 0.08));\n      vec2 w2 = vec2(nfbm(p * 0.6 + w1 * (1.0 + dist) + t * 0.06), nfbm(p * 0.6 + w1 * (1.0 + dist) + vec2(1.7, 4.2) - t * 0.07));\n      float f1 = nfbm(p + w2 * 1.5);\n      float f2 = nfbm(p + w2 * 1.5 + vec2(4.1, 2.3));\n      float f3 = nfbm(p + w2 * 1.5 + vec2(7.5, 6.1));\n      col = softBlend((f1 * 0.5 + 0.5) * u_intensity, (f2 * 0.5 + 0.5) * u_intensity, (f3 * 0.5 + 0.5) * u_intensity);\n\n    } else if (u_effect == 9) {\n      vec2 sw = vec2(sin(p.y * 2.0 + t * 0.3) * 0.15 + snoise(p * 1.5 + t * 0.15) * dist * 0.3, cos(p.x * 1.8 + t * 0.25) * 0.15 + snoise(p * 1.5 + vec2(5.0, 0.0) + t * 0.12) * dist * 0.3);\n      vec2 wp = p + sw;\n      float caustic = (snoise(wp * (1.5 + cpx * 2.0) + t * 0.2) * 0.5 + 0.5) + (snoise(wp * (2.0 + cpx * 2.0) - t * 0.15) * 0.5 + 0.5) * 0.5;\n      caustic = caustic / 1.5;\n      float depth = nfbm(vec2(p.x * 0.3, p.y * 0.8) + t * 0.05) * 0.5 + 0.5;\n      col = softBlend(depth * u_intensity, (1.0 - depth) * u_intensity, caustic * u_intensity);\n\n    } else if (u_effect == 10) {\n      float angle = 0.6 + shp * 1.2;\n      float ca = cos(angle), sa = sin(angle);\n      vec2 rp = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);\n      float n1 = nfbm(rp * 0.8 + t * 0.12) * (1.0 + dist * 2.0);\n      float n2 = nfbm(rp * 0.6 + vec2(3.0, 0.0) + t * 0.1) * (1.0 + dist * 1.5);\n      float wave = sin(rp.x * (2.0 + cpx * 2.0) + n1 + t * 0.3);\n      float wave2 = sin(rp.x * (1.5 + cpx * 1.5) + n2 - t * 0.2);\n      float ribbon1 = exp(-2.0 * (rp.y - wave * 0.35) * (rp.y - wave * 0.35)) * u_intensity;\n      float ribbon2 = exp(-2.0 * (rp.y - 0.15 - wave2 * 0.3) * (rp.y - 0.15 - wave2 * 0.3)) * u_intensity;\n      float bg = nfbm(p * 0.4 + t * 0.03) * 0.5 + 0.5;\n      col = softBlend(ribbon1, ribbon2, bg * 0.5 * u_intensity);\n\n    } else if (u_effect == 11) {\n      vec2 q = vec2(nfbm(p * 0.5 + vec2(t * 0.05, 0.0)), nfbm(p * 0.5 + vec2(0.0, t * 0.07)));\n      vec2 r = vec2(nfbm(p * 0.6 + q * (1.0 + dist * 1.5) + vec2(1.7, 9.2) + t * 0.03), nfbm(p * 0.6 + q * (1.0 + dist * 1.5) + vec2(8.3, 2.8) + t * 0.04));\n      float f = nfbm(p + r * 1.5);\n      float f2 = nfbm(p * 0.7 + r + vec2(3.0, 7.0));\n      col = softBlend((f * 0.5 + 0.5) * u_intensity, (f2 * 0.5 + 0.5) * u_intensity, (nfbm(p * 0.4 - t * 0.02) * 0.5 + 0.5) * u_intensity);\n\n    } else if (u_effect == 12) {\n      vec2 w = warp(p * 0.5, t * 0.7);\n      float fold1 = sin(p.x * (1.5 + cpx * 2.0) + w.x * 1.5 + t * 0.2) * 0.5 + 0.5;\n      float fold2 = sin(p.y * (1.2 + cpx * 1.5) + w.y * 1.5 - t * 0.15) * 0.5 + 0.5;\n      float fold3 = sin((p.x - p.y) * (0.8 + cpx * 0.8) + (w.x + w.y) + t * 0.1) * 0.5 + 0.5;\n      col = softBlend(fold1 * u_intensity, fold2 * u_intensity, fold3 * 0.7 * u_intensity);\n\n    } else if (u_effect == 13) {\n      float spread = 0.25 + shp * 0.35;\n      vec2 w = warp(p, t * 0.5);\n      vec2 c1 = vec2(sin(t * 0.08) * spread, cos(t * 0.11) * spread) + w * 0.15;\n      vec2 c2 = vec2(cos(t * 0.09) * spread * 1.3, sin(t * 0.07) * spread) + w * 0.12;\n      vec2 c3 = vec2(-sin(t * 0.1) * spread, -cos(t * 0.08) * spread * 1.2) + w * 0.1;\n      float falloff = 0.3 + soft * 0.7;\n      float d1 = 1.0 - smoothstep(0.0, falloff, length(p - c1 + w * dist * 0.3));\n      float d2 = 1.0 - smoothstep(0.0, falloff, length(p - c2 + w * dist * 0.25));\n      float d3 = 1.0 - smoothstep(0.0, falloff, length(p - c3 + w * dist * 0.2));\n      float detail = nfbm(p * 2.0 + t * 0.05) * cpx * 0.3;\n      col = softBlend((d1 + detail) * u_intensity, (d2 + detail) * u_intensity, (d3 + detail) * u_intensity);\n\n    } else if (u_effect == 14) {\n      vec2 w = warp(p * 0.6, t * 0.6);\n      float angle = atan(p.y + w.y * dist, p.x + w.x * dist);\n      float radius = length(p);\n      float field1 = sin(angle * (2.0 + cpx * 4.0) + radius * (3.0 + cpx * 3.0) + t * 0.4 + nfbm(p + t * 0.1) * dist * 2.0) * 0.5 + 0.5;\n      float field2 = sin(angle * (1.5 + cpx * 2.5) - radius * 2.0 - t * 0.3 + nfbm(p * 0.6 + t * 0.08) * dist * 1.5) * 0.5 + 0.5;\n      float bg = nfbm(p * 0.3 + t * 0.03) * 0.5 + 0.5;\n      col = softBlend(field1 * u_intensity, field2 * u_intensity, bg * 0.5 * u_intensity);\n\n    } else if (u_effect == 15) {\n      vec2 drift = vec2(t * 0.06, t * 0.03);\n      float c1 = nfbm((p + drift) * (0.4 + cpx * 0.5)) * 0.5 + 0.5;\n      float c2 = nfbm((p + drift + vec2(3.7, 1.2)) * (0.35 + cpx * 0.4)) * 0.5 + 0.5;\n      float c3 = nfbm((p + drift + vec2(7.1, 4.5)) * (0.3 + cpx * 0.35)) * 0.5 + 0.5;\n      vec2 w = warp(p * 0.2, t * 0.4);\n      c1 += w.x * dist * 0.3;\n      c2 += w.y * dist * 0.25;\n      col = softBlend(c1 * u_intensity, c2 * u_intensity, c3 * u_intensity);\n\n    } else if (u_effect == 16) {\n      vec2 w = warp(vec2(p.x * 0.3, p.y * 0.6), t * 0.5);\n      float c1 = sin(p.x * (1.5 + cpx * 2.0) + w.x * (1.0 + dist * 2.0) + t * 0.15) * 0.5 + 0.5;\n      float c2 = sin(p.x * (1.0 + cpx * 1.5) + w.y * (1.0 + dist * 1.5) - t * 0.12 + 2.0) * 0.5 + 0.5;\n      float c3 = sin(p.x * (0.8 + cpx * 1.0) + (w.x + w.y) * 0.5 * (1.0 + dist) + t * 0.08 + 4.0) * 0.5 + 0.5;\n      float fade = nfbm(vec2(p.x * 0.3, p.y * 0.5) + t * 0.03) * 0.5 + 0.5;\n      col = softBlend(c1 * fade * u_intensity, c2 * fade * u_intensity, c3 * (1.0 - fade * 0.4) * u_intensity * 0.7);\n\n    } else if (u_effect == 17) {\n      vec2 w = warp(p * 0.8, t * 0.6);\n      vec2 w2 = warp(p * 0.5 + w * 0.4, t * 0.4);\n      float r1 = (snoise((p + w * dist * 0.5) * (1.5 + cpx * 2.0) + t * 0.1) * 0.5 + 0.5) * u_intensity;\n      float r2 = (snoise((p + w2 * dist * 0.4) * (1.2 + cpx * 1.5) + t * 0.08 + 3.0) * 0.5 + 0.5) * u_intensity;\n      float r3 = (snoise((p + (w + w2) * dist * 0.3) * (0.8 + cpx * 1.0) - t * 0.06 + 7.0) * 0.5 + 0.5) * u_intensity;\n      col = softBlend(r1, r2, r3);\n\n    } else if (u_effect == 18) {\n      vec2 w = warp(p * 0.5, t * 0.5);\n      float blobSize = 0.2 + shp * 0.3;\n      float total1 = 0.0, total2 = 0.0;\n      for (int i = 0; i < 5; i++) {\n        float fi = float(i);\n        vec2 c1 = vec2(sin(t * 0.1 + fi * 2.1) * 0.4, cos(t * 0.13 + fi * 1.7) * 0.35) + w * dist * 0.15;\n        vec2 c2 = vec2(cos(t * 0.12 + fi * 1.9) * 0.35, sin(t * 0.09 + fi * 2.3) * 0.4) + w * dist * 0.12;\n        total1 += blobSize * blobSize / (dot(p - c1, p - c1) + 0.02);\n        total2 += blobSize * blobSize / (dot(p - c2, p - c2) + 0.02);\n      }\n      total1 = clamp(total1 * 0.25, 0.0, 1.0);\n      total2 = clamp(total2 * 0.25, 0.0, 1.0);\n      float total3 = nfbm(p + w * dist * 0.3 + t * 0.05) * 0.5 + 0.5;\n      col = softBlend(total1 * u_intensity, total2 * u_intensity, total3 * 0.7 * u_intensity);\n\n    } else if (u_effect == 19) {\n      vec2 w = warp(p * 0.4, t * 0.4);\n      float angle = atan(p.y, p.x);\n      float radius = length(p);\n      float s1 = sin(angle * (1.5 + cpx * 2.0) + radius * (3.0 + cpx * 3.0) + t * 0.3 + w.x * dist * 1.5) * 0.5 + 0.5;\n      float s2 = sin(angle * (1.2 + cpx * 1.5) - radius * (2.5 + cpx * 2.5) - t * 0.25 + w.y * dist * 1.5 + 1.5) * 0.5 + 0.5;\n      float s3 = sin((angle + 3.14) * (0.8 + cpx) + radius * (2.0 + cpx * 2.0) + t * 0.15 + (w.x + w.y) * dist) * 0.5 + 0.5;\n      float fade = exp(-radius * (0.5 - shp * 0.3));\n      col = softBlend(s1 * fade * u_intensity, s2 * fade * u_intensity, s3 * fade * 0.7 * u_intensity);\n\n    } else if (u_effect == 20) {\n      vec2 w = warp(p * 0.5, t * 0.4);\n      vec2 wp = p + w * (0.4 + dist * 0.6);\n      float scale = 0.6 + cpx * 0.8;\n      float h  = nfbm(wp * scale + t * 0.08);\n      float eps = 0.06;\n      float hx = nfbm((wp + vec2(eps, 0.0)) * scale + t * 0.08) - h;\n      float hy = nfbm((wp + vec2(0.0, eps)) * scale + t * 0.08) - h;\n      vec3 n = normalize(vec3(-hx * 6.0, -hy * 6.0, 1.0));\n      vec3 lightDir = normalize(vec3(0.55, 0.65, 0.8));\n      float light = max(dot(n, lightDir), 0.0);\n      float spec = pow(light, 6.0 + shp * 26.0);\n      float diffuse = light * 0.6 + 0.35;\n      float fres = pow(1.0 - max(n.z, 0.0), 2.0);\n      float w1 = (diffuse + spec * 0.5) * u_intensity;\n      float w2 = (h * 0.5 + 0.5 + spec * 0.3 + fres * 0.3) * u_intensity;\n      float w3 = (spec * 1.4 + fres * 0.5) * u_intensity;\n      col = softBlend(w1, w2, w3);\n\n    } else if (u_effect == 21) {\n      vec2 w = warp(p * 0.4, t * 0.3);\n      float angle = 0.2 + shp * 1.3;\n      float ca = cos(angle), sa = sin(angle);\n      vec2 rp = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);\n      float band = sin(rp.y * (3.0 + cpx * 5.0) + w.x * (1.0 + dist * 2.5) + t * 0.35);\n      float ridge = 1.0 - abs(band);\n      ridge = pow(ridge, 5.0 + shp * 10.0);\n      float band2 = sin(rp.y * (2.0 + cpx * 3.0) + w.y * (0.8 + dist * 2.0) - t * 0.22 + 1.4);\n      float ridge2 = 1.0 - abs(band2);\n      ridge2 = pow(ridge2, 3.0 + shp * 8.0);\n      float bg = nfbm(p * 0.45 + t * 0.05) * 0.5 + 0.5;\n      float w1 = (ridge * 1.4 + bg * 0.25) * u_intensity;\n      float w2 = (ridge2 * 1.0 + bg * 0.45) * u_intensity;\n      float w3 = (ridge * 0.5 + ridge2 * 0.5) * u_intensity * 0.8;\n      col = softBlend(w1, w2, w3);\n\n    } else if (u_effect == 22) {\n      vec2 w  = warp(p * 0.7, t * 0.5);\n      vec2 w2 = warp(p * 0.4 + w * 0.3, t * 0.3);\n      vec2 wp = p + w * (0.4 + dist * 0.6);\n      float n1 = snoise(wp * (1.4 + cpx * 1.6) + t * 0.14);\n      float n2 = snoise((wp + w2 * dist * 0.4) * (2.0 + cpx * 2.0) + vec2(3.0, 7.0) - t * 0.1);\n      float ridge1 = 1.0 - abs(n1);\n      ridge1 = pow(ridge1, 5.0 + shp * 12.0);\n      float ridge2 = 1.0 - abs(n2);\n      ridge2 = pow(ridge2, 4.0 + shp * 10.0);\n      float base = (n1 + n2) * 0.25 + 0.5;\n      float w1 = (base * 0.6 + ridge1 * 1.2) * u_intensity;\n      float w2c = ((1.0 - base) * 0.6 + ridge2 * 1.0) * u_intensity;\n      float w3 = (ridge1 * 0.8 + ridge2 * 0.6) * u_intensity;\n      col = softBlend(w1, w2c, w3);\n\n    } else if (u_effect == 23) {\n      float angle = 0.1 + shp * 1.4;\n      float ca = cos(angle), sa = sin(angle);\n      vec2 rp = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);\n      vec2 stretch = vec2(rp.x * (5.0 + cpx * 4.0), rp.y * (0.35 + cpx * 0.3));\n      vec2 sw = warp(stretch * 0.3, t * 0.3) * dist;\n      float n1 = snoise(stretch + sw + t * 0.08);\n      float n2 = snoise(stretch * 1.4 + vec2(2.0, 5.0) + sw - t * 0.06);\n      float streak = 1.0 - abs(n1);\n      streak = pow(streak, 6.0 + shp * 12.0);\n      float streak2 = 1.0 - abs(n2);\n      streak2 = pow(streak2, 4.0 + shp * 8.0);\n      float bg = nfbm(p * 0.4 + t * 0.04) * 0.4 + 0.4;\n      float w1 = (streak * 1.4 + bg * 0.3) * u_intensity;\n      float w2 = (streak2 * 0.9 + bg * 0.5) * u_intensity;\n      float w3 = (streak * 0.7 + streak2 * 0.4) * u_intensity * 0.8;\n      col = softBlend(w1, w2, w3);\n\n    } else if (u_effect == 24) {\n      vec2 w1 = warp(p * 0.55, t * 0.4);\n      vec2 w2 = warp(p * 0.7 + w1 * 0.4, t * 0.3);\n      vec2 wp = p + (w1 + w2) * (0.4 + dist * 0.7);\n\n      float scale = 0.65 + cpx * 0.7;\n      float n1 = nfbm(wp * scale + vec2(0.0, 0.0) + t * 0.10);\n      float n2 = nfbm(wp * scale + vec2(3.7, 5.2) - t * 0.07);\n      float n3 = nfbm(wp * scale + vec2(7.1, 2.3) + t * 0.06);\n      float n4 = nfbm(wp * scale + vec2(1.8, 8.4) - t * 0.08);\n      float n5 = nfbm(wp * scale + vec2(4.9, 1.1) + t * 0.05);\n      float n6 = nfbm(wp * scale + vec2(6.3, 7.8) - t * 0.09);\n      float n7 = nfbm(wp * scale + vec2(2.4, 4.6) + t * 0.04);\n\n      float pw = 2.5 + shp * 5.0;\n      n1 = pow(clamp(n1, 0.0, 1.0), pw);\n      n2 = pow(clamp(n2, 0.0, 1.0), pw);\n      n3 = pow(clamp(n3, 0.0, 1.0), pw);\n      n4 = pow(clamp(n4, 0.0, 1.0), pw);\n      n5 = pow(clamp(n5, 0.0, 1.0), pw);\n      n6 = pow(clamp(n6, 0.0, 1.0), pw);\n      n7 = pow(clamp(n7, 0.0, 1.0), pw);\n\n      float intens = 0.5 + u_intensity * 0.9;\n      float a1 = n1 * u_alpha1 * intens;\n      float a2 = n2 * u_alpha2 * intens;\n      float a3 = n3 * u_alpha3 * intens;\n      float a4 = n4 * u_alpha4 * intens;\n      float a5 = n5 * u_alpha5 * intens;\n      float a6 = n6 * u_alpha6 * intens;\n      float a7 = n7 * u_alpha7 * intens;\n      float total = a1 + a2 + a3 + a4 + a5 + a6 + a7 + 0.001;\n      col = (u_color1 * a1 + u_color2 * a2 + u_color3 * a3 + u_color4 * a4\n           + u_color5 * a5 + u_color6 * a6 + u_color7 * a7) / total;\n\n    } else if (u_effect == 25) {\n      float d = (uv.x + (1.0 - uv.y)) * 0.5;\n      float w = 0.9 / max(u_scale, 0.25);\n      float cyc = t * 0.08;\n      float pA = mix(-w, 1.0 + w, sweepEase(fract(cyc)));\n      float pB = mix(-w, 1.0 + w, sweepEase(fract(cyc + 0.5)));\n      float band = max(\n        clamp(1.0 - abs(d - pA) / w, 0.0, 1.0),\n        clamp(1.0 - abs(d - pB) / w, 0.0, 1.0)\n      );\n      float v = band * u_intensity;\n\n      vec2 ggs = gridCounts(6.0 + u_cellSize * 74.0);\n      if (u_dotMode > 1.5) {\n        ggs = max(vec2(2.0), floor(ggs * (1.0 - u_gap * 0.8)));\n      }\n      vec2 cell = floor(uv * ggs);\n      float clk = t * 1.6;\n      // Wrap the stepped clock to keep sin() arguments small. u_time grows\n      // unbounded over a session; on mediump-float GPUs (older Android, some\n      // iOS) large hash inputs lose precision and the flicker bands/freezes.\n      // mod(x, 1024) keeps the crossfade continuous across the wrap\n      // (step 1023 fades into step 0, whose hash is the next s0).\n      float step0 = mod(floor(clk), 1024.0);\n      float step1 = mod(step0 + 1.0, 1024.0);\n      float fz = smoothstep(0.0, 1.0, fract(clk));\n      float cellSeed = dot(cell, vec2(127.1, 311.7));\n      float r1 = fract(sin(cellSeed + step0 * 17.23) * 43758.5453);\n      float r2 = fract(sin(cellSeed + step1 * 17.23) * 43758.5453);\n      float rnd = mix(r1, r2, fz);\n      v += (rnd - 0.5) * u_flicker * 0.9 * (0.15 + band * 0.85);\n\n      col = palette(clamp(v, 0.0, 1.0));\n    }\n\n    return col;\n  }\n\n  void main() {\n    vec2 uv = gl_FragCoord.xy / u_resolution;\n    float aspect = u_resolution.x / u_resolution.y;\n    float t = u_time * u_speed;\n    float dist = u_distortion;\n    float soft = u_softness;\n    float cpx = u_complexity;\n    float shp = u_shape;\n\n    vec2 sampleUV = uv;\n    if (u_dotMode > 0.5) {\n      vec2 gs = gridCounts(6.0 + u_cellSize * 74.0);\n      if (u_dotMode > 1.5) {\n        gs = max(vec2(2.0), floor(gs * (1.0 - u_gap * 0.8)));\n      }\n      sampleUV = (floor(uv * gs) + vec2(0.5)) / gs;\n    }\n\n    vec3 col;\n    if (u_blur < 0.01) {\n      col = computeEffect(sampleUV, aspect, t, dist, soft, cpx, shp);\n    } else {\n      float r = u_blur * 0.02;\n      col  = computeEffect(sampleUV, aspect, t, dist, soft, cpx, shp) * 0.4;\n      col += computeEffect(sampleUV + vec2( r,  0.0), aspect, t, dist, soft, cpx, shp) * 0.15;\n      col += computeEffect(sampleUV + vec2(-r,  0.0), aspect, t, dist, soft, cpx, shp) * 0.15;\n      col += computeEffect(sampleUV + vec2( 0.0,  r), aspect, t, dist, soft, cpx, shp) * 0.15;\n      col += computeEffect(sampleUV + vec2( 0.0, -r), aspect, t, dist, soft, cpx, shp) * 0.15;\n    }\n\n    vec3 baseCol = col;\n    if (u_dotMode < 0.5) {\n      col = pow(col, vec3(1.3));\n    }\n\n    // CSS-pixel distance to the nearest edge — keeps the vignette / edge-fade\n    // bands a consistent physical width on every side of any aspect ratio.\n    vec2 cssRes = u_resolution / max(u_dpr, 0.0001);\n    vec2 cssCoord = uv * cssRes;\n    float edgeDistPx = min(\n      min(cssCoord.x, cssRes.x - cssCoord.x),\n      min(cssCoord.y, cssRes.y - cssCoord.y)\n    );\n    float vigRangePx = 40.0 * (1.0 + u_vignette * 3.0);\n    float vig = (edgeDistPx * edgeDistPx) / (vigRangePx * vigRangePx);\n    vig = smoothstep(0.0, 1.0, vig);\n    col *= mix(1.0, vig, u_vignette * u_vigOpacity);\n\n    float colorAlpha = (u_alpha1 + u_alpha2 + u_alpha3 + u_alpha4 + u_alpha5) / 5.0;\n    if (colorAlpha < 0.999) {\n      vec3 c1d = col - u_color1, c2d = col - u_color2, c3d = col - u_color3, c4d = col - u_color4, c5d = col - u_color5;\n      float prox1 = exp(-8.0 * dot(c1d, c1d));\n      float prox2 = exp(-8.0 * dot(c2d, c2d));\n      float prox3 = exp(-8.0 * dot(c3d, c3d));\n      float prox4 = exp(-8.0 * dot(c4d, c4d));\n      float prox5 = exp(-8.0 * dot(c5d, c5d));\n      float pTotal = prox1 + prox2 + prox3 + prox4 + prox5 + 0.0001;\n      colorAlpha = (prox1*u_alpha1 + prox2*u_alpha2 + prox3*u_alpha3 + prox4*u_alpha4 + prox5*u_alpha5) / pTotal;\n    }\n    float alpha = colorAlpha;\n\n    if (u_dotMode > 0.5) {\n      vec2 gridSize = gridCounts(6.0 + u_cellSize * 74.0);\n      if (u_dotMode > 1.5) {\n        gridSize = max(vec2(2.0), floor(gridSize * (1.0 - u_gap * 0.8)));\n      }\n      // cellLocal is in [0,1] within each cell. Because gridSize was chosen so\n      // that cell PIXEL size is square, distance / mask math here works in\n      // screen-square units even though we're operating in normalised cell uv.\n      vec2 cellLocal = fract(uv * gridSize);\n\n      float hlFactor = 0.0;\n      if (u_highlight > 0.01 || u_hlScale > 0.01) {\n        vec2 cellCenter = (floor(uv * gridSize) + vec2(0.5)) / gridSize;\n        vec2 cp2 = (cellCenter - 0.5) * u_scale;\n        cp2.x *= aspect;\n        float lw = sin(cp2.x * 3.0 + t * 1.5) * 0.5 + 0.5;\n        lw *= sin(cp2.y * 2.5 - t * 1.1) * 0.5 + 0.5;\n        lw += (snoise(cp2 * 2.0 + t * 0.6) * 0.5 + 0.5) * 0.3;\n        hlFactor = clamp(lw, 0.0, 1.0);\n        hlFactor *= hlFactor;\n      }\n\n      float scaleBoost = 1.0 + smoothstep(0.2, 0.8, hlFactor) * u_hlScale * 1.2;\n\n      float mask = 1.0;\n      if (u_dotMode < 1.5) {\n        float gapW = u_gap * 0.35 / scaleBoost;\n        if (gapW > 0.003) {\n          mask = step(gapW, cellLocal.x) * step(gapW, 1.0 - cellLocal.x)\n               * step(gapW, cellLocal.y) * step(gapW, 1.0 - cellLocal.y);\n        }\n      } else {\n        // Render the circular dot mask in screen-pixel space rather than\n        // cell-local UV. We map the cell-local offset to actual pixels\n        // (cellPx = u_resolution / gridSize), then apply a 1-pixel AA\n        // floor to the smoothstep edge so the dot rim is crisp and\n        // properly anti-aliased even at u_dotSoftness near 0. The user\n        // softness slider still scales linearly on top of the floor.\n        // No fwidth() / GL_OES_standard_derivatives needed - dPx is\n        // already in pixel units, so a fixed 1-px edge IS pixel-perfect.\n        // gridCounts() already keeps cells square in screen space, so\n        // pxOffset traces true circles (not ellipses) on any aspect.\n        vec2 cellPx = u_resolution / gridSize;\n        vec2 pxOffset = (cellLocal - 0.5) * cellPx;\n        float dPx = length(pxOffset);\n        float minCellPx = min(cellPx.x, cellPx.y);\n        float radiusPx = u_dotSize * 0.5 * minCellPx * scaleBoost;\n        // 0.5-px AA floor (1-px total smoothstep ramp) keeps the rim\n        // pixel-perfect at u_dotSoftness=0 while letting the user softness\n        // value dominate at the bundled preset defaults (e.g. softness=0.1\n        // on a ~28-px cell yields softPx=0.56 -> ~1.1-px ramp, matching\n        // the original cell-local behaviour). A larger floor (e.g. 1.0)\n        // would widen low-softness dots and visually lighten dot presets.\n        float aaPx = 0.5;\n        float softPx = u_dotSoftness * 0.2 * minCellPx;\n        float edgePx = max(aaPx, softPx);\n        mask = 1.0 - smoothstep(radiusPx - edgePx, radiusPx + edgePx, dPx);\n      }\n\n      if (u_highlight > 0.01) {\n        float hl = hlFactor * u_highlight;\n        col = col * (1.0 + hl * 2.5) + vec3(hl * hl * 0.3);\n      }\n\n      if (u_edgeFade > 0.5 && u_fadeStr > 0.005) {\n        float ef = smoothstep(0.0, u_edgeFade, edgeDistPx);\n        mask *= mix(1.0, ef, u_fadeStr);\n      }\n\n      float baseOpacity = (u_dotMode < 1.5) ? u_fillOpacity : 0.0;\n      alpha = colorAlpha * mix(baseOpacity, u_dotOpacity, mask);\n\n      // Ensure high-contrast dot visibility in both light and dark themes\n      alpha = clamp(alpha * 1.35, 0.15, 1.0);\n    }\n\n    gl_FragColor = vec4(col, alpha * u_shaderOpacity);\n  }\n"
        ].join('\n');

        function calculateCoverCrop(img, targetW, targetH) {
            const aspect = targetW / Math.max(1, targetH);
            const naturalW = img.naturalWidth || img.videoWidth || img.width || 1;
            const naturalH = img.naturalHeight || img.videoHeight || img.height || 1;
            const imgAspect = naturalW / Math.max(1, naturalH);
            let sx = 0, sy = 0;
            let sw = naturalW;
            let sh = naturalH;
            if (imgAspect > aspect) {
                sw = sh * aspect;
                sx = (naturalW - sw) / 2;
            } else {
                sh = sw / aspect;
                sy = (naturalH - sh) / 2;
            }
            return { sx, sy, sw, sh };
        }

        function create(container, opts = {}) {
            if (!container) return null;

            container.style.position = 'relative';
            container.style.overflow = 'hidden';

            let currentPresetName = opts.preset || 'pixels-organic';
            let currentStrength = opts.strength != null ? opts.strength : 1;
            let currentSpeed = opts.speed != null ? opts.speed : 1;
            let currentPixelScale = opts.pixelScale != null ? opts.pixelScale : 1;
            let isPaused = Boolean(opts.paused);
            let activeTheme = opts.theme || 'auto';

            function getResolvedTheme() {
                if (activeTheme === 'dark' || activeTheme === 'light') return activeTheme;
                const docTheme = document.documentElement.getAttribute('data-theme') || (document.body && document.body.classList.contains('dark-mode') ? 'dark' : null);
                if (docTheme === 'dark' || docTheme === 'light') return docTheme;
                return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            function getPresetConfig() {
                const p = PRESETS[currentPresetName] || PRESETS['pixels-organic'];
                const th = getResolvedTheme();
                return p.modes[th] || p.modes.dark;
            }

            // Create canvas elements
            let shaderCanvas = document.createElement('canvas');
            shaderCanvas.className = 'img-fx-shader-canvas';
            shaderCanvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 1; border-radius: inherit; pointer-events: none; transition: opacity 0.3s ease;';

            const overlayCanvas = document.createElement('canvas');
            overlayCanvas.className = 'img-fx-overlay-canvas';
            overlayCanvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 2; border-radius: inherit; pointer-events: none; opacity: 1;';

            container.appendChild(shaderCanvas);
            container.appendChild(overlayCanvas);

            const overlayCtx = overlayCanvas.getContext('2d');
            
            const glOpts = {
                alpha: true,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                antialias: false,
                powerPreference: 'high-performance'
            };
            const gl = shaderCanvas.getContext('webgl2', glOpts) || shaderCanvas.getContext('webgl', glOpts) || shaderCanvas.getContext('experimental-webgl');

            let useFallback2D = false;
            let program = null;
            let vs = null;
            let fs = null;
            let quadBuf = null;
            const uniforms = {};

            if (gl) {
                function compileShader(type, src) {
                    const s = gl.createShader(type);
                    gl.shaderSource(s, src);
                    gl.compileShader(s);
                    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                        console.warn('ImageGeneration shader compile warning:', gl.getShaderInfoLog(s));
                        gl.deleteShader(s);
                        return null;
                    }
                    return s;
                }

                vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
                fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

                if (vs && fs) {
                    program = gl.createProgram();
                    gl.attachShader(program, vs);
                    gl.attachShader(program, fs);
                    gl.linkProgram(program);

                    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
                        gl.useProgram(program);

                        quadBuf = gl.createBuffer();
                        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                            -1, -1,
                             1, -1,
                            -1,  1,
                            -1,  1,
                             1, -1,
                             1,  1
                        ]), gl.STATIC_DRAW);

                        const posLoc = gl.getAttribLocation(program, 'position');
                        gl.enableVertexAttribArray(posLoc);
                        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

                        const uniformNames = [
                            'u_resolution', 'u_dpr', 'u_time', 'u_cardBg',
                            'u_color1', 'u_color2', 'u_color3', 'u_color4', 'u_color5', 'u_color6', 'u_color7',
                            'u_alpha1', 'u_alpha2', 'u_alpha3', 'u_alpha4', 'u_alpha5', 'u_alpha6', 'u_alpha7',
                            'u_speed', 'u_intensity', 'u_scale', 'u_direction',
                            'u_softness', 'u_distortion', 'u_complexity', 'u_shape', 'u_flicker',
                            'u_vignette', 'u_vigOpacity', 'u_blur', 'u_highlight', 'u_shaderOpacity',
                            'u_cellSize', 'u_gap', 'u_dotSize', 'u_dotSoftness', 'u_dotOpacity',
                            'u_hlScale', 'u_fillOpacity', 'u_edgeFade', 'u_fadeStr', 'u_dotMode',
                            'u_effect', 'u_sweepEase'
                        ];

                        for (const name of uniformNames) {
                            uniforms[name] = gl.getUniformLocation(program, name);
                        }
                    } else {
                        console.warn('WebGL link error, using animated 2D Canvas fallback:', gl.getProgramInfoLog(program));
                        useFallback2D = true;
                    }
                } else {
                    useFallback2D = true;
                }
            } else {
                useFallback2D = true;
            }

            let fallback2dCtx = null;
            if (useFallback2D) {
                try {
                    fallback2dCtx = shaderCanvas.getContext('2d');
                } catch (e) {}
                if (!fallback2dCtx) {
                    const freshCanvas = document.createElement('canvas');
                    freshCanvas.className = shaderCanvas.className;
                    freshCanvas.style.cssText = shaderCanvas.style.cssText;
                    if (shaderCanvas.parentNode) {
                        shaderCanvas.parentNode.replaceChild(freshCanvas, shaderCanvas);
                    }
                    shaderCanvas = freshCanvas;
                    fallback2dCtx = shaderCanvas.getContext('2d');
                }
            }

            const revealState = {
                active: false,
                phase: 'idle',
                image: null,
                startMs: 0,
                duration: 2.4,
                easing: 'easeOutCubic',
                pixDuration: 2.1,
                pixEasing: 'easeOutCubic',
                onComplete: null,
                dropPattern: null,
                dropPatternW: 0,
                dropPatternH: 0,
                cachedCoverCanvas: null
            };

            let isRunning = true;
            let animId = null;
            let accumulatedTime = Math.random() * 500;
            let lastTimestamp = performance.now();

            function syncSize() {
                const rect = container.getBoundingClientRect();
                const w = Math.max(280, Math.round(rect.width || 280));
                const h = Math.max(280, Math.round(rect.height || 280));
                const dpr = Math.min(window.devicePixelRatio || 1, 2);

                if (shaderCanvas.width !== Math.floor(w * dpr) || shaderCanvas.height !== Math.floor(h * dpr)) {
                    shaderCanvas.width = Math.floor(w * dpr);
                    shaderCanvas.height = Math.floor(h * dpr);
                    if (gl && !useFallback2D) {
                        gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);
                    }
                }

                if (overlayCanvas.width !== Math.floor(w * dpr) || overlayCanvas.height !== Math.floor(h * dpr)) {
                    overlayCanvas.width = Math.floor(w * dpr);
                    overlayCanvas.height = Math.floor(h * dpr);
                }

                return { w, h, dpr };
            }

            function getCoverCanvas(img, w, h) {
                if (!revealState.cachedCoverCanvas || revealState.cachedCoverCanvas.w !== w || revealState.cachedCoverCanvas.h !== h || revealState.cachedCoverCanvas.img !== img) {
                    const c = document.createElement('canvas');
                    c.width = w;
                    c.height = h;
                    const ctx = c.getContext('2d');
                    const crop = calculateCoverCrop(img, w, h);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    try {
                        ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
                    } catch (e) {
                        ctx.drawImage(img, 0, 0, w, h);
                    }
                    revealState.cachedCoverCanvas = { canvas: c, img, w, h };
                }
                return revealState.cachedCoverCanvas.canvas;
            }

            function renderShader(now, dt) {
                const { w, h, dpr } = syncSize();
                const preset = getPresetConfig();

                if (!isPaused) {
                    accumulatedTime += dt * (currentSpeed || 1);
                }

                if (useFallback2D && fallback2dCtx) {
                    renderFallback2D(w * dpr, h * dpr, preset, accumulatedTime);
                    return;
                }

                if (!gl || !program) return;

                gl.useProgram(program);

                if (uniforms.u_resolution) gl.uniform2f(uniforms.u_resolution, shaderCanvas.width, shaderCanvas.height);
                if (uniforms.u_dpr) gl.uniform1f(uniforms.u_dpr, dpr);
                if (uniforms.u_time) gl.uniform1f(uniforms.u_time, accumulatedTime);

                if (uniforms.u_effect) gl.uniform1i(uniforms.u_effect, preset.effectIndex || 22);
                if (uniforms.u_sweepEase) gl.uniform1i(uniforms.u_sweepEase, preset.sweepEase != null ? preset.sweepEase : 1);

                const strengthBoost = 1 + Math.max(0, currentStrength - 1) * 2.2;
                if (uniforms.u_speed) gl.uniform1f(uniforms.u_speed, preset.speed || 1);
                if (uniforms.u_intensity) gl.uniform1f(uniforms.u_intensity, (preset.intensity || 1) * currentStrength);
                if (uniforms.u_scale) gl.uniform1f(uniforms.u_scale, preset.scale || 1);
                if (uniforms.u_direction) gl.uniform1f(uniforms.u_direction, (preset.direction || 0) * Math.PI / 180);

                if (uniforms.u_softness) gl.uniform1f(uniforms.u_softness, preset.softness != null ? preset.softness : 0.76);
                if (uniforms.u_distortion) gl.uniform1f(uniforms.u_distortion, preset.distortion != null ? preset.distortion : 0.3);
                if (uniforms.u_complexity) gl.uniform1f(uniforms.u_complexity, preset.complexity != null ? preset.complexity : 0.2);
                if (uniforms.u_shape) gl.uniform1f(uniforms.u_shape, preset.shape != null ? preset.shape : 0.52);
                if (uniforms.u_flicker) gl.uniform1f(uniforms.u_flicker, preset.flicker != null ? preset.flicker : 0.5);

                if (uniforms.u_vignette) gl.uniform1f(uniforms.u_vignette, preset.vignette != null ? preset.vignette : 0.26);
                if (uniforms.u_vigOpacity) gl.uniform1f(uniforms.u_vigOpacity, preset.vigOpacity != null ? preset.vigOpacity : 1);
                if (uniforms.u_blur) gl.uniform1f(uniforms.u_blur, preset.blur != null ? preset.blur : 1);
                if (uniforms.u_highlight) gl.uniform1f(uniforms.u_highlight, (preset.highlight || 0.45) * strengthBoost);
                if (uniforms.u_shaderOpacity) gl.uniform1f(uniforms.u_shaderOpacity, preset.shaderOpacity != null ? preset.shaderOpacity : 1);

                const dotMode = preset.dotMode != null ? preset.dotMode : 1;
                const dotCfg = dotMode === 1 ? preset.pixelConfig : preset.dotConfig;
                if (uniforms.u_dotMode) gl.uniform1f(uniforms.u_dotMode, dotMode);

                const baseCellSize = dotCfg.cellSize != null ? dotCfg.cellSize : 0.22;
                const finalCellSize = currentPixelScale === 1 ? baseCellSize : (((6 + baseCellSize * 74) / currentPixelScale) - 6) / 74;
                if (uniforms.u_cellSize) gl.uniform1f(uniforms.u_cellSize, Math.max(0.01, finalCellSize));
                if (uniforms.u_gap) gl.uniform1f(uniforms.u_gap, dotCfg.gap != null ? dotCfg.gap : 0.14);
                if (uniforms.u_dotSize) gl.uniform1f(uniforms.u_dotSize, dotCfg.dotSize != null ? dotCfg.dotSize : 0.85);
                if (uniforms.u_dotSoftness) gl.uniform1f(uniforms.u_dotSoftness, dotCfg.dotSoftness != null ? dotCfg.dotSoftness : 0.1);
                if (uniforms.u_dotOpacity) gl.uniform1f(uniforms.u_dotOpacity, dotCfg.dotOpacity != null ? dotCfg.dotOpacity : 0.85);
                if (uniforms.u_hlScale) gl.uniform1f(uniforms.u_hlScale, dotCfg.hlScale != null ? dotCfg.hlScale : 0.8);
                if (uniforms.u_fillOpacity) gl.uniform1f(uniforms.u_fillOpacity, dotCfg.fillOpacity != null ? dotCfg.fillOpacity : 0.44);
                if (uniforms.u_edgeFade) gl.uniform1f(uniforms.u_edgeFade, dotCfg.edgeFade != null ? dotCfg.edgeFade : 24);
                if (uniforms.u_fadeStr) gl.uniform1f(uniforms.u_fadeStr, dotCfg.fadeStr != null ? dotCfg.fadeStr : 1);

                const cardBgRgb = parseHex(opts.cardBg || preset.cardBg || '#08090D');
                if (uniforms.u_cardBg) gl.uniform3fv(uniforms.u_cardBg, cardBgRgb);

                const colors = preset.colors || [];
                const alphas = preset.alphas || [];
                for (let i = 0; i < 7; i++) {
                    const cLoc = uniforms['u_color' + (i + 1)];
                    const aLoc = uniforms['u_alpha' + (i + 1)];
                    if (cLoc) gl.uniform3fv(cLoc, parseHex(colors[i] || '#222222'));
                    if (aLoc) gl.uniform1f(aLoc, alphas[i] != null ? alphas[i] : 1);
                }

                if (quadBuf) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
                    const posLoc = gl.getAttribLocation(program, 'position');
                    if (posLoc !== -1) {
                        gl.enableVertexAttribArray(posLoc);
                        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                    }
                }

                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }

            function renderFallback2D(w, h, preset, t) {
                const ctx = fallback2dCtx;
                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = preset.cardBg || '#08090D';
                ctx.fillRect(0, 0, w, h);

                const colors = preset.colors || ['#00F0FF', '#8B5CF6', '#38BDF8'];
                const cols = 28;
                const rows = 28;
                const cellW = w / cols;
                const cellH = h / rows;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const nx = c / cols;
                        const ny = r / rows;
                        const wave = Math.sin(nx * 4 + t * 0.8) * Math.cos(ny * 4 + t * 0.6) + Math.sin((nx + ny) * 3 + t);
                        const norm = (wave + 2) / 4;
                        const colIdx = Math.floor(norm * (colors.length - 1));
                        ctx.fillStyle = colors[colIdx] || colors[0];
                        ctx.globalAlpha = 0.4 + norm * 0.55;
                        const sz = (cellW * 0.72) * (0.6 + norm * 0.4);
                        const cx = c * cellW + (cellW - sz) / 2;
                        const cy = r * cellH + (cellH - sz) / 2;
                        ctx.fillRect(cx, cy, sz, sz);
                    }
                }
                ctx.globalAlpha = 1;
            }

            function renderReveal(now) {
                if (!revealState.active || !revealState.image) {
                    overlayCanvas.style.filter = 'none';
                    return;
                }

                const width = overlayCanvas.width;
                const height = overlayCanvas.height;

                if (revealState.phase === 'reveal') {
                    const elapsed = (now - revealState.startMs) / 1000;
                    const totalDur = revealState.duration || 2.4;
                    const rawProgress = Math.min(1, elapsed / totalDur);
                    const progress = ease(revealState.easing || 'easeOutCubic', rawProgress);

                    shaderCanvas.style.opacity = String(Math.max(0, 1 - progress * 1.15));

                    const coverCanvas = getCoverCanvas(revealState.image, width, height);

                    const cols = 32;
                    const rows = 32;
                    const cellW = width / cols;
                    const cellH = height / rows;

                    if (!revealState.dropPattern || revealState.dropPatternW !== cols || revealState.dropPatternH !== rows) {
                        const pattern = new Float32Array(cols * rows);
                        for (let y = 0; y < rows; y++) {
                            for (let x = 0; x < cols; x++) {
                                const distFromCenter = Math.hypot((x / cols) - 0.5, (y / rows) - 0.5) * 1.4;
                                const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                                const pseudoRand = noise - Math.floor(noise);
                                pattern[y * cols + x] = Math.min(1, Math.max(0, distFromCenter * 0.35 + pseudoRand * 0.65));
                            }
                        }
                        revealState.dropPattern = pattern;
                        revealState.dropPatternW = cols;
                        revealState.dropPatternH = rows;
                    }

                    overlayCtx.clearRect(0, 0, width, height);
                    const dropThreshold = ease(revealState.pixEasing || 'easeOutCubic', Math.min(1, elapsed / (revealState.pixDuration || 2.1)));

                    for (let gy = 0; gy < rows; gy++) {
                        for (let gx = 0; gx < cols; gx++) {
                            const pVal = revealState.dropPattern[gy * cols + gx];
                            if (pVal <= dropThreshold) {
                                const dx = Math.floor(gx * cellW);
                                const dy = Math.floor(gy * cellH);
                                const dw = Math.ceil(cellW) + 1;
                                const dh = Math.ceil(cellH) + 1;
                                overlayCtx.drawImage(coverCanvas, dx, dy, dw, dh, dx, dy, dw, dh);
                            }
                        }
                    }

                    if (rawProgress >= 1) {
                        revealState.phase = 'hold';
                        shaderCanvas.style.opacity = '0';
                        overlayCtx.globalAlpha = 1;
                        overlayCtx.clearRect(0, 0, width, height);
                        overlayCtx.drawImage(coverCanvas, 0, 0);
                        if (typeof revealState.onComplete === 'function') {
                            revealState.onComplete();
                        }
                    }
                } else if (revealState.phase === 'hold') {
                    shaderCanvas.style.opacity = '0';
                }
            }

            function loop(now) {
                if (!isRunning) return;
                const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
                lastTimestamp = now;

                try {
                    renderShader(now, dt);
                    renderReveal(now);
                } catch (e) {
                    console.error('ImageGeneration render error:', e);
                }

                animId = requestAnimationFrame(loop);
            }

            animId = requestAnimationFrame(loop);

            return {
                container,
                shaderCanvas,
                overlayCanvas,

                setPreset(name) {
                    if (PRESETS[name]) {
                        currentPresetName = name;
                    }
                },

                setTheme(theme) {
                    activeTheme = theme;
                },

                setStrength(val) {
                    currentStrength = Math.max(0, Math.min(2, val));
                },

                setSpeed(val) {
                    currentSpeed = Math.max(0.1, val);
                },

                setPixelScale(val) {
                    currentPixelScale = Math.max(0.1, val);
                },

                revealImage(imgOrSrc, onComplete) {
                    shaderCanvas.style.opacity = '1';
                    if (typeof imgOrSrc === 'string') {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            this._triggerReveal(img, onComplete);
                        };
                        img.onerror = () => {
                            const retryImg = new Image();
                            retryImg.onload = () => {
                                this._triggerReveal(retryImg, onComplete);
                            };
                            retryImg.onerror = () => {
                                console.warn('ImageGeneration: failed to load image for reveal:', imgOrSrc);
                                if (onComplete) onComplete();
                            };
                            retryImg.src = imgOrSrc;
                        };
                        img.src = imgOrSrc;
                    } else if (imgOrSrc instanceof HTMLImageElement) {
                        this._triggerReveal(imgOrSrc, onComplete);
                    }
                },

                _triggerReveal(img, onComplete) {
                    revealState.active = true;
                    revealState.phase = 'reveal';
                    revealState.image = img;
                    revealState.startMs = performance.now();
                    revealState.onComplete = onComplete;
                    revealState.dropPattern = null;
                    revealState.cachedCoverCanvas = null;

                    const preset = getPresetConfig();
                    const rev = preset.revealConfig || {};
                    revealState.duration = rev.duration || 2.4;
                    revealState.easing = rev.easing || 'easeOutCubic';
                    revealState.pixDuration = rev.pixDuration || 2.1;
                    revealState.pixEasing = rev.pixEasing || 'easeOutCubic';
                },

                regenerate(onComplete) {
                    if (revealState.image) {
                        this._triggerReveal(revealState.image, onComplete);
                    }
                },

                hideImage() {
                    revealState.active = false;
                    revealState.phase = 'idle';
                    revealState.image = null;
                    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                    shaderCanvas.style.opacity = '1';
                },

                destroy() {
                    isRunning = false;
                    if (animId) cancelAnimationFrame(animId);
                    if (shaderCanvas.parentNode) shaderCanvas.parentNode.removeChild(shaderCanvas);
                    if (overlayCanvas.parentNode) overlayCanvas.parentNode.removeChild(overlayCanvas);
                    if (gl && program) {
                        gl.deleteProgram(program);
                        if (vs) gl.deleteShader(vs);
                        if (fs) gl.deleteShader(fs);
                        if (quadBuf) gl.deleteBuffer(quadBuf);
                    }
                }
            };
        }

        return {
            PRESETS,
            create,
            attach(canvas) {
                if (!canvas || !canvas.parentElement) return null;
                return create(canvas.parentElement);
            }
        };
    })();

    // Export to window
    window.LibrariesDevFX = {
        BorderBeam: BorderBeamFX,
        ThinkingOrb: ThinkingOrbFX,
        LiquidGooey: LiquidGooeyFX,
        VoiceGlow: VoiceGlowFX,
        ImageGeneration: ImageGenerationFX,
        ImgFX: ImageGenerationFX
    };

})(window, document);
