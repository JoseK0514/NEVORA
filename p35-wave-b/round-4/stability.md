**Not zero — 0 P0, 1 P1, 0 P2 newly verified.** Exit round 4 on `9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7`. Full stability and matrix coverage remain incomplete.

## Status of earlier findings

ST-B08, ST-B13 and ST-B14 remain under full re-check. The pending-button defect below is a new measured instance.

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| ST-WB-15 | Create update, Owner, Chromium 320/200 | Publish update | Idle **248×88px** becomes **248×52px** while publishing. Top moves **391.52→427.52px**, a **36px** jump; bottom stays 479.52. At 1440/100 it stays **192×52px**. | [Pending viewport](crops/chromium-QAOWNER-320-t200-pending.png) | `src/components/communication-compose.tsx:100` replaces a wrapping idle label with shorter Publishing… without holding its intrinsic height. | Put both labels in the **same grid cell**, hiding the inactive label visually and from accessibility. Preserve **88px** at 320/200 and the existing **52px** minimum. Keep both height and width stable across the full matrix. | P1 |

## Checked and correct

- Owner's two held publication cases keep BUTTON focus while pending and send **1 intercepted publication request** each. [Measurements](compose-states.json).
- The desktop button's dimensions remain unchanged in the measured case.

## Gaps

WebKit/other-role replays, other controls, earlier ST IDs, slow reads/expiry, placeholders and full matrix/axe remain incomplete. Browser-only audience preview returns three fictional recipients; publication never reaches the server.
