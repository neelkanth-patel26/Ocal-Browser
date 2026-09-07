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
        if (!hex) return { r: 21, g: 172, b: 73 };
        let c = hex.toString().trim().replace(/^#/, '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length !== 6) return { r: 21, g: 172, b: 73 };
        const num = parseInt(c, 16);
        if (isNaN(num)) return { r: 21, g: 172, b: 73 };
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
        return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
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

    // ── Curated Preset Harmony Palette Catalog ───────────────────────────────
    const CURATED_PRESETS = [
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

    // ── AI Dynamic Harmonic Gradient Synthesis ───────────────────────────────
    function synthesizeHarmonicGradients(hexColor) {
        const cleanHex = hexColor ? hexColor.toLowerCase().trim() : '#15ac49';
        const rgb = hexToRgb(cleanHex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        // 1. Check exact preset matches
        for (const preset of CURATED_PRESETS) {
            if (preset.names.some(n => n === cleanHex || cleanHex.includes(n.replace('#', '')))) {
                return {
                    primary: preset.primary,
                    secondary: preset.secondary,
                    accentGrad: preset.accentGrad,
                    matchedPreset: true
                };
            }
        }

        // 2. Low saturation / grayscale handling
        if (hsl.s < 12) {
            const slatePreset = CURATED_PRESETS.find(p => p.names.includes('slate'));
            return {
                primary: slatePreset.primary,
                secondary: slatePreset.secondary,
                accentGrad: slatePreset.accentGrad,
                matchedPreset: true
            };
        }

        // 3. Match by hue range in curated presets if close
        for (const preset of CURATED_PRESETS) {
            if (preset.hueRange && hsl.h >= preset.hueRange[0] && hsl.h <= preset.hueRange[1]) {
                return {
                    primary: preset.primary,
                    secondary: preset.secondary,
                    accentGrad: preset.accentGrad,
                    matchedPreset: true
                };
            }
        }

        // 4. Algorithmic Harmonic Color Synthesis (for any arbitrary custom color)
        const H = hsl.h;
        const S = Math.max(50, Math.min(95, hsl.s));
        const L = Math.max(35, Math.min(65, hsl.l));

        // Primary 4-stop gradient: Analogous luminous arc
        const p1_h = (H - 42 + 360) % 360;
        const p1 = hslToHex(p1_h, Math.min(100, S + 10), 74); // Warm Sunlit Highlight

        const p2_h = (H - 18 + 360) % 360;
        const p2 = hslToHex(p2_h, S, Math.min(68, L + 12));  // Harmonious Mid-tone

        const p3_h = H;
        const p3 = hslToHex(p3_h, S, L);                     // Vivid Base Anchor

        const p4_h = (H + 12) % 360;
        const p4 = hslToHex(p4_h, Math.min(100, S + 15), Math.max(22, L - 16)); // Deep Shadow Anchor

        const primaryGrad = `linear-gradient(135deg, ${p1} 0%, ${p2} 28%, ${p3} 68%, ${p4} 100%)`;

        // Secondary complementary / triadic 3-stop gradient (e.g. for Weather card)
        const sec_h = (H + 145) % 360; // Harmonic golden offset
        const s1_h = (sec_h - 35 + 360) % 360;
        const s1 = hslToHex(s1_h, 35, 92); // Frost highlight

        const s2_h = (sec_h - 12 + 360) % 360;
        const s2 = hslToHex(s2_h, 85, 70); // Warm sunrise bridge

        const s3_h = sec_h;
        const s3 = hslToHex(s3_h, 95, 52); // Saturated complementary base

        const secondaryGrad = `linear-gradient(135deg, ${s1} 0%, ${s2} 35%, ${s3} 100%)`;

        const accentGrad = `linear-gradient(135deg, ${p2} 0%, ${p3} 100%)`;

        return {
            primary: primaryGrad,
            secondary: secondaryGrad,
            accentGrad: accentGrad,
            matchedPreset: false
        };
    }

    // ── AI Logo Color Shifter Calculation ────────────────────────────────────
    function calculateLogoFilter(hexColor) {
        if (!hexColor) return 'none';
        const cleanHex = hexColor.toLowerCase().trim();
        const rgb = hexToRgb(cleanHex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        // Low saturation / monochrome / slate / white
        if (hsl.s < 14) {
            if (hsl.l > 75) {
                return 'grayscale(1) brightness(1.45) contrast(1.2) drop-shadow(0 0 6px rgba(255,255,255,0.45))';
            }
            return 'grayscale(1) brightness(1.2) contrast(1.15)';
        }

        // Original icon.png green core is at hue ~150deg
        const originalHue = 150;
        const hueDelta = (hsl.h - originalHue + 360) % 360;

        // Direct match for original emerald green
        if (Math.abs(hueDelta) <= 8 || Math.abs(hueDelta - 360) <= 8) {
            return 'none';
        }

        const satPercent = Math.max(95, Math.min(220, Math.round(hsl.s * 1.35)));
        const brightPercent = Math.max(90, Math.min(135, Math.round(hsl.l * 1.65)));

        return `hue-rotate(${hueDelta}deg) saturate(${satPercent}%) brightness(${brightPercent}%)`;
    }

    // ── Apply & Sync to DOM ──────────────────────────────────────────────────
    function applyHarmonizedTheme(accentHex, themeMode, targetDoc) {
        const doc = targetDoc || document;
        if (!doc || !doc.documentElement) return;

        const currentTheme = themeMode || doc.body?.getAttribute('data-theme') || localStorage.getItem('ocal-settings-theme') || 'light';
        const isLight = (currentTheme === 'light');
        const baseColor = accentHex || (isLight ? '#15AC49' : '#09F0A0');

        // Synthesize harmonic gradients and logo color filter
        const harmony = synthesizeHarmonicGradients(baseColor);
        const contrastText = getContrastColor(baseColor);
        const logoFilter = calculateLogoFilter(baseColor);
        const logoGlow = `0 0 16px ${baseColor}`;

        // Apply CSS custom properties to documentElement & body
        const root = doc.documentElement;
        const body = doc.body;

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

        // Dynamically update any logo images on the page directly
        try {
            const logoImgs = doc.querySelectorAll('.sidebar-logo-img, .header-logo-img, .sidebar-logo-btn img, .ocal-brand-logo');
            logoImgs.forEach(img => {
                img.style.filter = logoFilter;
            });
        } catch (e) {}

        // Save to localStorage for instant non-flash cross-tab synchronization
        try {
            localStorage.setItem('ocal-settings-accent', baseColor);
            localStorage.setItem('ocal-settings-theme', currentTheme);
            localStorage.setItem('ocal-settings-primary-grad', harmony.primary);
            localStorage.setItem('ocal-settings-secondary-grad', harmony.secondary);
            localStorage.setItem('ocal-settings-accent-grad', harmony.accentGrad);
            localStorage.setItem('ocal-settings-logo-filter', logoFilter);
        } catch (e) {}

        // Dispatch notification event in the local window
        try {
            const event = new CustomEvent('ocal-theme-harmonized', {
                detail: {
                    accent: baseColor,
                    theme: currentTheme,
                    primaryGrad: harmony.primary,
                    secondaryGrad: harmony.secondary,
                    accentGrad: harmony.accentGrad,
                    logoFilter: logoFilter
                }
            });
            window.dispatchEvent(event);
        } catch (e) {}

        return harmony;
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

        let mood = "Harmonious & Balanced";
        let temp = "Neutral Tone";
        let vibrancy = S > 70 ? "Ultra Vivid" : (S > 35 ? "Balanced Resonance" : "Muted Minimal");
        let name = "Custom Shade";

        if (S < 15) {
            mood = "Minimalist Titanium Flow";
            temp = "Obsidian Neutral";
            name = L > 70 ? "Platinum Light" : "Obsidian Slate";
        } else if (H >= 345 || H < 15) {
            mood = "High-Energy & Passion Focus";
            temp = "Warm Crimson";
            name = "Ruby Crimson";
        } else if (H >= 15 && H < 45) {
            mood = "Vibrant Sunset & Alertness";
            temp = "Warm Coral";
            name = "Solar Tangerine";
        } else if (H >= 45 && H < 70) {
            mood = "Radiant Solar Optimism";
            temp = "Warm Amber";
            name = "Volt Amber";
        } else if (H >= 70 && H < 165) {
            mood = "Restorative Deep Focus";
            temp = "Balanced Emerald";
            name = "Emerald Neon";
        } else if (H >= 165 && H < 205) {
            mood = "Lucid Oceanic Clarity";
            temp = "Cool Cyan";
            name = "Electric Cyan";
        } else if (H >= 205 && H < 255) {
            mood = "Deep Cognitive Flow";
            temp = "Cool Sapphire";
            name = "Sapphire Azure";
        } else if (H >= 255 && H < 315) {
            mood = "Creative Cyberpunk Intuition";
            temp = "Cool Violet";
            name = "Cyber Orchid";
        } else {
            mood = "Vivid Velvet Radiance";
            temp = "Warm Magenta";
            name = "Neon Fuchsia";
        }

        // Generate 4 AI Curated Variations based on the user's chosen custom color
        const suggestions = [
            {
                title: "Analogous Glow",
                desc: "Neighbor harmonic shift",
                color: hslToHex((H - 25 + 360) % 360, Math.min(100, S + 8), Math.max(40, Math.min(65, L))),
                tag: "Balanced"
            },
            {
                title: "Electric Neon",
                desc: "High-vibrancy energized pop",
                color: hslToHex(H, 100, Math.max(48, Math.min(58, L))),
                tag: "Vibrant"
            },
            {
                title: "Complementary",
                desc: "Dynamic contrast pairing",
                color: hslToHex((H + 145) % 360, Math.max(75, S), Math.max(42, Math.min(62, L))),
                tag: "Contrast"
            },
            {
                title: "Soft Velvet",
                desc: "Muted luxury tone",
                color: hslToHex(H, Math.max(28, S - 28), Math.min(76, L + 10)),
                tag: "Subtle"
            }
        ];

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

    // ── Auto-Initialize on script load ────────────────────────────────────────
    function initAutoSync() {
        // Initial application from storage
        try {
            const storedAccent = localStorage.getItem('ocal-settings-accent');
            const storedTheme = localStorage.getItem('ocal-settings-theme');
            if (storedAccent) {
                applyHarmonizedTheme(storedAccent, storedTheme);
            }
        } catch (e) {}

        // Listen for storage events (e.g. settings changed in another window/tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'ocal-settings-accent' || e.key === 'ocal-settings-theme') {
                const a = localStorage.getItem('ocal-settings-accent');
                const t = localStorage.getItem('ocal-settings-theme');
                applyHarmonizedTheme(a, t);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoSync);
    } else {
        initAutoSync();
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
        synthesizeHarmonicGradients,
        analyzeColorIntelligence,
        applyHarmonizedTheme
    };

    global.OcalColorHarmonizer = OcalColorHarmonizer;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = OcalColorHarmonizer;
    }

})(typeof window !== 'undefined' ? window : globalThis);
