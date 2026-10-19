# Release merge rehearsal, October 19

Two **local-only scratch branches**; neither was pushed, no shared branch was merged, no deployment occurred. Both source trees are clean after checks, including restoration of Next-generated input files.

- Initial scratch `codex/release-rehearsal-20261019`: `61bb34b31548432d8440dee28e7b66b2fb6192ea`. This includes backend `360e659`, then current when the full matrix was frozen.
- Corrected scratch `codex/release-rehearsal-corrected-20261019`: `64193ae3a1eb74bb55c0a54702edefc67d3eb100`. Merges backend through `c94d17c` (production-erased synchronous capture gate and fresh setup migration fix).
- These are the six snapshot heads supplied by Jose, not tonight’s still-changing final release candidate. Re-run the full required matrix when Jose identifies the final pushed/merged SHA. Local evidence does not close hosted or independent release gates.

## Exact branch inputs and conflicts

| Branch | Snapshot |
|---|---|
| claude/premium-phase-1 | a62cc79addc2f14fe6b21877d30123c5e0f8eba2 |
| claude/p4-desktop-240fe0 | 578748d705b941d14f37c0b01bfcfb1332343e31 |
| claude/p35-profile-6cdee8 | be4a232a1e6a26b58314ff549f88e5a8a79e82c6 |
| claude/p35-wave-a-1283c8 | 157e25f7dab7a21542f54722746b237dc7b52afc |
| claude/p35-wave-b-808dfd | b0e051a951642ff34692604147fcd76ba805a3e7 |
| claude/p35-wave-c-93e13c | e3a99fe7b6cda3c3b8049ff62f0de376d710b58f |
| codex/premium-backend | 360e659 initial, then c94d17c corrected |

Merge order is the table order. **All five UI branch merges conflicted only in `src/app/app/portal-premium.css`.** Each resolution kept the exact Phase 3 a62cc79 version as Jose instructed; final blob `362a0f1126502aa4329888b04b9fc039f4f27b1e` matches. No manual UI JSX/test resolution was made. Both backend merges were conflict-free. Other UI changes remain the branches’ own content. Claude must inspect the combined visual result; preserving that stylesheet is a requested resolution, not independent visual acceptance.

## Check matrix

All commands used locked dependencies, Node 24.19.0/npm 11.9, existing test timeouts and bounded default Vitest workers=2. The Linux subreaper wrapper reaps exited owned descendants without changing assertions or application behavior. Full command/exit/SHA/clean-status JSON is retained with logs outside git.

| Check | Initial 61bb34b | Corrected 64193ae |
|---|---|---|
| npm ci | Pass | Pass |
| npx tsc --noEmit -p . | Pass | Pass |
| npx eslint src | 0 errors, 1 existing warning | 0 errors, 1 existing warning |
| Full npx vitest run --maxWorkers=2 | 7,344 passed, 2 failed | 7,344 passed, same 2 failed |
| npm run build | Pass, real production artifact | Pass, real production artifact |
| npm run test:dev:production | **Failed: source-map capture marker retained** | **Pass, 2277 artifacts scanned, all markers absent** |
| node scripts/phase-c-release-postgres.mjs | **737 passed** (275 foundation + 46 authority + 176 generation + 163 exchanges + 77 notifications) | Not repeated on this SHA |
| node scripts/phase-c-clocker-postgres.mjs | **520 passed, 35 files** | Not repeated on this SHA |
| node scripts/payroll-postgres.mjs | **36 passed** | Not repeated on this SHA |
| Clocker runner + vitest.management-profile-integration.config.mts | **10 passed** | Not repeated on this SHA |
| Clocker runner + vitest.six-findings.config.mts | **15 passed** | Not repeated on this SHA |
| node scripts/premium-release-postgres.mjs | **2 passed** (pool + swap) | **4 passed** (adds fresh company Profile + migration reversal/reapply) |

Each default suite also reports **801 skipped plus 55 pending**; the 55 pending native-preparation cases remain gated by their separate PostgreSQL 18.4/source-custody prerequisites. SQL tests are separate from default Vitest. Initial SQL total is **1,320 passed executions**; do not attribute that whole total to the corrected SHA. The corrected variant re-runs the affected default/build/erasure gates and targeted SQL tests. Its full release/Clocker/payroll matrices still need the final exact-candidate run; the older SQL results are traceable evidence, not a waiver or a green result for a different SHA. Every owned cluster reported stopped.

## Failures and exact owners

**Claude Desktop/coordinator:** the two remaining failures in both candidates are unchanged:

1. `src/components/ui-preview/home-preview-shell.test.tsx:17`, “the preview sidebar is sidebarNavigation() for Owner, Manager and Employee, with Home lit”: expected old ten labels, received nine.
2. Same file `:26`, “the Owner preview renders the D3 sidebar, the search button and the setup card with fictional gaps”: expected `>Employees<`, while D4 calls it Team.

Update the shared preview’s explicit expected Owner/Manager label arrays to the approved navigation: Home, Inbox, Schedule, Updates, Team, Timecards, Insights, Payroll, Settings; update the Employees assertion to Team. Retain the canonical sidebarNavigation equality, role handling and active-Home checks. Do not delete those assertions or revert the approved navigation to pass. See [the earlier snapshot report](SNAPSHOTS-2026-10-19.md) for the focused reproduction. No UI test/component was edited here.

The existing warning is `src/components/employee-weekly-confirmation.tsx:18`, ref cleanup/exhaustive-deps; owner shared UI. The known swap-page immutability lint error is resolved by the merged Wave A branch.

**Codex, fixed:** the initial production-absence failure was `.next/server/chunks/src_lib_067bhyc._.js.map` retaining the statically imported capture gate’s env marker. `3130f4f` uses a conditional synchronous CommonJS gate with declarations, erased by the production constant. It also avoids the raw tsx/CJS top-level-await failure. The new raw CLI import regression and capture/gate tests passed **48 tests**; corrected scratch production absence passes. Do not cherry-pick `360e659` without `3130f4f`.

**Codex, fixed:** fresh `setup:company` omitted 0033 and returned an unavailable Owner Profile. `c94d17c` adds the migration. The new test was observed red before the fix (expected ready, received unavailable), then green using the real setup on a fresh owned database. A second test proves migration reapplication preserves choices, a failed downgrade rolls back atomically, and dropping/reapplying loses opt-outs. The exact inverse SQL belongs only in the reviewed [runbook](DEPLOY-RUNBOOK.md); normal app rollback leaves 0033 installed.

## Evidence and release boundary

Raw per-command logs/JSON and Vitest/ESLint JSON: `/workspace/nevora-release-evidence/2026-10-19/rehearsal/` and `rehearsal-corrected/`. Merge conflict/commit records: `merge-records.json`; source custody script/progress logs are adjacent. No captures, credentials or database dumps are committed.

**Release remains blocked by the two UI test failures and the mandatory final exact-SHA/hosted/independent gates.** Production flags/project metadata are separately unverified because Vercel tools are not exposed here. Manager Schedule/count load risks remain in [the load report](LOAD-2026-10-19.md). The scratch branches remain local for inspection; final integration is Jose/Claude’s decision, and tonight’s final push must be revalidated rather than inheriting these snapshot results.
