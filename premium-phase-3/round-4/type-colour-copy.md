**Not zero — 0 P0, 1 P1, 0 P2 newly verified so far.** Interim round 4 on the exact handoff-adding commit `f691decb5496377a35ca7777d3025674f45bb94e`. Earlier findings and the complete matrix remain in progress; no full-round or exit verdict is claimed.

## Status of earlier findings

TC-P3-09 and TC-P3-18 through TC-P3-31 have not yet had their complete state re-checks. They are not closed by this interim report. The new finding below is a different element from TC-P3-18's state-message text.

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-P3-32 | Availability usual/specific week, Employee; usual week, Lead after enabling a day; 320 and 390/100, Chromium and WebKit | `.av-time-range label > span` — From / Until | Time-field labels render at **11px**, below the **15px** phone floor. At 125% the unchanged checker reads **13.75px**, rather than the kit label role’s 18.75px. These are visible field labels, not tab labels or numeric badges. | [Employee Chromium](crops/TC-P3-32-chromium-AUDIT-E-usual-390.png), [WebKit](crops/TC-P3-32-webkit-AUDIT-E-usual-390.png); [Lead](crops/TC-P3-32-chromium-AUDIT-LEAD-usual-390.png) | `src/app/app/availability/availability.css:102` retains `font-size:calc(11 * var(--type-unit,1px))`; the portal’s kit overrides omit these spans. | Scope `.av-time-range label > span` to the employee Availability page and apply **`font:var(--nv-t-label)`**, giving **15/20px** at 100%, **18.75/25px** at 125%, and **30/40px** at 200%, including phone landscape. | P1 |

## Checked and correct

- Both browser crops show the labels beside the actual editable time fields. Lead’s day was enabled only in local form state; nothing was submitted.
- Baseline script flags reproduce on both usual-week and next-week routes. There is no sideways overflow in those recorded cells.

## Gaps

The remaining copy/contrast/date/state re-checks, other accounts, widths and axe are still running or queued. `checks.json` is explicitly partial.
