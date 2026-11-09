# Six-branch cloud validation — October 19, 2026

Each snapshot below was fetched from GitHub at Jose's requested commit, pinned in a detached cloud validation checkout, and kept separate from `codex/premium-backend`. The six remote tips matched the supplied commits when fetched. Their source stayed unchanged; no branch was pushed, merged or deployed. These results apply to these snapshots; the merged release candidate requires fresh checks.

## Results

| Snapshot | Commit | npm ci | Types | Lint errors / warnings | Default tests passed / failed | Production build |
|---|---|---|---|---|---|---|
| `claude/premium-phase-1` | `a62cc79` | Pass | Pass | 1 / 1 | 7,283 / 0 | Pass |
| `claude/p35-profile-6cdee8` | `be4a232` | Pass | Pass | 1 / 1 | 7,298 / 0 | Pass |
| `claude/p35-wave-a-1283c8` | `157e25f` | Pass | Pass | 0 / 1 | 7,283 / 0 | Pass |
| `claude/p35-wave-b-808dfd` | `b0e051a` | Pass | Pass | 1 / 1 | 7,283 / 0 | Pass |
| `claude/p35-wave-c-93e13c` | `e3a99fe` | Pass | Pass | 1 / 1 | 7,283 / 0 | Pass |
| `claude/p4-desktop-240fe0` | `578748d` | Pass | Pass | 1 / 1 | 7,283 / 2 | Pass |

Nonexecuted default cases, read from each assertion status rather than inferred from totals:

| Snapshot | Skipped | Pending |
|---|---|---|
| `a62cc79` | 801 | 55 |
| `be4a232` | 801 | 55 |
| `157e25f` | 801 | 55 |
| `b0e051a` | 801 | 55 |
| `e3a99fe` | 801 | 55 |
| `578748d` | 801 | 55 |

Five default suites passed. Desktop has the two UI test failures below. Skipped/pending cases are not counted as passing. The 55 pending cases come from `portal-native-installation-producer.postgres.test.ts`, a separate preparation fixture requiring a PG18.4 owned lease and pinned native source inputs; it was not activated. The known PostgreSQL failure below means none of these snapshots has an all-green release check.

## Default-suite failures: desktop UI tests

Only `claude/p4-desktop-240fe0` at `578748d` failed the default suite: **7,283 passed, 2 failed**. Both failures are in the shared preview test `src/components/ui-preview/home-preview-shell.test.tsx`: the desktop chat should coordinate its update with Claude’s coordinator.

1. **the preview sidebar is sidebarNavigation() for Owner, Manager and Employee, with Home lit**, line 17: `AssertionError: expected [ 'Home', 'Inbox', 'Schedule', …(6) ] to deeply equal [ 'Home', 'Inbox', 'Schedule', …(7) ]`. The shared-navigation equality checks above it pass; the later hard-coded Owner list still contains Requests and Employees.
2. **the Owner preview renders the D3 sidebar, the search button and the setup card with fictional gaps**, line 26: `AssertionError: expected 'aria-label="Primary navigation"><div …' to contain '>Employees<'`. Its hard-coded list also includes Requests.

D-4 deliberately folds Requests into Inbox and renames the people entry Team. `src/lib/navigation-sidebar.test.ts` already asserts the new nine-entry list. Claude should update both preview expectation lists to `Home, Inbox, Schedule, Updates, Team, Timecards, Insights, Payroll, Settings`, and include Requests among entries folded out of the sidebar. Preserve the role/shared-navigation, active Home, Search and setup-card checks. No UI code/test or navigation behavior was changed by Codex.

A focused, single-worker rerun of the preview file together with `src/lib/navigation-sidebar.test.ts` reproduced exactly **5 passed, 2 failed**. The navigation file passed; the same two preview expectations failed. These are deterministic UI expectation mismatches, not the earlier five-second load timeouts.

## Lint findings and ownership

- **UI, shared swap page:** `src/app/app/exchange/swap/page.tsx:51`, `react-hooks/immutability`, “Cannot reassign variable in async function” (`changedMidRead`). Present on Phase 3, Profile, Wave B, Wave C and desktop. **Wave A at `157e25f` fixes it and has zero lint errors.** The coordinator can integrate that existing UI fix; no UI file was changed by Codex.
- **UI, shared component warning:** `src/components/employee-weekly-confirmation.tsx:18`, `react-hooks/exhaustive-deps`: the cleanup reads `generation.current` after it may have changed. Present on all six snapshots. It is a warning, not an ESLint error.

## PostgreSQL results and exact failure

Executed `node scripts/phase-c-release-postgres.mjs` independently on every snapshot using PostgreSQL 17.11 and a fresh owned loopback cluster. **Each returned exit 1: foundation 274 passed, 1 failed, across nine files. Every owned cluster stopped.**

The one failing test on each snapshot is `src/test/integration/foundation.integration.ts > Task 11 generic fixture replacement preserves the upgraded schema catalog`, assertion at line 1092. Error: `AssertionError: expected ... to deeply equal ...`. The generic fixture installs migrations `0031_workspace_presentation.sql` and `0032_workspace_words_modules.sql`; the explicit comparison upgrade stops at `0030_notification_source_kinds.sql`, so its columns, constraints and indexes differ. This is a **shared backend test-fixture defect**, not a finding about employee data or production migrations.

The runner intentionally fails fast after foundation. To finish the independent SQL checks, a separate external helper ran the original four remaining commands against another fresh owned cluster on each snapshot: **authority 46 passed, generation 176 passed, exchanges 163 passed, notifications 77 passed**. Every supplemental runner returned 0 and stopped its cluster. Combined per snapshot: **736 passed, 1 failed (737 executed)**. The original release command remains red; supplemental passes do not override its failure.

The supplemental helper is an exact copy of the identical release-runner source on all six snapshots, with the already-executed foundation entry omitted and independent groups allowed to continue after any error while retaining a nonzero exit status. Database-prefix, ownership, loopback, timeout and cleanup checks are unchanged. Source/helper hashes and this two-edit provenance are recorded in `remaining-postgres-provenance.json`. No repository runner or test was changed. Separate Clocker/payroll/browser suites were not rerun on each snapshot; earlier backend-branch results remain separate evidence.

The fix already exists on `codex/premium-backend` in `22c4320`. That commit also expects the new Profile migration `0033`, so it must accompany the backend migration handoff. For a fixture-only correction on these UI snapshots before the backend lands, insert the following immediately after the existing upgrade loop and before `createGenericWorkspaceDatabase()` in this test:

```ts
for (const file of ['0031_workspace_presentation.sql', '0032_workspace_words_modules.sql']) {
  await upgrade.executor.query({ text: await readFile('db/migrations/' + file, 'utf8'), values: [] });
}
```

When the backend/Profile migration lands, include `0033_management_alert_preferences.sql` as the backend branch already does. The current backend branch passed all 737 release PostgreSQL tests; see README.md for that distinct run. No snapshot test was patched or weakened to get a pass.

## Commands and environment

Node 24.19.0, npm 11.9.0, Next 16.3.8; Linux cloud environment limited to four CPUs. Commands per checkout:

```sh
export npm_config_cache=/workspace/.npm
npm ci
npx tsc --noEmit -p .
npx eslint src
npx vitest run --maxWorkers=2
NODE_ENV=production npm run build
NEVORA_TEST_PG_BIN=/workspace/nevora-tools/postgres/usr/lib/postgresql/17/bin node scripts/phase-c-release-postgres.mjs
NEVORA_TEST_PG_BIN=/workspace/nevora-tools/postgres/usr/lib/postgresql/17/bin node /workspace/nevora-snapshot-evidence/2026-10-19/remaining-postgres-groups.mjs
```

ESLint and Vitest also used their JSON reporters to retain exact diagnostics/counts. Default suites and production builds ran sequentially. Original release PostgreSQL commands ran one at a time; supplemental SQL checks used at most two independent owned clusters concurrently. No application database binding or real delivery configuration was used; push flags were explicitly off and Next telemetry disabled.

The initial npm attempts failed because the home-directory cache was read-only. Retrying the same frozen install with the existing writable workspace cache succeeded on all six; lockfiles and dependency declarations are unchanged.

This container’s PID 1 leaves exited orphan processes as zombies. Unit/owned-database commands ran beneath a small local Linux `PR_SET_CHILD_SUBREAPER` wrapper, providing normal init-style reaping for only that invocation’s descendants. It only collects exited processes; it cannot kill live resources or turn a failing test command into success. A real orphan-reaping smoke check passed, a child deliberately exiting 7 still returned 7, and the unmodified process-cleanup regression tests passed in the full suites. This resolves the earlier baseline’s three container-only PID-existence failures without editing branch tests or increasing their timeouts.

Every recorded check includes its full commit, command, start/end time and exit status. Builds preserved the tracked Next-generated instruction/config files; every validation checkout ended clean. Evidence, the manifest and the exact orchestration/reaper helpers are retained at `/workspace/nevora-snapshot-evidence/2026-10-19/`, outside the repository.

## Other source observations and next gate

The pushed CODEX contracts match HANDOFF.md. Wave B additionally changes display wording in `src/lib/reports/insights.ts` and updates its test (“Recorded time”, “Scheduled vs recorded”). `periodInsights()` is consumed only by the report component’s “At a glance” section; no arithmetic/query/CSV serialization changes appear in that diff. Desktop changes navigation labels/holders and their tests. These observations do not approve payroll/legal wording or substitute for visual inspection.

Cloud Codex owns this validation evidence and the backend fixture fix; Claude’s coordinator owns integrating the existing Wave A lint fix and UI warning remediation. Source changes for backend features remain on `codex/premium-backend`, outside these snapshots. After the fixes/backend wiring are integrated, Jose can push the next snapshots or merged release candidate for fresh checks. These results do not close joint browser, submission, physical-device or independent inspection gates.

## Full commit identities

| Branch | Full commit |
|---|---|
| `claude/premium-phase-1` | `a62cc79addc2f14fe6b21877d30123c5e0f8eba2` |
| `claude/p35-profile-6cdee8` | `be4a232a1e6a26b58314ff549f88e5a8a79e82c6` |
| `claude/p35-wave-a-1283c8` | `157e25f7dab7a21542f54722746b237dc7b52afc` |
| `claude/p35-wave-b-808dfd` | `b0e051a951642ff34692604147fcd76ba805a3e7` |
| `claude/p35-wave-c-93e13c` | `e3a99fe7b6cda3c3b8049ff62f0de376d710b58f` |
| `claude/p4-desktop-240fe0` | `578748d705b941d14f37c0b01bfcfb1332343e31` |
