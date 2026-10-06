# Spec Compliance

- ❌ Issues found: T04 manager escalation can consume its lifecycle stage while losing the only deliverable manager notification. The semantic attention budget and revision validator are incompatible in `src/lib/notifications/recipients.ts:53`, `src/lib/data/shift-change-maintenance.ts:132`, and `src/lib/notifications/reminders.ts:191`. See Important I1.
- ✅ The additional approved 5.3/R02 correction is implemented within scope: `src/lib/data/shift-changes.ts:79` closes active ordinary source/target participation in the same command batch, `:82` preserves original participants/terms, and `:48–51` independently checks both live location contexts. Actual SQL cases at `src/test/integration/shift-change-notifications.integration.ts:309`, `:349`, and `:388` cover all three participation forms, rollback, cross-location restriction, and both report/acceptance winner orders. No completed-winner reversal is introduced in this diff.
- ⚠️ Cannot verify from this task diff: T05 actual exchange-page rendering, authenticated invitation-open journeys, mobile/keyboard/focus/states and visual widths; T06 full authenticated app/Neon transport integration, production-scale performance and final whole-branch gate. These remain downstream requirements, not waivers of I1. No activation, customer database access, provider delivery or production verification was performed.

# Strengths

- `src/lib/shift-changes/maintenance.ts:39` separates effective projection from writes; recorded/current completion bounds expire requests independently of submission cutoff or a running worker. `src/lib/data/exchanges.ts:179` applies this to reads, while `src/app/api/internal/notifications/reminders/route.ts:15` reserves new business maintenance for authenticated POST.
- `src/lib/data/shift-change-maintenance.ts:127` records truthful NULL system actor provenance. The transaction at `:156` combines existing source guards, two elapsed-time deadline checks, lifecycle mutation/history and outbox writes; it contains no provider handoff. The three-attempt bound (`:108`) and last-completed cursor (`:174`) support resumable work.
- `src/lib/data/shift-change-maintenance.ts:73–77` reuses the assignment evaluator for current eligible audiences without synthesizing an employee/session identity. `src/lib/data/notification-state.ts:120` refreshes OPEN eligibility, and `src/lib/notifications/worker.ts:173` repeats intent/source validation after subscription IO. The actual SQL/fake-provider cases at `src/test/integration/shift-change-notifications.integration.ts:254` assert claimed work, zero sends after cancellation, and accepted transport without claiming assignment completion.
- `src/lib/data/request-notifications.ts:11` emits revision versions for shift changes while retaining time-off status versions. `src/lib/data/notification-state.ts:79` explicitly gates legacy status readers to revision one; `src/lib/data/notifications.ts:163` cancels older versions and leased deliveries. The invitation same-state exception still requires current audience/terms/deadline validation (`src/lib/data/notification-state.ts:220–221`).
- `src/lib/data/shift-changes.ts:158` limits publication EVENT suppression to recipients of EVENT statements in the assembled command; `src/lib/data/notification-transactions.ts:356` leaves internal publication records and non-EVENT intents intact. The SQL coalescing case at `src/test/integration/shift-change-notifications.integration.ts:50` checks visible count and retained publication/revision-shift records.
- `src/test/integration/shift-change-notifications.integration.ts:210` and `:232` use real lock waits for policy tightening and natural expiry; `:372` checks bounded continuation and durable invitation counts. Reoffers retain original linked history and semantic invitation budgets (`src/lib/data/shift-changes.ts:110`, `src/lib/data/shift-change-maintenance.ts:141`).

# Issues

## Critical (Must Fix)

- None found in the reviewed task scope.

## Important (Should Fix)

**I1 — Escalation invalidates a semantic manager seed without replacing it.** `src/lib/notifications/recipients.ts:53` gives every same-need/same-urgency manager seed the same event key, irrespective of request revision. An employee creating OPEN coverage inside the twelve-hour urgent window emits an `r:1` URGENT seed. The first maintenance tick records ESCALATED and increments the request to `r:2` (`src/lib/data/shift-change-maintenance.ts:126–132`), then attempts another seed with the identical key (`:135–144`). The notification upsert only updates its own existing event key, preserving the old `source_version` and `effective_version` (`src/lib/data/notifications.ts:150–152`). Immediately afterward, the reminder collector rejects and cancels the `r:1` seed because current source is `r:2` (`src/lib/notifications/reminders.ts:191–192`). The urgent stage is now consumed and later ticks do not rebuild it. Previously materialized summaries can likewise lose the member because the source reader requires exact revision (`src/lib/data/notification-state.ts:109`). A committed escalation therefore has no usable request-specific manager notification; this is a T04 lifecycle defect, not a T05 display task.

Preserve the semantic budget while reconciling unconsumed seeds/queued summary members to current same-need revisions, or give source validation an equally strict semantic-currentness rule with a distinct durable consumed-stage budget. Merely adding revision to the event key would reopen the repeated-campaign problem. Add focused actual SQL/worker regressions for creation inside urgency followed by maintenance/collection, and for a queued summary crossing same-state escalation; verify one current manager outcome and no repeat campaign.

Reviewer reproduction: `review-summary-budget.ts` in this evidence directory executes actual `buildNotificationIntents`, `notificationIntentStatements`, and `runReminders` with a minimal in-memory repository. It confirms identical URGENT keys for r:1/r:2, the existing SQL upsert retaining the earlier version, and the actual collector returning `cancelled: 1` with zero summary insertions. This focused reproduction uses no database or provider; it supplements concrete source evidence and does not claim an additional SQL run. Command: `node_modules/.bin/tsx /Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/task4/review-summary-budget.ts`; actual exit 0; output in `review-summary-budget.log`.

## Minor (Nice to Have)

- None raised. Deferred T03 R3 complete-history/operation source footprint is unchanged in ownership and remains final-triage work, not a new T04 finding.

# Evidence and review boundaries

- Read the supplied 1,768-line frozen diff in sequential portions; recovered two tool-output-truncated portions. Used the task brief, actual handoff and the implementer's external `nevora-phase5/task-4-report.md` (the initially supplied scratch-relative report location was absent). No checkout, index or HEAD mutations; no suite reruns, child agents, migration or activation.
- Independently compared all 24 files against `task4/source-freeze.json`: 24 checked, zero hash mismatches. This reviews the frozen task3-fix1-to-task4 candidate, not the unrelated dirty primary development checkout. No commit created; one final local implementation commit remains reserved for the controller.
- Inspected final recorded evidence: `sql-finalfreeze.log:9–15` reports 29 SQL tests and PROCESS_EXIT=0; `focus-freeze.log:5–11` reports 137 tests and PROCESS_EXIT=0; `typecheck-finalfreeze.log:6` and `lint-finalfreeze.log:6` report PROCESS_EXIT=0. No warnings/errors appeared in those final logs.
- Broader existing evidence (not rerun): `unit-final.log` 1,302 tests, `sql-final.log` 96 tests, `notifications-all1.log` 77 tests, `generation-final.log` 144 tests, all recorded PROCESS_EXIT=0. Their earlier source scopes remain as disclosed in the implementer report; these are not represented as fresh full-suite results after the last changes.
- Named outside-diff check **manager-seed freshness across semantic deduplication**: inspected the unchanged reminder collector/grouping in `src/lib/notifications/reminders.ts`, then ran only the focused external reproduction above. Named outside-diff check **bounded waits**: checked existing `src/lib/data/generation-guards.ts:63–64` for local lock/statement timeouts. Read changed-function context omitted by diff hunks only where needed to assess the upsert, recipient filtering, source validation and summary membership. These checks did not broaden into a codebase audit.

# Assessment

**Task quality: Needs fixes.**

The expiry, invitation revalidation, transactional callout correction and recorded SQL race evidence are strong. The manager-summary revision/budget incompatibility blocks T04 approval because a normal first escalation can leave no deliverable manager attention despite a committed stage; fix I1 and provide focused SQL/worker evidence before proceeding through this task gate.
