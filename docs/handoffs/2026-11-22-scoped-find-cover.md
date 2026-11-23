# Location Manager Find Cover

The collab branch shows Find Cover in Schedule for gaps at the Manager’s assigned locations. The server checks the current session and location before loading candidates and again before returning them. It uses the complete private scheduling ledger to rule out conflicts and returns only eligible candidates for the selected location. The scoped screen omits company-wide hours and employee details.

The reviewed candidate can open the existing Add Shift form for draft coverage. A location Manager can inspect the replacement for a published shift. Saving that published replacement uses the existing company-wide authorization and Publish schedules grant.

## Claude Cloud test

Use `claude-codex-collab-nevora`. Run in a clean checkout with the pinned Node dependencies, PostgreSQL binaries, and the installed Chromium test runtime. The fixture starts a new loopback PostgreSQL cluster with fictional data and prints its app URL and the sample scheduled week.

```sh
npm ci --ignore-scripts --include=dev
env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL \
  NEVORA_TEST_PG_BIN=/absolute/path/to/postgresql/bin \
  node --conditions=react-server --import ./scripts/node-server-context.mjs \
  --import tsx scripts/rondo-local.mts "$(mktemp -d)"
```

1. Sign in as `QARONDOMANAGER` using the disposable `TEST_PASSWORD` in [owned-app-fixture.ts](../../src/test/integration/owned-app-fixture.ts). In Claude Cloud, use the app URL printed by that runner.
2. Open Schedule and the sample week with location set to All your managed locations. Open an eight-hour Find Cover row for Main Office. The candidate list and review show Main Office only.
3. In the same session, open an equivalent Find Cover URL for West Office. It should say Outside the locations you manage and withhold candidate names. The integration test also checks the out-of-scope review token, a conflicting commitment at a separate location, and a stale review.

## Verification

Implementation commit `312ff0249` passed TypeScript, 102 focused tests, and all 18 tests in the schedule authorization PostgreSQL suite. An authenticated Chromium check at 390 and 1440 pixels reached the candidate list and replacement review, and denied a direct link to the other location. The checks used the disposable app fixture. This handoff is for collaboration branch testing.
