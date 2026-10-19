# Merge 1 · backend · alignment and geometry

**Unpublished diagnostic snapshot, superseded by the concurrent Wave A candidate.** These measurements belong to `2fafc1a`, not published `0e01046` or the current coordinator refresh `25dca8d`. The protected push was rejected when the remote moved; no newer candidate was overwritten.

**Not zero: 0 newly verified P0, 0 P1, 0 P2; inspection incomplete.** This is a bounded combined sample, not a completed full-width/zoom sweep.

Source: `2fafc1aa84f43a120d2f8fff4c3855ebf4b15dcf`; backend merge `29ebdc5`, coordinator base `634795d`. These are combined checks of the initial backend integration and its separate authorized confirmation cleanup. No UI chat is admitted as zero. Later coordinator commits are queued and do not inherit this result.

## Earlier findings

No earlier combined-release alignment IDs exist in this backend-first track. Existing chat findings remain with their source owners.

## Findings

No new measured alignment defect filed in this sample. Do not infer a zero verdict from this empty table.

## Checked and correct

- Across the 40 recorded Home/Inbox/role observations, visible main headings have x=16px at 320, 390 and 844×390; x=312px at 1440. Each tested role uses the same edge at a given viewport.
- More occupies x=0 and the full 320/390px width on portrait phones; landscape uses x=142, width=560 within 844px.
- Source custody: the merge's portal-premium.css equals the coordinator version at merge time; no older incoming CSS snapshot was selected.

Evidence: `evidence/shell-probes.json`; full viewport captures remain in `/workspace/release-evidence/merge-1-backend/probes-ready/`.

## Gaps

All other page/card inset and spacing comparisons, intermediate widths, enlarged text, slow-loading geometry and each new UI chat's cross-page controls remain pending. Backend APIs are not substitutes for the unmerged Profile screen. Open verified new alignment findings: 0; area incomplete.
