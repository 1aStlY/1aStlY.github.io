# Shouyu Lai — Apple Liquid Glass Homepage V4

This package contains the complete GitHub Pages site.

## V4 changes

- Native pointer remains unchanged
- Critical CSS and the hero avatar are preloaded
- A short loading cover prevents first-frame popping and delays heavy effects
- Project images use lazy loading and asynchronous decoding
- SVG liquid refraction is initialized lazily near the viewport
- The fixed title bar keeps real-time Gaussian backdrop blur
- The title bar now expands strongly toward the pointer and shows a moving optical focus lobe
- CSS, JavaScript, and images use `?v=4.0.0` cache-busting parameters

## Upload to GitHub Pages

Upload every file and the entire `assets` folder to the root of:

`1aStlY/1aStlY.github.io`

The repository root should contain:

- `index.html`
- `styles.css`
- `app.js`
- `liquid-glass.js`
- `Shouyu_Lai_CV.pdf`
- `assets/`

After deployment, use `Ctrl + F5` once to bypass any older browser cache.


## V5 changes

- The four About cards now use a 2 × 2 layout on desktop and tablet.
- Public-facing copy now emphasizes broad, system-level robotics experience:
  mechanical design, electrical/embedded integration, control, reinforcement
  learning, diffusion models, multi-robot systems, and hardware debugging.
- The wording explicitly avoids claiming expert-level mastery of every area.
- Research, skills, first-screen summary, and contact copy use the same
  modest system-integration positioning.
- Asset URLs use `v=5.0.0` to avoid old browser caches.
