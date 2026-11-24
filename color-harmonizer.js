/**
 * Ocal Browser - AI Color Harmonizer & Adaptive Gradient Engine
 * 
 * Automatically generates perceptually balanced, harmonic gradient pairings
 * (Focus Flow primary gradient, Weather secondary gradient, ambient glow mesh)
 * whenever the theme accent color or theme mode is changed.
 */

(function(global) {
    'use strict';

    // ── Color Space Conversion Utilities ─────────────────────────────────────
    function hexToRgb(hex) {
        if (!hex) return { r: 79, g: 70, b: 229 };
        let c = hex.toString().trim().replace(/^#/, '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length !== 6) return { r: 79, g: 70, b: 229 };
        const num = parseInt(c, 16);
        if (isNaN(num)) return { r: 79, g: 70, b: 229 };
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function rgbToHex(r, g, b) {
        const toHex = v => {
            const h = Math.max(0, Math.min(255, Math.round(v))).toString(16);
            return h.length === 1 ? '0' + h : h;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    function rgbToHsl(r, g, b) {
        if (typeof r === 'string') {
            const parsed = hexToRgb(r);
            r = parsed.r; g = parsed.g; b = parsed.b;
        } else if (typeof r === 'object' && r !== null) {
            g = r.g; b = r.b; r = r.r;
        }
        r = Number(r) || 0;
        g = Number(g) || 0;
        b = Number(b) || 0;

        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return { 
            h: isNaN(h) ? 0 : Math.round(h), 
            s: isNaN(s) ? 0 : Math.round(s * 100), 
            l: isNaN(l) ? 50 : Math.round(l * 100) 
        };
    }

    function hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function hslToHex(h, s, l) {
        const rgb = hslToRgb(h, s, l);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function getContrastColor(hex) {
        const rgb = hexToRgb(hex);
        const luma = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
        return luma > 145 ? '#111111' : '#FFFFFF';
    }

    // ── Exclusive Theme Store Dual-Tone Color Combos (Disabled) ─────────────
    const STORE_COMBOS = [];

    // ── Curated Preset Harmony Palette Catalog ───────────────────────────────
    const CURATED_PRESETS = [
        {
            names: ['indigo', 'ocal', '#4f46e5', '#6366f1', '#4338ca', '#818cf8', '#3730a3'],
            hueRange: [235, 254],
            primary: 'linear-gradient(135deg, #A5B4FC 0%, #818CF8 30%, #4F46E5 70%, #3730A3 100%)',
            secondary: 'linear-gradient(135deg, #DDD6FE 0%, #C084FC 35%, #9333EA 100%)',
            accentGrad: 'linear-gradient(135deg, #818CF8 0%, #4F46E5 100%)',
            badgeBg: '#4F46E5',
            badgeText: '#FFFFFF'
        },
        {
            names: ['emerald', 'green', '#15ac49', '#09f0a0', '#058f60', '#10b981'],
            hueRange: [130, 165],
            primary: 'linear-gradient(135deg, #F3C362 0%, #EAA24A 25%, #30BE57 65%, #15A744 100%)',
            secondary: 'linear-gradient(135deg, #DFE9F7 0%, #F5C695 30%, #FF7A30 100%)',
            accentGrad: 'linear-gradient(135deg, #30BE57 0%, #15AC49 100%)',
            badgeBg: '#15AC49',
            badgeText: '#FFFFFF'
        },
        {
            names: ['ocean', 'sapphire', 'blue', '#2563eb', '#3b82f6', '#0288d1', '#1d4ed8'],
            hueRange: [205, 235],
            primary: 'linear-gradient(135deg, #67E8F9 0%, #38BDF8 30%, #2563EB 70%, #1D4ED8 100%)',
            secondary: 'linear-gradient(135deg, #EDE9FE 0%, #F472B6 40%, #FB923C 100%)',
            accentGrad: 'linear-gradient(135deg, #38BDF8 0%, #2563EB 100%)',
            badgeBg: '#2563EB',
            badgeText: '#FFFFFF'
        },
        {
            names: ['violet', 'purple', 'neon violet', '#7c3aed', '#a855f7', '#6d28d9', '#9333ea'],
            hueRange: [255, 290],
            primary: 'linear-gradient(135deg, #FDA4AF 0%, #E879F9 30%, #A855F7 70%, #6D28D9 100%)',
            secondary: 'linear-gradient(135deg, #FEF08A 0%, #FDBA74 40%, #F43F5E 100%)',
            accentGrad: 'linear-gradient(135deg, #C084FC 0%, #7C3AED 100%)',
            badgeBg: '#7C3AED',
            badgeText: '#FFFFFF'
        },
        {
            names: ['sunset', 'coral', 'orange', '#ea580c', '#fb923c', '#d97706', '#f97316'],
            hueRange: [18, 42],
            primary: 'linear-gradient(135deg, #FDE047 0%, #FB923C 35%, #EA580C 75%, #C2410C 100%)',
            secondary: 'linear-gradient(135deg, #CFFAFE 0%, #6EE7B7 35%, #059669 100%)',
            accentGrad: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
            badgeBg: '#EA580C',
            badgeText: '#FFFFFF'
        },
        {
            names: ['crimson', 'rose', 'red', '#e11d48', '#f43f5e', '#ef4444', '#dc2626'],
            hueRange: [340, 360],
            primary: 'linear-gradient(135deg, #FDBA74 0%, #FB7185 30%, #E11D48 70%, #9F1239 100%)',
            secondary: 'linear-gradient(135deg, #E0E7FF 0%, #818CF8 35%, #4F46E5 100%)',
            accentGrad: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
            badgeBg: '#E11D48',
            badgeText: '#FFFFFF'
        },
        {
            names: ['amber', 'solar', 'yellow', '#d97706', '#facc15', '#e8ff47', '#eab308'],
            hueRange: [43, 68],
            primary: 'linear-gradient(135deg, #86EFAC 0%, #FACC15 35%, #EAB308 70%, #CA8A04 100%)',
            secondary: 'linear-gradient(135deg, #E0F2FE 0%, #38BDF8 40%, #0284C7 100%)',
            accentGrad: 'linear-gradient(135deg, #FDE047 0%, #D97706 100%)',
            badgeBg: '#D97706',
            badgeText: '#FFFFFF'
        },
        {
            names: ['cyan', 'electric cyan', 'teal', '#0891b2', '#06b6d4', '#14b8a6', '#0284c7'],
            hueRange: [175, 204],
            primary: 'linear-gradient(135deg, #A7F3D0 0%, #2DD4BF 30%, #06B6D4 70%, #0E7490 100%)',
            secondary: 'linear-gradient(135deg, #FED7AA 0%, #FB7185 45%, #E11D48 100%)',
            accentGrad: 'linear-gradient(135deg, #2DD4BF 0%, #0891B2 100%)',
            badgeBg: '#0891B2',
            badgeText: '#FFFFFF'
        },
        {
            names: ['slate', 'minimal', 'monolith', '#0f172a', '#e2e8f0', '#ffffff', '#18181b'],
            hueRange: null,
            primary: 'linear-gradient(135deg, #94A3B8 0%, #64748B 30%, #334155 70%, #0F172A 100%)',
            secondary: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 40%, #475569 100%)',
            accentGrad: 'linear-gradient(135deg, #64748B 0%, #0F172A 100%)',
            badgeBg: '#0F172A',
            badgeText: '#FFFFFF'
        }
    ];

    // ── AI Dynamic Harmonic Gradient Generator for Custom Colors ─────────────
    function getHarmonicGradientStyles(hexColor) {
        const cleanHex = hexColor ? hexColor.toString().trim() : '#15AC49';
        const rgb = hexToRgb(cleanHex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const H = hsl.h;
        const S = Math.max(50, Math.min(95, hsl.s));
        const L = Math.max(35, Math.min(65, hsl.l));

        // 1. Aura Flow (Analogous Harmony): Smooth natural neighboring hue drift
        const a_p1 = hslToHex((H - 16 + 360) % 360, Math.min(100, S + 5), Math.min(84, L + 22)); // Luminous sunlit highlight
        const a_p2 = hslToHex((H - 6 + 360) % 360, S, Math.min(72, L + 10));                     // Harmonious midtone
        const a_p3 = hslToHex(H, S, L);                                                            // Pure custom accent
        const a_p4 = hslToHex((H + 12) % 360, Math.min(100, S + 8), Math.max(20, L - 18));        // Deep rich root
        const aura_primary = `linear-gradient(135deg, ${a_p1} 0%, ${a_p2} 28%, ${a_p3} 68%, ${a_p4} 100%)`;

        const a_s1 = hslToHex((H + 24) % 360, Math.max(25, S - 15), 88);                          // Soft crystal frost
        const a_s2 = hslToHex((H + 28) % 360, S, Math.min(70, L + 14));                           // Glow bridge
        const a_s3 = hslToHex((H + 34) % 360, Math.min(100, S + 8), Math.max(30, L - 8));         // Rich counterpart
        const aura_secondary = `linear-gradient(135deg, ${a_s1} 0%, ${a_s2} 36%, ${a_s3} 100%)`;
        const aura_accent = `linear-gradient(135deg, ${a_p2} 0%, ${a_p3} 100%)`;

        // 2. Pure Depth (Monochrome Elegance): 100% hue purity, zero clashing colors
        const m_p1 = hslToHex(H, Math.max(30, S - 15), 78);                                        // Pure tint
        const m_p2 = hslToHex(H, S, Math.min(65, L + 10));                                         // Vibrant midtone
        const m_p3 = hslToHex(H, Math.min(100, S + 5), L);                                         // Base custom
        const m_p4 = hslToHex(H, Math.min(100, S + 10), Math.max(16, L - 22));                     // Deep onyx shade
        const mono_primary = `linear-gradient(135deg, ${m_p1} 0%, ${m_p2} 30%, ${m_p3} 70%, ${m_p4} 100%)`;

        const m_s1 = hslToHex(H, Math.max(20, S - 30), 92);                                        // Ice highlight
        const m_s2 = hslToHex(H, S, Math.min(72, L + 16));                                         // Luminous wash
        const m_s3 = hslToHex(H, Math.min(100, S + 5), Math.max(36, L - 5));                      // Saturated anchor
        const mono_secondary = `linear-gradient(135deg, ${m_s1} 0%, ${m_s2} 40%, ${m_s3} 100%)`;
        const mono_accent = `linear-gradient(135deg, ${m_p2} 0%, ${m_p3} 100%)`;

        // 3. Cosmic Twilight (Celestial Dusk): Deep celestial space tones fused with glowing nebula
        const c_p1 = hslToHex((H + 15) % 360, Math.min(100, S + 10), 74);                         // Radiant nebula
        const c_p2 = hslToHex(H, S, L);                                                            // Core custom accent
        const c_p3 = hslToHex((H - 25 + 360) % 360, Math.max(50, S), Math.max(24, L - 22));        // Deep twilight
        const c_p4 = hslToHex((H - 35 + 360) % 360, Math.max(60, S + 10), Math.max(14, L - 32));   // Midnight void
        const cosmic_primary = `linear-gradient(135deg, ${c_p1} 0%, ${c_p2} 32%, ${c_p3} 72%, ${c_p4} 100%)`;

        const c_s1 = hslToHex((H - 20 + 360) % 360, Math.max(30, S - 20), 90);                    // Starlight frost
        const c_s2 = hslToHex(H, S, Math.min(68, L + 12));                                         // Nebula glow
        const c_s3 = hslToHex((H + 20) % 360, Math.min(100, S + 8), Math.max(32, L - 10));        // Deep cosmic aura
        const cosmic_secondary = `linear-gradient(135deg, ${c_s1} 0%, ${c_s2} 38%, ${c_s3} 100%)`;
        const cosmic_accent = `linear-gradient(135deg, ${c_p2} 0%, ${c_p3} 100%)`;

        // 4. Sunset Radiance (Warm Solar Fusion): Sunlit warm gold/coral into the custom color
        const s_p2 = hslToHex((H - 12 + 360) % 360, S, Math.min(66, L + 10));
        const s_p3 = hslToHex(H, S, L);
        const s_p4 = hslToHex((H + 16) % 360, Math.min(100, S + 10), Math.max(22, L - 18));
        const sunset_primary = `linear-gradient(135deg, #FDE047 0%, ${s_p2} 32%, ${s_p3} 70%, ${s_p4} 100%)`;

        const s_s2 = hslToHex((H + 40) % 360, S, Math.min(70, L + 12));
        const s_s3 = hslToHex((H + 20) % 360, Math.min(100, S + 8), Math.max(36, L - 8));
        const sunset_secondary = `linear-gradient(135deg, #FFF1F2 0%, ${s_s2} 38%, ${s_s3} 100%)`;
        const sunset_accent = `linear-gradient(135deg, ${s_p2} 0%, ${s_p3} 100%)`;

        // 5. Cyber Glow (Electric Modern Duo): High-energy calibrated neon flow
        const cy_p1 = hslToHex((H - 22 + 360) % 360, 98, 70);
        const cy_p2 = hslToHex(H, 96, 52);
        const cy_p3 = hslToHex((H + 18) % 360, 100, 36);
        const cyber_primary = `linear-gradient(135deg, ${cy_p1} 0%, ${cy_p2} 48%, ${cy_p3} 100%)`;

        const cy_s1 = hslToHex((H + 160) % 360, 45, 90);
        const cy_s2 = hslToHex((H + 170) % 360, 85, 62);
        const cy_s3 = hslToHex((H + 180) % 360, 92, 46);
        const cyber_secondary = `linear-gradient(135deg, ${cy_s1} 0%, ${cy_s2} 42%, ${cy_s3} 100%)`;
        const cyber_accent = `linear-gradient(135deg, ${cy_p1} 0%, ${cy_p2} 100%)`;

        return [
            {
                id: 'aura',
                name: 'Aura Flow',
                subtitle: 'Analogous Harmony',
                description: 'Smooth neighboring hue drift with luminous highlights',
                primary: aura_primary,
                secondary: aura_secondary,
                accentGrad: aura_accent
            },
            {
                id: 'monochrome',
                name: 'Pure Depth',
                subtitle: 'Clean Monochrome',
                description: 'Deep onyx shade to luminous tints of your exact custom color',
                primary: mono_primary,
                secondary: mono_secondary,
                accentGrad: mono_accent
            },
            {
                id: 'cosmic',
                name: 'Cosmic Twilight',
                subtitle: 'Celestial Dusk',
                description: 'Deep space tones fused with glowing nebula highlights',
                primary: cosmic_primary,
                secondary: cosmic_secondary,
                accentGrad: cosmic_accent
            },
            {
                id: 'sunset',
                name: 'Sunset Radiance',
                subtitle: 'Warm Solar Fusion',
                description: 'Rich amber and coral sunrise blending into your accent',
                primary: sunset_primary,
                secondary: sunset_secondary,
                accentGrad: sunset_accent
            },
            {
                id: 'cyber',
                name: 'Cyber Glow',
                subtitle: 'Vibrant Modern Duo',
                description: 'High-contrast energetic flow calibrated for clean readability',
                primary: cyber_primary,
                secondary: cyber_secondary,
                accentGrad: cyber_accent
            }
        ];
    }

    // ── AI Dynamic Harmonic Gradient Synthesis ───────────────────────────────
    function synthesizeHarmonicGradients(hexColor, requestedStyleId, isCustom = false) {
        const cleanHex = hexColor ? hexColor.toLowerCase().trim() : '#15ac49';
        const rgb = hexToRgb(cleanHex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        const storedStyle = (typeof localStorage !== 'undefined') ? localStorage.getItem('ocal-settings-gradient-style') : null;
        const styleId = requestedStyleId || storedStyle || 'aura';

        // 1. Check exact preset matches ONLY if NOT a custom color and NO custom gradient style requested
        if (!isCustom && !requestedStyleId && !storedStyle) {
            for (const preset of CURATED_PRESETS) {
                if (preset.names.some(n => n === cleanHex || cleanHex.includes(n.replace('#', '')))) {
                    return {
                        primary: preset.primary,
                        secondary: preset.secondary,
                        accentGrad: preset.accentGrad,
                        styleId: 'preset',
                        matchedPreset: true
                    };
                }
            }
        }

        // 2. Low saturation / grayscale handling
        if (hsl.s < 12) {
            const slatePreset = CURATED_PRESETS.find(p => p.names.includes('slate'));
            return {
                primary: slatePreset.primary,
                secondary: slatePreset.secondary,
                accentGrad: slatePreset.accentGrad,
                styleId: 'slate',
                matchedPreset: true
            };
        }

        // 3. Dynamic Harmonic Gradient Selection (from the exact custom color)
        const styles = getHarmonicGradientStyles(cleanHex);
        const chosen = styles.find(s => s.id === styleId) || styles[0];

        return {
            primary: chosen.primary,
            secondary: chosen.secondary,
            accentGrad: chosen.accentGrad,
            styleId: chosen.id,
            styleName: chosen.name,
            allStyles: styles,
            matchedPreset: false
        };
    }

    // ── AI Logo Color Shifter Calculation ────────────────────────────────────
    function calculateLogoFilter(hexColor, options) {
        if (!hexColor) return 'none';
        const opts = options || {};

        // Check if user disabled icon sync
        let syncTheme = opts.syncTheme;
        // User requested fixed preset PNG logos: Light.png for light mode, Dark.png for dark mode.
        // No artificial CSS filters are applied.
        return 'none';
    }

    let _isHarmonizing = false;
    let _lastBroadcastTheme = null;
    let _lastBroadcastAccent = null;

    // ── Helper to detect if a document or window is in InPrivate / Private Mode ──
    function isPrivateContext(targetDoc) {
        const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
        try {
            const win = (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null);
            if (win && win.location) {
                const loc = win.location;
                if (loc.search && loc.search.includes('private=true')) return true;
                if (loc.hash && loc.hash.includes('private')) return true;
                if (loc.pathname && (loc.pathname.includes('private-window') || loc.pathname.includes('private-home'))) return true;
                if (loc.href && (loc.href.includes('private=true') || loc.href.includes('private-window') || loc.href.includes('private-home'))) return true;
            }
            if (doc && doc.documentElement) {
                const cl = doc.documentElement.classList;
                if (cl.contains('sp-private-mode') || cl.contains('private-mode')) return true;
            }
            if (doc && doc.body) {
                const bl = doc.body.classList;
                if (bl.contains('sp-private-mode') || bl.contains('private-mode')) return true;
            }
        } catch (e) {}
        return false;
    }

    // ── Set & Apply Gradient Style ──────────────────────────────────────────
    function setGradientStyle(styleId, targetDoc) {
        if (!styleId) return null;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('ocal-settings-gradient-style', styleId);
                localStorage.setItem('ocal-settings-custom-color', 'true');
            }
        } catch (e) {}

        const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
        const storedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-theme') : null) || 'dark';
        const storedAccent = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-accent') : null) || (storedTheme === 'light' ? '#15AC49' : '#09F0A0');

        return applyHarmonizedTheme(storedAccent, storedTheme, doc, true, null, styleId);
    }

    // ── Apply & Sync to DOM ──────────────────────────────────────────────────
    function applyHarmonizedTheme(accentHex, themeMode, targetDoc, broadcastToElectron = false, isPrivateOverride = null, styleId = null) {
        if (_isHarmonizing) return;
        _isHarmonizing = true;
        try {
            const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
            if (!doc) return;

            const isPrivate = (isPrivateOverride !== null) ? !!isPrivateOverride : isPrivateContext(doc);

            const storedTheme = !isPrivate && (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-theme') : null);
            const currentTheme = isPrivate ? 'dark' : (themeMode || (doc.documentElement ? doc.documentElement.getAttribute('data-theme') : null) || (doc.body ? doc.body.getAttribute('data-theme') : null) || storedTheme || 'dark');
            const isLight = (currentTheme === 'light');

            const storedAccent = !isPrivate && (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-accent') : null);
            let baseColor = accentHex || (isPrivate ? '#f87d51' : (storedAccent || (isLight ? '#15AC49' : '#09F0A0')));
            if (typeof baseColor === 'string') {
                baseColor = baseColor.trim();
                if (!/^#[0-9A-Fa-f]{3,8}$/.test(baseColor)) {
                    baseColor = isPrivate ? '#f87d51' : (isLight ? '#15AC49' : '#09F0A0');
                }
            }

            const activeStyle = styleId || (!isPrivate && typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-gradient-style') : null) || 'aura';
            const isCustom = !isPrivate && (typeof localStorage !== 'undefined' ? (localStorage.getItem('ocal-settings-custom-color') === 'true') : false);

            const root = doc.documentElement;
            const body = doc.body;

            // Synthesize harmonic gradients with the active style
            const harmony = synthesizeHarmonicGradients(baseColor, activeStyle, isCustom);

            // Avoid redundant styling if already identical across theme, accent, and gradients
            const curPrimary = root ? root.style.getPropertyValue('--sp-primary-grad') : '';
            if (root && 
                root.getAttribute('data-theme') === currentTheme && 
                root.style.getPropertyValue('--accent') === baseColor && 
                curPrimary === harmony.primary &&
                (!isPrivate || root.classList.contains('sp-private-mode'))) {
                return harmony;
            }

            const contrastText = getContrastColor(baseColor);
            const logoFilter = calculateLogoFilter(baseColor);
            const logoGlow = `0 0 16px ${baseColor}`;

            if (root) {
                root.setAttribute('data-theme', currentTheme);
                root.removeAttribute('data-theme-combo');
                if (isPrivate && !root.classList.contains('sp-private-mode')) {
                    root.classList.add('sp-private-mode');
                }
            }
            if (body) {
                body.setAttribute('data-theme', currentTheme);
                body.removeAttribute('data-theme-combo');
                if (isPrivate && !body.classList.contains('sp-private-mode')) {
                    body.classList.add('sp-private-mode');
                }
            }

            const setProps = (el) => {
                if (!el) return;
                el.style.setProperty('--accent', baseColor);
                el.style.setProperty('--accent-border', baseColor);
                el.style.setProperty('--accent-glow', `color-mix(in srgb, ${baseColor} 30%, transparent)`);
                el.style.setProperty('--accent-dim', `color-mix(in srgb, ${baseColor} 12%, transparent)`);
                el.style.setProperty('--accent-text', contrastText);

                el.style.setProperty('--sp-primary-grad', harmony.primary);
                el.style.setProperty('--sp-green-grad', harmony.primary);
                el.style.setProperty('--sp-secondary-grad', harmony.secondary);
                el.style.setProperty('--sp-orange-grad', harmony.secondary);
                el.style.setProperty('--sp-accent-grad', harmony.accentGrad);

                el.style.setProperty('--logo-filter', logoFilter);
                el.style.setProperty('--logo-glow', logoGlow);
            };

            setProps(root);
            if (body) setProps(body);

            // Dynamically update any logo images on the page directly with preset Dark.png/Light.png
            updateLogoElements(doc, currentTheme);

            // Save to localStorage ONLY if NOT in private mode and values changed
            if (!isPrivate) {
                try {
                    if (localStorage.getItem('ocal-settings-accent') !== baseColor) {
                        localStorage.setItem('ocal-settings-accent', baseColor);
                    }
                    if (localStorage.getItem('ocal-settings-theme') !== currentTheme) {
                        localStorage.setItem('ocal-settings-theme', currentTheme);
                    }
                    localStorage.setItem('ocal-settings-gradient-style', activeStyle);
                    localStorage.setItem('ocal-settings-primary-grad', harmony.primary);
                    localStorage.setItem('ocal-settings-secondary-grad', harmony.secondary);
                    localStorage.setItem('ocal-settings-accent-grad', harmony.accentGrad);
                    localStorage.setItem('ocal-settings-logo-filter', logoFilter);
                } catch (e) {}
            }

            // ONLY send IPC if broadcastToElectron was explicitly requested AND not in private mode
            if (!isPrivate && broadcastToElectron && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.updateSetting) {
                if (_lastBroadcastTheme !== currentTheme) {
                    _lastBroadcastTheme = currentTheme;
                    window.electronAPI.updateSetting('themeMode', currentTheme);
                }
                if (_lastBroadcastAccent !== baseColor) {
                    _lastBroadcastAccent = baseColor;
                    window.electronAPI.updateSetting('accentColor', baseColor);
                }
                window.electronAPI.updateSetting('gradientStyle', activeStyle);
            }

            // Dispatch notification event in the local window
            try {
                const event = new CustomEvent('ocal-theme-harmonized', {
                    detail: {
                        accent: baseColor,
                        theme: currentTheme,
                        gradientStyle: activeStyle,
                        primaryGrad: harmony.primary,
                        secondaryGrad: harmony.secondary,
                        accentGrad: harmony.accentGrad,
                        logoFilter: logoFilter,
                        isPrivate: isPrivate
                    }
                });
                window.dispatchEvent(event);
            } catch (e) {}

            return harmony;
        } finally {
            _isHarmonizing = false;
        }
    }

    // ── AI Color Intelligence & Palette Suggestion Engine ─────────────────────
    function analyzeColorIntelligence(hexColor) {
        if (!hexColor) hexColor = '#15AC49';
        const cleanHex = hexColor.toString().trim();
        const rgb = hexToRgb(cleanHex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const H = hsl.h;
        const S = hsl.s;
        const L = hsl.l;

        let mood = "Balanced Harmony";
        let temp = "Neutral Tone";
        let vibrancy = S > 70 ? "Ultra Vivid" : (S > 35 ? "Balanced" : "Subtle Tone");
        let name = "Custom Shade";

        if (S < 15) {
            mood = "Titanium Slate";
            temp = "Neutral Slate";
            name = L > 70 ? "Platinum Light" : "Obsidian Slate";
        } else if (H >= 345 || H < 15) {
            mood = "Crimson Energy";
            temp = "Warm Crimson";
            name = "Ruby Crimson";
        } else if (H >= 15 && H < 45) {
            mood = "Solar Flame";
            temp = "Warm Coral";
            name = "Solar Tangerine";
        } else if (H >= 45 && H < 70) {
            mood = "Golden Amber";
            temp = "Warm Amber";
            name = "Volt Amber";
        } else if (H >= 70 && H < 165) {
            mood = "Emerald Focus";
            temp = "Pure Emerald";
            name = "Emerald Neon";
        } else if (H >= 165 && H < 205) {
            mood = "Oceanic Clarity";
            temp = "Cool Cyan";
            name = "Electric Cyan";
        } else if (H >= 205 && H < 255) {
            mood = "Sapphire Focus";
            temp = "Cool Sapphire";
            name = "Sapphire Azure";
        } else if (H >= 255 && H < 315) {
            mood = "Cyber Violet";
            temp = "Cool Violet";
            name = "Cyber Orchid";
        } else {
            mood = "Neon Magenta";
            temp = "Warm Magenta";
            name = "Neon Fuchsia";
        }

        // Generate 4 AI Curated Variations with mathematically sound color harmony
        let suggestions = [];
        if (S < 15) {
            suggestions = [
                {
                    title: "Slate Blue",
                    desc: "Harmonic subtle tint",
                    color: hslToHex(215, 42, Math.max(46, Math.min(62, L))),
                    tag: "Harmonic"
                },
                {
                    title: "Emerald Neon",
                    desc: "Vibrant high-energy pop",
                    color: hslToHex(152, 75, 48),
                    tag: "Vibrant"
                },
                {
                    title: "Amber Glow",
                    desc: "Direct contrast pairing",
                    color: hslToHex(38, 90, 52),
                    tag: "Contrast"
                },
                {
                    title: "Soft Pewter",
                    desc: "Muted refined luxury",
                    color: hslToHex(220, 14, Math.min(78, Math.max(40, L + 10))),
                    tag: "Subtle"
                }
            ];
        } else {
            suggestions = [
                {
                    title: "Analogous",
                    desc: "Harmonic neighbor shift",
                    color: hslToHex((H + 30) % 360, Math.min(96, Math.max(62, S)), Math.max(46, Math.min(58, L))),
                    tag: "Harmonic"
                },
                {
                    title: "Triadic Pop",
                    desc: "Vibrant balanced chord",
                    color: hslToHex((H + 120) % 360, Math.min(96, Math.max(68, S)), Math.max(46, Math.min(56, L))),
                    tag: "Vibrant"
                },
                {
                    title: "Complement",
                    desc: "Direct contrast pairing",
                    color: hslToHex((H + 180) % 360, Math.min(98, Math.max(72, S)), Math.max(46, Math.min(56, L))),
                    tag: "Contrast"
                },
                {
                    title: "Soft Velvet",
                    desc: "Muted luxury UI tone",
                    color: hslToHex(H, Math.max(26, Math.min(44, Math.round(S * 0.45))), Math.min(72, Math.max(54, Math.round(L * 1.15)))),
                    tag: "Subtle"
                }
            ];
        }

        return {
            name,
            mood,
            temp,
            vibrancy,
            hex: cleanHex,
            hsl,
            suggestions
        };
    }

    // ── Theme Store Combo Theme Engine (Reverted / Disabled) ─────────────────
    function getStoreCombos() {
        return [];
    }

    function applyComboTheme() {
        return null;
    }

    function clearComboTheme(targetDoc) {
        const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
        if (doc) {
            if (doc.documentElement) doc.documentElement.removeAttribute('data-theme-combo');
            if (doc.body) doc.body.removeAttribute('data-theme-combo');
        }

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('ocal-theme-combo');
                localStorage.removeItem('ocal-theme-combo-mode');
                localStorage.removeItem('ocal-theme-combo-data');
                localStorage.removeItem('ocal-custom-combos');
            }
        } catch (e) {}

        const storedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-theme') : null) || 'dark';
        const defaultAccent = (storedTheme === 'light' ? '#15AC49' : '#09F0A0');
        const storedAccent = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-accent') : null) || defaultAccent;
        applyHarmonizedTheme(storedAccent, storedTheme, doc);
    }

    function createCustomCombo() {
        return null;
    }

    function getCustomCombos() {
        return [];
    }

    function deleteCustomCombo() {
        return true;
    }

    // ── Wallpaper Helpers & Adaptive Palette Extraction ─────────────────────
    function extractWallpaperPalette(imageUrl, callback) {
        if (!imageUrl || imageUrl === 'none' || typeof Image === 'undefined') {
            if (callback) callback(null);
            return;
        }
        try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 32;
                    canvas.height = 32;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0, 32, 32);
                    const data = ctx.getImageData(0, 0, 32, 32).data;

                    let totalR = 0, totalG = 0, totalB = 0, count = 0;
                    let maxSat = -1;
                    let bestHex = null;

                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        totalR += r;
                        totalG += g;
                        totalB += b;
                        count++;

                        const hsl = rgbToHsl(r, g, b);
                        if (hsl.s >= 25 && hsl.l >= 25 && hsl.l <= 80) {
                            if (hsl.s > maxSat) {
                                maxSat = hsl.s;
                                bestHex = rgbToHex(r, g, b);
                            }
                        }
                    }

                    const avgR = Math.round(totalR / count);
                    const avgG = Math.round(totalG / count);
                    const avgB = Math.round(totalB / count);
                    const avgLuma = (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 255;
                    const dominantHex = bestHex || rgbToHex(avgR, avgG, avgB);

                    if (callback) {
                        callback({
                            accent: dominantHex,
                            isDark: avgLuma < 0.58,
                            avgLuma: avgLuma,
                            rgb: { r: avgR, g: avgG, b: avgB }
                        });
                    }
                } catch(e) {
                    if (callback) callback(null);
                }
            };
            img.onerror = function() {
                if (callback) callback(null);
            };
            img.src = imageUrl;
        } catch(e) {
            if (callback) callback(null);
        }
    }

    let _lastExtractedWpUrl = null;

    function applySavedWallpaper(targetDoc) {
        const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
        if (!doc) return;
        const bg = doc.querySelector('.sp-wallpaper-bg');
        const root = doc.documentElement;
        const body = doc.body;

        try {
            const wp = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-home-wallpaper') : null);
            const blur = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-home-wallpaper-blur') : null) || '0';
            const dim = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-home-wallpaper-dim') : null) || '20';

            if (wp && wp !== 'none') {
                const blurPx = `${blur}px`;
                const dimVal = `${parseInt(dim, 10) / 100}`;
                if (bg) {
                    if (bg.style.backgroundImage !== `url("${wp}")`) {
                        bg.style.backgroundImage = `url("${wp}")`;
                    }
                    bg.style.setProperty('--wp-blur', blurPx);
                    bg.style.setProperty('--wp-dim', dimVal);
                    bg.classList.add('has-custom-wallpaper');
                }
                if (root) {
                    root.style.setProperty('--wp-blur', blurPx);
                    root.style.setProperty('--wp-dim', dimVal);
                    root.classList.add('has-custom-wallpaper');
                }
                if (body) {
                    body.classList.add('has-custom-wallpaper');
                }

                // If this wallpaper was already analyzed, avoid re-running analysis
                if (_lastExtractedWpUrl === wp) return;
                _lastExtractedWpUrl = wp;

                // Subtle contrast helper for title text readability over wallpaper
                // Strictly preserves the user's chosen Theme and Accent Color!
                extractWallpaperPalette(wp, (palette) => {
                    if (!palette || !body) return;
                    if (palette.isDark) {
                        body.classList.add('wallpaper-dark-tone');
                        body.classList.remove('wallpaper-light-tone');
                    } else {
                        body.classList.add('wallpaper-light-tone');
                        body.classList.remove('wallpaper-dark-tone');
                    }
                });
            } else {
                _lastExtractedWpUrl = null;
                if (bg) {
                    bg.style.backgroundImage = 'none';
                    bg.classList.remove('has-custom-wallpaper');
                }
                if (root) {
                    root.classList.remove('has-custom-wallpaper');
                }
                if (body) {
                    body.classList.remove('has-custom-wallpaper', 'wallpaper-dark-tone', 'wallpaper-light-tone');
                }
            }
        } catch (e) {}
    }

    function setWallpaper(url, blur, dim) {
        try {
            if (url && url !== 'none') {
                localStorage.setItem('ocal-home-wallpaper', url);
            } else {
                localStorage.removeItem('ocal-home-wallpaper');
            }
            if (blur !== undefined && blur !== null) localStorage.setItem('ocal-home-wallpaper-blur', String(blur));
            if (dim !== undefined && dim !== null) localStorage.setItem('ocal-home-wallpaper-dim', String(dim));
            applySavedWallpaper();
        } catch (e) {}
    }

    function clearWallpaper() {
        try {
            localStorage.removeItem('ocal-home-wallpaper');
            applySavedWallpaper();
        } catch (e) {}
    }

    // ── Auto-Initialize on script load ────────────────────────────────────────
    function initAutoSync() {
        if (typeof document !== 'undefined' && isPrivateContext(document)) {
            // In private mode: do NOT pull normal user settings from localStorage!
            // Apply signature private theme locally without touching localStorage:
            try {
                applyHarmonizedTheme('#f87d51', 'dark', document, false, true);
            } catch (e) {}
            return; // Do NOT attach normal storage listener in private context!
        }

        // Initial application from storage
        try {
            applySavedWallpaper();

            const storedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-theme') : null) || 'dark';
            const defaultAccent = (storedTheme === 'light' ? '#15AC49' : '#09F0A0');
            let storedAccent = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-accent') : null) || defaultAccent;
            // Clean up any stale private purple value that previously leaked into localStorage
            if (storedAccent === '#a855f7' || storedAccent === '#8b5cf6') {
                storedAccent = (storedTheme === 'light' ? '#15AC49' : '#09F0A0');
            }
            applyHarmonizedTheme(storedAccent, storedTheme);
        } catch (e) {}

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (e) => {
                if (isPrivateContext(typeof document !== 'undefined' ? document : null)) return;

                if (e.key === 'ocal-home-wallpaper' || e.key === 'ocal-home-wallpaper-blur' || e.key === 'ocal-home-wallpaper-dim') {
                    applySavedWallpaper();
                } else if (e.key === 'ocal-settings-accent' || e.key === 'ocal-settings-theme' || e.key === 'ocal-settings-gradient-style' || e.key === 'ocal-settings-primary-grad') {
                    // Ignore private purple values if they somehow arrived via storage
                    if (e.newValue === '#a855f7' || e.newValue === '#8b5cf6') return;

                    const stTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-theme') : null) || 'dark';
                    let stAccent = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-accent') : null) || (stTheme === 'light' ? '#15AC49' : '#09F0A0');
                    if (stAccent === '#a855f7' || stAccent === '#8b5cf6') {
                        stAccent = (stTheme === 'light' ? '#15AC49' : '#09F0A0');
                    }
                    const stStyle = (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-gradient-style') : null) || 'aura';
                    applyHarmonizedTheme(stAccent, stTheme, null, false, false, stStyle);
                }
            });
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAutoSync);
        } else {
            initAutoSync();
        }
    }

    // ── Update Logo Elements in DOM with Preset PNG Logos ───────────────────
    function updateLogoElements(targetDoc, themeOrFilter) {
        const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
        if (!doc) return;

        let isDark = true;
        if (typeof themeOrFilter === 'string' && (themeOrFilter === 'dark' || themeOrFilter === 'light')) {
            isDark = (themeOrFilter === 'dark');
        } else {
            const currentTheme = (doc.documentElement ? doc.documentElement.getAttribute('data-theme') : null) || 
                (doc.body ? doc.body.getAttribute('data-theme') : null) || 
                (typeof localStorage !== 'undefined' ? localStorage.getItem('ocal-settings-theme') : null) || 'dark';
            isDark = (currentTheme === 'dark');
        }

        const targetName = isDark ? 'Dark.png' : 'Light.png';

        try {
            const logoImgs = doc.querySelectorAll('.sidebar-logo-img, .header-logo-img, .sidebar-logo-btn img, .ocal-brand-logo, .ocal-logo-preview, .icon-preview-card img, .ocal-preview-icon');
            logoImgs.forEach(img => {
                const src = img.getAttribute('src') || '';
                const prefix = src.includes('assets/') ? 'assets/' : '';
                const targetSrc = prefix + targetName;
                if (img.getAttribute('src') !== targetSrc) {
                    img.src = targetSrc;
                }
                img.style.filter = 'none';
            });
        } catch (e) {}
    }

    // Export API to global namespace
    const OcalColorHarmonizer = {
        hexToRgb,
        rgbToHex,
        rgbToHsl,
        hslToRgb,
        hslToHex,
        getContrastColor,
        calculateLogoFilter,
        updateLogoElements,
        getHarmonicGradientStyles,
        setGradientStyle,
        synthesizeHarmonicGradients,
        analyzeColorIntelligence,
        applyHarmonizedTheme,
        isPrivateContext,
        STORE_COMBOS,
        getStoreCombos,
        applyComboTheme,
        clearComboTheme,
        createCustomCombo,
        getCustomCombos,
        deleteCustomCombo,
        applySavedWallpaper,
        setWallpaper,
        clearWallpaper
    };

    global.OcalColorHarmonizer = OcalColorHarmonizer;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = OcalColorHarmonizer;
    }

})(typeof window !== 'undefined' ? window : globalThis);
