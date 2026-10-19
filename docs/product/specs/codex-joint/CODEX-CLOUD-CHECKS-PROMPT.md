# Codex, in the cloud: run the screen checks on every branch

You're Codex, working in the cloud on NEVORA (`JoseK0514/NEVORA`, Next 16 / React 19, Postgres). Claude owns the UI and is rebuilding every screen in six parallel chats on Jose's Mac. Production release is **October 20, 2026**. The Mac is overloaded, so you're taking over the automated screen checks. Claude's chats keep fixing the screens; you find what's still wrong and report it.

## Rules

- Push only your own branch, `codex/premium-backend`. Never push to a `claude/*` branch, never merge, never deploy.
- **Don't edit UI files** (`src/components/**`, page JSX in `src/app/app/**`, any `.css`). Report UI failures; the chat that owns the page fixes them.
- If a failure is backend (a 500, a wrong number, a failed read that isn't load), fix it on your branch with a test, as before.
- Fictional data only. The preview blocks every request to another host. Never print or commit the preview password; it's only in `access.json`.

## Setup

1. Check out `claude/premium-phase-1` at `2ab131b` or later into a folder of its own (the **tools checkout**). Read `scripts/ui-checks/README.md`. Run `npm ci`.
2. Install PostgreSQL 16 or later. Set `PG_BIN` to its `bin` folder if `pg_config` isn't on `PATH`.
3. Install Playwright with Chromium and WebKit in a separate folder (`npm i playwright && npx playwright install --with-deps chromium webkit`), and set `PLAYWRIGHT_RUNTIME_ROOT` to that folder's `node_modules`.
4. For each branch below, check it out cleanly into its own folder and point `PREVIEW_SOURCE` at it. The fixtures come from the tools checkout; the screens come from `PREVIEW_SOURCE`.

```bash
export PREVIEW_OUT=/tmp/nv-<branch>  PREVIEW_SOURCE=/work/<branch-checkout>
node --import tsx scripts/ui-checks/preview-runtime.mjs     # background; wait for PREVIEW_READY
node --import tsx scripts/ui-checks/seed-extra.mts
node scripts/ui-checks/login.mjs AUDIT-E AUDIT-LEAD AUDIT-ON AUDIT-BREAK AUDIT-LONG payroll-qa-a payroll-qa-b AUDIT-M QAOWNER
```

You may run several previews side by side, one per `PREVIEW_OUT`, if the machine has the cores. **Run only one `checks.mjs` at a time per preview**; parallel runs on one preview cause false timeouts and 500s.

## Branches

| Branch | Pages it owns |
|---|---|
| `claude/premium-phase-1` | Employee and Lead pages, the shared kit and shell |
| `claude/p35-profile-6cdee8` | Owner and Manager Profile |
| `claude/p35-wave-a-1283c8` | Shift forms, Coverage, Copy week, manager Time off, Shift requests, Availability, Team member, New employee, Clocker PIN, Swap and Unable to work |
| `claude/p35-wave-b-808dfd` | Insights, Templates, Scheduling rules, Updates (detail and compose), Payroll settings and runs |
| `claude/p35-wave-c-93e13c` | Settings and every Settings page, Account recovery, Clocker recovery |
| `claude/p4-desktop-240fe0` | Desktop layout (768 and up) of Manager and Owner pages, then Employee and Lead |

Use each branch's latest pushed commit and record it in your report. The chats push as they finish rounds, so expect newer commits during the day.

## What to run on each branch

**Routes:** every page under `src/app/app/**/page.tsx`, plus `/login`. For a dynamic segment (`[id]`), use a real ID from the seeded database. Check each route with every account that can open it:
- Employee pages: `AUDIT-E`, `AUDIT-LEAD`, `AUDIT-LONG` (long name), `AUDIT-ON` (clocked in), `AUDIT-BREAK` (on break), `payroll-qa-a`, `payroll-qa-b`
- Manager pages: `AUDIT-M`
- Owner pages: `QAOWNER`

**Matrix:**
- Widths `320,360,390,430,844x390,768,1024,1440`
- Text `100,125,150,200`
- Browsers `chromium,webkit`. Firefox is out of scope for this release.
- Add `--axe` on a second run at `390,1440` with text `100`.

```bash
node scripts/ui-checks/checks.mjs --routes <comma list> --accounts <one account> \
  --widths 320,360,390,430,844x390,768,1024,1440 --text 100,125,150,200 --browsers chromium,webkit
```

**Large data, once, on `claude/premium-phase-1`:** start a second preview, seed it with `--large` (200 people, 50 shifts a day, a year of time entries), and run the matrix as `AUDIT-M` and `QAOWNER` on Home, Inbox, Schedule, Team, Timecards, Time exports and Insights. Also record each page's load time at 390 and 1440.

## Report

Write `docs/product/specs/codex-joint/CLOUD-CHECKS.md` on `codex/premium-backend` and push it after each branch, so Jose and Claude can read results as they land. For each branch:
- the commit checked, and the counts of runs passed and failed
- a table of every failure: route, account, width, text size, browser, check (overflow, small text, target, layout shift, error, axe), and the detail line from `checks.mjs`
- for each failure, **UI** (name the owning chat from the table above) or **backend** (what you fixed, branch and commit)
- timeouts and 5xx caused by load, listed separately and re-run once before counting them

Commit the raw JSON from `$PREVIEW_OUT/checks/` next to the report, under `docs/product/specs/codex-joint/cloud-checks/<branch>/`.

## Tonight

When Jose says the branches are merged into `claude/premium-phase-1`, run the full matrix again on the merged branch, plus `npm run build`, the full vitest suite, `tsc --noEmit` and lint. That's the release candidate check.
