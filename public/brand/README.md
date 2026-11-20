# Dawnspire brand kit

Every file here is generated from one geometry by `scripts/brand/generate.mjs` (run `npm run brand`). Edit the script, not the files.

## Folders

| Folder | Contents |
| --- | --- |
| `svg/` | Vector logos. Scale to any size; use these for the web, print, and design tools. |
| `png/` | The same logos as PNG with transparent backgrounds, 1024 and 2048 px wide. Use these where SVG is not supported or previews badly (Google Drive, Docs, Slides, email, social media). |
| `animated/` | Animated SVGs: the stairs rise, the orange face lands, the wordmark rises in. Play once and hold. |
| `icons/` | Favicon, app icon, profile picture, and link preview image. |

## Logos: 3 shapes × 5 colourways

Shapes: `mark` (stairs only), `lockup` (mark + DAWNSPIRE INC. on one line), `lockup-stacked` (mark + DAWN / SPIRE INC.).

| Colourway | Colours | Use on |
| --- | --- | --- |
| `light` | Ink stairs, orange face | White and light backgrounds |
| `dark` | Paper stairs, orange face | Black and dark backgrounds |
| `on-orange` | Ink stairs, paper face | The signal orange background |
| `black` | Ink only | Single-colour print, stamps, embossing |
| `white` | White only | Watermarks over photos, single-colour on dark |

File names: `svg/dawnspire-<shape>-<colourway>.svg` and `png/dawnspire-<shape>-<colourway>-<1024|2048>.png`.
The single-colour versions keep the 3D step readable with a thin transparent gap between the face and the stairs.

## Icons

| File | Size | Use |
| --- | --- | --- |
| `dawnspire-favicon.svg` | Square | Browser tab; stairs switch to paper when the browser is in dark mode |
| `dawnspire-app-icon.svg` / `-512.png` | 512 × 512 | App stores, home screens. Square corners; platforms round them |
| `dawnspire-profile.svg` / `-1024.png` | 1024 × 1024 | Social profile pictures; padded so circular crops keep the whole mark |
| `dawnspire-og-image.svg` / `.png` | 1200 × 630 | Link preview when the site is shared |

## Colours

| Token | Hex | Role |
| --- | --- | --- |
| Ink | `#181a1b` | Stairs and wordmark on light |
| Paper | `#f5f5f2` | Stairs and wordmark on dark; the face on orange |
| Signal | `#f14b28` | The face and INC.; the orange background |

## Geometry

Built on a 40-unit grid; the mark is 4 × 3 units. Three equal square steps (1, 2, 3 units high). The third column's orange side face returns at 45° at the top and is cut at 45° at the base. Every edge is horizontal, vertical, or exactly 45°.

- **Lockup:** DAWNSPIRE in Barlow Condensed 800, cap height equal to the mark's height, 1 unit from the mark. INC. at ¼ of that cap height, ⅛ after the word.
- **Stacked:** DAWN over SPIRE, each 1.25 units tall with 0.5 units between; together they equal the mark's height. INC. at half a row's cap height.
- Keep at least 1 unit of clear space (a quarter of the mark's width) around any logo. Do not recolour, stretch, rotate, or add effects.

## Voice

Motto: **Think forward. Climb higher.** · What we do: **From vision to version one.** · Promise: **Every step, delivered.**
