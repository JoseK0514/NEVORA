# NEVORA Typeface visual refresh — local implementation handoff

## Intent and scope

Jose requested the supplied Typeface 75 visual reference in `DESIGN.MD` and a NEVORA refresh that preserves structure, layout, and animations. The reference is applied to the existing workforce product, not a keyboard marketing page. No separate source HTML was supplied; existing NEVORA screens are the composition baseline.

The branch is `codex/nevora-typeface-visual-refresh-20261010`, created from development commit `b58496b84b21690f7be22474f7570da2d81af6c3`. The commit containing this handoff is the local candidate. The original development checkout and other worktrees were preserved.

## Implementation

- Added `DESIGN.MD`, including the original reference and NEVORA application constraints.
- Added `src/app/typeface-theme.css`, imported once after the existing global stylesheet. It changes palette, typography, and corners through existing token names and bounded selectors.
- Bundled Inter and JetBrains Mono, their SIL licenses, and pinned provenance under `public/fonts/typeface/`.
- Adapted paint declarations in seven component CSS modules: Clocker PIN/punch/setup, manager Action Center, timecards, reports, and payroll export. Original token fallbacks remain available when the theme import is removed.
- Kept the original global CSS byte-identical. JSX, navigation, spacing, grids, dimensions, breakpoints, animation/transition/transform definitions, official logo files, server logic, database code, API contracts, packages, CI, and environment configuration were not changed.
- Preserved success, warning, danger, circular kiosk keys, and report print geometry. Orange action fills use charcoal labels; small orange text uses a darker derivative.
- Retained the existing system font for the login supporting sentence, documented in the typography model. Inter wrapped that sentence on desktop; the fallback restores the original card height and position without adjusting geometry.

## Applicable director positions

- Product/CPO: the scope is visual consistency within the existing workforce flows; no new screens, copy, or workflow complexity.
- Engineering/CTO: an additive stylesheet and token-based component paint changes keep the implementation reversible and separate from business behavior.
- Product Experience: existing density, navigation, control sizing, and composition remain the baseline; the supplied marketing dimensions are not forced onto compact operational screens.
- Governance/Policy/Risk/Release: local evidence is retained, failures are disclosed, inherited findings remain open, and no release control or independent finding is waived. This is not hosted verification or independent certification.
- Program Delivery: implementation and local verification are complete; visual acceptance and integration are the next gate. Implementation/evidence owner: Codex. Visual reviewer and integration decision owner: Jose.

## Evidence actually run

| Check | Result |
|---|---|
| Baseline `npm test` | 202 files, 2,125 tests passed |
| Final `npm test`, isolated rerun | 202 files, 2,125 tests passed, 78.01 seconds |
| Final `npm run lint` | Exit 0 |
| Final `npm run typecheck` | Exit 0 |
| Final `npm run build` | Exit 0; 35 static pages generated |
| `git diff --check` | Exit 0 |
| Source AST/byte verification | Global CSS unchanged; root layout import only; 37 module paint changes; rule structure retained; no theme geometry/motion declarations |
| Main browser comparison | 480 original + 480 styled cases in Chromium/WebKit; widths 320, 375, 390, 430, 768, 1024, 1440; Clocker landscape and portrait |
| Finance comparison | 42 original + 42 styled cases for owner timecards, reports, and payroll export |
| Login refinement | 14 cases, no findings or runner errors |
| Menu timing recheck | Four exact flagged cases, no findings or runner errors; original threshold preserved |
| Review capture rectangles | Six structural rectangle sets match original desktop/mobile login, manager home, employee home, schedule, and Clocker captures |
| Fonts | Recorded SHA-256 values verified from Google Fonts commit `bd8f81ddb5c74d5c8897b36ad88b440266245103`; Inter license trailing whitespace normalized, license text unchanged |
| Impeccable design hook | Documented narrow system-font fallback; subsequent scan found no deterministic issues; no suppressions added |

The first final unit run passed 2,124 tests but hit the unchanged 300,000ms planner benchmark timeout while browser audits were running. The full suite passed after the browser work stopped. Both logs are retained; no timeout or assertion was weakened.

The main styled matrix recorded four local menu timings above 250ms; the original matrix recorded two. The four styled cases passed their exact targeted rerun at the unchanged threshold. All original observations remain available. No layout, clipping, action-size, focus, runtime, or font-load findings were recorded in the main styled matrix.

Eight payroll bottom-navigation clearance warnings are present in both original and styled finance matrices, across four mobile widths and two engines. They remain open and require separate triage. Timecard and report surfaces have no findings in these matrices. No production release acceptance is inferred from this visual task.

Token-pair contrast is 6.01:1 for charcoal on primary orange, 4.81:1 on hover orange, 6.57:1 for dark accent ink on the canvas, and 6.10:1 for secondary text on the surface. These pair checks do not replace an exhaustive accessibility audit.

## Environment, limits, and release state

Browser verification used fictional accounts, an owned disposable loopback PostgreSQL cluster per run, and scratch Next.js copies with a guarded local database adapter. Owned app/database processes were stopped and databases removed after the runs. Production credentials, existing databases, real messages, and customer data were not used. No live external service was load-tested.

The main matrix preceded two final refinements: restoring the report's original print radius, then retaining the login sentence font. The finance matrix uses the restored print CSS; the 14-case login rerun and refreshed review captures verify the final login source. Source invariants and the final build cover the final application files.

Local development Chromium/WebKit checks do not certify physical iOS devices, real screen readers, hosted deployment, all interaction states, every workflow, or production readiness. The before/after viewer uses screenshots; only the Next development toolbar was hidden for review captures.

No push, PR, merge, or deployment was performed. Jose's next gate is visual review, followed by development-line integration and the existing release process. Existing payroll warnings remain visible and unaccepted; no policy exception is requested or assumed.

## Evidence handoff and rollback

The review package is in `/Users/josek0514/Documents/Codex/2026-10-10/np/outputs/nevora-typeface/`: `DESIGN.MD`, `review.html`, `verification.md`, `verification.json`, before/after screenshots, a binary Git patch, and `evidence/` logs, browser reports, source manifests, constraint checks, and font provenance. `verification.json` records the final local candidate SHA.

For a temporary visual rollback, remove the `typeface-theme.css` import; component token fallbacks preserve the earlier paint. For a complete branch rollback, revert the local visual-refresh commit after integration. No migration or customer-data rollback is involved.
