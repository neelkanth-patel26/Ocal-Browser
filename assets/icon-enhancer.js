/**
 * Ocal Browser - Apple SF / Lucide Icon Enhancer
 * Provides clean, modern vector iconography inspired by Apple SF Symbols
 * with automated mapping for legacy FontAwesome glyphs and dynamic UI elements.
 */

(function () {
    'use strict';

    // Comprehensive FontAwesome to Apple/Lucide icon mapping
    const FA_TO_LUCIDE = {
        // Navigation & controls
        'fa-arrow-left': 'arrow-left',
        'fa-arrow-right': 'arrow-right',
        'fa-arrow-up': 'arrow-up',
        'fa-arrow-down': 'download',
        'fa-arrow-down-to-bracket': 'download',
        'fa-chevron-left': 'chevron-left',
        'fa-chevron-right': 'chevron-right',
        'fa-chevron-down': 'chevron-down',
        'fa-chevron-up': 'chevron-up',
        'fa-rotate-right': 'rotate-cw',
        'fa-rotate-left': 'rotate-ccw',
        'fa-clock-rotate-left': 'history',
        'fa-history': 'history',
        'fa-refresh': 'rotate-cw',
        'fa-sync': 'rotate-cw',

        // Omnibar & Security
        'fa-shield-halved': 'shield-check',
        'fa-shield-cat': 'shield-check',
        'fa-shield': 'shield',
        'fa-lock': 'lock',
        'fa-lock-open': 'lock-keyhole-open',
        'fa-ghost': 'ghost',
        'fa-key': 'key',
        'fa-vault': 'shield',
        'fa-heart': 'heart',
        'fa-camera': 'camera',
        'fa-up-right-from-square': 'picture-in-picture-2',
        'fa-magnifying-glass': 'search',
        'fa-search': 'search',
        'fa-globe': 'globe',
        'fa-circle-exclamation': 'alert-circle',
        'fa-triangle-exclamation': 'alert-triangle',

        // File manager & storage
        'fa-folder': 'folder',
        'fa-folder-open': 'folder-open',
        'fa-folder-tree': 'folder-tree',
        'fa-file-pdf': 'file-text',
        'fa-file': 'file',

        // Media & Tools
        'fa-volume-high': 'volume-2',
        'fa-volume-low': 'volume-1',
        'fa-volume-xmark': 'volume-x',
        'fa-columns': 'columns-2',
        'fa-wand-magic-sparkles': 'sparkles',
        'fa-sparkles': 'sparkles',
        'fa-puzzle-piece': 'puzzle',
        'fa-bookmark': 'bookmark',
        'fa-shapes': 'layout-grid',
        'fa-layer-group': 'layers',
        'fa-ellipsis-vertical': 'ellipsis-vertical',
        'fa-ellipsis': 'more-horizontal',
        'fa-sliders': 'sliders-horizontal',
        'fa-gear': 'settings',
        'fa-gears': 'settings',
        'fa-compact-disc': 'disc',
        'fa-music': 'music-2',
        'fa-play': 'play',
        'fa-pause': 'pause',

        // General UI & App Hub
        'fa-plus': 'plus',
        'fa-xmark': 'x',
        'fa-times': 'x',
        'fa-house': 'home',
        'fa-clone': 'copy',
        'fa-right-left': 'arrow-left-right',
        'fa-gamepad': 'gamepad-2',
        'fa-book-open': 'book-open',
        'fa-bolt': 'zap',
        'fa-moon': 'moon',
        'fa-sun': 'sun',
        'fa-circle-notch': 'loader-2',
        'fa-minus': 'minus',
        'fa-up-right-and-down-left-from-center': 'maximize-2',
        'fa-mobile-screen': 'smartphone',
        'fa-tablet-screen-button': 'tablet',
        'fa-desktop': 'monitor',
        'fa-expand': 'maximize',
        'fa-bag-shopping': 'shopping-bag',
        'fa-b': 'bookmark',
        'fa-heart-crack': 'heart-crack',
        'fa-vault': 'vault',
        'fa-check': 'check',
        'fa-copy': 'copy',
        'fa-trash': 'trash-2',
        'fa-trash-can': 'trash-2',
        'fa-pen': 'pencil',
        'fa-pencil': 'pencil',
        'fa-palette': 'palette',
        'fa-info-circle': 'info',
        'fa-info': 'info',
        'fa-panels-top-left': 'panels-top-left',
        'fa-panel-left': 'panel-left',

        // Weather & Meteorology
        'fa-cloud-sun': 'cloud-sun',
        'fa-cloud-sun-rain': 'cloud-sun',
        'fa-cloud-moon': 'cloud-moon',
        'fa-cloud': 'cloud',
        'fa-cloud-rain': 'cloud-rain',
        'fa-cloud-showers-heavy': 'cloud-rain-wind',
        'fa-cloud-showers-water': 'cloud-rain',
        'fa-snowflake': 'snowflake',
        'fa-smog': 'cloud-fog',
        'fa-droplet': 'droplets',
        'fa-wind': 'wind',
        'fa-fan': 'fan',
        'fa-gauge-high': 'gauge',
        'fa-eye': 'eye',
        'fa-temperature-low': 'thermometer',
        'fa-location-arrow': 'navigation',
        'fa-location-dot': 'map-pin',
        'fa-satellite': 'satellite',
        'fa-signal': 'radio',
        'fa-clock': 'clock',
        'fa-calendar-days': 'calendar',
        'fa-user': 'user'
    };

    function toPascalCase(str) {
        if (!str) return '';
        return str.replace(/(^\w|-\w)/g, m => m.replace('-', '').toUpperCase());
    }

    function createLucideSvg(iconName, options = {}) {
        const lucideLib = window.lucide;
        if (!lucideLib || !lucideLib.icons) return null;

        const pascal = toPascalCase(iconName);
        const iconDef = lucideLib.icons[pascal];
        if (!iconDef) return null;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        
        const width = options.width || 16;
        const height = options.height || 16;
        const strokeWidth = options.strokeWidth || 2;
        const className = options.class || '';

        svg.setAttribute("xmlns", svgNS);
        svg.setAttribute("width", String(width));
        svg.setAttribute("height", String(height));
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", String(strokeWidth));
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        
        let fullClass = `lucide lucide-${iconName}`;
        if (className) fullClass += ` ${className}`;
        svg.setAttribute("class", fullClass.trim());
        svg.setAttribute("aria-hidden", "true");

        iconDef.forEach(([tag, attrs]) => {
            const el = document.createElementNS(svgNS, tag);
            Object.keys(attrs).forEach(attrName => {
                el.setAttribute(attrName, String(attrs[attrName]));
            });
            svg.appendChild(el);
        });

        return svg;
    }

    function enhanceElement(el) {
        if (!el || el.dataset?.lucideEnhanced === 'true') return;

        // Skip brand icons (WhatsApp, Instagram, Discord, Spotify, Twitter, Google)
        if (el.classList.contains('fab') || el.classList.contains('fa-brands')) {
            return;
        }

        // Skip solid icons (FontAwesome Solid, solid-icon class, data-solid, tab-favicon)
        if (el.classList.contains('solid-icon') || 
            el.dataset?.solid === 'true' || 
            el.getAttribute('data-solid') === 'true' ||
            el.classList.contains('tab-favicon') ||
            el.classList.contains('tab-audio-icon') ||
            el.classList.contains('fas') || 
            el.classList.contains('fa-solid') ||
            el.closest('[data-solid="true"]')) {
            return;
        }

        let targetIcon = el.getAttribute('data-lucide');

        if (!targetIcon) {
            // Find FontAwesome icon class
            for (const cls of Array.from(el.classList)) {
                if (FA_TO_LUCIDE[cls]) {
                    targetIcon = FA_TO_LUCIDE[cls];
                    break;
                }
            }
        }

        if (!targetIcon) return;

        // Preserve all existing classes except generic FA prefixes
        const preservedClasses = Array.from(el.classList).filter(c => 
            !c.startsWith('fa-') && c !== 'fas' && c !== 'far' && c !== 'fa'
        );

        const svg = createLucideSvg(targetIcon, {
            class: preservedClasses.join(' '),
            strokeWidth: 2
        });

        if (!svg) return;

        svg.dataset.lucideEnhanced = 'true';
        svg.dataset.originalIcon = targetIcon;

        // Copy over attributes
        if (el.id) svg.id = el.id;
        if (el.getAttribute('style')) svg.setAttribute('style', el.getAttribute('style'));
        if (el.getAttribute('title')) svg.setAttribute('title', el.getAttribute('title'));

        el.replaceWith(svg);
    }

    function enhanceContainer(root = document) {
        if (!window.lucide) return;

        // Process elements with data-lucide
        const dataElements = root.querySelectorAll ? root.querySelectorAll('[data-lucide]:not([data-lucide-enhanced="true"])') : [];
        dataElements.forEach(enhanceElement);

        // Process elements with FontAwesome classes
        const faElements = root.querySelectorAll ? root.querySelectorAll('i[class*="fa-"]:not([data-lucide-enhanced="true"])') : [];
        faElements.forEach(enhanceElement);
    }

    let scheduled = false;
    function scheduleEnhance() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            enhanceContainer(document.body);
        });
    }

    // Set up MutationObserver to automatically enhance dynamic elements
    function initObserver() {
        if (!window.MutationObserver || !document.body) return;

        const observer = new MutationObserver((mutations) => {
            let shouldEnhance = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.matches && (node.matches('i[class*="fa-"]') || node.matches('[data-lucide]'))) {
                                shouldEnhance = true;
                                break;
                            }
                            if (node.querySelector && node.querySelector('i[class*="fa-"], [data-lucide]')) {
                                shouldEnhance = true;
                                break;
                            }
                        }
                    }
                } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target && target.tagName === 'I' && target.className.includes('fa-')) {
                        shouldEnhance = true;
                    }
                }
                if (shouldEnhance) break;
            }

            if (shouldEnhance) {
                scheduleEnhance();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-lucide']
        });
    }

    // Public API
    window.IconEnhancer = {
        enhance: enhanceContainer,
        enhanceElement: enhanceElement,
        getSvg: createLucideSvg
    };

    // Auto-run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            enhanceContainer(document);
            initObserver();
        });
    } else {
        enhanceContainer(document);
        initObserver();
    }
})();
