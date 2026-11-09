# NEVORA Phase B - UI Baseline Audit

Baseline source: f45e72e76dc52186c6a59b8eed04e03345c631d9

## Implementation integrity verdict

PASS WITH PHASE B WORK REQUIRED. The incumbent application is recognizably one NEVORA product and the corrected 424-check matrix found no global overflow, focus or clearance failure. The remaining verified browser defect is concentrated in the mobile Schedule More interaction. Source review still shows control and style drift that Phase B was explicitly created to remove.

## Audit health score

| Dimension | Score | Key finding |
| --- | ---: | --- |
| Accessibility | 3/4 | Automated target, focus and overflow checks found no verified defect after harness correction; physical assistive-technology and complete contrast certification remain outside Task 1. |
| Performance | 3/4 | No automated menu-open performance finding or browser runtime error was recorded; local owned-runtime evidence is not a production latency claim. |
| Responsive Design | 2/4 | Schedule More opens below the visible phone viewport in 16 reproducible Owner/Manager Chromium/WebKit cases. |
| Theming | 2/4 | A token system exists, but the large stylesheet still contains substantial legacy hard-coded and override density. |
| Implementation Integrity | 2/4 | Product-specific patterns are strong, but base 42px action geometry, scoped 44px overrides and fragmented choice-control presentation need consolidation. |
| Total | 12/20 | Acceptable baseline |

## Executive summary

- Corrected full matrix: 424 checks, 0 runner errors.
- Focused Schedule supplement: 28 checks, 16 verified P1 findings, 0 runner errors.
- All 16 verified P1 findings are one defect family: the Schedule More menu extends below the phone viewport at 320, 375, 390 and 430px for Owner and Manager in both Chromium and WebKit.
- 64 initial bottom-navigation alerts were rejected as harness false positives, not relabeled product bugs. A corrected focused run passed 14/14 with zero findings, and the corrected full matrix also recorded zero bottom-nav findings.
- No baseline screenshot or prior evidence was overwritten; raw runs remain external and separately attributable.

## Verified findings

- P1 Responsive - owner-schedule - chromium - 320px - .schedule-more-popover: open menu bounds {"x":13,"y":656.6875,"width":286,"height":264.015625} exceed viewport 320x844
- P1 Responsive - manager-schedule - chromium - 320px - .schedule-more-popover: open menu bounds {"x":13,"y":656.6875,"width":286,"height":264.015625} exceed viewport 320x844
- P1 Responsive - owner-schedule - chromium - 375px - .schedule-more-popover: open menu bounds {"x":24,"y":654.6875,"width":330,"height":250.9375} exceed viewport 375x844
- P1 Responsive - manager-schedule - chromium - 375px - .schedule-more-popover: open menu bounds {"x":24,"y":654.6875,"width":330,"height":250.9375} exceed viewport 375x844
- P1 Responsive - owner-schedule - chromium - 390px - .schedule-more-popover: open menu bounds {"x":39,"y":654.6875,"width":330,"height":250.9375} exceed viewport 390x844
- P1 Responsive - manager-schedule - chromium - 390px - .schedule-more-popover: open menu bounds {"x":39,"y":654.6875,"width":330,"height":250.9375} exceed viewport 390x844
- P1 Responsive - owner-schedule - chromium - 430px - .schedule-more-popover: open menu bounds {"x":79,"y":654.6875,"width":330,"height":250.9375} exceed viewport 430x844
- P1 Responsive - manager-schedule - chromium - 430px - .schedule-more-popover: open menu bounds {"x":79,"y":654.6875,"width":330,"height":250.9375} exceed viewport 430x844
- P1 Responsive - owner-schedule - webkit - 320px - .schedule-more-popover: open menu bounds {"x":13,"y":656.6875,"width":286,"height":264.015625} exceed viewport 320x844
- P1 Responsive - manager-schedule - webkit - 320px - .schedule-more-popover: open menu bounds {"x":13,"y":656.6875,"width":286,"height":264.015625} exceed viewport 320x844
- P1 Responsive - owner-schedule - webkit - 375px - .schedule-more-popover: open menu bounds {"x":24,"y":654.6875,"width":330,"height":250.9375} exceed viewport 375x844
- P1 Responsive - manager-schedule - webkit - 375px - .schedule-more-popover: open menu bounds {"x":24,"y":654.6875,"width":330,"height":250.9375} exceed viewport 375x844
- P1 Responsive - owner-schedule - webkit - 390px - .schedule-more-popover: open menu bounds {"x":39,"y":654.6875,"width":330,"height":250.9375} exceed viewport 390x844
- P1 Responsive - manager-schedule - webkit - 390px - .schedule-more-popover: open menu bounds {"x":39,"y":654.6875,"width":330,"height":250.9375} exceed viewport 390x844
- P1 Responsive - owner-schedule - webkit - 430px - .schedule-more-popover: open menu bounds {"x":79,"y":654.6875,"width":330,"height":250.9375} exceed viewport 430x844
- P1 Responsive - manager-schedule - webkit - 430px - .schedule-more-popover: open menu bounds {"x":79,"y":654.6875,"width":330,"height":250.9375} exceed viewport 430x844

## Rejected harness finding

- Mobile-nav clearance, 64 initial alerts: NOT A PRODUCT DEFECT. Root cause was the harness calling scrollIntoView block=end, which deliberately moved the final control underneath a fixed nav. The corrected measurement scrolls to the page true maximum position before checking clearance.

## Systemic source observations

- P2 Control geometry drift: base button is 42px while 51 scoped rules specify 44px. Task 2 owns consolidation.
- P2 Choice-control drift: 15 raw select controls across 7 TSX files use fragmented presentation. Native pickers remain valid; Tasks 2 and 5 own a shared NEVORA language.
- P2 Stylesheet override density: globals.css is 12,891 lines with 237 hex-color and 165 important occurrences. These counts are not defects by themselves; they support controlled extraction rather than a rewrite.

## Positive findings

- Corrected full matrix recorded no horizontal-overflow, final-control/mobile-nav-clearance, representative-focus or sub-44 visible-action defect under the automated checks.
- Employee mobile smoke completed 84/84 checks in both engines with zero runner errors after the harness selector bug was fixed.
- Existing token variables, responsive breakpoints, reduced-motion handling and the owned disposable application harness provide a strong foundation to harden rather than redesign from scratch.

## Evidence attribution

- Full corrected matrix: /Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-b/full-baseline-2/baseline
- Schedule interaction supplement: /Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-b/schedule-supplement/baseline
- Initial run containing rejected nav false positives: /Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-b/full-baseline/baseline
- Corrected clearance smoke: /Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-b/clearance-smoke/baseline

## Limits

- Uses an owned disposable PostgreSQL database and scratch Next runtime, not production Neon.
- Uses local Chromium/WebKit runtimes, not physical iPhone/iPad/Safari hardware.
- Geometry/focus automation does not replace a real screen-reader audit.
- Task 1 is a technical baseline, not physical-device or real assistive-technology certification.
- Source observations are maintainability/design-system risks and are separate from reproduced browser defects.

## Task 1 disposition

Ready to commit. Task 2 should reproduce the Schedule menu viewport failure before changing product code, then establish the canonical interaction-control and 44px geometry foundation.
