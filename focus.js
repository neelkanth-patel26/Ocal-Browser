/* ══════════════════════════════════════════════════════════════════════
   OCAL FOCUS FLOW SANCTUARY — JAVASCRIPT CONTROLLER
   Offline-first • Web Audio Synthesis • Precision Timers • Flow Physics
   ══════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── 1. Web Audio Chimes & Synthesis ──────────────────────────────
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Gentle singing bowl / bell chime for session transitions
    function playChime(freq = 528, duration = 2.5) {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            // Harmonic overtone
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

            gain2.gain.setValueAtTime(0, ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (duration * 0.7));

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc.start();
            osc2.start();
            osc.stop(ctx.currentTime + duration);
            osc2.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio chime note could not play:', e);
        }
    }

    // ── 2. Deep Work Countdown Engine ────────────────────────────────
    const timerDigits = document.getElementById('timer-digits');
    const timerProgress = document.getElementById('timer-progress');
    const timerPhaseBadge = document.getElementById('timer-phase-badge');
    const timerStreakSub = document.getElementById('timer-streak-sub');
    const timerPlayBtn = document.getElementById('timer-play-btn');
    const timerResetBtn = document.getElementById('timer-reset-btn');
    const timerSkipBtn = document.getElementById('timer-skip-btn');
    const customSlider = document.getElementById('custom-slider');
    const customSliderVal = document.getElementById('custom-slider-val');

    let currentDurationSeconds = 25 * 60;
    let totalSessionSeconds = 25 * 60;
    let remainingSeconds = 25 * 60;
    let timerInterval = null;
    let isRunning = false;
    let currentMode = 'pomodoro'; // 'pomodoro', 'deep', 'ultradian', 'burst', 'custom'
    let currentPhase = 'focus'; // 'focus', 'shortBreak', 'longBreak'
    let completedPomodoros = parseInt(localStorage.getItem('ocal-focus-completed-sessions') || '0', 10);

    const circumference = 2 * Math.PI * 135; // r=135 => ~848px
    if (timerProgress) {
        timerProgress.style.strokeDasharray = `${circumference}`;
        timerProgress.style.strokeDashoffset = '0';
    }

    function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        if (timerDigits) timerDigits.textContent = formatTime(remainingSeconds);
        if (timerProgress) {
            const fraction = (totalSessionSeconds - remainingSeconds) / totalSessionSeconds;
            const offset = circumference * fraction;
            timerProgress.style.strokeDashoffset = `${offset}`;
        }
    }

    function updateStreakDisplay() {
        if (timerStreakSub) {
            timerStreakSub.textContent = `${completedPomodoros} session${completedPomodoros === 1 ? '' : 's'} completed today`;
        }
    }

    function setPhase(phase) {
        currentPhase = phase;
        if (phase === 'focus') {
            if (timerPhaseBadge) timerPhaseBadge.textContent = 'Focus Session';
            if (timerProgress) timerProgress.style.stroke = 'var(--accent)';
        } else if (phase === 'shortBreak') {
            if (timerPhaseBadge) timerPhaseBadge.textContent = 'Rest & Hydrate (5m)';
            if (timerProgress) timerProgress.style.stroke = 'var(--blue)';
        } else if (phase === 'longBreak') {
            if (timerPhaseBadge) timerPhaseBadge.textContent = 'Deep Rest (15m)';
            if (timerProgress) timerProgress.style.stroke = 'var(--purple)';
        }
    }

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        if (timerPlayBtn) {
            timerPlayBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            timerPlayBtn.classList.remove('paused');
        }
        timerInterval = setInterval(() => {
            if (remainingSeconds > 0) {
                remainingSeconds--;
                updateTimerDisplay();
            } else {
                handleTimerComplete();
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(timerInterval);
        timerInterval = null;
        if (timerPlayBtn) {
            timerPlayBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            timerPlayBtn.classList.add('paused');
        }
    }

    function resetTimer() {
        pauseTimer();
        remainingSeconds = totalSessionSeconds;
        updateTimerDisplay();
        if (timerPlayBtn) {
            timerPlayBtn.innerHTML = '<i class="fas fa-play"></i> Start Flow';
            timerPlayBtn.classList.remove('paused');
        }
    }

    function handleTimerComplete() {
        pauseTimer();
        playChime(528, 3.5);

        if (currentPhase === 'focus') {
            completedPomodoros++;
            localStorage.setItem('ocal-focus-completed-sessions', completedPomodoros);
            updateStreakDisplay();

            if (completedPomodoros % 4 === 0) {
                totalSessionSeconds = 15 * 60;
                setPhase('longBreak');
            } else {
                totalSessionSeconds = 5 * 60;
                setPhase('shortBreak');
            }
        } else {
            // Rest finished, return to focus
            setMode(currentMode);
        }
        remainingSeconds = totalSessionSeconds;
        updateTimerDisplay();
        startTimer();
    }

    function setMode(mode) {
        currentMode = mode;
        let mins = 25;
        if (mode === 'pomodoro') mins = 25;
        else if (mode === 'deep') mins = 50;
        else if (mode === 'ultradian') mins = 90;
        else if (mode === 'burst') mins = 15;
        else if (mode === 'custom') mins = customSlider ? parseInt(customSlider.value, 10) : 30;

        totalSessionSeconds = mins * 60;
        remainingSeconds = totalSessionSeconds;
        setPhase('focus');
        resetTimer();

        // Update active preset buttons
        document.querySelectorAll('.preset-pill').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        const customWrap = document.getElementById('custom-slider-wrap');
        if (customWrap) {
            customWrap.style.display = (mode === 'custom') ? 'flex' : 'none';
        }
    }

    if (timerPlayBtn) {
        timerPlayBtn.addEventListener('click', () => {
            if (isRunning) pauseTimer();
            else startTimer();
        });
    }

    if (timerResetBtn) timerResetBtn.addEventListener('click', resetTimer);
    if (timerSkipBtn) {
        timerSkipBtn.addEventListener('click', () => {
            handleTimerComplete();
        });
    }

    document.querySelectorAll('.preset-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            setMode(mode);
        });
    });

    if (customSlider) {
        customSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            if (customSliderVal) customSliderVal.textContent = `${val}m`;
            if (currentMode === 'custom') {
                totalSessionSeconds = val * 60;
                remainingSeconds = totalSessionSeconds;
                updateTimerDisplay();
            }
        });
    }

    updateStreakDisplay();
    updateTimerDisplay();

    // ── 3. Intention Anchor ──────────────────────────────────────────
    const intentionInput = document.getElementById('intention-input');
    const intentionLockBtn = document.getElementById('intention-lock-btn');
    if (intentionInput) {
        const savedIntention = localStorage.getItem('ocal-focus-intention') || '';
        intentionInput.value = savedIntention;
        intentionInput.addEventListener('change', () => {
            localStorage.setItem('ocal-focus-intention', intentionInput.value.trim());
        });
        if (intentionLockBtn) {
            intentionLockBtn.addEventListener('click', () => {
                if (intentionInput.disabled) {
                    intentionInput.disabled = false;
                    intentionLockBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
                    intentionInput.focus();
                } else {
                    intentionInput.disabled = true;
                    intentionLockBtn.innerHTML = '<i class="fas fa-lock"></i>';
                    localStorage.setItem('ocal-focus-intention', intentionInput.value.trim());
                }
            });
        }
    }

    // ── 4. Distraction Parking Lot ───────────────────────────────────
    const parkingInput = document.getElementById('parking-input');
    const parkingAddBtn = document.getElementById('parking-add-btn');
    const parkingList = document.getElementById('parking-list');

    function loadParkingItems() {
        try {
            return JSON.parse(localStorage.getItem('ocal-focus-parking-lot') || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveParkingItems(items) {
        localStorage.setItem('ocal-focus-parking-lot', JSON.stringify(items));
    }

    function renderParkingLot() {
        if (!parkingList) return;
        const items = loadParkingItems();
        parkingList.innerHTML = '';
        if (items.length === 0) {
            parkingList.innerHTML = '<li style="font-size: 12.5px; color: var(--text-dim); text-align: center; padding: 12px 0;">No parked thoughts. Mind is clear!</li>';
            return;
        }
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = `parking-item ${item.done ? 'checked' : ''}`;
            li.innerHTML = `
                <div class="parking-item-left">
                    <input type="checkbox" ${item.done ? 'checked' : ''} data-idx="${idx}">
                    <span>${escapeHTML(item.text)}</span>
                </div>
                <button class="parking-del-btn" data-idx="${idx}"><i class="fas fa-trash"></i></button>
            `;
            parkingList.appendChild(li);
        });

        // Bind events
        parkingList.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx, 10);
                const list = loadParkingItems();
                if (list[idx]) {
                    list[idx].done = e.target.checked;
                    saveParkingItems(list);
                    renderParkingLot();
                }
            });
        });

        parkingList.querySelectorAll('.parking-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.idx, 10);
                const list = loadParkingItems();
                list.splice(idx, 1);
                saveParkingItems(list);
                renderParkingLot();
            });
        });
    }

    function addParkedThought() {
        if (!parkingInput) return;
        const text = parkingInput.value.trim();
        if (!text) return;
        const items = loadParkingItems();
        items.unshift({ text, done: false, date: Date.now() });
        saveParkingItems(items);
        parkingInput.value = '';
        renderParkingLot();
    }

    if (parkingAddBtn) parkingAddBtn.addEventListener('click', addParkedThought);
    if (parkingInput) {
        parkingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addParkedThought();
        });
    }
    renderParkingLot();

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }

    // ── 5. Breathing & Nervous System Calming ─────────────────────────
    const breathSphere = document.getElementById('breath-sphere');
    const breathInstruction = document.getElementById('breath-instruction');
    const breathCounter = document.getElementById('breath-counter');
    const breathPlayBtn = document.getElementById('breath-play-btn');
    const breathTip = document.getElementById('breath-tip');

    const BREATH_PATTERNS = {
        box: {
            name: 'Box Breathing (4-4-4-4)',
            tip: 'Follow four equal phases: breathe in, hold, breathe out, and hold.',
            phases: [
                { state: 'inhale', text: 'Inhale deeply...', duration: 4, freq: 396 },
                { state: 'hold', text: 'Hold breath...', duration: 4, freq: 432 },
                { state: 'exhale', text: 'Slowly exhale...', duration: 4, freq: 528 },
                { state: 'hold', text: 'Hold empty...', duration: 4, freq: 432 }
            ]
        },
        relax: {
            name: '4-7-8 Deep Relaxation',
            tip: 'Breathe in for four counts, hold for seven, then breathe out for eight.',
            phases: [
                { state: 'inhale', text: 'Inhale through nose...', duration: 4, freq: 396 },
                { state: 'hold', text: 'Hold breath completely...', duration: 7, freq: 432 },
                { state: 'exhale', text: 'Exhale through mouth...', duration: 8, freq: 528 }
            ]
        },
        sigh: {
            name: 'Physiological Sigh',
            tip: 'Follow two gentle inhales with one longer exhale.',
            phases: [
                { state: 'inhale', text: 'Deep inhale...', duration: 2, freq: 396 },
                { state: 'inhale', text: 'Second quick sniff!', duration: 1, freq: 440 },
                { state: 'exhale', text: 'Long, releasing exhale...', duration: 6, freq: 528 }
            ]
        },
        resonant: {
            name: 'Even breathing (5s)',
            tip: 'An even rhythm: five counts in and five counts out, with no holds.',
            phases: [
                { state: 'inhale', text: 'Smooth inhale...', duration: 5, freq: 432 },
                { state: 'exhale', text: 'Smooth exhale...', duration: 5, freq: 528 }
            ]
        }
    };

    let activeBreathKey = 'box';
    let breathIsRunning = false;
    let breathPhaseIdx = 0;
    let breathTimeRemaining = 4;
    let breathTimerInterval = null;

    function setBreathingPattern(key) {
        activeBreathKey = key;
        stopBreathing();
        const pattern = BREATH_PATTERNS[key];
        if (breathTip) breathTip.textContent = pattern.tip;
        if (breathInstruction) breathInstruction.textContent = 'Ready when you are.';
        if (breathCounter) breathCounter.textContent = `${pattern.phases[0].duration}s`;
        if (breathSphere) breathSphere.className = 'breathing-core-sphere';

        document.querySelectorAll('.exercise-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.breath === key);
            btn.setAttribute('aria-pressed', String(btn.dataset.breath === key));
        });
    }

    function runBreathingStep() {
        const pattern = BREATH_PATTERNS[activeBreathKey];
        const cur = pattern.phases[breathPhaseIdx];

        if (breathInstruction) breathInstruction.textContent = cur.text;
        if (breathSphere) {
            breathSphere.className = 'breathing-core-sphere';
            void breathSphere.offsetWidth;
            breathSphere.className = `breathing-core-sphere ${cur.state}`;
            breathSphere.style.transitionDuration = `${cur.duration}s`;
        }

        playChime(cur.freq, 1.2);
        breathTimeRemaining = cur.duration;
        if (breathCounter) breathCounter.textContent = `${breathTimeRemaining}s`;

        clearInterval(breathTimerInterval);
        breathTimerInterval = setInterval(() => {
            breathTimeRemaining--;
            if (breathTimeRemaining >= 0) {
                if (breathCounter) breathCounter.textContent = `${breathTimeRemaining}s`;
            }
            if (breathTimeRemaining <= 0) {
                clearInterval(breathTimerInterval);
                breathPhaseIdx = (breathPhaseIdx + 1) % pattern.phases.length;
                if (breathIsRunning) runBreathingStep();
            }
        }, 1000);
    }

    function startBreathing() {
        if (breathIsRunning) return;
        breathIsRunning = true;
        breathPhaseIdx = 0;
        if (breathPlayBtn) {
            breathPlayBtn.innerHTML = '<i class="fas fa-pause"></i> Stop breathing';
            breathPlayBtn.classList.add('paused');
        }
        runBreathingStep();
    }

    function stopBreathing() {
        if (breathInstruction) breathInstruction.textContent = 'Ready when you are.';
        if (breathCounter) breathCounter.textContent = `${BREATH_PATTERNS[activeBreathKey].phases[0].duration}s`;
        breathIsRunning = false;
        clearInterval(breathTimerInterval);
        breathTimerInterval = null;
        if (breathPlayBtn) {
            breathPlayBtn.innerHTML = '<i class="fas fa-play"></i> Start breathing';
            breathPlayBtn.classList.remove('paused');
        }
        if (breathSphere) {
            breathSphere.className = 'breathing-core-sphere';
        }
    }

    if (breathPlayBtn) {
        breathPlayBtn.addEventListener('click', () => {
            if (breathIsRunning) stopBreathing();
            else startBreathing();
        });
    }

    document.querySelectorAll('.exercise-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const k = btn.dataset.breath;
            if (k) setBreathingPattern(k);
        });
    });

    // ── 6. Visual Attention & Eye Fatigue Gym ────────────────────────
    // 20-20-20 Eye Strain Reset
    const eyeStartBtn = document.getElementById('eye-start-btn');
    const eyeCounter = document.getElementById('eye-counter');
    const eyeInstruction = document.getElementById('eye-instruction');
    let eyeTimer = null;
    let eyeSeconds = 20;

    if (eyeStartBtn) {
        eyeStartBtn.addEventListener('click', () => {
            clearInterval(eyeTimer);
            eyeSeconds = 20;
            if (eyeCounter) eyeCounter.textContent = '20s';
            if (eyeInstruction) eyeInstruction.textContent = 'Look at an object at least 20 feet (6m) away!';
            eyeStartBtn.disabled = true;
            playChime(600, 1.5);

            eyeTimer = setInterval(() => {
                eyeSeconds--;
                if (eyeCounter) eyeCounter.textContent = `${eyeSeconds}s`;
                if (eyeSeconds <= 0) {
                    clearInterval(eyeTimer);
                    eyeStartBtn.disabled = false;
                    if (eyeInstruction) eyeInstruction.textContent = 'Break complete. Return to your screen when you are ready.';
                    playChime(750, 2.5);
                }
            }, 1000);
        });
    }

    // Single-Point Gazing (Focus Dot / Trataka)
    const gazeStage = document.getElementById('gaze-stage');
    const gazeScore = document.getElementById('gaze-score');
    const gazeToggleBtn = document.getElementById('gaze-toggle-btn');
    let gazeTimer = null;
    let gazeSeconds = 0;
    let isGazing = false;

    if (gazeToggleBtn && gazeStage) {
        gazeToggleBtn.addEventListener('click', () => {
            if (isGazing) {
                isGazing = false;
                clearInterval(gazeTimer);
                gazeToggleBtn.innerHTML = '<i class="fas fa-eye"></i> Begin Gazing';
                playChime(432, 1.8);
            } else {
                isGazing = true;
                gazeSeconds = 0;
                gazeToggleBtn.innerHTML = '<i class="fas fa-stop"></i> Finish Session';
                playChime(528, 2);
                gazeTimer = setInterval(() => {
                    gazeSeconds++;
                    const m = Math.floor(gazeSeconds / 60);
                    const s = gazeSeconds % 60;
                    if (gazeScore) gazeScore.textContent = `Focus: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                }, 1000);
            }
        });
    }

    // 5-4-3-2-1 Sensory Grounding
    document.querySelectorAll('.grounding-step-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('completed');
            playChime(500 + Math.random() * 200, 0.4);
        });
    });

    // ── 7. Offline Ambient Soundscape & Binaural Beats ────────────────
    const activeNodes = {};

    function startSoundNode(trackId, volume = 0.5) {
        const ctx = getAudioContext();
        if (activeNodes[trackId]) return;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.connect(ctx.destination);

        if (trackId === 'alpha') {
            // 10 Hz Binaural Beats (200Hz left, 210Hz right)
            const merger = ctx.createChannelMerger(2);
            const oscL = ctx.createOscillator();
            const oscR = ctx.createOscillator();
            oscL.frequency.setValueAtTime(200, ctx.currentTime);
            oscR.frequency.setValueAtTime(210, ctx.currentTime);

            oscL.connect(merger, 0, 0);
            oscR.connect(merger, 0, 1);
            merger.connect(gainNode);
            oscL.start();
            oscR.start();

            activeNodes[trackId] = { oscs: [oscL, oscR], gain: gainNode };
        } else if (trackId === 'theta') {
            // 6 Hz Binaural Beats (180Hz left, 186Hz right)
            const merger = ctx.createChannelMerger(2);
            const oscL = ctx.createOscillator();
            const oscR = ctx.createOscillator();
            oscL.frequency.setValueAtTime(180, ctx.currentTime);
            oscR.frequency.setValueAtTime(186, ctx.currentTime);

            oscL.connect(merger, 0, 0);
            oscR.connect(merger, 0, 1);
            merger.connect(gainNode);
            oscL.start();
            oscR.start();

            activeNodes[trackId] = { oscs: [oscL, oscR], gain: gainNode };
        } else if (trackId === 'brown') {
            // Synthesized Warm Brown Noise Buffer
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, ctx.currentTime);

            noise.connect(filter);
            filter.connect(gainNode);
            noise.start();

            activeNodes[trackId] = { source: noise, gain: gainNode };
        } else if (trackId === 'rain') {
            // Synthesized Rain Atmosphere (filtered noise + resonant drops)
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, ctx.currentTime);
            filter.Q.setValueAtTime(1.5, ctx.currentTime);

            noise.connect(filter);
            filter.connect(gainNode);
            noise.start();

            activeNodes[trackId] = { source: noise, gain: gainNode };
        }
    }

    function stopSoundNode(trackId) {
        if (!activeNodes[trackId]) return;
        const entry = activeNodes[trackId];
        try {
            if (entry.oscs) entry.oscs.forEach(o => o.stop());
            if (entry.source) entry.source.stop();
            if (entry.gain) entry.gain.disconnect();
        } catch (e) {}
        delete activeNodes[trackId];
    }

    function setSoundVolume(trackId, val) {
        if (activeNodes[trackId] && activeNodes[trackId].gain) {
            const ctx = getAudioContext();
            activeNodes[trackId].gain.gain.setValueAtTime(parseFloat(val), ctx.currentTime);
        }
    }

    document.querySelectorAll('.sound-track-card').forEach(card => {
        const trackId = card.dataset.track;
        const playBtn = card.querySelector('.track-play-toggle');
        const slider = card.querySelector('.track-volume-slider');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (card.classList.contains('playing')) {
                    stopSoundNode(trackId);
                    card.classList.remove('playing');
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                } else {
                    const vol = slider ? slider.value : 0.5;
                    startSoundNode(trackId, vol);
                    card.classList.add('playing');
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                }
            });
        }

        if (slider) {
            slider.addEventListener('input', (e) => {
                setSoundVolume(trackId, e.target.value);
            });
        }
    });

    // ── 8. Navigation Pill Tab Switching ─────────────────────────────
    document.querySelectorAll('.section-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.tab;
            document.querySelectorAll('.section-pill-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

            btn.classList.add('active');
            const targetView = document.getElementById(targetId);
            if (targetView) targetView.classList.add('active');
        });
    });

    // ── 9. Theme Toggle Integration ──────────────────────────────────
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        const initTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        themeBtn.innerHTML = (initTheme === 'dark') ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

        themeBtn.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = (cur === 'dark') ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('ocal-settings-theme', next);
            if (window.OcalColorHarmonizer) {
                const a = localStorage.getItem('ocal-settings-accent');
                window.OcalColorHarmonizer.applyHarmonizedTheme(a, next);
            }
            themeBtn.innerHTML = (next === 'dark') ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        });
    }

    // Set initial breathing pattern
    setBreathingPattern('box');

})();

// Short, self-contained practices. Closing the dialog always stops its timer.
(() => {
    const practices = [
        { title: 'Body scan', category: 'mind', icon: 'fa-person', seconds: 90, description: 'Notice how you feel, one small area at a time.', steps: ['Rest your feet on the floor. Notice the contact beneath them.', 'Bring attention to your legs and hips. Let them settle.', 'Notice your shoulders and hands. Allow them to soften.', 'Relax your jaw. Notice your natural breathing.'] },
        { title: 'Shoulder reset', category: 'body', icon: 'fa-arrows-up-down', seconds: 60, description: 'A gentle pause from sitting at your desk.', steps: ['Sit comfortably and let your arms rest by your sides.', 'Slowly lift your shoulders, then let them lower. Keep the movement comfortable.', 'Make a few small, gentle backward shoulder circles.', 'Rest your shoulders and return to a comfortable posture.'] },
        { title: 'Mindful listening', category: 'mind', icon: 'fa-ear-listen', seconds: 60, description: 'Give the sounds around you your full attention.', steps: ['Let your gaze soften. Listen to the room around you.', 'Notice a sound nearby without naming or judging it.', 'Notice a more distant sound. Let it come and go.', 'Listen to the whole space, then return your attention to your task.'] },
        { title: 'Hand & wrist break', category: 'body', icon: 'fa-hand', seconds: 60, description: 'Put the keyboard aside and move gently.', steps: ['Rest your forearms and let your hands relax.', 'Slowly spread your fingers, then release. Repeat gently.', 'Make small wrist circles within a comfortable range.', 'Let your hands rest. Notice any change in how they feel.'] },
        { title: 'Count your breaths', category: 'mind', icon: 'fa-wind', seconds: 120, description: 'A simple attention practice at your natural pace.', steps: ['Breathe naturally. No need to change the rhythm.', 'Count each exhale from one to five.', 'After five, begin again at one. If you lose count, simply restart.', 'Let go of counting and notice a few natural breaths.'] },
        { title: 'Mindful observation', category: 'mind', icon: 'fa-leaf', seconds: 60, description: 'Rediscover an ordinary object with fresh eyes.', steps: ['Choose an object nearby: a cup, a leaf, or a pen.', 'Notice its outline, colors, and where the light falls.', 'Look for a small detail you had not noticed before.', 'Take in the whole object, then gently return to your work.'] },
        { title: 'Number trail', category: 'mind', icon: 'fa-border-all', seconds: 0, description: 'Find the numbers in order, from 1 to 16. Accuracy comes first.', steps: [] }
    ];
    const grid = document.getElementById('practice-grid');
    const dialog = document.getElementById('practice-dialog');
    const clock = document.getElementById('practice-clock');
    const instruction = document.getElementById('practice-instruction');
    const start = document.getElementById('practice-start');
    const progress = document.getElementById('practice-progress');
    const numbers = document.getElementById('number-grid');
    let selected, interval, running = false, elapsed = 0, startedAt = 0, next = 1;
    const format = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    function pause() { clearInterval(interval); interval = null; running = false; }
    function renderLibrary(filter = 'all') {
        grid.replaceChildren();
        practices.forEach((practice, index) => {
            if (filter !== 'all' && practice.category !== filter) return;
            const card = document.createElement('article');
            card.className = 'practice-card';
            card.innerHTML = `<i class="fas ${practice.icon}" aria-hidden="true"></i><span class="practice-meta">${practice.category} · ${practice.seconds ? practice.seconds / 60 + ' min' : 'Self-paced'}</span><h3>${practice.title}</h3><p>${practice.description}</p><button type="button">Begin practice <span aria-hidden="true">↗</span></button>`;
            card.querySelector('button').setAttribute('aria-label', `Begin ${practice.title}`);
            card.querySelector('button').addEventListener('click', () => {
                selected = practices[index];
                document.getElementById('practice-title').textContent = selected.title;
                document.getElementById('practice-description').textContent = selected.description;
                document.getElementById('practice-category').textContent = selected.category + ' / GUIDED PRACTICE';
                reset(); dialog.showModal();
            });
            grid.append(card);
        });
    }
    function reset() {
        pause(); elapsed = 0; next = 1; progress.value = 0;
        clock.textContent = format(selected.seconds);
        start.hidden = false; start.disabled = false; start.textContent = 'Start exercise';
        numbers.hidden = true; numbers.replaceChildren();
        instruction.textContent = selected.seconds ? 'Settle in. Press start when you are ready.' : 'Tap each number in order. There is no time limit.';
    }
    function finish() {
        pause(); progress.value = 100; start.disabled = true; start.textContent = 'Completed';
        instruction.textContent = selected.seconds ? 'Practice complete. Take a moment, then carry on at your own pace.' : `Trail complete in ${format(elapsed)}. Nicely done.`;
    }
    function update() {
        elapsed = Math.floor((Date.now() - startedAt) / 1000);
        clock.textContent = format(selected.seconds ? Math.max(0, selected.seconds - elapsed) : elapsed);
        if (selected.seconds) {
            progress.value = Math.min(100, elapsed / selected.seconds * 100);
            const text = selected.steps[Math.min(selected.steps.length - 1, Math.floor(elapsed / selected.seconds * selected.steps.length))];
            if (instruction.textContent !== text) instruction.textContent = text;
            if (elapsed >= selected.seconds) finish();
        }
    }
    start.addEventListener('click', () => {
        if (running) { update(); pause(); start.textContent = 'Resume'; return; }
        running = true; startedAt = Date.now() - elapsed * 1000;
        start.textContent = 'Pause';
        if (!selected.seconds) {
            start.hidden = true; numbers.hidden = false;
            const values = Array.from({length: 16}, (_, i) => i + 1);
            for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
            values.forEach(value => {
                const button = document.createElement('button'); button.textContent = value;
                button.addEventListener('click', () => {
                    if (value !== next) { instruction.textContent = `Look for ${next} next. Take your time.`; return; }
                    button.disabled = true; next++; progress.value = (next - 1) / 16 * 100;
                    instruction.textContent = `Find ${next} next.`;
                    if (next === 17) { update(); finish(); }
                }); numbers.append(button);
            });
            instruction.textContent = 'Find 1 to begin.';
        }
        update(); interval = setInterval(update, 200);
    });
    document.getElementById('practice-reset').addEventListener('click', reset);
    document.getElementById('practice-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', pause);
    document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
        renderLibrary(button.dataset.filter);
    }));
    const headings = {
        'tab-timers': ['Make room for deep work.', 'One intention. A little quiet. Your next focused moment starts here.'],
        'tab-breathing': ['Find your breathing room.', 'Follow a rhythm that feels comfortable. Let everything else wait.'],
        'tab-gym': ['Give your attention a reset.', 'Look away, notice your surroundings, and come back refreshed.'],
        'tab-audio': ['Set the tone for your focus.', 'Find your background sound. Layer tracks and adjust each volume.'],
        'tab-exercises': ['A little practice. A fresh start.', 'Explore seven simple ways to pause, move, and bring your attention back.']
    };
    document.querySelectorAll('.section-pill-btn').forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
        button.addEventListener('click', () => {
            const [title, description] = headings[button.dataset.tab];
            document.getElementById('workspace-title').textContent = title;
            document.getElementById('workspace-description').textContent = description;
            document.querySelectorAll('.section-pill-btn').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        });
    });
    document.getElementById('browse-exercises').addEventListener('click', () => { document.querySelector('[data-tab="tab-exercises"]').click(); document.getElementById('focus-scroll').scrollTo({top: 0, behavior: 'smooth'}); });
    document.querySelectorAll('.grounding-step-card').forEach(card => {
        card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-pressed', 'false');
        card.addEventListener('click', () => card.setAttribute('aria-pressed', String(card.classList.contains('completed'))));
        card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); } });
    });
    document.querySelectorAll('button[title]').forEach(button => button.setAttribute('aria-label', button.title));
    document.getElementById('parking-add-btn').setAttribute('aria-label', 'Save thought');
    document.getElementById('intention-input').setAttribute('aria-label', 'Your intention');
    document.getElementById('parking-input').setAttribute('aria-label', 'Thought to save');
    renderLibrary();
})();
// Section status and accessible mixer controls.
(() => {
    const senses = [...document.querySelectorAll('.grounding-step-card')];
    const updateSenses = () => {
        const completed = senses.filter(card => card.classList.contains('completed')).length;
        document.getElementById('grounding-progress').textContent = completed === 5 ? 'All five senses noticed. Take a breath.' : `${completed} of 5 senses noticed`;
    };
    senses.forEach(card => card.addEventListener('click', updateSenses));
    document.getElementById('grounding-reset').addEventListener('click', () => {
        senses.forEach(card => { card.classList.remove('completed'); card.setAttribute('aria-pressed', 'false'); });
        updateSenses();
    });
    const tracks = [...document.querySelectorAll('.sound-track-card')];
    function updateMixer() {
        let count = 0;
        tracks.forEach(card => {
            const playing = card.classList.contains('playing');
            if (playing) count++;
            const button = card.querySelector('.track-play-toggle');
            button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${card.querySelector('.track-title').textContent}`);
            button.setAttribute('aria-pressed', String(playing));
        });
        document.getElementById('mixer-status').textContent = count ? `${count} sound${count === 1 ? '' : 's'} playing · Your personal mix` : 'A quiet space. No sounds playing.';
    }
    tracks.forEach(card => {
        const slider = card.querySelector('.track-volume-slider');
        const label = document.createElement('div'); label.className = 'track-volume-label';
        label.innerHTML = '<span>VOLUME</span><output></output>';
        slider.before(label);
        slider.setAttribute('aria-label', `${card.querySelector('.track-title').textContent} volume`);
        const update = () => label.querySelector('output').textContent = `${Math.round(slider.value * 100)}%`;
        slider.addEventListener('input', update); update();
        card.querySelector('.track-play-toggle').addEventListener('click', updateMixer);
    });
    document.getElementById('sounds-stop').addEventListener('click', () => {
        tracks.filter(card => card.classList.contains('playing')).forEach(card => card.querySelector('.track-play-toggle').click());
    });
    document.getElementById('custom-slider').setAttribute('aria-label', 'Focus duration in minutes');
    updateMixer();
})();
