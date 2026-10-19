# Interaction and states

**Not zero / incomplete coverage.** No new interaction P0–P2 established in this secondary review.

Source: **`98b037b855b30d0494885e0e8c5b0c3bc78d228f`**, from the publishing task’s preserved `../probe.json`, `../checks.json`, `../pending.json` and screenshots. This is a secondary artifact review, not a fresh browser run, a full source exit, or evidence for `bf6c030` or a later candidate.

## Earlier findings

The former merged Availability compilation failure is absent: both roles and engines render it with status200 and no page errors. This closes that observed integration symptom only, not Wave A’s exit.

## Findings

No new interaction finding supported by this artifact set. The pending-height findings are reported under stability.

## Checked and correct

- All eight More cases (four roles × two engines) open with focus inside, close by Close and Escape, and return focus to the trigger. Sheet actions are at least44px tall within measurement tolerance.
- All 60 rendered samples (some still loading) return200 with no page errors.
- Four held form cases (Swap and Delete in each engine) each issue one POST; every mutation is blocked.
- Employee/Lead Inbox resolves to Requests overview; Manager/Owner remain in Inbox. Those are expected role routes.

## Gaps

`pending.json` has empty filter/role arrays; those are not completed checks. No fresh Availability filter hold, keyboard submission sequence, full failed-read/401/offline/large-data sweep, successful server save or device test is certified. Pointer-focus snapshots do not establish a keyboard focus defect.

Evidence gap: **8/16 Home/Inbox captures still contain loading text** (see `summary.json`). Wait for the actual private-read panel to settle in a fresh probe; permit its read-only action-center POST while blocking mutations. Those captures prove rendering and shell behaviour, not a ready-state pass. This is a harness-coverage gap, not a product finding.
