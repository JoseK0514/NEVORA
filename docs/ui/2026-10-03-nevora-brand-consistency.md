# NEVORA branding and control consistency — review handoff

Date: 2026-10-03. This is the bounded follow-up to completed Phase 3, not Phase 4.

## Source and commit boundary

- Branch: `codex/fuel-phase-3-pwa-notifications`.
- Worktree: `/Users/josek0514/.codex/worktrees/fuel-phase-3-pwa-notifications/Fuel-Scheduler-`.
- Exact locked parent: `6a4e98d2c07b2a8bda1123b399142ad9e2e1adb8`.
- One separate local correction commit; the final SHA/file manifest is recorded in the review evidence `commit-record.json` and the chat handoff.
- No development merge, push, deployment, database migration, paid-service change, scheduler activation or real push delivery.

Only the official logo asset was brought from `origin/development`, commit `409cc180423ad8c0c54f4559797bf70c64f3ea49`. Its actual tracked filename is `nevora.png` (the upload commit is titled `nevora-logo.png`). No other development code was copied.

Original unchanged source: `public/images/nevora.png`, 1254×1254. SHA256: `3387a115e3bc8e0d41202ba1ba184b6d3819638396f1136b71a4a4df211d274d`.

## Identity and palette

The visible product is NEVORA, the module is Workforce, Fuel Coffee Drive is the workspace, and Powered by VELANI LLC remains subtle. Existing Fuel/NUVORA technical names, routes, tables, cookies and configuration identifiers are retained.

Brand headings in the desktop/mobile shell, Login, Activate Account, device setup and offline fallback use the original wordmark artwork. `public/images/nevora-wordmark.png` is the exact original crop at left 174, top 883, width 907, height 122. Its raw pixels match the supplied artwork, including the cyan A detail. It is neither typed lettering nor a redraw. A small white backing preserves the original navy letters on the dark sidebar. Ordinary prose, accessibility names, OS notification text and the PWA name use NEVORA text.

The compact icon uses the original symbol crop at left 248, top 137, width 752, height 722. Technical crop/contain-resize/composite operations produce the 512px compact image, Apple 180, standard 192/512 and maskable 192/512 assets. The unchanged full upload is also retained. Maskable artwork fits inside the central 80% safe circle. The old paw has no rendering references; its historical unused asset is retained.

| Use | Value | White text contrast |
| --- | --- | --- |
| Primary action | `#0756D9`, original pixel (599, 447) | 6.28:1 |
| Hover / pressed | `#003AAE`, original pixel (622, 708) | 9.47:1 |
| Secondary cyan | `#43CCFB`, original pixel (605, 841) | Used on dark structure or as a soft emphasis, not small white text |
| Soft selection | `#F0FBFF` | Primary blue text |

Neutral canvas `#F6F6F8`, white surfaces, `#20232D` structure, `#18191F` primary text and `#676A73` secondary text remain. Green success/available, amber actual attention/pending and red destructive/error states retain their meaning. Existing customer coffee imagery is preserved as workspace context. Decorative warm UI backgrounds, borders, input focus and action accents are neutralized or use logo-derived blue.

## Controls and protected behavior

- Existing action hierarchy, layouts, navigation, cards, spacing, typography and responsive structure are preserved.
- Availability Submit uses accessible blue/white with opaque hover/pressed feedback. Available toggles retain semantic green and 44px geometry.
- Acknowledge matches the action typography/padding; its outstanding warning is a restrained rounded callout instead of a highlighted text fragment.
- Role labels use consistent centered capsule typography; actionable profile triggers remain 44px targets.
- Notification peer actions retain equal height, radius, typography, centered labels and balanced widths. Unrelated controls are not forced to one width.
- Manager Review, Save Settings, navigation and tabs retain their approved geometry and hierarchy. Sidebar sign-out retains a minimum 44px target.
- Dark-rail focus uses cyan. Auth input/primary feedback uses logo-derived blue. Secondary directory text and the Workforce rail label have sufficient text contrast.
- No scheduling, request, timekeeping, subscription ownership, transaction/outbox, delivery, retry, reminder or authentication behavior was refactored.
- Clocker remains outside portal setup, manifest enrollment and worker scope. Its existing local demo behavior is unchanged.

PWA full/short names are NEVORA. `/app` identity/start/scope and all compatibility paths remain. Public asset cache v2 retires the previous icon cache using the existing waiting/update lifecycle and adds only the public wordmark for offline branding. No private responses, schedules, API data or authentication data are added to caching. The strict allowlist contains offline HTML, five existing icon paths and the wordmark.

## Verification and honest boundaries

All application commands run in this isolated worktree with `DATABASE_URL` removed. Build/start scripts were inspected; neither runs migrations. Build-generated TypeScript configuration/declaration changes were restored to their original tracked bytes.

| Verification | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 75 files / 815 tests passed |
| `npm run build` | Passed, Next.js 16.3.6 production build |
| `npm run test:notifications:qa` | 6 configuration guard tests passed |
| `git diff --check` | Passed before commit |
| Original asset/crop/dimensions/maskable safe-area checks | Passed |
| Protected responsive comparison | 448 final cases passed; 420 intentional branding changes remain visible, 28 Clocker captures are pixel/geometry identical; no overflow/clipped action text/peer mismatch/runtime errors. Minimum mobile final-content clearance 42.52px |
| Control feedback/geometry | 260 fixture cases passed; active primary contrast at least 6.28:1, measured label-centering error below 0.001px |
| Device setup | 56 fixture cases passed, including explicit permission gesture, instruction/enabled/test-queued states |
| Device/browser states | 504 fixture cases passed: unsupported, denied, revoked, error, standalone, unknown, iPhone guidance, loading and denied storage writes |
| Interaction lifecycle | 62 fixture cases passed: Not Now persists, Escape restores focus, hover/pressed/focus feedback, update notice does not reload, unsaved form is retained, schedule change disclosure works |
| Text contrast | 56 ordinary portal viewport inspections passed after correcting rail/directory labels; complex photographic backgrounds remain visual inspection, not a blanket WCAG certification |
| Bottom safe-area simulation | 160 cases passed with a synthetic 32px inset; minimum final-content clearance 26.58px |
| Clocker tablet workflows | 8 actual local Next.js vs locked fixture cases passed; two locations, two orientations, Chromium/WebKit, Clock In/Start Break/End Break/Clock Out geometry and text unchanged |
| Actual local service worker | Chromium/WebKit passed: scope, public-only allowlist, offline fallback, private API exclusion, Clocker pass-through, waiting update and owned-worker retirement |
| Synthetic local push/click | Chromium CDP tests passed through the actual worker/native IndexedDB; private/foreign payload rejection and ownership suppression retained |
| Disposable PostgreSQL integration | **Not rerun in this correction pass**: its bootstrap applies migration 0007, which this task explicitly forbids. Prior Phase 3 evidence is historical, not a fresh database result |
| Actual provider / physical iPhone / physical Android | **Not performed; activation remains unauthorized and pending** |

The added unit regression verifies official source hash, compact/wordmark dimensions and rendering paths. Existing branding payload/copy assertions and the strict worker public allowlist/cache-retirement tests were updated to the new identity without suppressing or weakening assertions. Integration fixture expected copy was updated but that SQL suite was not run.

Browser inspection uses current real components/CSS and fictional data/actions, not real authentication or customer records. Both Chromium and WebKit cover widths 320, 375, 390, 430, 768, 1024 and 1440. Auth, all requested Employee/Lead and Manager/Owner screens, setup states, and both Clocker locations were inspected. Both Clocker tablet orientations were tested separately. Existing navigation/form links are compared unchanged. No screenshot masks were added; intentional product identity differences remain visible.

## Fresh screenshot evidence and review

Evidence directory: `/Users/josek0514/.codex/visualizations/2026/10/03/01a0f8c7-f196-7d22-8896-8d3c96547bd9/nevora-brand-consistency`.

- Gallery: `http://127.0.0.1:4246/review.html`, role/width/browser/view filters, with optional locked before/after comparison.
- Fictional interactive preview: `http://127.0.0.1:4243/app`; Manager uses `/app?manager`, Lead `/app?lead`, Owner `/app?owner`; device setup can be opened from the existing profile surface or `?push` fixture mode.
- Final captures: `screens/`, `setup-final/`, `states-final/`, plus control-focus/pressed/update and Clocker-action captures indexed in the gallery.
- Evidence JSON/scripts: `visual-audit.json`, `control-interaction-results.json`, `safe-area-results.json`, `text-contrast-results.json`, `browser-interaction-results.json`, `clocker-protection-results.json`, `actual-worker-results.json`, `logo-verification.json`, and the setup/state browser reports.
- Earlier defect and intermediate evidence is retained separately; it is not the proposed final screenshot baseline.

**The NEVORA screenshots are a candidate baseline awaiting Jose's explicit review. They are not automatically approved.**

## Activation still required

The existing Phase 3 activation runbook remains authoritative. Migration 0007 is prepared and unapplied to any existing database; this pass applies no migration anywhere. Environment-separated server configuration/keys, an authorized HTTPS test environment, deliberately opted-in test account/device, and an independently authorized trigger/scheduler must be reviewed before real delivery. No paid upgrade is selected. Provider acceptance, fixture test queuing and browser emulation are not evidence that a closed physical phone receives a notification.

## Exact changed files (35)

- `.codex/skills/fuel-scheduler-ui/SKILL.md`
- `docs/architecture/fuel-phase-3-activation.md`
- `docs/ui/2026-10-03-nevora-brand-consistency.md`
- `docs/ui/fuel-ui-contract.md`
- `public/fuel-portal-offline.html`
- `public/fuel-portal-sw.js`
- `public/icons/fuel-192.png`
- `public/icons/fuel-512.png`
- `public/icons/fuel-apple-180.png`
- `public/icons/fuel-maskable-192.png`
- `public/icons/fuel-maskable-512.png`
- `public/images/nevora-icon.png`
- `public/images/nevora-wordmark.png`
- `public/images/nevora.png`
- `src/app/activate/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/app/schedule/settings/page.tsx`
- `src/app/brand-pages.test.tsx`
- `src/app/globals.css`
- `src/app/login/actions.test.ts`
- `src/app/login/page.tsx`
- `src/components/app-shell.test.tsx`
- `src/components/app-shell.tsx`
- `src/components/brand-mark.tsx`
- `src/components/portal-device-setup.test.tsx`
- `src/components/portal-device-setup.tsx`
- `src/lib/assistance/notification-events.test.ts`
- `src/lib/brand.ts`
- `src/lib/notifications/device-client.ts`
- `src/lib/notifications/manifest.test.ts`
- `src/lib/notifications/payloads.test.ts`
- `src/lib/notifications/provider.test.ts`
- `src/lib/notifications/recipients.test.ts`
- `src/lib/notifications/service-worker.test.ts`
- `src/test/integration/notifications.integration.ts`
