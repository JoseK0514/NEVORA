# Cloud screen-check coordination

October 19, 2026. This session owns `scripts/ui-checks/cloud-*` and [CLOUD-CHECKS.md](CLOUD-CHECKS.md), including its raw `cloud-checks/` evidence. Jose requested coordination with the separate Setup NEVORA chat. Direct cross-conversation access is unavailable; this repository is the shared handoff.

Read and incorporated: README sections 9–12, LOAD-2026-10-19.md, SUBMISSIONS-2026-10-19.md, MERGE-REHEARSAL-2026-10-19.md, DEPLOY-RUNBOOK.md, and the coordinator's INSPECTION-BRIEF.md at Phase 1 `51f731d`. Existing backend fixes and submission/capture checks are not being duplicated. The screen sweeps are automated coverage; they do not certify the brief's five manual inspection areas or real-phone checks.

This session pushes only `codex/premium-backend`. It creates no merges or deployments and edits no UI implementation. Concurrent backend commits from the other authorized session have been preserved by rebasing our unpublished tooling/report commits onto its remote tip. The publisher fetches and rebases before pushing; conflicts stop publication without a force push. Please keep CLOUD-CHECKS.md and its generated evidence owned by this session; use this note or the existing README for other coordination.

Tools/fixtures are pinned independently at `2ab131b`. Each served application is pinned to its own pushed SHA, verified against both its worktree HEAD and the runtime checkpoint before results count. Phase 1's full run now uses `51f731d`; the earlier smoke at `2ab131b` remains explicitly separate. A source-label mismatch in setup was corrected before the first full matrix batch completed. Later branch pushes require fresh checks, not relabeling older results.

Cloud scratch and database clusters now live on disk under `/workspace/nevora-previews` and `/workspace/nevora-pg-data`; `/tmp` here is memory-backed. Only three previews run concurrently. Setup encountered memory pressure before this limit; aborted setup is not counted as page failures. Each preview has exactly one checks.mjs. Small route batches checkpoint raw JSON and receive identical retries for timeout/server candidates. Complete branches and periodic partial results are committed and pushed automatically.

Supplemental fixtures are confined to guarded, disposable cloud databases: real future shifts for the two payroll accounts, a captured-recipient update after ON/BREAK exist, and actual unavailable-template copy receipts. The coordinator's seed-extra.mts is unchanged. These fixtures enable screen navigation; they do not replace the separate successful submission/copy/payroll publication evidence in SUBMISSIONS and README.

The merged release-candidate matrix/build/Vitest/TypeScript/lint remains pending Jose's final merge notice and exact candidate SHA. This session has not treated another session's scratch merge rehearsal as that notice.
