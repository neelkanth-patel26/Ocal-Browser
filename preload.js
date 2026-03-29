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
  newTab:       ()        => ipcRenderer.send('new-tab'),
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

  // Bookmarks
  toggleBookmark: (bm)    => ipcRenderer.send('toggle-bookmark', bm),

  // Generic send/receive/invoke
  send: (channel, data)   => ipcRenderer.send(channel, data),
  on:   (channel, cb)     => ipcRenderer.on(channel, (e, d) => cb(e, d)),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),

  // Extensions
  installExtension: (id)   => ipcRenderer.invoke('install-extension', id),
  getExtensions:    ()     => ipcRenderer.invoke('get-extensions'),
  removeExtension:  (id)   => ipcRenderer.invoke('remove-extension', id),
  toggleExtension:  (id, enabled) => ipcRenderer.invoke('toggle-extension', { id, enabled }),

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
  onFaviconUpdated:    (cb) => ipcRenderer.on('favicon-updated',       (e, d)    => cb(d)),
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
                background: rgba(15, 15, 20, 0.65);
                backdrop-filter: blur(16px) saturate(180%);
                color: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 999px;
                padding: 10px 20px;
                font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                pointer-events: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1);
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                transform: translateY(12px) scale(0.95);
                opacity: 0;
            }
            .pip-btn:hover {
                background: rgba(168, 85, 247, 0.85); /* Premium Purple Glow on Hover */
                border-color: rgba(168, 85, 247, 0.5);
                color: #fff;
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 12px 40px rgba(168, 85, 247, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3);
            }
            .pip-btn.visible {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
            svg { transition: transform 0.3s ease; }
            .pip-btn:hover svg { transform: scale(1.1) translate(1px, -1px); }
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
});

ipcRenderer.on('pip-stop-monitoring', () => {
    pipStreaming = false;
    if (pipPort) { pipPort.close(); pipPort = null; }
    const video = currentVideo || document.querySelector('video');
    if (video && pipOriginalStyles.has(video)) {
        video.style.cssText = pipOriginalStyles.get(video);
        pipOriginalStyles.delete(video);
    }
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
            // Send metadata updates at 1fps
            if (frameCount++ % 30 === 0) {
                let bufferedPercent = 0;
                if (currentVideo.buffered.length > 0) {
                    bufferedPercent = (currentVideo.buffered.end(currentVideo.buffered.length - 1) / currentVideo.duration) * 100;
                }
                
                let title = document.title;
                if (title.includes('- YouTube')) title = title.replace(' - YouTube', '');
                
                pipPort.postMessage({
                    type: 'status',
                    data: {
                        isPlaying: true, currentTime: currentVideo.currentTime, duration: currentVideo.duration,
                        volume: currentVideo.volume, speed: currentVideo.playbackRate, buffered: bufferedPercent,
                        width: currentVideo.videoWidth || 16, height: currentVideo.videoHeight || 9,
                        title: title
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

// ── Ocal VPN v4: Total Regional Masking (Geolocation Mocking) ──────────────────
(async () => {
    let currentSettings = await ipcRenderer.invoke('get-settings');
    
    const MOCK_COORDS = {
        'us': { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
        'uk': { latitude: 51.5074, longitude: -0.1278 },  // London
        'de': { latitude: 52.5200, longitude: 13.4050 },  // Berlin
        'jp': { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
        'in': { latitude: 23.0225, longitude: 72.5714 }   // Ahmedabad
    };

    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    const originalWatchPosition = navigator.geolocation.watchPosition;

    const mockGeolocation = (success, error, options) => {
        const region = currentSettings.vpnRegion || 'auto';
        const coords = MOCK_COORDS[region] || MOCK_COORDS['us'];

        if (currentSettings.vpnEnabled) {
            console.log(`[VPN v4] Mocking Geolocation for region: ${region}`);
            const mockResponse = {
                coords: {
                    ...coords,
                    accuracy: 10,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                },
                timestamp: Date.now()
            };
            success(mockResponse);
        } else {
            originalGetCurrentPosition.apply(navigator.geolocation, [success, error, options]);
        }
    };

    navigator.geolocation.getCurrentPosition = mockGeolocation;
    navigator.geolocation.watchPosition = (success, error, options) => {
        if (currentSettings.vpnEnabled) {
            mockGeolocation(success, error, options);
            return 12345; // Dummy ID
        }
        return originalWatchPosition.apply(navigator.geolocation, [success, error, options]);
    };

    ipcRenderer.on('settings-changed', (e, newSettings) => {
        currentSettings = newSettings;
    });
})();

// ── Global Custom Scrollbar Injection ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // Only inject if there isn't one already (to prevent duplicates on multi-loads)
    if (document.getElementById('ocal-custom-scrollbar')) return;

    const style = document.createElement('style');
    style.id = 'ocal-custom-scrollbar';
    style.textContent = `
        ::-webkit-scrollbar {
            width: 14px !important;
            height: 14px !important;
            background: transparent !important;
        }
        ::-webkit-scrollbar-track {
            background: transparent !important;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(120, 120, 120, 0.35) !important;
            border-radius: 10px !important;
            border: 3px solid transparent !important;
            background-clip: padding-box !important;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(168, 85, 247, 0.7) !important; /* Premium Purple Accent */
        }
        ::-webkit-scrollbar-corner {
            background: transparent !important;
        }
    `;
    
    // Some sites overwrite document.body early, so inserting into documentElement is safer
    document.documentElement.appendChild(style);
});
