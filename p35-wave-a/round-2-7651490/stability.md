**Not zero — 0 P0, 1 P1, 1 P2.** Early exit checks on exact `76514905153c906bb76efc45808426e9d484cb64`. The first full-matrix batch was paused for the test run; these subsequent targeted checks establish failures before a zero verdict is possible. The matrix remains incomplete and this commit must not merge.

## Earlier findings

- ST-WA-7/8: the 36px height collapse is removed. Normal motion still leaves the precision defect below; reduced motion gives exactly88→88px and no document-height change.
- Shared kit/shell findings remain excluded from Wave A as the brief directs.

## Findings

| ID | Screen / role / conditions | Element and measured defect | Evidence | Cause and specific fix | Severity |
|---|---|---|---|---|---|
| ST-WA-10 | Member Scheduling, AUDIT-M,1440×900,100%; Chromium/WebKit | Save scheduling profile becomes Saving…: Chromium width219→160px and x963→1022 (59px sideways); WebKit221.16→160px and x960.84→1022 (61.16px). Swap also changes187→160px /188.22→160px. One held/aborted POST each. | [Member before](crops/width-chromium-scheduling-100-before.png), [pending](crops/width-chromium-scheduling-100-pending.png); [WebKit before](crops/width-webkit-scheduling-100-before.png), [pending](crops/width-webkit-scheduling-100-pending.png). [Raw](width.json). | `src/components/wave-a/pending-button.tsx:70` swaps away the idle label while only holding height; `premium-wave-a.css:112` makes desktop button widths auto with a10rem minimum. Reserve both labels in the same grid cell (as the shared submit button now does), or retain the untransformed inline size with a responsive container clamp. Keep219px/221.16px in these cases; retain normal wrapping on phones and rotation. | P1 |
| ST-WA-9 | Swap and Delete, AUDIT-E/AUDIT-M,320×844,200%; both engines; held mouse press200ms then release | Idle88px becomes86.234px while pending, with no remaining transform; inline min-height86.24px. Swap document4001→3999 (Chromium),4249→4247(WebKit); Delete3482→3480 /3562→3560. With reduced motion the same cases stay88px and document height stays constant. | [Swap before](crops/press-chromium-swap-200-before.png), [pending](crops/press-chromium-swap-200-pending.png); [Delete before](crops/press-webkit-delete-200-before.png), [pending](crops/press-webkit-delete-200-pending.png). [Normal motion](press.json), [reduced control](reduced.json). | `src/components/wave-a/pending-button.tsx:40` and `src/components/wave-a/keep-height.ts:15` capture getBoundingClientRect during the kit’s scale(.98) press feedback.88×.98=86.24; that transformed measurement becomes the subsequent layout minimum. Reserve idle/pending content in layout, or measure untransformed layout height (88px here), rather than the transformed rectangle. Keep88px after the press ends. | P2 |

## Checked and correct

- Every targeted submission produces one held POST; every mutation is aborted in the browser.
- Reduced-motion control cases in both browsers stay88px, isolating the press transform as the cause of ST-WA-9.
- Failure outcomes remain on screen; no source edit or server mutation was made.

## Gaps

Full matrix, axe and five-area exit sweep are incomplete on this new SHA. Earlier7679133 reports are retained separately and are not substituted for a zero exit on7651490. Wave A owns both fixes.
