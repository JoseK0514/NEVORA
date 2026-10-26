# Demo database: Isla Verde Cafés (fictional)

Status: procedure for a **hosted development** database only. It is not authorization to create a Neon project, deploy, or touch production. Creating the hosted project and running these commands against it need Jose's go-ahead. Every person, location, wage and tax fact in it is fictional.

The seed builds one production-like fictional company in two phases:

| Phase | Script | How it writes |
|---|---|---|
| Install | `scripts/setup-company.mts` (`npm run setup:company`) | Schema in `db/migrations/order.ts` order, the company, the first location and the Owner, in one transaction |
| A, structure | `scripts/seed-demo-company.mts` | The app's own services (locations, positions, people and Manager scope, rule profiles, hour targets, shift policy, coverage windows, break types, Clocker tablets, availability, shifts, publication). Recorded punches are inserted directly, as the owned fixtures do. |
| B, workflows | `scripts/seed-demo-flows.mjs` | Playwright signs in as the fictional people and uses the running app: its pages, server actions and JSON APIs. The database is only read, for IDs and the closing counts. |

## What you get

- 5 locations (one with a 113-character name), 4 positions, 30 people: Owner `IVC-100`, 3 Managers (`IVC-201` company-wide, `IVC-202` Condado + Santurce, `IVC-203` Viejo San Juan + Aeropuerto), 3 Leads, 23 Employees. Names carry accents (José Ángel, Begoña, Iñaki, Óscar) and one very long name (`IVC-406`).
- Availability for 24 people, none for `IVC-411` and `IVC-419`, and one dated exception (`IVC-407`, next week).
- Four weeks of shifts: two past weeks and the current week published, next week a draft (about 520 shifts).
- Recorded time with meal and rest breaks for both past weeks and the current week to date (about 390 entries, 300 breaks), with 3 missing clock-outs, 2 people clocked in now and 1 on break.
- Time corrections: approved, rejected and pending (8). Time off: 3 pending, 2 approved, 1 approved partial day, 2 declined, 2 withdrawn.
- Shift changes at Condado: one swap approved by the company-wide Manager, one swap waiting for the partner, two open coverage offers, one callout waiting for a Manager.
- Both past weeks' timecards approved and finalized; the previous week's pay-period population saved; native payroll settings, wage/tax profiles and opening balances for everyone who worked; one native run prepared, approved, and its documents (26 statements and a company summary) generated and published by the payroll worker. The current week stays open.
- `NEVORA_DEMO_ACCOUNTS_FILE` receives the account list (IDs, names, roles, Manager scope; never passwords).

## Before you start

1. A clean checkout of the frozen SHA that contains these scripts, `npm ci`, Node 24.19.
2. A Playwright installation with Chromium outside the repository; set `PLAYWRIGHT_RUNTIME_ROOT` to its `node_modules` (no download happens from these scripts).
3. A new Neon project or branch with an **empty** database whose name is `nevora_demo` or starts with `nevora_demo`. The scripts refuse any other name and refuse `NEVORA_SETUP_ENVIRONMENT=production`.
4. Run on **Tuesday–Saturday**, Puerto Rico time, and run phase B the same day as phase A. On Sunday evening the current week has no future shifts left, so the swap, coverage and callout steps are skipped with a warning. Early on Monday the week has no finished shift yet, so phase A adds short finished "closing inventory" shifts for the three missing clock-outs.
5. The native payroll calculator supports tax year 2026 only. A payday in 2027 or later is refused (`RULESET_NOT_APPLICABLE`) until the 2027 rules ship.

## Env files (never committed, `chmod 600`, never pasted into a command)

`.env.demo` — install, phase A and phase B. Use Neon's **direct (unpooled)** connection string here: setup runs one long DDL transaction and phase A uses a `pg` connection.

```
NEVORA_SETUP_ENVIRONMENT=development
NEVORA_SETUP_DATABASE_URL=postgresql://<role>:<password>@<direct-host>/nevora_demo?sslmode=require
NEVORA_SETUP_DATABASE_NAME=nevora_demo
COMPANY_NAME="Isla Verde Cafés (fictional)"
COMPANY_TIME_ZONE=America/Puerto_Rico
COMPANY_LOCATION_NAME="Isla Verde Condado"
COMPANY_LOCATION_SHORT_NAME=Condado
COMPANY_LOCATION_KEY=condado
BOOTSTRAP_EMPLOYEE_ID=IVC-100
BOOTSTRAP_FIRST_NAME=Isabel
BOOTSTRAP_LAST_NAME="Quiñones Ortiz"
BOOTSTRAP_PHONE=7875550100
BOOTSTRAP_EMAIL=isabel.owner@example.invalid
BOOTSTRAP_PASSWORD=<generated, kept in the password manager>
DATABASE_URL=<the same direct URL as NEVORA_SETUP_DATABASE_URL>
NEVORA_DEMO_PASSWORD=<generated, at least 12 characters; every seeded person except the Owner>
NEVORA_DEMO_ACCOUNTS_FILE=<private folder>/demo-accounts.json
NEVORA_DEMO_APP_URL=<exact origin of the running demo app, e.g. http://localhost:3917>
NEVORA_DEMO_WORKER_ENV_FILE=<path to .env.demo-app>
NEVORA_DEMO_EVIDENCE_DIR=<private folder>/evidence
PLAYWRIGHT_RUNTIME_ROOT=<folder>/node_modules
```

`.env.demo-app` — the app build/start and the payroll worker (plan §4.3 step 3):

```
DATABASE_URL=postgresql://<role>:<password>@<pooled-host>/nevora_demo?sslmode=require
NEVORA_PAYROLL_ENABLED=true
NEVORA_CLOCKER_PIN_KEY=<32-byte hex, generated for this demo>
NEVORA_CLOCKER_PUNCH_ENABLED=true
PUSH_FEATURE_ENABLED=false
PUSH_DELIVERY_ENABLED=false
NEXT_TELEMETRY_DISABLED=1
# FUEL_PORTAL_ORIGIN: leave unset on http://localhost (a production build refuses an http origin
# and derives it from the Host header). On an https preview set it to that exact origin.
# No SMTP_* variables: account-recovery mail stays off. No push keys.
```

## Commands (from the repository root)

```
# 1. Install schema, company and Owner (refuses a non-empty schema)
node --env-file=.env.demo --import tsx scripts/setup-company.mts

# 2. Phase A, structure (refuses a second run)
node --env-file=.env.demo --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx scripts/seed-demo-company.mts

# 3. Build and start the app against the demo database. with-env-file.mjs loads the file into the
#    child's environment; next's workers reject --env-file inside NODE_OPTIONS.
node scripts/with-env-file.mjs .env.demo-app node_modules/.bin/next build
node scripts/with-env-file.mjs .env.demo-app node_modules/.bin/next start -p 3917 -H localhost
#    (or a preview deployment with the .env.demo-app values as its environment)

# 4. Phase B, workflows, in a second terminal while the app runs (refuses a second run).
#    It runs `scripts/payroll-worker.ts` twice through with-env-file.mjs and NEVORA_DEMO_WORKER_ENV_FILE.
node --env-file=.env.demo scripts/seed-demo-flows.mjs
```

Phase B writes `phase-b-summary.json` (steps, warnings, skipped items and counts, no secrets) to `NEVORA_DEMO_EVIDENCE_DIR`. `NEVORA_DEMO_ONLY=<step,step>` reruns single steps (`corrections,timecards,payroll-setup,period-close,payroll-run,time-off,shift-changes,updates`) and bypasses the second-run guard, so use it only on a database you are about to reset.

Sign in with the IDs in the account list: the Owner with `BOOTSTRAP_PASSWORD`, everyone else with `NEVORA_DEMO_PASSWORD`. Use `http://localhost:<port>`, not `127.0.0.1`, locally: the production session cookie is `Secure`.

## Verify

Run read-only against the demo database (any SQL client on the direct URL):

```sql
SELECT 'locations' item, NULL detail, count(*)::int n FROM locations
UNION ALL SELECT 'people', role, count(*)::int FROM employees GROUP BY role
UNION ALL SELECT 'shifts', s.week_start || ' ' || s.status, count(*)::int FROM shifts sh JOIN schedules s ON s.id = sh.schedule_id GROUP BY s.week_start, s.status
UNION ALL SELECT 'time entries', status, count(*)::int FROM time_entries GROUP BY status
UNION ALL SELECT 'breaks', NULL, count(*)::int FROM break_entries
UNION ALL SELECT 'corrections', latest, count(*)::int FROM (SELECT (SELECT e.event_kind FROM time_correction_events e WHERE e.request_id = r.id ORDER BY e.revision DESC LIMIT 1) latest FROM time_correction_requests r) c GROUP BY latest
UNION ALL SELECT 'time off', status, count(*)::int FROM time_off_requests GROUP BY status
UNION ALL SELECT 'exchanges', kind || ' ' || status, count(*)::int FROM shift_exchanges GROUP BY kind, status
UNION ALL SELECT 'callouts', status, count(*)::int FROM shift_callouts GROUP BY status
UNION ALL SELECT 'updates', NULL, count(*)::int FROM communications
UNION ALL SELECT 'finalized timecards', NULL, count(*)::int FROM (SELECT DISTINCT ON (employee_id, start_date, end_date) action FROM timecard_revisions ORDER BY employee_id, start_date, end_date, revision DESC) t WHERE action = 'FINALIZE'
UNION ALL SELECT 'payroll runs', payload->>'status', count(*)::int FROM payroll_runs_current GROUP BY 2
UNION ALL SELECT 'payroll documents', kind, count(*)::int FROM payroll_documents GROUP BY kind
UNION ALL SELECT 'payroll publications', NULL, count(*)::int FROM payroll_publications
UNION ALL SELECT 'push deliveries', NULL, count(*)::int FROM push_deliveries;
```

Expect `push deliveries` = 0. Then sign in as `IVC-100`, `IVC-201` and an Employee (for example `IVC-401`) and open My pay, Payroll, Timecards and Schedule.

## Reset

The install, phase A and phase B all refuse to run twice, so a reset is always "empty database, then all four commands":

- Neon: delete the demo branch and create a new one from an empty parent, or as the owner role, connected to another database on the same branch: `DROP DATABASE nevora_demo WITH (FORCE); CREATE DATABASE nevora_demo;`
- Local: drop and create the database the same way.

Never run `setup:company` or the seed against an existing customer database: the setup refuses a non-empty schema, and the seed refuses any database not named `nevora_demo*`.

## Known limits (product behavior, not seed defects)

- **Updates are not seeded.** The app holds Updates (D04 activation hold, `src/lib/communications/sql.ts`): the compose form and publishing work only on owned loopback test databases (`nevora_foundation_test_*`, `nevora_exchange_test_*`, `fuel_phase3_test_*` with the disposable marker). A `nevora_demo` database cannot satisfy it, so phase B reports the step as skipped.
- **Location-scoped Managers cannot review time corrections or team time off**: both need company-wide scope. Phase B uses the company-wide Manager and the Owner for those decisions; the scoped Managers still see their locations' schedules and requests.
- **Seeded punches have no Clocker schedule context** (`time_entries.schedule_context` is null), as in the owned fixtures: the capture trigger only runs inside a real Clocker punch. No Clocker PINs are set; enroll tablets and PINs in Settings to try the Clocker.
- **Native payroll uses the app's 2026 policies**: the Owner-authorized provisional calculation policy (`OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014`) and the scoped PR withholding cent guidance. Without them the calculator accepts only exact-cent amounts. Timecards are finalized for both past weeks because the Puerto Rico day-of-rest rule reads the six days before the pay week.
- **Period close records the population only.** The provider MANIFEST and HANDOFF steps need a provider payroll export; native payroll does not.

## Local proof without a hosted database

The Neon HTTP driver cannot reach a plain PostgreSQL server. For a local proof only, `scripts/demo-local-neon-fetch.mjs` answers the driver's SQL-over-HTTP calls from an owned loopback database. It is inert unless `NEVORA_DEMO_LOCAL_PG_URL` is set, refuses non-loopback targets and names outside `nevora_demo*`, and is never used with a hosted database. Add to `.env.demo-app`:

```
DATABASE_URL=postgresql://demo@db.nevora-demo.localhost/nevora_demo
NEVORA_DEMO_LOCAL_PG_URL=postgresql://<user>@127.0.0.1:<port>/nevora_demo
NODE_OPTIONS=--import <absolute path>/scripts/demo-local-neon-fetch.mjs
```

The app build itself is unmodified.
