# NEVORA Release 1 — production inventory and clean-database rehearsal

Date: November 1, 2026 (AST, UTC−04). Operator/owner: Codex, reporting to Jose and Claude.
Branch: `codex/release1-db-rehearsal-20261101` (Jose explicitly requested an own branch for this task).

**Recommendation: B — create a separate clean production Neon project in `aws-us-east-1`; retain the old project. Phase 1 and the Phase 2 migration rehearsal are complete. Phase 3 is NOT authorized or started.** Jose confirmed in this conversation: “Everything is mockup this app has not been release to real prod yet.” The three existing account records are therefore mockup/setup records, not real employee data. No employee, credential, session, punch, payroll, schedule or fixture rows need to carry over.

The existing production database received SELECTs in explicitly READ ONLY transactions only. No production migrations, DML, grants, role/settings changes, Vercel environment changes, production deployment, notification dispatch, or real-user test occurred. No database, project, branch, table or runtime directory was deleted. The old database has **not** been technically converted to read-only; doing that now would change production and could affect its existing binding.

## 1. Release and environment custody

- Explicitly fetched `claude-codex-collab-nevora` before reading [Claude’s release handoff](2026-10-30-claude-to-codex-release-1-ready.md), then fetched `development` for this report branch. Report branch base: `f4739751ec1ff5ce566b271df951470c078e1130`. This is a documentation/evidence branch, **not a deployment source**.
- Frozen candidate read from the top of Claude’s fetched handoff at rehearsal start: **`83397510a83d82420a3b6526c787f43a3092a839`**. A separate clean detached worktree at exactly that SHA supplied every migration and application read. No development migration SQL was used. The subsequent handoff fetch still named the same candidate; `git diff --quiet <frozen> origin/claude-codex-collab-nevora -- . ':(exclude)docs'` passed.
- Authority: `db/migrations/order.ts` **at that SHA**: 47 BASE files, then 3 FINAL files. The 50 filenames and SHA-256 hashes are in [manifest.json](release1-db-rehearsal-20261101/manifest.json). Held tenancy files and development `0044`/`0045` are excluded. No filename sorting.
- Production: Neon project `rough-fire-63258908` / `main` / branch ID `br-green-night-b87vx3ud` / database **`fuel_scheduler`**, owner role name `fuel_scheduler_owner`, `aws-us-east-1`, PostgreSQL 17.11. The database is not named `neondb`; an initial read attempt using that default returned 404 and no SQL ran. Listing databases resolved the name before inventory.
- New **non-production** rehearsal: project **`frosty-frog-31490398`**, name `nevora-release1-rehearsal-20261101-83397510`; branch `rehearsal`, ID **`br-falling-morning-b8lkw1f9`**; database `nevora_release1_rehearsal`; role name `rehearsal_owner`; `aws-us-east-1`, PostgreSQL 17.11. New empty project, not a clone of either production or Preview. Compute min/max 0.25 CU, auto-suspend 300 seconds, retained after testing.
- Fictional Preview project `young-boat-84629568` was never queried, cloned, connected, or used as a source. Rehearsal setup was newly generated and remained confined to the new rehearsal and the owned local database.
- Connections were referred to by environment/project/database name. The rehearsal credential was obtained through the Neon connector, passed through a terminal with echo disabled, and held in process memory. It was not placed in a command, report, `.env`, source file or Vercel setting. Production credentials were never retrieved or copied.

## 2. Phase 1 — read-only inventory

Inventory began at `2026-11-01T19:53:39.371Z` (15:53:39 AST). The count query used `REPEATABLE READ READ ONLY` and a 20-second statement timeout. Every non-system base table was enumerated, then counted with its available creation/update columns. Full machine-readable counts and relation sizes: [production-inventory.json](release1-db-rehearsal-20261101/production-inventory.json).

**Plain finding:** all existing data is mockup/setup, as Jose confirmed. The catalog has no time-clock, Clocker-punch or payroll tables, no workspace table, and no `schedule_pending_edits`; all schedule, shift, publication, availability, request and notification tables are empty. The non-empty tables hold 3 active accounts (2 OWNER, 1 MANAGER), 2 credential rows, 5 historical sessions, 5 eligibility links, 2 locations and 2 staffing settings. No names, phone numbers, emails, password hashes, session hashes or credential values were exported.

| Table (`public`) | Rows | Newest created (UTC) | Newest updated (UTC) |
|---|---:|---|---|
| availability_exceptions | 0 | — | — |
| availability_windows | 0 | — | — |
| employee_credentials | 2 | — | 2026-09-30T19:24:32.965Z |
| employee_location_eligibility | 5 | — | — |
| employee_scheduling_settings | 0 | — | — |
| employee_sessions | 5 | 2026-09-30T19:24:41.330Z | — |
| employees | 3 | 2026-09-30T19:16:20.165Z | 2026-09-30T19:16:20.165Z |
| location_coverage_windows | 0 | — | — |
| location_staffing_settings | 2 | — | 2026-09-28T00:44:31.273Z |
| locations | 2 | 2026-09-27T23:47:07.741Z | 2026-09-28T00:19:20.820Z |
| notifications | 0 | — | — |
| schedule_acknowledgements | 0 | — | — |
| schedule_publication_revision_shifts | 0 | — | — |
| schedule_publication_revisions | 0 | — | — |
| schedule_template_shifts | 0 | — | — |
| schedule_templates | 0 | — | — |
| schedule_week_settings | 0 | — | — |
| schedules | 0 | — | — |
| shift_callouts | 0 | — | — |
| shift_exchanges | 0 | — | — |
| shifts | 0 | — | — |
| time_off_requests | 0 | — | — |
| weekly_availability_submissions | 0 | — | — |
| weekly_availability_windows | 0 | — | — |

`—` means no row timestamp, or that the table has no corresponding creation/update column. For credentials, the update column is `password_updated_at`. Business dates and expiry/read timestamps were not mislabeled as creation/update times. All times below are UTC.

## 3. Recommendation and carryover decision

| Option | Advantages | Risks / irreversible boundary | Downtime and carryover |
|---|---|---|---|
| A: upgrade in place | Keeps the existing connection and account/location identifiers | Must reconcile the no-ledger 0001–0004 baseline by actual catalog objects, then apply 46 remaining full filenames; never run fresh setup there. Preserves unwanted mockup accounts/passwords/sessions unless a separately reviewed removal plan is approved. Historical migration 0008 seeds `workspace-fuel` / Fuel Coffee Drive and maps old location keys; metadata must be approved before it runs. 0032 captures the active Manager census and irreversibly grants legacy company scope at COMMIT. Ordinary index builds and access-adoption locks block writes. | Requires a maintenance window with writers/tablets/workers paused, plus restore and reconciliation readiness. Timing on empty rehearsal tables is not a production lock budget. Only deliberately approved company/location configuration and a fresh Owner should survive; no test users or credentials should be carried forward. |
| **B: separate clean project (recommended)** | Leaves old data/schema intact; excludes mockups; allows verification before any app binding changes; separate project settings and credentials | New identity/configuration/bootstrap must be approved; new connection must be proven at Phase 10. No copying the rehearsal, the Preview, or their seed rows into production. 0032 remains irreversible after COMMIT in the new project too. | No current-service downtime to build it. Later cutover is a short controlled configuration/deployment window; no zero-downtime guarantee is claimed. No business-data migration is needed because Jose confirmed all data is mockup. |

For B, carry **no rows**. Supply approved company name, business time zone, location names/short names/public Clocker keys and a newly bootstrapped real Owner through the existing protected setup path. Do not reuse mock passwords, sessions, invitations, device enrollments, fixtures, or the rehearsal Owner. Review live environment key names separately; their values have not been inspected or approved here. Encryption/signing keys must not be copied from Preview. Existing production key treatment belongs in the cutover plan, without disclosing values.

**0032 specifically:** `0032_company_access_invitations.sql` locks `workspaces` and `employees` in SHARE ROW EXCLUSIVE mode, captures every active Manager at that instant, grants those Managers COMPANY scope through `LEGACY_ADOPTION`, and creates immutable adoption/scope/event records. On SQL failure before COMMIT, roll back and stop; after COMMIT there is no inverse SQL. Recovery requires a verified restore/replacement target, with any post-commit legitimate writes reconciled. Do not try to erase adoption history. For a fresh database, company/location and the real Owner must exist **before** FINAL_MIGRATIONS. Additional Managers require an approved census/scope decision before this boundary.

The present production tables are small (each at most 64 KiB in the recorded inventory); its future index targets/publications have no operational rows and `time_entries` is not yet installed. This removes the current large-data concern, but does not prove lock availability under future traffic. Keep `0038_read_path_indexes` a separate bounded step; remeasure before an in-place run.

## 4. Phase 2 — performed, retained, verified

Execution: `2026-11-01T19:59:21.666Z`–`19:59:41.304Z` (15:59 AST), on the exact frozen SHA above.

1. Proved the hosted application schema was empty before writing. Started a new invocation-owned, loopback-only PostgreSQL 17.10 cluster locally. Neither reused any application database.
2. Applied the exact declared 50-file chain to each. Session bounds: `lock_timeout=5s`, `statement_timeout=60s`, `idle_in_transaction_session_timeout=90s`; stop and rollback on the first error; no automatic migration retry.
3. Kept the existing outer transaction for each of 45 files, delaying only its final COMMIT to include its ledger receipt atomically. Added explicit BEGIN/COMMIT wrappers for the five transactionless files: `0019_payroll_export_mappings`, `0033_management_alert_preferences`, `0038_read_path_indexes`, `0038_clocker_pin_operation_reference`, `0039_clocker_review_requests`. No nested BEGIN. The original migration files were unmodified; hashes cover their full original bytes.
4. After BASE and before FINAL, replaced only the historical seeds created on this newly proven empty target with new rehearsal-only company/location/Owner data, following the insert order in frozen `scripts/company-setup.ts`. A generated, undisclosed password was hashed with the real password helper. This data/configuration is **not** a production input. A synthetic Owner exists for protected reads; there are no real users.
5. Created `release_operations.migration_ledger`: ordinal, full filename, full file SHA-256, frozen SHA, operator, explicit-wrapper flag, execution milliseconds, applied timestamp. Each successful file and receipt committed together. Compared all 50 names/hashes/ordinals against the source manifest, on both targets.
6. Compared application catalogs: **2,518 objects, schema diff = 0**, identical SHA-256 **`d593eb3cb5559bb0e1a22277b983841e1885db477d73245d641203db9f941dee`**. Scope: public relations, columns/types/defaults/collations, constraints and validation/deferrability, full indexes and validity/readiness, functions, user triggers, views, sequences, enums, domains and policies. Provider-specific roles, ownership/ACLs, system schemas, OIDs, physical storage and sequence counter values are excluded; this is an application schema comparison, not a provider-role audit. The operator-ledger schema was compared separately by the protected smoke script.
7. Verified ENFORCED adoption, zero invalid/not-ready public indexes, installed held-edit table, zero time entries and zero payroll runs. Absence of development/held migrations is established by the exact source manifest plus the full catalog equality, rather than prefix guesses.
8. Six real source application reads passed locally and through the **actual hosted Neon HTTP transport**: workspace, employees, locations, Clocker-key lookup, absent-key lookup and positions. The local pass used a READ ONLY transaction. Supplementary protected payroll and Clocker reads and page checks are recorded in their own receipts below.
9. Stopped the owned local runtime and retained its data directory; retained the hosted project/branch. No workers, reminders, push/email providers, device enrollments, or real account actions were run. No schema/content teardown or database deletion.

Timing: hosted file SQL execution total **5,325 ms**, sum including ledger/commit **13,825 ms**; local file SQL **138 ms**, including ledger/commit **155 ms**. Hosted 0032: **137 ms** SQL / **320 ms** including receipt and commit. Hosted separate 0038 index step: **161 ms** / **322 ms**. These are an empty/synthetic-data baseline, not a traffic or large-table performance promise. Setup, connection, comparison and smoke time are outside the sums. Per-file timings follow.

| # | Exact filename | Hosted SQL / with commit (ms) | Local SQL / with commit (ms) |
|---:|---|---:|---:|
| 1 | `0001_initial.sql` | 150 / 337 | 10 / 11 |
| 2 | `0002_schedule_health.sql` | 89 / 247 | 2 / 3 |
| 3 | `0003_schedule_assistance.sql` | 115 / 269 | 5 / 5 |
| 4 | `0004_assistance_layer.sql` | 112 / 294 | 3 / 5 |
| 5 | `0005_time_clock.sql` | 89 / 266 | 3 / 3 |
| 6 | `0006_scheduling_rule_inputs.sql` | 77 / 247 | 1 / 1 |
| 7 | `0007_portal_web_push.sql` | 90 / 246 | 4 / 5 |
| 8 | `0008_workspace_positions.sql` | 97 / 279 | 3 / 4 |
| 9 | `0009_schedule_generation.sql` | 84 / 240 | 3 / 3 |
| 10 | `0010_shift_coverage_automation.sql` | 115 / 278 | 8 / 9 |
| 11 | `0011_clocker_devices.sql` | 86 / 231 | 3 / 3 |
| 12 | `0012_clocker_pins.sql` | 100 / 306 | 4 / 4 |
| 13 | `0013_clocker_punches.sql` | 87 / 248 | 3 / 3 |
| 14 | `0014_clocker_breaks.sql` | 99 / 247 | 2 / 3 |
| 15 | `0015_clocker_schedule_context.sql` | 92 / 257 | 1 / 1 |
| 16 | `0016_time_corrections.sql` | 135 / 310 | 7 / 8 |
| 17 | `0017_missing_time_supersession.sql` | 95 / 285 | 1 / 2 |
| 18 | `0018_timecards.sql` | 92 / 271 | 2 / 3 |
| 19 | `0019_payroll_export_mappings.sql` | 193 / 366 | 2 / 2 |
| 20 | `0020_account_recovery.sql` | 95 / 311 | 2 / 2 |
| 21 | `0021_timecard_reassignment_interlock.sql` | 89 / 248 | 0 / 0 |
| 22 | `0022_timecard_reopen_revision_authority.sql` | 79 / 233 | 0 / 0 |
| 23 | `0023_employee_attention_receipts.sql` | 87 / 242 | 1 / 2 |
| 24 | `0024_contextual_communications.sql` | 130 / 315 | 7 / 7 |
| 25 | `0025_calendar_subscriptions.sql` | 109 / 279 | 5 / 5 |
| 26 | `0023_template_ownership.sql` | 89 / 243 | 2 / 3 |
| 27 | `0024_schedule_copy_receipts.sql` | 90 / 286 | 2 / 2 |
| 28 | `0025_company_policies.sql` | 86 / 269 | 1 / 1 |
| 29 | `0026_attendance_observations.sql` | 89 / 275 | 1 / 1 |
| 30 | `0027_payroll_period_custody.sql` | 87 / 248 | 2 / 2 |
| 31 | `0028_configurable_payroll.sql` | 126 / 316 | 6 / 7 |
| 32 | `0029_payroll_private_notices.sql` | 87 / 237 | 1 / 1 |
| 33 | `0030_notification_source_kinds.sql` | 91 / 246 | 0 / 0 |
| 34 | `0031_workspace_presentation.sql` | 98 / 272 | 2 / 2 |
| 35 | `0032_workspace_words_modules.sql` | 89 / 235 | 0 / 0 |
| 36 | `0033_management_alert_preferences.sql` | 171 / 335 | 1 / 1 |
| 37 | `0034_account_deletion_requests.sql` | 84 / 253 | 1 / 1 |
| 38 | `0035_passkeys.sql` | 128 / 286 | 4 / 4 |
| 39 | `0036_owner_advisor.sql` | 105 / 285 | 2 / 2 |
| 40 | `0037_owner_briefing_reviews.sql` | 94 / 247 | 1 / 2 |
| 41 | `0038_read_path_indexes.sql` | 161 / 322 | 2 / 2 |
| 42 | `0039_native_payroll_setup_records.sql` | 83 / 243 | 1 / 2 |
| 43 | `0038_clocker_pin_operation_reference.sql` | 160 / 344 | 1 / 1 |
| 44 | `0039_clocker_review_requests.sql` | 187 / 376 | 1 / 1 |
| 45 | `0040_clocker_photo_policy_evidence.sql` | 121 / 309 | 7 / 7 |
| 46 | `0041_clocker_photo_platform_cleanup.sql` | 105 / 286 | 1 / 1 |
| 47 | `0043_schedule_pending_edits.sql` | 88 / 238 | 1 / 1 |
| 48 | `0031_native_payroll.sql` | 105 / 263 | 5 / 5 |
| 49 | `0032_company_access_invitations.sql` | 137 / 320 | 9 / 10 |
| 50 | `0042_company_invitation_lifetime.sql` | 78 / 239 | 2 / 2 |

### Evidence and limits

- [results.json](release1-db-rehearsal-20261101/results.json): 100 committed migration steps, exact schema match, original 12 application reads, target versions and retained local runtime path.
- [hosted-ledger.json](release1-db-rehearsal-20261101/hosted-ledger.json), [local-ledger.json](release1-db-rehearsal-20261101/local-ledger.json): the actual database ledgers, not planned entries.
- [hosted-schema.json](release1-db-rehearsal-20261101/hosted-schema.json), [local-schema.json](release1-db-rehearsal-20261101/local-schema.json), [schema-catalog.sql](release1-db-rehearsal-20261101/schema-catalog.sql): reproducible comparison scope and actual definitions.
- [run-rehearsal.mts](release1-db-rehearsal-20261101/run-rehearsal.mts): the guarded non-production runner. It refuses a non-frozen source, existing application schema, wrong database/role or migration count. Its embedded synthetic setup makes it unsuitable for production; Phase 3 needs separately reviewed production inputs and operator execution.
- [protected-smoke.json](release1-db-rehearsal-20261101/protected-smoke.json): twelve additional source reads (six per target): Clocker devices, payroll capabilities/native schema, payroll settings, run history, employee statements and management statements. Uses synthetic session proof only; no worker execution. Some read helpers take database locks; the protected reads are not claimed to be READ ONLY transactions. The operator-ledger schema also matched: 14 objects, diff 0.
- [page-smoke.json](release1-db-rehearsal-20261101/page-smoke.json): actual `/login` and `/clocker/rehearsal` GETs on the frozen app’s local Next server connected to the hosted rehearsal. This is application-page/HTTP transport evidence, **not** a Vercel Production deployment, browser/device certification or an authenticated physical tablet journey.
- [hosted-final-verification.json](release1-db-rehearsal-20261101/hosted-final-verification.json): independent connector READ ONLY readback at `20:10:48Z`: 50 ledger entries, five explicit wrappers, one frozen revision, zero excluded filenames, one synthetic account, zero schedules/time entries/payroll runs. The operator schema separately matched on 14 objects. The final frozen worktree and collab non-doc diff were checked again.
- [validation.json](release1-db-rehearsal-20261101/validation.json) and [artifact-sha256.json](release1-db-rehearsal-20261101/artifact-sha256.json): frozen git-object/file/ledger checksum validation, canonical schema hash verification, inventory/read receipts, handoff-link check and evidence artifact hashes. Local Gitleaks scanned the evidence with redaction and reported no leaks; this is a scoped leak scan, not a security certification. The page harness also passed `node --check`. No full app gate/build, production test or independent certification was run for this documentation change.
- Supplementary harness startup failures are retained as `protected-smoke-attempt*.json`. Restart initially omitted the local port, a probe used `.ts` instead of `.tsx`, and importing the Next brand UI into standalone React Server Node caused `createContext` to be unavailable. The harness now starts a free explicit loopback port and checks the brand via the real Next page instead. No application assertions or source were weakened/changed. These harness failures did not roll back or replay migrations.
- The Next development server regenerated the route-types reference in `next-env.d.ts`. Its two-line diff is retained as `next-env-generated.diff.json`; that generated change was restored to the frozen bytes after the server stopped. The frozen tracked worktree is clean again; ignored build/dependency outputs and all database/evidence directories remain retained.
- No independent QA/UI finding is closed by this operator report. No PITR/backup restoration drill or 7-day retention change was performed; the Phase 2 requested clean install/schema rehearsal is not presented as a tested production restore procedure. Restore readiness remains a gate before irreversible production adoption/cutover.

## 5. Phase 3 plan — stop until Jose says “go Phase 3”

1. Record Jose’s approval of option B, company/location metadata and fresh Owner bootstrap identity. Re-fetch collab explicitly and reread the frozen SHA **immediately before any Phase 3 work**. If it changed, reconcile migration bytes/order and repeat affected rehearsal/acceptance work; this receipt does not approve a later SHA.
2. Create a new, empty production project in **`aws-us-east-1`**, distinct from both the rehearsal and Preview. Prove project/branch/endpoint/database identity and empty schema before any SQL. Do not copy the rehearsal or old mockup data. Provision only the approved compute/roles and protected bootstrap credential inputs; no plan upgrade is authorized here.
3. Configure and verify **`history_retention_seconds >= 604800`** (seven days). Current production reports **21600** (six hours); its existing organization is `launch_v3`. Neon’s [history-window documentation](https://neon.com/docs/postgres/backup-restore/history-window) says Launch supports up to seven days without a plan upgrade, with history storage billed separately. Check the new project’s actual entitlement/setting and cost before accepting it. A seven-day *setting* on a newborn database does not create seven days of past history. Retain and test a recoverable checkpoint/restore before irreversible adoption and the eventual cutover; record the actual recoverable earliest/latest time.
4. Apply this declared chain with approved real company/location/Owner setup between BASE and FINAL, bounded transactions, exact ledger and checksum verification, schema comparison and safe reads. Treat 0032 as an explicit irreversible operator checkpoint. An error stops the run; no blind retries or editing migration files.
5. Retain the old production database **untouched**. During this phase, “read-only backup” means no operator writes; its existing app credentials/binding are not technically frozen. At the separately authorized cutover, pause all old writers and arrange read-only backup access/write fencing without deleting it. Credential/ACL or binding changes are production changes and must be included in that approved cutover procedure, rather than silently done during inventory.
6. **Do not change Vercel Production `DATABASE_URL`, promote an artifact, merge to main, or deploy.** Those remain Phase 10, after Jose’s device test and explicit deploy go. A database-ready go is not a deploy go.

**Claude action requested:** `src/lib/legal/policies.ts` currently defines `BACKUP_EXPIRY` as “Our database keeps a restore history of six hours…” (line 19 at frozen SHA). When the seven-day production setting is approved and verified, change the user-facing statement to accurately describe the seven-day restore history. Separately document how long the deliberately preserved old database/exports are retained; seven-day PITR is not the deletion deadline for those copies. Do not promise all backups expire in seven days. This report asks for the policy update; no policy text was changed here. Include it in candidate/release review; do not silently deploy a code revision after the freeze.

## 6. Production payroll and notifications — plan only

**Current gap:** there is no scheduler in `vercel.json`. `scripts/payroll-worker.ts` calls `schedulePayroll()` then `workerOnce()` exactly once and exits; `workerOnce` claims **one** job. A build/deploy will not drain jobs. Payroll PDF, Share/publish and reminders cannot be declared operational without a runner. `scripts/fuel-notification-worker.ts` is likewise a bounded invocation, not a daemon.

**Recommended Release 1 operating plan:** run an independently supervised Node 24 worker from the **same frozen SHA and lockfile**, on an approved existing compute service in the approved region. Provider, account entitlement and budget must be selected before enablement; no worker service was created here. Keep the frozen app untouched by putting the scheduler/supervision in reviewed operations configuration, not an unreviewed new app route.

Use an approved secret store and a separately reviewed least-privilege worker principal; never the migration/bootstrap owner. This frozen single-company code obtains its worker transport through `DATABASE_URL`, so prove that worker process's explicit production binding separately from the Vercel web binding. Do not assume the deferred tenant-runtime variable names are the active worker transport.

| Work | Proposed cadence | What runs / safety boundary |
|---|---|---|
| Payroll preparation, PDF and Share queue | One sequential worker invocation every 10 seconds; never overlap this loop | `npm run payroll:worker` with `NEVORA_PAYROLL_ENABLED=true`, production binding proved only at activation. `schedulePayroll` deduplicates period/revision business keys; `workerOnce` claims one available job. Continue later invocations until the queue drains; do not assume one tick completes a whole chain. |
| Push dispatch and retries | Every minute, separately bounded | `npm run notifications:worker -- dispatch`, or authenticated POST `/api/internal/notifications/dispatch`. Preserve existing durable leases, consent, expiry, suppression, provider retry and feature gates. |
| Notification reminders and shift-change maintenance | Every minute, separately bounded, consume continuation cursors when returned | `npm run notifications:worker -- reminders [cursor]`, or authenticated **POST** `/api/internal/notifications/reminders`. The HTTP **GET** path explicitly disables maintenance; Vercel’s GET-only cron is therefore not equivalent. |

Payroll approval queues PDF generation. Generated bytes/manifests and job success commit under source/workspace/lease guards; PUBLISH requires approved runs and ready PDFs/manifests. Share/publish makes approved statements available through the authenticated app; it is not evidence of email, bank payment or payroll filing. `PUBLISH` may follow PDF automatically for native runs, so business acceptance must cover this behavior. Worker source: `src/lib/payroll/worker.ts`, `schedule.ts`, `service.ts`, `access.ts`.

Existing payroll protection: SKIP LOCKED claim, 60-second renewable lease/fencing, attempts capped at five, bounded backoff and failed-job status. Existing notification worker: durable leases, 20-second budget, bounded attempts, retry policy; provider send/commit ambiguity means delivery is not exactly-once. Keep serialized invocations initially; verify overlap/lease expiry and crash recovery in isolation before enabling on production. Do not add an unbounded in-request loop or weaken authorization to drain a queue.

Operational acceptance before enablement: a new synthetic-only staging approval → PDF → Share → authorized download round trip; failed-job/retry and expired-lease recovery; non-overlapping scheduler receipt; queue-age/failed-job alert and heartbeat to Jose; private logs excluding payloads, tokens, PDF contents and people’s identifiers; pause switch and rollback ownership. Alert on failed/exhausted jobs, stale leases, and pending age over two minutes initially (proposed operational threshold, subject to service acceptance). No such delivery/worker test was run in production.

HTTP notification auth already uses **`NOTIFICATION_WORKER_SECRET`** (at least 32 characters), a constant-time Bearer check, no-store and 401 before work. If any external scheduler is later chosen, authorize secret custody and use that header; never a query-string secret. All actual push/email delivery and punch enablement still require their separate approvals. Vercel’s [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) make Hobby daily-only; do not rely on it for a minute cadence or buy an upgrade automatically. A GET cron also would not perform reminder maintenance. Keep workers paused during migration/cutover and rollback-sensitive windows; rotate/update their target binding together with the app only at the approved activation.

## 7. Free phone uptime alerts — plan only

Recommend **UptimeRobot Free**: two monitors at five-minute intervals, with DOWN/UP push to Jose’s iOS/Android UptimeRobot app. Its [Free-plan documentation](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan) allows business use and includes 50 monitors; [mobile push](https://help.uptimerobot.com/en/articles/17662644-uptimerobot-mobile-app-push-notifications) is included free. No paid SMS/call add-on is needed.

After the approved Phase 10 binding/deploy:

1. Monitor the verified Production domain’s `/login`, HTTPS, expected HTTP 200 plus an agreed stable rendered login/company marker. A generic 200 alone can conceal an unavailable-workspace message. Check the actual configured language before selecting the marker.
2. Monitor `/clocker/<approved-public-location-key>` using a real approved public Clocker location key, expected 200 and its stable location/setup marker. `/clocker` alone is not this app’s location route. Use no device credential, enrollment token, PIN, session or query string.
3. Jose signs into the free phone app, permits notifications, and attaches its mobile push contact to both monitors. Verify one controlled alert/recovery through the provider’s test mechanism after authorization; no test phone alert has been sent now.

These are public-page availability checks only. They do not prove punches, PIN authentication, payroll processing, queue progress or real device operation. Worker heartbeat/queue alarms and Jose’s physical-device test remain separate. Do not send employee data or payroll content to the uptime service. No account, monitor, production request schedule, or alert channel was configured here.

## 8. Director positions, state and next gate

- **Engineering:** recommend B. Exact frozen-schema clean installation is evidenced on hosted and owned local databases; production bootstrap and operational worker activation remain to be reviewed.
- **Security/privacy:** production access stayed read-only; no identities or secrets exported. New environment isolation is proved. No test fixtures/credentials are authorized for production. Preserve backup access and re-check region/bindings before every production operation.
- **Governance:** **GO for the completed Phase 1/2 scope; production NO-GO pending Jose’s Phase 3 approval and the stated controls.** Seven-day retention, accurate policy text, tested restore readiness and irreversible adoption checkpoint remain conditions. This does not certify or close independent findings.
- **Delivery:** Codex owns the database execution/report; Claude receives the frozen-candidate/policy/worker-gap handoff; Jose owns option approval, bootstrap decisions, device acceptance and production/deploy go. No cross-branch push to collab, no main merge, no production release.

**Next required Jose action:** approve option B and say **“go Phase 3”** when ready. Company/location details and the real Owner bootstrap must be confirmed before production setup. This remains separate from device testing and the later Phase 10 deploy go.
