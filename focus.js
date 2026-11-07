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
            tip: 'Navy SEAL protocol for immediate cognitive clarity, heart rate reduction, and emotional control.',
            phases: [
                { state: 'inhale', text: 'Inhale deeply...', duration: 4, freq: 396 },
                { state: 'hold', text: 'Hold breath...', duration: 4, freq: 432 },
                { state: 'exhale', text: 'Slowly exhale...', duration: 4, freq: 528 },
                { state: 'hold', text: 'Hold empty...', duration: 4, freq: 432 }
            ]
        },
        relax: {
            name: '4-7-8 Deep Relaxation',
            tip: 'Natural tranquilizer for the nervous system by Dr. Andrew Weil. Dramatically slows racing thoughts.',
            phases: [
                { state: 'inhale', text: 'Inhale through nose...', duration: 4, freq: 396 },
                { state: 'hold', text: 'Hold breath completely...', duration: 7, freq: 432 },
                { state: 'exhale', text: 'Exhale through mouth...', duration: 8, freq: 528 }
            ]
        },
        sigh: {
            name: 'Physiological Sigh',
            tip: 'Stanford Neurobiology: Two quick inhales through the nose, followed by a long, slow exhale to pop open collapsed alveoli and lower cortisol immediately.',
            phases: [
                { state: 'inhale', text: 'Deep inhale...', duration: 2, freq: 396 },
                { state: 'inhale', text: 'Second quick sniff!', duration: 1, freq: 440 },
                { state: 'exhale', text: 'Long, releasing exhale...', duration: 6, freq: 528 }
            ]
        },
        resonant: {
            name: 'Resonant Coherence (5.5s)',
            tip: 'Maximizes heart-rate variability (HRV) and synchronizes brainwave alpha coherence.',
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
        if (breathInstruction) breathInstruction.textContent = 'Press Start to Begin';
        if (breathCounter) breathCounter.textContent = `${pattern.phases[0].duration}s`;
        if (breathSphere) breathSphere.className = 'breathing-core-sphere';

        document.querySelectorAll('.exercise-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.breath === key);
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
            breathPlayBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Exercise';
            breathPlayBtn.classList.add('paused');
        }
        runBreathingStep();
    }

    function stopBreathing() {
        breathIsRunning = false;
        clearInterval(breathTimerInterval);
        breathTimerInterval = null;
        if (breathPlayBtn) {
            breathPlayBtn.innerHTML = '<i class="fas fa-play"></i> Start Guided Breath';
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
                    if (eyeInstruction) eyeInstruction.textContent = 'Great job! Your ciliary eye muscles have reset.';
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
