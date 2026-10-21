# Claude → Codex: tenancy-related fixes and status

Date: 2026-10-21. Jose authorized these fixes and this handoff. Everything is on `claude/*` branches for Codex review; nothing is merged, pushed to `development`/`main`, migrated or deployed. Fictional data and disposable local PostgreSQL 17.10 only. Base for all branches: `origin/development` `d4b01453`.

Context: `docs/product/saas-tenant-diagnosis-2026-10-20.md` (branch `claude/saas-tenant-investigation`) diagnosed four defects, D1–D4. All four are now fixed. The second half of this handoff walks Codex's own 11-point list of SaaS-conversion blockers and says, point by point, what is good today and what remains.

## Fixed

### D1 — Owned preview lacked Company Access (branch `claude/d1-preview-company-access`, `def6ff36`)
`scripts/ui-checks/preview-runtime.mjs` now applies `0032_company_access_invitations.sql` after the `AUDIT-*` roster (so legacy adoption gives `AUDIT-M` COMPANY scope) and before the first `publishScheduleWithRevision`. `0031_native_payroll` is deliberately left out: with its schema present, `seedPayrollPreviewFixture`'s provider-amount IMPORT fails `NATIVE_AMOUNT_INPUT_FORBIDDEN`, and the fixture's timecard FINALIZE needs 0032 anyway — the payroll preview fixture must change before 0031 can join the preview chain. Verified: full owned preview green on development, including the browser publication (HTTP 200, committed). Test tooling only.

### D2 — Failed authority read reported as denial (branch `claude/tenancy-defect-fixes`, `4998c80f`)
`src/lib/company-access/operational-scope.server.ts`: `assertOperationalAccess` threw `OperationalAuthorizationError` for every non-ready authority view, so a database missing 0032 told Owners they lacked access (the real error being `42P01`). Now only `reason:'access_denied'` stays an authorization error; a failed read throws a new `OperationalUnavailableError`, which every call site's existing generic-unavailable path handles (verified against `denied()` in schedule actions, `isShiftChangeAuthorizationError`, timecards' catch-all, and `withOperationalCompany`).
- Behavior notes for review: (a) a Manager whose stored selection is invalid (`readOperationalAuthority` → `read_failed`) now also surfaces as unavailable rather than denial — consistent with the read path's existing mapping; (b) denial semantics are unchanged (absent authority row, SQL sentinel, unassigned Manager all still throw authorization — covered by the new unit tests and the disposable-DB checks D2a–D2c below).
- Evidence: `operational-scope.server.test.ts` (3 tests), 123 surrounding unit tests green, and on a disposable DB: pre-0032 Owner → `OperationalUnavailableError`; after 0031+0032 Owner allowed; unassigned Manager still `OperationalAuthorizationError`.

### D3 — Runbook omitted 0031/0032 (branch `claude/d3-runbook-migrations`, `88584132`)
`DEPLOY-RUNBOOK.md` steps 4–5 rewritten: exact order (base chain through 0033, then `0031_native_payroll`, then `0032_company_access_invitations` last), the 0032 preconditions (one active singleton workspace), its `SHARE ROW EXCLUSIVE` locks, the legacy-adoption effect on active Managers, irreversibility (immutable ledgers, restore point only), read-only presence-check SQL, and never applying the held tenant files. Docs only. **Open for Codex: confirm the production database actually has 0031/0032, or schedule them before any deploy of code from `a6f516d5` onward.**

### D4 — No single migration-order authority (branch `claude/tenancy-defect-fixes`, `b82c486b`)
New `db/migrations/order.ts` declares `BASE_MIGRATIONS` / `FINAL_MIGRATIONS` / `HELD_MIGRATIONS`, with `db/migrations/README.md`. `scripts/company-setup.ts` installs from it (inline lists removed). `src/test/integration/local-postgres.ts` keeps its `CURRENT_MIGRATIONS` literal **unchanged in content and now exported** — kept a literal deliberately, because `scripts/rehearsal/database-rehearsal.mts` on `codex/pr16-database-restore-rehearsal-20261020` regex-parses it from source (the regex still matches with `export` prefixed). New `src/test/migration-order.test.ts` fails if the literal, the manifest and the directory contents ever disagree, so a new migration must be classified. No migration content changed; held files were not moved (test fixtures pin their paths).
- Evidence: 9 unit tests green; disposable-DB fresh setup through the manifest produced one `ENFORCED` adoption bound to the new workspace, `native_payroll_ledger` present, no `nevora_tenancy` namespace; `tsc --noEmit` and eslint clean on changed files. Full unit suite on the branch with both fixes: 512 files passed, 27 skipped; 8,898 tests passed, 801 skipped, zero failures (exit 0).

Verification artifacts (scripts + JSON results) are in the coordinator session's shared notes folder under `saas-tenant-evidence/`.

## Codex's 11 SaaS-conversion blockers: current status

Statuses are against `origin/development` `d4b01453`, within Jose's approved direction: single company per database now (`docs/product/multi-company-database-per-company-20261021.md`), shared-database tenancy as a separate approved project (`docs/product/prd-shared-multitenancy-draft-20261021.md`, both on `claude/multi-company-plan`). "PRD Rn" = the requirement that owns the remainder.

| # | Blocker | Status today | Remainder |
|---|---|---|---|
| 1 | App assumes one company | **Confirmed, and now the approved design.** `workspaces.singleton` UNIQUE+CHECK; a second workspace is rejected (23505, verified). | PRD R3 (singleton retirement) only if the SaaS project is approved. |
| 2 | Assigning existing data to the right company | Preparation exists (68-table capture, guarded backfill, held 0026/0027), unfinished; 0026 fails closed on the current schema (`f10_expand_source_catalog_drift:tables`, verified). | PRD R1 + phasing 1; 0026/0027 rebuilt against the current schema. |
| 3 | Exact data preservation | Typed-wire/lossless-JSON tooling built and locally tested per `tenant-foundation.md`; durable journal and recovery open. | PRD phasing 1. |
| 4 | Employee identity and duplicates | **Good within one company:** duplicate IDs/emails rejected; `tenancy/identity.ts` preserves trim/uppercase normalization and DB email comparison keys. Cross-company namespace undecided. | PRD R1 + decision D2 (per-tenant vs global IDs). |
| 5 | DB isolation and permissions | **Open.** 0 tables with RLS (verified); one runtime role via `DATABASE_URL`; `role-guard.sql` and `nevora_tenancy` helpers exist but no migration installs them. | PRD R4, in full. |
| 6 | Permissions changing mid-request | **Good to go today, single-company.** Session/role re-checked inside every write transaction after lock waits (`managementSessionStatements` before and after business statements; `operationalScopeStatements` re-checks; `assertOriginalOperationalAccess` fences responses to the original admission). | Tenant-suspension variant: PRD R2/R4. |
| 7 | Lost responses, uncertain outcomes | **Good at the app level:** `company_access_operations` receipts, `outcome_unknown`, exact-replay recovery (0032 + scope/invitation services). Migration-level UNCERTAIN classification built; durable progress journal open. | PRD phasing 1 (durable journal + reconciliation). |
| 8 | Feature conversion to tenant path | **Not started by design:** all runtime uses `getDb()`/`DATABASE_URL`; the tenant executor serves only the inert `/api/workspaces/[locator]/session` route. | PRD R5 + phasing 2–4. |
| 9 | Onboarding and lifecycle | **Good single-company:** atomic `setup-company` (order.ts chain, refuses non-empty schemas), `bootstrap:owner`, 15-minute invitation custody, last-Owner guard (`employee_profile_last_owner`, `src/lib/data/employees.ts:337`). Multi-company onboarding, suspension/recovery open. | PRD R6 + decision D1. |
| 10 | Restore/rollback safeguards | Single-company restore rehearsal exists on unmerged `codex/pr16-database-restore-rehearsal-20261020` (covers 0031/0032 upgrade, interruption rollback, retry); runbook now documents 0031/0032 rollback limits (D3). Tenant-aware restore (no revived access, no resent notifications) open. | Merge/land PR16 rehearsal; PRD acceptance 4 for the tenant variant. |
| 11 | End-to-end two-company proof | **Impossible today** — the singleton makes a second company unrepresentable (verified), which is itself the current safety property. | PRD acceptance 1–5 (two fictional companies, forged IDs, RLS probe, hosted Neon, A/B under load). |

Net: within the approved single-company scope, 4, 6, 7, 9 are good to go, 10 is good once the PR16 rehearsal lands, and D1–D4 closed the defects around them. 1, 2, 3, 5, 8, 11 are the SaaS conversion itself — they cannot be "fixed" inside this scope and are specced in the PRD draft for Jose's go/no-go.

## Asks for Codex

1. Review and land, or amend: `claude/tenancy-defect-fixes` (D2 + D4), `claude/d1-preview-company-access`, `claude/d3-runbook-migrations`.
2. Confirm production's migration state against runbook step 4 (presence-check SQL included there) before any deploy of post-`a6f516d5` code.
3. When rebasing `codex/pr16-database-restore-rehearsal-20261020`, note `CURRENT_MIGRATIONS` is now exported (your source regex still matches) and `order.ts` is the authority its `base`/`current` lists should read or assert against.
4. If Jose approves the SaaS project, start from the PRD draft; its R1–R6 and acceptance bar were written to cover exactly the 11 points above.
