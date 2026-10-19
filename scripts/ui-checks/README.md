# UI checks

The tools the premium UI chats use to run a local NEVORA preview with fictional data and check every screen. They run on a Mac or in a Linux cloud machine. Nothing here talks to production, sends email or push, or prints a password.

## What's here

| File | What it does |
|---|---|
| `preview-runtime.mjs` | Starts a private Postgres cluster and a Next dev server on a copy of the app, seeds the fictional workspace, and writes `access.json` (URL and the preview password, file mode 600) under `$PREVIEW_OUT/evidence-*/`. It prints `PREVIEW_READY <url>` when ready. Keep it running. |
| `owned-preview-app-dev.mts` | Used by the runtime: copies the source, swaps in the local database adapter and starts Next. |
| `seed-extra.mts` | Adds the extra fictional people and states the checks need: decided time-off requests, AUDIT-ON (clocked in), AUDIT-BREAK (on break), the lead's shifts, AUDIT-SWAP, and payroll-qa-b as a lead. `--large` adds 200 people, 50 shifts a day and a year of time entries. It checks the cluster's owner marker first, so it only writes to the preview `PREVIEW_OUT` owns. |
| `login.mjs` | Signs in once per account and saves the browser state to `$PREVIEW_OUT/state/`. Reads the password from `access.json`; never prints it. |
| `checks.mjs` | Read-only screen checks: page overflow, text under the size floor, tap targets, layout shift, console errors, and axe with `--axe`. Results go to `$PREVIEW_OUT/checks/<timestamp>.json` with a summary on screen. |
| `sync.sh` | Copies a worktree's `src/` into the running preview so the dev server reloads it. |

## Environment

| Variable | Needed | Meaning |
|---|---|---|
| `PREVIEW_OUT` | always | Your own empty scratch folder. One per preview. |
| `PLAYWRIGHT_RUNTIME_ROOT` | if Playwright isn't in this repo's `node_modules` | A `node_modules` folder that has `playwright`, with Chromium and WebKit installed (`npx playwright install chromium webkit`). |
| `PG_BIN` | if `pg_config` isn't on `PATH` | Folder with `initdb`, `pg_ctl` and `postgres` (PostgreSQL 16 or later). |
| `PREVIEW_SOURCE` | no | The checkout to preview. Defaults to this repository, which must have no uncommitted changes. |
| `NEVORA_PREVIEW_TMP` | no | Where the database cluster goes. Defaults to `/private/tmp` on a Mac and the system temp folder elsewhere. `seed-extra.mts` must see the same value. |

## Run

```bash
export PREVIEW_OUT=/tmp/nevora-preview-1
node --import tsx scripts/ui-checks/preview-runtime.mjs        # wait for PREVIEW_READY, keep running
node --import tsx scripts/ui-checks/seed-extra.mts             # in a second shell
node scripts/ui-checks/login.mjs AUDIT-E AUDIT-LEAD AUDIT-ON AUDIT-BREAK AUDIT-LONG AUDIT-M QAOWNER
node scripts/ui-checks/checks.mjs --routes /app,/app/schedule --accounts AUDIT-E,AUDIT-M \
  --widths 320,390,844x390,1024,1440 --text 100,125,150,200 --browsers chromium,webkit
```

The options and their defaults are in the comment at the top of `checks.mjs`.

## Rules

- **One `checks.mjs` process per preview at a time.** Several in parallel stall the dev server and give false timeouts and 500s.
- Fictional data only. Never point these tools at a real database or real accounts.
- Firefox is out of scope for this release (Jose, October 19, 2026). Check Chromium and WebKit.
- The checks are read only. Anything that saves, sends or approves is tested separately, on a preview that can be thrown away.
