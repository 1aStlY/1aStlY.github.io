# Shouyu Lai Personal Homepage V6

This version replaces the loading screen with a performance-mode selection page.

## Modes

### Full mode

- Live SVG liquid-glass refraction
- Real-time Gaussian backdrop blur
- Directional card stretching
- Directional top-bar flow
- Animated ambient lighting
- Scroll reveal animations

### Lite mode

- Same page content and layout
- No SVG displacement filters
- No backdrop blur
- No directional stretching
- No animated ambient background
- No scroll reveal animation
- Reduced shadows and hover work

The site recommends Lite mode on phones, reduced-motion devices, and devices reporting 4 GB of memory or less.

The user's selection can be remembered. A mode button in the top navigation bar allows switching later. Switching between active modes reloads the page so all filters and observers are cleanly removed or initialized.

## Deploy

Upload every file in this folder to the root of:

`1aStlY/1aStlY.github.io`

Required root files:

- `index.html`
- `styles.css`
- `app.js`
- `liquid-glass.js`
- `Shouyu_Lai_CV.pdf`
- `assets/`

Asset cache version: `v=6.0.0`
