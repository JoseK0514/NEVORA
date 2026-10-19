**Not zero — 0 P0, 1 P1, 0 P2 verified so far.** This is an interim report for exit round 2 on `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0`. The matrix and full five-area sweep remain incomplete; this is not an exit verdict.

## Status of earlier findings

| ID | Status | Evidence |
|---|---|---|
| ST-WA-1 | Not yet re-checked | Route placeholder sweep remains outstanding. |
| ST-WA-3 | Not yet re-checked | Held availability filtering remains outstanding. |
| ST-WA-2, ST-WA-4, ST-WA-5, ST-WA-6 | Shared; not counted against Wave A | Coordinator fixes are deliberately absent from this nominated commit and must be checked on the coordinator/combined build. |

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| ST-WA-7 | Swap, AUDIT-E, 320×844 at 200%; Chromium and WebKit | `form.shift-change-form .nv-btn[type=submit]` | The two-line **Send swap request** button is 288×88, y603.516–691.516. While the request is held, **Sending…** becomes 288×52, y639.516–691.516. Document height and scroll position both fall **36px**: Chromium 4001→3965 / 3157→3121; WebKit 4249→4213 / 3405→3369. The button’s top jumps under the finger. | [Chromium before](crops/ST-WA-7-chromium-320-t200-before-crop.png), [pending](crops/ST-WA-7-chromium-320-t200-pending-crop.png); [WebKit before](crops/ST-WA-7-webkit-320-t200-before-crop.png), [pending](crops/ST-WA-7-webkit-320-t200-pending-crop.png) | `src/components/wave-a/pending-button.tsx:61–62` removes the idle label and icon from layout when busy; the shorter label loses a line. | Keep both idle and pending contents in one grid cell (`grid-area:1/1`), with the inactive contents `visibility:hidden`, so the larger label still sizes the button. Keep **88px** throughout this 320/200 case and **52px** at 100%; preserve the button’s position and scroll. | P1 |

## Checked and correct

- At 390/200, Swap remains 358×52 before and pending in both browsers; no height/scroll delta.
- Double tap produces exactly **one held POST** for Swap, Unable to work, Add shift, Time off Approve and Decline, at 320/100 and 320/200. Each was answered by aborting inside the browser; no submission reached the server.
- Blocked Swap focuses its on-screen outcome alert and retains the chosen shift. At 320/200 the alert is 288×432 at y219.516–651.516, wholly above the tab bar.
- The earlier preview transport’s connection-exhaustion cells pass on one retry with the coordinator’s bounded local PostgreSQL transport. App source remains exactly `c05e0c7`; these were environment failures, not UI defects.

## Gaps

- `checks.json` is a partial checkpoint, explicitly `complete:false`. Remaining matrix cells, axe and the other stability states are still running/queued.
- Delete shift, sent states, large data and placeholder/filter stability still need their remaining checks. Native keyboard checks remain on the Mac.
