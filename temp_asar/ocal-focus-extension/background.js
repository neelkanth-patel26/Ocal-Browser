let isRunning = false;
let timeLeft = 25 * 60; // 25 minutes default focus
let isFocusMode = true;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ 
        isRunning, 
        timeLeft, 
        isFocusMode 
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoroTimer') {
        chrome.storage.local.get(['isRunning', 'timeLeft', 'isFocusMode'], (data) => {
            if (data.isRunning && data.timeLeft > 0) {
                const newTime = data.timeLeft - 1;
                chrome.storage.local.set({ timeLeft: newTime });
                // If popup is open, it listens to storage changes
                
                if (newTime === 0) {
                    // Timer finished
                    isRunning = false;
                    const nextMode = !data.isFocusMode;
                    const nextTime = nextMode ? 25 * 60 : 5 * 60; // 5 min break
                    
                    chrome.storage.local.set({
                        isRunning: false,
                        timeLeft: nextTime,
                        isFocusMode: nextMode
                    });
                    
                    chrome.alarms.clear('pomodoroTimer');
                    
                    // Trigger notification (Requires notifications permission if added later)
                    /* chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: 'Ocal Focus Session Complete!',
                        message: nextMode ? 'Time to focus!' : 'Take a 5 minute break.'
                    }); */
                }
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.cmd === 'START_TIMER') {
        chrome.storage.local.set({ isRunning: true });
        chrome.alarms.create('pomodoroTimer', { periodInMinutes: 1 / 60 }); // Fire every second
    } else if (request.cmd === 'PAUSE_TIMER') {
        chrome.storage.local.set({ isRunning: false });
        chrome.alarms.clear('pomodoroTimer');
    } else if (request.cmd === 'RESET_TIMER') {
        chrome.storage.local.get(['isFocusMode'], (data) => {
            const time = data.isFocusMode ? 25 * 60 : 5 * 60;
            chrome.storage.local.set({ isRunning: false, timeLeft: time });
            chrome.alarms.clear('pomodoroTimer');
        });
    }
});
