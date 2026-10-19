# Cloud backend handoff

Base: `claude/premium-phase-1` at `21c4525`. Work branch: `codex/premium-backend`, isolated cloud worktree `/workspace/NEVORA-premium-backend`. Local commits only; no push, PR, merge, deployment, real-person data, or external delivery. The Mac preview, swap and reset work belongs to the separate local session.

## 1. Branch validation

A separate detached worktree at `21c4525` keeps shared-branch results independent of backend edits. Node 24.19.0, npm 11.9.0. `npm ci` passed. Type checking passed. Lint reproduces the known UI-owned swap-page error at line 51 and the existing effect-cleanup warning in `employee-weekly-confirmation.tsx`. Wave A owns the former. Full default-suite results are pending. The five other UI branches have not been pushed; none has been marked passing.

PostgreSQL 17.11 was installed under `/workspace/nevora-tools/postgres` using packages authenticated by Debian's signed package index; no system package or real database was changed. Owned runners create loopback clusters and tear them down. Set `NEVORA_TEST_PG_BIN=/workspace/nevora-tools/postgres/usr/lib/postgresql/17/bin` when using them in this cloud machine.

## 2. Own Owner/Manager Profile and alert choices

Implemented `readManagementProfile(proof, executor?)` and `saveManagementAlertChoice(proof, value, executor?)` in `src/lib/data/management-profile.server.ts`, with the public types in `src/lib/management-profile.ts`.

- `GET /api/management/profile`: the agreed contact, active locations, role-specific alerts, database `observedAt`, and session-bounded `validForMs`. Owner scope is all; Manager scope uses the existing administrative-scope storage, including legacy all-company behavior. Empty locations and missing contact values are valid. No employee selector is accepted. Signed out is 401; Employee/Lead or lost authority is 403; storage failure is the agreed 200 unavailable snapshot. Private responses are not cached.
- `POST /api/management/profile/alerts`: exact `{topicId,on}`, same-origin/custom-header protection, own-account authority before and after the write, idempotent per-topic JSONB updates on the employee row. Independent concurrent topic saves do not overwrite one another. The second authentication read's session-expiry redirect is translated to 401.
- Apply **`db/migrations/0033_management_alert_preferences.sql`** before using these endpoints. This additive migration persists choices and applies them centrally to notification inserts without altering intent IDs or business write results. Opted-out notifications remain cancelled audit rows. Saving an opt-out also cancels pending deliveries; opting back in enables future messages without resurrecting old ones. Mixed manager summaries retain enabled members. Employees and Leads retain existing behavior. The clock-review choice does not invent a new clock notification producer; it handles explicitly typed review events when produced.
- Contract wording matches the supplied draft. Final topic wording, especially the new payroll topic, is pending Jose's approval. No existing payroll/legal wording was changed. Owners retain five rows; payroll-ready is off while payroll is disabled. Managers have four.

Review hardening: preferences are stored atomically on the employee record, and notification delivery/source reads recheck the current choice. This prevents an uncommitted producer from escaping an opt-out sweep. Existing legacy list/count exports exclude specifically preference-suppressed rows; ordinary cancellation history retains its prior behavior. Both current JSON and legacy colon summary keys are supported. The migration has not been published or applied outside owned test databases.

Validation: the initial 13 unit/HTTP-contract tests passed; an additional second-authentication-expiry case was added. 8 actual PostgreSQL tests passed in `management-profile.integration.ts`, including installed Manager scope, empty locations, expired sessions, concurrent saves, per-person suppression, mixed summaries, a two-connection producer/opt-out race, and cancellation of an actual queued push-delivery row. Targeted ESLint and type checking passed before the follow-up; final verification is recorded below. Run the database tests with the existing owned runner and `vitest.management-profile-integration.config.mts`.

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

Gate tests cover every value, no flag, production, exact IPv4/IPv6 loopback hosts, external origins and forwarded requests. `npm run test:dev:production` builds with production NODE_ENV **and both dev flags deliberately set**, scans every generated file (including source maps/cache), and fails on any switch/capture marker. A successful run built and scanned 2,245 artifacts. The initial run correctly failed because Turbopack's filesystem cache retained original erased sources; `next.config.ts` now uses its supported `turbopackFileSystemCacheForBuild:false` option. Fresh output passed. This changes build caching only. The runner preserves tracked Next-generated files and refuses an active dev-build lock. Final verification reruns after the remaining backend changes.

## 4. Local email and push capture

Implemented `src/lib/dev/capture.server.ts`, conditionally loaded by the recovery factory and push provider only outside production. Enable a loopback-only development preview with:

```sh
NEVORA_DEV_CAPTURE_DELIVERY=1
NEVORA_DEV_CAPTURE_OUT=<absolute PREVIEW_OUT>/captures
FUEL_PORTAL_ORIGIN=http://127.0.0.1:<preview-port>
```

Export those variables when launching the preview and its local worker. Recovery uses the real Nodemailer stream transport and writes `email/<random-id>.eml`; push writes `push/<random-id>.json`. Files are created exclusively with mode 0600 under mode-0700 directories. Captured push includes display payload/options and omits endpoint, subscription/VAPID keys and environment contents. Captures can contain private recovery proofs: keep the folder outside the repository and never print or commit it.

Local push workers retain the existing test-environment/account allowlist, enrollment, subscription-encryption and source-authority requirements. With a valid configured local capture folder, `readNotificationConfig` enables outbound capture for an already enabled, explicitly scoped **test** runtime; it never enables a production environment or unscoped worker. Keep normal test enrollment keys and `PUSH_TEST_ACCOUNT_IDS` in the preview's secure runtime configuration. Requested capture with invalid local configuration fails closed instead of falling through to a real transport. Flag-off production delivery is unchanged. No real delivery has been attempted.

Tests capture an actual buffered `.eml` through `recoveryDelivery()` and a JSON push through `createPushSender()`, assert no provider transport call, exercise production/flag/origin/path gates, and preserve the existing provider timeout/status suite. The current targeted run passed 81 tests across eight files (including other projections). Production-erasure verification covers capture markers too. Claude: render the local captured messages like screens; no UI transport wiring is required.

## 5. Remaining agreed projections

Pending: Inbox count; Wave A decision metadata, numeric coverage needs and descriptive copy receipts. D-5 is already implemented according to the desktop contract and will be verified rather than duplicated. Unspecified/product-dependent changes in HANDOFF section 2 remain proposals rather than invented APIs. Joint real-submission, device, large-data and browser inspections remain separate from unit evidence.

## 6. Review of Claude's server changes

Two read-only review axes (repository standards and the supplied contract) examined `d462f54` and its consumers. The additive time-off fields and LEFT JOIN preserve request rows and omit a withdrawal's own reviewer name. A wider additive effect: shared `mapRequest()` also exposes `reviewedAt` from `getTimeOffRequest()`, whose query selects `r.*`. The narrow pay-calendar SQL reads only the effective schedule and workspace date and checks payroll-enabled before querying.

Confirmed P2: `openPeriod()` in `src/lib/payroll/calendar.ts` compares the **end** of monthly/semimonthly periods with `anchorDate`, so an anchor of `2026-10-20` and today `2026-10-19` incorrectly returns a period/payday. Both cases were reproduced with the actual function. The existing due-period implementation and `docs/payroll-backend-handoff.md` treat calendar anchors as rollout boundaries. Fix and boundary tests are pending; this affects the new display read, not existing paid amounts.

The display changes are present at `21c4525`: `durationText()` is used by the timecard and employee duration formatters, and unavailable schedule days render an en dash. Formatter consumers include timecards, export-selection summaries and report insights. **CSV serialization does not use these formatters:** reports emit raw nanoseconds; payroll export uses raw canonical fields or dedicated `decimalHours()` and explicit rounding policy. Payroll PDF/payment artifacts use approved run amounts. No numeric export/calculation change was found by source tracing. Verification of those existing suites is pending.

Implementation owner: cloud Codex. UI wiring/joint inspection: Claude coordinator and the owning chat. Release impact: no production authorization; implementation and local verification do not close independent inspection or real-device gates.
