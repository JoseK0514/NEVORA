# Fuel Scheduler

Employee scheduling application for Fuel Coffee Drive.

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
- Role

Optional:
- Email

Roles are Owner, Manager, Lead, and Employee. Credentials are stored separately from employee profile data.

## Database setup

1. Create a Neon PostgreSQL project.
2. Set `DATABASE_URL` from `.env.example`.
3. Apply `db/migrations/0001_initial.sql`.
4. Fill the bootstrap owner variables in your local environment.
5. Create the first owner:

```bash
npm run bootstrap:owner
```

The migration seeds the two initial location records as `Location 1` and `Location 2`.

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

For UI work, reuse the [Fuel UI contract](docs/ui/fuel-ui-contract.md). Future
automation follows the [delivery charter](docs/architecture/fuel-automation-charter.md);
it records phase boundaries and exclusions, not implemented capabilities.
