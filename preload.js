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

// ── Ocal Turbo-Shield: Cosmetic Ad Collapser & Anti-Adblock Defuser ─────────
(function() {
    const isInternal = window.location.protocol === 'ocal:' || window.location.protocol === 'file:';
    if (isInternal) return;

    // 1. Anti-Adblock Defuser Stubs (Neutralizes anti-adblock blocker scripts)
    try {
        window.canRunAds = true;
        window.isAdBlockActive = false;
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.loaded = true;
        window.adsbygoogle.push = function() { return 1; };

        // Defuse popular open-source anti-adblock libraries
        const noopObj = {
            on: function(isAdBlock, callback) { if (!isAdBlock && typeof callback === 'function') { try { callback(); } catch(e){} } return this; },
            onDetected: function() { return this; },
            onNotDetected: function(callback) { if (typeof callback === 'function') { try { callback(); } catch(e){} } return this; },
            check: function() { return true; },
            setOption: function() { return this; },
            clearEvent: function() { return this; }
        };
        window.fuckAdBlock = noopObj;
        window.BlockAdBlock = noopObj;
        window.SnackPack = { isAdBlock: false };
    } catch (e) {}

    // 2. High-Speed Cosmetic Ad Hiding Stylesheet (Collapses ad containers before render)
    const COSMETIC_AD_CSS = `
        .adsbygoogle,
        [id^="google_ads_"],
        [id*="google_ads_iframe"],
        [class*="google-auto-placed"],
        .ad-banner, .ad-container, .ad-wrapper, .ad-slot, .ad_slot,
        .advertisement, .advertising-container, .sponsored-post,
        .sponsored-content, .native-ad, .dfp-ad, .taboola-ad,
        .outbrain-ad, .outbrain_widget, .trc_related_container,
        div[data-ad-unit], div[data-ad-slot], div[data-ad-name],
        div[data-adzone], div[data-dfp-id], iframe[src*="doubleclick.net"],
        iframe[src*="googlesyndication.com"], iframe[src*="adservice"],
        iframe[id*="google_ads"], [class*="AdSlot"], [class*="ad_wrapper"],
        .ad-sticky, .ad-overlay, .floating-ad, .popunder,
        ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-banner-promo-renderer {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            position: absolute !important;
            top: -9999px !important;
            left: -9999px !important;
            overflow: hidden !important;
        }
    `;

    function injectCosmeticStyle() {
        if (document.getElementById('ocal-turbo-shield-style')) return;
        const style = document.createElement('style');
        style.id = 'ocal-turbo-shield-style';
        style.textContent = COSMETIC_AD_CSS;
        const target = document.head || document.documentElement;
        if (target) target.appendChild(style);
    }

    if (document.head || document.documentElement) {
        injectCosmeticStyle();
    } else {
        document.addEventListener('DOMContentLoaded', injectCosmeticStyle);
    }
})();

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
  bypassSSL:    (domain, url) => ipcRenderer.send('bypass-ssl', domain, url),
  bypassSecurity: (domain, url) => ipcRenderer.send('bypass-security', domain, url),

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
  getAmbientTracks:    ()        => ipcRenderer.invoke('get-ambient-tracks'),
  selectCustomAmbientFile: ()    => ipcRenderer.invoke('select-custom-ambient-file'),

  // Bookmarks
  toggleBookmark: (bm)    => ipcRenderer.send('toggle-bookmark', bm),

  // Generic send/receive/invoke
  send: (channel, ...args)   => ipcRenderer.send(channel, ...args),
  on:   (channel, cb)         => ipcRenderer.on(channel, (e, d) => cb(e, d)),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

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
  clearProfileData: (id)   => ipcRenderer.send('clear-profile-data', id),

  // ── Listeners ──────────────────────────────────────────────────────────
  onTabsChanged:       (cb) => ipcRenderer.on('tabs-changed',          (e, d)    => cb(d)),
  onUpdateURL:         (cb) => ipcRenderer.on('url-updated',           (e, d)    => cb(d)),
  onUpdateTitle:       (cb) => ipcRenderer.on('title-updated',         (e, d)    => cb(d)),
  onSettingsChanged:   (cb) => ipcRenderer.on('settings-changed',      (e, s)    => cb(s)),

  // Both renderer and sidebars use bookmarks-changed; renderer gets full object
  onBookmarksUpdated:  (cb) => ipcRenderer.on('bookmarks-changed',     (e, d)    => cb(d)),
  onBookmarksChanged:  (cb) => ipcRenderer.on('bookmarks-changed',     (e, d)    => cb(d)),
  onSuggestionsUpdated: (cb) => ipcRenderer.on('update-suggestions',   (e, d)    => cb(d)),

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
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }
            *::-webkit-scrollbar, html::-webkit-scrollbar, body::-webkit-scrollbar {
                width: 0px !important;
                height: 0px !important;
                display: none !important;
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
    if (window.location.protocol === 'file:' || window.location.protocol === 'ocal:') {
        function getContrastColor(color) {
            if (!color) return '#FFFFFF';
            let hex = color.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const r = parseInt(hex.substring(0, 2), 16) || 0;
            const g = parseInt(hex.substring(2, 4), 16) || 0;
            const b = parseInt(hex.substring(4, 6), 16) || 0;
            const yiq = (r * 299 + g * 587 + b * 114) / 1000;
            return yiq >= 150 ? '#111111' : '#FFFFFF';
        }

        function applyGlobalTheme(s) {
            if (!s) return;
            const theme = s.themeMode || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            if (document.body) document.body.setAttribute('data-theme', theme);
            try { localStorage.setItem('ocal-settings-theme', theme); } catch (e) {}

            if (s.accentColor) {
                const contrast = getContrastColor(s.accentColor);
                document.documentElement.style.setProperty('--accent', s.accentColor);
                document.documentElement.style.setProperty('--accent-glow', `color-mix(in srgb, ${s.accentColor} 30%, transparent)`);
                document.documentElement.style.setProperty('--accent-dim', `color-mix(in srgb, ${s.accentColor} 12%, transparent)`);
                document.documentElement.style.setProperty('--accent-border', s.accentColor);
                document.documentElement.style.setProperty('--accent-text', contrast);

                if (document.body) {
                    document.body.style.setProperty('--accent', s.accentColor);
                    document.body.style.setProperty('--accent-glow', `color-mix(in srgb, ${s.accentColor} 30%, transparent)`);
                    document.body.style.setProperty('--accent-dim', `color-mix(in srgb, ${s.accentColor} 12%, transparent)`);
                    document.body.style.setProperty('--accent-border', s.accentColor);
                    document.body.style.setProperty('--accent-text', contrast);
                }
                try { localStorage.setItem('ocal-settings-accent', s.accentColor); } catch (e) {}
            }
        }
        ipcRenderer.invoke('get-settings').then(applyGlobalTheme).catch(() => {});
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



// ── Safari / iOS Inertial Smooth Scroll Engine (Mac/iOS Momentum Feel) ──────────────────
(function() {
    if (typeof window === 'undefined' || !window.document || !window.document.documentElement) return;
    
    // Inject smooth scrolling CSS globally
    const injectCSS = () => {
        if (document.getElementById('ocal-inertia-scroll-style')) return;
        const style = document.createElement('style');
        style.id = 'ocal-inertia-scroll-style';
        style.textContent = `
            html, body {
                scroll-behavior: smooth !important;
                -webkit-overflow-scrolling: touch !important;
            }
        `;
        if (document.head) document.head.appendChild(style);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCSS);
    } else {
        injectCSS();
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac) return;

    let activeElement = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isMoving = false;
    const easeFactor = 0.14; // macOS Safari interpolation constant

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

    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const scrollContainer = getScrollParent(e.target, Math.abs(e.deltaY) > Math.abs(e.deltaX) ? 'y' : 'x');
        if (!scrollContainer) return;

        const isWindow = scrollContainer === document.documentElement || scrollContainer === document.body;
        const maxScrollY = isWindow 
            ? (document.documentElement.scrollHeight - window.innerHeight) 
            : (scrollContainer.scrollHeight - scrollContainer.clientHeight);
        const maxScrollX = isWindow 
            ? (document.documentElement.scrollWidth - window.innerWidth) 
            : (scrollContainer.scrollWidth - scrollContainer.clientWidth);

        if (maxScrollY <= 0 && maxScrollX <= 0) return;

        const startX = isWindow ? window.scrollX : scrollContainer.scrollLeft;
        const startY = isWindow ? window.scrollY : scrollContainer.scrollTop;

        if (activeElement !== scrollContainer || !isMoving) {
            activeElement = scrollContainer;
            currentX = startX;
            currentY = startY;
            targetX = startX;
            targetY = startY;
        }

        const multiplier = Math.abs(e.deltaY) > 50 ? 1.1 : 0.85;
        targetX = Math.max(0, Math.min(maxScrollY > 0 ? maxScrollY : 0, targetY + e.deltaY * multiplier));
        targetX = Math.max(0, Math.min(maxScrollX > 0 ? maxScrollX : 0, targetX + e.deltaX * multiplier));

        if (!isMoving) {
            isMoving = true;
            step();
        }
    }, { passive: true });

    function step() {
        if (!activeElement) {
            isMoving = false;
            return;
        }

        const isWindow = activeElement === document.documentElement || activeElement === document.body;
        const diffX = targetX - currentX;
        const diffY = targetY - currentY;

        if (Math.abs(diffX) < 0.4 && Math.abs(diffY) < 0.4) {
            currentX = targetX;
            currentY = targetY;
            if (isWindow) {
                window.scrollTo(currentX, currentY);
            } else {
                activeElement.scrollLeft = currentX;
                activeElement.scrollTop = currentY;
            }
            isMoving = false;
            return;
        }

        currentX += diffX * easeFactor;
        currentY += diffY * easeFactor;

        if (isWindow) {
            window.scrollTo(currentX, currentY);
        } else {
            activeElement.scrollLeft = currentX;
            activeElement.scrollTop = currentY;
        }

        requestAnimationFrame(step);
    }
})();

// ── Browser-Wide Real-Time Autocorrect & Smart Typing Engine ────────────
(function() {
    console.log('[Ocal Autocorrect] Initializing Browser-Wide Autocorrect Engine...');

    const TYPO_DICTIONARY = {
        // Common Misspellings & Typos
        'teh': 'the', 'taht': 'that', 'tihs': 'this', 'waht': 'what', 'wihch': 'which',
        'recieve': 'receive', 'seperate': 'separate', 'definately': 'definitely',
        'definatly': 'definitely', 'becuase': 'because', 'becasue': 'because',
        'beleive': 'believe', 'occured': 'occurred', 'truely': 'truly',
        'tommorow': 'tomorrow', 'tommorrow': 'tomorrow', 'goverment': 'government',
        'enviroment': 'environment', 'maintainance': 'maintenance',
        'pronounciation': 'pronunciation', 'accommodate': 'accommodate',
        'acommodate': 'accommodate', 'adress': 'address', 'answere': 'answer',
        'apparant': 'apparent', 'argumant': 'argument', 'basicly': 'basically',
        'beggining': 'beginning', 'calender': 'calendar', 'colleague': 'colleague',
        'collegue': 'colleague', 'comming': 'coming', 'commitement': 'commitment',
        'congratulations': 'congratulations', 'congratulation': 'congratulations',
        'curiousity': 'curiosity', 'diferent': 'different', 'dissapoint': 'disappoint',
        'embarass': 'embarrass', 'equipment': 'equipment', 'existance': 'existence',
        'familar': 'familiar', 'foren': 'foreign', 'fourty': 'forty',
        'furthur': 'further', 'guarantee': 'guarantee', 'garantee': 'guarantee',
        'harrass': 'harass', 'heigth': 'height', 'immediate': 'immediate',
        'independant': 'independent', 'knowlege': 'knowledge', 'neccessary': 'necessary',
        'necesary': 'necessary', 'noticable': 'noticeable', 'occassion': 'occasion',
        'oppurtunity': 'opportunity', 'persue': 'pursue', 'posession': 'possession',
        'referance': 'reference', 'relavant': 'relevant', 'resperator': 'respirator',
        'rhyme': 'rhyme', 'rythm': 'rhythm', 'succesful': 'successful',
        'suprise': 'surprise', 'unforseen': 'unforeseen', 'until': 'until',
        'untill': 'until', 'usally': 'usually', 'weird': 'weird', 'wierd': 'weird',

        // Contractions & Apostrophes
        'dont': "don't", 'cant': "can't", 'wont': "won't", 'isnt': "isn't",
        'arent': "aren't", 'wasnt': "wasn't", 'werent': "weren't", 'hasnt': "hasn't",
        'havent': "haven't", 'hadnt': "hadn't", 'doesnt': "doesn't",
        'shouldnt': "shouldn't", 'couldnt': "couldn't", 'wouldnt': "wouldn't",
        'didnt': "didn't", 'youre': "you're", 'theyre': "they're", 'were': "we're",
        'hes': "he's", 'shes': "she's", 'its': "it's", 'whos': "who's",
        'whats': "what's", 'wheres': "where's", 'whens': "when's", 'hows': "how's",
        'theres': "there's", 'heres': "here's", 'im': "I'm", 'ive': "I've",
        'ill': "I'll", 'id': "I'd"
    };

    function matchCase(original, replacement) {
        if (!original || !replacement) return replacement;
        if (original === original.toUpperCase()) return replacement.toUpperCase();
        if (original[0] === original[0].toUpperCase()) {
            return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement.toLowerCase();
    }

    function checkAndCorrectWord(word) {
        if (!word) return null;
        const cleanLower = word.toLowerCase().replace(/[^a-z']/g, '');
        if (cleanLower === 'i') return 'I';
        if (TYPO_DICTIONARY[cleanLower]) {
            return matchCase(word, TYPO_DICTIONARY[cleanLower]);
        }
        return null;
    }

    function autocorrectTarget(target) {
        if (!target) return;
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        const inputType = (target.type || '').toLowerCase();
        if (inputType === 'password' || inputType === 'email' || inputType === 'url' || inputType === 'number') return;
        if (target.getAttribute && target.getAttribute('data-no-autocorrect') === 'true') return;

        if (tag === 'input' || tag === 'textarea') {
            const val = target.value;
            const pos = target.selectionStart;
            if (pos === null || pos === undefined) return;

            const textBefore = val.slice(0, pos);
            const match = textBefore.match(/([a-zA-Z']+)([\s,.!?:;]+)$/);
            if (match) {
                const word = match[1];
                const suffix = match[2];
                const corrected = checkAndCorrectWord(word);
                if (corrected && corrected !== word) {
                    const wordStart = textBefore.length - match[0].length;
                    const newVal = val.slice(0, wordStart) + corrected + suffix + val.slice(pos);
                    target.value = newVal;
                    const newPos = wordStart + corrected.length + suffix.length;
                    target.setSelectionRange(newPos, newPos);
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
    }

    document.addEventListener('input', (e) => autocorrectTarget(e.target), true);
    document.addEventListener('keydown', (e) => {
        if ([' ', 'Enter', 'Tab', '.', ',', '!', '?', ';', ':'].includes(e.key)) {
            setTimeout(() => autocorrectTarget(e.target), 0);
        }
    }, true);
})();

// ── Password Vault Form Interceptor & Autofill Engine ──────────────
(function() {
    let currentSavedCredsForDomain = [];
    let activeAutofillPicker = null;

    async function refreshSavedCreds() {
        try {
            if (ipcRenderer && ipcRenderer.invoke) {
                const creds = await ipcRenderer.invoke('passwords:get-for-autofill', window.location.hostname);
                if (creds && Array.isArray(creds)) {
                    currentSavedCredsForDomain = creds;
                }
            }
        } catch (e) {}
    }

    refreshSavedCreds();

    function hideAutofillPicker() {
        if (activeAutofillPicker) {
            activeAutofillPicker.remove();
            activeAutofillPicker = null;
        }
    }

    function isCredentialInput(el) {
        if (!el || el.tagName !== 'INPUT') return false;
        const type = (el.type || 'text').toLowerCase();
        if (type === 'password' || type === 'email') return true;
        const name = (el.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const autocomplete = (el.autocomplete || '').toLowerCase();
        if (autocomplete.includes('username') || autocomplete.includes('email') || autocomplete.includes('current-password')) return true;
        if (name.includes('user') || name.includes('login') || name.includes('email') || name.includes('account') || name.includes('pass')) return true;
        if (id.includes('user') || id.includes('login') || id.includes('email') || id.includes('account') || id.includes('pass')) return true;
        return false;
    }

    async function showAutofillPicker(inputEl) {
        await refreshSavedCreds();
        if (!currentSavedCredsForDomain || currentSavedCredsForDomain.length === 0) return;
        hideAutofillPicker();

        const s = _lastCachedSettings;
        const isLight = s.themeMode === 'light';
        const accent = s.accentColor || '#09f0a0';

        const rect = inputEl.getBoundingClientRect();
        const picker = document.createElement('div');
        picker.id = 'ocal-autofill-picker';
        activeAutofillPicker = picker;

        const pickerBg = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(18, 20, 29, 0.96)';
        const pickerBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
        const textColor = isLight ? '#0f172a' : '#f8fafc';
        const subTextColor = isLight ? '#64748b' : '#94a3b8';
        const rowHoverBg = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.07)';

        const top = window.scrollY + rect.bottom + 6;
        const left = window.scrollX + rect.left;
        const width = Math.max(260, rect.width);

        picker.style.cssText = `
            position: absolute;
            top: ${top}px;
            left: ${left}px;
            width: ${width}px;
            max-width: 380px;
            z-index: 2147483647;
            background: ${pickerBg};
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid ${pickerBorder};
            border-radius: 12px;
            padding: 6px;
            box-shadow: 0 12px 32px rgba(0,0,0, ${isLight ? '0.15' : '0.5'}), 0 0 0 1px ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'};
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: ${textColor};
            display: flex;
            flex-direction: column;
            gap: 4px;
            user-select: none;
            box-sizing: border-box;
            animation: ocalPickerFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        let rowsHtml = '';
        currentSavedCredsForDomain.forEach((cred) => {
            rowsHtml += `
                <div class="ocal-autofill-row" data-cred-id="${cred.id}" data-username="${cred.username}" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                    <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
                        <div style="width: 28px; height: 28px; border-radius: 8px; background: color-mix(in srgb, ${accent} 16%, transparent); border: 1px solid color-mix(in srgb, ${accent} 35%, transparent); display: flex; align-items: center; justify-content: center; color: ${accent}; flex-shrink: 0;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                                <path d="m21 2-9.6 9.6"></path>
                                <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                            </svg>
                        </div>
                        <div style="display: flex; flex-direction: column; min-width: 0;">
                            <span style="font-weight: 700; font-size: 12.5px; color: ${textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cred.username}</span>
                            <span style="font-size: 10px; color: ${subTextColor};">Ocal Vault</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: ${accent}; padding: 3px 8px; background: color-mix(in srgb, ${accent} 12%, transparent); border-radius: 6px; flex-shrink: 0;">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Fill
                    </div>
                </div>
            `;
        });

        picker.innerHTML = `
            <style>
                @keyframes ocalPickerFadeIn {
                    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .ocal-autofill-row:hover {
                    background: ${rowHoverBg} !important;
                }
            </style>
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 6px 8px; border-bottom: 1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}; font-size: 10.5px; color: ${subTextColor}; font-weight: 600;">
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Saved Logins (${currentSavedCredsForDomain.length})
                </span>
                <span style="font-size: 9.5px; opacity: 0.7;">Device Auth Required</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
                ${rowsHtml}
            </div>
        `;

        document.body.appendChild(picker);

        // Bind click on each account row
        picker.querySelectorAll('.ocal-autofill-row').forEach(row => {
            row.addEventListener('mousedown', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const credId = row.getAttribute('data-cred-id');
                const username = row.getAttribute('data-username');
                
                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: ${accent}; font-weight: 600; padding: 4px 0;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        <span>Verifying Windows identity...</span>
                    </div>
                `;

                try {
                    const res = await ipcRenderer.invoke('passwords:request-autofill', {
                        id: credId,
                        username: username,
                        domain: window.location.hostname
                    });

                    if (res && res.success && res.password) {
                        fillCredentialsIntoForm(inputEl, res.username, res.password);
                        hideAutofillPicker();
                    } else {
                        row.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #ef4444; font-weight: 600; padding: 4px 0;">
                                <span>Authentication Cancelled</span>
                            </div>
                        `;
                        setTimeout(hideAutofillPicker, 1200);
                    }
                } catch (err) {
                    hideAutofillPicker();
                }
            });
        });
    }

    function fillCredentialsIntoForm(activeEl, username, password) {
        const form = activeEl?.closest('form') || document;
        
        // 1. Fill Username/Email
        let userInput = form.querySelector('input[type="email"], input[autocomplete*="username"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[type="text"]') ||
                        (activeEl && activeEl.type !== 'password' ? activeEl : null);

        if (userInput) {
            userInput.value = username;
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 2. Fill Password
        let passInput = form.querySelector('input[type="password"]') || (activeEl && activeEl.type === 'password' ? activeEl : null);
        if (passInput) {
            passInput.value = password;
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    document.addEventListener('focusin', (e) => {
        if (isCredentialInput(e.target)) {
            showAutofillPicker(e.target);
        } else {
            hideAutofillPicker();
        }
    }, true);

    document.addEventListener('click', (e) => {
        if (activeAutofillPicker && !activeAutofillPicker.contains(e.target) && !isCredentialInput(e.target)) {
            hideAutofillPicker();
        }
    }, true);

    window.addEventListener('scroll', () => {
        hideAutofillPicker();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideAutofillPicker();
    }, true);

    function isValidPassword(password) {
        if (!password || typeof password !== 'string') return false;
        const clean = password.trim();
        if (clean.length < 3) return false;
        const invalidList = ['123', '1234', '12345', '123456', 'password', 'pass', 'admin', 'null', 'undefined'];
        if (invalidList.includes(clean.toLowerCase())) return false;
        return true;
    }

    function isLoginFailureOnPage() {
        try {
            const bodyText = (document.body?.innerText || '').toLowerCase();
            const failurePatterns = [
                'invalid password', 'wrong password', 'incorrect password', 
                'invalid username', 'login failed', 'authentication failed', 
                'invalid credentials', 'password is incorrect'
            ];
            return failurePatterns.some(pattern => bodyText.includes(pattern));
        } catch (e) {
            return false;
        }
    }

    function findUserOrEmailInput(form) {
        const container = form || document;
        let el = container.querySelector('input[type="email"]');
        if (el && el.value) return el.value.trim();

        el = container.querySelector('input[autocomplete*="username"], input[autocomplete*="email"], input[name*="user"], input[name*="email"], input[name*="login"], input[id*="user"], input[id*="email"], input[id*="login"]');
        if (el && el.value) return el.value.trim();

        if (form) {
            const inputs = Array.from(form.querySelectorAll('input'));
            const passIndex = inputs.findIndex(i => i.type === 'password');
            if (passIndex > 0) {
                for (let i = passIndex - 1; i >= 0; i--) {
                    const inp = inputs[i];
                    if ((inp.type === 'text' || inp.type === 'email' || !inp.type) && inp.value && inp.value.trim().length >= 2) {
                        return inp.value.trim();
                    }
                }
            }
        }

        el = document.querySelector('input[type="email"], input[autocomplete*="username"], input[name*="user"], input[name*="email"]');
        if (el && el.value) return el.value.trim();

        return '';
    }

    // Intercept Form Submit & Detect Credentials
    function handleFormSubmit(e) {
        try {
            const form = e.target;
            const passInput = form.querySelector ? form.querySelector('input[type="password"]') : null;
            if (!passInput || !passInput.value) return;

            if (passInput.checkValidity && !passInput.checkValidity()) return;

            const passwordVal = passInput.value;
            if (!isValidPassword(passwordVal)) return;

            const usernameVal = findUserOrEmailInput(form);
            if (!usernameVal) return;

            setTimeout(() => {
                if (isLoginFailureOnPage()) {
                    console.log('[PasswordVault] Login error detected on page. Suppressing save prompt.');
                    return;
                }
                showSavePasswordBanner(usernameVal, passwordVal);
            }, 600);
        } catch (err) {}
    }

    function getContrastTextColor(hexColor) {
        if (!hexColor || typeof hexColor !== 'string') return '#ffffff';
        let hex = hexColor.replace('#', '').trim();
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== 6) return '#ffffff';
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 145 ? '#0d1117' : '#ffffff';
    }

    let _lastCachedSettings = { themeMode: 'dark', accentColor: '#09f0a0' };
    try {
        ipcRenderer.invoke('get-settings').then(s => { if (s) _lastCachedSettings = s; }).catch(() => {});
        ipcRenderer.on('settings-changed', (e, s) => { if (s) _lastCachedSettings = s; });
    } catch (e) {}

    async function showSavePasswordBanner(username, password) {
        const domain = window.location.hostname;
        let banner = document.getElementById('ocal-save-password-banner');
        if (banner) banner.remove();

        let s = _lastCachedSettings;
        try {
            const fresh = await ipcRenderer.invoke('get-settings');
            if (fresh) { _lastCachedSettings = fresh; s = fresh; }
        } catch (err) {}

        const isLight = s.themeMode === 'light';
        const accent = s.accentColor || '#09f0a0';
        const btnTextColor = getContrastTextColor(accent);

        const bannerBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(18, 20, 29, 0.95)';
        const bannerBorder = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
        const bannerShadow = isLight 
            ? '0 16px 36px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)' 
            : '0 16px 36px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.12)';
        const titleColor = isLight ? '#0f172a' : '#f8fafc';
        const subtitleColor = isLight ? '#64748b' : '#94a3b8';
        const closeBtnBg = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
        const closeBtnBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
        const closeBtnColor = isLight ? '#64748b' : '#94a3b8';
        const closeBtnHoverBg = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
        const closeBtnHoverColor = isLight ? '#0f172a' : '#ffffff';

        banner = document.createElement('div');
        banner.id = 'ocal-save-password-banner';
        banner.style.cssText = `
            position: fixed;
            top: 14px;
            right: 16px;
            z-index: 2147483647;
            background: ${bannerBg};
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            color: ${titleColor};
            border: 1px solid ${bannerBorder};
            border-radius: 14px;
            padding: 8px 12px;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: ${bannerShadow};
            display: flex;
            align-items: center;
            gap: 10px;
            animation: ocalBannerSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            max-width: 440px;
            box-sizing: border-box;
            user-select: none;
        `;

        banner.innerHTML = `
            <style>
                @keyframes ocalBannerSlide {
                    from { opacity: 0; transform: translateY(-16px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                #ocal-save-pass-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px color-mix(in srgb, ${accent} 50%, transparent) !important;
                    filter: brightness(1.08);
                }
                #ocal-save-pass-btn:active {
                    transform: scale(0.96);
                }
                #ocal-close-pass-btn:hover {
                    background: ${closeBtnHoverBg} !important;
                    color: ${closeBtnHoverColor} !important;
                }
            </style>

            <div style="width: 32px; height: 32px; border-radius: 9px; background: color-mix(in srgb, ${accent} 16%, transparent); border: 1px solid color-mix(in srgb, ${accent} 35%, transparent); display: flex; align-items: center; justify-content: center; color: ${accent}; flex-shrink: 0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"></circle>
                    <path d="m21 2-9.6 9.6"></path>
                    <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                </svg>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 1px; min-width: 0;">
                <div style="font-weight: 700; font-size: 12.5px; color: ${titleColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">
                    Save password for <span style="color: ${accent}; font-weight: 700;">${username}</span>?
                </div>
                <div style="font-size: 10.5px; color: ${subtitleColor}; display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <span>${domain}</span>
                    <span style="opacity: 0.4;">•</span>
                    <span style="display: inline-flex; align-items: center; gap: 3px; color: ${isLight ? '#475569' : '#64748b'};">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Ocal Vault
                    </span>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; margin-left: 6px; flex-shrink: 0;">
                <button id="ocal-save-pass-btn" style="padding: 6px 14px; background: ${accent}; color: ${btnTextColor}; border: none; border-radius: 8px; font-weight: 700; font-size: 11.5px; cursor: pointer; transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 2px 10px color-mix(in srgb, ${accent} 40%, transparent); font-family: inherit;">Save</button>
                <button id="ocal-close-pass-btn" title="Dismiss" style="width: 26px; height: 26px; border-radius: 7px; background: ${closeBtnBg}; border: 1px solid ${closeBtnBorder}; color: ${closeBtnColor}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('ocal-save-pass-btn')?.addEventListener('click', () => {
            ipcRenderer.invoke('passwords:save', {
                domain: domain,
                origin: window.location.origin,
                username: username,
                password: password
            });
            banner.remove();
        });

        document.getElementById('ocal-close-pass-btn')?.addEventListener('click', () => {
            banner.remove();
        });

        setTimeout(() => { if (banner && banner.parentNode) banner.remove(); }, 15000);
    }

    async function tryAutofillPasswordFields() {
        try {
            const passInputs = document.querySelectorAll('input[type="password"]');
            if (!passInputs || passInputs.length === 0) return;
            const domain = window.location.hostname;
            if (!domain || typeof ipcRenderer === 'undefined' || !ipcRenderer.invoke) return;
            const creds = await ipcRenderer.invoke('passwords:get-for-domain', domain);
            if (creds && creds.length > 0) {
                const cred = creds[0];
                passInputs.forEach(passInput => {
                    if (!passInput.value) {
                        passInput.value = cred.password;
                        passInput.dispatchEvent(new Event('input', { bubbles: true }));
                        passInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    const form = passInput.closest('form') || document;
                    const userInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[autocomplete*="username"]') || 
                                      document.querySelector('input[type="text"], input[type="email"]');
                    if (userInput && !userInput.value) {
                        userInput.value = cred.username;
                        userInput.dispatchEvent(new Event('input', { bubbles: true }));
                        userInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
        } catch (e) {}
    }

    document.addEventListener('submit', handleFormSubmit, true);

    // Auto-detect when password field is filled and user presses enter or submits
    document.addEventListener('DOMContentLoaded', () => {
        tryAutofillPasswordFields();
    });

    // Listen for manual autofill IPC trigger from main process
    ipcRenderer.on('passwords:autofill-trigger', (e, cred) => {
        if (!cred) return;
        const passInputs = document.querySelectorAll('input[type="password"]');
        passInputs.forEach(passInput => {
            passInput.value = cred.password;
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));

            const form = passInput.closest('form') || document;
            const userInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[autocomplete*="username"]') || 
                              document.querySelector('input[type="text"], input[type="email"]');
            if (userInput) {
                userInput.value = cred.username;
                userInput.dispatchEvent(new Event('input', { bubbles: true }));
                userInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });
})();

// ── Ocal Page Effects & Visual Shaders Engine ────────────────────────
(function() {
    let electronIpc = null;
    try {
        electronIpc = require('electron').ipcRenderer;
    } catch (e) {
        if (typeof ipcRenderer !== 'undefined') electronIpc = ipcRenderer;
    }

    let activeEffectState = {
        enabled: false,
        effect: 'none',
        intensity: 1.0,
        global: true
    };

    const isSettingsPage = () => {
        const url = (window.location.href || '').toLowerCase();
        return url.includes('settings.html') || url.startsWith('ocal://settings');
    };

    function ensureEffectStyles() {
        if (document.getElementById('ocal-page-effects-style')) return;
        const style = document.createElement('style');
        style.id = 'ocal-page-effects-style';
        style.textContent = `
            /* Ocal Page Effects Master Shader Engine */
            #ocal-page-effects-overlay {
                position: fixed !important;
                inset: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                pointer-events: none !important;
                z-index: 2147483646 !important;
                transition: opacity 0.25s ease-out !important;
                overflow: hidden !important;
            }

            /* 1. Broken Screen Shader */
            .ocal-fx-screen-broken #ocal-page-effects-overlay {
                background-image: 
                    radial-gradient(circle at 45% 40%, rgba(255, 255, 255, 0.25) 0%, transparent 6%),
                    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 0px, rgba(255, 255, 255, 0.15) 1px, transparent 1px, transparent 120px),
                    repeating-linear-gradient(-35deg, rgba(255, 255, 255, 0.12) 0px, rgba(255, 255, 255, 0.12) 1px, transparent 1px, transparent 95px),
                    radial-gradient(ellipse at 45% 40%, transparent 0%, rgba(0, 0, 0, 0.35) 100%);
                box-shadow: inset 0 0 50px rgba(255, 255, 255, 0.1);
            }
            .ocal-fx-screen-broken #ocal-page-effects-overlay::after {
                content: "";
                position: absolute;
                inset: 0;
                background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='1000' viewBox='0 0 1600 1000'%3E%3Cpath d='M700,440 L240,80 M700,440 L560,20 M700,440 L1040,60 M700,440 L1520,220 M700,440 L1560,680 M700,440 L1360,1080 M700,440 L880,1160 M700,440 L440,1120 M700,440 L80,800 M700,440 L20,500 M480,280 L360,480 M840,260 L1080,380 M1120,600 L1360,640 M960,840 L1080,980 M600,860 L440,940 M300,640 L220,720' stroke='rgba(255,255,255,0.75)' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='700' cy='440' r='36' fill='rgba(255,255,255,0.45)'/%3E%3Ccircle cx='700' cy='440' r='12' fill='rgba(255,255,255,0.95)'/%3E%3C/svg%3E") center/cover no-repeat;
                opacity: 0.95;
                mix-blend-mode: screen;
            }

            /* 2. Cyberpunk Glitch Shader */
            .ocal-fx-glitch #ocal-page-effects-overlay {
                animation: ocalGlitchJitter 0.8s infinite steps(2);
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
                background-size: 100% 4px;
            }
            .ocal-fx-glitch #ocal-page-effects-overlay::before {
                content: "";
                position: absolute;
                inset: 0;
                background: rgba(0, 240, 255, 0.08);
                mix-blend-mode: color-dodge;
                clip-path: polygon(0 20%, 100% 20%, 100% 30%, 0 30%, 0 60%, 100% 60%, 100% 75%, 0 75%);
                animation: ocalGlitchSlice 1.2s infinite linear alternate-reverse;
            }
            @keyframes ocalGlitchJitter {
                0% { transform: translate(0); filter: drop-shadow(-2px 0 red) drop-shadow(2px 0 cyan); }
                20% { transform: translate(-2px, 1px); }
                40% { transform: translate(2px, -1px); filter: drop-shadow(3px 0 red) drop-shadow(-3px 0 cyan); }
                60% { transform: translate(-1px, 2px); }
                80% { transform: translate(1px, -2px); }
                100% { transform: translate(0); filter: drop-shadow(-2px 0 red) drop-shadow(2px 0 cyan); }
            }
            @keyframes ocalGlitchSlice {
                0% { clip-path: polygon(0 15%, 100% 15%, 100% 25%, 0 25%); transform: translateX(-4px); }
                50% { clip-path: polygon(0 65%, 100% 65%, 100% 78%, 0 78%); transform: translateX(6px); }
                100% { clip-path: polygon(0 40%, 100% 40%, 100% 50%, 0 50%); transform: translateX(-2px); }
            }

            /* 3. B/W Noir & Film Grain Shader */
            .ocal-fx-bw {
                filter: grayscale(100%) contrast(135%) brightness(95%) !important;
            }
            .ocal-fx-bw #ocal-page-effects-overlay {
                background: radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6) 100%);
            }
            .ocal-fx-bw #ocal-page-effects-overlay::after {
                content: "";
                position: absolute;
                inset: 0;
                background-image: repeating-radial-gradient(circle at 50% 50%, transparent 0, rgba(255,255,255,0.04) 1px, transparent 2px);
                background-size: 3px 3px;
                opacity: 0.7;
            }

            /* 4. System Wave / CRT Synthwave Shader */
            .ocal-fx-system-wave {
                filter: contrast(120%) brightness(105%) hue-rotate(60deg) !important;
            }
            .ocal-fx-system-wave #ocal-page-effects-overlay {
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 255, 100, 0.12) 50%),
                            radial-gradient(circle at center, rgba(0, 255, 100, 0.08) 0%, rgba(0, 20, 5, 0.45) 100%);
                background-size: 100% 4px, 100% 100%;
                box-shadow: inset 0 0 60px rgba(0, 255, 100, 0.25);
                animation: ocalScanlineSweep 6s linear infinite;
            }
            @keyframes ocalScanlineSweep {
                0% { background-position: 0 0, 0 0; }
                100% { background-position: 0 100%, 0 0; }
            }

            /* 5. Matrix Terminal Code Rain Shader */
            .ocal-fx-matrix {
                filter: hue-rotate(90deg) contrast(150%) brightness(100%) !important;
            }
            .ocal-fx-matrix #ocal-page-effects-overlay {
                background: linear-gradient(180deg, rgba(0, 255, 60, 0.05) 0%, rgba(0, 40, 10, 0.3) 100%);
                box-shadow: inset 0 0 50px rgba(0, 255, 60, 0.3);
            }

            /* 6. Night Vision HUD */
            .ocal-fx-night-vision {
                filter: grayscale(100%) sepia(100%) hue-rotate(85deg) brightness(1.2) contrast(1.4) !important;
            }
            .ocal-fx-night-vision #ocal-page-effects-overlay {
                background: radial-gradient(circle at center, transparent 35%, rgba(0, 20, 0, 0.85) 90%);
            }

            /* 7. Thermal Infrared */
            .ocal-fx-thermal {
                filter: invert(100%) hue-rotate(180deg) saturate(300%) contrast(140%) !important;
            }

            /* 8. Vaporwave Sunset */
            .ocal-fx-vaporwave {
                filter: hue-rotate(280deg) saturate(160%) contrast(110%) !important;
            }
            .ocal-fx-vaporwave #ocal-page-effects-overlay {
                background: linear-gradient(135deg, rgba(255, 0, 128, 0.15) 0%, rgba(0, 240, 255, 0.15) 100%);
            }

            /* 9. Vintage Sepia Parchment */
            .ocal-fx-sepia {
                filter: sepia(90%) contrast(100%) brightness(95%) !important;
            }
            .ocal-fx-sepia #ocal-page-effects-overlay {
                background: rgba(180, 130, 70, 0.08);
            }

            /* 10. Dark Solarize Invert */
            .ocal-fx-invert {
                filter: invert(100%) hue-rotate(180deg) !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function ensureEffectOverlay() {
        if (isSettingsPage()) return null;
        let overlay = document.getElementById('ocal-page-effects-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ocal-page-effects-overlay';
            (document.body || document.documentElement).appendChild(overlay);
        }
        return overlay;
    }

    function applyEffect(state) {
        if (!state) return;
        activeEffectState = { ...activeEffectState, ...state };

        if (isSettingsPage()) {
            return; // Leave settings UI clean; it has its own sandbox monitor
        }

        ensureEffectStyles();
        const root = document.documentElement;
        if (!root) return;

        // Clear all previous effect classes on root
        const classList = Array.from(root.classList);
        classList.forEach(c => {
            if (c.startsWith('ocal-fx-')) root.classList.remove(c);
        });

        const overlay = ensureEffectOverlay();

        if (activeEffectState.enabled && activeEffectState.effect && activeEffectState.effect !== 'none') {
            const fxClass = `ocal-fx-${activeEffectState.effect}`;
            root.classList.add(fxClass);
            if (overlay) {
                overlay.style.display = 'block';
                overlay.style.opacity = `${activeEffectState.intensity || 1.0}`;
            }
        } else {
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (!activeEffectState.enabled || activeEffectState.effect === 'none') {
                        overlay.style.display = 'none';
                    }
                }, 250);
            }
        }
    }

    // Initialize on DOM ready
    function initPageEffects() {
        ensureEffectStyles();

        if (electronIpc) {
            // Listen for direct broadcast
            electronIpc.on('page-effect-changed', (e, fx) => {
                applyEffect(fx);
            });

            // Listen for general settings broadcast
            electronIpc.on('settings-changed', (e, s) => {
                if (s && s.pageEffect) {
                    applyEffect(s.pageEffect);
                }
            });

            // Request initial state from main process
            if (electronIpc.invoke) {
                electronIpc.invoke('get-settings').then(s => {
                    if (s && s.pageEffect) {
                        applyEffect(s.pageEffect);
                    }
                }).catch(() => {});
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageEffects);
    } else {
        initPageEffects();
    }
})();


