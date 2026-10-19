**Incomplete — 0 P0, 0 P1, 0 P2 newly verified in this area; no zero certificate.** Exit round 2 on `a05f26a74b2979ce0efe1532f7f70d7064261bb9`. The reported pending-size defects pass the completed re-checks; full stability/matrix coverage is incomplete. Prior exact-source reports are retained in [history](history/c05e0c7/stability.md).

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| ST-WA-7, -8 | Fixed in the re-checked controls | Swap and Delete retain **88px** at 320/200 in both browsers; no pending-height collapse. |
| ST-WA-9, -10 | Fixed in the re-checked controls | Twelve held-press cases: Swap/Delete/Scheduling profile × 320/200 and 1440/100 × both engines. Heights change **0px**; widths change **0px**, except WebKit desktop rounding of **−0.22/−0.16px**. |
| ST-WA-11 | Passes completed rotation samples | While pending, 844×390→320×844 keeps document width **320px**; Swap **288px**, Delete and Scheduling profile **248px**, including the completed 200% cases. See [rotation evidence](rotation.json); other samples remain in progress. |
| ST-WA-1 through -6 | Not closed | Full exit re-checks remain outstanding. |

## Findings

None newly verified in this area's completed scope. The failed-action focus race is counted as IS-WA-2.

## Checked and correct

- **12/12** pending-size cases send exactly **1 intercepted POST** after a held press and repeat press. [Raw measurements](pending-size.json).
- [Swap before](crops/chromium-swap-320-t200-before.png), [pending](crops/chromium-swap-320-t200-pending.png), [WebKit pending](crops/webkit-swap-320-t200-pending.png).

## Gaps

The remaining routes, other submit controls, placeholders/reads, refresh/paused states, motion and complete matrix are incomplete. A passed size re-check is not an exit certificate.
