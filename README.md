# Dawnspire Inc. Portfolio

A responsive React + TypeScript company portfolio inspired by the supplied Endfield reference, adapted to a right-side navigation rail and a red-orange, white, charcoal and grey identity.

## Run
- `npm install`
- `npm run dev`
- `npm run build`

## Content
Edit `src/App.tsx` to replace the sample projects, journal items, roadmap phases, founder profiles, and contact details. The board contains exactly three founders. Sample software interface previews are original HTML/CSS illustrations.

The inquiry form prepares a local copyable draft. It does not send messages. Connect a real address or server endpoint when approved company contact information is available. No visitor data is persisted or transmitted.

## Motion
CSS transitions, perspective artwork, cinematic hero reveal, native smooth section navigation, active-section tracking and reduced-motion support. The original reference's proprietary videos and character assets are not included.

## Assets
See ASSETS.md for asset origins and credits. Brand assets live in public/brand.


The site now has an Endfield-inspired loading entrance. Refresh the local site to replay it. Progress follows hero/font readiness; Skip intro bypasses it. OS reduced motion replaces the orange wipe and zoom with a short fade. Progress regression tests: `node --test tests/entrance-progress.test.mjs`.
