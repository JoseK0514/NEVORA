# Single-company six findings implementation

Jose authorized these changes on October 12, 2026 with SaaS paused. This delivery supports one configurable company per database. It does not authorize a production deployment or close the independent board's findings.

## Source and ownership

- Implementation branch: `codex/single-company-six-findings-20261012`.
- Development baseline: `b58496b84b21690f7be22474f7570da2d81af6c3`.
- Isolated checkout: `/Users/josek0514/Documents/Codex/2026-10-12/coo/work/single-company-six-findings`.
- Single-company setup integration source: `191fbc38e68d70c2dfe0809dffbdb63eb962b1b7`, from the separate `codex/single-company-20261012` branch.
- Committed integrated code candidate: `e4c33e6eceaba590453781eafda2769ce08cd92e`. Its implementation and setup predecessors are `71759a8` and `6734b3e`.
- The primary checkout, separate setup checkout, central Phase F candidate and original independent report remain preserved.
- Root Codex owns final integration and verification. The previous implementation worker has finished; root is the sole active writer.

## Changed behavior

1. Reconcile the selected business improvements onto the shared development baseline. The large central SaaS candidate is not adopted wholesale. Existing scheduling, notification, authentication and timecard contracts remain the source of truth.
2. Bind templates and children to the current workspace; enforce current management session authority for reads, creates and archive operations. Archived and active empty templates remain distinguishable. Parent, location and position relationships are checked in PostgreSQL.
3. Persist the original copy command and source, then atomically commit row outcomes with schedule/history/publication/outbox changes. Exact retries retrieve the original receipt even after later source deletion. Payload conflicts, concurrent attempts, crash rollback, source drift and final session expiry are guarded. An unavailable template now receives a durable terminal receipt. Browser recovery retains the original operation across reloads.
4. Review all roster members for a payroll period, including inactive and zero-time members; require disposition reasons and employment attestations without treating account creation as a hire date. Manifests reconcile original export batches exactly once and preserve canonical JSON/CSV contents and hashes. New handoffs reject stale roster/timecard/export/profile custody; original artifacts and exact handoff retries remain available. Manual reported submission/import is explicitly unverified. Browser period commands persist across lost responses and reloads.
5. Provide current Owner-only, immutable company/location policy revisions with field validation, inheritance and history. No business thresholds are seeded. Manager attendance uses captured published schedule context, recorded punches and effective intervals on distinct configured bases. Missing policies and unverifiable sources are explicit; source/policy changes between reads reject observation persistence. Finance projection remains unavailable to managers.
6. Run the required suites and browser scenarios against the integrated source; preserve real failures and exact source manifests. Local engineering verification is separate from independent certification.

## Current verification

Evidence directory: `.omo/evidence/six-findings/` (ignored, local only).

- Expanded native PostgreSQL suite: 15 passed, zero skipped (`final-native.log`). This includes populated captured lateness/effective elapsed reads, policy/source drift, missing schedule association, immutable ledger mutation/truncation rejection, payroll reconciliation, stale mapping/handoff rejection and copy concurrency/rollback.
- Foundation: 275 passed; generation: 176 passed; Clocker/attendance/timecards/payroll: 515 passed; notifications/outbox: 77 passed. All final full SQL suite results have zero failures/skips.
- Final committed-source default unit suite: 2,171 passed, zero failures/skips (`final-unit.log`, 207 files, exit 0).
- Typecheck, lint and production build: exit 0. Dependency inspection reports all declared versions installed.
- Six-findings browser QA: 10 checks passed, no page errors; desktop/375px, keyboard, Owner policy validation/save/history, Manager denial, durable copy recovery, lost population/handoff response recovery and actual attachment retrieval.
- Generic company setup: 11 CLI/database/browser checks passed, including atomic rollback/concurrent setup, generic identity/timezones, all new migrations, hashed Owner login, wrong-password rejection and policy save under the new workspace at 390px/1440px.
- Both browser manifests match all 655 copied source files in the integrated code candidate; no byte mismatches. Only the owned scratch database transport is substituted.
- Earlier failures are retained: restricted loopback test execution, obsolete full migration-catalog list, incorrect QA Attendance route/ambiguous selector, and a generation timeout during concurrent suites. Final reruns preserve existing assertions and timeouts.
- Delivery evidence: `/Users/josek0514/Documents/Codex/2026-10-12/coo/outputs/six-findings-verification`.

## Decisions and controls

Product/program scope is a generic single-company deployment with SaaS deferred. CTO delivery uses the existing development services and migrations; CISO/governance controls retain server authorization, original audit artifacts, fail-closed source checks and owned fictional test data. Independent QA/UI report directly to Jose; operating executives cannot self-close their findings.

All database and browser verification uses newly created, ownership-marked loopback databases and fictional users. No production credentials, customer data, real bookings, SMS/email or payroll-provider submissions are used. The runtime substitutes only the owned scratch database transport and records hashes of the source files.

## Remaining gate

Local implementation is complete. Original independent findings remain open pending independent re-review; this operating team cannot close them. Actual company payroll submission/import and processed-payroll status remain unverified. No hosted database transport, production privileges or physical device verification is claimed, and nothing was pushed or deployed.

For a company release, select and verify the real payroll handoff and obtain the independent/production gates. Preserve original manifests and ledgers during rollout or rollback. Use a backup of the selected database and pause writes before any application rollback; migration rollback must not delete immutable audit/custody records. No production migration or rollback was performed.

## Reproduction

Use the checked-in package commands for unit, lint, typecheck, build, foundation, generation, notifications and Clocker integration. Native suites require a NEW loopback database name with the suite's disposable prefix, `FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes`, and an unset `DATABASE_URL`; the adapter refuses existing/remote databases and removes only its ownership-marked database.

The existing owned-cluster runner can execute `vitest.six-findings.config.mts` with `NEVORA_TEST_PG_BIN` pointing to an installed local PostgreSQL runtime. `test:company:integration` additionally requires an external `NEVORA_COMPANY_EVIDENCE_DIR` and the existing `NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE`. The browser recovery script is `scripts/six-findings-ui-qa.mjs` and uses the same owned database safeguards. Run the expensive scheduling-generation suite without competing QA workloads; do not raise its timeout or weaken assertions.
