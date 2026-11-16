# NEVORA backend — Phase 2 financial contracts

November 16, 2026 (America/Puerto_Rico). **Phase 2 complete as a reviewed local financial-backend/interface package.** Claude presentation, joined acceptance and hosted/provider qualification remain open. No Phase 3, assembly, publication or deployment was started.

## Starting gate and ownership

Baseline: `edce7661c211aba588f29bd6d56327fabdc11b47`, obtained from Phase 1's actual `docs/handoffs/2026-11-16-backend-phase1-baseline.md` in `/Users/josek0514/.codex/worktrees/nevora-backend-phase1-20261116`. Phase 1 identifies that source as its completed combined baseline. This separate managed worktree starts at that exact SHA: `/Users/josek0514/.codex/worktrees/nevora-backend-phase2-20261116/Fuel Scheduler`.

Before implementation, checked the Phase 1 worktree (only its new baseline/evidence documents), the existing readiness integration worktree (clean at the baseline), and the active product-assessment worktree (only its own plan/outputs). None modifies these financial implementation paths. The current chat inventory identifies the payroll and billing delivery chats as idle. Phase 1 explicitly owns source/evidence, not new financial implementation. Other owners' work and uncommitted files are preserved. No inter-chat message was sent.

Exact permitted Phase 2 ownership, recorded before source/test edits:

- `src/lib/payroll-export/command.ts` (new pure command contract; compatible service re-export)
- `src/lib/payroll-export/batches.ts` (new byte-aware planner and receipt coverage)
- `src/lib/payroll-export/batches.test.ts`
- `src/lib/payroll-export/errors.ts`
- `src/lib/payroll-export/model.ts`
- `src/lib/payroll-export/model.test.ts`
- `src/lib/payroll-export/service.ts`
- `src/lib/payroll-export/service.test.ts`
- `src/app/api/payroll-export/route.test.ts`
- `src/test/integration/clocker-payroll-export.integration.ts`
- `src/lib/payroll/phase2-contract-fixtures.test.ts` (new)
- `docs/handoffs/2026-11-16-backend-phase2-finance.md` (this handoff)
- `docs/handoffs/2026-11-16-backend-phase2-claude-contract.md` (new)
- `docs/handoffs/2026-11-16-backend-phase2-finance-fixtures.json` (new)
- `docs/handoffs/2026-11-16-backend-phase2-evidence/verification.json` (new)
- `docs/handoffs/2026-11-16-backend-phase2-evidence/review.md` (new)

No presentation, scheduler, shared authentication/session, source-inventory, migration/registry, Phase 1 documentation or deployment ownership. No schema change is planned; any discovered shared dependency will be recorded here for its existing owner.

## Bounded implementation and evidence plan

Preserve the already delivered paid-break review, exact cents, all-roster population, immutable receipts, server authority and billing transitions. Reproduce remaining defects before repair. Add practical employee batching measured on exact encoded request bodies, with explicit incomplete coverage and the existing authoritative period-close manifest. Separate deterministic pre-write mapping/finalization refusal from uncertain post-write recovery. Verify both existing import formats/corrections and billing with fictional fixtures and owned disposable PostgreSQL. Supply Claude complete contracts and synthetic fixtures. No provider calls, messages, charges, hosted tests, publication or Phase 3.

Engineering: smallest financial-module changes. Security: existing current Company/role/session guards stay authoritative. Technical assurance: a batch receipt cannot establish whole-period completion. Delivery: return reviewed local commits to the existing integrator. Governance: no exception or activation requested; Development remains the acceptance line, and main/production requires Jose's separate approval.

## Delivered change versus existing behavior

Reviewed source/interface commit: **`69da1c5dcee0a5e4af7dac4dc32cf2ba45424137`**, tree `6624327e39b7bc70fbacbe336ef4a6d3914c6595`. This handoff/evidence successor changes documentation only. The exact final delivery HEAD is available with `git rev-parse HEAD` in this managed worktree and in the accompanying Git bundle; it does not replace the integration owner's source.

1. Added `NEVORA_PAID_EXPORT_BATCHES_V1`: a client-safe pure planner for the existing export endpoint. It measures complete serialized UTF-8 bodies, preserves the 65,536-byte/100-card/1,000-treatment bounds, keeps one employee and all their recorded-break decisions together, retains the whole reviewed population, and freezes original operation IDs/bodies. Verified progress distinguishes pending receipts from `READY_FOR_MANIFEST` and always reports `periodComplete:false`. Existing server manifest checks remain the only whole-period custody gate. No new endpoint/table or global limit.
2. Moved the existing command parser unchanged into client-safe `command.ts`, retaining service re-exports and historic server normalization/hashes. Stored batch wire order is locale independent. Single-employee overflow is explicitly refused; zero/excluded people are retained and no partial work is labeled complete.
3. Reproduced and fixed two error-contract defects: missing provider employee mapping and unfinalized selected cards were generic unavailable/unknown responses. They now produce bounded `PROVIDER_EMPLOYEE_MAPPING_REQUIRED` / `FINALIZED_TIMECARDS_REQUIRED` review refusals before writes. Original message assertions remain supported without reflecting employee names.
4. Review exposed a concurrent-retry seam: another identical call could commit and reopen after the first empty receipt lookup. Added the failing real-SQL interleaving and guarded original-receipt recheck before reporting a later pre-write source/profile refusal. The original verified operation is recovered under current Company authority. Write/result verification remains outside that pre-write catch; unknown post-write outcomes remain uncertain.
5. Added executable fictional CSV/JSON/correction, profile, paid receipt, recovery, batching and billing fixtures, plus the complete [Claude contract](2026-11-16-backend-phase2-claude-contract.md). Existing decimal conversion, import population/correction/immutable-document protections and billing transitions were verified and preserved; they were not rebuilt. Billing production code and prices/policies are unchanged.

Actual changed paths are the 13 paths in source commit `69da1c5` plus this phase's two evidence files, enumerated exactly in [verification.json](2026-11-16-backend-phase2-evidence/verification.json). `model.test.ts` was reserved above but did not need an edit. No other owned/reserved file was silently changed.

## Verification actually executed

Inspected package/build/runner configuration before execution. Dependencies installed offline with `npm ci --ignore-scripts --offline`. Each SQL command used a freshly initialized owned loopback PostgreSQL cluster with fictional data, explicitly removed inherited database URLs and stopped/removed its cluster. The commerce suite used the real SDK with its existing fictional transport, never a hosted Stripe request. Full commands, logs, file hashes, earlier failures and limits are in [verification.json](2026-11-16-backend-phase2-evidence/verification.json).

| Check | Actual result |
| --- | --- |
| Final focused finance units (payroll, exports, API, company billing, commerce) | **1,269 passed**, 143 existing integration-gated skips; 77 passed / 8 skipped files. No new skip or weakened assertion |
| Paid-export PostgreSQL suite | **21 passed**, including exact break identity, prior receipts, original operation after reopen, stale source/profile, same-body concurrency, append-only receipts and the new interleaving regression |
| Existing configurable payroll SQL lifecycle | **43 passed**: both CSV and JSON, exact cents, full population/inactive people, review/approval/correction, immutable PDFs, lost response, grants, stale facts and worker failures |
| Company period/export SQL/API | **35 passed**: current/foreign/revoked authority, scope changes, immutable artifacts, receipt replays and manifest custody |
| Commerce lifecycle / controlled signed-event and durable-operation fixtures | **247 passed** across 19 files: original trial, 0/15/16/30/31 limits, payment-qualified upgrades, renewal/cancellation/grace, signatures/replays/order, company isolation and unknown-outcome custody |
| Request sizes directly below/at/above export cap | **65,535 / 65,536 accepted; 65,537 refused**, with actual UTF-8 streaming and a deliberately false Content-Length |
| Realistic recorded-time batching | **30 paid people, 600 recorded breaks, all 33 roster members retained**; batches **62,030 / 62,030 / 31,112 bytes**, covering **12 / 12 / 6 people** |
| TypeScript, changed-source ESLint, diff whitespace | **PASS** |
| Production-format build, existing source-custody wrapper | **PASS** at clean exact `69da1c5`; receipt verifies exit 0 and unchanged source. This is a build, not a deployed service |
| Separate code reviewer | **APPROVE / CLEAR**, no open findings at `69da1c5`; independently 177 units, selected retry-race and 30-person SQL scenarios, and en-US→sv-SE persisted-plan recovery |

Counts describe their executed suites, not a unique-test total or whole-release CI certification. Default unit integration skips are explicit; local SQL/commerce runners supply the separate financial evidence. The extra measurement run selected one SQL test and deselected 20; it does not replace the 21-test complete export run. Independent review is code/contract review, not independent QA/UI release certification.

The 30-person test simulates a successful commit followed by a lost reply, leaves that batch pending, refuses partial manifests, recovers the exact original, rejects changed-body retries, checks concurrent repeats produce one effect, verifies all 30 paid rows/33 roster dispositions and exact paid/unpaid totals, then invalidates current manifest custody after changed source facts while original receipt bytes remain replayable. It does not submit a file to a provider.

Independent review's three initial findings and all dispositions are retained in [review.md](2026-11-16-backend-phase2-evidence/review.md). The red race/locale/limit tests, initial fixture/config mistakes and corrected results remain in external logs. Raw logs and the clean-source build receipt are preserved under `/Users/josek0514/.codex/visualizations/2026/11/16/01a1e526-7aae-7160-8f95-2cd1ac201811/phase2-finance-evidence/`; checksums are recorded. The initial broad red tests and review counterexamples retain their runner logs. One preliminary message-assertion log was reused by its green rerun; its captured transcript extract is explicitly identified in verification.json. No failure was represented as a pass and no assertion was weakened.

## Existing Jira evidence mapping

Read the connected Jira site on November 16; **no Jira task, comment or status was created/changed** by Phase 2. This mapping returns evidence to the existing owners rather than duplicating completed backend tasks.

| Existing record / observed status | Phase 2 evidence and retained ownership |
| --- | --- |
| [SCRUM-194](https://thevelani-team.atlassian.net/browse/SCRUM-194), Done | Existing CSV/paid-export backend delivery preserved; this package adds bounded batching, refusal/recovery regressions and executable contracts. Do not recreate completed implementation |
| [SCRUM-42](https://thevelani-team.atlassian.net/browse/SCRUM-42), Done | Existing all-roster manifest contract retained and exercised against multiple byte-bounded receipts; no history/schema rewrite |
| [SCRUM-197](https://thevelani-team.atlassian.net/browse/SCRUM-197), To Do | Claude consumes the new contract/fixtures and wires upload, matching, reviewed paid mapping, batching, correction and recovery. UI acceptance stays open |
| [SCRUM-49](https://thevelani-team.atlassian.net/browse/SCRUM-49), To Do | Actual business/provider import format verification remains with its existing provider owner; fictional CSV is not provider acceptance |
| [SCRUM-174](https://thevelani-team.atlassian.net/browse/SCRUM-174), In Progress | 247 local commerce checks preserve billing behavior; hosted signed callbacks, merchant configuration, invoicing and Tax decisions stay open |
| [SCRUM-83](https://thevelani-team.atlassian.net/browse/SCRUM-83) / [SCRUM-190](https://thevelani-team.atlassian.net/browse/SCRUM-190), In Progress | Existing integrator receives this local patch; joined acceptance/publication and production remain separate |
| [SCRUM-206](https://thevelani-team.atlassian.net/browse/SCRUM-206), In Progress | Delivered period-history behavior preserved; Phase 2 neither edits its files nor closes its independent acceptance |
| [SCRUM-51](https://thevelani-team.atlassian.net/browse/SCRUM-51), To Do | Native/statutory payroll remains held; no activation or statutory/legal claim |

## Integration, rollback and remaining gates

Return **only the local Phase 2 commits** to the existing readiness integration owner. Do not merge, push shared branches, create another candidate or deploy from this worktree. The owner should inspect `git diff edce7661..HEAD` and apply/reconcile the Phase 2 commits onto their current source, preserving the reviewed Claude UI and any newer financial changes. No source-inventory record, migration order/bootstrap artifact or Phase 1 document is part of this diff. No migration was authored or reserved because no schema change is needed.

No shared-module implementation dependency was found. The reused server period-close manifest and its v4-only receipt reference format remain intact. Important integration seams are current Company authority, immutable command/receipt hashes, whole-population source/custody and the existing central billing read contract. The consumer helper remains **unwired to presentation**, so no completed UI protection or joined upload/export journey is claimed.

Claude's next gate is the contract's upload/review/correction, per-break mapping, precision refusal, byte coverage and exact-operation recovery UI, with mobile/keyboard/error/privacy acceptance. An existing-artifact conflict under a different operation stops the plan and uses explicit authorized original-receipt/manifest reconciliation; it cannot masquerade as that plan's success. A single employee over the existing command capacity remains explicitly unsupported by automatic splitting. Saved profiles retain their 100 employee-mapping bound; do not promise a larger provider mapping merely because a neutral plan can cover a 300-person roster.

The integrator retains combined tests, source inventory, current guides/manual qualification, final-source CI and the Phase 1 recorded failures. Hosted/provider callbacks, actual payroll-provider import, billing activation, monitoring/recovery and physical device evidence remain with their existing owners. The successful local build does not waive those gates. No customer data, real messages/charges, copied credentials, new service, analytics collection or provider activation occurred.

Rollback is code-only: disable/withdraw the new consumer planner and revert the Phase 2 source patch together through the existing integrator. There is no schema/data rollback. Preserve accepted CSV source evidence, paid-time decisions, original receipt/CSV/PDF hashes, Company authority and old operation replays. Never erase receipts, enable legacy break-inclusive RUN hours as paid time, reset unknown billing operations or change employees as a rollback shortcut. Rollback/restore of an operating deployment remains the release owner's separate qualified procedure.

Engineering: **GO for local financial contract handoff**. Security: current authorization, append-only history and exact replay retained; controlled SQL evidence obtained. Technical assurance: receipt coverage and whole-period acceptance remain distinct, with review findings fixed and retested. Delivery: **Phase 2 complete; stop here**. Governance: **GO WITH CONDITIONS for integration**, **no operating-release certification**; no exception, new budget or Jose decision is required for this bounded delivery. Development remains the operating/acceptance line at production standards; any main/production promotion still needs Jose's explicit approval.
