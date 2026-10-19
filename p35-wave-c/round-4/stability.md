**Incomplete — 0 P0, 0 P1, 0 P2 newly verified so far; no zero verdict.** Exit round 4 on `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. ST-02's reported toast collision is fixed; the full five-area exit sweep and matrix remain outstanding.

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| ST-02 | Fixed for the reported toast collision | Chromium and WebKit, 320/390, 100/200%: **0px Save/toast overlap**. At 200%, measured bar **y613–761**, toast ends **y605** after entrance settles: **8px** clear of the bar. |
| ST-13, ST-15 | Fixed in the measured Features cases | At 200% the bar ends at **761**, exactly the 83px tab bar’s top. Save remains y625–693 and visible. |
| ST-05, ST-08, ST-14, ST-16, ST-17 | Not yet fully re-checked | Remain part of the full exit sweep. |

## Findings

None newly verified in this interim re-check.

## Checked and correct

- [Chromium 320/200](crops/ST-02-chromium-320-t200-settled.png), [390/200](crops/ST-02-chromium-390-t200-settled.png); [WebKit 320/200](crops/ST-02-webkit-320-t200-settled.png), [390/200](crops/ST-02-webkit-390-t200-settled.png).
- Normal-motion toast entrance can briefly reduce the bar gap; it never intersects Save in these probes. The 200% screenshots retain 0 action overlap.
- The probe waits for the live bar/tab-bar measurements and then dispatches the app’s public toast event. It does not submit a successful save to the server.

## Gaps

Loading, policy/history, dialogs, pending widths, large data and the remaining matrix/axe cells still need the exit sweep. Earlier cold, unhydrated event probes are excluded from the verdict.
