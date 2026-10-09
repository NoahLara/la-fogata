# The mark

- `logo.svg` is the source: a flame over three logs, under a few stars. The flame is the one that waits on the loading screen. `logo.png` is the same at 1024 px.
- `apps/web/src/app/icon.svg`, `favicon.ico` (16, 32 and 48 px) and `apple-icon.png` (180 px) are the small versions: the flame alone on the night, bigger, so it still reads in a browser tab.
- `apps/web/src/app/opengraph-image.png` (1200 x 630) is the picture that shows when a link to the site is shared.

The colours are the theme's: night `#0b0d1a`, ember `#ff9650`, ember-soft `#ffb070`, gold `#ffd9a0`. The PNGs were drawn from the SVGs with `@resvg/resvg-js`; if you change an SVG, draw them again from it.
