# Wave C exit round 4

Source: `claude/p35-wave-c-93e13c` exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`, detached at `/workspace/inspect-wave-c`. Round authorization and scope: coordinator `c9d58d5`, `CODEX-WHILE-CLAUDE-PAUSED.md`, `INSPECTION-BRIEF.md`, and Wave C `ROUND.md`.

Status: **not zero; full exit inspection incomplete.** Three source P1s remain: TC-WC-28, WR-WC-25, and the ST-13 continuation confirmed here. Further browser work stopped at the coordinator's candidate freeze. No full width/text matrix or independent exit certificate is claimed.

The owned preview uses fictional data and a disposable PostgreSQL cluster. Preview passwords remain in their protected `access.json` files and are not copied here. One browser worker operates this preview at a time. App source, CSS, tests and `claude/*` branches are read only. Browser state tests intercept every non-GET request, holding, aborting or answering it locally. Shared shell findings are reported separately from Wave C.

The five reports are `alignment.md`, `stability.md`, `type-colour-copy.md`, `interaction-states.md`, and `widths-roles.md`. Scripts and measurements are under `evidence/`; screenshots are viewport captures so sticky bars retain their actual viewport positions.

Completed evidence:

- Unchanged coordinator checker: **26/26 passed**, all thirteen Owner routes, 320/100, Chromium and WebKit, axe; maximum CLS 0.
- Guarded save bars: **16 cases / 64 snapshots**, both engines,320×568/390×844,100/200%,Features and Policies. Zero hydration warnings. Source ST-13 reproduces; bounded-feedback browser-only proof holds every bar below the header and above the tab bar.
- Dialogs: **56 cases / 280 records**, all seven dialogs,320/390, 100/200%, both engines. Exact phone flex rule repairs label bounds in ready, pending and blocked failure. Every repeated activation is intercepted once; 56/56 Escape dismissals restore the exact opener.
- The pending label's 13px/58px vertical insets remain documented under WR-WC-25. The suggested `align-self:center` completion is prepared but **not tested**; no extra cases ran after freeze.
- [Closure evidence](evidence/runtime-closure.json): preview and PostgreSQL stopped cleanly; source and mirror verified; no errors. [Exact source manifest](evidence/source-manifest.json) records the three declared runtime substitutions: DB adapter, bounded fixture transport, and generated Next development references. App source, Claude branches and shared STATUS were not edited.

Wave C still needs the source fixes or reviewed ports, remaining earlier-ID rechecks, full matrix and the combined candidate check after an eligible merge. Existing candidate repairs and browser-only proof do not self-close the source findings.

The checker runs from a byte-identical external copy of the coordinator's `scripts/ui-checks/checks.mjs`. Coordinator checker SHA-256: `e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`. Its JSON outputs are preserved unchanged. Separate geometry/state probes run after the initial checker result, sequentially on the same preview. `matrix-hook.mjs` is an unused preparatory probe and does not supply baseline evidence.

Setup attempts were environmental gaps, not UI findings: the coordinator helper initially requested a migration absent at Wave C's SHA; an exact-source helper then exposed Turbopack's rejection of external `node_modules` symlinks. Both attempts stopped their own processes and database clusters cleanly. The shared runtime setup supplies the bounded local fixture transport and dereferenced dependency mirror needed in this cloud environment.
