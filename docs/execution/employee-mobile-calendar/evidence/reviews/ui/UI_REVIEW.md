# Independent Employee mobile Calendar UI review

Author: independent Senior UI reviewer, reporting directly to Jose. Date: 2026-10-27.

**Current UI recommendation: GO WITH CONDITIONS for the local Calendar UI at `5b3979f4f619422d1d26d114f8abb820aad3b7e3`.**
**Current fidelity recommendation: APPROVE within that local UI scope.** No open CRITICAL/HIGH/MEDIUM UI issue remains after the author-owned closure below. Combined-suite, full custody, physical-device, assistive-technology and release gates remain separately owned; this report does not certify them. This is not a literal competitor clone review. The accepted Employee mobile teal specification and optional Profile Calendar disclosure are the authority. No implementation files were edited and no test suites were launched by this reviewer.

The initial findings and failed-run evidence below are retained as history, followed by exact closure evidence.

## Candidate and evidence boundary

Reviewed branch `codex/employee-mobile-local-resume-20261027`, application/test candidate `fc3a1874937de55d9395a5e5c1ae915fb69252a5`, diff from `a1b62ca`. Checkout was clean at initial inspection. Later remediation work is not certified by this report.

Read AGENTS.md, DESIGN.MD (current direction and palette), Independent UI Oversight and Executive Operating Model skills, `docs/product/specs/employee-mobile-teal/README.md`, `docs/execution/employee-mobile-calendar/calendar-plan.md`, and Profile `NEXT_CALENDAR_DISCOVERY.md`. Inspected all changed implementation/test/config files and diff hunks, plus shared mobile tokens, `profile-calendar-disclosure.tsx` and `reveal-feedback.ts`. The archived prototype `docs/handoffs/employee-mobile-cloud-2026-10-27/references/employee-mobile-prototype/calendar.png` was visually inspected as composition provenance; it is not the current interaction authority.

Run evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/run-02/calendar/`.

Inspected `failure.json` and visually opened these exact PNGs: `chromium-calendar-empty`, `chromium-calendar-link-once-redacted`, `chromium-calendar-light-320-text200`, `chromium-calendar-replace-confirmation`, `chromium-calendar-dark-390`, `webkit-calendar-coarse-landscape`, `chromium-calendar-unknown-original`, `chromium-calendar-revoke-confirmation`, `chromium-calendar-revoked`, `chromium-calendar-unavailable`, `chromium-calendar-desktop-preserved`, `webkit-calendar-light-320` (all `.png`). Screenshots have secret text intentionally redacted; they cannot establish literal URL legibility. The test does inspect native full selection independently.

## Findings by severity

### CRITICAL

None found in the inspected design implementation. No pasted screenshot, raster UI replacement, canvas facsimile, invented provider connection or management selector was found.

### HIGH

**UI-2 — BLOCKER: final candidate does not yet have completed required browser evidence.** Run-02 is a failed run, not three-engine acceptance. `failure.json` records twelve Chromium journey checkpoints and five WebKit checkpoints; WebKit stopped at replacement-cancel focus and Firefox was not reached. At `src/test/integration/employee-mobile-calendar.integration.ts:56`, focus is checked immediately after a click although `src/components/employee-mobile/calendar.tsx:22` schedules restoration with requestAnimationFrame. This is consistent with a timing race but does not itself prove the actual focus outcome. Recheck the exact trigger with a bounded eventual assertion, preserve the failure and complete all three engines on the fixed candidate. The separately reported delayed-timer admission defect CR-3 is also unclosed at this reviewed candidate; source `src/lib/calendar/client.ts:46` and `:68` lacks an independent elapsed-lease admission check. Its implementation/security closure belongs to the code-review author, and is not inferred here from management statements.

### MEDIUM

**UI-1 — ISSUE: uncertain-operation recovery is not fully revealed after canonical status returns.** In `chromium-calendar-unknown-original.png`, the feedback begins around y709 while fixed navigation begins around y765; most explanation and the Retry original request control lie below the visible content area. `src/components/employee-mobile/calendar.tsx:18` reveals feedback only when notice changes. `src/lib/calendar/client.ts:54-61` publishes the unknown notice before canonical refresh; the later ready status/controls change layout without another reveal. The user can still scroll, so this is not a lost-operation or inaccessible-control claim. Nevertheless the explicit recovery action fails the intended visible-feedback behavior. Correct the targeted post-settlement reveal without scrolling on routine polling, and assert/render the recovery control above fixed navigation.

**UI-3 — RISK / acceptance evidence gap: keyboard and critical enlarged states are undersampled.** `src/test/integration/employee-mobile-calendar.integration.ts:34-67` uses pointer clicks and programmatic native select changes, with focus assertions but no actual Tab/Enter/Space traversal. At `:44-53`, 200% text coverage asserts only document-wide horizontal overflow; the viewport captures predominantly show provider content rather than enlarged private-link/copy and destructive confirmation controls. Touch checks use 43.5px for every control rather than separately proving 48px primary targets. Add bounded keyboard progression and visible focus evidence, plus targeted 320px/200% light/dark captures and bounds for one-time link controls and deliberate confirmation. These are coverage gaps, not assertions that the CSS currently clips or fails keyboard access.

### LOW

**UI-4 — RISK: a small number of geometry literals remain local.** `src/components/employee-mobile/calendar.css:21,23,28` uses 150px wrapping basis, 96px textarea minimum and 2px optical icon offset. Core color/typography/spacing/radii/action values are semantic tokens; these few geometric choices do not constitute a hardcoded fake design system. Consolidation can follow an existing shared token only if one fits, without inventing a new token for every number. Nonblocking.

## Verified design qualities

- **VERIFIED, UI-1 Visual Systems:** native section/header/headings, labelled textarea/buttons, details/summary guides and confirmation group render the UI. Shared `--em-*` semantic colors, spacing, rem typography, surface/radius, focus and action tokens drive the presentation. Actual shared Profile disclosure, Calendar owner, mobile shell/navigation, Phosphor icons and feedback utility are reused. No screenshot assets render the feature.
- **VERIFIED, UI-1:** inspected light/dark screenshots retain restrained teal hierarchy, aligned content insets, readable provider grouping, inset regular Phosphor carets and calm error/recovery surfaces. Red is confined to the revoke action. The composition is an appropriate adaptation of the approved prototype into the canonical inline Profile location.
- **VERIFIED, UI-2 within recorded scope:** Chromium actual own create, controlled clipboard success/failure, native select-all, explicit replacement/revoke, exact original replay, pause/expiry/denial/signout and responsive owner preservation have recorded passing checkpoints. WebKit has passing entry/create/provider reflow/pause checkpoints only. The sampled text contrast values in failure.json are at least 5.02 light and 9.00 dark for supporting/privacy text. These do not certify every control/focus state.
- **VERIFIED, UI-3:** one-time URL copy is clearly labelled; provider instructions identify computer/web setup constraints; copy is never called a confirmed provider connection. Replacement and revocation describe consequences and copied-event limits. Signing out is truthfully distinguished from revocation. Current source actions disappear on unavailable/denied states in inspected source/screens.

## Exact unresolved items and closure requirements

1. Close UI-1 with a bounded post-settlement visibility assertion and actual viewport artifact.
2. Close UI-2 with the final immutable candidate, completed three-engine result, and separately authored CR-3 closure. Preserve run-02 as failed history.
3. Supply UI-3 keyboard/focus and critical 200% control/confirmation evidence, including 48px primary-action measurements.

A rerun report must identify exact candidate and artifact paths. No final suite/custody, physical device, assistive technology, OS clipboard, real provider subscription, hosted environment, release or production certification is given here. No branch push, merge or deployment was performed by this reviewer.

## Author-owned closure, final local UI candidate

Candidate independently inspected: `5b3979f4f619422d1d26d114f8abb820aad3b7e3`. Initial checkout inspection on this follow-up was clean. Reviewed the complete four-file delta from `fc3a1874`, including UI effect, controller admission fix, regression tests and new integration checks. The run-04 `owned-next-Ws1T7m/source-manifest.json` names this checkpoint. Independently SHA256-compared Calendar view, Calendar CSS, controller and browser integration test in the source checkout and owned mirror against their manifest entries: all eight comparisons match.

Evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/run-04/calendar/`. Read `result.json`: passed, 39 recorded checkpoints (13 per Chromium/WebKit/Firefox), 108 captures, no unexpected recorded console messages, minimum sampled contrast 5.0289. `../calendar-browser.log` records 1/1 integration test passing in 80.87 seconds and the owned PostgreSQL cluster stopped. This is the scoped browser run, not the full combined suite or an independent process/database custody audit.

**UI-1 CLOSED.** Inspected the actual run-03 RED artifact `run-03/calendar/failure.json`: retry bottom856.515625 exceeded navtop765.40625. The final view effect (`src/components/employee-mobile/calendar.tsx:17-20`) also reacts when a pending recovery becomes canonically ready; unchanged nonpending polls do not trigger it. The run-04 assertion measures retry bounds without manual scrolling and requires the entire CTA above fixed navigation. Visually opened run-04 `chromium-calendar-unknown-original.png`, `webkit-calendar-unknown-original.png` and `firefox-calendar-unknown-original.png`: all show the entire explanation and retry button above navigation. Original-intent recovery still passes in every engine.

**UI-2 CLOSED for local browser acceptance.** Run-04 completes all three engine journeys, including WebKit cancellation. The final test awaits the exact originating Replace button focus after Enter cancellation, rather than changing the focus target or removing the assertion. The code-review author's `reviews/code/CODE_REVIEW.md` has a separately authored CR-3 CLOSED section at9d8d693d, with independent withheld-timer behavior and19/19 lifetime tests. I read that section and the actual monotonic lease fix; the controller has no diff from9d8d693d to5b3979f4. This acknowledges that author's closure; it is not independent security certification by UI oversight.

**UI-3 CLOSED for the requested local evidence.** Run-04 includes actual Tab traversal (WebKit's platform Alt+Tab), computed visible focus outline, Enter native selection, Enter provider expansion/collapse, Space confirmation opening, focused confirmation group and Enter cancellation with exact return focus. Critical control assertions require at least48px width/height, viewport containment above navigation and no internal text clipping. At320px/200% both themes now have dedicated secret/copy and replacement/revoke terms/control captures. I visually opened:

- `chromium-calendar-light-320-text200-copy.png`
- `webkit-calendar-dark-320-text200-copy.png`
- `webkit-calendar-light-320-text200-secret.png`
- `firefox-calendar-replace-dark-text200-control.png`
- `webkit-calendar-revoke-light-text200-terms.png`
- `chromium-calendar-revoke-dark-text200-control.png`
- `firefox-calendar-revoke-dark-text200-control.png`

The inspected controls wrap within their surfaces, retain hierarchy and remain reachable by scrolling. Larger confirmation content naturally spans more than one viewport; this is not clipped content. Secret text remains intentionally redacted in screenshots; actual selection assertions cover the native field. These checks are local automated keyboard evidence, not a physical keyboard or screen-reader certification.

**UI-4 remains LOW/nonblocking.** A few local layout/optical geometry literals remain; core design values are semantic tokens and reused native/application primitives. No token-system or screenshot-substitution blocker exists.

### Remaining conditions

- Full combined regression/static/custody gates must retain their own QA/code acceptance before Calendar is represented as fully complete. This local UI approval does not close those gates.
- Retain physical devices, real provider subscriptions, native clipboard permissions, assistive technology, hosted build and release readiness as explicit unverified capabilities.
- Preserve failed run-02 and run-03 history and this author's closure record. No policy exception, new feature or production action is required by these UI findings.
