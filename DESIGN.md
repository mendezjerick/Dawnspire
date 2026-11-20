---
name: Dawnspire Inc.
description: Architectural software portfolio with cinematic scale and fixed right navigation.
colors:
  signal: "#f14b28"
  signal-dark: "#bd3216"
  ink: "#181a1b"
  paper: "#f5f5f2"
  muted: "#626564"
  line: "#d9dad6"
  media-charcoal: "#1d2020"
  rail-paper: "#fafaf8"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(100px, 17.3vw, 300px)"
    fontWeight: 800
    lineHeight: 0.82
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(48px, 6.4vw, 100px)"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(55px, 6vw, 92px)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.09em"
rounded:
  structural: "0px"
  mock-window: "7px"
  phone-artwork: "28px"
spacing:
  compact: "8px"
  detail: "24px"
  section-desktop: "95px"
  section-mobile: "55px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.structural}"
    padding: "17px 23px"
  button-primary-hover:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
  button-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.structural}"
    padding: "17px 23px"
  navigation-rail:
    backgroundColor: "{colors.rail-paper}"
    width: "88px"
---

# Design System: Dawnspire Inc.

## Overview

**Creative North Star: "The Architectural Signal"**

A cinematic technical portfolio for Dawnspire Inc., a software development company. The user-pinned Endfield reference informs the architectural scale, condensed typography, registration marks, and fixed right navigation. Red-orange punctuates paper, charcoal, and grey.

Large editorial surfaces carry the atmosphere; compact controls keep exploration direct. Flat rules organize content while perspective and shadows chiefly belong to conceptual software artwork. Three founder profiles retain explicit placeholder labels.

**Key Characteristics:**
- Architectural imagery and oversized condensed lettering.
- Fixed right navigation with a red-orange active signal.
- Square functional controls and fine technical rules.
- Real products, schedule, and event photography; explicitly illustrative portraits.

## Colors

Red-orange provides energy against warm paper, technical ink, and restrained greys. Frontmatter values are normative.

### Primary
- **Signal Red-Orange** (`signal`): active navigation icons and markers, current timeline phases, heading punctuation, the ticker, and the full contact surface.
- **Deep Signal** (`signal-dark`): emphasized captions and selected project names on paper.

### Neutral
- **Technical Ink** (`ink`): primary text and dark actions.
- **Warm Paper** (`paper`): principal ground and light actions.
- **Quiet Grey** (`muted`): supporting descriptions.
- **Fine Rule** (`line`): structural dividers.
- **Journal Charcoal** (`media-charcoal`): inverse media environment.
- **Rail Paper** (`rail-paper`): persistent navigation ground.
- **White** (`white`): inverse action text and artwork highlights.

**The Signal Rule.** Use red-orange for active states, signature punctuation, and deliberate large signal fields.

## Typography

**Display Font:** Barlow Condensed, sans-serif fallback.  
**Body Font:** Barlow, sans-serif fallback.  
**Label/Mono Font:** Barlow; tracking and size establish technical labels without a separate mono family. Fonts are served locally through `/assets/fonts.css`.

**Character:** Tall, tightly set display lettering gives cinematic scale; functional text supports compact project metadata.

### Hierarchy
- **Display:** frontmatter display role, for the hero wordmark; switches to 17vw below 1100px. INC. is a separately sized annotation.
- **Headline:** frontmatter headline role, for uppercase section headings. Mobile headings use 57px, reducing to 48px below 390px.
- **Title:** frontmatter title role, for selected projects. Founder names use 32px condensed type at weight 600.
- **Body:** frontmatter body role, with project descriptions constrained to 38ch on desktop; mobile uses 15px and available width.
- **Label:** frontmatter label role for bracketed captions. Context-specific metadata ranges from 8px to 12px; retain tiny type for annotations rather than substantive reading.

## Layout

The desktop canvas reserves 88px for a fixed right rail. It expands to 112px from 1600px, contracts to 62px at 760px, and to 55px at 390px. Compact navigation stays visible; the implementation's mobile-menu button is hidden.

Content sections generally use 5% horizontal gutters, 95px top and 90px bottom spacing; mobile uses 6% gutters and 55px section padding. The project stage uses a 1.5:1 grid, media an asymmetric image/story grid, contact two columns, and founders three columns. These stack at 760px. The project index changes from four to two columns. Timeline content scrolls horizontally to preserve legibility.

The hero layers full-height background artwork, an enormous wordmark, technical annotations, and grounded caption/status blocks. Desktop height is max(800px, 100svh), capped at 1200px; compact breakpoints use explicit 850px, 820px, and 780px heights.

**The Right Rail Rule.** Keep navigation fixed to the right and reserve its width in the main content.

## Elevation & Depth

Structural surfaces are flat: tonal differences and thin rules establish hierarchy. The hero status module uses translucent paper and 14px backdrop blur; dialog backdrops use dark translucency and 8px blur. Perspective, orbital lines, and pronounced shadows belong to product artwork.

### Shadow Vocabulary
- **Workspace artwork** (`0 35px 55px #343f3629`): conceptual workspace window.
- **Dashboard/workflow artwork** (`0 30px 50px #0005`): floating software mockups.
- **Phone artwork** (`20px 30px 40px #232e2326`): conceptual mobile device.

**The Artwork Depth Rule.** Keep structural surfaces flat; reserve dramatic shadows and perspective for conceptual product illustrations.

## Shapes

Portfolio buttons, fields, tags, and structural panels are square. Thin rules, crosshairs, stepped 45° brand geometry, and square status indicators recur. Rounded windows (7px), device shells (28px), circular indicators, and orbital ellipses are confined to product illustrations. Portraits use rectangular crops and registration lines.

## Components

### Buttons
Confident rectangular blocks. Primary actions use ink/white and change to signal/ink on hover. Light actions use paper/ink and invert on hover. Default padding follows frontmatter, with 52px minimum height and a 35px icon gap. Project actions use 14px 18px padding and 46px minimum height. Transitions take 0.25s. Keyboard focus uses a 2px signal outline with 5px offset; disabled controls use 0.28 opacity.

### Chips
Square informational technology tags use pale grey (#e6e7e1), grey text (#555d4d), 5px 9px padding, and 10px type. Category filters instead use unfilled text, counts, and a signal underline when selected.

### Cards / Containers
Founder profiles and project indexes are open layouts rather than elevated shells. Project index entries have two-pixel top rules that turn signal when selected. Founder profiles preserve exactly three members, grey silhouette artwork, registration marks, and portrait-to-follow labels. The current-development module uses a signal top rule and translucent paper.

### Inputs / Fields
Search uses an unfilled square input and signal bottom border on focus. Contact fields are transparent with single bottom rules on signal; their focused underline turns white. Contact placeholders and disclosure text use ink for contrast. Visible labels remain above fields. Native required/email/length validation supplies errors; no custom error styling is implemented. Preparing an inquiry reveals a bordered draft and copy action; it sends no message.

### Navigation
Centered compact brand, stacked icons and labels, bottom motion control, and signal contact action. Active/hovered items gain a pale grey ground; active icons and the outer edge marker turn signal. Scroll position updates the active section and URL hash. All six destinations remain available on compact screens.

### Project Explorer
Filters and search update a selected project stage, index, and previous/next actions. Empty results provide reset. Native dialogs display larger product visuals, lock page scrolling, close with Escape, and restore prior focus. Media uses an indexed viewer and lightbox.

### Timeline
Six month columns contain square labeled phase bars. Signal denotes in progress; darker grey completed; lighter grey planned. A visible legend accompanies color. Selecting a bar exposes milestone details.

### Motion
After the entrance overlay begins clearing, the hero settles over 1.15s with scale/blur and cubic-bezier(.16,1,.3,1); the title opens through a crop mask over 0.8s. Project content enters over 0.55s; most state changes take 0.25s. The visible motion toggle disables animation, transitions, and smooth scrolling. The implementation also respects prefers-reduced-motion.

## Do's and Don'ts

### Do:
- **Do** keep navigation on the right at every implemented breakpoint.
- **Do** pair Barlow Condensed display type with Barlow functional text.
- **Do** preserve the three-founder composition and explicit placeholder labels.
- **Do** respect reduced motion and the visible motion toggle.

### Don't:
- **Don't** introduce a competing brand accent outside red-orange and established neutrals.
- **Don't** turn structural controls into pills.
- **Don't** present concepts, stock photographs, or placeholder biographies as company achievements.

### Loading Entrance
An authored dark-to-signal-to-hero sequence adapted from the Endfield loading screen. The brand area shows the static dark Dawnspire lockup from public/brand. Desktop progress fills a 10px right-edge rail; mobile fills a 7px horizontal rail 124px from the bottom. Percentage movement follows settled critical readiness tasks, smoothed with a 130ms time constant; the value is task completion, not byte download progress. Counter typography is Barlow Condensed 52px desktop / 40px mobile. Completion holds 180ms, wipes orange from the right over 640ms using cubic-bezier(.8,0,.5,1), then fades over 660ms. Reduced motion substitutes a 160ms opacity release, including if the preference changes during the wipe.

The surface uses #141515, #252827, #555a53, #707570, #a9aaa8 and #b8bbb5 as intentional dark-surface neutrals. Technical metadata uses 7–13px according to the reference; primary progress and the skip control remain prominent. Backdrop blur is bounded to 10px and only runs during entry. Critical tasks have a 6s escape deadline. Skip intro is always available; underlying content is inert and document scroll is locked only while the entrance is present. CSS honors the OS reduced-motion preference. No perpetual loops or audio.

## Voice

One motto and two supporting lines. Use these exact phrases; do not invent new slogans for headers, footers, or labels.

- **Motto:** Think forward. Climb higher. (under the hero wordmark, ticker, footers, intro footer, page title). It reads the staircase mark: steady equal steps, always rising.
- **What we do:** From vision to version one. (hero headline, intro screen)
- **Promise:** Every step, delivered. (beside the brand with “Software development”, contact header)

Section introductions (for example “Ideas, made tangible.”) introduce their section and are not mottos. Show each phrase at most once per viewport.
