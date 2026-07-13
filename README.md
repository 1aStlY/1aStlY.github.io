# Shouyu Lai Apple Liquid Glass Homepage V3

This version keeps the existing content and card interactions, with these changes:

- Restores the native operating-system pointer
- Enlarges the fixed title/navigation bar
- Uses a dedicated live Gaussian `backdrop-filter` layer for the title bar
- Excludes the title bar from SVG refraction so blur remains stable while content moves underneath
- Increases blur strength after scrolling begins
- Retains directional stretch and liquid refraction on content cards
- Keeps dark/light mode, Chinese/English switching, responsive layout, image preview, email copy, CV download, and visitor count

## Deploy

Upload every file in this folder to the root of the public repository:

`1aStIY.github.io`

The repository root must contain:

- `index.html`
- `styles.css`
- `liquid-glass.js`
- `app.js`
- `Shouyu_Lai_CV.pdf`
- `assets/`

After GitHub Pages deploys, hard refresh the page with `Ctrl + F5`.
