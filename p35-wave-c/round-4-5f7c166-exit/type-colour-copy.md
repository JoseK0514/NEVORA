**Not zero — known source finding TC-WC-28 (P1); full exit evidence incomplete.** Exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. This preserves the independently measured finding in `../round-4/type-colour-copy.md` at inspection commit `c05d594`; the fresh local contrast re-check is queued.

## Earlier findings

TC-10, TC-11, TC-15, TC-16, TC-17, TC-26 and TC-27 remain under re-check. TC-23 is partly fixed: the ordinary input edge was repaired, while the textarea remains covered by TC-WC-28. Native select/date limitations and coordinator-owned spelling remain decided as recorded in Wave C ROUND.md.

## Findings

| ID | Screen / role / width | Measured defect | Evidence | Cause | Specific fix | Severity |
|---|---|---|---|---|---|---|
| TC-WC-28 | Account recovery; Owner and Manager;390/100;Chromium and WebKit | Verification textarea edge is 1px #D5DAD9 on white, 1.41:1. Employee-ID input is #858B8F,3.45:1. Required edge contrast is 3:1. | [Prior measured styles](../round-4/field-contrast.json), [Owner Chromium crop](../round-4/crops/TC-WC-28-chromium-QAOWNER-idle.png) | `src/app/app/portal-premium.css:870–871`, stronger shared textarea selector uses `--nv-border`. | Winning textarea/search selector must use `border:1px solid var(--nv-field-border)`; retain focus outline. | P1 |

The coordinator reports that candidate `cbaadbc` already contains the shared-border repair. It does not close the finding on this exact Wave C source. Recheck after the eligible Wave C merge includes the latest shared CSS.

## Checked and correct

- Unchanged coordinator checker: [26/26 initial samples passed](evidence/checks-initial.json): all 13 Owner routes,320/100, Chromium and WebKit, axe enabled. No sampled text-floor, target, overflow, CLS, console or axe failure. Manual field-edge inspection remains required; axe does not close TC-WC-28.
- Earlier 141 baseline samples at the same source SHA remain available in `../round-4/baseline.json`; they are sampled evidence, not a completed exit matrix.

## Gaps

Fresh contrast, all earlier TC IDs, expanded/custom states, full width/text matrix and broader wording judgment remain incomplete. Browser work was paused at the coordinator's request for uncontended candidate release tests. No payroll/legal wording is changed or proposed.

Zero open P0–P2 in this area: **no**.
