# Cloud backend handoff

Base: `claude/premium-phase-1` at `21c4525`. Work branch: `codex/premium-backend`, isolated cloud worktree `/workspace/NEVORA-premium-backend`. Local commits only; no push, PR, merge, deployment, real-person data, or external delivery. The Mac preview, swap and reset work belongs to the separate local session.

## 1. Branch validation

A separate detached worktree at `21c4525` keeps shared-branch results independent of backend edits. Node 24.19.0, npm 11.9.0. `npm ci` passed. Type checking passed. Lint reproduces the known UI-owned swap-page error at line 51 and the existing effect-cleanup warning in `employee-weekly-confirmation.tsx`. Wave A owns the former. Full default-suite results are pending. The five other UI branches have not been pushed; none has been marked passing.

PostgreSQL 17.11 was installed under `/workspace/nevora-tools/postgres` using packages authenticated by Debian's signed package index; no system package or real database was changed. Owned runners create loopback clusters and tear them down. Set `NEVORA_TEST_PG_BIN=/workspace/nevora-tools/postgres/usr/lib/postgresql/17/bin` when using them in this cloud machine.

## 2. Own Owner/Manager Profile and alert choices

Implemented `readManagementProfile(proof, executor?)` and `saveManagementAlertChoice(proof, value, executor?)` in `src/lib/data/management-profile.server.ts`, with the public types in `src/lib/management-profile.ts`.

- `GET /api/management/profile`: the agreed contact, active locations, role-specific alerts, database `observedAt`, and session-bounded `validForMs`. Owner scope is all; Manager scope uses the existing administrative-scope storage, including legacy all-company behavior. Empty locations and missing contact values are valid. No employee selector is accepted. Signed out is 401; Employee/Lead or lost authority is 403; storage failure is the agreed 200 unavailable snapshot. Private responses are not cached.
- `POST /api/management/profile/alerts`: exact `{topicId,on}`, same-origin/custom-header protection, own-account authority before and after the write, idempotent per-topic upserts. Independent concurrent topic saves do not overwrite one another.
- Apply **`db/migrations/0033_management_alert_preferences.sql`** before using these endpoints. This additive migration persists choices and applies them centrally to notification inserts without altering intent IDs or business write results. Opted-out notifications remain cancelled audit rows. Saving an opt-out also cancels pending deliveries; opting back in enables future messages without resurrecting old ones. Mixed manager summaries retain enabled members. Employees and Leads retain existing behavior. The clock-review choice does not invent a new clock notification producer; it handles explicitly typed review events when produced.
- Contract wording matches the supplied draft. Final topic wording, especially the new payroll topic, is pending Jose's approval. No existing payroll/legal wording was changed. Owners retain five rows; payroll-ready is off while payroll is disabled. Managers have four.

Validation: 13 unit/HTTP-contract tests passed across `management-profile.server.test.ts` and `management-profile-route.test.ts`; 6 actual PostgreSQL tests passed in `management-profile.integration.ts`, including installed Manager scope, empty locations, expired sessions, concurrent saves, per-person suppression, and mixed summaries. Targeted ESLint passed. Run the database tests with the existing owned runner and `vitest.management-profile-integration.config.mts`.

Claude: wire the Profile session to the exact endpoints and response already specified in HANDOFF.md. Preserve the existing session-derived name/role and company reads. Refresh GET after saves. The migration must land with the backend before the UI integration. No component/page/CSS changes were made here. Joint browser checks remain Claude's next gate.

## 3. Dev-only error inspection

Pending implementation and production-build absence check.

## 4. Local email and push capture

Pending implementation and gate/capture tests. No real delivery has been attempted.

## 5. Remaining agreed projections

Pending: Inbox count; Wave A decision metadata, numeric coverage needs and descriptive copy receipts. D-5 is already implemented according to the desktop contract and will be verified rather than duplicated. Unspecified/product-dependent changes in HANDOFF section 2 remain proposals rather than invented APIs. Joint real-submission, device, large-data and browser inspections remain separate from unit evidence.

## 6. Review of Claude's server changes

Two read-only review axes (repository standards and the supplied contract) examined `d462f54` and its consumers. The additive time-off fields and LEFT JOIN preserve request rows and omit a withdrawal's own reviewer name. A wider additive effect: shared `mapRequest()` also exposes `reviewedAt` from `getTimeOffRequest()`, whose query selects `r.*`. The narrow pay-calendar SQL reads only the effective schedule and workspace date and checks payroll-enabled before querying.

Confirmed P2: `openPeriod()` in `src/lib/payroll/calendar.ts` compares the **end** of monthly/semimonthly periods with `anchorDate`, so an anchor of `2026-10-20` and today `2026-10-19` incorrectly returns a period/payday. Both cases were reproduced with the actual function. The existing due-period implementation and `docs/payroll-backend-handoff.md` treat calendar anchors as rollout boundaries. Fix and boundary tests are pending; this affects the new display read, not existing paid amounts.

The display changes are present at `21c4525`: `durationText()` is used by the timecard and employee duration formatters, and unavailable schedule days render an en dash. Formatter consumers include timecards, export-selection summaries and report insights. **CSV serialization does not use these formatters:** reports emit raw nanoseconds; payroll export uses raw canonical fields or dedicated `decimalHours()` and explicit rounding policy. Payroll PDF/payment artifacts use approved run amounts. No numeric export/calculation change was found by source tracing. Verification of those existing suites is pending.

Implementation owner: cloud Codex. UI wiring/joint inspection: Claude coordinator and the owning chat. Release impact: no production authorization; implementation and local verification do not close independent inspection or real-device gates.
