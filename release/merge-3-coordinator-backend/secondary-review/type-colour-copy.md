# Type, colour and copy

**Not zero.** Known desktop text-floor failures remain in the preserved candidate (P1); no new wording decision is made.

Source: **`98b037b855b30d0494885e0e8c5b0c3bc78d228f`**, from the publishing task’s preserved `../probe.json`, `../checks.json`, `../pending.json` and screenshots. This is a secondary artifact review, not a fresh browser run, a full source exit, or evidence for `bf6c030` or a later candidate.

## Earlier findings

Desktop owns the shared desktop typography pass, and the coordinator owns shared phone copy. Do not double-count these shared findings against Wave A.

## Findings

| Owner | Conditions | Measurement | Evidence | Cause / required fix | Severity |
|---|---|---|---|---|---|
| Desktop; coordinator for shared styles | All 128 desktop checker cells at 1440/100–200%, both browsers | Sidebar headings remain 12px and the platform footer 10px. Employee Home also exposes 12–13px status/time text. Required desktop floor: 14px. | `../checks.json`, each `smallText` entry. The available review screenshots are phone captures; no desktop screenshot is invented. | Candidate predates the Desktop floor work. `portal-gusto.css` fixes sidebar labels at 12px; older Employee Home styles also remain below floor. Take the source-owner fix through a verified merge, then remeasure at 14px or above. | P1 |

## Checked and correct

- Every 390px/100–200% checker cell passes its text-floor check (128 cells across the selected routes/roles/engines).
- Shell More actions use the same wording in both engines. Manager omits Owner-only Payroll and Settings; role differences are expected.

## Gaps

No independent contrast calculation, all-copy/date-range sweep or desktop screenshot review here. Payroll/legal wording remains Jose’s decision. No evidence for 125/150% or other widths is inferred.

Evidence gap: **8/16 Home/Inbox captures still contain loading text** (see `summary.json`). Wait for the actual private-read panel to settle in a fresh probe; permit its read-only action-center POST while blocking mutations. Those captures prove rendering and shell behaviour, not a ready-state pass. This is a harness-coverage gap, not a product finding.
