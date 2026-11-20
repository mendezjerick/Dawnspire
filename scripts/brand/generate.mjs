// Dawnspire brand kit generator. Writes public/brand/ and src/BrandLogo.tsx from one geometry.
// Run: npm run brand
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/brand');
const FONT = path.join(ROOT, 'public/assets/font-8.ttf'); // Barlow Condensed 800
const font = opentype.loadSync(FONT);

// ---- Palette (site tokens) ----
const INK = '#181a1b', PAPER = '#f5f5f2', SIGNAL = '#f14b28', WHITE = '#ffffff';

// ---- Geometry: 1 unit = 40. Mark = 4u x 3u. Only 0/45/90 degree edges. ----
const U = 40, MARK_W = 4 * U, MARK_H = 3 * U;
const r3 = n => +n.toFixed(3);
// Third column side face: 45 degree top return, 45 degree base chamfer.
const SIDE = `M${2*U} ${U}L${3*U} 0H${4*U}V${2*U}L${3*U} ${3*U}V${U}Z`;
// Stairs: one solid body with three equal square steps. Under the orange face it stops E short of the
// face's outer edges, so those edges blend only with the background (no dark fringe when rasterized).
const E = 0.5;
const chamferY = x => r3(6 * U - E * Math.SQRT2 - x); // inset of the base chamfer x + y = 240
const STAIRS = `M0 ${MARK_H}V${2*U}H${U}V${U}H${2*U}V0H${3*U}L${3*U + E} ${E}H${4*U - E}V${chamferY(4*U - E)}L${3*U} ${chamferY(3*U)}V${MARK_H}Z`;
const GAP = 3; // single-colour versions: transparent gap between face and stairs

// ---- Type: outlined Barlow Condensed so files render without the font ----
const capUnits = font.tables.os2.sCapHeight || 700;
function setLine(text, capHeight, x0, baseline, trackingEm) {
  const size = capHeight / capUnits * font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  let x = x0, minX = Infinity, maxX = -Infinity;
  const out = [];
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, baseline, size);
    const bb = p.getBoundingBox();
    if (isFinite(bb.x1)) { minX = Math.min(minX, bb.x1); maxX = Math.max(maxX, bb.x2); }
    out.push(p.toPathData(2));
    let adv = g.advanceWidth * size / font.unitsPerEm;
    if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * size / font.unitsPerEm;
    x += adv + (i < glyphs.length - 1 ? trackingEm * size : 0);
  });
  return { glyphs: out, minX, maxX };
}
const setLineAt = (text, cap, left, base, track) => setLine(text, cap, left - setLine(text, cap, 0, base, track).minX, base, track);

const TEXT_X = MARK_W + U;
// Horizontal lockup: cap height = mark height; INC. is 1/4 cap, 1/8 cap after the word.
const word = setLineAt('DAWNSPIRE', MARK_H, TEXT_X, MARK_H, -0.01);
const inc = setLineAt('INC.', MARK_H / 4, word.maxX + MARK_H / 8, MARK_H, 0.04);
const LOCK_W = Math.ceil(inc.maxX);
// Stacked lockup: DAWN / SPIRE INC., the two rows together equal the mark height.
const ROW_GAP = U / 2, ROW_CAP = (MARK_H - ROW_GAP) / 2;
const row1 = setLineAt('DAWN', ROW_CAP, TEXT_X, ROW_CAP, -0.01);
const row2 = setLineAt('SPIRE', ROW_CAP, TEXT_X, MARK_H, -0.01);
const sInc = setLineAt('INC.', ROW_CAP / 2, row2.maxX + ROW_CAP / 5, MARK_H, 0.04);
const STACK_W = Math.ceil(Math.max(row1.maxX, sInc.maxX));

// ---- Colourways ----
const COLOURWAYS = {
  light: { body: INK, accent: SIGNAL, label: 'for light backgrounds' },
  dark: { body: PAPER, accent: SIGNAL, label: 'for dark backgrounds' },
  'on-orange': { body: INK, accent: PAPER, label: 'for the signal orange background' },
  black: { body: INK, accent: INK, mono: true, label: 'single colour, black' },
  white: { body: WHITE, accent: WHITE, mono: true, label: 'single colour, white' },
};

const svgOpen = (vb, w, h, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-labelledby="t">\n<title id="t">${title}</title>\n`;

function mark(c, id = 'm', dx = 0, dy = 0, scale = 1) {
  const t = dx || dy || scale !== 1 ? ` transform="translate(${dx} ${dy})${scale !== 1 ? ` scale(${scale})` : ''}"` : '';
  if (!c.mono) return `<g${t}><path class="stairs" fill="${c.body}" d="${STAIRS}"/>\n<path class="side" fill="${c.accent}" d="${SIDE}"/></g>\n`;
  // Single colour: cut a thin gap around the face so the 3D step still reads.
  return `<g${t}><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="${MARK_W + 20}" height="${MARK_H + 20}">` +
    `<rect x="-10" y="-10" width="${MARK_W + 20}" height="${MARK_H + 20}" fill="#fff"/><path d="${SIDE}" fill="#000" stroke="#000" stroke-width="${GAP * 2}" stroke-linejoin="miter"/></mask></defs>` +
    `<path fill="${c.body}" d="${STAIRS}" mask="url(#${id})"/>\n<path fill="${c.accent}" d="${SIDE}"/></g>\n`;
}
const words = (c, rows, incD) => `<path fill="${c.body}" d="${rows.flatMap(r => r.glyphs).join('')}"/>\n<path fill="${c.accent}" d="${incD.glyphs.join('')}"/>\n`;

const SHAPES = {
  mark: { w: MARK_W, h: MARK_H, title: 'Dawnspire mark', body: c => mark(c) },
  lockup: { w: LOCK_W, h: MARK_H, title: 'Dawnspire Inc.', body: c => mark(c) + words(c, [word], inc) },
  'lockup-stacked': { w: STACK_W, h: MARK_H, title: 'Dawnspire Inc., stacked', body: c => mark(c) + words(c, [row1, row2], sInc) },
};

// ---- Output ----
// Replace generated files only; README.md and anything hand-made stay.
for (const d of ['svg', 'png', 'animated', 'icons']) {
  fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, d), { recursive: true });
}
for (const f of fs.readdirSync(OUT)) if (/^dawnspire-.*\.svg$/.test(f)) fs.rmSync(path.join(OUT, f)); // older flat layout
const write = (rel, s) => fs.writeFileSync(path.join(OUT, rel), s.trim() + '\n');
const png = (rel, svg, width, background) => fs.writeFileSync(path.join(OUT, rel),
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, background, font: { loadSystemFonts: false } }).render().asPng());

for (const [shape, s] of Object.entries(SHAPES)) {
  for (const [name, c] of Object.entries(COLOURWAYS)) {
    const svg = svgOpen(`0 0 ${s.w} ${s.h}`, s.w, s.h, `${s.title}, ${c.label}`) + s.body(c) + '</svg>';
    write(`svg/dawnspire-${shape}-${name}.svg`, svg);
    for (const w of [1024, 2048]) png(`png/dawnspire-${shape}-${name}-${w}.png`, svg, w);
  }
}

// ---- Animated (light and dark): stairs rise from bottom-left, face drops from top-right, words rise ----
const EASE = 'cubic-bezier(.16,1,.3,1)';
const markCss = `.stairs{animation:in-stairs .95s ${EASE} .1s both}.side{animation:in-side .95s ${EASE} .22s both}
@keyframes in-stairs{from{transform:translate(-${U}px,${U}px);opacity:0}45%{opacity:1}to{transform:none;opacity:1}}
@keyframes in-side{from{transform:translate(${U}px,-${U}px);opacity:0}45%{opacity:1}to{transform:none;opacity:1}}`;
const riseCss = rise => `.g{animation:rise .8s ${EASE} both;animation-delay:calc(.95s + var(--i) * 45ms)}.inc{animation:fade .5s ease-out 1.5s both}
@keyframes rise{from{transform:translateY(${rise}px)}to{transform:none}}@keyframes fade{from{opacity:0;transform:translateX(-${U / 4}px)}to{opacity:1;transform:none}}`;
const reduce = `@media (prefers-reduced-motion:reduce){*{animation-duration:.01s!important;animation-delay:0s!important}}`;
const split = (rows, offset = 0) => rows.glyphs.map((d, i) => `<path class="g" style="--i:${i + offset}" d="${d}"/>`).join('\n');
const P = U;
const plainMark = c => `<path class="stairs" fill="${c.body}" d="${STAIRS}"/>\n<path class="side" fill="${c.accent}" d="${SIDE}"/>\n`;
for (const name of ['light', 'dark']) {
  const c = COLOURWAYS[name];
  const open = (w, title) => svgOpen(`${-P} ${-P} ${w + 2 * P} ${MARK_H + 2 * P}`, w + 2 * P, MARK_H + 2 * P, `${title}, animated, ${c.label}`);
  const clip = (id, x, top, w, bottom) => `<clipPath id="${id}"><rect x="${x}" y="${top}" width="${w}" height="${bottom - top}"/></clipPath>`;
  write(`animated/dawnspire-mark-animated-${name}.svg`, open(MARK_W, 'Dawnspire mark') + `<style>${markCss}${reduce}</style>\n` + plainMark(c) + '</svg>');
  write(`animated/dawnspire-lockup-animated-${name}.svg`, open(LOCK_W, 'Dawnspire Inc.') + `<style>${markCss}${riseCss(MARK_H + U / 2)}${reduce}</style>\n` +
    `<defs>${clip('w', TEXT_X - 4, -4, LOCK_W - TEXT_X + 8, MARK_H + 4)}</defs>\n` + plainMark(c) +
    `<g clip-path="url(#w)"><g fill="${c.body}">\n${split(word)}\n</g>\n<path class="inc" fill="${c.accent}" d="${inc.glyphs.join('')}"/></g>\n</svg>`);
  write(`animated/dawnspire-lockup-stacked-animated-${name}.svg`, open(STACK_W, 'Dawnspire Inc., stacked') + `<style>${markCss}${riseCss(ROW_CAP + U / 2)}${reduce}</style>\n` +
    `<defs>${clip('r1', TEXT_X - 4, -4, STACK_W - TEXT_X + 8, ROW_CAP + 4)}${clip('r2', TEXT_X - 4, ROW_CAP + ROW_GAP - 4, STACK_W - TEXT_X + 8, MARK_H + 4)}</defs>\n` + plainMark(c) +
    `<g clip-path="url(#r1)"><g fill="${c.body}">\n${split(row1)}\n</g></g>\n<g clip-path="url(#r2)"><g fill="${c.body}">\n${split(row2, row1.glyphs.length)}\n</g></g>\n` +
    `<path class="inc" fill="${c.accent}" d="${sInc.glyphs.join('')}"/>\n</svg>`);
}

// ---- Icons ----
// Favicon: square, stairs follow the browser theme.
write('icons/dawnspire-favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 160 160" width="160" height="160">
<style>.stairs{fill:${INK}}@media (prefers-color-scheme:dark){.stairs{fill:${PAPER}}}</style>
<path class="stairs" d="${STAIRS}"/><path fill="${SIGNAL}" d="${SIDE}"/></svg>`);
// App icon: dark mark centred on ink, square corners (platforms round them).
const square = (size, bg, c, markW, title) => {
  const s = markW / MARK_W, dx = (size - markW) / 2, dy = (size - MARK_H * s) / 2;
  return svgOpen(`0 0 ${size} ${size}`, size, size, title) + `<rect width="${size}" height="${size}" fill="${bg}"/>\n` + mark(c, 'q', r3(dx), r3(dy), r3(s)) + '</svg>';
};
const appIcon = square(512, INK, COLOURWAYS.dark, 300, 'Dawnspire app icon');
write('icons/dawnspire-app-icon.svg', appIcon); png('icons/dawnspire-app-icon-512.png', appIcon, 512);
// Profile picture: on-orange mark centred on signal, padded for circular crops.
const profile = square(1024, SIGNAL, COLOURWAYS['on-orange'], 520, 'Dawnspire profile picture');
write('icons/dawnspire-profile.svg', profile); png('icons/dawnspire-profile-1024.png', profile, 1024);
// Link preview (1200 x 630): dark lockup and the motto on ink.
{
  const W = 1200, H = 630, lockW = 760, s = lockW / LOCK_W, dx = (W - lockW) / 2, dy = 230;
  const motto = setLine('THINK FORWARD. CLIMB HIGHER.', 26, 0, 0, 0.12);
  const mw = motto.maxX - motto.minX, mx = (W - mw) / 2 - motto.minX;
  const og = svgOpen(`0 0 ${W} ${H}`, W, H, 'Dawnspire Inc. link preview') + `<rect width="${W}" height="${H}" fill="${INK}"/>\n` +
    `<g transform="translate(${r3(dx)} ${dy}) scale(${r3(s)})">${mark(COLOURWAYS.dark)}${words(COLOURWAYS.dark, [word], inc)}</g>\n` +
    `<rect x="${(W - 64) / 2}" y="420" width="64" height="4" fill="${SIGNAL}"/>\n` +
    `<g transform="translate(${r3(mx)} 482)"><path fill="${PAPER}" d="${motto.glyphs.join('')}"/></g>\n</svg>`;
  write('icons/dawnspire-og-image.svg', og); png('icons/dawnspire-og-image.png', og, W);
}

// ---- Site component: identical paths, colours from CSS ----
fs.writeFileSync(path.join(ROOT, 'src/BrandLogo.tsx'), `// Generated by scripts/brand/generate.mjs. Do not edit by hand; run npm run brand.
const STAIRS = '${STAIRS}';
const SIDE = '${SIDE}';
const WORD = '${word.glyphs.join('')}';
const INC = '${inc.glyphs.join('')}';

/** Dawnspire logo. Stairs and wordmark use currentColor; the face and INC. use --brand-accent (default signal). */
export function BrandLogo({ lockup = true, className = '' }: { lockup?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox={lockup ? '0 0 ${LOCK_W} ${MARK_H}' : '0 0 ${MARK_W} ${MARK_H}'} role="img" aria-label="Dawnspire Inc.">
      <path d={STAIRS} fill="currentColor" />
      <path d={SIDE} fill="var(--brand-accent, ${SIGNAL})" />
      {lockup && <path d={WORD} fill="currentColor" />}
      {lockup && <path d={INC} fill="var(--brand-accent, ${SIGNAL})" />}
    </svg>
  );
}
`);

const count = d => fs.readdirSync(path.join(OUT, d)).length;
console.log(`brand kit: svg ${count('svg')}, png ${count('png')}, animated ${count('animated')}, icons ${count('icons')}`);
