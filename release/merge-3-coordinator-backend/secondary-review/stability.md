# Bars and stability

**Not zero.** The preserved candidate has known Wave A pending-height defects (P1); this is an alias review, with no new source finding.

Source: **`98b037b855b30d0494885e0e8c5b0c3bc78d228f`**, from the publishing task’s preserved `../probe.json`, `../checks.json`, `../pending.json` and screenshots. This is a secondary artifact review, not a fresh browser run, a full source exit, or evidence for `bf6c030` or a later candidate.

## Earlier findings

ST-WA-7 and ST-WA-8 remain present on this candidate’s older Wave A `c05e0c7`. Later source fixes are excluded until their own zero exit.

## Findings

| Existing IDs / owner | Conditions | Measurement | Evidence | Cause / required fix | Severity |
|---|---|---|---|---|---|
| ST-WA-7 / ST-WA-8, Wave A | Swap / Delete, 320px, 200%, Chromium and WebKit | Both buttons shrink 88→52px while pending; document height drops 36px in all four samples. | [Swap before](../crops/chromium-swap-200-before.png), [pending](../crops/chromium-swap-200-pending.png); [Delete before](../crops/webkit-delete-200-before.png), [pending](../crops/webkit-delete-200-pending.png); raw `../pending.json`. | Older Wave A pending controls replace a two-line idle label with one line. Merge a verified-zero source fix that retains its 88px layout height, including normal press motion; do not patch candidate UI outside Jose’s three exceptions. | P1 |

## Checked and correct

- All 300 measured mobile-tab items are 55px tall in the 60 rendered samples (some still loading).
- Four held submissions issue one POST each, with zero mutations reaching the server.

## Gaps

No full loading/pause/offline/failed-read transitions or current-candidate stability certification. The newer Wave A `7651490` has separate ST-WA-9/10 findings; this older evidence does not establish their present state.

Evidence gap: **8/16 Home/Inbox captures still contain loading text** (see `summary.json`). Wait for the actual private-read panel to settle in a fresh probe; permit its read-only action-center POST while blocking mutations. Those captures prove rendering and shell behaviour, not a ready-state pass. This is a harness-coverage gap, not a product finding.
