# Phase 4 acceptance and Phase 5 source reconciliation

**4 October 2026 • Product-design approval and accepted development base recorded**

## Approval record

Jose's exact message: **“phase 4 approved”**.

Accepted commit: `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`. Exact parent: `b4c1675a6b1de1db6e28cbe732a7294ddfc13885`. Branch: `codex/nevora-phase-4-auto-scheduler`. Accepted checkout: `/Users/josek0514/.codex/worktrees/nevora-phase-4-auto-scheduler/Fuel-Scheduler-`.

This resolves the final-parent gate in v2. It does not approve an unseen Phase 5 implementation plan or authorize deployment, customer migration, provider activation or paid work. The previous Phase 5 product-design approval remains in force; it need not be requested again.

## What was independently inspected for this revision

Read-only Git checks at 15:55:50 and 15:58:30 UTC−04:00 confirmed the exact HEAD, parent and clean status. The committed tree is `f778febca308e05a722df5f453e34450c257d140`. The migration chain ends with committed `0009_schedule_generation.sql`; `0010_shift_coverage_automation.sql` is the new plan's migration candidate, not an applied migration.

`APPROVED_BASE_SOURCE.json` records 27 exact-commit source hashes. Eighteen of the nineteen files from the earlier planning sample match; the one changed file is `docs/architecture/nevora-auto-scheduler.md`, which gained final-review notes. The old source sample remains unchanged in `SOURCE_HASHES.json` as historical evidence. Additional source reading covered the shared validator and mapper, fairness, transaction guards, sessions, database adapter, notification policy/readers, settings routes and related signatures/consumers.

This is targeted read-only planning reconciliation, not a new whole-branch code review or rerun of Phase 4 tests. Reported 1,188 unit tests, 144 generation SQL tests and browser results remain the final Phase 4 handoff's evidence. No such product tests were executed in this packet revision.

## Integration decisions established from that source

| Accepted source | Verified observation | Effect in the new plan |
|---|---|---|
| `src/lib/data/schedule-generation-snapshot.ts` | Both generation readers authorize Owner/Manager; strict writer rejects attempted published targets. | Extract shared facts only. Never broaden those entry-point permissions or impersonate a Manager for an employee trade. |
| `src/lib/data/generation-guards.ts` | Complete raw scheduling source; workspace-first, sorted-week, parent-before-child table guards; bounded retries/timeouts. | Use compatible source/locks; extend for new records and prove both writer orders. Do not assume the raw source contains sessions. |
| `src/lib/scheduling/validate-shift.ts` | Target/max/daily-count rules exist; rest, daily/per-shift-hour, break and projected-overtime contracts are not implemented there. | R15–R17 require explicit tested shared extensions. Missing facts are not compliance. |
| `src/lib/scheduling/generation/fairness.ts` | `compareEmployeeFairness` handles confirmation, positive-target ratios and rotating ties. | Reuse it. Do not copy the older name-based ranking or call the whole planner per claim. |
| `src/lib/auth/session.ts` | `getSession` returns employee data; it does not expose a final-write session proof. | Add a server-only proof tied to the actual session and revalidate it after waits. |
| `src/lib/data/exchanges.ts` and `callouts.ts` | Existing manager-pending paths, human-controlled assignment promotion and approved-callout release persist. | Preserve them while adding consented automation, durable request history and assignment-episode matching. |
| `src/lib/data/request-notifications.ts` and `notification-state.ts` | Status-based event identity; OPEN exchange events are not generally deliverable as employee invitations. | Thread revisions through all readers; explicitly implement current-eligibility invitation checks. A new template alone is insufficient. |
| `src/lib/notifications/policy.ts` | Existing urgent lead is 12 hours; collection is 5 minutes; routine quiet hours are 21:00–07:00, workspace-bound. | Reuse existing notification policy rather than invent an urgency threshold. These are application constants, not legal rest/notice settings. |
| `src/lib/db.ts` | Default runtime uses Neon HTTP. | Real Next + disposable PostgreSQL tests need an explicit owned transport harness; record that boundary without claiming live Neon verification. |
| `src/app/app/schedule/settings/*` | Current scheduling settings are Manager/Owner accessible. | Add a narrowly scoped Owner-only policy action; retain existing manager staffing/target permissions. |

The committed architecture contains historical “review/commit pending” text from earlier handoffs. Current Git identity, the final Phase 4 report supplied by Jose and Jose's approval supersede those old status comments. This packet does not edit the accepted document to hide that history.

## Read-model checklist for assignment episodes

The source scan found release-sensitive logic in `src/lib/data/schedules.ts`, `notification-transactions.ts`, `publication-revisions.ts`, `schedule-generation-snapshot.ts`, `hour-fairness.ts`, `exchanges.ts`, `callouts.ts` and `notification-state.ts`. Portal and schedule views consume their release flags. T03 must update all relevant current-episode projections and preserve historical publication snapshots; changing only the exchange mutation is insufficient.

An original employee can return to a shift after another owner. New ownership must not revive that employee's old approved release. This is a refined fixture within the already approved repeated-callout/history scenarios, not a new product feature.

## Remaining boundaries

The exact Phase 5 implementation plan in `08_IMPLEMENTATION_PLAN.md` is ready for review but is not approved by the Phase 4 acceptance. Customer numeric policies, applicability and live activation remain unselected/unverified. No Phase 5 branch was created, no code written on the Mac, no Codex task sent, and no active test/preview/database process was changed for this packet.


## Final plan-review correction

A final source-level writer scan before plan approval found one subtle release-history risk in the draft plan: `assignment_episode_id` alone was insufficient for a same-owner material shift edit, because the accepted `updateShift` path can change date/time/position while preserving the employee and the historical approved-callout projection. The corrected plan binds active callout release to the current owner/episode **and** the reviewed material assignment terms, while preserving the old callout as history. It also explicitly includes the direct generated-shift writer and treats exchange/callout participation as one slot-reservation invariant.

This is a technical integrity correction, not a new product feature or customer policy. It is covered by the existing repeated-callout, stale-source, history and race scenarios; the scenario count remains 98.
