// Using electronAPI from preload.js
const ipc = window.electronAPI;

function hexToRgb(hex) {
    let r = 9, g = 240, b = 160;
    if (hex && hex.startsWith('#')) {
        const h = hex.substring(1);
        if (h.length === 3) {
            r = parseInt(h[0] + h[0], 16);
            g = parseInt(h[1] + h[1], 16);
            b = parseInt(h[2] + h[2], 16);
        } else if (h.length === 6) {
            r = parseInt(h.substring(0, 2), 16);
            g = parseInt(h.substring(2, 4), 16);
            b = parseInt(h.substring(4, 6), 16);
        }
    }
    return `${r}, ${g}, ${b}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    const skipBtn = document.getElementById('skipBtn');
    const feedbackText = document.getElementById('feedbackText');
    const reasonInputs = document.querySelectorAll('input[name="reason"]');

    let selectedReason = null;

    // Load Settings for Theme and Accent Syncing
    if (ipc && ipc.getSettings) {
        ipc.getSettings().then(s => {
            if (s) {
                const theme = s.themeMode || 'dark';
                document.body.setAttribute('data-theme', theme);
                const accent = s.accentColor || '#09f0a0';
                document.documentElement.style.setProperty('--accent-color', accent);
                document.documentElement.style.setProperty('--accent-glow', `rgba(${hexToRgb(accent)}, 0.25)`);
                document.documentElement.style.setProperty('--accent-hover', accent);
            }
        }).catch(err => console.error("Error loading theme settings in uninstaller:", err));
    }

    reasonInputs.forEach(input => {
        input.addEventListener('change', () => {
            selectedReason = input.value;
            submitBtn.disabled = false;
        });
    });

    submitBtn.addEventListener('click', () => {
        submitBtn.disabled = true;
        skipBtn.disabled = true;
        submitBtn.innerHTML = "Processing...";
        
        const feedback = feedbackText.value || "No additional feedback.";
        const email = "gaming.network.studio.mg@gmail.com";
        const subject = encodeURIComponent("Ocal Browser - Uninstall Feedback");
        const body = encodeURIComponent(`Reason: ${selectedReason}\n\nFeedback: ${feedback}\n\nSent via Ocal Uninstaller`);
        
        const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
        
        // Notify main to open mailto and close
        ipc.send('uninstall-survey-complete', mailtoLink);
    });

    skipBtn.addEventListener('click', () => {
        submitBtn.disabled = true;
        skipBtn.disabled = true;
        skipBtn.innerHTML = "Uninstalling...";
        ipc.send('uninstall-survey-close');
    });
});
