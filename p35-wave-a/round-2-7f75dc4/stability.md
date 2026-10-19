# Wave A stability — not zero

P0 0 / P1 1 / P2 0 confirmed. Exact source `7f75dc4`, Wave A exit round 2. This is a failed early exit, not a completed zero sweep. Chromium and WebKit; fictional fixtures only. All 16 form requests were held in the browser and aborted; none reached the server. The full eight-width/four-text-size matrix and five-area state sweep were not completed after ST-WA-11 reproduced. Source app bytes were not edited.

## Earlier findings

- ST-WA-7/8/9 pass the targeted 320/200 held-press recheck: Swap stays 288×88px and Delete stays 248×88px in both engines. Document and button position remain held after the press scale ends.
- ST-WA-10 passes at 1440/100: Chromium Scheduling stays219×52 and Swap187×52. WebKit221.156→221 and188.219→188 are below0.25px, rather than the previous61px/28px shifts.

## Finding

| ID | Screen / role / size | Element | Measurement | Evidence | Cause / fix | Severity |
|---|---|---|---|---|---|---|
| ST-WA-11 | Edit shift, Manager; pending at844×390, then320×844;100% and200%; both engines | Delete this shift | The pending button retains min-width772px inside a248px card: x36, right808, while viewport320 clips its centered label. Aborting the held request clears the min-width and restores248px. Swap at200% similarly retains336px Chromium /355px WebKit in288px available width. | [Chromium100](rotation/crops/chromium-delete-100-rotated.png), [WebKit100](rotation/crops/webkit-delete-100-rotated.png), [raw](rotation/judgment.json) | `src/components/wave-a/keep-height.ts:15` and `pending-button.tsx:37` store fixed pixel min-width without a responsive bound. Reserve untransformed content geometry but clamp the held width to the current containing width (including after a viewport change); keep height sufficient for the wrapped label. | P1 |

## Checked and correct

- Each of the16 held cases sent exactly one intercepted request; no probe error.
- Idle landscape, pending landscape, resized pending and failed-state measurements are retained separately. A passing document-width320 check does not detect this clipping, because the shell clips overflow.
- Both Delete100% failure-state buttons return to248px after the request is aborted, linking the regression to the pending inline hold.

## Gaps

Only targeted fixes and resize regression were inspected on this exact SHA. Large-data, all roles, all states, full matrix/axe, native keyboards, devices and screen readers remain unverified. Do not merge this SHA as zero.
