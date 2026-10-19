**Not zero — known source finding WR-WC-25 (P1); full exit evidence incomplete.** Exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. This preserves the independently measured finding in `../round-4/widths-roles.md` at `c05d594`; fresh dialog re-checks are queued.

## Earlier findings

WR-21 is fixed in the prior exact-SHA re-check: color well 64×48px at 100%,64×96px at 200%, teal pixels present in both engines. WR-11, WR-13, WR-22, WR-23 and WR-24 remain under full re-check. WR-09 native-select truncation is decided.

## Findings

| ID | Screen / role / width | Measured defect | Evidence | Cause | Specific fix | Severity |
|---|---|---|---|---|---|---|
| WR-WC-25 | Archive break type;Replace tablet/Create setup code;Owner;Chromium 320/200 | Primary button 280×52px contains a two-line 240×88px label. Button y 708–760; label y 690–778,18px outside both edges; final line enters Cancel's area by 6px. | [Prior measurements](../round-4/dialog-buttons.json), [Archive crop](../round-4/crops/WR-WC-25-chromium-archive-320-t200-before.png), [browser-only proof](../round-4/crops/WR-WC-25-chromium-archive-320-t200-browser-proof.png) | `src/app/app/premium-wave-c.css:220`, `flex:1 1 0` collapses content height in phone column layout. | At max-width 599px, override the same dialog-action selector to `flex:0 0 auto`; retain min-height 52px and 12px block padding. Expected two-line button 112px; Cancel 68px. Preserve equal-width row rule from 600px. | P1 |

The candidate has not integrated these Wave C dialogs. This is a source-owner blocker; there is no eligible zero verdict or candidate repair to certify yet.

## Checked and correct

- [26/26 unchanged-checker initial samples](evidence/checks-initial.json), all 13 Owner routes at320/100 in both engines with axe: no document overflow or undersized targets.
- Prior exact-SHA color-well and 134 phone-card inset samples remain available in `../round-4/known-fixes.json` and `baseline.json`.

## Gaps

All seven dialogs at large text, remaining role/back/long-name variants, full widths/text matrix, and earlier WR IDs are incomplete. No independent zero is claimed from the fixed swatch alone.

Zero open P0–P2 in this area: **no**.
