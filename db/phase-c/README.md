# Phase C schema source of truth

The Phase C Clocker schema was promoted to the numbered production migration chain:

- `0011_clocker_devices.sql`
- `0012_clocker_pins.sql`
- `0013_clocker_punches.sql`
- `0014_clocker_breaks.sql`
- `0015_clocker_schedule_context.sql`

Do not add test-only or deploy-only schema SQL in this directory. Runtime, CI, disposable PostgreSQL tests, Preview and production must use `db/migrations` in numeric order.
