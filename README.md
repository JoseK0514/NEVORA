# Fuel Scheduler

Employee scheduling application for Fuel Coffee Drive.

## Branch workflow

- `main`: stable / production-ready code
- `development`: active development and testing

All feature work lands in `development` first and moves to `main` only after validation.

## Current foundation

- Next.js 16 + React 19 + TypeScript
- Responsive manager application shell
- Desktop and mobile scheduling layouts
- Employee, availability, request, exchange, and settings routes
- Scheduling-first domain types
- GitHub Actions validation for type checking, linting, and production builds

## Initial scope

- Two Fuel Coffee Drive locations
- Employee scheduling
- Employee availability
- Time-off requests
- Shift coverage / shift swaps
- Manager approval workflows
- Draft and published schedules
- Mobile-first employee experience

## Employee record

Required: ID, first name, last name, phone number, and role.

Email is optional. Roles are Owner, Manager, Lead, and Employee.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

See `docs/architecture.md` for the product and workflow blueprint.
