# Alignment and geometry

**Not zero / incomplete coverage.** No new alignment P0–P2 found in the reviewed samples.

Source: **`98b037b855b30d0494885e0e8c5b0c3bc78d228f`**, from the publishing task’s preserved `../probe.json`, `../checks.json`, `../pending.json` and screenshots. This is a secondary artifact review, not a fresh browser run, a full source exit, or evidence for `bf6c030` or a later candidate.

## Earlier findings

The Availability compile incompatibility is absent in these rendered samples. Source-chat alignment exits are not closed by this review.

## Findings

No new alignment finding. Known pending movement belongs to stability.

## Checked and correct

- All 142 measured cards across the 60 phone captures, including loading states sit at x16–374 in the 390px viewport, with 20px radius and no border.
- Add shift and Team availability use the same card edges; see [Add shift](../crops/chromium-AUDIT-M-21.png) and [Availability](../crops/chromium-AUDIT-M-29.png).
- 76 measured adjacent-card separations are16px. The larger148/200px separations are around intervening FormActions on New employee/Edit shift; Owner Home includes other content between extracted cards. This card-only extract does not establish a blank-space defect.

## Gaps

No fresh desktop geometry, baseline/inset measurements, all-width judgment or full state geometry sweep here. Do not infer a zero area from these phone samples.

Evidence gap: **8/16 Home/Inbox captures still contain loading text** (see `summary.json`). Wait for the actual private-read panel to settle in a fresh probe; permit its read-only action-center POST while blocking mutations. Those captures prove rendering and shell behaviour, not a ready-state pass. This is a harness-coverage gap, not a product finding.
