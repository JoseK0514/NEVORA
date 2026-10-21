# SaaS and tenant architecture: diagnosis

Date: 2026-10-20. Scope: investigation only. Nothing was enabled, migrated, pushed or deployed.

- Repository: `JoseK0514/NEVORA`. Source examined: `origin/development` at `d4b01453`. This doc is on the local branch `claude/saas-tenant-investigation`.
- Also checked for copy: `origin/claude/auth-premium` (`b3caeca0`), `origin/claude/release-integration` (`898e99d4`), `origin/claude/nevora-compliance`. Codex's unmerged `origin/codex/pr16-database-restore-rehearsal-20261020` (`a38e088f`) was checked for migration coverage.
- Evidence: a disposable PostgreSQL 17.10 cluster with fictional data. The script and its JSON result are in the shared notes folder under `saas-tenant-evidence/` (`tenant-repro.mjs`, `tenant-repro-result.json`). Every database was dropped by its ownership marker, and the cluster was stopped and deleted.

## Short answer

NEVORA is a single-company application, enforced by the database. One database holds one company. "Company Access" means Manager scope across the locations of that one company: either the whole company or a set of its locations. It is not tenant isolation. The Phase F tenant code is unfinished preparation that no running path depends on. Its migrations can't be applied to the current schema. Supporting several independent companies safely today means one database (and one deployment) per company. A shared multi-tenant database would be a new project, not a feature to switch on.

## 1. What works for one company

| Area | How it works | Evidence |
|---|---|---|
| Company identity | `workspaces` has `singleton boolean CHECK(singleton) UNIQUE`. `getWorkspace()` reads `WHERE singleton=true` and requires exactly one active row (`src/lib/data/workspaces.ts:23-31`). | A10/B2: a second workspace fails with `23505 workspaces_singleton_key`. A11: `singleton=false` fails with `23514`. |
| Fresh install | `scripts/company-setup.ts:132` runs 0001…0033, swaps in the configured company, location and Owner, then runs `0031_native_payroll` and `0032_company_access_invitations` last, all in one transaction. | B1: exactly one `ENFORCED` adoption row, bound to the new workspace id. |
| Sign-in and sessions | Employee ID and password, an opaque 32-byte token, and `employee_sessions(token_hash, employee_id)` (`src/lib/auth/session.ts`). There is no workspace on the session. Every write re-checks the session, active status and role in the same SQL transaction (`src/lib/data/management-session.ts:26`). | Code reading. |
| Roles | Owner, Manager, Lead and Employee are checked on the server for each request, so role changes apply on the next request. | `docs/execution/single-company-20261012.md`, code reading. |
| Company Access (Manager location scope) | `operational_scope_revisions` stores, for each Manager, `COMPANY` (all locations), `LOCATIONS` (1–100 ids from this workspace) or `REVOKE`. `assertOperationalAccess` and `withOperationalCompany` require the `company_access_adoption` row plus a current grant, and they run the check again inside the business transaction (`src/lib/company-access/operational-scope.server.ts:16-75`). | A6: Owner allowed. A7: a Manager who existed before adoption gets `LEGACY_ADOPTION`/`COMPANY`. A8/A9: a Manager added after adoption is `UNASSIGNED` and denied until an Owner assigns scope. |
| Multiple locations | Locations, eligibility, positions and coverage are rows in the one company. Clocker keys are `UNIQUE(workspace_id, clocker_key)`. | `db/migrations/0008_workspace_positions.sql:25`. |

Spot check: a few manager routes don't call Company Access in the route file itself. Their services do, through `readCompanyResult` or `operationalScopeStatements`: reports, time corrections, timecards, payroll export, period close, schedule copy and action center. This was a sample, not an audit of every route.

## 2. Tenant work that exists only as preparation

- **`src/lib/tenancy/`** has a proof, resolver and executor design. It uses separate `NEVORA_APP_DATABASE_URL` and `NEVORA_WORKER_DATABASE_URL` connections and calls SQL functions such as `nevora_tenancy.resolve_portal_request` and `assert_audited_runtime_role`. **No file in `db/migrations` installs them.** They exist only as loose `.sql` under `src/lib/tenancy/runtime/`. Normal app code uses `getDb()` / `DATABASE_URL` and never calls the tenant executor.
- **`0026_tenant_ownership_expand.sql` and `0027_tenant_ownership_validate.sql`** aren't in either migration list (`scripts/company-setup.ts`, `src/test/integration/local-postgres.ts`). 0026 checks a hash of the 0001–0025 table catalog and refuses anything else. A13: on the current chain it fails with `55000 f10_expand_source_catalog_drift:tables`. Even when it applies, it only adds nullable ownership columns and a write fence; it doesn't add RLS or runtime isolation (`docs/architecture/tenant-foundation.md`).
- **Live but inert route:** `GET /api/workspaces/[locator]/session` (`src/app/api/workspaces/[locator]/session/route.ts`) ships in builds. It always ends in `401` or `503` because the tenant connection and SQL functions don't exist. No UI links to it.
- **A second, parallel Manager-scope model:** `src/lib/data/manager-location-scope.server.ts` reads Phase F `nevora_tenancy.portal_administrative_authority`. When that storage is missing, every Manager is treated as `ALL_TENANT`. It is used by `readToday`, `readClockMonitor` and `withActionRequestFacts`. Today's callers are safe: `/api/manager/today` wraps it in `withOperationalCompany`, inbox count also needs the Company-wrapped action center, and `getClockMonitor` has no caller outside tests. But a new caller that skips the Company wrapper would show every location to a Manager limited to some locations.
- **Schema:** A12: 61 of 103 tables have a `workspace_id` column. Core tables don't: `employees`, `employee_sessions`, `employee_credentials`, `schedules`, `shifts`, `time_entries`, `time_off_requests`, `notifications`, `push_subscriptions`, `password_recovery_proofs`. No table has row-level security turned on (`rls_tables: 0`). Employee IDs and session tokens are global keys.

## 3. Does any UI or documentation promise SaaS?

No user-facing promise was found. The login page shows the one configured company name (`getPublicWorkspaceName`). There's no company switcher, sign-up, pricing or billing in `src/app` or `src/components` on development, auth-premium or release-integration. "Company-wide" in the Company Access UI means all locations of this company. The compliance branch's privacy text says NEVORA "currently serves the participating employer", which matches one company. The README, `single-company-20261012.md` and `DEPLOY-RUNBOOK.md` all say one company per database and SaaS paused.

Wording that could mislead: `workspaces.ts`, `tenancy/*` and the inert route above use tenant terms (`ALL_TENANT`, "tenant runtime"). They show no UI, but they can make readers think isolation exists.

## 4. Concrete defects found

### D1. The owned preview database lacks Company Access, so every operational write is refused
- Files: `src/test/integration/local-postgres.ts:7-40` (the `CURRENT_MIGRATIONS` list has neither `0031_native_payroll.sql` nor `0032_company_access_invitations.sql`), `scripts/ui-checks/owned-preview-app-dev.mts:7`, `scripts/ui-checks/preview-runtime.mjs:62-72`.
- Reproduction (A1–A4): create `createDisposableExchangeDatabase({mode:'current-runtime'})`, run `seedOwnedApp`, and insert an Owner session. `readOperationalAuthority` returns `read_failed`. `assertOperationalAccess(owner,{kind:'COMPANY'})` throws `operational_authorization`. The real error is `42P01 relation "company_access_adoption" does not exist`.
- Integration suites avoid this because each fixture applies the two files itself (for example `src/test/integration/company-access-owned-app-fixture.ts:40-47` and `createPunchFixture({companyAccess:true})`). The preview runtime doesn't.
- Smallest fix (test tooling only): in `preview-runtime.mjs`, after `seedOwnedApp` and after the `AUDIT-*` employees are inserted, apply `0031_native_payroll.sql` and then `0032_company_access_invitations.sql`, as the owned-app fixture does. Insert the employees first so that `AUDIT-M` is captured by legacy adoption (A7); a Manager added afterwards is unassigned (A8). Not yet verified with a full preview run.

### D2. A missing schema looks like an access denial
- File: `src/lib/company-access/operational-scope.server.ts:39-40`. `assertOperationalAccess` turns any `view.state!=='ready'` result, including `read_failed` from a missing table, into `OperationalAuthorizationError`.
- Effect: a database without 0032 (preview, or production after a missed migration) shows Owners an access message instead of a configuration error, and the logs say `operational_authorization`.
- Smallest fix (Codex owns this code): throw a separate "unavailable" error when `reason!=='access_denied'`, and leave the authorization path unchanged.

### D3. The release runbook omits 0031/0032 and cites two lists that disagree
- File: `docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md:18-19` (written Oct 19, before the Oct 20 backend merge `811ee33c`). It says to check the chain "through `0032`", names only the 0023–0025 duplicates, and treats `company-setup.ts` and `local-postgres.ts` as one order. They aren't: only `company-setup.ts` includes `0031_native_payroll` and `0032_company_access_invitations`.
- Risk: if production doesn't have `0032_company_access_invitations` when code from `a6f516d5` or later is deployed, every Owner and Manager operational write fails with `operational_authorization` (A3). Production state wasn't checked, and must not be checked from here.
- Codex's unmerged rehearsal (`scripts/rehearsal/database-rehearsal.mts:46,368-385`) does exercise 0031/0032 upgrades. The runbook on development hasn't caught up. Codex and the release coordinator own this fix.

### D4. Duplicate migration numbers and held tenant files make "apply every file" fail
- `db/migrations` has duplicate prefixes 0023, 0024, 0025, 0026, 0027, 0031 and 0032. C1: applying files in filename order stops at `0026_tenant_ownership_expand.sql` (`55000 f10_expand_source_catalog_drift:tables`) after 29 files.
- Smallest fix (Codex): keep one checked-in ordered manifest that `company-setup.ts`, `local-postgres.ts`, the rehearsal and the runbook all read, and move the held tenant files 0026/0027 out of `db/migrations`. No migration content changes.

## 5. What several independent companies would need

**Available now: one database and one deployment per company.** The singleton constraint, per-database setup and per-database workers already give strong separation without code changes. Each company needs its own Neon database, app environment (`DATABASE_URL`), worker, VAPID and email configuration, backups and run of `setup:company`. Remaining gaps: an operator procedure, provisioning automation, per-company domains or login entry points, and cost. This doesn't enable "SaaS"; it repeats the single-company product.

**A shared database for many companies would be new work:**
1. Every business table gets a non-null tenant key, with composite foreign keys including `workspace_id`. That includes employees, sessions, credentials, schedules, shifts, time entries, notifications, push subscriptions and recovery proofs. Employee IDs and Clocker or calendar tokens get a namespace per tenant, or stay globally unique with a lookup back to the tenant.
2. Sessions are bound to a tenant. The login screen picks the tenant before checking a password, and the session check compares the tenant on every request. The tenant comes from the server, never from a client value.
3. Every query that uses the singleton (`WHERE singleton=true`, `workspaceReadGuard`, `getWorkspace()`) uses an explicit tenant instead. Remove the singleton constraint and the "exactly one workspace" checks in 0032, then reissue Company Access adoption for each tenant.
4. Database-enforced isolation: RLS with `USING` and `WITH CHECK` on every table, a non-owner runtime role without `BYPASSRLS`, and the tenant set per transaction. This is what `src/lib/tenancy` was designed for. Its SQL helpers would have to be finished, installed and audited, and 0026/0027 rebuilt against the current schema.
5. Workers, push, email, payroll jobs, calendar feeds and exports take the tenant from each job, never from global state. Any cache that lasts across requests (CDN, route or data cache) is keyed by tenant. Today the only one is React's per-request `cache` in `workspace-presentation/current.server.tsx`, which is safe.
6. Tenant lifecycle: provisioning, suspension, deletion and export, billing if wanted, and a support or admin role that isn't an Owner of every tenant.

**Acceptance for any multi-tenant claim:** two fictional companies in one database, tested in both directions. Cover reads, writes, sessions, background jobs, caches and exports. Include forged ids (another tenant's employee, location, shift or invitation id), replayed cookies and operation ids, role and scope changes in the middle of a request, and a direct SQL check that the runtime role can't read the other tenant with RLS on. None of this can be tested today: A10 shows a second company can't exist in one database.

## Recommended next step

Stay single-company. Ask Codex, through Jose, to (a) confirm that production has `0031_native_payroll` and `0032_company_access_invitations` applied, or schedule them, before any deploy of code from `a6f516d5` onward, and fix the runbook (D3). (b) Optionally fix D2 and D4. On the Claude side, D1 is a small change to preview tooling that can be done in its own worktree once Jose approves. If more companies are needed soon, write up the database-per-company procedure. Treat a shared multi-tenant database as a separate project for Jose to approve, with the acceptance tests above.

Gaps in this investigation: no hosted or Neon checks; production state unknown; the D1 fix wasn't run through a full preview; the route-to-Company-Access mapping was a sample, not an audit of every route; workers and caches were reviewed by reading code only.
