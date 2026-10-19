**Not zero — 0 P0, 0 P1, 1 P2 newly verified.** Exit round 5 on `8012d9790e72987140f939c7d70e1df9612ea009`. Full TC and matrix coverage remain incomplete.

## Status of earlier findings

TCD-01 through -21 remain under the full exit re-check, except items explicitly assigned to another owner or kept in the handoff. Menu heading TCD-18 passes the measured 100% cases at **14/20px** in both browsers/all four roles.

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-P4-24 | Desktop header, Owner; 768 and 1440, 100/200%; Chromium/WebKit | `.command-finder-trigger kbd` — Ctrl K | Visible shortcut text stays **12/18px**, below the **14px** desktop floor, while Search is **14/20.3px**. Root text changes **16→32px**, but the hint stays 12px. Judgment: it is `aria-hidden` to avoid duplicate speech, but still conveys a functional shortcut visually; the brief lists no shortcut exception. | [Chromium](crops/TC-P4-24-chromium-1440-t100.png), [WebKit](crops/TC-P4-24-webkit-1440-t100.png) | `src/app/app/portal-desktop.css:116` sets `font-size:12px`. | Use the kit **14/20px** callout role, e.g. `font:var(--nv-t-callout)`, retaining the keycap styling. Let the trigger fit the text; on cramped headers hide the optional hint rather than render it below the floor. | P2 |

The shortcut finding is **TC-P4-24**. An earlier checkpoint called it TC-P4-22; a concurrent independent report already uses that ID for Availability labels. Those are separate defects, so this report reserves -24 for the shortcut.

## Checked and correct

- [Header metrics](header-type.json): both engines, 768/1440, 100/200% text.
- The account-menu heading is **14px** at 100%, in eight role/browser samples.

## Gaps

Remaining TC IDs, page content, contrast and other states need full judgment. Legacy Requests/Exchange/Availability body flags belong to Wave A; this handoff owns their sidebar/trail only. They are not new Desktop findings.
