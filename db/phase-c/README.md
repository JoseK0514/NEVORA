# Phase C schema source of truth

The Phase C Clocker schema was promoted to the numbered production migration chain:

- `0011_clocker_devices.sql`
- `0012_clocker_pins.sql`
- `0013_clocker_punches.sql`
- `0014_clocker_breaks.sql`
- `0015_clocker_schedule_context.sql`

Do not add test-only or deploy-only schema SQL in this directory. Runtime, CI, disposable PostgreSQL tests, Preview and production must apply `db/migrations` in the order declared in `db/migrations/order.ts` (`BASE_MIGRATIONS`, then `FINAL_MIGRATIONS`), never in filename or numeric order: prefixes `0023`–`0027`, `0031` and `0032` repeat, and the held `0026_tenant_ownership_expand.sql` / `0027_tenant_ownership_validate.sql` must never run.
