# T01 fix-round-1 scoped re-review

## Verdicts

**Spec compliance: PASS for the requested corrections.** Both Important findings and the Minor assertion finding are addressed. The corrections match T01's current-session final-write and durable original-terms requirements.

**Task quality: PASS — ready to continue to the next planned task.** No new Critical, Important, or Minor issue was established in the fix-only diff. This is a correction review, not a new acceptance claim for later Phase 5 integrations or production behavior.

## Original findings

1. **Important 1 — ADDRESSED.** `src/lib/data/shift-change-policy.ts:7` accepts the mutation's lock statements, places them before the final database account/Owner/specific-session check at line 14, and `saveOperationalRuleProfile` supplies its settings-row `FOR UPDATE` at line 69. The existing workspace/account/session locks remain present; session expiry uses `clock_timestamp()` after the settings wait. `src/test/integration/shift-change-policy.integration.ts:48` locks the actual target settings row, verifies the writer is waiting on that SELECT at line 59, verifies database-clock expiry before releasing it at lines 64–67, then requires invalid authorization and an unchanged entire profile (including revision) at lines 70–71. The RED evidence reaches the outcome assertion with the old behavior `saved, revision: 2`; the GREEN evidence passes the corrected case.

2. **Important 2 — ADDRESSED.** `db/migrations/0010_shift_coverage_automation.sql:145` now joins the target's own schedule and adds `locationId`, `weekStart`, and `consentStatus: UNKNOWN` to the immutable target snapshot. It retains the existing target shift facts and preserves a null target for coverage requests. `src/test/integration/shift-change-upgrade.integration.ts:18` upgrades a historical-9 legacy SWAP with different source/target locations and weeks, deletes both live schedules, verifies no live shifts/schedules remain at lines 29–30, and asserts each snapshot's respective owner/date/time/location/week/unknown-consent facts at lines 31–34. The RED evidence specifically shows the three missing target fields; the GREEN evidence passes. The existing history table has no live-source foreign keys and retains its append-only trigger (`db/migrations/0010_shift_coverage_automation.sql:119`, `:157`); this fix does not weaken either property.

3. **Minor — ADDRESSED.** `src/test/integration/shift-change-schema.integration.ts:39` and `:40` now require both PostgreSQL `code: '23505'` and `constraint: 'shift_change_participation_pkey'` for exchange cross-role and callout participation collisions. An unrelated SQL exception no longer satisfies these assertions. The GREEN SQL artifact covers both stronger assertions.

## Evidence inspected

Reviewed the full fix-only diff at `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/checkpoints/task1-fix1/review.diff`, the task brief, original review, final fix section of the task report, and the changed files with their relevant surrounding code/tests. All five changed files match the checkpoint SHA-256 manifest. Checkpoint base and current HEAD are `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`; current branch is `codex/nevora-phase-5-shift-coverage`. The implementation remains uncommitted.

Inspected these exact implementation-run artifacts under `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/task1/`:

- `review1-red.log`: 2 failed / 10 passed, with actual assertion failures for expired-session profile acceptance and missing legacy target snapshot context. The report records exit 1; this is behavioral RED evidence, not a loader failure.
- `review1-sql-green.log`: 3 files / 12 tests passed. The report records exit 0.
- `review1-unit-green.log`: 3 files / 20 tests passed. The report records exit 0.
- `review1-typecheck.log`: the `tsc --noEmit` command header and no diagnostics. The report records exit 0.
- `review1-eslint.log`: empty, with no warnings/errors. The report records exit 0.

These are inspected run artifacts; I did not rerun any suite, typecheck, lint, migration, or database fixture. No specific unresolved doubt required a focused extra test. The report's `git diff --check` exit 0 is reported evidence, not a reviewer-run check.

## Review boundary and state

- New breakage in the supplied fix-only diff: none found.
- Declined to judge: later-task assignment/callout release integration, form/result authorization, browser/outbox/worker behavior, and full old SQL-suite compatibility, because they are outside this correction diff. The original review's integration limitations remain unchanged and are not silently closed by these verdicts.
- Read the applicable engineering working agreements, package scripts/configuration, Superpowers reviewer template, and personal data-integrity guidance. No external service was contacted and no customer data was used.
- Only this requested re-review report was written. No source, index, HEAD, commit, push, merge, deployment, or production/provider state was changed.
- No additional T01 correction is requested by this re-review. The controller can preserve the recovery checkpoint and continue the approved task sequence; final commit and later integration verification remain controller-owned.
