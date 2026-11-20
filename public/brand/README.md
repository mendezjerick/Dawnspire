# Dawnspire brand assets

All files are pure vector SVG and scale to any size without quality loss. Text is converted to outlines, so no font needs to be installed.


## Files

| File | Use |
| --- | --- |
| `dawnspire-mark-light.svg` | Mark, ink + orange, for light backgrounds |
| `dawnspire-mark-dark.svg` | Mark, paper + orange, for dark backgrounds |
| `dawnspire-lockup-light.svg` | Mark + DAWNSPIRE INC., for light backgrounds |
| `dawnspire-lockup-dark.svg` | Mark + DAWNSPIRE INC., for dark backgrounds |
| `dawnspire-mark-animated-light.svg` / `-dark.svg` | Mark assembling, plays once and holds |
| `dawnspire-lockup-animated-light.svg` / `-dark.svg` | Mark assembling, then the wordmark rises in |
| `dawnspire-lockup-stacked-light.svg` / `-dark.svg` | Squeezed lockup: mark + DAWN / SPIRE INC. on two rows |
| `dawnspire-lockup-stacked-animated-light.svg` / `-dark.svg` | Mark assembling, then DAWN and SPIRE rise in row by row |
| `dawnspire-favicon.svg` | Square browser-tab icon; stairs switch to paper when the browser is in dark mode |

## Colours (site tokens)

| Token | Hex | Role |
| --- | --- | --- |
| `--ink` | `#181a1b` | Stairs and wordmark on light backgrounds |
| `--paper` | `#f5f5f2` | Stairs and wordmark on dark backgrounds |
| `--signal` | `#f14b28` | Third-column face and INC. in both modes |

On a signal-orange background, use ink stairs and wordmark with a paper face and INC., so the face stays visible.

## Geometry

Built on a 40-unit grid (1u = 40). The mark is 4u × 3u.

- **Stairs (one solid body):** three square steps. Each step is 1u wide and 1u tall, so the columns are 1u, 2u and 3u high. The third column runs out to the full 4u width, with a 45° cut at its base, so the spot where the orange face lands is already filled.
- **Third column (orange face):** the side of the tallest column, which creates the 3D stair illusion. It sits on top of the stairs. Its top returns to the left at 45° and its base is cut at 45°.
- **Angles:** every edge is horizontal, vertical or exactly 45°. There are no other angles.
- **Wordmark:** Barlow Condensed 800. Its cap height always equals the full height of the mark, with the cap tops level with the top of the mark and the baseline on its base. Placed 1u from the mark.
- **INC.:** cap height ¼ of the wordmark's cap height, signal orange, baseline-aligned. It sits ⅛ of the cap height after the wordmark.
- **Stacked lockup:** DAWN over SPIRE, each row cap height 1.25u, with 0.5u between the rows. The two rows together equal the mark's height: DAWN's cap tops line up with the top of the mark and SPIRE's baseline with its base. INC. has a cap height of half a row's, is baseline-aligned with SPIRE, and sits ⅕ of a row's cap height after it. The text starts 1u from the mark.

Keep at least 1u of clear space around the mark or lockup, where 1u is a quarter of the mark's width. Don't recolour, stretch, rotate or add effects.

## Motion

- The solid stairs rise from the bottom-left and the orange face drops in from the top-right, landing on the stairs. Each travels 1u along the 45° diagonal and fades in over the first half of its move.
- Easing is `cubic-bezier(.16,1,.3,1)` (expo-out). Stairs run 0.10–1.05 s and the orange face 0.22–1.17 s. The mark is locked by about 1.2 s.
- **Lockup:** after the mark locks, each letter of DAWNSPIRE rises into place from behind a baseline mask, staggered 45 ms apart. INC. fades in last, and the whole sequence finishes at about 2.1 s.
- **Stacked lockup:** same timing, but each row rises behind its own mask, so DAWN comes in first, then SPIRE, then INC.
- **Reduced motion:** with `prefers-reduced-motion` turned on, the final frame shows immediately.
- **Padding:** animated files have 1u of padding on every side so the pieces have room to travel. Static files are cropped tight to the artwork.
- **Replay:** to replay an animation inside an `<img>`, reload its `src`.
