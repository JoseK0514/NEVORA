# Backend integration into development

Status: local integration and verification complete. Publication target: `development`. Owner: Codex COO.

Jose authorized moving all completed backend work into `development`, using the current Claude UI, and pushing. A newer Claude UI remains a later integration. Production deployment is outside this instruction.

## Frozen inputs

- Remote development baseline: `b58496b84b21690f7be22474f7570da2d81af6c3`.
- Current shared UI/backend: `2eb2a03ab354e1488d24176b62d9ad8f5a7fbb0c` (`codex/verify-preview-33`). It includes the premium backend server/API/migration inputs observed at `2d425b4b19ad86e9b19e23498e92269e871f2a1f`.
- Local completed backend assembly: `c0bd7c556ffec10f5158aa36e54f2640a664908c`, tree `deb75efb5fa66198a45ee4cc4ff0c06f7923db91`. Includes native payroll, the fresh-company setup correction, and accepted Company & Access recovery. Imported without modifying its source checkout.
- Backend merge base: `b6e7c440f398a95644f8fb714fb9f6ae9065eec3`.

## Integration plan and ledger

1. Preserve both source histories and existing work. Complete: managed isolated worktree `codex/backend-to-development-20261020`; original checkout and source assembly preserved.
2. Reconcile shell/navigation/server controls (root), payroll (payroll integration worker), employee/invitation access (employee access worker), and operational pages (operations worker). Complete: all 53 conflicts explicitly reconciled; merge `811ee33ce0915fdd5d234f24f91d0a1aacf6a316` preserves both frozen parents.
3. Run combined typecheck, lint, unit/configuration checks, production build and development-marker exclusion; inspect owned database/browser coverage where available. Complete: 8,806 unit tests passed, zero failed; typecheck, lint, build, browser, focused regressions and SQL recovery checks passed.
4. Combined changes reviewed and committed. Authorized publication uses ordinary fast-forward history to `development`; the exact remote result and subsequent CI are recorded in the final publication receipt and chat handoff.

The initial shared snapshot passed local typecheck and lint. Its local full test run was stopped before completion when the missing backend assembly was discovered; it is not passing combined evidence. The existing exact-shared-source hosted CI passed validate and SQL jobs, but failed Phase D/E browser jobs and their mandatory aggregate. These failures are preserved and are not release acceptance.

Merge-specific regression: Finder and Today initially returned HTTP 200 when the accepted Company scope wrapper denied access. Four new tests reproduced the missing boundary. Both routes now use the existing before/after Company authority wrapper; the focused run passed 79 tests across five files. Full combined verification remains pending.

## Controls and release state

Engineering preserves backend contracts, data ownership and recovery semantics while adopting compatible Claude UI. Security preserves explicit operational scopes, independent payroll permissions, invitation possession, session revocation and private responses. Delivery requires one recorded combined candidate. Governance recommendation remains conditional on combined verification; no independent audit finding is self-closed.

The global `vercel.json` deployment hold remains enabled. No production database credentials or real notification deliveries are used. SaaS/Phase F and previously held photo/operations modules remain paused; source custody does not activate them. Native payroll provisional/statutory, actual-record facts, privacy/consent and external-payment holds remain in force.

Rollback: development can receive a normal revert of this integration; preserve both input commits and avoid history rewriting. New Claude UI should merge against the final recorded development commit and retain the backend contracts and authority gates.

## Integration corrections and verification

Runtime checkpoint `30d165a1` contains the completed merge and the reviewed Profile correction. `e3138d96` adds only the notification CLI test's explicit server entry. `39f95f59` adds only three SQL fixture corrections. No application runtime source changed after `30d165a1`.

- Finder and Today use the existing before/after Company authority wrapper. Four new tests first reproduced unauthorized global reads. Focused server/API regressions: 79 passed. Shell/navigation regressions: 89 passed, with current Company scope combined with company vocabulary/modules and independent own Profile/payroll access.
- Premium Profile now projects location names from current Company & Access authority before and after its private read. Missing/revoked scopes retain own contact/preferences without exposing global names. The original six new unit regressions failed before the fix; 20 unit/route tests and 14 real owned SQL tests pass afterward. A separate code reviewer reproduced the finding, then approved its bounded correction. This is code review, not independent QA or release acceptance.
- Payroll merge checks: 204 passed. Employee/invitation composition checks: 106 passed. Operations checks: 279 passed. Current premium frames, dates, controls and navigation remain; the accepted policy-history state machine and native payroll components supply the newer backend contracts.
- Fresh-company SQL: 3 passed, covering current payroll/access installation after company/Owner bootstrap, complete rollback, and concurrent setup. Both premium presentation/preferences migrations and the native/access migrations are included.
- Native payroll SQL: initial 25 failures/17 passes came from a fixture missing current Company adoption. The existing `createPunchFixture({companyAccess:true})` fixes the setup without weakening authorization or assertions. All 42 scenarios pass in a fresh owned cluster.
- Broad Company SQL: 520 passed, three failed, and five could not execute because their owned fixture selected the wrong guarded database helper. The failed files were rerun in full after corrections: schedule actions 68/68, time-off review 15/15, invitation claims 13/13. The previously refused owned fixture now executes 5/5. All 528 cases are covered by the broad run and these complete file reruns; no single clean repeat of all 31 files is claimed. Corrections preserve exact UI redirect assertions, use a single fixture timestamp for the exact 15-minute invitation lifetime, and select the existing strict Foundation/Exchange helper required by the owned target. Database safety guards and runtime invitation retention are unchanged.
- Notification/foundation/release configuration checks: 6/6, 8/8 and 51/51. Notification CLI and actual worker startup regressions: 14/14, including disabled dispatch without IO and rejection without the explicit server condition.
- Production build and exclusion scan on `e3138d96`: passed, 2,528 artifacts scanned with all five development-only markers absent. Later changes are integration tests only.
- Rendered Chromium smoke on exact runtime checkpoint `30d165a1`: 34 checks and 22 screenshots across 320px/1440px, Owner/location-scoped Manager/Employee, real login, Home/Profile, employee creation page, policies, payroll, scoped employees/schedule, keyboard focus, overflow and protected API denial. Zero browser runtime errors; source/mirror custody verified on close; owned database and app stopped. No physical-device, full visual matrix, hosted or production claim.

Browser evidence: `/Users/josek0514/.codex/visualizations/2026/10/20/01a158ce-f75b-7f20-b4ef-879a40e11945/backend-development-smoke/report.json`, SHA-256 `387320e3febd9f9069e2d247f31dc1a7b4eaede86bea2f03311ab0101d003322`. Raw command logs and worker red/green receipts are preserved in `/Users/josek0514/.codex/visualizations/2026/10/20/01a158ce-f75b-7f20-b4ef-879a40e11945/backend-development-verification/`. Originals remain at `/tmp/nevora-development-*.log` and this managed worktree's `.omo/evidence/`. The initial full unit run recorded 8,804 passes/two failures: approved notification empty-state wording and the older raw-tsx entry expectation. Their focused corrections pass.

Final complete unit run: `npm test -- --maxWorkers=1`, exit 0, 505 files passed/27 prerequisite-guarded files skipped, 8,806 tests passed/zero failed/801 skipped. The total also includes 55 pre-existing pending assertions; skipped/pending records are not acceptance evidence. Duration 439.89 seconds. Its application runtime is byte-identical to `30d165a1`; subsequent changes are CLI/integration tests and this handoff. The final current-tree typecheck passed; full lint passed with zero warnings after naming the scratch verification configuration exports. Original failures and their successful follow-ups are retained.

## Release and next owner

Engineering recommends development integration with the recorded sources and tests. Security requires retaining current operational and independent financial authority. Governance release impact: CONDITION; the development push does not certify production. The pre-existing Phase D/E browser CI failures, final independent QA/UI, hosted isolated verification, migrations/backup/restore/rollback and explicit production authorization remain separate gates. No release control was disabled and no production authorization is inferred.

Codex owns this integration and push. Claude's newer UI should use the published development commit as its backend base and preserve Company scope, native payroll, invitation/recovery and private-response contracts. No additional Jose approval is needed for the already authorized development push. Production remains held.

The publication receipt under the external verification directory records the final remote SHA, original `main` SHA, source ancestry, deployment hold and CI state. Future UI work should read that receipt or this completion commit's Git history before choosing a base.
