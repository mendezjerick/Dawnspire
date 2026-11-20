# Verification
- Production: npm run build passes (TypeScript + Vite).
- Browser: native section navigation and active-state tracking; project carousel/details/search/empty reset; media switching/lightbox; calendar period and milestone detail; personnel tabs; contact draft validation/preparation verified in the in-app browser.
- Responsive: inspected desktop 1440x1000, mobile 390x844, and default user viewport. No document overflow at 390px; timeline intentionally scrolls horizontally.
- Finish review: ship. Both requested fixes (small text contrast on orange and mobile contact brand selector collision) scored resolved against recaptured evidence.
- Assets: provenance scan 4 rasters, 0 missing.
- Limit: placeholder content authorized, no mail/backend integration. No claims of full WCAG certification or exact reproduction of proprietary reference motion assets.

## Loading entrance refinement
- Local-only. Reference re-inspected live and delivered loader code examined.
- Browser observed all five phases: loading, complete, wipe, reveal, done.
- Skip intro clears overlay, inert state and document scroll lock.
- Reload at #projects preserves the direct destination; no horizontal document overflow at desktop.
- Captured desktop 1440x900 and mobile 390x844 entrance layouts, plus the default user viewport.
- Four progress regression tests pass; production build passes.
- Scoped finish review: ship; runtime reduced-motion toggle during wipe now advances immediately into reveal rather than leaving content blocked.
- New design-system neutral and type-size findings are advisory and documented under Loading Entrance in DESIGN.md and the sidecar.
