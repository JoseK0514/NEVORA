# PR35 source and CI reconciliation

Scope: Jose authorized resolving the source-inventory gate and CI failures for [PR35](https://github.com/JoseK0514/NEVORA/pull/35), targeting development. Keep the frozen mobile design, authentication and permissions unchanged. This does not authorize merging PR35, main, production deployment or unrelated PR27/33/34 application changes.

## Source inventory — verified

Base development remains `46e202786863279302026ee03a0e225c359fa55c`. Preserve the six-head limit. The own-assembly branch is now the actual PR35 branch, so its future documentation/fix commits are checked for ancestry rather than creating an impossible self-referential recorded tip. PR33/34 are classified held at reviewed exact heads; their separate UI, schema and permission changes remain excluded.

Three remote heads were already ancestors of development and had merged PRs. Exact lightweight recovery tags were pushed and independently reread before deletion. Deletions were atomic, deletion-only, protected by expected-old-SHA leases; no retained branch history was rewritten. Local branches, worktrees and files were not deleted or reset.

| Retired remote | Exact preserved tip | Recovery tag |
|---|---|---|
| Claude-UI-Fix (merged PR31) | 8e9073974b52053e557382ec5199dbce9d5aa32c | archive/branches/2026-10-26/Claude-UI-Fix |
| claude/quiet-check-skeleton (merged PR32) | 16a9169ce1fc0d6eee9f3e1319d3db825ab1236f | archive/branches/2026-10-26/claude/quiet-check-skeleton |
| codex/owner-ai-release-testing-20261023 (merged PR29) | 2ea580d623c76dd7d717492d209552461b5b4a28 | archive/branches/2026-10-26/codex/owner-ai-release-testing-20261023 |

Retained: main, development, PR27 ci-spend-controls, PR33 home-clock-row, PR34 quiet-everywhere and PR35 mobile-access-onboarding. `npm run check:development-sources` passes:60 classified sources,6 active branches, exact archives/included/current-development ancestry. All11 inventory regression tests pass. The gate implementation and branch ceiling are unchanged.

Rollback: recreate only an absent retired branch from its verified archive SHA with a normal non-forced branch creation. Never overwrite a branch recreated/advanced by another owner. Archives remain indefinitely recoverable.

## CI investigation

Initial PR head `bf54d146d1003716ccf1a856258467134031e514`, run40434162558 (merge candidate60590390): phase-e-postgres and release-postgres passed; other gates were still running. Owner advisor browser failed waiting for changed evidence after mutating loc-1. Trace call922 and failure screenshot show the driver had dismissed West Office because it used the first ranked issue. Its loc-1 window also ended at12:00, so a business-evening run legitimately has no current loc-1 issue. This is a fixture/identity defect, not proof of an auth or frozen-UI defect.

Correction is confined to the owned browser fixture/driver: after the separate coverage proposal scenarios, seed loc-1 all-day windows for the briefing scenario; select the exact Main Office coverage row, require its unique heading, and retain actual track/defer/restore/dismiss/fingerprint-change/setup-resolution, canonical database, role-denial and runtime-error assertions. Do not copy PR34's broad application or error-filter changes.

Remaining CI failures are under investigation. This handoff is not a merge-ready claim until the final exact pushed candidate passes all required checks and a fresh source inventory. Original mobile integration evidence, rollout flags and launch requirements remain in the [integration handoff](2026-10-26-mobile-access-onboarding-integration.md).
