# Merge 1 · backend · bars and stability

**Unpublished diagnostic snapshot, superseded by the concurrent Wave A candidate.** These measurements belong to `2fafc1a`, not published `0e01046` or the current coordinator refresh `25dca8d`. The protected push was rejected when the remote moved; no newer candidate was overwritten.

**Not zero: 0 newly verified P0, 0 P1, 0 P2; inspection incomplete.**

Source: `2fafc1aa84f43a120d2f8fff4c3855ebf4b15dcf`; backend merge `29ebdc5`, coordinator base `634795d`. These are combined checks of the initial backend integration and its separate authorized confirmation cleanup. No UI chat is admitted as zero. Later coordinator commits are queued and do not inherit this result.

## Earlier findings

The Profile Manager-at-320 initial-data fix is explicitly deferred until Profile merges. Its earlier 0.029 measurement is not reattributed to this candidate.

## Findings

No new measured stability defect filed in the limited combined sample.

## Checked and correct

- Completed 390px/100% Home and Inbox checker observations record CLS=0. One Employee Inbox navigation-context failure passed its single identical retry; its permission redirect was independently confirmed.
- 32 More openings fit the tested viewports and close with Escape. Viewport captures avoid treating sticky-bar full-page artifacts as layout defects.
- Root layout retains both the coordinator's text-scale script and backend development-only hook exactly as prescribed by the coordinator. No alternative placeholder layout was chosen.

Evidence: `checks.json`, `evidence/shell-probes.json`.

## Gaps

The full enlarged-text/load/font-swap matrix and held/failed/slow-state measurements are incomplete. The completed Schedule matrix had one statement-timeout HTTP 500 (server log confirms the cause); its single identical retry returned HTTP 200 with only the known small-text flags. No outage defect is inferred. No production build/erasure pass is claimed here. Open verified new stability findings: 0; area incomplete.
