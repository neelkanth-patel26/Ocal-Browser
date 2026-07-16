/**
 * Ocal Neural Shield V10 (Deep DOM-Surgery Engine)
 * Final-tier visual cleanup for YouTube's evolving ad-insertion architecture.
 */
(function() {
    const log = (...args) => console.log('%c[Neural Shield V10]', 'color: #a855f7; font-weight: bold;', ...args);

    const CLEAN_INTERVAL = 100;
    const AD_SELECTORS = [
        'ytd-ad-slot-renderer', 'ytd-display-ad-renderer', 'ytd-promoted-sparkles-web-renderer',
        'ytd-player-legacy-desktop-watch-ads-renderer', 'ytd-action-companion-ad-renderer',
        'ytd-banner-promo-renderer', 'ytd-statement-banner-renderer',
        '#masthead-ad', '#player-ads', '.ytp-ad-module', '.ytp-ad-overlay-container',
        'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)',
        'ytd-enforcement-message-view-model',
        '.ytp-ad-message-container', '.ytp-ad-player-overlay',
        'ytd-video-masthead-ad-v3-renderer', 'ytd-video-masthead-ad-renderer',
        'ytd-promoted-video-renderer', 'ytd-rich-grid-ad-slot-renderer',
        '#clarification', '#panels.ytd-watch-flexy ytd-ads-engagement-panel-content-renderer'
    ];

    function performNeuralSurgery() {
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
        const player = document.querySelector('#movie_player');
        
        if (!video) return;

        // 1. High-Precision State Detection (V9)
        const isAdShowing = player?.classList.contains('ad-showing') || 
                           player?.classList.contains('ad-interrupting') ||
                           document.querySelector('.ytp-ad-player-overlay') ||
                           document.querySelector('.ytp-ad-module');

        if (isAdShowing) {
            // Instant Temporal Bypass (10x - Safe limit)
            if (isFinite(video.duration) && video.duration > 0) {
                if (video.currentTime < video.duration - 0.5) {
                    video.currentTime = video.duration - 0.1;
                }
            }

            if (video.playbackRate < 10) {
                video.playbackRate = 10;
                video.muted = true;
            }

            // Click internal skip buttons
            const skipSelectors = [
                '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', 
                '.ytp-ad-skip-button-container', '.ytp-skip-ad-button',
                '.ytp-ad-text-skip-button', '.ytp-ad-skip-button-slot'
            ];
            
            skipSelectors.forEach(s => {
                const btn = document.querySelector(s);
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
            });

            // Recovery: Force play if stuck
            if (video.paused && video.readyState >= 2) video.play().catch(() => {});
        } else {
            // Restore normal playback
            if (video.playbackRate === 10) {
                video.playbackRate = 1;
                video.muted = false;
            }
        }

        // 2. DOM Cleanup (Banners & Enforcement)
        AD_SELECTORS.forEach(s => {
            document.querySelectorAll(s).forEach(el => {
                if (el.style.display !== 'none') {
                    el.style.display = 'none';
                    el.remove();
                }
            });
        });

        // 3. Deep Physical Surgery (V10 Sponsored Text Match)
        // Scans the main containers for items that don't match selectors but carry the "Sponsored" label.
        const containers = ['#secondary', '#masthead', 'ytd-rich-grid-renderer'];
        containers.forEach(selector => {
            const container = document.querySelector(selector);
            if (!container) return;
            
            // Look for generic renderers that contain the "Sponsored" label
            const items = container.querySelectorAll('ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-ad-slot-renderer');
            items.forEach(item => {
                if (item.textContent.toLowerCase().includes('sponsored')) {
                    item.style.display = 'none';
                    item.remove();
                }
            });
        });

        // 4. Player State Normalization
        if (player && player.classList.contains('ad-showing')) {
            // Check if uBlock has actually stopped the ad video but the state is stuck
            if (video.paused && video.readyState >= 2) {
                log('Detected stuck ad-state; forcing playback recovery.');
                player.classList.remove('ad-showing', 'ad-interrupting');
                video.play().catch(() => {});
            }
        }
    }

    // High-speed polling for ad-blocking
    const engine = setInterval(performNeuralSurgery, CLEAN_INTERVAL);
    
    // Safety Observer for late-loading ad nodes
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                performNeuralSurgery();
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Global state reset on navigation
    window.addEventListener('yt-navigate-finish', performNeuralSurgery);
    
    log('Neural Shield V10 (Deep) Active. DOM-Surgery mode engaged.');
})();
