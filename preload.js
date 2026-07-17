// ── Neural Shield V10: Deep Metadata Interceptor (Secondary & Sidebar Scrubbing) ──
(function() {
    console.log('[Neural Shield] Initializing Deep Interceptor V10...');

    const AD_KEYS = [
        'adPlacements', 'playerAds', 'adSlots', 'masthead', 
        'adBreakHeartbeatParams', 'adEvents', 'ad_break',
        'ads_engagement_panel', 'ad_slots', 'ads_info'
    ];
    
    function neuralCleaner(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            // Filter out items that explicitly look like ads in lists (sidebar/search)
            return obj.filter(item => {
                if (item?.adSlotRenderer || item?.promotedSparklesWebRenderer || item?.adRenderer) {
                    console.log('[Neural Shield] Scrubbing ad-renderer from list');
                    return false;
                }
                return true;
            }).map(neuralCleaner);
        }

        const cleaned = {};
        for (const key in obj) {
            if (AD_KEYS.includes(key)) {
                cleaned[key] = Array.isArray(obj[key]) ? [] : {};
                continue;
            }
            if (key === 'enforcementMessageViewModel' || key === 'enforcement_message_view_model') continue;
            cleaned[key] = neuralCleaner(obj[key]);
        }
        return cleaned;
    }

    // ── 1. Fetch Interception (Priority Boosting & Metadata Scrubbing) ────────
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        let url = args[0] instanceof Request ? args[0].url : args[0];
        
        // Priority Boost
        if (url.includes('googlevideo.com/videoplayback')) {
            if (!url.includes('&priority=high')) {
                url += '&priority=high';
                if (args[0] instanceof Request) args[0] = new Request(url, args[0]);
                else args[0] = url;
            }
        }

        const response = await originalFetch(...args);
        
        if (url.includes('/v1/player') || url.includes('/v1/next')) {
            const clone = response.clone();
            try {
                const json = await clone.json();
                const cleanJson = neuralCleaner(json);
                console.log('[Neural Shield] Neutralized ad metadata in Fetch (Safe)');
                return new Response(JSON.stringify(cleanJson), {
                    status: response.status,
                    headers: response.headers
                });
            } catch (e) { return response; }
        }
        return response;
    };

    // ── 2. XHR Interception (Tracking & Scrubbing) ───────────────────────────
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        this._isAdMetadata = url.includes('/v1/player') || url.includes('/v1/next');
        return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        if (this._isAdMetadata) {
            const originalOnReadyStateChange = this.onreadystatechange;
            this.onreadystatechange = function() {
                if (this.readyState === 4 && this.status === 200) {
                    try {
                        const json = JSON.parse(this.responseText);
                        const cleanJson = neuralCleaner(json);
                        Object.defineProperty(this, 'responseText', { value: JSON.stringify(cleanJson), configurable: true });
                        Object.defineProperty(this, 'response', { value: JSON.stringify(cleanJson), configurable: true });
                        console.log('[Neural Shield] Neutralized ad metadata in XHR (Safe)');
                    } catch (e) {}
                }
                if (originalOnReadyStateChange) originalOnReadyStateChange.apply(this, arguments);
            };
        }
        return originalSend.apply(this, arguments);
    };
})();

// ── Global Trusted Types Policy (Bypass YouTube Security Blocks) ────────────
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (s) => s,
            createScript: (s) => s,
            createScriptURL: (s) => s,
        });
    }
}

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation
  newTab:       (url)     => ipcRenderer.send('new-tab', url),
  switchTab:    (id)      => ipcRenderer.send('switch-tab', id),
  closeTab:     (id)      => ipcRenderer.send('close-tab', id),
  navigateTo:   (url)     => ipcRenderer.send('navigate-to', url),
  goBack:       ()        => ipcRenderer.send('nav-back'),
  goForward:    ()        => ipcRenderer.send('nav-forward'),
  reload:       ()        => ipcRenderer.send('nav-reload'),

  // Window
  minimize:     ()        => ipcRenderer.send('window-minimize'),
  maximize:     ()        => ipcRenderer.send('window-maximize'),
  close:        ()        => ipcRenderer.send('window-close'),

  // Updates
  getAppVersion:  () => ipcRenderer.invoke('get-app-version'),
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate: (url) => ipcRenderer.invoke('download-update', url),
  applyUpdate:    (path) => ipcRenderer.send('apply-update', path),
  onUpdateProgress: (cb) => ipcRenderer.on('update-download-progress', (e, d) => cb(d)),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (e, d) => cb(d)),

  // Settings
  getSettings:    ()          => ipcRenderer.invoke('get-settings'),
  getDownloads:   ()          => ipcRenderer.invoke('get-downloads'),
  updateSetting:  (key, val)  => ipcRenderer.send('update-setting', key, val),
  importBookmarks: (browser)    => ipcRenderer.invoke('import-bookmarks', browser),
  importBookmarkFile: ()         => ipcRenderer.invoke('import-bookmark-file'),
  clearBookmarks:     ()         => ipcRenderer.send('clear-bookmarks'),
  checkDefaultBrowser: ()        => ipcRenderer.invoke('check-default-browser'),
  setAsDefaultBrowser: ()        => ipcRenderer.invoke('set-as-default-browser'),

  // Bookmarks
  toggleBookmark: (bm)    => ipcRenderer.send('toggle-bookmark', bm),

  // Generic send/receive/invoke
  send: (channel, data)   => ipcRenderer.send(channel, data),
  on:   (channel, cb)     => ipcRenderer.on(channel, (e, d) => cb(e, d)),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),

  // Extensions
  installExtension: (id)   => ipcRenderer.invoke('install-extension', id),
  loadUnpackedExtension: () => ipcRenderer.invoke('load-unpacked-extension'),
  getExtensions:    ()     => ipcRenderer.invoke('get-extensions'),
  removeExtension:  (id)   => ipcRenderer.invoke('remove-extension', id),
  toggleExtension:  (id, enabled) => ipcRenderer.invoke('toggle-extension', { id, enabled }),
  
  // Profiles
  switchProfile: (id)      => ipcRenderer.send('switch-profile', id),
  createProfile: (data)    => ipcRenderer.invoke('create-profile', data),
  deleteProfile: (id)      => ipcRenderer.send('delete-profile', id),
  editProfile:   (data)    => ipcRenderer.send('edit-profile', data),

  // ── Listeners ──────────────────────────────────────────────────────────
  onTabsChanged:       (cb) => ipcRenderer.on('tabs-changed',          (e, d)    => cb(d)),
  onUpdateURL:         (cb) => ipcRenderer.on('url-updated',           (e, d)    => cb(d)),
  onUpdateTitle:       (cb) => ipcRenderer.on('title-updated',         (e, d)    => cb(d)),
  onSettingsChanged:   (cb) => ipcRenderer.on('settings-changed',      (e, s)    => cb(s)),

  // Both renderer and sidebars use bookmarks-changed; renderer gets full object
  onBookmarksUpdated:  (cb) => ipcRenderer.on('bookmarks-changed',     (e, d)    => cb(d)),
  onBookmarksChanged:  (cb) => ipcRenderer.on('bookmarks-changed',     (e, d)    => cb(d)),
  onSuggestionsUpdated: (cb) => ipcRenderer.on('update-suggestions',   (e, d)    => cb(e, d)),

  onDownloadUpdated:   (cb) => ipcRenderer.on('download-updated',      (e, dl)   => cb(dl)),
  onToggleSidebar:     (cb) => ipcRenderer.on('toggle-sidebar',  (e, open) => cb(e, open)),
  onSwitchTab:         (cb) => ipcRenderer.on('switch-tab-sidebar',    (e, tab)  => cb(tab)),
  onMaximized:         (cb) => ipcRenderer.on('window-is-maximized',   (e, s)    => cb(s)),
  onCloseAllSidebars:  (cb) => ipcRenderer.on('close-all-sidebars',    ()        => cb()),
  onHtmlFullscreen:    (cb) => ipcRenderer.on('html-fullscreen',       (e, v)    => cb(v)),
  onShowModal:         (cb) => ipcRenderer.on('show-modal',            (e, d)    => cb(d)),
  onUpdateSiteInfo:    (cb) => ipcRenderer.on('update-site-info',      (e, d)    => cb(d)),
  onShowBMDropdown:    (cb) => ipcRenderer.on('show-bm-dropdown',      (e, d)    => cb(d)),
  onFaviconUpdated:    (cb) => ipcRenderer.on('favicon-updated',       (e, d) => cb(d)),


  // Printing
  print: () => ipcRenderer.send('print-document')
});

// ── Chrome Web Store Bypass & Injection ──────────────────────────────────────────
if (window.location.hostname === 'chromewebstore.google.com') {
    const injectStoreButton = () => {
        const url = window.location.href;
        const match = url.match(/\/detail\/.*?\/([a-z]{32})/);
        if (!match) return;
        const extensionId = match[1];

        // Targets for the "Add to Chrome" area in the new 2024+ layout
        // We look for the main action button container
        const selectors = [
            '.TnAL7c', // Primary button container
            'button[aria-label*="Chrome"]', // Any button with Chrome in label
            '.fK6v9d', // Sidebar action area
            '.header-container' // Fallback
        ];

        let target = null;
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && !el.querySelector('.ocal-install-btn')) {
                target = el;
                break;
            }
        }

        if (target) {
            const btn = document.createElement('button');
            btn.className = 'ocal-install-btn';
            btn.innerHTML = `
                <i class="fas fa-puzzle-piece" style="margin-right: 8px;"></i>
                Add to Ocal
            `;
            btn.style.cssText = `
                background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
                color: white;
                border: none;
                padding: 10px 24px;
                border-radius: 9999px;
                font-weight: 600;
                font-family: 'Outfit', 'Inter', sans-serif;
                cursor: pointer;
                transition: 0.3s;
                margin-left: 10px;
                font-size: 14px;
                display: flex;
                align-items: center;
                box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
                z-index: 10000;
                position: relative;
            `;
            
            btn.onmouseover = () => btn.style.transform = 'translateY(-2px)';
            btn.onmouseout = () => btn.style.transform = 'translateY(0)';
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="margin-right: 8px;"></i> Installing...';
                btn.style.opacity = '0.8';
                ipcRenderer.send('install-extension-from-store', extensionId);
            };

            // If we found the native button, we might want to hide it or place ours next to it
            const nativeBtn = target.querySelector('button');
            if (nativeBtn) {
                target.insertBefore(btn, nativeBtn.nextSibling);
            } else {
                target.appendChild(btn);
            }
        }
    };

    // Run on changes (SPA navigation)
    const observer = new MutationObserver(() => injectStoreButton());
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial run
    window.addEventListener('load', injectStoreButton);
    setInterval(injectStoreButton, 2000); // Fail-safe for rapid SPA navigation
}

// ── YouTube Dislike Restoration ────────────────────────────────────────────────
if (window.location.hostname.includes('youtube.com')) {
    let lastVideoId = null;

    const findDislikeButton = () => {
        // 1) Prefer an explicit aria-label button
        const candidate = Array.from(document.querySelectorAll('button')).find((btn) => {
            const label = (btn.getAttribute('aria-label') || '').toLowerCase();
            return label.includes('dislike') && !label.includes('remove') && !label.includes('not');
        });

        if (candidate) return candidate;

        // 2) Segmented like/dislike block
        const segmented = document.querySelector('#segmented-like-dislike-button') || document.querySelector('ytd-segmented-like-dislike-button-renderer');
        if (segmented) {
            const buttons = Array.from(segmented.querySelectorAll('ytd-toggle-button-renderer'));
            if (buttons.length >= 2) {
                return buttons[1].querySelector('#button') || buttons[1].querySelector('button');
            }
        }

        // 3) Last-resort selectors for legacy layouts
        return document.querySelector('ytd-toggle-button-renderer button[aria-label*="dislike" i]')
            || document.querySelector('button[aria-label*="dislike" i]')
            || document.querySelector('ytd-toggle-button-renderer:nth-child(2) button');
    };

    const getVideoId = () => {
        const params = new URLSearchParams(window.location.search);
        let videoId = params.get('v');

        if (!videoId) {
            // youtube short routes and embed URLs
            const path = window.location.pathname.split('/').filter(Boolean);
            if (path[0] === 'shorts' || path[0] === 'embed') {
                videoId = path[1];
            } else if (window.location.hostname === 'youtu.be') {
                videoId = path[0];
            }
        }

        if (!videoId) {
            const dataVideoId = document.querySelector('ytd-watch-flexy')?.getAttribute('video-id')
                || document.querySelector('ytd-player')?.getAttribute('video-id')
                || document.querySelector('meta[itemprop="videoId"]')?.getAttribute('content');
            if (dataVideoId) videoId = dataVideoId;
        }

        if (videoId && videoId.includes('?')) {
            videoId = videoId.split('?')[0];
        }
        return videoId;
    };

    const fetchDislikes = async (videoId) => {
        const sources = [
            `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`,
            `https://ytsrv.io/api/v1/dislike/${videoId}`,
            `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`
        ];

        for (const url of sources) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                const data = await response.json();
                const dislikes = Number(data?.dislikes ?? data?.rawDislikes ?? data?.dislike ?? data?.dislikesCount ?? 0);
                if (Number.isNaN(dislikes)) continue;
                return dislikes;
            } catch (err) {
                console.warn('Dislike fetch failed for', url, err);
            }
        }

        return null;
    };

    const injectDislikes = async () => {
        const videoId = getVideoId();
        if (!videoId || videoId === lastVideoId) return;

        lastVideoId = videoId;

        const dislikes = await fetchDislikes(videoId);
        if (dislikes === null) {
            console.warn('Dislike count unavailable');
            return;
        }

        const target = findDislikeButton();
        if (!target) {
            console.warn('YouTube dislike target not found');
            return;
        }

        const container = target.closest('ytd-toggle-button-renderer') || target;
        let countSpan = container.querySelector('.ocal-dislike-count');
        if (!countSpan) {
            countSpan = document.createElement('span');
            countSpan.className = 'ocal-dislike-count';
            countSpan.style.cssText = `
                margin-left: 8px;
                font-size: 14px;
                color: var(--yt-spec-text-primary, white);
                vertical-align: middle;
                font-weight: 500;
                opacity: 0.95;
            `;

            const label = container.querySelector('yt-formatted-string') || target;
            label.appendChild(countSpan);
        }

        countSpan.textContent = formatCount(dislikes);
    };


    const formatCount = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const startObserver = () => {
        if (!document.body) {
            setTimeout(startObserver, 100);
            return;
        }
        const obs = new MutationObserver(() => injectDislikes());
        obs.observe(document.body, { childList: true, subtree: true });
    };

    if (document.body) startObserver();
    else document.addEventListener('DOMContentLoaded', startObserver);

    // Watch for URL changes (for SPA navigation)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(injectDislikes, 1000); // Delay to allow page to load
        }
    }, 500);

    // Additional injection attempts for dynamic loading
    setTimeout(injectDislikes, 2000);
    setTimeout(injectDislikes, 5000);
}

// ── Portal Picture-in-Picture Engine ──────────────────────────────────────────
let currentVideo = null;
let pipOverlay = null;

const createPipOverlay = () => {
    if (pipOverlay) return pipOverlay;
    
    const container = document.createElement('div');
    container.id = 'ocal-pip-overlay';
    container.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 2147483647;
        display: none;
    `;
    
    const shadow = container.attachShadow({ mode: 'open' });
    const btn = document.createElement('div');
    btn.innerHTML = `
        <style>
            .pip-btn {
                background: #111111;
                color: #e8e8e8;
                border: 1px solid #252525;
                border-radius: 999px;
                padding: 10px 20px;
                font-family: 'Geist Sans', -apple-system, sans-serif;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                pointer-events: auto;
                box-shadow: none;
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                transform: translateY(12px);
                opacity: 0;
            }
            .pip-btn:hover {
                background: #1e1e1e;
                border-color: var(--accent, #09f0a0);
                color: #fff;
                transform: none;
                box-shadow: none;
            }
            .pip-btn.visible {
                transform: translateY(0);
                opacity: 1;
            }
            svg { transition: none; }
            .pip-btn:hover svg { transform: none; }
        </style>
        <div class="pip-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Pop-out Viewer
        </div>
    `;
    
    btn.onmouseenter = () => { if (pipOverlay) pipOverlay.btn.classList.add('visible'); };
    btn.onmouseleave = () => { if (pipOverlay) pipOverlay.btn.classList.remove('visible'); };
    
    const requestSmartPip = async () => {
        const video = currentVideo || document.querySelector('video');
        if (!video) {
            console.log('No video element found, cannot start PiP.');
            return;
        }

        // If native PiP is already active, do nothing, avoid duplicates
        if (document.pictureInPictureElement === video) {
            return;
        }

        if (document.pictureInPictureEnabled) {
            try {
                await video.requestPictureInPicture();
            } catch (err) {
                console.log('Smart PiP native failed, no custom popout (disabled):', err);
            }
        } else {
            console.log('Picture-in-Picture is not supported by this renderer context.');
        }
    };

    btn.onclick = (e) => {
        e.stopPropagation();
        requestSmartPip();
    };

    ipcRenderer.on('request-smart-pip', requestSmartPip);

    
    shadow.appendChild(btn);
    document.body.appendChild(container);
    pipOverlay = { container, btn: shadow.querySelector('.pip-btn') };
    return pipOverlay;
};

const updatePipOverlay = (video) => {
    const overlay = createPipOverlay();
    if (!video || video.readyState === 0) {
        overlay.container.style.display = 'none';
        return;
    }
    
    const rect = video.getBoundingClientRect();
    if (rect.width < 150 || rect.height < 100) {
        overlay.container.style.display = 'none';
        return;
    }

    overlay.container.style.display = 'block';
    overlay.container.style.top = `${window.scrollY + rect.top + 20}px`;
    overlay.container.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 75}px`;
};

let hideTimeout;

document.addEventListener('mouseover', (e) => {
    const video = e.target.closest('video');
    if (video) {
        clearTimeout(hideTimeout);
        currentVideo = video;
        updatePipOverlay(video);
        pipOverlay.btn.classList.add('visible');
    }
}, true);

document.addEventListener('mouseout', (e) => {
    const video = e.target.closest('video');
    if (video && pipOverlay) {
        // Prevent hiding if the mouse moved onto the overlay itself
        const toElement = e.relatedTarget;
        if (toElement && (toElement === pipOverlay.container || pipOverlay.container.contains(toElement))) {
            return;
        }
        
        // Add a slight debounce to prevent flickering
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (pipOverlay && pipOverlay.btn) {
                pipOverlay.btn.classList.remove('visible');
            }
        }, 150);
    }
}, true);

setInterval(() => {
    const video = document.querySelector('video');
    if (!video) {
        ipcRenderer.send('video-detected', false);
        return;
    }
    const isPlaying = !video.paused && !video.ended && video.readyState > 2;
    ipcRenderer.send('video-detected', isPlaying);
}, 2000);

// ── Direct-Link High Performance Receiver ──────────────────────────────────────
let pipPort = null;
let pipStreaming = false;
let pipOriginalStyles = new Map();

ipcRenderer.on('pip-port', (event) => {
    pipPort = event.ports[0];
    pipStreaming = true;
    startPipStream();
});

ipcRenderer.on('pip-activated', () => {
    const video = currentVideo || document.querySelector('video');
    if (!video) return;
    if (!pipOriginalStyles.has(video)) {
        pipOriginalStyles.set(video, video.style.cssText);
    }
    video.style.opacity = '0.35';
    video.style.filter = 'blur(0px)';

    // Inject Professional Suppression Style to hide YouTube's internal miniplayer/overlays
    const styleId = 'ocal-pip-suppression-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .ytp-miniplayer-ui, .ytp-pause-overlay, .ytp-ce-element, 
            .ytp-ad-overlay-container, .ytp-ad-skip-button-slot,
            .ytp-cards-button, .ytp-paid-content-overlay {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
            #movie_player.ad-showing .html5-main-video {
                opacity: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }
});

ipcRenderer.on('pip-stop-monitoring', () => {
    pipStreaming = false;
    if (pipPort) { pipPort.close(); pipPort = null; }
    
    // Restore original video state
    const video = currentVideo || document.querySelector('video');
    if (video && pipOriginalStyles.has(video)) {
        video.style.cssText = pipOriginalStyles.get(video);
        pipOriginalStyles.delete(video);
    }

    // Remove suppression style
    const style = document.getElementById('ocal-pip-suppression-style');
    if (style) style.remove();
});

ipcRenderer.on('pip-control-command', (event, data) => {
    if (!currentVideo) return;
    switch (data.action) {
        case 'toggle-play': currentVideo.paused ? currentVideo.play() : currentVideo.pause(); break;
        case 'seek': currentVideo.currentTime = data.value; break;
        case 'volume': currentVideo.volume = data.value; break;
        case 'speed': currentVideo.playbackRate = data.value; break;
    }
});

let captureCanvas = null;
let captureCtx = null;
let frameCount = 0;

const startPipStream = async () => {
    if (!pipStreaming || !currentVideo || !pipPort) return;
    
    const sendFrame = () => {
        if (!pipStreaming || !currentVideo || currentVideo.paused || currentVideo.ended) {
            setTimeout(startPipStream, 500); // Check again later
            return;
        }

        try {
            // Send metadata updates at 10fps for smooth timeline/sync
            if (frameCount++ % 6 === 0) {
                let bufferedPercent = 0;
                if (currentVideo.buffered.length > 0) {
                    bufferedPercent = (currentVideo.buffered.end(currentVideo.buffered.length - 1) / currentVideo.duration) * 100;
                }
                
                let title = document.title;
                if (title.includes('- YouTube')) title = title.replace(' - YouTube', '');
                
                pipPort.postMessage({
                    type: 'status',
                    data: {
                        isPlaying: !currentVideo.paused, currentTime: currentVideo.currentTime, duration: currentVideo.duration,
                        volume: currentVideo.volume, speed: currentVideo.playbackRate, buffered: bufferedPercent,
                        width: currentVideo.videoWidth || 16, height: currentVideo.videoHeight || 9,
                        title: title, muted: currentVideo.muted, looping: currentVideo.loop
                    }
                });
            }

            const targetWidth = 480;
            const targetHeight = Math.round((currentVideo.videoHeight / currentVideo.videoWidth) * targetWidth) || 270;
            
            // Ultra-Fast Zero Copy Transfer using ArrayBuffer Memory (Safe across IPC boundary)
            if (!captureCanvas) {
                captureCanvas = new OffscreenCanvas(targetWidth, targetHeight);
                captureCtx = captureCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
            }
            if (captureCanvas.width !== targetWidth) {
                captureCanvas.width = targetWidth; captureCanvas.height = targetHeight;
            }
            
            captureCtx.drawImage(currentVideo, 0, 0, targetWidth, targetHeight);
            const imageData = captureCtx.getImageData(0, 0, targetWidth, targetHeight);
            
            pipPort.postMessage({ 
                type: 'frame', 
                buffer: imageData.data.buffer, 
                width: targetWidth, 
                height: targetHeight 
            }, [imageData.data.buffer]); // Memory transfer
            
        } catch (e) {
            // Memory buffers might fail if video dimensions change unexpectedly. Safe to ignore.
        }
        
        if (currentVideo.requestVideoFrameCallback) {
            currentVideo.requestVideoFrameCallback(sendFrame);
        } else {
            requestAnimationFrame(sendFrame);
        }
    };
    
    if (currentVideo.requestVideoFrameCallback) {
        currentVideo.requestVideoFrameCallback(sendFrame);
    } else {
        requestAnimationFrame(sendFrame);
    }
};

ipcRenderer.on('pip-stop-monitoring', () => {
    pipStreaming = false;
    if (pipPort) { pipPort.close(); pipPort = null; }
});


// ── Global Custom Scrollbar Injection ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // Only inject if there isn't one already (to prevent duplicates on multi-loads)
    if (document.getElementById('ocal-custom-scrollbar')) return;

    const { webFrame } = require('electron');
    if (webFrame) {
        webFrame.insertCSS(`
            html {
                scroll-behavior: smooth !important;
            }
            *, html, body {
                scrollbar-color: initial !important;
                scrollbar-width: initial !important;
            }
            *::-webkit-scrollbar, html::-webkit-scrollbar, body::-webkit-scrollbar {
                width: 6px !important;
                height: 6px !important;
                background: transparent !important;
            }
            *::-webkit-scrollbar-track, html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
                background: transparent !important;
            }
            *::-webkit-scrollbar-thumb, html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                background: rgba(128, 128, 128, 0.25) !important;
                border-radius: 10px !important;
            }
            *::-webkit-scrollbar-thumb:hover, html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover {
                background: rgba(128, 128, 128, 0.55) !important;
            }

            /* ── YouTube Ad Slot DOM Removal ── */
            ytd-ad-slot-renderer,
            #masthead-ad,
            ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
            ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
            ytd-rich-section-renderer:has(ytd-ad-slot-renderer),
            ytd-in-feed-ad-layout-renderer,
            ytd-promoted-sparkles-web-renderer,
            ytd-promoted-video-renderer,
            ytd-banner-promoted-video-renderer,
            ytd-player-legacy-desktop-watch-ads-renderer,
            ytd-action-companion-ad-renderer {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                visibility: hidden !important;
            }
        `);
    }
    
    // Global internal page theme synchronization
    if (window.location.protocol === 'file:') {
        function applyGlobalTheme(s) {
            if (!s) return;
            if (s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
            if (s.accentColor) {
                document.documentElement.style.setProperty('--accent', s.accentColor);
                document.documentElement.style.setProperty('--accent-glow', `color-mix(in srgb, ${s.accentColor} 30%, transparent)`);
                document.documentElement.style.setProperty('--accent-dim', `color-mix(in srgb, ${s.accentColor} 12%, transparent)`);
                document.documentElement.style.setProperty('--accent-border', s.accentColor);
            }
        }
        ipcRenderer.invoke('get-settings').then(applyGlobalTheme);
        ipcRenderer.on('settings-changed', (e, s) => applyGlobalTheme(s));
    }
});

// Ocal Media Master Bridge
window.addEventListener('ocal-media-detected', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
        ipcRenderer.send('media-detected', e.detail);
    }
});

window.addEventListener('trigger-media-popup', () => {
    // Port to internal trigger that renderer.js listens for
    window.dispatchEvent(new CustomEvent('trigger-media-popup-internal'));
});

// Dismiss overlays/sidebars when clicking inside the page content
window.addEventListener('mousedown', () => {
    const href = window.location.href;
    const isUIOverlay = 
        href.includes('ai-sidebar.html') || 
        href.includes('ocal://ai-sidebar') || 
        href.includes('sidebars.html') ||
        href.includes('tab-context.html') ||
        href.includes('tabgroup.html') ||
        href.includes('bm-dropdown.html') ||
        href.includes('downloads.html') ||
        href.includes('shield-popup.html') ||
        href.includes('suggestions.html') ||
        href.includes('site-info.html') ||
        href.includes('extensions-popup.html') ||
        href.includes('media-popup.html') ||
        href.includes('site-settings.html') ||
        href.includes('certificate-viewer.html') ||
        href.includes('welcome.html');

    if (isUIOverlay) {
        return; // Ignore clicks inside the UI overlays themselves
    }
    // Only send dismiss if click is not on the floating close button
    ipcRenderer.send('hide-popups');
});



// ── Safari-like Inertial Scroll for Mouse Wheels (Windows/Linux) ──────────────────
(function() {
    if (typeof window === 'undefined' || !window.document || !window.document.documentElement) return;
    
    // macOS already has native momentum scrolling
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac) return;

    let isMoving = false;
    const ease = 0.12; // Lower = smoother / slower deceleration

    function getScrollParent(element, direction) {
        let parent = element;
        while (parent && parent !== document.body && parent !== document.documentElement) {
            const style = window.getComputedStyle(parent);
            const overflow = direction === 'y' ? style.overflowY : style.overflowX;
            const hasScrollbar = direction === 'y' 
                ? parent.scrollHeight > parent.clientHeight 
                : parent.scrollWidth > parent.clientWidth;
            if (hasScrollbar && (overflow === 'auto' || overflow === 'scroll')) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    }

    let activeElement = null;
    let activeTargetX = 0;
    let activeTargetY = 0;

    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) return; // Ignore pinch-to-zoom

        // Detect trackpad scrolling (fractional values or small steps)
        const isTrackpad = (Math.abs(e.deltaY) < 20 && e.deltaY !== 0) || (e.deltaY % 1 !== 0) || (e.deltaX % 1 !== 0);
        if (isTrackpad) return;

        const target = e.target;
        const scrollContainer = getScrollParent(target, Math.abs(e.deltaY) > Math.abs(e.deltaX) ? 'y' : 'x');
        if (!scrollContainer) return;

        const isWindow = scrollContainer === document.documentElement || scrollContainer === document.body;
        const currentScrollX = isWindow ? window.scrollX : scrollContainer.scrollLeft;
        const currentScrollY = isWindow ? window.scrollY : scrollContainer.scrollTop;

        // Check boundaries to enable scroll chaining
        const isScrollingDown = e.deltaY > 0;
        const isScrollingUp = e.deltaY < 0;
        const isScrollingRight = e.deltaX > 0;
        const isScrollingLeft = e.deltaX < 0;

        let canScroll = false;
        if (Math.abs(e.deltaY) > 0) {
            const maxScrollY = isWindow 
                ? (document.documentElement.scrollHeight - window.innerHeight) 
                : (scrollContainer.scrollHeight - scrollContainer.clientHeight);
            if ((isScrollingDown && currentScrollY < maxScrollY - 1) || (isScrollingUp && currentScrollY > 1)) {
                canScroll = true;
            }
        }
        if (Math.abs(e.deltaX) > 0) {
            const maxScrollX = isWindow 
                ? (document.documentElement.scrollWidth - window.innerWidth) 
                : (scrollContainer.scrollWidth - scrollContainer.clientWidth);
            if ((isScrollingRight && currentScrollX < maxScrollX - 1) || (isScrollingLeft && currentScrollX > 1)) {
                canScroll = true;
            }
        }

        if (!canScroll) return;

        e.preventDefault();

        if (activeElement !== scrollContainer) {
            activeElement = scrollContainer;
            activeTargetX = isWindow ? window.scrollX : scrollContainer.scrollLeft;
            activeTargetY = isWindow ? window.scrollY : scrollContainer.scrollTop;
        }

        activeTargetX += e.deltaX;
        activeTargetY += e.deltaY;

        const limitY = isWindow 
            ? (document.documentElement.scrollHeight - window.innerHeight) 
            : (scrollContainer.scrollHeight - scrollContainer.clientHeight);
        const limitX = isWindow 
            ? (document.documentElement.scrollWidth - window.innerWidth) 
            : (scrollContainer.scrollWidth - scrollContainer.clientWidth);

        activeTargetX = Math.max(0, Math.min(activeTargetX, limitX));
        activeTargetY = Math.max(0, Math.min(activeTargetY, limitY));

        if (!isMoving) {
            isMoving = true;
            requestAnimationFrame(updateScroll);
        }
    }, { passive: false });

    function updateScroll() {
        if (!activeElement) {
            isMoving = false;
            return;
        }

        const isWindow = activeElement === document.documentElement || activeElement === document.body;
        const currentScrollX = isWindow ? window.scrollX : activeElement.scrollLeft;
        const currentScrollY = isWindow ? window.scrollY : activeElement.scrollTop;

        const diffX = activeTargetX - currentScrollX;
        const diffY = activeTargetY - currentScrollY;

        if (Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5) {
            if (isWindow) {
                window.scrollTo(activeTargetX, activeTargetY);
            } else {
                activeElement.scrollLeft = activeTargetX;
                activeElement.scrollTop = activeTargetY;
            }
            isMoving = false;
            return;
        }

        const stepX = currentScrollX + diffX * ease;
        const stepY = currentScrollY + diffY * ease;

        if (isWindow) {
            window.scrollTo(stepX, stepY);
        } else {
            activeElement.scrollLeft = stepX;
            activeElement.scrollTop = stepY;
        }

        requestAnimationFrame(updateScroll);
    }
})();

