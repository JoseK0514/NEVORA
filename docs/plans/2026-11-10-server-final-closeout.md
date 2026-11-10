# Remaining server closeout implementation plan

> For agentic workers: use the parallel-agent skill for the independent domains below; root integrates/reviews and runs combined gates. Execution is already authorized by Jose: “get those left done asap”.

**Goal:** finish remaining non-native server/copy and QA work from the Nov10 handoff without weakening controls or changing Claude-owned UI.
**Base:** fresh origin/development b2c24cbe92f08c54c9e6e7ea2810f141c7e4947d.
**Spec:** CODEX-HANDOFF at held4d3a0be63, existing docs/handoffs/2026-11-10-ui-review-backend-contract.md, exact wording in docs/handoffs/2026-11-10-backend-review-decisions.md, and Jose's new instruction. Jose explicitly chose Employee ID + PIN for per-person lockout in this turn.

## Global constraints
- Detached worktrees only; preserve other chats/worktrees. No main/production, native, real sends, paid plans/model calls or cloud credentials/grants. Normal development delivery after current source inventory.
- Claude owns UI field/layout/consumer integration. Supply callable server contracts; no visual redesign.
- Old approved pay statements retain V1/V2 bytes, hashes and versions. New Spanish statements alone use Monto/Montos through V3. All calculation/legal meaning remains.
- Exact Spanish slogan: Un trabajo más brillante por delante. Legal recovery label: Forgot password?; existing /forgot-access destination and authorization unchanged. Preserve historic policy evidence/versions where applicable.
- Employee ID + PIN must bind the supplied employee to the verified PIN. Preserve anonymous legacy security behavior during UI rollout; never let legacy verification bypass a new person lockout. Keep workspace20 failures/5min, workspace240 attempts/min and device60 attempts/min as existing global backstops. Proposed identified-mode person5 failures/5min, device20/5min; the latter remains bounded by unchanged workspace20. Confirm against current tenancy/principal contracts before implementation.
- Retain every failed gate/attempt. No error filters/assertion weakening, skipped engines, timeout inflation or security exceptions to claim green. No independent finding self-closure.

## Review focus
1. Old sealed V1/V2 statements still render identical bytes in English/Spanish; new V3 source/version cannot rewrite approved history.
2. Wrong employee identifier/PIN pair and legacy fallback cannot bypass per-person current locks or tenant/device/PIN authority.
3. Parallel attempt/session replacement, resets near different window boundaries, unknown IDs and revocation fail closed with actual remaining delay.
4. Browser runtime root cause is evidenced by bounded request/console/lifecycle observations and a meaningful negative control; real errors remain fatal.
5. Full onboarding backup/restore uses matching PG17 utilities and real isolated fixtures; no production targets, source drift or tool-only green claim.

## Task1: versioned statement and exact copy (copy worktree)
- [ ] Read current renderer/producer/history tests and legal version registry; preserve baseline V1/V2 bytes before editing.
- [ ] Add failing V3/new-statement and old-history regressions; implement V3/default future preparation with exact Monto/Montos text and all old versions supported.
- [ ] Add Spanish slogan export, legal navigation-label update respecting historic evidence; tests only where behavioral/version preservation is meaningful.
- [ ] Focused tests/lint; commit owned paths; report source/checks and consumer contract. No root manifest or PIN changes.

## Task2: WebKit QA and mounted identity regression (QA worktree)
- [ ] Reproduce twice-recorded WebKit /__nextjs_original-stack-frames rejection using locked tools/ci-browser-runtime and isolated PG17.
- [ ] Gather request/lifecycle/console/stack evidence; find cause; write regression/negative control before the smallest source-owned correction. Preserve runtime failure detection.
- [ ] Add the deferred mounted employee A/B pending/history-reference transition regression using existing real component/owned test patterns, without appUI changes.
- [ ] Run focused browser checks; preserve all failures/closed runtime receipts; commit/report. Request an exclusive heavy-test slot from root before browser/SQL.

## Task3: identified-person PIN protection (PIN worktree)
- [ ] Read existing limiter, transport, tenancy typed-scope resolver, restore/retention and SQL migration contracts; choose canonical employee ID normalization and safe bounded unknown-ID behavior.
- [ ] Write regressions for A wrong5 then B succeeds, A locked across devices, mismatched ID/PIN, anonymous fallback cannot bypass locks, unchanged global/rate ceilings, exact Retry-After, concurrent latest attempt and revocation.
- [ ] Implement explicit employeeId verification input and current scoped per-person protection, backwards-compatible legacy API and scope-bearing retry response. Any new persisted scope needs forward migration/tenancy/manifest support, never edits to shipped migration bytes.
- [ ] Supply countdown/field rollout contract for Claude; no UI layout change. Run focused units and owned SQL in reserved slot; commit/report.

## Root integration and QA
- [ ] Resolve local PG17 backup-client tooling from official verified source or existing matching runtime; no downgraded server or skipped restore test.
- [ ] Finish scanner-versus-manual-reminder shared daily-budget SQL race regression and NV033 fixture/data disposition with actual source evidence.
- [ ] Cherry-pick independent commits serially, resolve only owned integration conflicts, regenerate canonical onboarding manifest if schema changed.
- [ ] Fresh review of combined change; focused owned SQL/browser gates, full default suite, typecheck/lint/build, inventory/manifest and complete onboarding acceptance with isolated data.
- [ ] Fresh source inventory, normal development delivery, inspect exact-source CI, update Jira and handoff with remaining Claude/hosted gates. Never call all25 closed from unaccepted UI/source claims.
