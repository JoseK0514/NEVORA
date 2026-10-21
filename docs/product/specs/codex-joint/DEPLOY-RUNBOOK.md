# B7: production deployment and rollback

Status: repository-specific runbook, **not authorization to deploy or migrate**. Owner: Jose; application/migration execution by the explicitly authorized operator. Freeze a final merged SHA, record exact CI/hosted/independent evidence and obtain Jose’s production approval. Local rehearsal and cloud fictional tests do not close hosted Neon, independent QA/UI or physical-device gates.

## What this repository actually deploys

- `README.md` identifies `main` as the production branch and one company per database. `DATABASE_URL` is the existing single-workspace Neon HTTP runtime. Phase F tenant runtime/provisioning remains deferred.
- **`vercel.json` sets `git.deploymentEnabled:false`. A GitHub push does not enable automatic Vercel Git deployment.** `.github/workflows/ci.yml` validates source/build/tests; it has no deployment or migration job. There is no automatic migration in `npm run build` or `npm start`.
- Build is `npm ci` then `npm run build` (Next 16.3.8, Node 24.19.0); conventional self-hosted start is `npm start`. On Vercel, Next uses the platform’s framework deployment. Choose the approved Vercel team/project explicitly; do not rely on a CLI’s last-linked project. Repository files do not establish the live project ID, team, Production Branch, domains, cron registration or current deployment SHA.
- The exposed cloud tools contain no Vercel plugin and this machine has no Vercel CLI or credential binding. Jose requested use of that plugin; it is not callable in this session. **Live project/team/deployment mapping and live Production env-variable status are unverified.** Once connected, use read-only metadata to record those identities and key names/status; never copy secret values into reports.
- CI triggers do not cover arbitrary `codex/premium-backend` or `claude/*` pushes. Preserve exact-SHA checks under the governed `release/**`/approved PR path. Do not infer a green hosted CI run from these local checks.

## Preflight and release order

1. Record the final merged SHA and its seven branch parents, exact required CI jobs, lockfile/runtime versions and independent QA/UI acceptance. Resolve the two stale desktop preview test expectations and re-run the exact final candidate. Later code changes create a new candidate.
2. In Vercel, read the intended team/project, Production domain and deployed SHA; in Neon, verify the intended production project/branch/database and exact current schema. Preview must use a separately proven isolated branch, not a name that merely says Preview. Never put a connection string in a command log or this document.
3. Obtain and record a recoverable Neon restore point/backup immediately before the migration, retention/expiry, and an actual successful restore rehearsal into a new isolated branch. Retain the previous app SHA/artifact and its private environment configuration. Take a private backup of per-employee `management_alert_choices` and affected notification suppression/audit state before any destructive schema reversal. Keep notification workers paused through a rollback-sensitive window; provider activation and real delivery require separate authorization.
4. Verify which migrations the existing database already has, against this exact order. Never sort by filename: prefixes `0023`–`0027`, `0031` and `0032` each appear twice, and filename order runs the held tenant file `0026_tenant_ownership_expand.sql`, which fails on this schema (`f10_expand_source_catalog_drift:tables`).
   - **Base chain**, as `CURRENT_MIGRATIONS` in `src/test/integration/local-postgres.ts`: `0001`–`0022`, then `0023_employee_attention_receipts`, `0024_contextual_communications`, `0025_calendar_subscriptions`, `0023_template_ownership`, `0024_schedule_copy_receipts`, `0025_company_policies`, `0026_attendance_observations`, `0027_payroll_period_custody`, `0028_configurable_payroll`, `0029_payroll_private_notices`, `0030_notification_source_kinds`, `0031_workspace_presentation`, `0032_workspace_words_modules`, `0033_management_alert_preferences`.
   - **Then, last:** `0031_native_payroll`, then `0032_company_access_invitations`. These two are **not** in `local-postgres.ts`. `scripts/company-setup.ts` applies them last, after the company and Owner exist, and the PR16 restore rehearsal tests them in that order.
   - **Never apply** `0026_tenant_ownership_expand` or `0027_tenant_ownership_validate`. They are held Phase F preparation and belong to no deployed chain.
   - Read-only presence checks are in the SQL below. Do not run `setup:company` against an existing production database: it is a fresh-empty install that refuses existing schemas.
5. **Apply each missing migration, in the order above, before deploying the new app or workers.**
   - **`0033_management_alert_preferences.sql`:** Profile, notification producers and readers, and workers use its columns and functions. It is additive: default choices `{}` keep prior behavior, and suppression defaults to false. The file has no transaction of its own, so wrap it in one, as in the first SQL block below.
   - **`0031_native_payroll.sql`:** native payroll code reads its tables (`src/lib/payroll/native/*`, `payroll/store.ts`, `payroll/notices.ts`). It is additive and adds immutable ledgers. The file has its own `BEGIN`/`COMMIT`: run it as is, not inside another transaction.
   - **`0032_company_access_invitations.sql`: required by all code from `a6f516d5` (2026-10-15) onward.** Without it, every Owner and Manager operational read and write (schedule publishing, employees, timecards, reports, payroll export, period close) fails as `operational_authorization`, which looks like an access denial rather than a missing table. The file has its own `BEGIN`/`COMMIT`: run it as is.
     - Preconditions: exactly one workspace, active, with `singleton=true`; otherwise it raises `company_access_workspace_unavailable`. It takes `SHARE ROW EXCLUSIVE` locks on `workspaces` and `employees`, so writes to them wait until it commits. Schedule the window.
     - Effect on people: every Manager who is active **at that moment** gets company-wide scope (`LEGACY_ADOPTION`). The census of those Managers is stored. Owners narrow it afterwards under Company & Access. Managers created later have no management access until an Owner assigns it.
     - Reversal: the adoption, scope, invitation and operation tables reject UPDATE, DELETE and TRUNCATE, and there is no inverse SQL. A failed run rolls back completely and can be retried; the PR16 rehearsal's `failed-upgrade-rollback` covers this. After COMMIT, only the recorded restore point reverses it.
   - For every file: use bounded lock and statement timeouts, stop on SQL error, and roll back rather than retrying blindly under traffic. The examples below use psql, already connected through the approved private operator connection; do not paste credentials here.
6. Verify schema/constraints/trigger/functions and existing row counts. The migration does not scan existing people and invent opt-outs or resend historical notifications. Confirm no invalid/unreviewed production scheduling profile has been replaced with the fictional test profile.
7. Deploy the approved SHA to an isolated Preview first; verify actual Neon HTTP transactions, upgrade compatibility for 0033, 0031_native_payroll and 0032_company_access_invitations, an Owner publishing a schedule, session/role boundaries and Profile/Inbox semantics. Local substituted PostgreSQL tests do not prove that transport. Complete approvals, then create a Production-scoped deployment from that same frozen source using the verified Production configuration. Do not promote an isolated Preview artifact that retains Preview database/settings. Any organization-specific promotion must prove the resulting Production bindings. Since Git deployment is disabled, the authorized operator uses the organization’s explicit Vercel deployment/promotion workflow; do not enable Git auto-deploy just to release.
8. Confirm hosted build/runtime map to that SHA and the intended database; perform authorized minimal production smoke checks. Re-enable only previously approved workers/features, in stages, while monitoring. Record the release timestamp, operator, schema revision and rollback decision owner.

```sql
-- In the approved private psql connection; migration content comes from the frozen SHA.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
\i db/migrations/0033_management_alert_preferences.sql
COMMIT;
-- Verify presence and behavior without selecting names, emails or credentials.
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND ((table_name='employees' AND column_name='management_alert_choices')
    OR (table_name='notifications' AND column_name='management_alert_suppressed'));
SELECT tgname FROM pg_trigger
WHERE tgrelid='notifications'::regclass AND NOT tgisinternal
  AND tgname='management_alert_preference';
SELECT to_regprocedure('management_alert_topic(text,text)'),
       to_regprocedure('management_alert_on(text,text)'),
       to_regprocedure('apply_management_alert_preference()');
```

```sql
-- Read-only: which of the last two migrations are present? NULL means not applied.
SELECT to_regclass('public.native_payroll_ledger')   AS native_payroll_0031,
       to_regclass('public.company_access_adoption') AS company_access_0032;
-- 0032 precondition: must return exactly 1.
SELECT count(*) FROM workspaces WHERE singleton AND active;

-- Each file has its own BEGIN/COMMIT, so run it as is, never inside another BEGIN.
\set ON_ERROR_STOP on
SET lock_timeout = '5s';
SET statement_timeout = '60s';
\i db/migrations/0031_native_payroll.sql
\i db/migrations/0032_company_access_invitations.sql
RESET lock_timeout;
RESET statement_timeout;

-- Verify adoption without selecting names, emails or credentials.
SELECT state, protocol_version, jsonb_array_length(legacy_manager_census) AS adopted_managers
FROM company_access_adoption;
```

The timeout values above are deployment-session bounds, not changes to production application policy. An ALTER needs an exclusive lock: schedule the window and inspect blockers first. If migration fails, ensure the transaction is rolled back; do not deploy code requiring partially applied schema.

Fresh installs: `scripts/company-setup.ts` applies the base chain through `0033`, creates the configured company, location and Owner, then applies `0031_native_payroll` and `0032_company_access_invitations` last, all in one transaction. Its actual-Postgres regression creates an empty database, runs the real setup and reads the new Owner’s Profile. This does not replace the reviewed incremental migration procedure above.

## Passkey migration 0035 (October 20 addition)

`0035_passkeys.sql` is included for review and was applied only to disposable local databases with fictional accounts. **No production migration or passkey activation is authorized by this branch.** See [the server/UI handoff](PASSKEY-SERVER-HANDOFF.md) for the endpoint contract and local evidence.

The combined development candidate now includes compliance `0034` and passkey `0035`. Apply them in that order after the exact canonical prerequisites. Migration `0035` now includes the deletion-request interlock, so `0034` is a prerequisite: accepting deletion revokes passkeys, sessions and calendar feeds, and advances the employee revision to fence in-flight password sign-ins. Fresh-empty company setup and current owned test databases include both migrations; never use fresh setup to upgrade an existing database. This local integration does not authorize any hosted migration. Before a future production operation, regenerate the complete candidate manifest and repeat review/backup/restore rehearsal against the combined source; the earlier approved planning manifest does not cover these changed bytes.

Migration `0035` contains its own `BEGIN`/`COMMIT`. Run the checked-in file with stop-on-error and bounded lock/statement timeouts in the authorized private operator session; do not wrap it in the `0033` transaction example above. Verify the five new tables, indexes, checks and revocation/audit triggers. Rehearse register/sign-in/remove, disabled-account and password-reset revocation on an isolated environment before production activation. The triggers apply even when the UI flag is off.

Keep `NEXT_PUBLIC_NEVORA_PASSKEYS` unset/off until migration verification and the final domain are approved. Enabling requires a new build with `NEXT_PUBLIC_NEVORA_PASSKEYS=on`, and runtime `NEVORA_PASSKEY_RP_ID` plus `NEVORA_PASSKEY_ORIGIN` set to the exact final HTTPS host/origin. Never choose a production RP from request headers or assume localhost registrations transfer to production. Production-mode previews also require their own explicit matching host/origin and isolated database.

Preferred rollback: rebuild with passkeys off and restore the approved app artifact/environment while retaining additive `0035`, credentials, revocations and audit history. Existing password sign-in remains available, and its shared passkey-enabled limiter is bypassed with the flag off. Never automatically undo revocation or remove the append-only audit trigger to roll back. Schema reversal or data restoration needs a separately reviewed plan and Jose's explicit approval.

## Environment inventory (names and status only)

| Setting | Production requirement |
|---|---|
| `NODE_ENV` | `production` in build and runtime; supplied by Next/platform |
| `DATABASE_URL` | Private, verified intended single-company production Neon connection; never a disposable/Preview DB |
| `FUEL_PORTAL_ORIGIN` | Exact HTTPS Production portal origin with no credentials/path/query |
| `NEXT_PUBLIC_NEVORA_PASSKEYS` | Default unset/off; `on` in build and runtime only after explicit passkey activation approval and verified migration 0035 |
| `NEVORA_PASSKEY_RP_ID`, `NEVORA_PASSKEY_ORIGIN` | Required if passkeys are enabled in production mode: exact final DNS hostname and matching HTTPS origin, no port/path/query/credentials; no final domain selected by this task |
| `NEVORA_RECOVERY_SMTP_HOST`, `NEVORA_RECOVERY_SMTP_PORT`, `NEVORA_RECOVERY_SMTP_USER`, `NEVORA_RECOVERY_SMTP_PASSWORD`, `NEVORA_RECOVERY_FROM` | Existing approved SMTP configuration if recovery is enabled; TLS verification required. No local transport, test mailbox or outbound test to a real person |
| `PUSH_ENVIRONMENT` | `production` only for separately authorized production push; no test enrollments carried across environments |
| `PUSH_FEATURE_ENABLED`, `PUSH_DELIVERY_ENABLED` | Keep current approved status; do not activate providers as part of this runbook |
| `PUSH_TEST_DELIVERY_ENABLED`, `PUSH_TEST_ACCOUNT_IDS` | Test delivery off; fictional allowlists absent from Production |
| `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, `PUSH_VAPID_SUBJECT`, `PUSH_SUBSCRIPTION_ENCRYPTION_KEY`, `NOTIFICATION_WORKER_SECRET` | Approved existing production material if enabled; do not rotate implicitly during deploy/rollback. Key continuity matters for existing subscriptions |
| `NEVORA_PAYROLL_ENABLED` | Current approved exact boolean setting; never turn payroll on to show the new topic |
| `NEVORA_CLOCKER_PUNCH_ENABLED`, `NEVORA_CLOCKER_PIN_KEY`, `NEVORA_CLOCKER_ORIGIN` | Existing separately authorized Clocker state/key/origin; activation stays separate |
| `NEVORA_APP_DATABASE_URL`, `NEVORA_WORKER_DATABASE_URL` | Deferred tenant-runtime principals are not a fallback for this single-company release; configure only with separate tenancy authorization |
| `NEVORA_DEV_FORCE_ERRORS`, `NEVORA_DEV_CAPTURE_DELIVERY`, `NEVORA_DEV_CAPTURE_OUT` | **Unset** in Production build/runtime settings |
| `NEVORA_OWNED_APP_*`, `NEVORA_PREMIUM_*`, `FUEL_TEST_DATABASE_URL`, `FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN`, `PREVIEW_OUT` | **Absent** from Production; owned test transport is never an app deployment option |

Production-absence test: `npm run test:dev:production` deliberately sets both dev flags during a production build, then scans every artifact for their names/cookie/capture markers. Passing proves the switch/capture code is erased even if those flags were accidentally supplied. It does **not** prove the live Vercel key inventory is empty. That live inventory check remains open until Vercel plugin access/metadata is available; do not report “confirmed unset” from a local shell or source search.

## Rollback, including 0033

**Preferred app rollback:** stop/pause dispatch/reminder workers, disable only separately authorized delivery paths if needed, restore the previous approved app SHA/artifact and verify its environment/database identity. **Leave additive migration 0033 installed.** Preserve employee choices, suppression audit rows, cancellations and delivery leases. Retain the saved settings so rollback does not silently resume notifications users opted out of. Verify old app auth/scheduling/Profile behavior and worker compatibility before resuming workers. Older workers without delivery-time preference rechecks must stay paused or be upgraded: the INSERT trigger alone does not prove safety for an in-flight producer/opt-out race. Resume only a worker version that supports the 0033 delivery recheck, or leave delivery disabled until repaired. Do not blindly requeue cancelled notifications or resurrect old delivery jobs.

**Leave `0031_native_payroll` and `0032_company_access_invitations` installed too.** Their ledgers are immutable and have no inverse SQL; only the restore point reverses them. Whether an app built before these migrations still runs on a database that has them hasn't been verified. Check it in the isolated Preview before relying on that rollback.

**Schema reversal is exceptional:** first stop every app/worker using new columns/functions, verify the backup/restore point, export choices and notification audit state privately, assess any writes since deployment and obtain Jose’s explicit approval for the data-loss/risk boundary. A code rollback normally needs no schema rollback. If reversal is required, the exact inverse structural order is:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP TRIGGER management_alert_preference ON notifications;
DROP FUNCTION apply_management_alert_preference();
DROP FUNCTION management_alert_on(text,text);
DROP FUNCTION management_alert_topic(text,text);
ALTER TABLE notifications DROP COLUMN management_alert_suppressed;
ALTER TABLE employees DROP COLUMN management_alert_choices;
COMMIT;
```

Do not add CASCADE or run this against an unverified target. **Dropping the columns loses preferences/suppression metadata, and does not undo notification cancellations. Reapplying 0033 resets choices to `{}`; it does not restore opt-outs.** The owned regression proves that loss, the inverse SQL order, and atomic rollback of a failed reversal. Restore preserved choice/audit data through a separately reviewed procedure or roll back the verified database restore point. A database point-in-time restore can lose legitimate post-release submissions; reconcile them before cutover and never point the app at a newly restored branch by guesswork.

## First hour

Record baselines immediately before release and at 5, 15, 30 and 60 minutes. Watch authenticated request volume, p50/p95, 5xx/503, Vercel execution duration/memory, cold starts and Neon connection/CPU/query metrics. Compare the same routes and periods; local workload numbers are not a hosted SLO.

- Watch **HTTP-200 unavailable Profile/count snapshots** and rendered Home error states as well as HTTP status. A failed count must not appear as zero. Check expected 401/403 behavior and role/location scoping.
- Watch `57014` statement timeout, `55P03` lock timeout, `53300` connection exhaustion, `40P01` deadlock, missing column/table/function errors and “Workspace configuration is unavailable”. That message masks storage/validation errors; diagnose the original protected logs without logging SQL values, cookies, recovery links or subscription material.
- Manager Schedule was 10.6-second p95 and inbox-count 3.0-second p95 at concurrency 20 locally after pooling. Treat both as open profiling risks. Check overlapping count refreshes and Schedule query/CPU/render payload before deciding a capacity threshold with Jose.
- Check migration lock waits, transaction error rate, session expiry, persisted submission receipts/idempotent retries, notification pending/cancelled/accepted/retry counts and suppression behavior. No real delivery tests are authorized by this work.
- Recovery remains an identical generic HTTP 202 regardless of account/channel state. Do not infer email delivery from that response. Confirm only approved provider telemetry; never expose proofs or trigger messages to real people for inspection.
- On sustained errors, wrong database identity, privacy/scope failure or lost preference behavior: pause new work, retain the exact SHA/timestamps/error classes, notify Jose and execute the approved rollback decision. Do not accept a partial-data fallback or weaken authorization/timeouts to keep a dashboard green.
