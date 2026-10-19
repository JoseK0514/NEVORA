# Cloud backend handoff

Base: `claude/premium-phase-1` at `21c4525`. Work branch: `codex/premium-backend`, isolated cloud worktree `/workspace/NEVORA-premium-backend`. Jose authorized pushing this backend branch. No PR, merge into shared branches, deployment, real-person data or external delivery. Cloud release follow-up is recorded below; the Mac previews remain untouched.

Latest six-branch snapshot checks: [October 19 validation matrix, failures and exact fixes](SNAPSHOTS-2026-10-19.md). The initial baseline evidence below remains separate from this later push.

## 1. Initial branch validation

A separate detached worktree at `21c4525` keeps shared-branch results independent of backend edits. Node 24.19.0, npm 11.9.0. `npm ci` and `npx tsc --noEmit -p .` passed. `npx eslint src` reproduces the known UI-owned swap-page error at line 51 (`react-hooks/immutability`: “Cannot reassign variable in async function”) and the existing effect-cleanup warning in `employee-weekly-confirmation.tsx`. Wave A owns the error; neither UI file was edited.

| Branch / revision | Default Vitest | Types | Lint |
|---|---|---|---|
| `claude/premium-phase-1` / `21c4525`, unmodified | 7,278 passed, 5 failed, 801 reported skipped | Pass | Known UI error above |
| `codex/premium-backend` / `22c4320` | 7,328 passed, 0 failed, 801 reported skipped | Pass | Same UI error; changed backend files pass |
| `claude/p35-profile-6cdee8` | Not pushed at the initial run | Not run then | Not run then |
| `claude/p35-wave-a-1283c8` | Not pushed at the initial run | Not run then | Not run then |
| `claude/p35-wave-b-808dfd` | Not pushed at the initial run | Not run then | Not run then |
| `claude/p35-wave-c-93e13c` | Not pushed at the initial run | Not run then | Not run then |
| `claude/p4-desktop-240fe0` | Not pushed at the initial run | Not run then | Not run then |

The five baseline failures, with ownership/disposition:

1. `src/test/phase-e-process.test.ts`, **a short graceful timeout stops detached Next/browser process resources and fails**: `AssertionError: expected [Function] to throw an error`, line 48.
2. Same file, **a short forced timeout stops detached Next/browser process resources and fails**: the same assertion, line 48.
3. Same file, **a short forced-title-worker timeout stops detached Next/browser process resources and fails**: the same assertion, line 45.
4. `src/lib/tenancy/migrations/typed-guarded-backfill.server.test.ts`, **whole-plan typed executor fictional transport lifecycle > locks all70 source/sidecar tables before transaction MVCC/protocol reads and applies only compiler metadata**: `Test timed out in 5000ms`.
5. Same suite, **identical complete retry does no DML and retains original manifest**: `Test timed out in 5000ms`.

Items 1–3 were test-environment defects: this Linux container's PID 1 retains exited orphan processes as zombies, so `kill(pid,0)` alone does not prove a running resource. `22c4320` requires either ESRCH or a positively identified zombie and includes a live-process rejection control. Production cleanup code is unchanged. Items 4–5 passed in the isolated 80-test regression run and the final whole suite at the existing timeout; no timeout or assertion was relaxed. The final default command used `npx vitest run --maxWorkers=2 --reporter=json` to bound cloud process contention. PostgreSQL tests are separate from the default skip list.

PostgreSQL 17.11 was installed under `/workspace/nevora-tools/postgres` using packages authenticated by Debian's signed package index; no system package or real database was changed. Owned runners create loopback clusters and tear them down. Set `NEVORA_TEST_PG_BIN=/workspace/nevora-tools/postgres/usr/lib/postgresql/17/bin` when using them in this cloud machine.

The **unmodified base** release-PostgreSQL command failed its first foundation group: **274 passed, 1 failed**. Failure: `foundation.integration.ts > Task 11 generic fixture replacement preserves the upgraded schema catalog`, line 1092, `expected ... to deeply equal ...`. Its explicit upgrade path stopped at migration `0030`, while the generic fixture already installed `0031`/`0032` (including workspace-presentation tables). The runner then stopped by design, so the other four base groups are not reported as run. `22c4320` aligns the explicit comparison path with `CURRENT_MIGRATIONS`, including the new `0033`; the complete backend-branch release run passes all five groups. This is backend test-fixture maintenance, not a production schema downgrade.

## 2. Own Owner/Manager Profile and alert choices

Implemented `readManagementProfile(proof, executor?)` and `saveManagementAlertChoice(proof, value, executor?)` in `src/lib/data/management-profile.server.ts`, with the public types in `src/lib/management-profile.ts`.

- `GET /api/management/profile`: the agreed contact, active locations, role-specific alerts, database `observedAt`, and session-bounded `validForMs`. Owner scope is all; Manager scope uses the existing administrative-scope storage, including legacy all-company behavior. Empty locations and missing contact values are valid. No employee selector is accepted. Signed out is 401; Employee/Lead or lost authority is 403; storage failure is the agreed 200 unavailable snapshot. Private responses are not cached.
- `POST /api/management/profile/alerts`: exact `{topicId,on}`, same-origin/custom-header protection, own-account authority before and after the write, idempotent per-topic JSONB updates on the employee row. Independent concurrent topic saves do not overwrite one another. The second authentication read's session-expiry redirect is translated to 401.
- Apply **`db/migrations/0033_management_alert_preferences.sql`** before using these endpoints. This additive migration persists choices and applies them centrally to notification inserts without altering intent IDs or business write results. Opted-out notifications remain cancelled audit rows. Saving an opt-out also cancels pending deliveries; opting back in enables future messages without resurrecting old ones. Mixed manager summaries retain enabled members. Employees and Leads retain existing behavior. The clock-review choice does not invent a new clock notification producer; it handles explicitly typed review events when produced.
- Contract wording matches the supplied draft. Jose approved the drafted topics and wording on October 19, including Owner “Payroll ready to review” when payroll is enabled (Owner five topics, Manager four). No existing payroll/legal wording was changed. Owners retain five rows; payroll-ready is off while payroll is disabled. Managers have four.

Review hardening: preferences are stored atomically on the employee record, and notification delivery/source reads recheck the current choice. This prevents an uncommitted producer from escaping an opt-out sweep. Existing legacy list/count exports exclude specifically preference-suppressed rows; ordinary cancellation history retains its prior behavior. Both current JSON and legacy colon summary keys are supported. The migration has not been published or applied outside owned test databases.

Validation: 14 unit/HTTP-contract tests passed, including second-authentication-read expiry. The final `management-profile.integration.ts` run passed 10 actual PostgreSQL tests, including installed Manager scope, empty locations, expired sessions, concurrent saves, per-person suppression, mixed summaries, a two-connection producer/opt-out race, cancellation of an actual queued push-delivery row, and the request-fact authority/terms tests below. Targeted ESLint, final type checking and the full default suite passed. Run the database tests with the existing owned runner and `vitest.management-profile-integration.config.mts`.

Claude: wire the Profile session to the exact endpoints and response already specified in HANDOFF.md. Preserve the existing session-derived name/role and company reads. Refresh GET after saves. The migration must land with the backend before the UI integration. No component/page/CSS changes were made here. Joint browser checks remain Claude's next gate.

## 3. Dev-only error inspection

Implemented `src/lib/dev/inspection.server.ts` and strict loopback/request gates. Run a development server bound to `127.0.0.1` with `NEVORA_DEV_FORCE_ERRORS=1`. Set the host-only cookie `nv-force-error` with `Path=/` (DevTools or Playwright), then:

| Value | Open | Boundary |
|---|---|---|
| `root` | `/dev-inspect` | Root segment's existing error screen |
| `portal` | `/app/dev-inspect` while signed in | Existing in-portal error page |
| `global` | Any page | Root layout/global boundary |
| `home-read` | `/app` as Owner/Manager | Existing dashboard-read failure |

Remove the cookie before retrying. The two probe pages contain only server logic and no JSX; without the matching enabled cookie they return 404. The only layout hook is a non-JSX line in the root layout. No existing portal page/layout or error-screen JSX was edited. Home's hook is in its backend reader. Next's development error overlay may need dismissal during visual inspection; rendering the existing boundaries in the actual Mac preview remains Claude's joint check.

Gate tests cover every value, no flag, production, exact IPv4/IPv6 loopback hosts, external origins and forwarded requests. The final `npm run test:dev:production` check built with production NODE_ENV **and both dev flags deliberately set**, scanned **2,256 artifacts**, and found every switch/capture marker absent. It includes source maps and caches. The initial run correctly failed because Turbopack's filesystem cache retained original erased sources; `next.config.ts` now uses its supported `turbopackFileSystemCacheForBuild:false` option. Fresh output passed. This changes build caching only. The runner preserves tracked Next-generated files and refuses an active dev-build lock.

An actual development HTTP smoke run on the cloud's own `127.0.0.1:3347` server verified: no cookie → 404, `root` → 500, `global` → 500, and `root` plus an external `X-Forwarded-For` → 404. The server was stopped afterward and tracked Next-generated files restored. Portal/Home visual and authenticated checks remain on Claude's Mac.

## 4. Local email and push capture

Implemented `src/lib/dev/capture.server.ts`, conditionally loaded by the recovery factory and push provider only outside production. Enable a loopback-only development preview with:

```sh
NEVORA_DEV_CAPTURE_DELIVERY=1
NEVORA_DEV_CAPTURE_OUT=<absolute PREVIEW_OUT>/captures
FUEL_PORTAL_ORIGIN=http://127.0.0.1:<preview-port>
```

Export those variables when launching the preview and its local worker. Recovery uses the real Nodemailer stream transport and writes `email/<random-id>.eml`; push writes `push/<random-id>.json`. Files are created exclusively with mode 0600 under mode-0700 directories. Captured push includes display payload/options and omits endpoint, subscription/VAPID keys and environment contents. Captures can contain private recovery proofs: keep the folder outside the repository and never print or commit it.

Local push workers retain the existing test-environment/account allowlist, enrollment, subscription-encryption and source-authority requirements. With a valid configured local capture folder, `readNotificationConfig` enables outbound capture for an already enabled, explicitly scoped **test** runtime; it never enables a production environment or unscoped worker. Keep normal test enrollment keys and `PUSH_TEST_ACCOUNT_IDS` in the preview's secure runtime configuration. Requested capture with invalid local configuration fails closed instead of falling through to a real transport. Flag-off production delivery is unchanged. No real delivery has been attempted.

Request provenance is checked as well as configured origin: the recovery route passes its actual headers into the deferred delivery factory, and internal worker routes carry the initiating headers to the sender. Remote/forwarded requests or missing context fail closed. The manual `notifications:worker` script supplies a distinct local-CLI context only when it is the directly invoked entry point, with the same loopback capture configuration and explicit test-account scope. The capture binding travels with the runtime configuration, so an injected configuration cannot accidentally select the ambient network transport. Regression tests cover injected capture settings with the ambient flag absent, remote headers and missing provenance.

Tests capture an actual buffered `.eml` through `recoveryDelivery()` and a JSON push through `createPushSender()`, assert no provider transport call, exercise production/flag/origin/path gates, and preserve the existing provider timeout/status suite. The final focused delivery/auth/worker/config run passed 77 tests across seven files; all are also in the passing full default suite. Production-erasure verification covers capture markers too. Claude: enable the preview environment above and render the local captured messages like screens; no UI transport wiring is required.

## 5. Remaining agreed projections

Implemented additive projections without changing the existing decisions or units:

- **Inbox count:** `readInboxCount(proof, executor?)` in `src/lib/data/inbox-count.server.ts` and `GET /api/manager/inbox-count`. Owner/Manager only; exact `needsYou(actions.items,today.today,today.missed).count`. Both private sources must succeed and remain current, with final session verification. Failed/partial sources return unavailable rather than zero. Claude: fetch this private endpoint for the sidebar/phone badge; render no badge while unavailable. The endpoint requires no actor selector and rejects query selectors and cross-site fetches.
- **Desktop request detail:** optional `request` facts on action-center items, populated by `withActionRequestFacts` in one batch for the IDs already in the actor's action read. The batch verifies the live session and administrative location scope. It returns dates, partial-day times, length, location, note and a fixed review destination. Exchange/callout facts are omitted if live terms differ from the request's captured terms; the existing full-review link remains the fallback. `parseActionCenter()` validates the added object before client consumption. Claude: render these facts when present; keep decisions on the full review until Jose approves moving them (O1).
- **Wave A C1:** `listTeamTimeOffRequests()` now includes the same optional `reviewedAt`/`reviewerName` projection as the employee timeline, preserving requests with a LEFT JOIN. Claude: wire the decision timeline to these fields.
- **C2:** coverage repair targets now include numeric `count` for STAFFING, LEAD and POSITION, and `positionName` for POSITION. Existing labels remain intact. Claude can retire sentence parsing when wiring the numeric fields.
- **C3:** newly persisted copy receipts include `employeeName`, destination `date`, `startTime`, `endTime`, and `locationName` for every outcome, including skipped rows. Fields are optional/nullable for historical receipts and unavailable source metadata; no fake labels or backfill from changed live rows. The receipt retains those facts across lost responses/retries. Claude: use the fields when present and retain a fallback for older receipts.
- **C4:** decimal scheduled/target/needed hours are unchanged. No unit conversion contract was introduced.
- **D-5:** existing action behavior already returns to the originating Inbox/filter and drops `item=` to select the next remaining request. Its existing action tests, including fixed destination validation, passed; no duplicate redirect logic was added.

The targeted projection/action-center/Profile run passed 212 tests across 12 files; later parser/capture tests also passed. Actual PostgreSQL tests now cover request facts under Owner versus restricted Manager scope and changed exchange/callout terms; final results follow below. The existing persisted-copy/lost-response integration test additionally asserts descriptive receipt fields.

Unspecified/product-dependent section-2 proposals (a separate Attendance page, employee no-punch read, alternate timecard navigation, broader notification context) have no complete agreed new API here and remain proposals. Wave B report-definition rewrites and payroll/legal wording remain with Jose. Wave B/C submission, expiry, export/document rendering, physical-device, large-data and browser inspections stay joint work; the underlying database suites are recorded separately below.

## 6. Review of Claude's server changes

Two read-only review axes (repository standards and the supplied contract) examined `d462f54` and its consumers. The additive time-off fields and LEFT JOIN preserve request rows and omit a withdrawal's own reviewer name. A wider additive effect: shared `mapRequest()` also exposes `reviewedAt` from `getTimeOffRequest()`, whose query selects `r.*`. The narrow pay-calendar SQL reads only the effective schedule and workspace date and checks payroll-enabled before querying.

Confirmed and fixed P2: `openPeriod()` compared the **end** of monthly/semimonthly periods with `anchorDate`, so an anchor of `2026-10-20` and today `2026-10-19` incorrectly returned a period/payday. Both cases were reproduced, then two regression tests were observed failing before the fix. Calendar periods now require their start to meet the rollout boundary, matching the existing due-period implementation and `docs/payroll-backend-handoff.md`. Tests cover before the anchor, the incomplete rollout period after it, and the first complete period. All 5 open-period tests passed. This repairs the new display read; it changes no paid amounts, exports or payroll/legal wording.

The display changes are present at `21c4525`: `durationText()` is used by the timecard and employee duration formatters, and unavailable schedule days render an en dash. Formatter consumers include timecards, export-selection summaries and report insights. **CSV serialization does not use these formatters:** reports emit raw nanoseconds; payroll export uses raw canonical fields or dedicated `decimalHours()` and explicit rounding policy. Payroll PDF/payment artifacts use approved run amounts. No numeric export/calculation change was found by source tracing. The default payroll/export tests, 36 configurable-payroll database tests, and Clocker payroll-export/report database suites supply regression coverage; see the final matrix below.

Implementation owner: cloud Codex. UI wiring/joint inspection: Claude coordinator and the owning chat. Release impact: no production authorization; implementation and local verification do not close independent inspection or real-device gates.

## 7. Commits, verification and next gate

These implementation commits are on `codex/premium-backend`, pushed with Jose’s authorization; later item commits are recorded below. The implementation is split for review:

| Item | Commits | Main files |
|---|---|---|
| Own Profile and saved/delivered alert choices | `ff845d4`, `0295afb` | `management-profile.ts`, `data/management-profile.server.ts`, the two management Profile routes, migration `0033`, notification state/source reads |
| Local error probes and capture, production absence | `2d74622` | `lib/dev/*`, the zero-JSX probe pages, root layout hook, dashboard read, recovery factory, push provider, `next.config.ts`, `scripts/verify-dev-production-absence.mjs` |
| Capture provenance and injected runtime binding | `e42eea5` | recovery route/factory, notification config/provider/worker, internal worker routes and CLI entry point |
| Reviewed payday boundary defect | `9c7951f` | `payroll/calendar.ts`, `payroll/open-period.test.ts` |
| Inbox/request facts and Wave A C1–C3 | `8f341e8` | `data/inbox-count.server.ts`, Inbox route, `data/action-request-facts.server.ts`, action-center service/parser, requests/coverage/copy projections |
| Owned test portability and current migration catalog | `22c4320` | `phase-e-process.test.ts`, `integration/local-postgres.ts`, `integration/foundation.integration.ts` |

Final verification on the backend branch:

| Check | Result |
|---|---|
| Default `npx vitest run --maxWorkers=2` | 7,328 passed; 0 failed; 801 reported skipped |
| `npx tsc --noEmit -p .` | Passed |
| `npx eslint src` | Known UI error and warning recorded in section 1; changed backend files pass targeted ESLint |
| `npm run test:dev:production` | Actual production build passed; all 2,256 artifacts clear of dev markers |
| `node scripts/phase-c-release-postgres.mjs` | 737 passed: foundation 275, authority 46, generation 176, exchanges 163, notifications 77 |
| Owned runner + `vitest.management-profile-integration.config.mts` | 10 passed |
| Owned runner + `vitest.configurable-payroll-integration.config.mts` | 36 passed |
| Owned runner + `vitest.six-findings.config.mts` | 15 passed, including persisted copy-receipt retry facts |
| Owned runner + `vitest.clocker-integration.config.mts` | 520 passed across 35 files; includes attendance, manager scope, recovery, timecards, report/CSV and payroll exports |

The extra database suites use `node scripts/phase-c-clocker-postgres.mjs <config>` with `NEVORA_TEST_PG_BIN` above. **All 1,318 backend-branch PostgreSQL test executions passed.** No existing database was selected; every runner reported its owned cluster stopped. Raw logs/JSON are in `/workspace/nevora-backend-evidence/` outside the repository; the report contains the durable result summary. Two read-only source/contract reviews of `22c4320` found no remaining material findings after the hardening commits.

Coordinator next steps: review these local commits, arrange the backend/migration handoff when Jose requests it, wire the endpoints/fields described above, enable local flags only at each preview's next round break, then run the authenticated/browser/submission inspections. The six newly pushed snapshots are now checked separately below; future snapshots and the merged release candidate need fresh checks. Jose approved the Profile topic wording. O1 is not approved: Inbox decisions stay on the full review page. No production release, independent inspection sign-off, or physical-device approval is claimed.

## 8. All six pushed snapshots: October 19

All six exact commits supplied by Jose passed `npm ci`, TypeScript and a production build. Five default suites passed: Profile had 7,298 passing tests; Phase 3 and Waves A/B/C each had 7,283. Desktop had **7,283 passed, 2 failed** in the UI preview's old sidebar-label expectations. A focused rerun confirmed the same two failures while the navigation tests passed; Claude owns that test update.

Wave A has zero lint errors. The other five snapshots retain the known swap-page immutability error already fixed on Wave A; all six have the existing effect-cleanup warning. Each snapshot's PostgreSQL checks executed all five release groups across the original and supplemental runs: **736 passed, 1 failed**. The common catalog-comparison fixture omits migrations `0031`/`0032`; the existing backend fix is in `22c4320`, and the detailed report supplies a fixture-only patch for snapshots that do not yet include Profile migration `0033`.

See [the full report](SNAPSHOTS-2026-10-19.md) for exact commits, every failure and its owner, commands, skipped/pending counts, environment/reaper evidence, supplemental SQL provenance and remaining gates. Snapshot application code and tests stayed unchanged. This task changed only this README and the new snapshot report on the backend branch.


## 9. A1: cloud swap reproduction and fictional seed repair

**Result:** data refusal reproduced on actual owned PostgreSQL 17.11; no server eligibility rule was weakened. New regression: `src/test/integration/premium-swap-seed.integration.ts`. Runner: `NEVORA_TEST_PG_BIN=<local pg bin> node scripts/premium-release-postgres.mjs`. It creates a new marked loopback database, installs current migrations and stops its own cluster afterward. The first two setup attempts failed (wrong runner database prefix, then a missing fixture phone); both were corrected before the passing run.

The original seeder was absent when the initial reproduction ran. A later coordinator merge supplied its mirror as `scripts/ui-checks/seed-extra.mts` and the base `scripts/ui-checks/preview-runtime.mjs`. Source inspection now confirms the same missing rows: the base AUDIT accounts and extra `person()` helper insert credentials, location eligibility and qa-pos qualification, but neither inserts availability windows or employee scheduling settings/rule profiles. Thus both AUDIT-E and Riley lack those inputs in this seed, matching the tested `OUTSIDE_AVAILABILITY` plus ten `RULE_UNVERIFIABLE` refusals. Live Mac database contents were not selected or changed.

Fixture: AUDIT-E has five next-week weekday shifts at loc-1, qa-pos, 08:00–16:00, assignment_origin MANAGER; Riley Rivera (AUDIT-SWAP) has only `x-swap-5`/`x-swap-6` on Saturday/Sunday. Week is published through `publishScheduleWithRevision()`. Both are active and have loc-1/qa-pos eligibility. Policy is AUTOMATIC_WHEN_VALID with both advances zero.

Exact observations:

- `listSwapTargets()` returns both weekend shifts. `readShiftChangeTerms()` returns both current terms; `matchesDisplayedShift()` is true for the source and targets. Episode/revision defaults and the publication snapshot are not the refusal in this fixture.
- Without availability/rule rows, evaluation includes `OUTSIDE_AVAILABILITY` and `RULE_UNVERIFIABLE`; availability returns `{allowed:false, refusal:'review', notice:'Needs Owner rule review'}`.
- After adding only availability, the ten remaining unverified-rule issues are `minimumRest`, `maximumShift`, `maximumDaily`, `breaks`, `projectedOvertime` for **each receiving employee**. A workflow policy does not configure these employee rule profiles.
- With explicit fictional profiles, **both** `PROPOSE_SWAP` checks return `allowed:true`. The test uses the same terms/availability checks as the page, submits a stored proposal, accepts it as Riley, and verifies the two employee IDs exchanged in SQL. No actual browser/page-render claim is made by this integration test.

Coordinator’s exact seed additions (fictional databases only; do not use as customer defaults):

```ts
import { fictionalProfile } from '../../src/test/fixtures/shift-changes.ts';
// Resolve this import relative to the actual seeder location/source checkout.
await q(`INSERT INTO availability_windows
  (id,employee_id,day_of_week,start_time,end_time)
  SELECT 'audit-swap-availability-'||e.id||'-'||d,e.id,d,'08:00','16:00'
  FROM employees e CROSS JOIN generate_series(0,6) d
  WHERE e.id IN ('AUDIT-E','AUDIT-SWAP')
  ON CONFLICT(id) DO UPDATE SET start_time=excluded.start_time,end_time=excluded.end_time`);
await q(`INSERT INTO employee_scheduling_settings
  (employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile)
  SELECT id,40,40,$1::jsonb FROM employees
  WHERE id IN ('AUDIT-E','AUDIT-SWAP')
  ON CONFLICT(employee_id) DO UPDATE SET
    target_weekly_hours=excluded.target_weekly_hours,
    maximum_weekly_hours=excluded.maximum_weekly_hours,
    operational_rule_profile=excluded.operational_rule_profile`,
  [JSON.stringify(fictionalProfile())]);
```

`fictionalProfile()` supplies all five NOT_APPLICABLE rules with explicit fictional reviewer/time metadata. Availability includes Monday for Riley and Saturday/Sunday for AUDIT-E: the days they **work** before a swap must not become the only days they are **available**. Existing weekly unavailable overrides or approved time off can still block these windows; the isolated fixture has none. Forty-hour limits suffice: AUDIT-E remains at 40 hours and Riley at 16 after a swap. No extra revision snapshot or 80-hour limit is needed.

Tests: new actual-Postgres regression **1 passed**, TypeScript passed, targeted ESLint passed. The test covers candidate discovery, displayed/current terms, staged refusal reasons, both eligible targets, proposal, acceptance and saved assignments. Raw evidence: `/workspace/nevora-release-evidence/2026-10-19/swap.log`. Files: new regression, `vitest.premium-release-integration.config.mts`, owned `scripts/premium-release-postgres.mjs`, this report. No Mac files or UI files edited. Claude’s next gate: apply only missing fictional seed rows at its next safe round break, inspect the rendered target list and compare/send screens. The late source mirror confirms the omitted seed inputs; the focused actual-Postgres swap regression was rerun successfully on the later shared head. The coordinator still applies the rows to its own fictional preview at a safe round break.


## 10. Concurrent production-runtime reads

[Full workload, p50/p95 matrix, exact failures, local fix and production limits](LOAD-2026-10-19.md). Baseline: **205/880 failed/degraded responses**, actual PostgreSQL `53300` plus “Workspace configuration is unavailable”. Bounded local transport pool: **880/880 successful complete responses**, no unavailable snapshots or timeouts. Actual-Postgres pool/rollback/cancellation/ownership regression plus A1: **2 passed**. TypeScript and targeted ESLint passed.

The fix is in `src/test/integration/owned-pg-transport.ts`, used only by owned local test/preview apps; production Neon HTTP behavior is unchanged. New reproducible load tooling: `scripts/lib/premium-owned-runtime.mts`, `scripts/premium-load-probe.mts`, dedicated probe/config. Coordinator: apply the pool change to shared preview tooling only at each chat’s next round break and restart its runtime then. Do not modify running preview imports.

Jose’s remaining production risk: Manager Schedule p95 **10.6 s** and inbox-count p95 **3.0 s** at concurrency 20. No missing index was proved; recent-time lookup used its existing index. Production storage failures can still surface the same workspace message, and mutation statement/lock timeouts are real production controls. Hosted Neon/Vercel load and main-query/CPU profiles remain required to set a production SLO. See the report for exact scope; this is local production-runtime evidence, not hosted certification.

## October 20 release — item 1: smaller Inter

Branch `codex/premium-backend`, implementation commit `2cc9a9f`. Based on latest pushed Phase 1 `62cd033` (merged without conflicts, preserving prior backend commits).

Inter TTF: **876,576 bytes**. WOFF2: **242,400 bytes**, **72.3% smaller**. FontTools `pyftsubset` with Brotli retained Latin/Latin Extended (`0000–036F`, `1D00–1EFF`, `2C60–2C7F`, `A720–A7FF`, `AB30–AB6F`, `10780–107BF`, `1DF00–1DFFF`), General Punctuation, currency, trademark, arrows and minus. All requested Spanish/punctuation characters were checked in the cmap. Both original variable axes remain: weight **100–900**, optical size **14–32**. Reproduce:

```sh
pyftsubset public/fonts/typeface/inter/variable.ttf --output-file=public/fonts/typeface/inter/variable.woff2 --flavor=woff2 --unicodes='U+0000-036F,U+1D00-1EFF,U+2000-206F,U+20A0-20CF,U+2122,U+2190-21FF,U+2212,U+2C60-2C7F,U+A720-A7FF,U+AB30-AB6F,U+10780-107BF,U+1DF00-1DFFF,U+FEFF,U+FFFD' --layout-features='*' --name-IDs='*' --name-languages='*'
```

Only the two authorized UI files changed: Inter sources list WOFF2 then TTF; portal layout preloads `font/woff2`. Inter Fallback is byte-for-byte unchanged. Actual Chromium before/after captures at 390 and 1440, reduced motion, fonts ready, same fictional `/login` and `/ui-preview/home`: **zero changed pixels in all four pairs**. Network entries confirm WOFF2 loaded after the change. [Captures, metrics and pixel comparison](font-evidence/) are committed. Browser emulation does not replace real-device testing.

Font verification used FontTools 4.x/Brotli and Chromium 151. Initial WOFF2 generation needed the Brotli extension; it was installed before the successful generation/captures. No failed setup attempt is counted as visual evidence.

## October 20 release — item 2: server wording

Branch `codex/premium-backend`, commit `a7a8a0c`. Both action-center producers now write `Casey Rivera · Oct 19 – Oct 25 · Fix recorded-time issues before finalizing.` for that period. Plain workspace calendar dates are formatted with an explicit UTC calendar formatter; they are never converted from local midnight into another date. Employee Home writes waiting/declined/withdrawn states, including exchange outcomes. Shift history writes `Designated lead` and `No designated lead`. Notification builders, employee/management notification reads, notification presentation and report request descriptions use `Unable to work`. Persisted event/status keys and destinations are unchanged. Existing UI compatibility presentation remains available for older strings. Coverage/hour-target messages also avoid the old vocabulary.

Evidence: **224 unit tests across 12 files passed**, targeted ESLint and TypeScript passed. Actual-Postgres new Home copy coverage plus existing premium pool/swap probes passed (**6 tests**); the subsequent preview payroll run also passed all **7 tests**. Updated existing correction/history integration expectations are included in the later full PostgreSQL checks. Full default-suite results follow in the candidate report; no component/page JSX was edited for this item.

## October 20 release — item 3: fictional pay and Profile reads

Branch `codex/premium-backend`. Payroll implementation `8de1ba7`; Profile probe `f9066ea`. The font’s final complete-Latin subset and refreshed capture metadata are in `d7290a3` (supersedes the earlier 174,464-byte subset).

**Payroll root cause:** `scripts/ui-checks/preview-runtime.mjs` called `seedPayrollFixture()` without publication. `seed-extra.mts` changed `payroll-qa-b` to a Lead but did not publish any statements. A new owned-only `payroll-preview-fixture.ts` explicitly approves/publishes the original fixture period and adds a second finalized/imported/approved/published period. The second period includes fictional recorded time and nonzero pay for the lead. Default integration-fixture behavior is preserved. The actual employee statement reader returns at least two distinct published periods, and both authorized PDF downloads start with `%PDF`. The PostgreSQL regression passed with the other premium probes (**7/7**). A first attempt changed the employee before approval and correctly hit `SOURCE_CONFLICT`; the passing implementation changes identity only after the original approval/publication, preserving that source guard.

**Profile investigation:** extended the exact prior workload (200 fictional employees, 350 shifts, 4,015 entries; production Next build/start with bounded owned loopback PostgreSQL transport). Forty measured reads per surface at each concurrency 10 and 20, plus excluded warmups. Employee Profile: **80/80 HTTP 200, state ready**, c10 p50/p95 **61/97 ms**, c20 **84/116 ms**. Management Profile: **80/80 ready**, c10 **60/80 ms**, c20 **101/142 ms**. All 24 surface/concurrency groups completed and the cluster stopped. No Profile timeout or server error reproduced, so no speculative production read change was made. A dedicated followup includes Lead Profile with the same data volume and load; results are recorded below when complete. Prior all-account inspection symptoms could reflect the old unpooled local transport, client rendering or its runtime; that cause is not established by this successful reproduction. Hosted Neon and real-phone behavior remain separate evidence.

## October 20 release — item 5: phone checklist

`DEVICE-CHECKLIST.md` is a one-hour draft for two real phones, four roles, VoiceOver/TalkBack, sign-in, tabs/More, one send-and-withdraw form per role plus unsent cancellation, offline/retry, maximum text size, landscape and dark-mode legibility. Fictional accounts only, external delivery disabled, credentials supplied privately. **Claude review pending before distribution to Jose.** This session has not claimed Claude’s approval or a completed physical-device test.

## 11. Release merge rehearsal

[Exact scratch SHAs, all conflicts, command results and owners](MERGE-REHEARSAL-2026-10-19.md). Scratch branches were not pushed. All five UI merges conflicted only in portal-premium.css; every resolution kept the exact Phase 3 version as Jose instructed. Initial `61bb34b` completed the full requested matrix: TypeScript/lint/build passed, default suite **7,344 passed / 2 UI failures**, and **1,320 SQL test executions passed** across release, Clocker, payroll, Profile, copy and pool/swap runners.

The initial production scan caught a capture helper retained in a source map. Fixed in `3130f4f` while preserving raw tsx CLI imports (48 targeted tests). `c94d17c` also repairs fresh setup’s missing 0033 with real red/green SQL coverage. Corrected scratch `64193ae` passes TypeScript/lint/build, the actual production erasure scan (**2277 artifacts**) and four targeted SQL cases; the full default run again has only the same two stale Desktop preview assertions. The report distinguishes SQL tested on the initial SHA from targeted rechecks on the corrected SHA; older results are not final-candidate sign-off.

Claude Desktop/coordinator must update the shared preview’s old sidebar expectations (Requests/Employees -> approved Team navigation), retaining role/canonical-navigation assertions. O1 stays unapproved: decisions remain on the full review page. All owned SQL clusters stopped and both scratch trees are clean. The final pushed/merged SHA tonight still needs fresh required checks, hosted verification and independent approval.


## 12. Cloud submission and capture checks

[HTTP scenarios, exact persisted states, capture/reset guards and reproduction command](SUBMISSIONS-2026-10-19.md). One dedicated Vitest probe passed with **12 contained checks**: all ten requested submission/delivery flows plus negative ownership-manifest and connection-string reset checks. It performed **11 verified full-database resets**, retained the first withdrawal receipt on retry, restored baseline data, and stopped its server/cluster. TypeScript and targeted tooling lint passed.

The real swap page now renders Riley’s targets with the documented fictional seed; proposal and acceptance save the exchanged assignments. Recovery produces a private .eml with a matching unconsumed database proof; the real protected worker records a captured SELF_TEST payload and provider_accepted delivery, without contacting a provider. Raw captures, generated passwords, subscription material and dumps remain outside git. Test sessions are real seeded SQL sessions/opaque cookies; browser password entry, screen interactions and hosted Neon remain separate gates.

New tooling: `scripts/premium-submissions.mts`, `scripts/lib/premium-owned-snapshot.mts`, local runtime/wrapper additions and a dedicated probe/config. The reset helper is restricted to this invocation’s newly created cloud database, pinned URL/name/OID/comment plus cluster owner/port/data-directory; it is not a selector for existing Mac previews. Claude repeats the on-screen selection, compare, submit/result, focus and responsive checks against the final merged candidate. Inbox decisions still use the full review action and return to the filtered Inbox afterward; no O1 inline decision UI was added.

A separate worker advanced this shared GitHub branch during publication. Its commits were preserved by normal merges; the rehearsal report records the extra Node-only test discovery fix (`ec55331`, 2 Node checks passed). Full matrix numbers belong to the frozen scratch SHAs, not every later evidence/tooling commit on this shared branch.


## 13. B7 deployment and rollback runbook

[Production order, environment inventory, rollback SQL and first-hour monitoring](DEPLOY-RUNBOOK.md). The repo disables automatic Git deployments in `vercel.json`; CI validates but does not deploy or apply migrations. Apply **0033 before the new app/workers**, after an approved backup/isolated restore rehearsal. Normal app rollback **keeps 0033** and its preferences/audit state; old workers lacking delivery-time opt-out checks must remain paused. The exceptional inverse SQL and its preference-loss consequence are explicit.

Implementation fix `c94d17c` adds 0033 to the real fresh-company installer. Actual Postgres red/green proof: the Owner Profile was unavailable before the fix and ready afterward. Current premium SQL suite has **4 passed**, including migration reapplication, atomic failed-down rollback, successful inverse order and demonstrated opt-out loss on destructive down/reapply. Setup input unit tests **6 passed**; TypeScript and targeted ESLint passed. No production migration, setup, restore, environment mutation, notification activation or deployment was performed.

**Live verification still blocked:** Jose requested Vercel plugin access, but this cloud session exposes no Vercel tools; there is also no CLI, credential binding, linked local project or existing CLI auth file. No credential values were read. The runbook therefore does **not** claim the actual Production keys are unset or that project/team/deployed-SHA identity was verified. Its exact read-only inventory check remains open until the Vercel plugin is exposed here. The corrected production build proves all dev markers erased across **2,277 artifacts**, even with both flags deliberately set; that is separate from checking live Vercel settings.

Next gates: Claude fixes the two shared Desktop preview assertions and completes on-screen joint checks; Jose identifies the final pushed/merged SHA; cloud Codex reruns that exact candidate’s required matrix. Hosted Neon/Vercel identity/configuration, production load profiling, independent acceptance and Jose’s release approval remain separate.


### Late source/handoff confirmation

The coordinator’s later remote merge (`17d8089`, preserved in `5f26297`) added the original preview/seed tooling mirror and newer UI/application changes. A1’s missing-data reason is now confirmed from `scripts/ui-checks/preview-runtime.mjs` and `seed-extra.mts`, and the focused cloud swap regression passed again on `5f26297`. No seeder or running preview was edited. That merge also adds later UI/backend work and extends the load script’s Profile cases; the historical 880-request matrix and scratch SHA results remain tied to their recorded source variants. Neither scratch branch was pushed. These newer shared-head changes require tonight’s final exact-SHA validation and must not inherit the earlier full-matrix result.
