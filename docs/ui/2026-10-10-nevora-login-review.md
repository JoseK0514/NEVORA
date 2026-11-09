# NEVORA employee login review — 2026-10-10

The login uses Jose's selected NEVORA blue/cyan palette, an original generated
sculptural workday illustration, and a pausable floating animation. The exact
slogan **Brighter work ahead** remains the illustration-panel headline. A white
two-field sign-in form remains immediately usable. Below 800px, the artwork
becomes a compact strip above the form. The existing workspace identity, account
recovery, activation, and Velani legal copy remain visible.

## Implementation and source of truth

- `src/app/login/page.tsx`: native server form, feedback roles, accessible field
  descriptions, password-manager autocomplete, and Phosphor account links.
- `src/app/login/login-submit.tsx`: disabled/busy pending action and a separate
  live region that preserves the button's accessible name.
- `src/app/login/login-visual.tsx` and `login-motion.ts`: original illustration,
  1.3-second entrance, restrained floating cycle, 44px Pause/Play, reduced-motion
  cleanup, document/offscreen gating, and bounded desktop pointer response.
- `src/app/login/login.css`: login-scoped blue/cyan palette and responsive styles.
  The shared orange portal palette remains unchanged.
- `src/lib/brand.ts`: the official slogan, defined once for application use.
- `public/assets/illustrations/login-workday-blue.png`: original 1536×1024
  model-generated transparent artwork; full prompt and SHA-256 are in the asset
  manifest. Official brand images remain byte-identical to the parent commit.
- `DESIGN.MD`: confirmed login variant, typography, icons, asset and motion rules.
  Existing `AGENTS.md` already links the asset folder and generation instructions.

GSAP 3.15.0 and `@gsap/react` 2.1.2 are pinned. The local visual export compiles
the application's own motion controller rather than maintaining a separate
animation implementation. Native form/server actions and existing session,
credential, return-destination, recovery and authorization code are unchanged.

## Verification actually run

| Check | Result |
| --- | --- |
| Full `npm test` on the final implementation | 202 files, 2,125 tests passed |
| Targeted brand/login tests | 4 files, 32 tests passed |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; no migration script |
| Owned Next/PostgreSQL login browser audit | 42 checks passed, zero failures |
| Standalone preview browser checks | 6 viewport/engine cases passed |
| Source guard | 10 current functional files match the final browser capture |
| Auth, portal and official-brand scope guard | 8 named files unchanged against parent |
| Independent Impeccable finish review | `ship`; no material fixes in scoped captures/source |

The actual login audit uses Chromium and WebKit at 320, 375, 390, 430, 768, 800,
1024 and 1440px. It covers default, invalid-credentials, account-activated and
pending states, keyboard focus and hit targets, safe return destinations,
recovery/activation navigation, real fictional-account sign-in and session
creation, JavaScript-disabled native sign-in, compact keyboard viewport, long
workspace names and unavailable workspace identity. Pause/Play, offscreen
stop/resume, reduced-motion preference changes and desktop pointer cleanup pass.
The preview checks exercise mobile/desktop switching, Replay, Pause/Play,
reduced motion, source/capture assets, feedback images and four 21st references.

White on the cobalt action and blue links on white each measure 6.28:1; ice copy
on blue measures 5.97:1. These checks do not constitute a complete WCAG audit.

The first blue audit found the shared orange button selector overriding the
login action. A stronger login-scoped selector fixes it; the final audit keeps
the white-label and cobalt-background assertions. Initial preview WebKit
failures were a runner navigation race after Replay; explicitly awaiting the
frame reload resolves it. Earlier failing reports are preserved separately.

## Evidence and reference package

Local review: `http://127.0.0.1:52202/login/review.html`.
Package: `/Users/josek0514/Documents/Codex/2026-10-10/np/outputs/nevora-typeface/login/`.
Owned audit: `work/nevora-typeface/login-evidence/blue-final/report.json` in the
task workspace. The package includes actual mobile/desktop and feedback
captures, finish review, source hashes, full unit log, documentation, prompts,
and binary Git patches. Before captures show the prior established login.

The viewer shows four suitable components returned by the connected `21st` MCP:
Auth Section 1, Sign In Form, Nav List Card, and App Dashboard Layout. These and
Mobbin's Browserbase/Replit/ShopBack screens are visual references. No paid
component implementation or external authentication code was imported.

Inter is intentional in Jose's supplied brief. The Impeccable overused-font
warning is ignored only for `outputs/nevora-typeface/login/review.html`, with
that reason; no general detector rule or file is disabled.

## Scope, limitations and release state

Product/CPO assessment: task clarity, mobile access, retained account workflows,
and a stronger first impression within Jose's approved scope. Engineering/CTO
assessment: reversible presentation changes and pinned motion dependencies.
Security/CISO and Governance assessment: preserve server controls and existing
release gates; this UI evidence is not independent security certification.
These apply repository agreements and do not represent separate director
sign-off. Implementation/evidence owner: Codex. Visual acceptance/integration
decision owner: Jose.

Checks use fictional accounts and owned loopback PostgreSQL/Next runtimes, with
external service calls blocked. No production credentials, customer data, real
messages, orders or punches were used. Owned test runtimes are disposed. The
separate read-only loopback preview server remains available for visual review;
its submissions are disabled and do not authenticate users.

Physical phones, real screen readers, hosted behavior and production data are
unverified. Headless Chromium did not mark another foreground tab as hidden;
document-visibility handling is implemented and source-reviewed, while its
physical tab-switch behavior remains unverified. The eight inherited payroll
mobile bottom-navigation clearance warnings documented in the employee-home
handoff remain open and outside this login change.

Branch: `codex/nevora-typeface-visual-refresh-20261010`, from development
`b58496b84b21690f7be22474f7570da2d81af6c3`. Login parent:
`1cb10fa6d8a8eb442d7f044735b54337bb608819`. This is a local candidate;
no push, PR, merge or deployment is authorized or performed.

The next gate is Jose's visual review and development-line integration under
the existing release process. No further input is required to inspect this
candidate. After integration, revert the login commit to restore its parent
presentation and dependency state. No database or customer-data rollback is
involved. Earlier employee-home and Typeface changes have separate commits.
