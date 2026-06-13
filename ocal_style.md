# Gaming Network Studio (GNS) Design System

This document details the visual guidelines, typography, design tokens, layout principles, and component patterns of the Gaming Network Studio (GNS) media group web application.

---

## 1. Visual Theme & Atmosphere
GNS utilizes a **clean, light-mode-locked showroom design system** heavily inspired by Google's flat design guidelines (Material Design). It rejects dark command-line themes, heavy HUD screens, and industrial coordinate grids in favor of generous whitespace, subtle shadows, rounded borders, and clear, professional page structures.

**Key Characteristics:**
- **Strict Light Mode**: Canvas is pure white (`#ffffff`) with soft light-grey backdrops (`#f8f9fa`). The system color scheme is locked, preventing dark-theme preferences from muddying the visual hierarchy.
- **Google-Style Accents**: Brand identity relies on Google's cohesive corporate accents—principally Google Blue (`#1a73e8`) and Google Green (`#1e8e3e`) for state-based readouts (e.g., active telemetry, badges).
- **Geometric Typography**: Built on clean, modern typefaces (`Plus Jakarta Sans` and `JetBrains Mono`) with tight displays and wide letter-spacing on UI label headers.
- **Flat Vector Artwork**: Replaces noisy/photorealistic AI-generated screenshots with clean, minimalist vector graphics and inline SVGs representing developer consoles, targets, cameras, and audio waves.

---

## 2. Color Palette & Roles

### Canvas & Surfaces
- **Canvas Background** (`--background`: `#ffffff`): Main backdrop for all primary sections, layouts, and page folds.
- **Muted Backdrop** (`--muted`: `#f8f9fa`): Soft grey background wash used to separate sections (e.g. stats bar, career list blocks, footer calls to action).
- **Surface Elevation** (`--card`: `#ffffff`): Background color for elevated component cards, input forms, and dialogue containers.

### Brand Accents
- **Google Blue** (`--accent-solid` / `--primary`: `#1a73e8`): Primary accent color. Used for button fills, custom text highlights, hover underlines, and active status focus rings.
- **Google Blue Dim** (`--accent-dim`: `rgba(26, 115, 232, 0.08)`): Soft light-blue background tint used for tag pills, active list badges, and outline button hovers.
- **Google Blue Border** (`--accent-border`: `rgba(26, 115, 232, 0.2)`): Semi-transparent blue border line used on card hover borders.

### Telemetry & Semantics
- **Online/Active Green** (`--green`: `#1e8e3e`): Represents live studio processes, active personnel badges, and compiler successes.
- **Error/Destructive Red** (`--red` / `--destructive`: `#d93025`): Google Red, reserved for form validation errors, failure dialogues, and alert banners.
- **Standard Borders** (`--border` / `--surface-border`: `#dadce0`): Thin solid line defining layouts and card boundaries.
- **Subtle Borders** (`--surface-border-light`: `#e8eaed`): Light dividers within cards or compact lists.

### Typography Colors
- **Text Primary** (`--text-primary` / `--foreground`: `#202124`): Charcoal black, used for all major headers, headings, and core copy. High contrast but softer than pure black.
- **Text Dim** (`--text-dim` / `--secondary`: `#5f6368`): Charcoal grey, used for body copy, descriptions, location tags, and list labels.
- **Text Muted** (`--text-muted`: `#70757a`): Medium grey, used for metadata labels, index codes, and disabled states.

---

## 3. Typography Rules

### Font Families
- **Display & Text** (`--font-display` / `--font-text`: `'Plus Jakarta Sans', sans-serif`): Geometric sans-serif font family handling all display headlines, section headings, body paragraphs, and interface text.
- **Code & UI Telemetry** (`--font-mono`: `'JetBrains Mono', monospace`): High-legibility monospaced typeface reserved for technical metrics, employee codes (`#OP-01`, `#GNS-001`), database outputs, and camera viewfinders.

### Typography Scale

| Token / Role | Font Family | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Monumental (Hero) | Plus Jakarta Sans | clamp(40px, 8vw, 80px) | 700 | 1.15 | -1.5px | Hero titles with high font-weight contrast |
| Feature Title (H2) | Plus Jakarta Sans | clamp(28px, 4.5vw, 44px) | 600 | 1.25 | -0.8px | Main section titles |
| Section Heading (H3) | Plus Jakarta Sans | clamp(20px, 3vw, 28px) | 600 | 1.30 | -0.4px | Sub-section headers, cards titles |
| Card Subhead (H4) | Plus Jakarta Sans | 20px | 600 | 1.40 | — | Feature cards, detail callouts |
| Mono Eyebrow Label | Plus Jakarta Sans | 13px | 600 | — | 0.8px | UPPERCASE, colored in accent-solid |
| Mono Small Tag | Plus Jakarta Sans | 11px | 500 | — | 0.2px | Subhead label metadata |
| Lead Paragraph | Plus Jakarta Sans | 17px | 400 | 1.65 | — | Large description leads |
| Body Regular | Plus Jakarta Sans | 16px | 400 | 1.65 | — | Standard paragraph reading copy |
| Body Muted / Compact | Plus Jakarta Sans | 13.5px | 500 | 1.55 | — | Small labels, list items, description tags |

---

## 4. Spacing, Borders & Shadows

### Spacing Scale
- **Base Grid**: `8px`
- **Spacing Units**:
  - `var(--spacing-xs)`: `8px`
  - `var(--spacing-sm)`: `16px`
  - `var(--spacing-md)`: `32px`
  - `var(--spacing-lg)`: `64px`
  - `var(--spacing-xl)`: `112px` (used for vertical padding on main sections)

### Corner Radius
- `var(--radius-sm)`: `6px` — Small items (text fields, details boxes, dropdown lists, tags).
- `var(--radius-lg)`: `12px` — Main layout cards, visual frames, showcase containers.
- `var(--radius-pill)`: `100px` — Primary button caps, status badges, navbar links.

### Shadow Elevations
- **Elevation Small** (`var(--shadow-sm)`: `0 1px 2px 0 rgba(60,64,67,0.15)`): Subtle drop shadow for buttons, small indicators, and inputs.
- **Elevation Medium** (`var(--shadow-md)`: `0 1px 3px 0 rgba(60,64,67,0.1), 0 4px 8px 3px rgba(60,64,67,0.05)`): Default surface shadow for interactive card systems.
- **Elevation Large** (`var(--shadow-lg)`: `0 4px 20px 0 rgba(60,64,67,0.12), 0 8px 24px 3px rgba(60,64,67,0.08)`): Deep shadow applied to cards on hover to elevate them visually.
- **Interactive Button** (`var(--shadow-interactive)`: `0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)`): Applied on active button hover states.

---

## 5. Component Patterns

### Buttons

**Primary Pill Button (`.btn-pill`)**
- Background: `var(--accent-solid)` (`#1a73e8`)
- Text: `#ffffff`, bold, `14px`
- Radius: `100px` (pill)
- Border: `1px solid var(--accent-solid)`
- Hover: Background fills to Google Blue Dark `#1557b0`, drops shadow `var(--shadow-interactive)`, translates `translateY(-1px)`.
- Active: Scale shifts to `scale(0.98)`.

**Secondary Outline Button (`.btn-outline`)**
- Background: transparent
- Text: `var(--accent-solid)` (`#1a73e8`), bold, `14px`
- Radius: `100px` (pill)
- Border: `1px solid var(--border)`
- Hover: Background fills to `var(--accent-dim)`, border transitions to `var(--accent-solid)`, translates `translateY(-1px)`.

### Cards & Container Grids
- **General Cards**: Card blocks use `1px solid var(--border)` outlines, `12px` rounded corners, and `--shadow-md` at rest.
- **Card Hover Animations**:
  ```css
  .card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--accent-border);
  }
  ```
- **Horizontal Split Cards**: For full-width items (such as the span-12 case studies on the home gallery), cards divide into a `50% / 50%` horizontal split on desktop viewports (image left, text details right) to preserve readability and image proportions.

### Navigation Header
- **Atmosphere**: Fixed sticky navbar (`height: 72px` collapsing to `64px` on scroll) styled with a semi-transparent glassmorphism filter:
  `background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border);`
- **Underline Slide**: Links feature a bottom border underline (`height: 2px`, `background: var(--accent-solid)`) that scales outwards from the left (`transform-origin: left`) on hover and active routes.

### Inputs & Forms
- **Elements**: Standard fields (`input`, `textarea`, `select`) use `#ffffff` backgrounds, `1px solid var(--border)` boundaries, and `6px` rounded corners.
- **Interactions**: On focus, elements transition borders to `var(--accent-solid)` (`#1a73e8`) with an inner ring shadow glow: `box-shadow: 0 0 0 2px var(--accent-dim);`.

---

## 6. Illustration & Graphic Style
GNS eliminates complex dark gradients, HUD coordinates, grid lines, and high-contrast photorealistic AI generations. It strictly standardizes on a **flat minimalist vector graphic design system**:
- **Consoles & Diagrams**: Technical telemetry grids are rendered as thin-stroke SVGs (e.g. realtime wireframe nodes, clean wave audio curves, camera focus viewfinders with ISO readings) over soft light-grey backdrops.
- **Vector Icons**: Custom inline checkmarks, status circles, and arrows utilize HSL accents (Google Blue / Green) to guide scanning.
- **Clean Images**: Images retain natural, full-color levels without grayscale filters or low-contrast opacity layers.
- **Route Icons**: Nav icons and favicons are delivered as ultra-lightweight SVG vectors (`public/favicon.svg` and `src/app/icon.svg`) to keep page rendering times exceptionally low.
- **Image Generation Prompt Guidelines**: When generating new visual assets (such as hero backgrounds or illustrations) via AI:
  - **Core Aesthetic**: Define the style as `"minimalist flat vector illustration"`, `"simple geometric shapes"`, and `"clean lines"`.
  - **Color Accents**: Specify `"pastel corporate colors (light blue, soft red, pale yellow, mint green)"` on a `"solid white background"`.
  - **Composition**: Request a `"clean, simple layout"` with ample whitespace to ensure any overlapping text remains highly legible.
  - **Exclusions**: Explicitly exclude `"dark themes"`, `"complex textures"`, `"high-contrast shadows"`, `"gradients into black"`, or `"photorealistic rendering"`.
