/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BROWSER PROMO SHIELD (Global Search Engine Cleaner)
 * ══════════════════════════════════════════════════════════════════════════════
 * Automatically detects and eliminates annoying browser download prompts,
 * "Get Our Windows/Mac Browser" cards, "Switch to Chrome" banners,
 * "Try Microsoft Edge" popups, and Brave/Yahoo installation nudges across ALL
 * search engines (DuckDuckGo, Google, Bing, Brave, Yahoo, Ecosia, Startpage, etc.)
 */

const BROWSER_PROMO_CSS = `
/* ── DuckDuckGo Browser Download Promos & Footer Cards ── */
.footer *:has(a[href*="funnel_browser_searchresults__footercard"]):not(:has(a[href*="help"])):not(:has(a[href*="feedback"])),
.footer *:has(a[href*="origin=funnel_browser_"]):not(:has(a[href*="help"])):not(:has(a[href*="feedback"])),
.footer *:has(a[href*="duckduckgo.com/windows"]):not(:has(a[href*="help"])):not(:has(a[href*="feedback"])),
.footer *:has(a[href*="duckduckgo.com/mac"]):not(:has(a[href*="help"])):not(:has(a[href*="feedback"])),
.footer *:has(a[href*="/windows?origin="]):not(:has(a[href*="help"])):not(:has(a[href*="feedback"])),
.footer *:has(a[href*="/mac?origin="]):not(:has(a[href*="help"])):not(:has(a[href*="feedback"])),
div:has(> a[href*="origin=funnel_browser_"]),
div:has(> * > a[href*="origin=funnel_browser_"]),
div:has(> * > * > a[href*="origin=funnel_browser_"]),
div:has(> * > * > * > a[href*="origin=funnel_browser_"]),
div:has(> a[href*="funnel_browser_searchresults__footercard"]),
div:has(> * > a[href*="funnel_browser_searchresults__footercard"]),
div:has(> * > * > a[href*="funnel_browser_searchresults__footercard"]),
div:has(> * > * > * > a[href*="funnel_browser_searchresults__footercard"]),
div:has(> a[href*="funnel_browser_searchresults__popover"]),
div:has(> * > a[href*="funnel_browser_searchresults__popover"]),
div:has(> * > * > a[href*="funnel_browser_searchresults__popover"]),
div:has(> a[href*="duckduckgo.com/windows"]),
div:has(> a[href*="duckduckgo.com/mac"]),
div:has(> * > a[href*="duckduckgo.com/windows"]),
div:has(> * > a[href*="duckduckgo.com/mac"]),
div:has(> * > * > a[href*="duckduckgo.com/windows"]),
div:has(> * > * > a[href*="duckduckgo.com/mac"]),
div:has(> * > * > * > a[href*="duckduckgo.com/windows"]),
div:has(> * > * > * > a[href*="duckduckgo.com/mac"]),
div:has(> a[href^="/windows?origin="]),
div:has(> a[href^="/mac?origin="]),
div:has(> * > a[href^="/windows?origin="]),
div:has(> * > a[href^="/mac?origin="]),
div:has(> * > * > a[href^="/windows?origin="]),
div:has(> * > * > a[href^="/mac?origin="]),
[data-testid="app-down-banner"],
[data-testid="serp-atb-btn"],
[data-testid*="browser-promo"],
[data-testid*="browser-download"],
[data-testid*="browser-cta"],
.js-atb-banner,
.js-induce-banner,
.js-open-in-app,
.badge-link,
[class*="badge-link"],
[class*="badge_link"],
[class*="atb-banner"],
[class*="induce-banner"],
.header--aside:has(a[href*="browser"]),
.header--aside:has(a[href*="windows"]),
.header--aside:has(a[href*="mac"]),
.header--aside a[href*="duckduckgo.com/windows"],
.header--aside a[href*="duckduckgo.com/browser"],
.header--aside a[href*="duckduckgo.com/mac"],
.header--aside a[href^="/browser"],
.header--aside a[href^="/windows"],
.header--aside a[href^="/mac"],

/* ── Google Chrome Download & Switch Promos ── */
div[aria-label*="Chrome" i],
div[aria-label*="Google Chrome" i],
div[role="dialog"]:has(a[href*="google.com/chrome"]),
div[role="dialog"]:has(a[href*="/chrome/"]),
div[role="region"]:has(a[href*="google.com/chrome"]),
div[role="region"]:has(a[href*="/chrome/"]),
#gb#gbu:has(a[href*="chrome"]),
div:has(> a[href*="google.com/chrome"]),
div:has(> div > a[href*="google.com/chrome"]),
div:has(> * > a[href*="google.com/chrome"]),
div:has(> * > * > a[href*="google.com/chrome"]),
div:has(> * > * > * > a[href*="google.com/chrome"]),
iframe[src*="chrome/browser"],
iframe[name*="callout"][src*="google"],
#cws-banner,
#gb-promo,

/* ── Microsoft Bing Edge Promos ── */
#bep_wrapper,
#b_promotions,
#bep_modal,
#id_h:has(a[href*="edge"]),
#ev_talk_bubble,
#b_notificationContainer_bep,
.b_edge_promo,
.b_promo,
.b_footer_promo,
div[data-priority="promo"],
div:has(> a[href*="microsoft.com/edge"]),
div:has(> a[href*="microsoft.com/en-us/edge"]),
div:has(> a[href*="microsoft-edge:"]),
div:has(> a[href*="go.microsoft.com/fwlink/?linkid="][href*="edge"]),
div:has(> a[href*="browser/microsoft-edge"]),

/* ── Brave Search Browser Download Promos ── */
.brave-promo,
.brave-banner,
[data-testid*="download-brave"],
[data-testid*="promo-banner"],
div:has(> a[href*="brave.com/download"]),
div:has(> a[href*="brave.com/search-app"]),
div:has(> a[href*="brave.com/compare"]),

/* ── Yahoo, Yandex, Ecosia, Startpage Promos ── */
.y-promo,
.banner-promo,
.reg-promo,
div:has(> a[href*="yahoo.com/mobile"]),
div:has(> a[href*="yahoo.com/apps"]),
div:has(> a[href*="yandex.com/browser"]),
div:has(> a[href*="browser.yandex."]),
div:has(> a[href*="ecosia.org/browser"]),
div:has(> a[href*="startpage.com/en/search/add-to-browser"]) {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
    overflow: hidden !important;
}
`;

const BROWSER_PROMO_CLEANER_SCRIPT = `
(function () {
    'use strict';
    try {
        const host = window.location.hostname || '';
        const isSearchEngine = /duckduckgo\.com|google\.[a-z.]+|bing\.com|brave\.com|yahoo\.[a-z.]+|ecosia\.org|startpage\.com|yandex\.[a-z.]+|qwant\.com/i.test(host);
        if (!isSearchEngine) return;

        const PROMO_TEXT_REGEX = /(?:Get Our|Download|Try Our|Install|Switch to|Upgrade to)\\s+(?:Windows|Mac|Desktop|Free|Our|Private)?\\s*(?:Browser|Chrome|Edge|Brave|DuckDuckGo)?\\b|Protect your data as you search,\\s*browse,\\s*and use AI|Protect your data as you search and browse|Google recommends using Chrome|Browse with Microsoft Edge|A fast,\\s*secure browser with built-in Google features|Make (?:Google Chrome|Chrome|Edge|Brave|DuckDuckGo) your default browser|Explore the web with (?:Google Chrome|Microsoft Edge|Brave)|Switch to (?:Chrome|Edge|Brave|DuckDuckGo)|Fast\\.\\s*Secure\\.\\s*Free\\.\\s*DuckDuckGo Browser/i;

        const PROMO_URL_REGEX = /(?:duckduckgo\\.com\\/(?:windows|mac)|origin=funnel_browser_|footercard|google\\.com\\/chrome|\\/chrome\\/|microsoft\\.com\\/(?:[a-z]{2}-[a-z]{2}\\/)?edge|microsoft-edge:|go\\.microsoft\\.com\\/fwlink\\/\\?linkid=.*edge|brave\\.com\\/download|browser\\.yandex)/i;

        function scanAndPurge(root) {
            if (!root || !root.querySelectorAll) return;

            // 1. Purge via promotional links / buttons
            const candidates = root.querySelectorAll('a[href], button');
            for (let i = 0; i < candidates.length; i++) {
                const el = candidates[i];
                const href = el.getAttribute('href') || '';
                const txt = (el.textContent || '').trim();

                const isPromo = PROMO_URL_REGEX.test(href) || 
                                (/(?:Download|Get|Install|Switch)\\s+(?:Browser|Chrome|Edge|Brave|Windows|Mac)?/i.test(txt) && 
                                 /(?:browser|chrome|edge|windows|mac|download)/i.test(href));

                if (isPromo) {
                    if (el.closest('#rso, [data-testid="mainline"], .results--main, #b_results, .react-results--main')) {
                        continue; // Do not touch organic search results
                    }
                    let p = el.parentElement;
                    let target = el;
                    while (p && p !== document.body && p !== document.documentElement) {
                        const links = p.querySelectorAll('a');
                        if (links.length > 3) break; // Do not purge shared parent with multiple navigation links
                        if (p.classList && (p.classList.contains('footer') || p.tagName.toLowerCase() === 'footer')) break;
                        target = p;
                        p = p.parentElement;
                    }
                    if (target && target !== document.body && target !== document.documentElement) {
                        target.style.setProperty('display', 'none', 'important');
                        target.remove();
                    }
                }
            }

            // 2. Purge via promo headline text (e.g. "Get Our Windows Browser")
            const textNodes = [];
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let n;
            while ((n = walker.nextNode())) {
                const val = n.nodeValue;
                if (val && val.length > 6 && val.length < 130) {
                    if (PROMO_TEXT_REGEX.test(val)) {
                        textNodes.push(n);
                    }
                }
            }

            for (let i = 0; i < textNodes.length; i++) {
                const el = textNodes[i].parentElement;
                if (!el) continue;
                if (el.closest('#rso, [data-testid="mainline"], .results--main, #b_results, .react-results--main')) {
                    continue;
                }
                let p = el;
                let target = el;
                while (p && p !== document.body && p !== document.documentElement) {
                    const links = p.querySelectorAll('a');
                    if (links.length > 3) break;
                    if (p.classList && (p.classList.contains('footer') || p.tagName.toLowerCase() === 'footer')) break;
                    target = p;
                    p = p.parentElement;
                }
                if (target && target !== document.body && target !== document.documentElement) {
                    target.style.setProperty('display', 'none', 'important');
                    target.remove();
                }
            }
        }

        scanAndPurge(document);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => scanAndPurge(document), { once: true });
        }

        const observer = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                const mut = mutations[i];
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                    for (let j = 0; j < mut.addedNodes.length; j++) {
                        const node = mut.addedNodes[j];
                        if (node.nodeType === 1) {
                            scanAndPurge(node);
                        }
                    }
                }
            }
        });

        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    } catch (e) {}
})();
`;

function injectBrowserPromoShield(webContents) {
    if (!webContents || webContents.isDestroyed()) return;
    try {
        const url = webContents.getURL() || '';
        const isInternal = url.startsWith('ocal://') || url.startsWith('file://') || url.includes('home.html');
        if (isInternal) return;

        webContents.insertCSS(BROWSER_PROMO_CSS).catch(() => {});
        webContents.executeJavaScript(BROWSER_PROMO_CLEANER_SCRIPT).catch(() => {});
    } catch (e) {}
}

module.exports = {
    BROWSER_PROMO_CSS,
    BROWSER_PROMO_CLEANER_SCRIPT,
    injectBrowserPromoShield
};
