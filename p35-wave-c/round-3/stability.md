# Wave C · round 3 · bars and stability

**Not zero: 0 verified P0, 1 verified P1, 0 verified P2 so far.** Interim re-check on `b109ec3fea10418fb9f5c9da2af0a1e561dc2678`. The save bar now docks correctly, but the earlier toast collision remains at 200% text. Other stability IDs and the full automated matrix are in progress; this is not an exit verdict.

## Status of earlier findings

| ID | Status | Measurement |
|---|---|---|
| ST-02 | **Partly fixed · P1 remains** | Features at 390×844, 100%: bar 700–776, Save 712–764, toast 648–692, **0px overlap**. At 200%, bar 613–761, Save 625–693, toast 636–692: **56 of the 68 button pixels are covered**. Chromium and WebKit match. At 320×844/200% the toast covers **67px** of the same 68px button. |

## Findings, worst first

| ID | Screen · role · width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| ST-02 (existing) | Features & words · Owner QAOWNER · 320/390 at 200% · Chromium; 390/200% · WebKit | `.nevora-toaster` over `.wc-actions.nv-actionbar button` | The bar grows from **76 to 148px** and correctly meets the tab bar at **761px**, but the toast still uses the original fixed **152px** bottom offset. At 390 its 358×56 box lies inside the Save button’s 358×68 box; hit-testing the button center returns the toast in WebKit. | `crops/features-390x844-t200-toast.png`, `crops/ST-02-webkit-390-t200.png`; 100% comparison `crops/features-390x844-t100-toast.png` | `src/app/app/portal-premium.css:479` assumes `68px + 76px + 8px`. `src/app/app/premium-wave-c.css:508` docks the actual bar using measured heights, and `src/app/app/settings/wave-c-form.tsx:136` already exposes `--wc-tabbar` and `--wc-bar`. | In Wave C scope, place the toast at `bottom:calc(var(--wc-tabbar,68px) + var(--wc-bar,76px) + 8px)`, e.g. with `html body:has(.wc-page.wc-page .nv-actionbar) .nevora-toaster`. At 390/200% that is **239px**, leaving **8px** above the bar; 100% remains **152px**. | **P1** |

## Checked and correct

- Features save bar is `fixed` on portrait phones, `static` at 844×390 and `sticky` on desktop.
- At 390/200%, bar bottom **761 = tab-bar top 761**; no part of Save is covered by navigation.
- A double tap sends exactly **one** request at 390, both 100% and 200%; every request was held and then aborted in the browser.
- Pending changes neither button position nor height: **712–764** at 100%, **625–693** at 200%.
- On failure the notice takes focus. Scroll stays **265** at 100% and **1,117** at 200%; the bar grows upward while the button stays put.
- Normal 390/100%, landscape and desktop toast cases have **0px²** overlap with the action.

## Gaps

- The toast was produced through the app’s own `nevora:toast` event in this browser. No successful server save was performed. Pending/failure used the actual handler with its request held and aborted.
- ST-05, ST-08, ST-13, ST-14, ST-15, ST-16 and ST-17 remain to be completed across their affected pages. Features-only measurements above do not close Company policies cases.
- IS-15’s original 390/100% collision is fixed; the enlarged-text remainder is counted here once as ST-02.
- Automated matrix and axe runs are not complete. Simulator keyboard and real-device checks remain on the Mac.

Open verified P0–P2 in stability so far: **1**. Round incomplete.
