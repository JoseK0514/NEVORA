# NEVORA Workforce

Workforce operations platform owned by VELANI LLC. Fuel Coffee Drive is the current customer/workspace.

## Branch workflow

- `main`: stable / production-ready code
- `development`: active development and testing

All feature work lands in `development` first and moves to `main` only after validation.

## Current foundation

- Next.js 16 + React 19 + TypeScript
- Neon/PostgreSQL-ready database layer
- Employee-ID/password authentication with hashed credentials and opaque sessions
- Role-aware application shell for Owner, Manager, Lead, and Employee
- Database-backed employee list and employee creation
- Responsive desktop/mobile scheduling interface
- Scheduling validation engine with unit tests
- GitHub Actions validation for tests, type checking, linting, and production builds

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

Fresh-customer schema distribution/provisioning and generic owner bootstrap are deferred to Productization. `bootstrap:owner` is a historical Fuel utility; it is not a verified generic onboarding flow. Test-only generic SQL fixtures must never be used as production provisioning instructions.

## Automatic weekly drafts

Owner/Manager Build Week and Fill Gaps Only prepare scoped Draft schedules using configured coverage and shared scheduling rules. Review gaps and publish through the existing workflow. See the [automatic scheduler architecture](docs/architecture/nevora-auto-scheduler.md) and [Phase 4 QA record](docs/ui/2026-10-04-nevora-phase-4-review.md). Migration `0009_schedule_generation.sql` is prepared after exact 0001–0008; no customer/Neon activation occurred.

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
