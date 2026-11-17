# Local verification receipts

Application source: `c9de85ecef4f8eb2fb9f109e494bfde892022f65`.
Base: `22a9d598eb470cd380ee739d7396f06ecf335ed5`.

- `204-*-red.log`, `205-base-sql-red.log`, `206-sql-red.log` and
  `207-unit-red.log` retain observed regressions before their fixes.
- `base-manuals.log` is the source-qualification control on the untouched base.
- The four `*-exact-code.log` SQL receipts cover 639 passing tests. Each used
  `node scripts/payroll-postgres.mjs <existing-config>` with a fresh owned local
  PostgreSQL cluster and no application `DATABASE_URL`.
- Configurations: `vitest.notifications-integration.config.mts`,
  `vitest.foundation-integration.config.mts`,
  `vitest.generation-integration.config.mts`; the Company run selects
  `company-access-schedule-writes.integration.ts` and
  `company-access-period-export.integration.ts` under
  `vitest.company-access-integration.config.mts`.
- `unit-exact-code.log`: complete `npm test -- --maxWorkers=4` result, including
  the mandatory manuals hash guard. Its failure is retained, not suppressed.
- `typecheck-final.log`, `lint-final.log` and `build-exact-code.log` are the
  compilation/lint/build receipts. The build summary verifies clean source and
  an unchanged implementation tree, and identifies the complete external receipt.

These receipts do not certify browser/hosted behavior, UI wiring, development
assembly, independent audit closure or production authorization.
