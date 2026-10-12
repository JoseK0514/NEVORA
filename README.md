# NEVORA Workforce

Workforce operations platform owned by VELANI LLC, configured for one company per database.

## Current delivery: one company

Jose's 2026-10-12 direction pauses SaaS and bypasses Phase F for this delivery. Use the existing single-workspace development architecture, authenticated Owner/Manager/Lead/Employee roles, and configured business data. Company identity, timezone, locations, staffing and positions are data; no customer is selected by application code. See the [single-company handoff](docs/execution/single-company-20261012.md).

To initialize a **new empty database**, fill the company and private owner fields in your private environment, explicitly select `NEVORA_SETUP_ENVIRONMENT`, `NEVORA_SETUP_DATABASE_URL` and its exact `NEVORA_SETUP_DATABASE_NAME`, then run:

```bash
npm run setup:company -- --help
node --env-file=.env.local --import tsx scripts/setup-company.mts
```

The command applies the canonical development migrations and creates the configured company, one location and a hashed Owner credential in one transaction. It refuses existing schemas. Historical migration customer seeds are removed inside this fresh-install transaction. The first location has no invented staffing/coverage rules; configure them in Owner Settings. Point the application's `DATABASE_URL` at the initialized database after setup. Production setup requires TLS certificate verification and separate owner authorization; no production setup or deployment is implied by this code.

For another Owner in an existing company, explicitly provide `BOOTSTRAP_PRIMARY_LOCATION_ID` and comma-separated `BOOTSTRAP_ELIGIBLE_LOCATION_IDS`, then use `npm run bootstrap:owner`. All selected locations must be active in the configured company. No location IDs or employee prefixes are assumed.

## Branch workflow

- `main`: production branch; a commit is not production-authorized until the frozen SHA has passed required CI, hosted verification, independent QA/UI review, and owner authorization
- `development`: active development and testing

Feature work lands in `development` or an approved phase branch. Promotion to `main` is performed through the release-control path for a frozen candidate; branch location alone is never evidence of production readiness.

## Current foundation

- Next.js 16 + React 19 + TypeScript
- Neon/PostgreSQL-ready database layer
- Employee-ID/password authentication with hashed credentials and opaque sessions
- Role-aware application shell for Owner, Manager, Lead, and Employee
- Database-backed employee list and employee creation
- Responsive desktop/mobile scheduling interface
- Scheduling validation engine with unit tests
- GitHub Actions is configured to run locked dependency installation, unit tests, type checking, linting, production builds, production dependency audit, and persisted Clocker PostgreSQL verification on governed branches

## Employee record

Required:
- Employee ID
- First name
- Last name
- Phone number
- Access role
- Active primary location and explicit eligible locations

Optional:
- Email

Roles are Owner, Manager, Lead, and Employee. Operational position qualifications are separate optional configuration; they never follow implicitly from an access role. Credentials are stored separately from employee profile data.

## Workspace foundation and database activation

Workspace name/timezone, locations, eligibility and operational positions are configured data. Access roles are separate from positions. Fuel Coffee Drive retains its Puerto Rico timezone, Monday–Sunday week and existing location records. See the [workspace foundation architecture](docs/architecture/nevora-workspace-foundation.md) and [QA review](docs/ui/2026-10-03-nevora-foundation-review.md).

Migration `0008_workspace_positions.sql` is prepared after exact 0001–0007. No existing customer, development or Neon database was migrated by this foundation. Select an environment and review dependencies, backups/restore, legacy names and application compatibility before separately authorizing activation. Build/start do not apply migrations.

SaaS provisioning and schema distribution remain deferred. The current single-company setup and generic operator owner bootstrap are described above; test-only generic SQL fixtures are not provisioning instructions.

## Automatic weekly drafts

Owner/Manager Build Week and Fill Gaps Only prepare scoped Draft schedules using configured coverage and shared scheduling rules. Review gaps and publish through the existing workflow. See the [automatic scheduler architecture](docs/architecture/nevora-auto-scheduler.md) and [Phase 4 QA record](docs/ui/2026-10-04-nevora-phase-4-review.md). Migration `0009_schedule_generation.sql` is prepared after exact 0001–0008; no customer/Neon activation occurred.

## Executive operating model

NEVORA implementation follows the [Executive Operating Model](docs/governance/nevora-executive-operating-model.md), including the Deputy COO coordination layer, operating directors, Governance & Risk Advisory Group, and independent QA/UI oversight.

Repository agents must follow [AGENTS.md](AGENTS.md). Material work loads the executive routing skill, applicable director skills, and governance controls; independent QA/UI skills are reserved for independent certification or explicit audit work.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

See `docs/architecture.md` for the product and workflow blueprint.

For UI work, reuse the [NEVORA UI contract](docs/ui/fuel-ui-contract.md). Future
automation follows the [delivery charter](docs/architecture/fuel-automation-charter.md);
it records phase boundaries and exclusions, not implemented capabilities.

Disposable SQL verification additionally uses `npm run test:foundation:integration`, `npm run test:notifications:integration` and `npm run test:generation:integration` with application `DATABASE_URL` unset, a fresh ownership-marked loopback test database and explicit destructive teardown opt-in. The [QA record](docs/ui/2026-10-03-nevora-foundation-review.md) documents exact tested commands and boundaries. Production migration/deployment, provider activation, paid infrastructure and Phase 5 remain separate approvals.
