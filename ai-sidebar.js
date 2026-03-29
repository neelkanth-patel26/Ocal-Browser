const webview = document.getElementById('ai-webview');
const handle = document.getElementById('resize-handle');
const closeBtn = document.getElementById('close-ai');
const reloadBtn = document.getElementById('reload-ai');

if (closeBtn) closeBtn.onclick = () => window.electronAPI.send('toggle-ai-sidebar', false);
if (reloadBtn) reloadBtn.onclick = () => { if(webview) webview.reload(); };

// Resizing logic — delegated to main window for global tracking
if (handle) {
    handle.onmousedown = (e) => {
        window.electronAPI.send('start-ai-resize');
    };
}

// Handle external links (open in browser)
if (webview) {
    webview.addEventListener('new-window', (e) => {
        window.electronAPI.navigateTo(e.url);
    });
}
