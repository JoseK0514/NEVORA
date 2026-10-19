# Wave C exit round 4

Source: `claude/p35-wave-c-93e13c` exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`, detached at `/workspace/inspect-wave-c`. Round authorization and scope: coordinator `c9d58d5`, `CODEX-WHILE-CLAUDE-PAUSED.md`, `INSPECTION-BRIEF.md`, and Wave C `ROUND.md`.

Status: inspection in progress; browser work paused by the coordinator for uncontended release gates. The initial unchanged-checker baseline passed 26/26 samples. Two source P1s from inspection commit `c05d594` remain open (TC-WC-28 and WR-WC-25). No zero verdict is implied by an empty findings table before the evidence is complete.

The owned preview uses fictional data and a disposable PostgreSQL cluster. Preview passwords remain in their protected `access.json` files and are not copied here. One browser worker operates this preview at a time. App source, CSS, tests and `claude/*` branches are read only. Browser state tests intercept every non-GET request, holding, aborting or answering it locally. Shared shell findings are reported separately from Wave C.

Five reports will be stored alongside this file: `alignment.md`, `stability.md`, `type-colour-copy.md`, `interaction-states.md`, `widths-roles.md`. Scripts and measurements are under `evidence/`; screenshots are viewport captures so sticky bars retain their actual viewport positions.

The checker runs from a byte-identical external copy of the coordinator's `scripts/ui-checks/checks.mjs`. Coordinator checker SHA-256: `e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`. Its JSON outputs are preserved unchanged. Separate geometry/state probes run after the initial checker result, sequentially on the same preview. `matrix-hook.mjs` is an unused preparatory probe and does not supply baseline evidence.

Setup attempts were environmental gaps, not UI findings: the coordinator helper initially requested a migration absent at Wave C's SHA; an exact-source helper then exposed Turbopack's rejection of external `node_modules` symlinks. Both attempts stopped their own processes and database clusters cleanly. The shared runtime setup supplies the bounded local fixture transport and dereferenced dependency mirror needed in this cloud environment.
