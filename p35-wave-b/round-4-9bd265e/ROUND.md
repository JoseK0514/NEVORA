# Wave B exit round4 — limited cloud handoff

- Source: `9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7`; remote `564d193` changes docs only.
- **status: open** — not zero; incomplete exit sweep by explicit coordinator CPU/final-gate limit.
- Checker45/48:2 failed cells are TC-B-32;1 is unattributed CLS0.0244. No axe/full matrix.
- Four reproduced P2 IDs: **TC-B-32,TC-B-16,IS-B12,IS-B31**. Earlier unmeasured IDs are not closed. [Finding index](FINDINGS.md).
- [Alignment](alignment.md), [Stability](stability.md), [Type/colour/copy](type-colour-copy.md), [Interaction/states](interaction-states.md), [Widths/roles](widths-roles.md).
- [Manifest](manifest.json), [raw checker](checks-smoke.json), [source/transport proof](source-manifest.json). Manual JSON/crops beside them.
- No app edits, Claude mutations, commits, pushes or shared STATUS edits by this inspector.
- Owned runtime exited0; source/mirror verified; PostgreSQL and all browsers/checkers stopped. Root owns candidate fixes and Claude handoff.
