**I1 — Escalation invalidates a semantic manager seed without replacing it — ADDRESSED.** `src/lib/notifications/reminders.ts:191–194` now accepts a prior numeric revision only when `isCurrentCoverageAttentionSeed` proves the same OPEN request, semantic need and original routine/urgent campaign. `src/lib/data/notification-state.ts:251–265` defines that proof using exact event key, request ID, positive numeric revisions and non-future revision ordering. It preserves the existing semantic event key instead of creating another campaign at r:2.

## Finding evidence

- **Seed collection survives r:1 → r:2:** `src/lib/notifications/reminders.ts:191–194` admits the matching semantic seed, carries its urgency, and retains active manager role, destination, nonempty current items and persisted expiry checks. The semantic need comes from the unchanged stored shift/assignment episode/material revision in `src/lib/data/shift-change-maintenance.ts:84–91`; current source/terms/publication and effective closure are still validated by `src/lib/data/notification-state.ts:63–76`.
- **New queued members survive same-need revision changes:** `src/lib/data/notification-state.ts:77–79` accepts only the exact current `coverage-need:normal:<need>` or `coverage-need:high:<need>` reference while the effective request remains OPEN. Changed owner/material/publication fails the existing source checks before this exception; projected expiry or terminal states cannot satisfy OPEN.
- **Pre-fix queued members retain strict compatibility:** `src/lib/data/notification-state.ts:113–118` requires the member's own materialized, uncancelled SUMMARY seed with exact environment, employee ID, source request ID and source version. Its event key must independently prove the current semantic need and original urgency stage. Another manager/environment/request/version or cancelled seed cannot supply this proof. The enclosing check still requires the summary recipient to match the active manager, valid destination and unexpired persisted group (`:127–145`, `:193–245`); effective expiry removes the current OPEN item before group delivery.
- **Routine and urgent campaign budgets remain separate:** `src/lib/data/notification-state.ts:251–255` includes the seed urgency in the semantic member reference. `src/lib/notifications/reminders.ts:36`, `:100–113` and `:124` use that same reference for group identity, consumed-member queries and transactional seed consumption. Existing account/day locks and overlap conflict/rebuild continue to fence duplicate collectors. `src/lib/notifications/reminders.test.ts:223–234` proves same-stage revision consumption is stable and the other urgency stage has a distinct budget.
- **Human command authority remains strict:** the supplied candidate-to-fix1 diff modifies only notification state, reminder grouping and their tests; it does not change command revisions, consent or session guards. Context inspected at `src/lib/data/shift-changes.ts:86`, `:115`, `:145–161` retains exact expectedRevision handling and current session proof/locked session validation. Notification semantic identity grants no command permission.

## New Breakage in the Fix Diff

**None found.** No new Critical, Important or Minor issue was identified in the four-file fix scope.

## Out-of-Scope Observations

**No new observation.** Original T03 R3 whole-source footprint and T05/T06 browser/app/transport/scale boundaries remain outside this fix. Their controller resolution is still required; this scoped approval does not independently verify those requirements.

## Evidence checks actually performed

- Read the task brief, original I1 review, final fix-round appendix, applicable `/Users/josek0514/.codex/AGENTS.md`, Superpowers subagent-driven-development skill and `re-review-prompt.md`.
- Reviewed the supplied `checkpoints/task4-fix1/review.diff`, recovering the tool-truncated tail, then read only changed-function dependencies necessary to assess current need, recipient checks and preserved command authority. No fresh whole-branch review.
- Independently hashed all four final changed files against both `task4/fix1-source-freeze.json` and `checkpoints/task4-fix1/manifest.json`: four checked, zero mismatches. `changed-files.json` names exactly those four files. Checkpoint `base.txt` records `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`; no git command or checkout/index/HEAD mutation was performed.
- Inspected `task4/fix1-red.log`: two concrete candidate failures, missing summary and cancelled/unreadable queued summary, numeric PROCESS_EXIT=1. Inspected `fix1-worker.log`: three focused SQL scenarios passing, numeric PROCESS_EXIT=0.
- Inspected final `task4/fix1-final-sql.log`: 32 SQL tests passing, PROCESS_EXIT=0. Source at `src/test/integration/shift-change-notifications.integration.ts:427–493` exercises collection after escalation, new queued members before escalation, pre-fix r:1 queued members, repeated/concurrent collection, repeated maintenance, one seed/summary, real SQL materialization/claim, exactly one in-memory provider acceptance, and changed-material rejection. The fake sender is explicit; no real provider/device evidence is inferred.
- Inspected final `task4/fix1-final-unit.log`: four files / 109 tests passing, PROCESS_EXIT=0; final typecheck and lint logs each record PROCESS_EXIT=0. The report names the covering unit command. These are recorded implementer runs, not reviewer reruns.
- Inspected `task4/fix1-notifications.log`: 77 tests passing, PROCESS_EXIT=0, with its earlier source scope preserved as disclosed. It is not represented as a final-source full-suite rerun.
- No specific unresolved concrete doubt required a new reproduction; no test suite was rerun. No child agents, customer calls, activation, database changes, commit, deployment or external delivery were performed by this review. Only this external report was written.

## Verdict

**Fix round 1: All findings addressed, no new Critical/Important breakage.** Open findings in this scoped fix: none.

**Spec verdict: ✅ I1 lifecycle/semantic-budget gap closed within the approved T04 contract.** T05/T06 CannotVerify boundaries remain with the controller.

**Task quality: Approved for this bounded fix.** Four-file frozen source and recorded regression evidence support the conclusion; no production, device delivery or downstream UI verification is claimed.
