# North Arrow Logo — File Set

A minimalist cartesian north arrow, built from wavy wind-stripe lines, pointing up.
All source files are SVG (best format for web: sharp at any size, tiny file size),
with PNG/ICO fallbacks included for compatibility.

## Which file to use

| Use case                                   | File                                  |
|---------------------------------------------|----------------------------------------|
| Browser tab icon (favicon), auto light/dark  | `svg/favicon-adaptive.svg`             |
| Browser tab icon, light mode only            | `svg/favicon-light.svg` / `favicon.ico`|
| Browser tab icon, dark mode only             | `svg/favicon-dark.svg`                 |
| Top-left header / nav-bar small icon         | `svg/icon-mark-light.svg` or `icon-mark-dark.svg` |
| Website hero / larger logo lockup            | `svg/logo-light.svg` or `logo-dark.svg` |
| App icon / social avatar tile (square, filled bg) | `svg/tile-light.svg` or `tile-dark.svg` |

- `icon-mark-*` and `logo-*` are the **detailed** version — the arrow is built from
  6 thin wavy stripes. This detail reads best at 24px and above.
- `favicon-*` and `favicon-adaptive` are a **simplified** version — a solid arrow
  with gently rippled edges — tuned to stay legible all the way down to 16px,
  which is the smallest a favicon is ever shown.

## HTML setup

```html
<!-- Auto-switching favicon (recommended) -->
<link rel="icon" href="favicon-adaptive.svg" type="image/svg+xml">
<link rel="alternate icon" href="favicon.ico"> <!-- fallback for older browsers -->
<link rel="apple-touch-icon" href="png/tile-light-180.png">
```

## Colors used

**Light mode:** background `#FFFFFF`, ink `#0C3140`, glow `#237A94` @ 35%
**Dark mode:** background `#2E3438`, ink `#FFFFFF`, glow `#8ED0E4` @ 35%

## Folder contents

- `svg/` — all vector source files (edit these first; regenerate PNGs if you change them)
- `png/` — rasterized exports at common sizes (16–512px)
- `favicon.ico` — multi-resolution (16/32/48) favicon for legacy browser support
