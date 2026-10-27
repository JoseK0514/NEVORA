# PR35 development readiness

Owner: Jose / NEVORA engineering. Target: `development`. Scope: resolve source inventory and CI for [PR35](https://github.com/JoseK0514/NEVORA/pull/35), preserving the frozen mobile design and existing server authentication/permissions. No merge, production deployment or rollout flag change is authorized here.

## Source inventory

The fetched development checkpoint is `46e202786863279302026ee03a0e225c359fa55c`. The six-head limit and gate implementation remain unchanged. The actual PR35 assembly branch is recorded using the existing own-branch ancestry contract. PR27/33/34 remain held separately; their application changes are excluded.

Three remote tips already included in development were verified against their merged PRs, preserved as exact lightweight recovery tags, independently reread, then retired with atomic deletion-only expected-old-SHA leases. No retained branch history, local branches, worktrees or files were rewritten/deleted.

| Retired branch | Preserved tip | Recovery tag |
|---|---|---|
| Claude-UI-Fix / PR31 | 8e9073974b52053e557382ec5199dbce9d5aa32c | archive/branches/2026-10-26/Claude-UI-Fix |
| claude/quiet-check-skeleton / PR32 | 16a9169ce1fc0d6eee9f3e1319d3db825ab1236f | archive/branches/2026-10-26/claude/quiet-check-skeleton |
| codex/owner-ai-release-testing-20261023 / PR29 | 2ea580d623c76dd7d717492d209552461b5b4a28 | archive/branches/2026-10-26/codex/owner-ai-release-testing-20261023 |

The gate passes with 60 classified sources and six active branches: main, development, PR27, PR33, PR34 and PR35. All 11 inventory regressions pass. Rollback: recreate an absent branch from its archive with a normal non-forced creation; never overwrite a subsequently recreated/advanced branch.

## CI corrections

Owner advisor: the owned fixture changed Main Office evidence after selecting the first ranked issue, which could instead be West Office after the Main Office coverage window expired. The briefing scenario now seeds all-day fictional coverage after independent coverage tests and selects the unique Main Office row. Actual issue tracking, evidence changes, SQL and role-denial assertions remain. Local 28-check/two-engine verification passed; the subsequent hosted run also passed this step.

Stalled source recovery: discarding the application navigation intent did not cancel Next's pending navigation. `router.refresh()` queued behind the deliberately stalled destination. After a fresh authority response, explicit recovery now uses Next's priority navigation to the captured accepted source URL. The existing fresh-render fallback and all server-clock/authority/private-content fences remain. Ordinary recovery still refreshes normally; offline recovery remains masked. There is no document reload or new auth/permission decision.

The browser regression holds every parallel destination RSC/prefetch before source entry, uses explicit waits for the two deliberately stalled clicks, requires recovery in the same document within the original 15-second deadline, then releases all destination requests and waits for their terminal events. Late responses must leave the exact source URL and authorized source content intact. No mandatory assertion, deadline or workflow gate was weakened.

Mobile harness: account switching uses real Profile sign-out before the next role signs in and requires the ID draft to clear. Actual window exceptions and rejections are independently observed. A narrow existing WebKit framework diagnostic projection applies only during an observed document navigation to the owned development stack-frame endpoint; unmatched page errors and every real window exception fail. Real throw/rejection negative controls run in every engine, including a forged native-looking error.

## Evidence and acceptance

- Priority-navigation source checkpoint `4330c34cec5769e93a8480c1bb511277a1cf5a8b`: 207 complete Chromium/WebKit Phase D checks, zero errors, sourceClean/runtimeClosed true.
- Mobile driver checkpoint `24ba6122dfb8c2c7224896228a3d87d49a27bbf8`: all 18 flow checks across Chromium/WebKit/Firefox pass in 97.65 seconds; zero real window exceptions/unmatched page errors. One WebKit native owned-development stack-frame diagnostic is retained separately. Its strict projection and real negative controls remain required.
- Recovery unit regression: RED 10 pass / 1 fail, then 69 focused tests pass. Inventory/deadline/diagnostic guard regressions: 65 pass. Scoped lint and typecheck pass. Full default suite/build acceptance comes from the final hosted candidate; earlier runs are historical.


Final source verification and exact candidate references are recorded in [readiness verification](../evidence/mobile-access-onboarding-20261026/readiness-verification.json). The original integration record remains [here](2026-10-26-mobile-access-onboarding-integration.md), including rollout/rollback and remaining launch requirements. All 33 frozen runtime hashes remain unchanged. The only additional production source correction is `scoped-read-frame.tsx`; server auth/session/role guards, API contracts, proof lengths, schemas and rollout defaults are unchanged.

Initial and superseded CI failures remain recorded; cancelled runs are never counted as passes. Historical local passes are not acceptance for later application changes. The rejected hard-document-reload experiment is removed: WebKit could cancel its pending flight before pagehide and start a competing destination document. The final same-document priority navigation must pass current browser tests and every mandatory hosted job on the final PR candidate. GitHub checks use its generated merge SHA; the PR head and merge candidate must both be recorded.

The latest [PR35 checks](https://github.com/JoseK0514/NEVORA/pull/35/checks), plus a fresh live source inventory, are authoritative for merge readiness. Mark ready only after all required jobs and aggregate evidence gates pass. This task does not merge or deploy.

Engineering/security position: retain source custody, server authority and permission enforcement. Program/release position: validate the complete development candidate, leave both rollout flags off, and retain physical-device, support ownership/legal/mail readiness and any required independent launch sign-off as separate rollout gates. No policy exception or Jose approval beyond this task is inferred.
