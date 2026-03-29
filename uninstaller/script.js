// Using electronAPI from preload.js
const ipc = window.electronAPI;

document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    const skipBtn = document.getElementById('skipBtn');
    const feedbackText = document.getElementById('feedbackText');
    const reasonInputs = document.querySelectorAll('input[name="reason"]');

    let selectedReason = null;

    reasonInputs.forEach(input => {
        input.addEventListener('change', () => {
            selectedReason = input.value;
            submitBtn.disabled = false;
        });
    });

    submitBtn.addEventListener('click', () => {
        const feedback = feedbackText.value || "No additional feedback.";
        const email = "gns.media.group@outlook.com";
        const subject = encodeURIComponent("Ocal Browser - Uninstall Feedback");
        const body = encodeURIComponent(`Reason: ${selectedReason}\n\nFeedback: ${feedback}\n\nSent via Ocal Uninstaller`);
        
        const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
        
        // Notify main to open mailto and close
        ipc.send('uninstall-survey-complete', mailtoLink);
    });

    skipBtn.addEventListener('click', () => {
        ipc.send('uninstall-survey-close');
    });
});
