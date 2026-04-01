document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const timeDisplay = document.getElementById('time-display');
    const modeDisplay = document.getElementById('timer-mode');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const progressBar = document.getElementById('progress-bar');

    const taskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const taskCounter = document.getElementById('task-counter');

    // ---- Timer State ----
    let isRunning = false;
    let timeLeft = 25 * 60;
    let isFocusMode = true;

    // ---- Tasks State ----
    let tasks = [];

    // Initialize
    function init() {
        // Load Timer from Storage
        chrome.storage.local.get(['isRunning', 'timeLeft', 'isFocusMode', 'tasks'], (data) => {
            if (data.timeLeft !== undefined) timeLeft = data.timeLeft;
            if (data.isRunning !== undefined) isRunning = data.isRunning;
            if (data.isFocusMode !== undefined) isFocusMode = data.isFocusMode;
            if (data.tasks !== undefined) tasks = data.tasks;

            updateTimerUI();
            updateTasksUI();

            // Set up listener for timer tick from background
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local') {
                    if (changes.timeLeft) {
                        timeLeft = changes.timeLeft.newValue;
                        updateTimerUI();
                    }
                    if (changes.isRunning) {
                        isRunning = changes.isRunning.newValue;
                        updateTimerUI();
                    }
                    if (changes.isFocusMode) {
                        isFocusMode = changes.isFocusMode.newValue;
                        updateTimerUI();
                    }
                }
            });
        });
    }

    // Timer Logic
    function formatTime(seconds) {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function updateTimerUI() {
        timeDisplay.textContent = formatTime(timeLeft);
        modeDisplay.textContent = isFocusMode ? 'Focus Session' : 'Short Break';
        startBtn.textContent = isRunning ? 'Pause' : 'Start';
        startBtn.className = isRunning ? 'btn btn-secondary' : 'btn btn-primary';

        const total = isFocusMode ? 25 * 60 : 5 * 60;
        const progress = ((total - timeLeft) / total) * 100;
        progressBar.style.width = `${progress}%`;
    }

    startBtn.addEventListener('click', () => {
        if (isRunning) {
            chrome.runtime.sendMessage({ cmd: 'PAUSE_TIMER' });
        } else {
            chrome.runtime.sendMessage({ cmd: 'START_TIMER' });
        }
    });

    resetBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ cmd: 'RESET_TIMER' });
    });

    // Task Logic
    function updateTasksUI() {
        taskList.innerHTML = '';
        let completed = 0;

        tasks.forEach((task, index) => {
            if (task.done) completed++;

            const li = document.createElement('li');
            li.className = `task-item ${task.done ? 'completed' : ''}`;

            li.innerHTML = `
                <label class="task-checkbox-wrap">
                    <input type="checkbox" class="task-checkbox" data-index="${index}" ${task.done ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <div class="task-text" data-index="${index}">${task.text}</div>
                <button class="task-delete" data-index="${index}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            taskList.appendChild(li);
        });

        taskCounter.textContent = `${completed}/${tasks.length}`;

        // Add Listeners to dynamically created elements
        const checkboxes = taskList.querySelectorAll('.task-checkbox');
        checkboxes.forEach(cb => cb.addEventListener('change', toggleTask));

        const texts = taskList.querySelectorAll('.task-text');
        texts.forEach(txt => txt.addEventListener('click', () => {
             const idx = txt.getAttribute('data-index');
             const cb = document.querySelector(`.task-checkbox[data-index="${idx}"]`);
             cb.click();
        }));

        const deleteBtns = taskList.querySelectorAll('.task-delete');
        deleteBtns.forEach(btn => btn.addEventListener('click', deleteTask));
    }

    function saveTasks() {
        chrome.storage.local.set({ tasks });
        updateTasksUI();
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ text, done: false });
            taskInput.value = '';
            saveTasks();
        }
    }

    function toggleTask(e) {
        const index = parseInt(e.target.getAttribute('data-index'));
        tasks[index].done = e.target.checked;
        saveTasks();
    }

    function deleteTask(e) {
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        tasks.splice(index, 1);
        saveTasks();
    }

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Run Once
    init();
});
