/**
 * Ocal Media Master - Content Engine
 * (C) 2026 Ocal Browser
 */

console.log('[Media Master] Monitoring for media assets...');

const detectedMedia = new Set();
let throttleTimer;

function extractMedia() {
    const list = [];
    
    // 1. Video Elements
    document.querySelectorAll('video').forEach(v => {
        const src = v.src || (v.querySelector('source') ? v.querySelector('source').src : '');
        if (src && !detectedMedia.has(src)) {
            let quality = v.videoHeight ? `${v.videoHeight}p` : 'Auto';
            list.push({
                type: 'video',
                url: src,
                title: document.title || 'Video File',
                quality: quality,
                origin: window.location.hostname
            });
            detectedMedia.add(src);
        }
    });

    // 2. YouTube Specific (Blob and Stream)
    if (window.location.hostname.includes('youtube.com')) {
        const ytVideo = document.querySelector('video.html5-main-video');
        if (ytVideo && ytVideo.src && ytVideo.src.startsWith('blob:')) {
            // We can't download blob: URLs directly via standard fetch, 
            // but we can report them for capture or indicate it's a stream.
            list.push({
                type: 'stream',
                url: window.location.href,
                title: document.title,
                quality: 'Adaptive',
                origin: 'YouTube'
            });
        }
    }

    // 3. Instagram Specific
    if (window.location.hostname.includes('instagram.com')) {
        document.querySelectorAll('article img, article video').forEach(m => {
            const src = m.src;
            if (src && !detectedMedia.has(src)) {
                list.push({
                    type: m.tagName.toLowerCase() === 'img' ? 'image' : 'video',
                    url: src,
                    title: 'Instagram Media',
                    origin: 'Instagram'
                });
                detectedMedia.add(src);
            }
        });
    }

    // 4. Global Images (Large Assets Only)
    document.querySelectorAll('img').forEach(img => {
        if ((img.naturalWidth > 300 || img.width > 300) && img.src && img.src.startsWith('http') && !detectedMedia.has(img.src)) {
            list.push({
                type: 'image',
                url: img.src,
                title: img.alt || 'Web Image',
                size: `${img.naturalWidth}x${img.naturalHeight}`,
                origin: window.location.hostname
            });
            detectedMedia.add(img.src);
        }
    });

    if (list.length > 0) {
        // Send to main process via DOM bridge (Preload script will catch this)
        window.dispatchEvent(new CustomEvent('ocal-media-detected', { detail: list }));
    }
}

// ── YouTube Native Integration ──
function injectYouTubeDownloadButton() {
    if (!window.location.hostname.includes('youtube.com')) return;

    // Try multiple selectors for the action bar
    const selectors = [
        'ytd-menu-renderer.ytd-watch-metadata #top-level-buttons-computed',
        'ytd-menu-renderer.style-scope.ytd-watch-metadata #top-level-buttons-computed',
        '#top-level-buttons-computed.style-scope.ytd-menu-renderer',
        'ytd-video-primary-info-renderer #top-level-buttons-computed'
    ];

    let actionContainer = null;
    for (const selector of selectors) {
        actionContainer = document.querySelector(selector);
        if (actionContainer) break;
    }

    if (!actionContainer || actionContainer.querySelector('#ocal-download-btn')) return;

    console.log('[Media Master] Injecting YouTube Download button...');

    // Support both old ytd-button-renderer and new yt-button-view-model structure
    const btn = document.createElement('ytd-button-renderer');
    btn.id = 'ocal-download-btn';
    btn.className = 'style-scope ytd-menu-renderer force-icon-button';
    
    btn.innerHTML = `
        <yt-button-shape>
            <button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading" 
                    aria-label="Download with Ocal" 
                    title="Download with Ocal Media Master">
                <div class="yt-spec-button-shape-next__icon" aria-hidden="true">
                    <yt-icon style="width: 24px; height: 24px;">
                        <svg viewBox="0 0 24 24" style="pointer-events: none; display: block; width: 100%; height: 100%; fill: currentColor;">
                            <path d="M17,18v1H6v-1H17z M11.5,3v11.3l-3.6-3.6l-0.7,0.7l4.8,4.8l4.8-4.8l-0.7-0.7l-3.6,3.6V3H11.5z"></path>
                        </svg>
                    </yt-icon>
                </div>
                <div class="yt-spec-button-shape-next__button-text-content">
                    <span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">Download</span>
                </div>
                <yt-touch-feedback-shape style="border-radius: inherit;">
                    <div class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response">
                        <div class="yt-spec-touch-feedback-shape__fill"></div>
                        <div class="yt-spec-touch-feedback-shape__stroke"></div>
                    </div>
                </yt-touch-feedback-shape>
            </button>
        </yt-button-shape>
    `;

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('trigger-media-popup'));
    };

    // Find the 'Share' button (usually the third or fourth) and insert after it
    const shareBtn = actionContainer.querySelector('ytd-button-renderer:nth-child(3)') || actionContainer.children[actionContainer.children.length - 1];
    if (shareBtn) {
        shareBtn.insertAdjacentElement('afterend', btn);
    } else {
        actionContainer.appendChild(btn);
    }
}

// Throttle extraction to avoid performance hit
function throttledHandler() {
    clearTimeout(throttleTimer);
    throttleTimer = setTimeout(() => {
        extractMedia();
        injectYouTubeDownloadButton();
        monitorYouTubeAds();
    }, 1500);
}

// ── YouTube Ad-Loading Overlay ──
function monitorYouTubeAds() {
    if (!window.location.hostname.includes('youtube.com')) return;

    const player = document.getElementById('movie_player');
    if (!player) return;

    let overlay = document.getElementById('ocal-ad-loader');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ocal-ad-loader';
        overlay.innerHTML = `
            <style>
                #ocal-ad-loader {
                    display: none;
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: #000;
                    z-index: 2147483647 !important;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    font-family: 'Outfit', 'Inter', sans-serif;
                    color: white;
                    transition: opacity 0.4s;
                    text-align: center;
                    pointer-events: auto;
                }
                #ocal-ad-loader.visible { display: flex !important; opacity: 1; }
                .loader-icon { font-size: 32px; color: #a855f7; margin-bottom: 20px; animation: pulse 2s ease-in-out infinite; }
                .loader-text { font-size: 16px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
                .loader-sub { font-size: 11px; opacity: 0.5; margin-top: 10px; max-width: 250px; }
                @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } }
            </style>
            <i class="fas fa-microchip loader-icon"></i>
            <div class="loader-text">Neural Shield Active</div>
            <div class="loader-sub">Ad detected. Neutralizing and preparing high-fidelity video stream...</div>
        `;
        player.appendChild(overlay);
        
        // Comprehensive Ad Observer
        const adObserver = new MutationObserver(() => {
            const adIndicators = [
                player.classList.contains('ad-showing'),
                player.classList.contains('ad-interrupting'),
                document.querySelector('.ytp-ad-player-overlay'),
                document.querySelector('.video-ads.ytp-ad-module:not(:empty)')
            ];

            const isAdActive = adIndicators.some(x => !!x);
            overlay.classList.toggle('visible', isAdActive);
            
            // Suppression Logic
            const mainVideo = player.querySelector('video.html5-main-video');
            if (mainVideo) {
                if (isAdActive) {
                    mainVideo.style.opacity = '0'; // Hide ad content
                    mainVideo.muted = true;       // Mute ad audio
                } else {
                    mainVideo.style.opacity = '1'; // Restore video
                    // Unmute only if it was muted by us, but that's complex, 
                    // usually user controls take over or Neural Shield handles it.
                }
            }

            if (isAdActive) {
                const skipBtn = document.querySelector('.ytp-ad-skip-button-modern, .ytp-ad-skip-button');
                if (skipBtn) skipBtn.click();
            }
        });
        adObserver.observe(player, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    }
}

// Observe DOM changes (Comprehensive SPA Handler)
const mainMutationHandler = () => {
    clearTimeout(throttleTimer);
    throttleTimer = setTimeout(() => {
        extractMedia();
        injectYouTubeDownloadButton();
        monitorYouTubeAds();
    }, 1500);
};

const observer = new MutationObserver(mainMutationHandler);
observer.observe(document.body, { childList: true, subtree: true });

// Initial scan and setup
if (document.readyState === 'loading') {
    window.addEventListener('load', () => mainMutationHandler());
} else {
    mainMutationHandler();
}
