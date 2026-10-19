**Not zero — 0 P0, 1 P1, 0 P2 newly verified so far.** Exit round 4 on `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. The blank color swatch is fixed. Dialog actions become unreadable at large text; remaining width/role re-checks and the full matrix are incomplete.

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| WR-21 | Fixed | Chromium and WebKit 390: native well **64×48px** at 100%, **64×96px** at 200%; inline `height:3rem` wins. The crops contain **1528** exact #077572 pixels at 100%, **4120** at 200%, in both engines. |
| WR-11, WR-13, WR-22, WR-23, WR-24 | Not yet fully re-checked | Remain in the full exit sweep. |

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| WR-WC-25 | Archive break type; Replace tablet / Create a new setup code; Owner; Chromium 320/200 | `dialog.wc-dialog .wc-actions > .nv-btn` | The primary button stays **280×52px**, but its two-line label is **240×88px** at **34/44px**. Button y **708…760**; label y **690…778**: **18px** outside each edge, with the last line reaching **6px** into Cancel's area. White label portions outside the red/teal button disappear against the white dialog. A browser-only `flex:0 0 auto` produces a **112px** button and **12px** label insets; Cancel grows to **68px**. | [Dialog](crops/WR-WC-25-chromium-archive-320-t200-dialog.png), [Archive button](crops/WR-WC-25-chromium-archive-320-t200-before.png), [Replace tablet](crops/WR-WC-25-chromium-rotate-320-t200-before.png), [browser-only geometry proof](crops/WR-WC-25-chromium-archive-320-t200-browser-proof.png) | `src/app/app/premium-wave-c.css:220` sets `flex:1 1 0` on dialog buttons at every width. In the phone's **column** action layout, the zero basis collapses their content height to the 52px minimum. | Within **`@media(max-width:599px)`**, override the same dialog-action selector to **`flex:0 0 auto`**. Keep `min-height:52px`, automatic content height and `padding-block:12px`. At 320/200 expect **112px** for two label lines and **68px** for Cancel; preserve the row's equal-width rule from 600px. Re-check all seven dialogs and pending labels. | P1 |

## Checked and correct

- [Chromium 390/100](crops/WR-21-chromium-390-t100-settled.png), [WebKit 390/100](crops/WR-21-webkit-390-t100-settled.png): the teal fill is visibly present, opacity 1.
- Native color value remains **#077572**. No color or settings save was sent.
- The completed baseline samples contain **134 phone cards**, all with **16px** left and right page insets. Their recorded document widths equal the viewport widths.
- At 390/200, Clocker recovery's Check receipt is **68px**, fixing the earlier excess-height example in WR-22; Account recovery's two-line Issue recovery code is **112px**. Full WR-22 closure still needs pending-state measurements.

## Gaps

WebKit and the other widths for WR-WC-25 are still being measured. Remaining states/roles, earlier IDs and matrix/axe completion remain required; this does not certify the exit round. [Dialog-button measurements](dialog-buttons.json) contain the completed cells only. The browser-only flex proof changes no source/mirror CSS and submits nothing.
