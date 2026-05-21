# Style Analysis: Unbound Music

## Overview
The "Unbound Music" project utilizes a highly modern, dark-themed design system with high-contrast accent colors and subtle surface elevations. The application is built using Next.js and Tailwind CSS, as indicated by the presence of `app/globals.css` and Next.js configuration files.

## Core Theme Variables
Based on the `globals.css` file, the core design language is built around the following parameters:

### Colors (Dark Mode Default)
- **Background (`--background`)**: `#0c0c0c` (Very deep, near-black gray)
- **Foreground (`--foreground`)**: `#e8e8e8` (Off-white for high contrast text)
- **Card/Surface (`--card`, `--surface-1`)**: `#111111` (Slightly lighter than background to create elevation)
- **Primary Accent (`--accent`)**: `#e8ff47` (Vibrant neon yellow/lime)
- **Muted/Secondary (`--muted`)**: `#1e1e1e`
- **Text Dim (`--text-dim`)**: `#666666`
- **Text Muted (`--text-muted`)**: `#3a3a3a`
- **Borders (`--border`, `--surface-border`)**: `#252525`

### Typography
The project imports three main font families from Google Fonts:
1. **Syne**: Used for weights 400, 500, 600, 700, 800 (likely for headings/display text).
2. **DM Mono**: Monospaced font for technical or specialized data.
3. **DM Sans**: The primary sans-serif font used for general UI elements.

### Layout & Borders
- **Border Radius (`--radius`)**: `2px` (Very sharp, minimalist corners by default, with `--radius-lg` at `4px`).
- *Note:* The user request mentions adding "rounded colors/corners" for the browser update, which will likely involve softening these sharp edges slightly.

## Aesthetics & Details
- **Micro-interactions**: The CSS contains specific custom animations like `fade-up` and `shimmer` (for skeletons).
- **Surface Elevation**: It uses a layered surface system (`--surface-0`, `--surface-1`, `--surface-2`) rather than drop shadows to create depth, which is a hallmark of premium modern web design.
- **Accents**: The neon yellow (`#e8ff47`) serves as a strong focal point against the dark, monochromatic surfaces, guiding user attention to interactive elements or key data points.

## Plan for Browser Integration
To integrate this style into the Ocal Browser:
1. Update CSS custom properties in `:root` and `body[data-theme="dark"]` to match the Unbound Music palette (e.g., set `--bg: #0c0c0c`, `--glass: #111111`, `--accent: #e8ff47`).
2. Adjust text and border colors to match the subtle grays (`#e8e8e8`, `#666666`, `#252525`).
3. Apply rounded corners (`border-radius`) across UI elements as requested by the user.
