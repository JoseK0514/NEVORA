# Combined type, colour and copy

Final candidate `8e18a95`, application checkpoint `0bdaa4d` (coordinator `227150b`, backend `da2a4e5`, Profile `ea58610`). The final commit only restores a backend test assertion; application/build/config bytes are unchanged.

## Verdict

Not zero: P0 0 / P1 2 / P2 0 confirmed. All88 automated failures are text-floor violations; no nontext gate failure.

| ID | Scope / measurement | Evidence | Cause / fix / owner | Severity |
|---|---|---|---|---|
| RC-PC-TC-01 | Desktop1440: sidebar group headings12px and powered-by footer10px, below14px floor; both engines | [180 checker cells](checks-0bdaa4d.json), [summary](checks-0bdaa4d-summary.json) | `src/app/app/portal-gusto.css:205` and shared footer styles. Desktop owner: use kit roles at least14px; recheck every role. | P1 |
| RC-PC-TC-02 | Employee/Lead desktop: Profile supporting copy13px; Home zone12px/empty-time13px; My time freshness12px; Updates Review update/footnote12px; Availability From/Until11px and help13px. Both engines. | Same exact-source checker data | Legacy page rules remain outside the phone-only type overrides: e.g.`src/app/app/availability/availability.css:102`, `portal-gusto.css:527`, employee component styles. Coordinator owner: apply the desktop14px floor through the shared kit roles. | P1 |

## Earlier findings / checked and correct

The apparent Wave A field-edge regression is an old-coordinator snapshot difference. Its standalonea05f26a border is#D5DAD9,1.413:1. The actual candidate’s46 active fields across5 screens and both engines use#858B8F on white,3.45:1, with no shadow. Latest coordinator’s--nv-field-border and winning overrides already fix it. [Current colour proof](colour-0bdaa4d/colour.json). Do not ask Wave A to duplicate that shared fix or count it as a new candidate defect.

Profile’s alert words match the source-approved Shift requests and clock-in review labels. Topic ids and delivery policy are unchanged. No payroll/legal wording is changed or counted.

## Gaps

This is a partial combined inspection. Complete every-page/all-state contrast, date-wrap and full release matrix remain unfinished. Recorded zoom-triggered CLS is not loading CLS; the unchanged checker gates the latter at100%. Physical devices and screen readers remain separate.
