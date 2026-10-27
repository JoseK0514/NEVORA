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

All two initial failed gate causes are corrected and verified locally. Matching hosted CI on the latest pushed PR head and a fresh live source inventory remain authoritative for merge readiness; this implementation handoff does not substitute local results for hosted acceptance. Original mobile integration evidence, rollout flags and launch requirements remain in the [integration handoff](2026-10-26-mobile-access-onboarding-integration.md).


Local Owner advisor verification at6d311226 passed both engines,28 checks,0 errors in102.44s; real Owner workflows and Employee/Manager denials remain asserted.

Whole Phase D was reproduced locally at6d311226:137 checks passed before WebKit explicit-source-recovery hit its unchanged15s deadline. Source/private-data retirement and both held-destination controls had passed. The test intentionally holds a Reports navigation, then attempts an explicit source refresh; Playwright's implicit click navigation wait can wait for that held destination, preventing the very recovery action that should discard it. The installed pinned Playwright implementation confirms click defaults to waitAfter unless noWaitAfter is true. Confine noWaitAfter to those two clicks in the deliberate held-route control; retain actionability, the incoming RSC wait, original deadline, destination terminal event and exact source-URL/private-state assertions. Stage is now included in that control's report. This does not change the application navigation, authentication, permissions or frozen design. Final full-run evidence is still required.


## Completed local regression pass and final hosted gate

At `6810969066e8d32ab63ed0f2854edcf74f3b6d1f`, whole Phase D passed207 checks across Chromium/WebKit with0 errors and sourceClean/runtimeClosed true. Both explicit-source-recovery controls completed within their unchanged deadline, both actual role-redirect controls passed, and all privacy/authentication/permission checks were retained. The Owner advisor run at6d311226 passed28 checks across both engines with0 errors. Inventory regressions11/11 and navigation/deadline/observer guards50/50 pass; scoped lint and typecheck pass. All33 frozen integration runtime hashes still match the original evidence.

Only source inventory/handoff, owned browser fixtures/drivers and the held-navigation test control changed in this follow-up. No application UI, authentication/permission implementation, database migration, workflow gate, branch ceiling, production environment or rollout flag changed. Original failure logs/artifacts remain external and referenced by SHA256 in [readiness verification](../evidence/mobile-access-onboarding-20261026/readiness-verification.json).

The obsolete initial run40434162558 retained its actual failures and artifacts and was cancelled to release its remaining queued work once a replacement full run existed. Cancellation is not reported as a pass. The final exact-head hosted workflow must pass every mandatory job, including the aggregate evidence gates. The latest [PR35 checks](https://github.com/JoseK0514/NEVORA/pull/35/checks) determine that state; no merge or production release occurs in this task.


An additional exact-head mobile smoke on807f completed all18 business-flow checks but retained one WebKit development framework stack-frame fetch diagnostic during its Manager→Employee switch. Strict errors were not filtered. The switch driver now signs the Manager out using the actual mobile Profile button before the normal Employee sign-in, and requires the ID draft to clear at that second logout too; it no longer changes accounts by opening public sign-in while holding another account session. Actual server login/logout and all permission assertions remain authoritative. The rerun and final hosted candidate must still pass; no application code changed.
