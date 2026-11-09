# Migration order

**Never apply these files in filename order.** Numeric prefixes repeat
(0023–0027, 0031, 0032), and two files are held Phase F preparation that fails
on this schema. The authoritative order is [`order.ts`](order.ts):
`BASE_MIGRATIONS` first, then `FINAL_MIGRATIONS` once the company and Owner
exist, and `HELD_MIGRATIONS` never.

`scripts/company-setup.ts` installs from `order.ts`. The disposable test
adapter (`src/test/integration/local-postgres.ts`) keeps a `CURRENT_MIGRATIONS`
literal equal to `BASE_MIGRATIONS` — kept as a literal because the PR16
database-restore rehearsal parses it from source. `src/test/migration-order.test.ts`
fails if the two lists, or this directory's contents, ever disagree.

Adding a migration: add the file here, append it to `BASE_MIGRATIONS` in
`order.ts` and to `CURRENT_MIGRATIONS` in `local-postgres.ts`, and update the
deploy runbook's step 4. Production application remains a separately
authorized, per-database operation (see
`docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md`).
