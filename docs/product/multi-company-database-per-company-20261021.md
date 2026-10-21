# Serving more companies today: one database and one deployment per company

Date: 2026-10-21. Status: operator procedure, approved direction (Jose, 2026-10-21). It authorizes no specific production setup; each real company's environment still needs Jose's explicit authorization, per `docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md`.

## The model

Each company gets its own Neon database and its own application deployment. No code changes. Isolation comes from separation: company B's data is in a database that company A's deployment cannot reach. The `workspaces.singleton` constraint keeps each database at exactly one company, which is what the application assumes everywhere (see `docs/product/saas-tenant-diagnosis-2026-10-20.md` on `claude/saas-tenant-investigation`).

This is the supported way to serve several companies. A shared database for many companies is a separate project (draft PRD: `docs/product/prd-shared-multitenancy-draft-20261021.md`).

## Per-company provisioning

Everything below happens once per company, by the authorized operator.

1. **Database.** Create a new, empty Neon project for the company (a separate project, not a branch of another company's project: separate compute, backups, restore points and connection identity). Record the project, branch and database names in the company's private record. Production connections require `sslmode=verify-full`.
2. **Setup configuration.** In a private, ignored `.env.local` (never committed, never pasted into logs or docs), fill:
   - Company: `COMPANY_NAME`, `COMPANY_TIME_ZONE`, `COMPANY_LOCATION_NAME`, `COMPANY_LOCATION_SHORT_NAME`, `COMPANY_LOCATION_KEY`.
   - First Owner: `BOOTSTRAP_EMPLOYEE_ID`, `BOOTSTRAP_FIRST_NAME`, `BOOTSTRAP_LAST_NAME`, `BOOTSTRAP_PHONE`, `BOOTSTRAP_PASSWORD`, optional `BOOTSTRAP_EMAIL`.
   - Target: `NEVORA_SETUP_ENVIRONMENT` (`development` or `production`), `NEVORA_SETUP_DATABASE_URL`, and its exact `NEVORA_SETUP_DATABASE_NAME`. Setup never falls back to `DATABASE_URL`.
3. **Install.** From the frozen release SHA:
   ```bash
   node --env-file=.env.local --import tsx scripts/setup-company.mts
   ```
   One transaction applies the full canonical chain — the base migrations through `0033`, then `0031_native_payroll` and `0032_company_access_invitations` last — and creates the company, its first location and the hashed Owner credential. It refuses a non-empty schema, so it can never damage an existing company. Record the emitted workspace and location IDs. Note: the new Owner is created before `0032`, so legacy adoption gives nothing company-wide to anyone but the Owner role itself; Managers added later need scope assigned under Company & Access.
4. **Deployment.** Create a separate Vercel project (or at minimum a fully separate environment) for the company, pointing `DATABASE_URL` at the new database. Per company, never shared across companies:
   - `FUEL_PORTAL_ORIGIN` — the company's own HTTPS origin (its login URL; there is no shared entry point or company picker).
   - `PUSH_VAPID_PUBLIC_KEY` / `PUSH_VAPID_PRIVATE_KEY` / `PUSH_VAPID_SUBJECT` / `PUSH_SUBSCRIPTION_ENCRYPTION_KEY` — a fresh key pair per company; push subscriptions bind to these keys, so they must never be reused across companies.
   - `NOTIFICATION_WORKER_SECRET` — fresh per company.
   - `NEVORA_RECOVERY_SMTP_*` and `NEVORA_RECOVERY_FROM` — the company's approved sender identity, or recovery stays off.
   - Feature flags (`NEVORA_PAYROLL_ENABLED`, `NEVORA_CLOCKER_*`, `PUSH_*_ENABLED`) — each company's approved state; never copied blindly from another company.
   The rest of the environment inventory and its production-absence rules are in the deploy runbook and apply per company.
5. **Workers.** Each deployment runs its own notification worker against its own `DATABASE_URL`. A worker never serves two companies.
6. **More Owners.** With the emitted location IDs: `BOOTSTRAP_PRIMARY_LOCATION_ID`, `BOOTSTRAP_ELIGIBLE_LOCATION_IDS`, then `npm run bootstrap:owner`.
7. **Verification before handover.** The runbook's Preview checks, per company: an Owner signs in, publishes a schedule, and the presence checks show `native_payroll_ledger` and `company_access_adoption` installed. Fictional data only until the company's own people are loaded.

## Operating several companies

- **Releases:** one frozen SHA, deployed once per company. A migration runs once per database, with each company's own backup/restore point. The runbook's steps apply per company, so a release window scales with the company count.
- **Backups and restore:** per database, so one company's restore never touches another's data.
- **Support:** every question starts with "which company", which selects the database and deployment. Never connect a tool to more than one company's database at a time.
- **Cost:** each company adds a Neon project and a Vercel project. Track per-company cost before committing to a price.

## Limits to be honest about

- No cross-company reporting or administration; an operator who manages several companies signs into each separately.
- Employee IDs are unique within a company only; two companies can both have `EMP-100`.
- Each company needs its own domain or subdomain, decided at provisioning.
- Operational effort grows linearly with companies. Past a handful, the shared-database project (the draft PRD) becomes the better investment.

## Never

- Point two deployments of different companies at one database, or one deployment at two databases.
- Reuse push keys, worker secrets or SMTP identities across companies.
- Run `setup:company` against a database that already has a company (it refuses, but do not try).
- Copy data between company databases outside a separately reviewed, authorized procedure.
