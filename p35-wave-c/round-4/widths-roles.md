**Incomplete — 0 P0, 0 P1, 0 P2 newly verified so far; no zero verdict.** Exit round 4 on `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. The blank color swatch is fixed; remaining width/role re-checks and the full matrix are incomplete.

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| WR-21 | Fixed | Chromium and WebKit 390: native well **64×48px** at 100%, **64×96px** at 200%; inline `height:3rem` wins. The crops contain **1528** exact #077572 pixels at 100%, **4120** at 200%, in both engines. |
| WR-11, WR-13, WR-22, WR-23, WR-24 | Not yet fully re-checked | Remain in the full exit sweep. |

## Findings

None newly verified in this interim re-check.

## Checked and correct

- [Chromium 390/100](crops/WR-21-chromium-390-t100-settled.png), [WebKit 390/100](crops/WR-21-webkit-390-t100-settled.png): the teal fill is visibly present, opacity 1.
- Native color value remains **#077572**. No color or settings save was sent.

## Gaps

All other states/roles and matrix/axe completion remain required; this does not certify the exit round.
