# NEVORA final targeted correction — candidate review

## Scope and preserved baseline

Branch: `codex/fuel-phase-3-pwa-notifications`.
Worktree: `/Users/josek0514/.codex/worktrees/fuel-phase-3-pwa-notifications/Fuel-Scheduler-`.
Exact previous completed correction: `0eea69c496b8cf901c78031bd4e3b31f0e8518c7`.
That commit, completed Phase 3 implementation, existing tests, original assets and previous review evidence remain intact. This is one targeted local follow-up, not a repetition of the earlier correction pass. Nothing is pushed, merged, deployed, migrated or activated; Phase 4 has not started.

**These fresh screenshots are a candidate baseline awaiting Jose's approval. They are not automatically approved.**

## Final changes

- Removed active café photography from Login; neutral canvas and existing form card remain. Removed coffee/cup header art from Manager Dashboard in favor of the restrained existing white/soft-cyan colors. Removed the unused coffee-beans decoration reference from the stylesheet. No other industry imagery is introduced. Fuel Coffee Drive, FUEL – 2 / 110 and employee/location details remain workspace/business data. Old unreferenced source assets remain preserved, but no product component or stylesheet loads them.
- One `BrandLockup` renders the flame and NEVORA/Workforce in compact, standard and large variants across sidebar, mobile, Login, Activate and device setup. The actual source glyph shapes and original cyan A are rendered through an SVG alpha mask; this is not typed replacement lettering. Its cropped viewBox aligns the visible ink with Workforce. There is no white rectangular backing around the letters. The flame alone retains its rounded compact white container.
- Light surfaces use navy glyphs; the structural dark rail uses light glyphs while preserving the original cyan A. Source PNG files and all existing app-icon exports are byte-for-byte unchanged. The original upload SHA-256 remains `3387a115e3bc8e0d41202ba1ba184b6d3819638396f1136b71a4a4df211d274d`.
- Shared dimensions: compact icon 32px / wordmark 96px, standard icon 42px / wordmark 108px, large icon 58px / wordmark 145px. Icon-to-text gap is 12px; wordmark-to-Workforce gap is 4px. The module uses 11px (compact/standard) or 12px (large), normal case, 500 weight. Legacy selectors no longer override those variants or stack the whole lockup vertically.
- Login and Activate include 10px muted legal copy: “© 2026 VELANI LLC. All rights reserved.” and “NEVORA is a product of VELANI LLC.” Existing subtle Powered by attribution remains. No authenticated legal footer is added.
- The static offline page is generated from the same component. Its SVG embeds only the two original public artwork files as data URLs, so a total connection loss cannot remove the logo. The worker changes only public cache version v2 → v3, with its existing seven-asset allowlist, scope and waiting lifecycle unchanged. No delivery, subscription, outbox, authentication or Clocker business behavior changes.

## Fresh browser verification

Actual source components rendered with fictional data and stubbed actions; no live authentication/business persistence is implied.

- **148 unique fixture cases passed**, Chromium and WebKit: Login, Activate, Employee/Lead Home, Manager/Owner Dashboard at 320, 375, 390, 430, 768, 1024 and 1440px. Additional Employee Schedule, Availability, Time Off, Shift Requests, My Time, Manager Schedule, Scheduling Rules and Time Off comparisons at 390/1440px.
- **164 visible lockups measured**: visible wordmark/module left-axis delta 0px; 12px icon gap; 4px module gap; matching variant icon width/height; balanced icon/copy center; transparent wordmark backgrounds and zero padding. Manual inspection of light/dark, desktop/mobile and authentication screenshots confirms the flame/name relationship and original blue A detail.
- **32 protected main-content comparisons passed**: exact main markup, visible relative geometry, computed color/font/border/padding/margin styles and exact pixels. The pixel comparison renders the original hydrated main markup in the same shell/CSS context, without changed brand headers or navigation overlays painting over it; no main child or main pixel is removed/masked. Full fresh screen captures retain all branding/navigation. This is an explicit main-content comparison, not a claim that deliberately changed headers remain pixel-identical.
- **8 complete Clocker screenshot comparisons passed** against 0eea69c: both locations at 1024×768 and 768×1024 in both engines. No setup surface appears. Actual Next Clocker HTML also has no portal manifest/setup metadata.
- **24 setup-state cases passed**: ready/install/enabled/denied at 320, 390 and 1440px in both engines. Peer action heights are 44px, paired widths match, text/icons are centered, final controls scroll fully inside the panel and Escape closes it. Permission is never requested automatically. Focus-visible outlines remain; Chromium uses Tab, WebKit uses the observed Option+Tab full-control traversal. Notification/controller/provider calls in these fixture states are doubles, not real enrollment or delivery.
- No horizontal overflow, active coffee artwork URL, old Fuel Scheduler/Fuel Portal/NUVORA product branding or extra authenticated legal footer was found in these checks. Semantic colors and existing button colors remain unchanged.
- **12 actual Next auth checks passed**: Login/Activate at 320, 390 and 1440px in both engines, without database credentials/account mutation. Correct lockup/ownership, no overflow, no portal setup/manifest on auth routes and no browser errors.

### Offline and service-worker boundaries

- **14 disconnected fallback cases passed**, seven widths in each engine. Chromium uses actual browser-context offline mode. WebKit uses complete loopback-origin socket failure for every route/asset because its browser-context-offline navigation reports an engine-internal error. Both render the embedded flame and original wordmark without an external artwork request. This is local browser evidence, not a physical-device/OS delivery test.
- Actual local service-worker registration, exact `/app` scope, nested routes, seven public cache entries, no private API caching, unsaved-form waiting update and retirement passed in Chromium and WebKit. Clocker stays outside control/offline substitution.
- Separately, Chromium CDP synthetic push/click checks passed for stable generation/tag, rejection of foreign/private envelopes and persistent suppression. They are synthetic events sent to the actual local worker, not Web Push provider or phone delivery.
- The reviewer caught missing artwork under complete disconnection; this was fixed by public-byte embedding and retested. No private caching policy was broadened.

## Commands and results

| Check | Final result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 76 files, 821 tests |
| `npm run build` | PASS — Next 16.3.6 production build |
| `npm run test:notifications:qa` | PASS — 6 configuration/evidence-validator tests |
| `git diff --check` | PASS |
| New lockup/domain-adjacent UI regression tests | 6 new tests; auth legal assertions strengthened; existing return-destination assertions preserved |

Commands ran with `DATABASE_URL` removed. Build-only generated tsconfig/next-env changes were restored to their pre-task contents. The SQL integration suite was not run: it would apply schema migrations, which is outside authorization. Migration 0007 remains unapplied. Real provider delivery and physical iPhone/Android verification remain unperformed; no credentials, paid service, public HTTPS environment, scheduler or subscription activation was provisioned.

## Review evidence and preview

Fresh gallery: http://127.0.0.1:4266/review.html
Fictional component preview: http://127.0.0.1:4263/app
Actual Next local unauthenticated auth/Clocker preview: http://127.0.0.1:4264/login
Previous completed review gallery/evidence remains separate and untouched.

External evidence directory:
`/Users/josek0514/.codex/visualizations/2026/10/03/01a0f8c7-f196-7d22-8896-8d3c96547bd9/nevora-lockup-final/`

- `targeted-results.json`, `disconnected-and-native-results.json`, `browser-worker-results.json`
- `screenshots/` includes fresh candidate full screens, separate before/after protected-content captures and true-disconnection screenshots.
- `browser-fixture/` contains owned verification sources with mocked/actual boundaries explicit.
- `intermediate/` retains comparison investigations. The first full-main crop was obscured by the approved changed fixed header; one raw Chrome capture also had four antialias pixels differing despite identical geometry/styles. The final isolation above retains exact pixel assertions and compares all main content without brand-overlay/rasterization interference. No existing assertion, test or snapshot was weakened or auto-approved.

## Existing activation prerequisites remain

See `docs/architecture/fuel-phase-3-activation.md`: migration review/authorization, environment-separated keys/configuration, an authorized HTTPS test environment, explicitly opted-in test account/device and an independently authorized scheduler/trigger remain required before live delivery. Local installation guidance, screenshots and synthetic events do not prove closed-app physical-phone notifications.

## Exact changed files

- `.codex/skills/fuel-scheduler-ui/SKILL.md`
- `docs/architecture/fuel-phase-3-activation.md`
- `docs/ui/2026-10-03-nevora-final-lockup-review.md`
- `docs/ui/fuel-ui-contract.md`
- `public/fuel-portal-offline.html`
- `public/fuel-portal-sw.js`
- `scripts/render-nevora-offline.tsx`
- `src/app/activate/page.tsx`
- `src/app/brand-pages.test.tsx`
- `src/app/globals.css`
- `src/app/login/actions.test.ts`
- `src/app/login/page.tsx`
- `src/components/app-shell.tsx`
- `src/components/brand-legal.tsx`
- `src/components/brand-lockup.test.tsx`
- `src/components/brand-lockup.tsx`
- `src/components/brand-mark.tsx`
- `src/components/portal-device-setup.tsx`
- `src/lib/brand.ts`
- `src/lib/notifications/service-worker.test.ts`

## Local checkpoint

A separate local follow-up commit records these targeted changes after verification. The preceding 0eea69c commit is not amended. See Git HEAD for the complete follow-up SHA; the worktree is clean after the checkpoint. Visual approval remains pending.
