# PRD draft: shared-database multi-tenancy

Date: 2026-10-21. Status: **draft for Jose's approval — not scheduled, not authorized.** Owner once approved: Codex (backend, migrations). Production stays NO-GO for anything here until every gate passes. This draft does not reopen Phase F as it was; Phase F artifacts (`src/lib/tenancy/`, held migrations `0026`/`0027`, `docs/architecture/tenant-foundation.md`) are inputs to be reused or replaced on their merits.

Evidence base: `docs/product/saas-tenant-diagnosis-2026-10-20.md` (branch `claude/saas-tenant-investigation`), especially section 5. Interim path while this is unscheduled: `docs/product/multi-company-database-per-company-20261021.md`.

## Problem

NEVORA serves one company per database, enforced by the `workspaces.singleton` constraint. Serving each additional company today means another database and deployment, which scales operator effort and cost linearly. If NEVORA is to onboard many Puerto Rico businesses, one shared deployment must hold many companies without any possibility of one company reaching another's data.

## Goals

1. Many independent companies in one database and one deployment.
2. Isolation enforced by the database itself (RLS), not only by query discipline.
3. The existing single company migrates in without data loss or behavior change.
4. Per-company behavior identical to today: roles, Company Access location scopes, scheduling, attendance, payroll, notifications.

## Non-goals (separate decisions, not in this scope)

- Public self-serve signup, billing, plans or pricing.
- Cross-company reporting or a platform-admin console beyond the minimum lifecycle tooling in R6.
- Changing any product behavior within a company.

## Requirements

- **R1 — Tenant keys everywhere.** Every business table carries a non-null `workspace_id` with composite foreign keys that include it. Today 42 of 103 tables lack the column, including `employees`, `employee_sessions`, `employee_credentials`, `schedules`, `shifts`, `time_entries`, `time_off_requests`, `notifications`, `push_subscriptions`, `password_recovery_proofs`. Employee IDs, Clocker keys, calendar tokens and recovery proofs become tenant-scoped or stay globally unique with an authoritative mapping back to one tenant.
- **R2 — Tenant-bound authentication.** The login entry point selects the tenant before any credential check (per-tenant URL or locator — decision D1 below). Sessions store the tenant, and every request compares it; a session can never act in another tenant. No client-supplied value ever selects the tenant after login.
- **R3 — Singleton retirement.** Remove the singleton constraint and every `WHERE singleton=true` / `getWorkspace()` assumption; replace with an explicit tenant from the request context. `0032`'s one-workspace preconditions are reworked, and Company Access adoption is issued per tenant.
- **R4 — Database-enforced isolation.** RLS with `USING` and `WITH CHECK` on every tenant table; the application connects as a dedicated role with no `BYPASSRLS`, no table ownership and least-privilege grants; the tenant is set per transaction through an audited mechanism. The held `0026`/`0027` migrations are rebuilt against the current schema or replaced. A compromised runtime with arbitrary SQL remains a documented residual risk, as the Phase F checkpoint already states.
- **R5 — Tenant-scoped everything else.** Workers take the tenant from each job; push, email, payroll runs, calendar feeds, exports and any cross-request cache are keyed by tenant. VAPID/key strategy per tenant is decision D3.
- **R6 — Tenant lifecycle.** Provision, suspend, export and delete a tenant through authorized tooling; deletion respects employer record-keeping duties (privacy policy). The existing production company migrates in as the first tenant through a rehearsed, reversible procedure.

## Acceptance (the bar for any "done" claim)

Two fictional companies in one database, exercised in both directions, on disposable infrastructure first and then the hosted stack:

1. Reads, writes, sessions, background jobs, caches and exports never cross tenants.
2. Forged identifiers (another tenant's employee, location, shift, invitation or operation ID), replayed cookies and operation IDs, and role or scope changes mid-request are all denied.
3. With RLS active, a direct SQL probe as the runtime role returns no other tenant's rows.
4. The migrated original company behaves exactly as before: full regression of the existing suites plus browser evidence.
5. Simultaneous A/B operation under load, per the Phase F F10/F11/F12 gate structure, with independent QA sign-off. Local substituted-transport tests do not close the hosted gates.

## Decisions Jose must make before work starts

- **D1 — Tenant entry.** Subdomain per company, path locator, or company code at login.
- **D2 — Employee ID namespace.** Per-tenant IDs (two companies may both have `EMP-100`) or globally unique IDs.
- **D3 — Push keys.** One platform key set with tenant-scoped subscriptions, or keys per tenant.
- **D4 — Timing.** This starts only after the current release lands and stabilizes.

## Phasing sketch (for Codex to re-plan)

1. Schema: tenant keys and composite FKs, additive and backfilled (reusing the Phase F capture/backfill work where it still fits).
2. Auth: tenant-bound login and sessions behind a flag, single tenant still.
3. RLS and runtime roles; singleton retirement; per-tenant adoption.
4. Workers, caches, exports; lifecycle tooling.
5. Two-tenant acceptance, migration rehearsal of the real company, independent QA, Jose's go/no-go.

## Risks

- Widest-possible blast radius: every table and most queries change. Mitigation: additive migrations, flags, and the acceptance bar above.
- The Phase F foundation is large and partly superseded; adopting it wholesale was already rejected once (2026-10-12). Each piece is re-judged.
- Release freeze: nothing here may land while the current release is in flight.
