# NEVORA mobile launch source baseline

Date: 2026-10-18, America/Puerto_Rico.

## Isolated work

- Working branch: `codex/nevora-mobile-launch`.
- Checkout: `/Users/josek0514/.codex/worktrees/nevora-mobile-launch/Fuel Scheduler`.
- Development lineage: `b58496b84b21690f7be22474f7570da2d81af6c3`.
- Full-app source: `origin/NEVORA-UI-READINESS` at `33b6dfa0f92f47b3c8b417aba57f52108589bc69`.
- The new branch alone was fast-forwarded to the full-app source. No shared branch was merged or advanced by this work.
- The main development checkout remains at `0516b7dcbb07a10d926cc5c53f3b650343cad9bd`, with its existing `.omo/` files preserved.
- Production and the upcoming web release retain their own release path. Mobile code and schema changes must not enter that candidate automatically.

The native prototype remains in its original worktree. Before any selective import, its 174 selected source files and modified owned-runtime fixture were archived in task-owned ignored evidence and verified byte-for-byte against `native-poc-custody-2026-10-18.json`. No prototype endpoint has been enabled in production and no native feature has yet been ported on this branch.

## Execution scope

The [launch plan](../superpowers/plans/2026-10-18-nevora-ios-android-launch.md) is the roadmap. This checkpoint starts Task 1, preserving the full app and proving a baseline before changing authentication or feature transports. G0 is open until the required verification evidence exists.

The POC remains a reference implementation. Its debug-only/native-local restrictions are retained; production mobile APIs require the separate reviewed design in Task 2.

## Explicit single-company migration sequence

The production fresh-company setup list in `scripts/company-setup.ts` and the owned SQL fixture list in `src/test/integration/local-postgres.ts` match: 33 migrations, in this order:

1. `0001_initial.sql`
2. `0002_schedule_health.sql`
3. `0003_schedule_assistance.sql`
4. `0004_assistance_layer.sql`
5. `0005_time_clock.sql`
6. `0006_scheduling_rule_inputs.sql`
7. `0007_portal_web_push.sql`
8. `0008_workspace_positions.sql`
9. `0009_schedule_generation.sql`
10. `0010_shift_coverage_automation.sql`
11. `0011_clocker_devices.sql`
12. `0012_clocker_pins.sql`
13. `0013_clocker_punches.sql`
14. `0014_clocker_breaks.sql`
15. `0015_clocker_schedule_context.sql`
16. `0016_time_corrections.sql`
17. `0017_missing_time_supersession.sql`
18. `0018_timecards.sql`
19. `0019_payroll_export_mappings.sql`
20. `0020_account_recovery.sql`
21. `0021_timecard_reassignment_interlock.sql`
22. `0022_timecard_reopen_revision_authority.sql`
23. `0023_employee_attention_receipts.sql`
24. `0024_contextual_communications.sql`
25. `0025_calendar_subscriptions.sql`
26. `0023_template_ownership.sql`
27. `0024_schedule_copy_receipts.sql`
28. `0025_company_policies.sql`
29. `0026_attendance_observations.sql`
30. `0027_payroll_period_custody.sql`
31. `0028_configurable_payroll.sql`
32. `0029_payroll_private_notices.sql`
33. `0030_notification_source_kinds.sql`

`0026_tenant_ownership_expand.sql` and `0027_tenant_ownership_validate.sql` are not in that single-company sequence. SaaS remains paused. Their presence in the repository is not permission to activate them. Duplicate numeric prefixes must not be resolved by renumbering or blindly applying every SQL file in lexical order.

Matching manifests are source evidence only. Fresh-install/upgrade, hosted schema identity, migration authorization, backup and rollback verification remain separate requirements. No hosted database was migrated by this checkpoint.

## Verification record

Current results are recorded in `baseline-checks-2026-10-18.md` when commands finish. Logs and the recoverable POC archive live under the ignored plan workspace `.superpowers/sdd/2026-10-18-nevora-ios-android-launch/`.

The source-bound build runner correctly refused to run while the new documentation files were untracked. This documentation checkpoint is committed first so the runner can identify an exact clean source. Its custody checks are preserved.

## Release boundaries

- `vercel.json` retains `git.deploymentEnabled: false`.
- No production credentials, customer data, real notifications or external delivery tests are used.
- Native app identifiers/signing and store accounts remain unverified.
- No promotion to `development` or `main` is authorized by creating/pushing the mobile branch.
- When the web release freezes or ships, record its exact SHA and reconcile it into the mobile lane through normal reviewed integration.
