// Ocal Web Store — Extensions & Add-ons Controller

(function () {
    const EXTENSIONS_CATALOG = [
        {
            id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
            name: 'uBlock Origin',
            author: 'Raymond Hill',
            verified: true,
            version: '1.60.0',
            rating: 4.9,
            reviews: '28,450',
            users: '30,000,000+',
            category: 'adblock',
            featured: true,
            desc: 'An efficient wide-spectrum content blocker. Blocks ads, trackers, malware domains, and popups while keeping memory usage minimal.',
            fullDesc: 'uBlock Origin is not just an "ad blocker", it is a wide-spectrum content blocker with CPU and memory efficiency as its primary goal.\n\n• Advanced cosmetic filtering and element zapper\n• Comprehensive malware domain prevention\n• Point-and-click request blocking firewall\n• Zero telemetry, open-source and privacy-respecting',
            iconColor: '#800000',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#800000"/><path d="M24 8L12 13V22C12 30.5 17.1 38.4 24 40C30.9 38.4 36 30.5 36 22V13L24 8Z" fill="#BE123C" stroke="#FFFFFF" stroke-width="2.5"/><text x="24" y="27" font-family="'Space Mono', monospace" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle">uB0</text></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="180" y="20" width="240" height="280" rx="16" fill="#27272A" stroke="#3F3F46" stroke-width="2"/><circle cx="300" cy="110" r="44" fill="#800000" stroke="#F43F5E" stroke-width="4"/><path d="M300 86V110M290 92A28 28 0 1 0 310 92" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/><text x="300" y="180" fill="#FFFFFF" font-size="20" font-weight="800" text-anchor="middle">38,412</text><text x="300" y="202" fill="#A1A1AA" font-size="11" text-anchor="middle">requests blocked on this page</text><rect x="210" y="228" width="180" height="32" rx="8" fill="#3F3F46"/><text x="300" y="249" fill="#10B981" font-size="12" font-weight="700" text-anchor="middle">All Filters Active</text></svg>`,
            permissions: ['storage', 'webRequest', 'webRequestBlocking', '<all_urls>'],
            size: '3.2 MB',
            updated: 'September 2026'
        },
        {
            id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh',
            name: 'Dark Reader',
            author: 'darkreader.org',
            verified: true,
            version: '4.9.130',
            rating: 4.8,
            reviews: '14,800',
            users: '5,000,000+',
            category: 'utilities',
            featured: true,
            desc: 'Dark mode for every website. Invert colors, adjust brightness, contrast, and sepia filters to preserve your eyes day and night.',
            fullDesc: 'Dark Reader inverts bright colors, making them high contrast and easy to read at night. Works on every website, including search engines, docs, blogs, and social platforms.\n\n• Real-time dark theme generation\n• Fine-tune brightness, contrast, and font rendering\n• Custom per-site dark mode rules and whitelist\n• No ads and completely open-source',
            iconColor: '#1F2937',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#1E293B"/><circle cx="24" cy="24" r="14" fill="#F59E0B"/><path d="M24 10C27.7 10 31.1 11.5 33.6 14C30.6 15 28.5 17.8 28.5 21C28.5 24.2 30.6 27 33.6 28C31.1 30.5 27.7 32 24 32C17.4 32 12 26.6 12 20C12 14.5 15.8 10 24 10Z" fill="#0F172A"/><path d="M16 25L32 25" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0F172A"/><rect x="160" y="24" width="280" height="272" rx="16" fill="#1E293B" stroke="#334155" stroke-width="2"/><text x="300" y="60" fill="#FFFFFF" font-size="16" font-weight="800" text-anchor="middle">DARK READER</text><rect x="184" y="80" width="232" height="36" rx="8" fill="#0F172A"/><text x="300" y="103" fill="#38BDF8" font-size="12" font-weight="700" text-anchor="middle">ON &bull; Invert All Sites</text><text x="200" y="145" fill="#94A3B8" font-size="11">Brightness</text><rect x="200" y="152" width="200" height="6" rx="3" fill="#334155"/><circle cx="330" cy="155" r="7" fill="#F59E0B"/><text x="200" y="185" fill="#94A3B8" font-size="11">Contrast</text><rect x="200" y="192" width="200" height="6" rx="3" fill="#334155"/><circle cx="280" cy="195" r="7" fill="#F59E0B"/><text x="200" y="225" fill="#94A3B8" font-size="11">Sepia</text><rect x="200" y="232" width="200" height="6" rx="3" fill="#334155"/><circle cx="220" cy="235" r="7" fill="#F59E0B"/></svg>`,
            permissions: ['storage', '<all_urls>'],
            size: '2.8 MB',
            updated: 'September 2026'
        },
        {
            id: 'nngceckbapebfimnlniiiahkandclblb',
            name: 'Bitwarden - Password Manager',
            author: 'bitwarden.com',
            verified: true,
            version: '2026.8.0',
            rating: 4.9,
            reviews: '9,920',
            users: '3,000,000+',
            category: 'productivity',
            featured: true,
            desc: 'Secure and open-source password manager. Store all your logins, credit cards, and sensitive notes with zero-knowledge end-to-end encryption.',
            fullDesc: 'Bitwarden is the easiest and safest way to store all of your logins and passwords while conveniently keeping them synced across all of your devices.\n\n• End-to-end zero-knowledge AES-256 bit encryption\n• Automatic credential fill and strong password generation\n• Two-factor authentication (2FA) support and authenticator codes\n• Open-source codebase audited by independent security experts',
            iconColor: '#175DDC',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#175DDC"/><path d="M24 10C17.4 10 12 14.5 12 20V26C12 32 17.5 37 24 38C30.5 37 36 32 36 26V20C36 14.5 30.6 10 24 10Z" fill="#FFFFFF"/><path d="M24 13C19 13 15 16.5 15 21V26C15 30.5 19 34.5 24 35.5C29 34.5 33 30.5 33 26V21C33 16.5 29 13 24 13Z" fill="#175DDC"/><path d="M24 13V35.5C29 34.5 33 30.5 33 26V21C33 16.5 29 13 24 13Z" fill="#0D47A1"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0B132B"/><rect x="170" y="20" width="260" height="280" rx="16" fill="#175DDC" stroke="#2563EB" stroke-width="2"/><rect x="170" y="65" width="260" height="235" rx="0" fill="#1E293B"/><text x="300" y="46" fill="#FFFFFF" font-size="15" font-weight="700" text-anchor="middle">My Vault (Unlocked)</text><rect x="186" y="80" width="228" height="36" rx="8" fill="#334155"/><text x="226" y="103" fill="#FFFFFF" font-size="12" font-weight="600">Google Account</text><circle cx="204" cy="98" r="8" fill="#4285F4"/><rect x="186" y="124" width="228" height="36" rx="8" fill="#334155"/><text x="226" y="147" fill="#FFFFFF" font-size="12" font-weight="600">GitHub Pro</text><circle cx="204" cy="142" r="8" fill="#64748B"/><rect x="186" y="168" width="228" height="36" rx="8" fill="#334155"/><text x="226" y="191" fill="#FFFFFF" font-size="12" font-weight="600">Netflix Premium</text><circle cx="204" cy="186" r="8" fill="#E50914"/><rect x="186" y="220" width="228" height="32" rx="8" fill="#10B981"/><text x="300" y="241" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Generate Password</text></svg>`,
            permissions: ['storage', 'clipboardWrite', 'tabs'],
            size: '5.1 MB',
            updated: 'August 2026'
        },
        {
            id: 'gebbhagfogifgggkldgodflihgfeippi',
            name: 'Return YouTube Dislike',
            author: 'returnyoutubedislike.com',
            verified: true,
            version: '4.0.4',
            rating: 4.9,
            reviews: '18,200',
            users: '4,000,000+',
            category: 'media',
            featured: true,
            desc: 'Restores the dislike count indicator on YouTube videos and shorts using real community vote ratio data.',
            fullDesc: 'An extension that brings back the ability to see dislike statistics on YouTube videos. Uses statistical modeling based on user votes and cached historical archive data.\n\n• Seamless native look and feel on YouTube layout\n• Displays dislike bar and percentage ratios\n• Works with normal videos and YouTube Shorts\n• Lightweight and zero performance overhead',
            iconColor: '#CC0000',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#CC0000"/><path d="M14 26V36H18V26H14ZM34 27C34 25.3 32.7 24 31 24H24.7L25.6 19.4L25.7 19.1C25.7 18.7 25.5 18.3 25.3 18L24.2 17L18.6 22.6C18.2 23 18 23.5 18 24V34C18 35.1 18.9 36 20 36H29C29.8 36 30.5 35.5 30.8 34.8L33.8 28.7C33.9 28.5 34 28.2 34 28V27Z" fill="#FFFFFF"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0F0F0F"/><rect x="60" y="30" width="480" height="180" rx="12" fill="#1F1F1F"/><circle cx="300" cy="120" r="30" fill="#CC0000"/><polygon points="292,108 314,120 292,132" fill="#FFFFFF"/><rect x="60" y="230" width="480" height="50" rx="8" fill="#272727"/><text x="80" y="260" fill="#FFFFFF" font-size="14" font-weight="700">Next-Gen Quantum Computing Explained</text><rect x="340" y="240" width="180" height="30" rx="15" fill="#3F3F3F"/><text x="370" y="260" fill="#FFFFFF" font-size="12" font-weight="700">142K</text><line x1="410" y1="244" x2="410" y2="266" stroke="#606060"/><path d="M430 262L436 250H444" stroke="#FFFFFF" stroke-width="2"/><text x="450" y="260" fill="#EF4444" font-size="12" font-weight="700">1.8K</text></svg>`,
            permissions: ['storage', '*://*.youtube.com/*'],
            size: '1.4 MB',
            updated: 'September 2026'
        },
        {
            id: 'mnjggqmfldjflhhcmfdnddlhafdhhime',
            name: 'SponsorBlock for YouTube',
            author: 'Ajay Ramachandran',
            verified: true,
            version: '5.8.2',
            rating: 4.9,
            reviews: '11,500',
            users: '2,000,000+',
            category: 'media',
            featured: false,
            desc: 'Skip sponsorships, creator shoutouts, subscribe reminders, and silent music breaks automatically on YouTube.',
            fullDesc: 'SponsorBlock is a crowdsourced browser extension that lets anyone submit the start and end times of sponsored segments and other segments of YouTube videos.\n\n• Automatic instant skipping of sponsor messages\n• Skip intros, outros, and subscribe reminders\n• Highly configurable skip categories\n• Track the minutes and hours of your life saved',
            iconColor: '#00D1B2',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#00D1B2"/><path d="M20 16L32 24L20 32V16Z" fill="#FFFFFF"/><circle cx="24" cy="24" r="14" stroke="#FFFFFF" stroke-width="2.5" stroke-dasharray="4 2"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="140" y="40" width="320" height="240" rx="16" fill="#27272A" stroke="#00D1B2" stroke-width="2"/><text x="300" y="80" fill="#00D1B2" font-size="16" font-weight="800" text-anchor="middle">SponsorBlock Active</text><rect x="170" y="110" width="260" height="40" rx="8" fill="#18181B"/><text x="186" y="135" fill="#10B981" font-size="12" font-weight="700">✓ Skipped Sponsorship (45s)</text><text x="300" y="190" fill="#FFFFFF" font-size="28" font-weight="800" text-anchor="middle">14h 22m</text><text x="300" y="215" fill="#A1A1AA" font-size="12" text-anchor="middle">Total viewer time saved</text></svg>`,
            permissions: ['storage', '*://*.youtube.com/*'],
            size: '2.1 MB',
            updated: 'September 2026'
        },
        {
            id: 'aapbdbdomjkkjkaonfhkkikfgjllcleb',
            name: 'Google Translate',
            author: 'translate.google.com',
            verified: true,
            version: '2.0.13',
            rating: 4.5,
            reviews: '42,100',
            users: '10,000,000+',
            category: 'productivity',
            featured: false,
            desc: 'Highlight words to translate them into your preferred language or translate entire foreign webpages with one click.',
            fullDesc: 'This extension adds a button to your browser toolbar. Click the translate icon whenever you want to translate the page you are visiting.\n\n• Translate whole webpages or select phrases\n• Supports 100+ global languages\n• Automatic language detection\n• Text-to-speech audio pronunciation',
            iconColor: '#4285F4',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#4285F4"/><text x="24" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-size="22" font-weight="800" fill="#FFFFFF" text-anchor="middle">文A</text></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#F8FAFC"/><rect x="160" y="40" width="280" height="240" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/><rect x="160" y="40" width="280" height="50" rx="0" fill="#4285F4"/><text x="300" y="70" fill="#FFFFFF" font-size="14" font-weight="700" text-anchor="middle">Google Translate</text><rect x="180" y="110" width="240" height="60" rx="8" fill="#F1F5F9"/><text x="195" y="135" fill="#0F172A" font-size="12">Bonjour le monde!</text><rect x="180" y="185" width="240" height="60" rx="8" fill="#E0F2FE"/><text x="195" y="210" fill="#0369A1" font-size="12" font-weight="700">Hello world!</text></svg>`,
            permissions: ['tabs', 'storage'],
            size: '1.2 MB',
            updated: 'July 2026'
        },
        {
            id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen',
            name: 'Grammarly: AI Writing Assistant',
            author: 'grammarly.com',
            verified: true,
            version: '14.1130.0',
            rating: 4.7,
            reviews: '41,000',
            users: '40,000,000+',
            category: 'productivity',
            featured: true,
            desc: 'Real-time grammar checker, spell check, tone detection, and AI rewriting across emails, social media, and documents.',
            fullDesc: 'Grammarly helps you communicate with confidence. It detects grammatical errors, tone inconsistencies, and suggests stylistic improvements across all text inputs on the web.\n\n• Real-time spell check and punctuation validation\n• Sentence clarity and conciseness suggestions\n• Professional tone adjustments\n• Generative AI text assistance',
            iconColor: '#15C39A',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#15C39A"/><text x="24" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle">G</text></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="150" y="30" width="300" height="260" rx="16" fill="#27272A" stroke="#3F3F46" stroke-width="2"/><text x="300" y="65" fill="#15C39A" font-size="15" font-weight="800" text-anchor="middle">Grammarly Assistant</text><rect x="170" y="85" width="260" height="90" rx="8" fill="#18181B"/><text x="185" y="115" fill="#EF4444" font-size="12" text-decoration="line-through">Their going to the office.</text><text x="185" y="145" fill="#10B981" font-size="13" font-weight="700">They're going to the office.</text><rect x="170" y="195" width="260" height="34" rx="8" fill="#15C39A"/><text x="300" y="217" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Accept Suggestion</text></svg>`,
            permissions: ['storage', 'contextMenus'],
            size: '6.4 MB',
            updated: 'September 2026'
        },
        {
            id: 'fmkadmapgofadopljbjfkapdkoienihi',
            name: 'React Developer Tools',
            author: 'Meta Platforms, Inc.',
            verified: true,
            version: '5.3.1',
            rating: 4.6,
            reviews: '4,200',
            users: '4,000,000+',
            category: 'devtools',
            featured: false,
            desc: 'Inspect React component hierarchies, props, state, hooks, and profile performance directly in Developer Tools.',
            fullDesc: 'React Developer Tools allows you to inspect the React component trees, including props, state, context, and hooks. Includes an advanced flamegraph profiler for optimizing render bottlenecks.\n\n• Components tree inspector with props and state editing\n• Time-travel hooks tracking\n• Interaction profiling with commit times\n• Supports React 18, 19, and Next.js applications',
            iconColor: '#61DAFB',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#20232A"/><ellipse cx="24" cy="24" rx="15" ry="6" stroke="#61DAFB" stroke-width="2"/><ellipse cx="24" cy="24" rx="15" ry="6" transform="rotate(60 24 24)" stroke="#61DAFB" stroke-width="2"/><ellipse cx="24" cy="24" rx="15" ry="6" transform="rotate(120 24 24)" stroke="#61DAFB" stroke-width="2"/><circle cx="24" cy="24" r="2.5" fill="#61DAFB"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#20232A"/><rect x="40" y="20" width="520" height="280" rx="12" fill="#282C34" stroke="#61DAFB" stroke-width="1.5"/><text x="60" y="55" fill="#61DAFB" font-size="14" font-weight="700">⚛ Components</text><text x="180" y="55" fill="#ABB2BF" font-size="14">⚛ Profiler</text><line x1="40" y1="70" x2="560" y2="70" stroke="#3E4451"/><text x="60" y="105" fill="#E06C75" font-size="12">&lt;App&gt;</text><text x="80" y="130" fill="#E5C07B" font-size="12">&lt;NavBar user="Neelkanth" /&gt;</text><text x="80" y="155" fill="#98C379" font-size="12">&lt;Router&gt;</text><text x="100" y="180" fill="#61AFEF" font-size="12">&lt;StoreView theme="dark" /&gt;</text><rect x="360" y="80" width="180" height="200" rx="8" fill="#21252B"/><text x="375" y="105" fill="#E5C07B" font-size="11" font-weight="700">props</text><text x="375" y="125" fill="#98C379" font-size="11">theme: "dark"</text><text x="375" y="145" fill="#98C379" font-size="11">count: 42</text></svg>`,
            permissions: ['<all_urls>'],
            size: '3.8 MB',
            updated: 'August 2026'
        },
        {
            id: 'nhdogjmejiglipccpnnnanhbledajbpd',
            name: 'Vue.js devtools',
            author: 'Evan You & Vue.js Team',
            verified: true,
            version: '7.4.0',
            rating: 4.7,
            reviews: '2,850',
            users: '2,000,000+',
            category: 'devtools',
            featured: false,
            desc: 'Browser DevTools extension for debugging Vue.js applications with Pinia, Vuex, and timeline inspection.',
            fullDesc: 'Chrome devtools extension for debugging Vue.js applications.\n\n• Component inspector with reactive data inspection\n• Pinia & Vuex store state manipulation with time-travel\n• Performance timeline and routing events tracker\n• Supports Vue 3 Composition API & Options API',
            iconColor: '#42B883',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#35495E"/><polygon points="24,36 10,12 17,12 24,24 31,12 38,12" fill="#42B883"/><polygon points="24,24 17,12 22,12 24,16 26,12 31,12" fill="#35495E"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#1E1E1E"/><rect x="40" y="20" width="520" height="280" rx="12" fill="#252526" stroke="#42B883" stroke-width="1.5"/><text x="60" y="55" fill="#42B883" font-size="14" font-weight="700">Vue Inspector</text><text x="180" y="55" fill="#858585" font-size="14">Pinia Store</text><line x1="40" y1="70" x2="560" y2="70" stroke="#333333"/><text x="60" y="105" fill="#4EC9B0" font-size="12">&lt;Root&gt;</text><text x="80" y="130" fill="#4EC9B0" font-size="12">&lt;StoreHeader&gt;</text><text x="80" y="155" fill="#4EC9B0" font-size="12">&lt;ExtensionGrid :items="catalog" /&gt;</text></svg>`,
            permissions: ['<all_urls>'],
            size: '4.2 MB',
            updated: 'September 2026'
        },
        {
            id: 'jinjaccalgkegednnccohejagnlnfdag',
            name: 'Violentmonkey',
            author: 'violentmonkey.github.io',
            verified: true,
            version: '2.19.0',
            rating: 4.8,
            reviews: '3,100',
            users: '900,000+',
            category: 'devtools',
            featured: false,
            desc: 'Open-source userscript manager. Run custom scripts from GreasyFork to supercharge and customize any site.',
            fullDesc: 'Violentmonkey provides userscript support for browsers. Works with scripts for Greasemonkey and Tampermonkey.\n\n• Synchronize scripts with cloud providers (Google Drive, Dropbox, OneDrive)\n• Modern code editor with syntax highlighting\n• GM_* API functions support\n• Lightweight, fast, and open source',
            iconColor: '#7C3AED',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#7C3AED"/><circle cx="24" cy="24" r="14" fill="#FFFFFF"/><circle cx="19" cy="22" r="2.5" fill="#7C3AED"/><circle cx="29" cy="22" r="2.5" fill="#7C3AED"/><path d="M19 28C21 31 27 31 29 28" stroke="#7C3AED" stroke-width="2.5" stroke-linecap="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="140" y="30" width="320" height="260" rx="16" fill="#27272A" stroke="#7C3AED" stroke-width="2"/><text x="300" y="65" fill="#A855F7" font-size="16" font-weight="800" text-anchor="middle">Violentmonkey Scripts</text><rect x="160" y="85" width="280" height="42" rx="8" fill="#18181B"/><text x="175" y="110" fill="#FFFFFF" font-size="12" font-weight="700">GitHub Dark Theme Enhanced</text><rect x="160" y="135" width="280" height="42" rx="8" fill="#18181B"/><text x="175" y="160" fill="#FFFFFF" font-size="12" font-weight="700">YouTube Auto HD 4K 60FPS</text></svg>`,
            permissions: ['storage', 'tabs', '<all_urls>'],
            size: '2.0 MB',
            updated: 'August 2026'
        },
        {
            id: 'bhlhnicpbjkfdgahfnagkillifijdadj',
            name: 'ColorZilla',
            author: 'colorzilla.com',
            verified: true,
            version: '3.4.1',
            rating: 4.7,
            reviews: '3,450',
            users: '3,000,000+',
            category: 'devtools',
            featured: false,
            desc: 'Advanced Eyedropper, Color Picker, Gradient Generator, and webpage color palette analyzer.',
            fullDesc: 'ColorZilla is the most popular Firefox and Chrome developer extension for color picking and CSS gradient extraction.\n\n• Eyedropper: get the color of any pixel on any webpage\n• Advanced multi-format color picker (HEX, RGB, HSL)\n• Extract webpage color palette and CSS styles\n• Ultimate CSS Gradient Generator integration',
            iconColor: '#EA580C',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#EA580C"/><path d="M16 32L30 18L33 21L19 35L14 36L16 32Z" fill="#FFFFFF"/><path d="M30 18L34 14C35 13 37 13 38 14C39 15 39 17 38 18L34 22L30 18Z" fill="#FDE047"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="160" y="40" width="280" height="240" rx="16" fill="#27272A" stroke="#EA580C" stroke-width="2"/><text x="300" y="75" fill="#EA580C" font-size="16" font-weight="800" text-anchor="middle">ColorZilla Eyedropper</text><rect x="190" y="100" width="220" height="60" rx="12" fill="#15AC49"/><text x="300" y="136" fill="#FFFFFF" font-size="16" font-weight="800" text-anchor="middle">#15AC49</text><text x="300" y="195" fill="#A1A1AA" font-size="12" text-anchor="middle">RGB: 21, 172, 73</text><text x="300" y="220" fill="#A1A1AA" font-size="12" text-anchor="middle">HSL: 141°, 78%, 38%</text></svg>`,
            permissions: ['<all_urls>', 'tabs'],
            size: '1.5 MB',
            updated: 'July 2026'
        },
        {
            id: 'bmnlcjabgnpnenekpadlanbbkooimhnj',
            name: 'Honey: Coupons & Cash Back',
            author: 'PayPal Honey',
            verified: true,
            version: '15.6.2',
            rating: 4.8,
            reviews: '168,000',
            users: '10,000,000+',
            category: 'shopping',
            featured: true,
            desc: 'Automatically search and apply promo coupon codes with one click at checkout across 30,000+ shopping websites.',
            fullDesc: 'Honey searches for the best coupon codes on the internet and applies them automatically to your cart with one click.\n\n• Test and apply coupon codes automatically\n• Price drop tracker and price history graphs\n• Earn Honey Gold reward points on popular shopping sites\n• Works seamlessly on Amazon, eBay, Target, and thousands more',
            iconColor: '#F59E0B',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#F59E0B"/><text x="24" y="33" font-family="'Plus Jakarta Sans', sans-serif" font-size="26" font-weight="900" fill="#FFFFFF" text-anchor="middle">h</text></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#FFFBEB"/><rect x="160" y="30" width="280" height="260" rx="16" fill="#FFFFFF" stroke="#FDE68A" stroke-width="2"/><text x="300" y="70" fill="#D97706" font-size="18" font-weight="800" text-anchor="middle">Honey Found Savings!</text><text x="300" y="130" fill="#10B981" font-size="36" font-weight="900" text-anchor="middle">-$24.50</text><text x="300" y="160" fill="#4B5563" font-size="13" text-anchor="middle">Applied best code: SAVE25</text><rect x="190" y="195" width="220" height="40" rx="20" fill="#D97706"/><text x="300" y="220" fill="#FFFFFF" font-size="13" font-weight="700" text-anchor="middle">Continue Checkout</text></svg>`,
            permissions: ['storage', 'tabs', '<all_urls>'],
            size: '4.8 MB',
            updated: 'September 2026'
        },
        {
            id: 'laookkfknndomljfdkgnaeiknndfdpmh',
            name: 'Momentum',
            author: 'momentumdash.com',
            verified: true,
            version: '2.14.0',
            rating: 4.8,
            reviews: '13,800',
            users: '3,000,000+',
            category: 'productivity',
            featured: false,
            desc: 'A calming and inspiring new tab dashboard with daily nature photography, personal to-do list, and weather.',
            fullDesc: 'Transform your browser with a calm and focus-driven new tab page.\n\n• Daily breathtaking landscape photography\n• Inspirational daily quote\n• Local weather forecast and to-do list\n• Focus mode and customizable links',
            iconColor: '#3B82F6',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#3B82F6"/><circle cx="24" cy="24" r="13" stroke="#FFFFFF" stroke-width="3"/><path d="M24 16V24L29 27" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0F172A"/><path d="M0 240Q150 140 300 240T600 240V320H0Z" fill="#1E293B"/><text x="300" y="130" fill="#FFFFFF" font-size="52" font-weight="800" text-anchor="middle">10:42</text><text x="300" y="170" fill="#CBD5E1" font-size="18" text-anchor="middle">Good morning, Neelkanth.</text><text x="300" y="210" fill="#94A3B8" font-size="13" text-anchor="middle">"The future belongs to those who build it."</text></svg>`,
            permissions: ['storage'],
            size: '8.2 MB',
            updated: 'August 2026'
        },
        {
            id: 'mpbjkejclgikndihedadaamefmganikf',
            name: 'Buster: Captcha Solver for Humans',
            author: 'Armin Sebastian',
            verified: true,
            version: '3.1.0',
            rating: 4.6,
            reviews: '4,620',
            users: '1,000,000+',
            category: 'utilities',
            featured: false,
            desc: 'Save time by auto-solving difficult reCAPTCHA challenges using speech-to-text audio recognition.',
            fullDesc: 'Buster is a browser extension which helps you to solve difficult captchas by completing audio challenges using speech recognition.\n\n• Solves reCAPTCHA audio challenges automatically\n• Simulates human interaction seamlessly\n• Open-source client\n• Eliminates repetitive image verification puzzles',
            iconColor: '#F43F5E',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#F43F5E"/><path d="M24 14C18.5 14 14 18.5 14 24C14 29.5 18.5 34 24 34C29.5 34 34 29.5 34 24C34 18.5 29.5 14 24 14Z" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="20" cy="22" r="2" fill="#FFFFFF"/><circle cx="28" cy="22" r="2" fill="#FFFFFF"/><path d="M20 28H28" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="170" y="40" width="260" height="240" rx="16" fill="#27272A" stroke="#F43F5E" stroke-width="2"/><text x="300" y="75" fill="#F43F5E" font-size="16" font-weight="800" text-anchor="middle">Buster Solver</text><rect x="190" y="100" width="220" height="70" rx="8" fill="#18181B"/><text x="210" y="130" fill="#10B981" font-size="13" font-weight="700">✓ Audio Challenge Solved</text><text x="210" y="152" fill="#9CA3AF" font-size="11">Time elapsed: 1.2 seconds</text></svg>`,
            permissions: ['storage', '<all_urls>'],
            size: '1.6 MB',
            updated: 'June 2026'
        },
        {
            id: 'gppongmhjkpfnbhagpmjfkannfbllamg',
            name: 'Wappalyzer - Tech Profiler',
            author: 'wappalyzer.com',
            verified: true,
            version: '6.10.74',
            rating: 4.7,
            reviews: '2,920',
            users: '2,000,000+',
            category: 'devtools',
            featured: false,
            desc: 'Find out the underlying CMS, JavaScript frameworks, analytics, ecommerce platforms, and web servers on any site.',
            fullDesc: 'Wappalyzer is a technology profiler that shows you what websites are built with. Detects thousands of web applications, frameworks, server software, and analytics tools.\n\n• Identifies frameworks (React, Vue, Angular, Svelte)\n• Detects CMS (WordPress, Shopify, Webflow)\n• Discovers analytics and advertising tracking pixels\n• Instant one-click tech stack breakdown',
            iconColor: '#2E1065',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#2E1065"/><path d="M14 16L20 32L24 22L28 32L34 16H30L26 26L24 20L22 26L18 16H14Z" fill="#A855F7"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="160" y="30" width="280" height="260" rx="16" fill="#27272A" stroke="#A855F7" stroke-width="2"/><text x="300" y="65" fill="#A855F7" font-size="15" font-weight="800" text-anchor="middle">Detected Technologies</text><rect x="180" y="85" width="240" height="36" rx="8" fill="#18181B"/><text x="215" y="108" fill="#FFFFFF" font-size="12" font-weight="700">Next.js 15.0 &bull; React 19</text><circle cx="198" cy="103" r="6" fill="#61DAFB"/><rect x="180" y="128" width="240" height="36" rx="8" fill="#18181B"/><text x="215" y="151" fill="#FFFFFF" font-size="12" font-weight="700">Tailwind CSS 4.0</text><circle cx="198" cy="146" r="6" fill="#38BDF8"/><rect x="180" y="171" width="240" height="36" rx="8" fill="#18181B"/><text x="215" y="194" fill="#FFFFFF" font-size="12" font-weight="700">Cloudflare Edge &bull; V8</text><circle cx="198" cy="189" r="6" fill="#F97316"/></svg>`,
            permissions: ['tabs', '<all_urls>'],
            size: '2.5 MB',
            updated: 'September 2026'
        },
        {
            id: 'nlipoenfbbikpkjkecapggfdiomgofak',
            name: 'Awesome Screenshot & Recorder',
            author: 'awesomescreenshot.com',
            verified: true,
            version: '4.4.1',
            rating: 4.6,
            reviews: '27,000',
            users: '3,000,000+',
            category: 'productivity',
            featured: false,
            desc: 'Capture full page screenshots, record 4K desktop videos with mic & webcam, and annotate images with arrows and blur.',
            fullDesc: 'Awesome Screenshot & Screen Recorder is a 2-in-1 tool for screen capture and video recording.\n\n• Capture full page scrolling screenshots\n• Record desktop screen, browser tab, or webcam with audio\n• Annotate with arrows, rectangles, highlighter, and blur sensitive text\n• Export as PNG, JPG, MP4, or copy directly to clipboard',
            iconColor: '#0284C7',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#0284C7"/><circle cx="24" cy="24" r="10" stroke="#FFFFFF" stroke-width="3"/><circle cx="24" cy="24" r="4" fill="#EF4444"/><rect x="16" y="14" width="6" height="3" rx="1" fill="#FFFFFF"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="150" y="40" width="300" height="240" rx="16" fill="#27272A" stroke="#0284C7" stroke-width="2"/><text x="300" y="75" fill="#38BDF8" font-size="16" font-weight="800" text-anchor="middle">Capture & Record</text><rect x="180" y="100" width="110" height="70" rx="8" fill="#18181B"/><text x="235" y="140" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Screenshot</text><rect x="310" y="100" width="110" height="70" rx="8" fill="#18181B"/><text x="365" y="140" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Record 4K</text><rect x="180" y="190" width="240" height="36" rx="8" fill="#0284C7"/><text x="300" y="213" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Full Page Capture</text></svg>`,
            permissions: ['storage', 'tabs', '<all_urls>'],
            size: '7.8 MB',
            updated: 'August 2026'
        },
        {
            id: 'dhdgffkkebhmkfjojejmpbldmpobfkfo',
            name: 'Tampermonkey',
            author: 'Jan Biniok',
            verified: true,
            version: '5.3.3',
            rating: 4.8,
            reviews: '82,400',
            users: '10,000,000+',
            category: 'developer',
            featured: true,
            desc: 'The world\'s most popular userscript manager. Customize websites, automate workflows, and enhance browser behavior.',
            fullDesc: 'Tampermonkey is the most popular userscript manager with over 10 million users.\n\n• Manage and edit userscripts with built-in IDE\n• Automatic script updates from GreasyFork and GitHub\n• Cloud sync via Google Drive, Dropbox, and WebDAV\n• Full GM_* API compatibility',
            iconColor: '#111827',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#18181B"/><circle cx="16" cy="24" r="5" fill="#FFFFFF"/><circle cx="32" cy="24" r="5" fill="#FFFFFF"/><rect x="18" y="32" width="12" height="4" rx="2" fill="#10B981"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="140" y="30" width="320" height="260" rx="16" fill="#27272A" stroke="#10B981" stroke-width="2"/><text x="300" y="65" fill="#10B981" font-size="16" font-weight="800" text-anchor="middle">Tampermonkey Dashboard</text><rect x="160" y="85" width="280" height="40" rx="8" fill="#18181B"/><text x="175" y="110" fill="#FFFFFF" font-size="12" font-weight="700">AdGuard Extra &bull; Active</text><rect x="160" y="135" width="280" height="40" rx="8" fill="#18181B"/><text x="175" y="160" fill="#FFFFFF" font-size="12" font-weight="700">GitHub Wide Layout &bull; Active</text></svg>`,
            permissions: ['storage', 'tabs', '<all_urls>'],
            size: '2.4 MB',
            updated: 'September 2026'
        },
        {
            id: 'bgnkhhnnamicmpeenaelnjfhikgbkllg',
            name: 'AdGuard AdBlocker',
            author: 'AdGuard Software Ltd',
            verified: true,
            version: '4.4.15',
            rating: 4.8,
            reviews: '52,400',
            users: '10,000,000+',
            category: 'adblock',
            featured: true,
            desc: 'Unmatched adblock extension against video ads, intrusive popups, banners, and malicious tracking networks.',
            fullDesc: 'AdGuard AdBlocker effectively blocks all types of advertising on any webpage, including YouTube, Facebook, and streaming platforms.\n\n• Blocks banner, video, and popup ads\n• Speeds up page loading and saves bandwidth\n• Protects your privacy by blocking third-party tracking systems\n• Blocks spyware, adware, and dialer installers',
            iconColor: '#68BC71',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#68BC71"/><path d="M24 10L14 15V23C14 30 18.5 35.5 24 38C29.5 35.5 34 30 34 23V15L24 10Z" fill="#FFFFFF"/><path d="M21 24L23 26L28 21" stroke="#68BC71" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#1E293B"/><rect x="160" y="30" width="280" height="260" rx="16" fill="#0F172A" stroke="#68BC71" stroke-width="2"/><text x="300" y="70" fill="#68BC71" font-size="16" font-weight="800" text-anchor="middle">AdGuard Protection: ON</text><text x="300" y="140" fill="#FFFFFF" font-size="36" font-weight="900" text-anchor="middle">54,821</text><text x="300" y="165" fill="#94A3B8" font-size="12" text-anchor="middle">Ads & trackers blocked</text><rect x="190" y="195" width="220" height="36" rx="8" fill="#68BC71"/><text x="300" y="218" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Filter Settings</text></svg>`,
            permissions: ['storage', 'webRequest', 'webRequestBlocking', '<all_urls>'],
            size: '4.6 MB',
            updated: 'September 2026'
        },
        {
            id: 'mlomiejdfkolichcflejclcbmpeaniij',
            name: 'Ghostery Tracker & Ad Blocker',
            author: 'Ghostery, Inc.',
            verified: true,
            version: '10.4.8',
            rating: 4.6,
            reviews: '14,300',
            users: '2,000,000+',
            category: 'adblock',
            featured: false,
            desc: 'Comprehensive privacy protection suite that stops website telemetry, neutralizes trackers, and accelerates page speed.',
            fullDesc: 'Ghostery equips you with AI-powered privacy features to browse faster and safer.\n\n• Advanced anti-tracking technology\n• Native ad blocking on video platforms and news outlets\n• Tracker preview analysis on search engine results\n• Minimal CPU and battery consumption',
            iconColor: '#0085FF',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#0085FF"/><circle cx="19" cy="20" r="3.5" fill="#FFFFFF"/><circle cx="29" cy="20" r="3.5" fill="#FFFFFF"/><path d="M16 28C18 31 30 31 32 28" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="160" y="30" width="280" height="260" rx="16" fill="#27272A" stroke="#0085FF" stroke-width="2"/><text x="300" y="65" fill="#0085FF" font-size="16" font-weight="800" text-anchor="middle">Ghostery Privacy</text><rect x="180" y="85" width="240" height="50" rx="8" fill="#18181B"/><text x="195" y="115" fill="#FFFFFF" font-size="13" font-weight="700">18 Trackers Neutralized</text><rect x="180" y="145" width="240" height="50" rx="8" fill="#18181B"/><text x="195" y="175" fill="#10B981" font-size="13" font-weight="700">Load Time: 0.4s (-48%)</text></svg>`,
            permissions: ['storage', 'webRequest', '<all_urls>'],
            size: '3.1 MB',
            updated: 'August 2026'
        },
        {
            id: 'aeblfdkhhhdcdjpifhhbdiojplfjncoa',
            name: '1Password – Password Manager',
            author: '1Password',
            verified: true,
            version: '2.25.1',
            rating: 4.7,
            reviews: '12,900',
            users: '4,000,000+',
            category: 'productivity',
            featured: true,
            desc: 'Securely log into websites, autofill passwords, save credit cards, and manage Passkeys across all your devices.',
            fullDesc: '1Password remembers all your passwords and sensitive information, keeping them safe behind your Master Password and Secret Key.\n\n• Full Passkey generation and biometric unlock support\n• Instant autofill for logins, 2FA authenticator codes, and credit cards\n• Watchtower breach alerts for compromised passwords\n• Multi-account support for personal and corporate vaults',
            iconColor: '#0094F5',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#0A85EA"/><circle cx="24" cy="24" r="14" stroke="#FFFFFF" stroke-width="3"/><rect x="22" y="16" width="4" height="8" rx="2" fill="#FFFFFF"/><circle cx="24" cy="24" r="3" fill="#FFFFFF"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0B132B"/><rect x="170" y="25" width="260" height="270" rx="16" fill="#1E293B" stroke="#0A85EA" stroke-width="2"/><text x="300" y="60" fill="#38BDF8" font-size="16" font-weight="800" text-anchor="middle">1Password Vault</text><rect x="190" y="80" width="220" height="40" rx="8" fill="#334155"/><text x="210" y="105" fill="#FFFFFF" font-size="12" font-weight="600">AWS Console</text><rect x="190" y="130" width="220" height="40" rx="8" fill="#334155"/><text x="210" y="155" fill="#FFFFFF" font-size="12" font-weight="600">GitHub Corporate</text><rect x="190" y="185" width="220" height="36" rx="8" fill="#0A85EA"/><text x="300" y="208" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Autofill (Ctrl+\\)</text></svg>`,
            permissions: ['storage', 'tabs', 'clipboardWrite'],
            size: '9.2 MB',
            updated: 'September 2026'
        },
        {
            id: 'hdokiejnpimakedhajhdlcegeplioahd',
            name: 'LastPass: Free Password Manager',
            author: 'LogMeIn, Inc.',
            verified: true,
            version: '4.135.0',
            rating: 4.4,
            reviews: '30,500',
            users: '10,000,000+',
            category: 'productivity',
            featured: false,
            desc: 'Save your passwords, usernames, credit cards, and addresses in one secure digital vault with automatic autofill.',
            fullDesc: 'LastPass puts you in control of your digital life by making it easy to keep your critical information safe and secure.\n\n• Store passwords and logins in your personal vault\n• Autofill usernames and passwords on web pages\n• Built-in strong password generator\n• Secure notes and shared folders for families',
            iconColor: '#D32D27',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#D32D27"/><rect x="14" y="21" width="20" height="6" rx="3" fill="#FFFFFF"/><circle cx="34" cy="24" r="3" fill="#FFFFFF"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#1E1E1E"/><rect x="170" y="30" width="260" height="260" rx="16" fill="#2D2D2D" stroke="#D32D27" stroke-width="2"/><text x="300" y="65" fill="#EF4444" font-size="16" font-weight="800" text-anchor="middle">LastPass Vault</text><rect x="190" y="85" width="220" height="36" rx="8" fill="#3D3D3D"/><text x="210" y="108" fill="#FFFFFF" font-size="12">Google Workspace</text><rect x="190" y="130" width="220" height="36" rx="8" fill="#3D3D3D"/><text x="210" y="153" fill="#FFFFFF" font-size="12">Slack Workspace</text></svg>`,
            permissions: ['storage', 'tabs', 'clipboardWrite'],
            size: '12.4 MB',
            updated: 'August 2026'
        },
        {
            id: 'knheggckgoiihginacbkhaalnibhilkk',
            name: 'Notion Web Clipper',
            author: 'Notion Labs, Inc.',
            verified: true,
            version: '2.3.0',
            rating: 4.3,
            reviews: '4,900',
            users: '4,000,000+',
            category: 'productivity',
            featured: true,
            desc: 'Save any webpage, research article, recipe, or bookmark directly into your Notion workspaces with one click.',
            fullDesc: 'Save anything on the web to Notion.\n\n• Clip articles and read them in a clean, ad-free Notion page\n• Add tags, properties, and notes directly before saving\n• Choose any workspace or database to organize research\n• Available across desktop and mobile',
            iconColor: '#000000',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#000000"/><path d="M15 15L33 15V19L22 31H33V35H15V31L26 19H15V15Z" fill="#FFFFFF"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#191919"/><rect x="170" y="30" width="260" height="260" rx="16" fill="#252525" stroke="#FFFFFF" stroke-width="1.5"/><text x="300" y="65" fill="#FFFFFF" font-size="16" font-weight="800" text-anchor="middle">Save to Notion</text><rect x="190" y="85" width="220" height="36" rx="8" fill="#333333"/><text x="205" y="108" fill="#E5E5E5" font-size="12">Workspace: Engineering</text><rect x="190" y="130" width="220" height="36" rx="8" fill="#333333"/><text x="205" y="153" fill="#E5E5E5" font-size="12">Database: Tech Radar</text><rect x="190" y="190" width="220" height="36" rx="8" fill="#2563EB"/><text x="300" y="213" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">Save Page</text></svg>`,
            permissions: ['storage', 'tabs'],
            size: '1.8 MB',
            updated: 'July 2026'
        },
        {
            id: 'niloccmipbidfmhmbggdfmfdgfaakedf',
            name: 'Save to Pocket',
            author: 'Mozilla Corporation',
            verified: true,
            version: '3.0.9',
            rating: 4.5,
            reviews: '8,200',
            users: '2,000,000+',
            category: 'productivity',
            featured: false,
            desc: 'Save articles, videos, and stories to view later on any device, formatted beautifully without ads or distractions.',
            fullDesc: 'The easiest way to capture articles, videos, and anything else you find on the web.\n\n• One-click saving directly from the browser\n• Clean reading mode stripped of ads and popups\n• Offline reading support on your phone or tablet\n• Organize saved content with custom tags',
            iconColor: '#EF4444',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#EF4444"/><path d="M14 16H34V25C34 30.5 29.5 35 24 35C18.5 35 14 30.5 14 25V16Z" fill="#FFFFFF"/><path d="M19 23L24 28L29 23" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="170" y="40" width="260" height="240" rx="16" fill="#27272A" stroke="#EF4444" stroke-width="2"/><text x="300" y="80" fill="#F87171" font-size="16" font-weight="800" text-anchor="middle">Saved to Pocket!</text><rect x="190" y="110" width="220" height="40" rx="8" fill="#18181B"/><text x="300" y="135" fill="#FFFFFF" font-size="12" text-anchor="middle">Quantum Algorithms 2026</text><rect x="190" y="170" width="220" height="36" rx="8" fill="#EF4444"/><text x="300" y="193" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">View List</text></svg>`,
            permissions: ['storage', 'tabs'],
            size: '1.4 MB',
            updated: 'September 2026'
        },
        {
            id: 'cofdbpoegempjloogbagkncekinflcnj',
            name: 'DeepL Translate: AI Translator',
            author: 'DeepL GmbH',
            verified: true,
            version: '2.1.2',
            rating: 4.8,
            reviews: '11,800',
            users: '2,000,000+',
            category: 'productivity',
            featured: true,
            desc: 'World\'s most accurate neural machine translator. Translate text as you read, write emails, and improve your tone.',
            fullDesc: 'Experience the world\'s best AI-driven translation powered by DeepL neural networks.\n\n• Translate whole pages or highlighted passages\n• Writing assistant with vocabulary suggestions\n• Natural phrasing that preserves subtle nuances\n• Fast keyboard shortcuts for instant translation',
            iconColor: '#0F2B48',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#0F2B48"/><path d="M16 16H26C31 16 34 19.5 34 24C34 28.5 31 32 26 32H16V16Z" stroke="#00A2E8" stroke-width="3"/><path d="M22 22H26C27.5 22 28.5 23 28.5 24C28.5 25 27.5 26 26 26H22V22Z" fill="#00A2E8"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0B132B"/><rect x="160" y="30" width="280" height="260" rx="16" fill="#1E293B" stroke="#00A2E8" stroke-width="2"/><text x="300" y="65" fill="#38BDF8" font-size="16" font-weight="800" text-anchor="middle">DeepL Neural Translation</text><rect x="180" y="85" width="240" height="60" rx="8" fill="#0F172A"/><text x="195" y="110" fill="#94A3B8" font-size="11">English &rarr; German</text><text x="195" y="130" fill="#FFFFFF" font-size="12" font-weight="600">Experience high performance.</text><rect x="180" y="155" width="240" height="60" rx="8" fill="#0F172A"/><text x="195" y="180" fill="#38BDF8" font-size="11">Ergebnis</text><text x="195" y="200" fill="#10B981" font-size="12" font-weight="700">Erleben Sie Spitzenleistung.</text></svg>`,
            permissions: ['storage', 'tabs'],
            size: '3.4 MB',
            updated: 'September 2026'
        },
        {
            id: 'lmhkpmbekcpmknklioeibfkpmmfibljd',
            name: 'Redux DevTools',
            author: 'Dan Abramov & Mihail Diordiev',
            verified: true,
            version: '3.2.0',
            rating: 4.7,
            reviews: '3,800',
            users: '3,000,000+',
            category: 'developer',
            featured: false,
            desc: 'Time-travel debugging, action inspection, state history replay, and state tree diffs for Redux and Zustand apps.',
            fullDesc: 'Redux DevTools extension provides state inspection and time-travel debugging for Redux, Zustand, and other Flux architectures.\n\n• Track dispatched actions and state mutations\n• Replay actions or jump back to any previous state\n• Action cancellation and state import/export\n• State diff visualizer and performance graphs',
            iconColor: '#764ABC',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#764ABC"/><circle cx="24" cy="18" r="4" fill="#FFFFFF"/><circle cx="16" cy="30" r="4" fill="#FFFFFF"/><circle cx="32" cy="30" r="4" fill="#FFFFFF"/><line x1="24" y1="18" x2="16" y2="30" stroke="#FFFFFF" stroke-width="2.5"/><line x1="24" y1="18" x2="32" y2="30" stroke="#FFFFFF" stroke-width="2.5"/><line x1="16" y1="30" x2="32" y2="30" stroke="#FFFFFF" stroke-width="2.5"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#1E1E1E"/><rect x="40" y="20" width="520" height="280" rx="12" fill="#252526" stroke="#764ABC" stroke-width="1.5"/><text x="60" y="55" fill="#A855F7" font-size="14" font-weight="700">Redux Time-Travel</text><rect x="60" y="80" width="160" height="30" rx="4" fill="#333333"/><text x="70" y="100" fill="#4EC9B0" font-size="11">auth/loginSuccess</text><rect x="60" y="115" width="160" height="30" rx="4" fill="#764ABC"/><text x="70" y="135" fill="#FFFFFF" font-size="11">cart/addItem (Selected)</text><rect x="240" y="80" width="300" height="190" rx="6" fill="#1E1E1E"/><text x="255" y="110" fill="#CE9178" font-size="11">"items": [ { "id": "42", "qty": 1 } ]</text></svg>`,
            permissions: ['<all_urls>'],
            size: '2.9 MB',
            updated: 'August 2026'
        },
        {
            id: 'gbmdgdemhfpmlhhnhfdggmhmhbihfgab',
            name: 'JSON Viewer',
            author: 'Tulio Ornelas',
            verified: true,
            version: '0.18.1',
            rating: 4.6,
            reviews: '2,100',
            users: '1,000,000+',
            category: 'developer',
            featured: false,
            desc: 'Clean syntax highlighting, collapsible nested objects, clickable URLs, and dark theme for raw JSON API endpoints.',
            fullDesc: 'The definitive open-source JSON highlighter and formatter for API developers.\n\n• Syntax highlighting with 20+ customizable themes\n• Collapsible nodes with indent guides\n• Clickable URL links inside JSON strings\n• High performance rendering for large JSON payloads',
            iconColor: '#F59E0B',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#18181B"/><text x="24" y="32" font-family="monospace" font-size="22" font-weight="900" fill="#F59E0B" text-anchor="middle">{ }</text></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="40" y="20" width="520" height="280" rx="12" fill="#0D1117" stroke="#30363D" stroke-width="1.5"/><text x="60" y="55" fill="#7EE787" font-size="12">GET /api/v1/extensions HTTP/2 200 OK</text><text x="60" y="90" fill="#FF7B72" font-size="12">"status": <span fill="#A5D6FF">"success"</span>,</text><text x="60" y="115" fill="#FF7B72" font-size="12">"total": <span fill="#79C0FF">32</span>,</text><text x="60" y="140" fill="#FF7B72" font-size="12">"verified": <span fill="#79C0FF">true</span></text></svg>`,
            permissions: ['<all_urls>'],
            size: '1.1 MB',
            updated: 'June 2026'
        },
        {
            id: 'aicmkgpgakddgnaphhhpliifpcfhicfo',
            name: 'Postman Interceptor',
            author: 'Postman, Inc.',
            verified: true,
            version: '1.1.4',
            rating: 4.4,
            reviews: '1,750',
            users: '1,000,000+',
            category: 'developer',
            featured: false,
            desc: 'Directly capture browser HTTP requests and synchronize session cookies between your browser and Postman desktop.',
            fullDesc: 'Postman Interceptor enables you to send requests from Postman desktop using your browser session cookies and headers.\n\n• Sync session cookies seamlessly with Postman\n• Capture browser network requests directly into collections\n• Filter by domain or URL pattern\n• Essential for debugging authenticated APIs',
            iconColor: '#FF6C37',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#FF6C37"/><circle cx="24" cy="24" r="14" fill="#FFFFFF"/><circle cx="24" cy="24" r="7" fill="#FF6C37"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="160" y="30" width="280" height="260" rx="16" fill="#27272A" stroke="#FF6C37" stroke-width="2"/><text x="300" y="65" fill="#FF6C37" font-size="16" font-weight="800" text-anchor="middle">Postman Interceptor</text><rect x="180" y="85" width="240" height="40" rx="8" fill="#18181B"/><text x="195" y="110" fill="#10B981" font-size="12" font-weight="700">● Connected to Postman</text><rect x="180" y="135" width="240" height="40" rx="8" fill="#18181B"/><text x="195" y="160" fill="#FFFFFF" font-size="12">Syncing 14 cookies</text></svg>`,
            permissions: ['<all_urls>', 'tabs'],
            size: '2.8 MB',
            updated: 'May 2026'
        },
        {
            id: 'khncfooichmfjbepaaaebmommgaepoid',
            name: 'Unhook: YouTube Distraction Free',
            author: 'unhook.app',
            verified: true,
            version: '1.6.4',
            rating: 4.9,
            reviews: '7,200',
            users: '700,000+',
            category: 'media',
            featured: false,
            desc: 'Hide YouTube recommendations, comments, home feed, trending tab, and Shorts to stay fully focused and productive.',
            fullDesc: 'Unhook removes YouTube distractions to keep you from falling down rabbit holes.\n\n• Hide homepage recommendation wall\n• Hide video sidebar and end-screen recommendations\n• Disable YouTube Shorts and comments section\n• Granular toggle switches for every UI element',
            iconColor: '#DC2626',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#1E293B"/><circle cx="24" cy="24" r="14" stroke="#EF4444" stroke-width="3"/><line x1="16" y1="16" x2="32" y2="32" stroke="#EF4444" stroke-width="3"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0F172A"/><rect x="160" y="30" width="280" height="260" rx="16" fill="#1E293B" stroke="#EF4444" stroke-width="2"/><text x="300" y="65" fill="#F87171" font-size="16" font-weight="800" text-anchor="middle">Unhook Focus</text><rect x="180" y="85" width="240" height="36" rx="8" fill="#0F172A"/><text x="195" y="108" fill="#10B981" font-size="12">✓ Hide Home Feed</text><rect x="180" y="130" width="240" height="36" rx="8" fill="#0F172A"/><text x="195" y="153" fill="#10B981" font-size="12">✓ Hide Sidebar Recommendations</text><rect x="180" y="175" width="240" height="36" rx="8" fill="#0F172A"/><text x="195" y="198" fill="#10B981" font-size="12">✓ Hide Shorts Shelf</text></svg>`,
            permissions: ['storage', '*://*.youtube.com/*'],
            size: '1.2 MB',
            updated: 'September 2026'
        },
        {
            id: 'jghehhbalbhjaihmagkgnhgheidhbmfl',
            name: 'Volume Master - 600% Volume Boost',
            author: 'Oleg Golosovskiy',
            verified: true,
            version: '1.4.1',
            rating: 4.8,
            reviews: '26,100',
            users: '5,000,000+',
            category: 'media',
            featured: true,
            desc: 'Boost volume up to 600% over maximum limits with independent volume control for every individual browser tab.',
            fullDesc: 'The simplest and most reliable volume booster for your browser.\n\n• Up to 600% volume amplification\n• Control volume of any tab individually\n• Fast switch to any tab playing audio with one click\n• Zero audio distortion at high amplification levels',
            iconColor: '#3B82F6',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#3B82F6"/><polygon points="14,20 20,20 28,14 28,34 20,28 14,28" fill="#FFFFFF"/><path d="M32 18C34 20 35 22 35 24C35 26 34 28 32 30" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/><path d="M35 14C38 17 40 20 40 24C40 28 38 31 35 34" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="170" y="30" width="260" height="260" rx="16" fill="#27272A" stroke="#3B82F6" stroke-width="2"/><text x="300" y="65" fill="#38BDF8" font-size="16" font-weight="800" text-anchor="middle">Volume Master</text><text x="300" y="125" fill="#FFFFFF" font-size="38" font-weight="900" text-anchor="middle">350%</text><rect x="190" y="150" width="220" height="10" rx="5" fill="#3F3F46"/><rect x="190" y="150" width="140" height="10" rx="5" fill="#3B82F6"/><circle cx="330" cy="155" r="9" fill="#FFFFFF"/></svg>`,
            permissions: ['tabs'],
            size: '1.3 MB',
            updated: 'August 2026'
        },
        {
            id: 'hkgfoiooedbmglgahbhhlipkgjinfaam',
            name: 'Picture-in-Picture Extension (Google)',
            author: 'Google LLC',
            verified: true,
            version: '2.0.2',
            rating: 4.4,
            reviews: '2,900',
            users: '2,000,000+',
            category: 'media',
            featured: false,
            desc: 'Watch any video content on any website in a floating, resizable Picture-in-Picture window that stays on top.',
            fullDesc: 'Created by Google to watch video content in a floating Picture-in-Picture (PiP) window that stays on top of other windows.\n\n• Works with HTML5 video on almost any website\n• Keyboard shortcut (Alt+P) for instant toggle\n• Resize and place the floating window anywhere on screen\n• Keeps playing while interacting with other tabs or apps',
            iconColor: '#1F2937',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#1F2937"/><rect x="10" y="12" width="28" height="20" rx="3" stroke="#FFFFFF" stroke-width="2.5"/><rect x="24" y="22" width="14" height="10" rx="2" fill="#4285F4"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#0F172A"/><rect x="100" y="30" width="400" height="260" rx="12" fill="#1E293B"/><rect x="340" y="170" width="140" height="90" rx="8" fill="#4285F4" stroke="#FFFFFF" stroke-width="2"/><text x="410" y="220" fill="#FFFFFF" font-size="11" font-weight="700" text-anchor="middle">Floating PiP</text></svg>`,
            permissions: ['<all_urls>'],
            size: '0.8 MB',
            updated: 'July 2026'
        },
        {
            id: 'lckanjdmomiamkkllfdicnkignkgfgpp',
            name: 'ClearURLs: Privacy URL Cleaner',
            author: 'Kevin Roebert',
            verified: true,
            version: '1.26.1',
            rating: 4.7,
            reviews: '1,850',
            users: '400,000+',
            category: 'utilities',
            featured: false,
            desc: 'Automatically strips tracking fields (utm_source, fbclid, affiliate tags) from visited and copied URLs.',
            fullDesc: 'ClearURLs automatically removes tracking elements from URLs to protect your privacy when browsing the web.\n\n• Removes Google Analytics (utm_*), Facebook (fbclid), and Twitter tracking parameters\n• Prevents link tracking on search engines\n• Cleans URLs before copying to clipboard\n• Faster page redirects and reduced tracking profiles',
            iconColor: '#059669',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#059669"/><path d="M16 28L28 16M20 16H28V24" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="28" r="4" fill="#FFFFFF"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#18181B"/><rect x="140" y="40" width="320" height="240" rx="16" fill="#27272A" stroke="#059669" stroke-width="2"/><text x="300" y="75" fill="#34D399" font-size="16" font-weight="800" text-anchor="middle">ClearURLs Active</text><rect x="160" y="95" width="280" height="50" rx="8" fill="#18181B"/><text x="175" y="115" fill="#EF4444" font-size="10" text-decoration="line-through">site.com/item?utm_source=track&amp;fbclid=123</text><text x="175" y="135" fill="#10B981" font-size="11" font-weight="700">site.com/item</text></svg>`,
            permissions: ['webRequest', 'webRequestBlocking', 'storage', '<all_urls>'],
            size: '2.1 MB',
            updated: 'September 2026'
        },
        {
            id: 'pgjjikdiikihdfapbhakaknnddljallf',
            name: 'Speedtest by Ookla',
            author: 'Ookla, LLC',
            verified: true,
            version: '1.1.8',
            rating: 4.4,
            reviews: '12,100',
            users: '3,000,000+',
            category: 'utilities',
            featured: false,
            desc: 'Measure your internet ping, download speed, and upload speed with one click directly from the browser.',
            fullDesc: 'Take a Speedtest directly from your browser toolbar to quickly check your internet performance without interruption.\n\n• Accurate ping, download, and upload metrics\n• Measure how fast the pages you visit load\n• View historical test records\n• Zero ads and instant test execution',
            iconColor: '#141526',
            iconSvg: `<svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#141526"/><circle cx="24" cy="24" r="14" stroke="#00CCFF" stroke-width="2.5" stroke-dasharray="20 4"/><line x1="24" y1="24" x2="31" y2="17" stroke="#00CCFF" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#FFFFFF"/></svg>`,
            screenshotSvg: `<svg viewBox="0 0 600 320" fill="none" style="width:100%;height:100%;"><rect width="600" height="320" fill="#141526"/><rect x="170" y="30" width="260" height="260" rx="16" fill="#1D1E3A" stroke="#00CCFF" stroke-width="2"/><text x="300" y="65" fill="#00CCFF" font-size="16" font-weight="800" text-anchor="middle">OOKLA SPEEDTEST</text><text x="300" y="130" fill="#FFFFFF" font-size="36" font-weight="900" text-anchor="middle">482.4</text><text x="300" y="155" fill="#94A3B8" font-size="12" text-anchor="middle">Mbps Download</text><text x="300" y="195" fill="#00CCFF" font-size="20" font-weight="800" text-anchor="middle">12ms Ping &bull; 95.2 Up</text></svg>`,
            permissions: ['storage'],
            size: '2.6 MB',
            updated: 'July 2026'
        }
    ];

    // Ensure every extension has its authentic iconUrl mapped
    EXTENSIONS_CATALOG.forEach(ext => {
        if (!ext.iconUrl) {
            ext.iconUrl = `assets/extension-icons/${ext.id}.png`;
        }
    });

    function renderExtIcon(ext, extraClass = '') {
        const iconSrc = ext.iconUrl || `assets/extension-icons/${ext.id}.png`;
        return `
            <img src="${iconSrc}" 
                 alt="${ext.name}" 
                 class="real-ext-icon ${extraClass}" 
                 loading="lazy" 
                 onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
            <div class="svg-fallback-icon" style="display:none; width:100%; height:100%;">
                ${ext.iconSvg}
            </div>
        `;
    }

    let installedIds = new Set();
    let currentCategory = 'all';
    let searchQuery = '';

    const gridEl = document.getElementById('extensionsGrid');
    const searchInput = document.getElementById('storeSearchInput');
    const categoryBar = document.getElementById('categoryBar');
    const directInput = document.getElementById('directInstallInput');
    const directBtn = document.getElementById('btnDirectInstall');
    const heroSpotlight = document.getElementById('heroSpotlight');
    const heroInstallBtn = document.getElementById('heroInstallBtn');
    const detailModal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const toastEl = document.getElementById('storeToast');
    const toastMsg = document.getElementById('toastMsg');

    // ── Theme Sync ────────────────────────────────────────────────────────────
    function syncTheme() {
        const t = localStorage.getItem('ocal-settings-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        document.body.setAttribute('data-theme', t);
    }
    syncTheme();

    // ── Load Installed IDs ───────────────────────────────────────────────────
    async function refreshInstalledStatus() {
        if (!window.electronAPI || !window.electronAPI.getExtensions) return;
        try {
            const list = await window.electronAPI.getExtensions();
            installedIds.clear();
            (list || []).forEach(e => {
                if (e && e.id) installedIds.add(e.id.toLowerCase());
            });
            updateAllButtons();
        } catch (e) {
            console.error('Error getting installed extensions:', e);
        }
    }

    // ── Render Extension Cards ───────────────────────────────────────────────
    function renderGrid() {
        if (!gridEl) return;
        gridEl.innerHTML = '';

        const q = (searchQuery || '').toLowerCase().trim();

        let filtered = EXTENSIONS_CATALOG.filter(ext => {
            const matchesCat = currentCategory === 'all' 
                ? true 
                : currentCategory === 'featured' 
                    ? ext.featured 
                    : (ext.category === currentCategory || 
                       (currentCategory === 'developer' && ext.category === 'devtools') ||
                       (currentCategory === 'devtools' && ext.category === 'developer'));
            
            const matchesSearch = !q || 
                ext.name.toLowerCase().includes(q) || 
                ext.desc.toLowerCase().includes(q) || 
                ext.author.toLowerCase().includes(q) ||
                ext.category.toLowerCase().includes(q) ||
                ext.id.toLowerCase().includes(q);

            return matchesCat && matchesSearch;
        });

        const badge = document.getElementById('gridCountBadge');
        if (badge) {
            badge.innerText = `Showing ${filtered.length} of ${EXTENSIONS_CATALOG.length} extensions`;
        }

        if (filtered.length === 0) {
            const idMatch = q.match(/([a-p]{32})/i);
            if (idMatch) {
                const extId = idMatch[1].toLowerCase();
                gridEl.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: rgba(66, 133, 244, 0.05); border-radius: 20px; border: 1.5px dashed rgba(66, 133, 244, 0.3);">
                        <i class="fab fa-chrome" style="font-size: 40px; color: #4285f4; margin-bottom: 12px;"></i>
                        <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">Google Chrome Extension Detected</div>
                        <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">ID: <code style="font-family: monospace; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">${extId}</code></div>
                        <div style="margin-top: 16px;">
                            <button class="btn-store-action primary" id="btnSearchGrab" style="font-size: 13px; padding: 10px 22px;">
                                <i class="fas fa-satellite-dish"></i> Grab Data from Google
                            </button>
                        </div>
                    </div>
                `;
                const btnSearchGrab = document.getElementById('btnSearchGrab');
                if (btnSearchGrab) {
                    btnSearchGrab.onclick = () => {
                        if (directInput) directInput.value = extId;
                        grabExtensionData(extId, btnSearchGrab);
                    };
                }
                return;
            }

            gridEl.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--text-dim);">
                    <i class="fas fa-magnifying-glass" style="font-size: 36px; margin-bottom: 12px; opacity: 0.4;"></i>
                    <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">No extensions found</div>
                    <div style="font-size: 13px; margin-top: 4px;">Try searching for another keyword or paste a direct Chrome Web Store URL above.</div>
                </div>
            `;
            return;
        }

        filtered.forEach(ext => {
            const isInstalled = installedIds.has(ext.id.toLowerCase());
            const card = document.createElement('div');
            card.className = 'ext-card';
            card.dataset.extId = ext.id;

            card.innerHTML = `
                <div class="ext-card-header">
                    <div class="ext-card-icon">
                        ${renderExtIcon(ext)}
                    </div>
                    <div class="ext-card-meta">
                        <div class="ext-card-title" title="${ext.name}">${ext.name}</div>
                        <div class="ext-card-author">
                            <span>${ext.author}</span>
                            ${ext.verified ? '<i class="fas fa-certificate author-verified" title="Verified Publisher"></i>' : ''}
                        </div>
                        <div class="ext-card-rating-row">
                            <span class="rating-stars">${renderStars(ext.rating)}</span>
                            <span class="rating-num">${ext.rating}</span>
                            <span class="rating-count">(${ext.reviews})</span>
                            <span class="user-count-chip">${ext.users}</span>
                        </div>
                    </div>
                </div>
                <div class="ext-card-desc">${ext.desc}</div>
                <div class="ext-card-footer">
                    <span class="ext-cat-tag">${ext.category}</span>
                    <button class="btn-card-install ${isInstalled ? 'installed' : ''}" data-ext-id="${ext.id}">
                        ${isInstalled ? '<i class="fas fa-check"></i> <span>Installed</span>' : '<i class="fas fa-plus"></i> <span>Add to Ocal</span>'}
                    </button>
                </div>
            `;

            // Card click opens detail modal (except when clicking install button)
            card.onclick = (e) => {
                if (e.target.closest('.btn-card-install')) return;
                openDetailModal(ext);
            };

            const btn = card.querySelector('.btn-card-install');
            btn.onclick = (e) => {
                e.stopPropagation();
                if (!installedIds.has(ext.id.toLowerCase())) {
                    installExtension(ext.id, btn);
                } else {
                    if (window.electronAPI && typeof window.electronAPI.newTab === 'function') {
                        window.electronAPI.newTab('ocal://settings#extensions');
                    } else {
                        window.location.href = 'settings.html#extensions';
                    }
                }
            };

            gridEl.appendChild(card);
        });
    }

    function renderStars(rating) {
        let stars = '';
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.4;
        for (let i = 0; i < full; i++) stars += '<i class="fas fa-star"></i>';
        if (half) stars += '<i class="fas fa-star-half-stroke"></i>';
        const rem = 5 - full - (half ? 1 : 0);
        for (let i = 0; i < rem; i++) stars += '<i class="far fa-star"></i>';
        return stars;
    }

    // ── Update Button States across Grid & Hero ──────────────────────────────
    function updateAllButtons() {
        document.querySelectorAll('.btn-card-install').forEach(btn => {
            const id = btn.dataset.extId;
            if (id && installedIds.has(id.toLowerCase())) {
                btn.className = 'btn-card-install installed';
                btn.innerHTML = '<i class="fas fa-check"></i> <span>Manage</span>';
                btn.title = 'Manage in Ocal Settings';
            }
        });

        if (heroInstallBtn) {
            const heroId = heroInstallBtn.dataset.extId;
            if (heroId && installedIds.has(heroId.toLowerCase())) {
                heroInstallBtn.innerHTML = '<i class="fas fa-check"></i> <span>Manage in Settings</span>';
                heroInstallBtn.style.background = '#0D7A32';
                heroInstallBtn.onclick = () => {
                    if (window.electronAPI && typeof window.electronAPI.newTab === 'function') {
                        window.electronAPI.newTab('ocal://settings#extensions');
                    } else {
                        window.location.href = 'settings.html#extensions';
                    }
                };
            }
        }
    }

    // ── Install Extension Flow ───────────────────────────────────────────────
    async function installExtension(extId, buttonEl) {
        if (!extId) return;

        let originalContent = '';
        if (buttonEl) {
            originalContent = buttonEl.innerHTML;
            buttonEl.disabled = true;
            buttonEl.innerHTML = `
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>Installing...</span>
            `;
            buttonEl.style.opacity = '0.85';
        }

        try {
            if (window.electronAPI && window.electronAPI.installExtension) {
                const info = await window.electronAPI.installExtension(extId);
                installedIds.add(extId.toLowerCase());
                showToast(`✓ Successfully installed ${info.name || 'extension'}!`);
                updateAllButtons();
            } else {
                throw new Error('Extension API unavailable.');
            }
        } catch (err) {
            showToast(`Installation failed: ${err.message}`, true);
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.innerHTML = originalContent;
                buttonEl.style.opacity = '1';
            }
        }
    }

    function closeDetailModal() {
        if (!detailModal) return;
        detailModal.classList.remove('active');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
    }

    function formatDescription(desc) {
        if (!desc) return '';
        return desc.split('\n').map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                return `<div class="modal-feature-bullet"><i class="fas fa-circle-check"></i> <span>${trimmed.replace(/^[•\-]\s*/, '')}</span></div>`;
            }
            return trimmed ? `<p class="modal-desc-p">${trimmed}</p>` : '<div style="height: 6px;"></div>';
        }).join('');
    }

    // ── Detail Modal ─────────────────────────────────────────────────────────
    function openDetailModal(ext) {
        if (!detailModal || !modalBody) return;

        const isInstalled = installedIds.has(ext.id.toLowerCase());

        modalBody.innerHTML = `
            <div class="modal-ext-hero">
                <div class="modal-ext-icon">
                    ${renderExtIcon(ext, 'modal-real-icon')}
                </div>
                <div class="modal-ext-main">
                    <h2 class="modal-ext-title">${ext.name}</h2>
                    <div class="modal-ext-byline">
                        <span>Offered by <strong>${ext.author}</strong></span>
                        ${ext.verified ? '<i class="fas fa-certificate author-verified" title="Verified Publisher"></i>' : ''}
                        <span>&bull;</span>
                        <span class="modal-cat-badge">${ext.category}</span>
                    </div>
                    <div class="modal-ext-stats">
                        <div class="modal-stars-wrap">
                            ${renderStars(ext.rating)}
                            <span class="modal-rating-val">${ext.rating}</span>
                            <span class="modal-rating-count">(${ext.reviews} ratings)</span>
                        </div>
                        <div class="modal-users-chip">
                            <i class="fas fa-user-group"></i> ${ext.users} users
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="modal-action-bar">
                <button class="btn-modal-install ${isInstalled ? 'installed' : ''}" id="modalInstallBtn">
                    ${isInstalled ? '<i class="fas fa-check"></i> Manage in Settings' : '<i class="fas fa-plus"></i> Add to Ocal'}
                </button>
                <button class="btn-modal-google" id="modalVerifyGoogleBtn" title="Fetch live extension metadata from Google Chrome Web Store">
                    <i class="fas fa-satellite-dish"></i>
                    <span>Sync Live Data</span>
                </button>
            </div>

            <!-- Screenshot Preview Carousel -->
            <div class="modal-screenshots-carousel">
                ${ext.screenshotSvg}
            </div>

            <!-- Overview Description -->
            <div class="modal-overview-wrap">
                <h4 class="modal-section-heading"><i class="fas fa-circle-info"></i> Overview</h4>
                <div class="modal-desc-body">
                    ${formatDescription(ext.fullDesc || ext.desc)}
                </div>
            </div>

            <!-- Specifications Grid -->
            <div class="modal-spec-grid">
                <div class="spec-card">
                    <div class="spec-icon"><i class="fas fa-code-branch"></i></div>
                    <div class="spec-meta">
                        <span class="spec-label">Version</span>
                        <span class="spec-val">${ext.version}</span>
                    </div>
                </div>
                <div class="spec-card">
                    <div class="spec-icon"><i class="fas fa-file-zipper"></i></div>
                    <div class="spec-meta">
                        <span class="spec-label">Package Size</span>
                        <span class="spec-val">${ext.size}</span>
                    </div>
                </div>
                <div class="spec-card">
                    <div class="spec-icon"><i class="fas fa-calendar-check"></i></div>
                    <div class="spec-meta">
                        <span class="spec-label">Last Updated</span>
                        <span class="spec-val">${ext.updated}</span>
                    </div>
                </div>
                <div class="spec-card">
                    <div class="spec-icon"><i class="fas fa-fingerprint"></i></div>
                    <div class="spec-meta">
                        <span class="spec-label">Extension ID</span>
                        <span class="spec-val font-mono" title="${ext.id}">${ext.id.substring(0, 14)}...</span>
                    </div>
                </div>
            </div>
        `;

        const modalInstallBtn = document.getElementById('modalInstallBtn');
        if (modalInstallBtn) {
            modalInstallBtn.onclick = () => {
                if (!installedIds.has(ext.id.toLowerCase())) {
                    installExtension(ext.id, modalInstallBtn);
                } else {
                    if (window.electronAPI && typeof window.electronAPI.newTab === 'function') {
                        window.electronAPI.newTab('ocal://settings#extensions');
                    } else {
                        window.location.href = 'settings.html#extensions';
                    }
                }
            };
        }

        const modalVerifyGoogleBtn = document.getElementById('modalVerifyGoogleBtn');
        if (modalVerifyGoogleBtn) {
            modalVerifyGoogleBtn.onclick = async () => {
                const data = await grabExtensionData(ext.id, modalVerifyGoogleBtn);
                if (data && detailModal.classList.contains('active')) {
                    const iconEl = modalBody.querySelector('.modal-ext-icon');
                    if (iconEl && data.iconData) {
                        iconEl.innerHTML = `<img src="${data.iconData}" class="real-ext-icon modal-real-icon" alt="${data.name}">`;
                    }
                    const titleEl = modalBody.querySelector('.modal-ext-title');
                    if (titleEl && data.name) titleEl.innerText = data.name;

                    const specVals = modalBody.querySelectorAll('.spec-val');
                    if (specVals && specVals.length >= 2) {
                        if (data.version) specVals[0].innerText = data.version;
                        if (data.size) specVals[1].innerText = data.size;
                    }

                    modalVerifyGoogleBtn.innerHTML = '<i class="fas fa-check-circle" style="color: #10B981;"></i> <span>Live Data Synced</span>';
                    modalVerifyGoogleBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    modalVerifyGoogleBtn.style.color = '#10B981';
                }
            };
        }

        // Lock background scroll and display modal in true viewport center
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        detailModal.classList.add('active');

        // Reset scroll position inside modal card
        const card = detailModal.querySelector('.store-modal-card');
        if (card) card.scrollTop = 0;
    }

    if (modalCloseBtn) {
        modalCloseBtn.onclick = closeDetailModal;
    }

    if (detailModal) {
        detailModal.onclick = (e) => {
            if (e.target === detailModal) closeDetailModal();
        };
    }

    // ── Spotlight Hero Setup ─────────────────────────────────────────────────
    function setupHero() {
        const featured = EXTENSIONS_CATALOG.find(e => e.id === 'eimadpbcbfnmbkopoojfekhnkhdbieeh');
        if (!featured) return;

        const heroPreview = document.getElementById('heroPreview');
        if (heroPreview) {
            heroPreview.innerHTML = featured.screenshotSvg;
        }

        const heroSpotlightIcon = document.querySelector('#heroSpotlight .store-spotlight-icon');
        if (heroSpotlightIcon) {
            heroSpotlightIcon.innerHTML = `<img src="${featured.iconUrl || 'assets/extension-icons/' + featured.id + '.png'}" alt="${featured.name}" class="real-ext-icon">`;
        }

        if (heroInstallBtn) {
            heroInstallBtn.onclick = () => {
                if (!installedIds.has(featured.id.toLowerCase())) {
                    installExtension(featured.id, heroInstallBtn);
                } else {
                    showToast(`${featured.name} is already active in Ocal.`);
                }
            };
        }
    }

    // ── Search & Filter Listeners ────────────────────────────────────────────
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderGrid();
        });

        // Shortcut '/' to focus search
        window.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== directInput) {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
            if (e.key === 'Escape') {
                closeDetailModal();
            }
        });
    }

    if (categoryBar) {
        categoryBar.addEventListener('click', (e) => {
            const pill = e.target.closest('.cat-pill');
            if (!pill) return;
            document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategory = pill.dataset.cat;
            renderGrid();
        });
    }

    // ── Grab Live Data from Google Chrome Extension ─────────────────────────
    const btnGrabData = document.getElementById('btnGrabData');
    const grabbedCard = document.getElementById('grabbedExtensionCard');
    const grabbedIcon = document.getElementById('grabbedIcon');
    const grabbedTitle = document.getElementById('grabbedTitle');
    const grabbedVersionBadge = document.getElementById('grabbedVersionBadge');
    const grabbedAuthor = document.getElementById('grabbedAuthor');
    const grabbedDesc = document.getElementById('grabbedDesc');
    const grabbedPermsRow = document.getElementById('grabbedPermsRow');
    const btnInstallGrabbed = document.getElementById('btnInstallGrabbed');
    const grabbedSize = document.getElementById('grabbedSize');

    async function grabExtensionData(rawInput, triggerBtn = null) {
        if (!rawInput) return null;
        const match = rawInput.match(/([a-p]{32})/i);
        const id = match ? match[1].toLowerCase() : rawInput.trim();

        const btn = triggerBtn || btnGrabData;
        let originalContent = '';
        if (btn) {
            originalContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Grabbing...</span>';
        }

        try {
            if (!window.electronAPI || !window.electronAPI.fetchExtensionInfo) {
                throw new Error('Extension inspection API unavailable.');
            }
            showToast(`Connecting to Google to grab data for ${id.substring(0, 16)}...`);
            const data = await window.electronAPI.fetchExtensionInfo(id);

            if (grabbedCard) {
                grabbedCard.style.display = 'block';
                if (grabbedTitle) grabbedTitle.innerText = data.name || id;
                if (grabbedVersionBadge) grabbedVersionBadge.innerText = `v${data.version || '1.0'}`;
                if (grabbedAuthor) grabbedAuthor.innerText = data.author ? `by ${data.author}` : 'Chrome Web Store Publisher';
                if (grabbedDesc) grabbedDesc.innerText = data.description || 'Verified Chrome Web Store extension package.';
                if (grabbedSize) grabbedSize.innerText = data.size || '';

                if (grabbedIcon) {
                    if (data.iconData) {
                        grabbedIcon.innerHTML = `<img src="${data.iconData}" style="width:100%;height:100%;object-fit:contain;" alt="${data.name}">`;
                    } else {
                        grabbedIcon.innerHTML = `<i class="fab fa-chrome" style="color: #4285f4; font-size: 24px;"></i>`;
                    }
                }

                if (grabbedPermsRow) {
                    grabbedPermsRow.innerHTML = '';
                    const perms = Array.isArray(data.permissions) ? data.permissions.slice(0, 6) : [];
                    perms.forEach(p => {
                        const chip = document.createElement('span');
                        chip.style.cssText = 'font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: rgba(0,0,0,0.05); color: #4B5563;';
                        chip.innerText = typeof p === 'string' ? p : 'permission';
                        grabbedPermsRow.appendChild(chip);
                    });
                }

                if (btnInstallGrabbed) {
                    const isInst = installedIds.has(data.id.toLowerCase()) || data.isInstalled;
                    btnInstallGrabbed.className = isInst ? 'btn-direct-submit installed' : 'btn-direct-submit';
                    btnInstallGrabbed.innerHTML = isInst ? '<i class="fas fa-check"></i> <span>Installed</span>' : '<i class="fas fa-plus"></i> <span>Install to Ocal</span>';
                    btnInstallGrabbed.onclick = () => {
                        if (!installedIds.has(data.id.toLowerCase())) {
                            installExtension(data.id, btnInstallGrabbed);
                        } else {
                            showToast(`${data.name} is already installed.`);
                        }
                    };
                }

                grabbedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            showToast(`✓ Retrieved live data for "${data.name}" from Google!`);
            return data;
        } catch (err) {
            console.error('Error grabbing extension data:', err);
            showToast(`Could not grab data: ${err.message}`, true);
            return null;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalContent;
            }
        }
    }

    if (btnGrabData && directInput) {
        btnGrabData.onclick = () => {
            const raw = directInput.value.trim();
            if (!raw) {
                showToast('Please enter or paste a Chrome Extension ID or URL first.');
                directInput.focus();
                return;
            }
            grabExtensionData(raw, btnGrabData);
        };
    }

    if (directInput) {
        directInput.addEventListener('paste', () => {
            setTimeout(() => {
                const val = directInput.value.trim();
                const match = val.match(/([a-p]{32})/i);
                if (match) {
                    grabExtensionData(match[1]);
                }
            }, 100);
        });
    }

    // ── Direct Sideload URL / ID Installer ───────────────────────────────────
    if (directBtn && directInput) {
        const triggerDirect = () => {
            const raw = directInput.value.trim();
            if (!raw) return;
            const match = raw.match(/([a-p]{32})/i);
            const id = match ? match[1].toLowerCase() : raw;
            installExtension(id, directBtn);
            directInput.value = '';
        };

        directBtn.onclick = triggerDirect;
        directInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') triggerDirect();
        });
    }

    const customInstallModalBtn = document.getElementById('btnCustomInstallModal');
    if (customInstallModalBtn && directInput) {
        customInstallModalBtn.onclick = () => {
            directInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            directInput.focus();
        };
    }

    // ── Toast Helper ─────────────────────────────────────────────────────────
    let toastTimeout = null;
    function showToast(msg, isError = false) {
        if (!toastEl || !toastMsg) return;
        toastMsg.innerText = msg;
        toastEl.style.display = 'flex';
        toastEl.style.borderColor = isError ? '#EF4444' : 'var(--accent)';
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastEl.style.display = 'none';
        }, 3500);
    }

    // ── Browser Event Listeners ──────────────────────────────────────────────
    if (window.electronAPI && window.electronAPI.onExtensionsChanged) {
        window.electronAPI.onExtensionsChanged(() => {
            refreshInstalledStatus();
        });
    }

    // ── Initialization ───────────────────────────────────────────────────────
    setupHero();
    refreshInstalledStatus().then(() => renderGrid());
})();
