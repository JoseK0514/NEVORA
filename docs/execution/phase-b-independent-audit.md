# NEVORA Workforce — Phase B independent audit and controlled hardening

**GO — Phase B technically ready for ChatGPT final review**

All19 confirmed findings are corrected and independently reviewed. Final gates pass. The single local hardening commit has exact parent20a1026a2fa88c5923b015a3384b980ff7d676cc; its final identity/status is recorded in the external checkpoint.json. This handoff is included in that commit; it does not contain its own self-referential SHA. Earlier drafts and failing evidence remain preserved.

## Candidate, ownership and scope

Reviewed the exact frozen `codex/nevora-phase-b-ui-foundation` candidate `20a1026a2fa88c5923b015a3384b980ff7d676cc`, parent `3d4a14231f26b327ad65ad08161b3759e6e820e8`. Accepted Phase A `833defab3c1be4445cff3636ff6bde7d179030f8` is an ancestor. The frozen checkout was verified clean before review and preserved. Corrections are isolated on `codex/nevora-phase-b-hardening-review`, `/Users/josek0514/.codex/worktrees/nevora-phase-b-hardening-review/Fuel-Scheduler-`, with the frozen candidate as their exact parent. Other checkouts and their existing work were preserved.

This was an independent defect audit, not a new feature phase. Read-only reviewers attacked static contracts, actual Server Actions, real PostgreSQL transaction boundaries, browser behavior, and cross-phase integration. Sequential sole implementers made reproduced corrections, followed by fresh independent reviewers. The most capable independent whole-branch reviewer inspected the combined branch; its findings were corrected and independently checked. Additional bounded authority corrections B17/B05 were explicitly recorded in the execution ledger when native-cookie evidence proved existing requirements were still violated. No new customer policy was introduced.

No push, merge, deployment, customer database migration, environment change, real notification, provider activation, real schedule publication, paid infrastructure or Phase C work occurred. Existing migrations were applied only to ownership-verified disposable loopback PostgreSQL test databases. There are no migration/schema changes.

## Findings: 0 CRITICAL, 10 MAJOR, 9 MINOR

All listed defects have independent reproduction, a bounded correction, and regression evidence. Some share a common guard; they remain separate findings where the triggering behavior and risk differ.

| ID / severity | Symptom and reproduction | Root cause and risk | Fix and regression coverage |
|---|---|---|---|
| B01 MAJOR | Demote/deactivate/revoke a Manager after initial authorization but before draft/published schedule, publication or Time Off decision commit. Expire a session while a request row blocks the transaction. Forbidden changes previously committed. | Snapshot equality and actor ID were mistaken for current authenticated authority; retries could adopt an invalid role. Unauthorized business changes and notification intents could persist. | Mandatory server-derived session proof; fresh ownership, active state, current role and wall-clock expiry checks after blocking locks. Actual-action/direct SQL negative and permitted cases, request/session lock waits, rollback and outbox assertions. |
| B02 MAJOR | Choose a Designated Lead, concurrently demote the employee, then let the assignment retry. Invalid Lead designation previously persisted. | Reduced final capability evaluation omitted role/Lead capability. Initial UI checks did not protect the write. | One shared role/Lead capability evaluator used at initial and final boundaries. SQL demotion races and permitted Lead/Manager/Owner/ordinary cases; unchanged historical rows retain their data. |
| B03 MAJOR | Begin login before deactivation; hold its employee lock; deactivate/reactivate before allowing login to finish. A stale login previously created a new session. | FK existence checks did not validate active state or the reviewed employee/credential revision. | Employee-before-credential locks, fresh exact employee/password revision checks, committed session before cookie. Real lock-order tests, changed credentials, fresh/concurrent login, rejected-cookie and reactivation cases. |
| B04 MAJOR | Begin activation against the old phone/active state; delay it behind a lifecycle lock; change phone or deactivate. Credentials previously committed from a stale predicate. | INSERT SELECT retained stale values through FK waits. | Lock employee lifecycle first, then check current phone, active state and absence of credentials in the same transaction. Phone/inactive/combined waits, valid activation and duplicate claim tests. |
| B05 MAJOR | Revoke the real cookie session between initial authorization and profile/create/scheduling, catalog/workspace/deadline or any of four Scheduling Rules action transactions. Writes previously survived. | Actor-only repository contracts and active Owner/Manager rows remained valid after session deletion. | Required shared server-only proof propagated through all affected actions/writers. Fresh locked session/ownership/access validation, including final post-DML recheck where later waits can occur. Real SQL forged/malformed/foreign/revoked/expired/inactive/demoted cases, current Owner/Manager positives, input/session waits, logout ordering and generation lock-order tests. Native login/cookie replay verifies all four settings families. |
| B06 MAJOR | Submit two stale qualification/location replacement sets. Later stale data previously erased the first save. | Locks serialized writes but did not preserve reviewed intent; replacement did not advance the employee revision. | Exact textual CAS under lifecycle locks, shared monotonic microsecond revision, atomic replacement and own UPDATE RETURNING revision. Stale location/position tests, one-winner concurrency, consecutive saves and retained references. |
| B07 MAJOR | Edit a dirty form; another tab changes the employee; refresh unrelated RSC props; submit the old fields. Hidden revision previously refreshed while old field values stayed mounted. | Reactive revision renewal made stale controls appear current. | Mounted reviewed-draft token advances only from that form's successful written revision. Component regressions and real Chromium/WebKit stale rejection, preserved drafts and consecutive saves. |
| B08 MINOR | Retain an inactive primary location. Directory previously said location was unassigned. | Active-only catalog reads obscured retained history. | Include inactive rows and truthful inactive context. Original inactive-employee case retained, plus rendered regression. |
| B09 MINOR | Open ActionMenu in a 320×160 viewport. Menu bottom previously reached 230px. | Forced 120px minimum exceeded the available viewport. | Clamp to the actual visual viewport, including offsets; use scrolling when space is short. Geometry tests and both-engine 160px/70px checks, final-action hit testing, Escape/focus return. At 70px the 54px row is not claimed fully visible; its 44px visible intersection and action are verified. |
| B10 MINOR | Tap employee position/location labels. Hit rows were only 18px. | Native checkbox glyph geometry was reused as row target geometry. | Scoped 44px label targets, retaining 18px native glyphs. Both engines and all seven widths. |
| B11 MINOR | Open employee More with a long name at 320px and device setup enabled. Text overlapped Sign out. | Inherited nowrap resisted grid shrink/wrapping. | Scoped wrapping and shrinkable grid layout. Both-engine long-name evidence; device-status fixture explicitly marked fake, with the real setup component. |
| B12 MINOR | Close Device Settings by clicking another control. Chromium focus was stolen back to More. | Unconditional deferred opener focus ignored legitimate outside focus. | Dismissal-aware focus recovery; preserve valid outside focus and restore stranded/Escape/explicit-close focus. Six component cases plus two-engine nested menu/device checks, respecting WebKit pointer semantics. |
| B13 MAJOR | Actual createShiftAction initially validates, then another transaction commits other-location overlap or approved leave before final write. Invalid assignment previously committed on retry. | Final writer did not rerun the complete shared scheduling rules against fresh coherent input. | Complete guarded scheduling source plus existing mapper/shared validator, after established workspace/week/input locks. Actual-action SQL overlap/time-off regressions, cross-phase lock-order suites. No duplicated scheduling policy or invented default. |
| B14 MINOR | Positions Active label was an 18px touch row. | Separate native checkbox row lacked the approved target. | Scoped 44px status label. Both-engine/all-width checks. |
| B15 MINOR | Final manual-assignment conflict was correctly rejected, but Create/Edit became a generic server-error page and lost the draft. | Plain error crossed the action boundary instead of becoming the existing local form error. | Typed scheduling conflict mapped to local ConfigurationForm feedback and retained values; unexpected infrastructure/authorization errors still propagate. Copy/apply skip only typed conflicts. Four real SQL draft/published cases and 16 browser retention/retry/delete/clearance checks per engine. |
| B16 MINOR | WebKit checkbox had focus-visible=true after keyboard navigation but identical focused/unfocused pixels. | Global outline reset suppressed native focus; native box-shadow did not paint. | Scoped approved-color 2px outline and 3px offset. Native raster/style focus checks for qualification and Positions controls: 14 cases each across both engines/seven widths. |
| B17 MAJOR | Revoke a real logged-in session while Build Week or Allow auto-fill waits after reading its plan. Generation/exclusion changes previously committed. | Generation's final guard validated actor/source but omitted current session proof, including no-op paths. | Required proof in actions, generateWeekDraft and clearGenerationExclusion; shared session validation after complete mutation guards on retries and no-ops. 32 added real SQL cases and independent native negative/positive replay. Provenance, tombstones, no implicit clearing and Draft-only behavior retained. |
| B18 MAJOR | Submit Scheduling Rules Save while a controlled hours-write trigger raises an error. Staffing previously committed despite the failed action. | One user action launched staffing and hour writes in two independent transactions. | One guarded atomic transaction for both settings groups, using shared statement builders. Actual action/SQL forced-failure regression verifies both groups, timestamps and history remain unchanged. External delivery remains outside business transactions. |
| B19 MINOR | Revoke session before native Remove Coverage Window reaches its final authority check. SQL rejected safely, but HTTP500 and generic error UI followed. | Expected shared authorization exception escaped the native action. | Recognize only exact guard diagnostic plus SQLSTATE22P02 after rollback; reread current roles and use existing login/app routing. Unrelated DB/input/infrastructure errors rethrow unchanged. Seven unit recovery/propagation cases, five real SQL routing cases, and independent native replay: rejected Remove leads to usable Sign In, no unexpected runtime errors. |

## Meaningful changes

- Required session-proof contracts and final SQL authorization across affected management mutations, with consistent lock order, wall-clock expiry and rollback. No client-supplied actor/proof authority.
- Login/activation lifecycle serialization; employee revision/CAS integrity; profile forms retain their own reviewed revision and successful write result.
- Shared scheduling capability and complete final manual-assignment validation; typed local conflict handling without hiding unexpected failures.
- Atomic staffing/hour settings, guarded coverage/position-quota writes and precise native denial recovery.
- Small scoped ActionMenu geometry, touch-target, native focus, long-name and Device Settings focus corrections. No product redesign or palette/brand change.
- Added substantive domain/component/SQL/concurrency tests; existing fixtures explicitly supply owned sessions and coherent availability for newly guarded writers. Existing meaningful assertions were retained.
- Phase A browser helper now awaits the matching RSC response before navigation. This fixes demonstrated WebKit navigation cancellation without filtering errors or removing any of its 23 checks.
- Added Vitest alias/configuration plumbing needed for actual imported production modules; no weakened/excluded original acceptance test.

The accompanying changed-files.md/changed-files.json is the exact complete manifest, including test and documentation changes. New regression files include manual-conflict-actions.test.ts; action-menu-geometry.test.ts; configuration-form.test.tsx; portal-device-setup-focus.test.tsx; phase-b-integrity.integration.ts; phase-b-management-session.integration.ts; generation-session.integration.ts; schedule-settings-session.integration.ts. Shared test-only proof/transport helpers are clearly separated from product guards.

## Evidence, visual comparisons and preservation

The final-verification.json records each exact argv, exit, count, elapsed time, source identity and boundary. Real PostgreSQL tests use owned disposable PostgreSQL17.10 on loopback, with explicit teardown markers. Native authenticated browser tests use actual Next actions/login/HttpOnly cookies and a transport-only adapter to owned SQL. Unit/framework mocks are not represented as live customer database verification.

Full UI matrix: Chromium and WebKit, widths320/375/390/430/768/1024/1440, 480 protected screen captures. Supplemental184 checks include Lead views, both Clocker routes/orientations, larger catalogs and long labels, keyboard/focus/menu/device flows, stale forms and final control clearance. The UI artifacts state their source manifests; final runtime UI/CSS/public-asset bytes are checked against that tested freeze. Later server-only authority changes have separate final native replay. No claim that every historical run used the final whole-tree manifest is made.

Pixel comparison accounts for all480 pairs:369 identical,41 pixel differences,70 dimension differences,0 missing. Every changed pair is attributed with raw coordinates/hashes/components in pixel-attribution-post-wave. Most are approved 44px target/wrapping/focus changes or captured clock/transition state. One Chromium Clocker portrait contains25 keypad-edge paint differences (22 pixels have maximum channel difference1,2 have2,1 has4); their cause is **unproven**, preserved and reported as a nonblocking observation. No mask, threshold, ignored pixels or snapshot update hides them. Historical protected12-pixel and independent30-pixel evidence remain separate and unchanged.

Original RED tests, failed setup attempts, reviewer notes, screenshots, source snapshots and SDD handoffs remain external. Original frozen1401-unit run was green despite subsequently reproduced defects. Original SQL RED counts, browser proofs and corrected GREENs are individually attributed, not summed into an invented acceptance total.

Audit artifact corrections are documented: frozen UI harness wrote two generated docs (original20 bytes restored and all508 source hashes rechecked); review-package metadata initially hashed before flush (original retained); Next build generated two config files (archive then exact pre-build restore); same-prefix disposable DB names initially collided (unique label hashes now used); comparator JSON path accidentally overwrote one intermediate JSON (reconstructed from unchanged original screenshots/comparator, disclosed); B17 wrong-base review package superseded by correctly scoped v2. These are not passing product tests. The final unit run's two Employee/Lead failures were a proof mock incorrectly defaulting to Manager; the test-only fix preserves actual roles and all redirect/no-DB assertions, including correct Owner proof expectations. Failed run remains preserved.

## Remaining risks and honest boundaries

- No customer Neon HTTP-transport certification, hosted Preview verification, production capacity test, customer backup/restore exercise, physical iPhone/iPad/Android, assistive-technology screen-reader session or live/closed-app push delivery was performed. Providers remain disabled. Service workers are blocked in fixture browser contexts; unchanged worker behavior is covered by unit/source checks, not physical-device claims.
- Conservative complete-source/manual generation locking is correct under tested concurrency but requires operational monitoring at larger customer histories. A quiescent owned sample with51 fictional employees/357 availability windows/20 manual writes measured29.40ms median and35.96ms p95; it is not a production throughput guarantee. Deadline setup has per-employee reads; no demonstrated bottleneck justified a speculative rewrite.
- The singleton-workspace schema is the approved current architecture. General SaaS tenant/provisioning isolation remains later Productization work; this audit does not claim that no-workspace employee rows prove multi-tenant safety.
- Approved inactive-primary recovery behavior remains: an employee with an inactive primary location needs an active primary selected for core lifecycle edits; when all locations are inactive an Owner must reactivate/create one. Changing that policy requires product judgment and was not invented here.
- The25 tiny Clocker paint differences above remain unattributed; protected source, geometry, orientation checks and behavior are unchanged.

No unresolved customer-policy decision was needed for the controlled fixes. ChatGPT and Jose retain final acceptance authority. This local engineering handoff does not authorize merge, deploy or production activation.

## Exact affected boundaries

| Findings | Principal product files/functions |
|---|---|
| B01 | src/lib/data/notification-transactions.ts:commitPublishedWeekChange; publication-revisions.ts:publishScheduleWithRevision; schedules.ts:insertShift/updateShift/deleteShift; request-notifications.ts:commitRequestTransition; requests.ts:reviewTimeOffRequest; management-session.ts |
| B02 | src/lib/scheduling/capabilities.ts:assignmentCapabilityIssues; validate-shift.ts |
| B03 | src/lib/auth/session.ts:createSession; src/app/login/actions.ts |
| B04 | src/lib/data/employees.ts:activateEmployeeCredential |
| B05 | src/lib/data/management-session.ts:assertManagementProof/managementSessionStatements; employees.ts:insertEmployee/updateEmployeeProfile/saveEmployeeSchedulingProfile; locations.ts:createLocation/updateLocation; positions.ts:createPosition/updatePosition; workspaces.ts:saveWorkspaceProfile; week-settings.ts:setAvailabilityDeadline; schedule-health.ts guarded settings/window/quota writers; corresponding actual Server Actions |
| B06 | src/lib/data/employees.ts:saveEmployeeSchedulingProfile/updateEmployeeProfile; src/app/app/employees/actions.ts |
| B07 | src/components/configuration-form.tsx; employee-core-profile-form.tsx; employee-scheduling-fields.tsx |
| B08 | src/app/app/employees/page.tsx; [employeeId]/page.tsx |
| B09 | src/components/action-menu.tsx; action-menu-geometry.ts |
| B10 | src/components/employee-scheduling-fields.tsx; src/app/globals.css |
| B11 | src/app/globals.css:employee More account grid |
| B12 | src/components/portal-device-setup.tsx:dialog dismissal/focus effect |
| B13 | src/lib/data/manual-assignment-validation.ts:validateManualAssignments; notification-transactions.ts; schedules.ts; src/app/app/schedule/actions.ts/templates/actions.ts |
| B14 | src/app/app/settings/positions/page.tsx; src/app/globals.css |
| B15 | src/app/app/schedule/actions.ts; new/page.tsx; edit/page.tsx; templates/actions.ts; manual-assignment-validation.ts typed error |
| B16 | src/app/globals.css:scoped native checkbox focus outlines |
| B17 | src/app/app/schedule/generation-actions.ts; src/lib/data/schedule-generation.ts:generateWeekDraft; generation-exclusions.ts:clearGenerationExclusion |
| B18 | src/app/app/schedule/settings/actions.ts:saveSettings; src/lib/data/schedule-health.ts:saveScheduleHealthSettings and shared statement builders |
| B19 | src/app/app/schedule/settings/actions.ts:deleteCoverageWindowAction; src/lib/data/management-session.ts:isManagementAuthorizationError |

## Final gate results

| Gate | Result | Evidence |
|---|---|---|
| unit | PASS 1441/1441;140 files | [final-combined-unit-v2](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-unit-v2/output.log) |
| foundationSQL | PASS 223/223;5 files | [final-combined-foundation-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-foundation-v1/output.log) |
| generationSQL | PASS 176/176;4 files | [final-combined-generation-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-generation-v1/output.log) |
| exchangeSQL | PASS 163/163;14 files | [final-combined-exchanges-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-exchanges-v1/output.log) |
| notificationSQL | PASS 77/77;1 files | [final-combined-notifications-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-notifications-v1/output.log) |
| foundationConfig | PASS 8/8 | [final-combined-foundation-config-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-foundation-config-v1/output.log) |
| notificationConfig | PASS 6/6 | [final-combined-notification-config-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-notification-config-v1/output.log) |
| lint | PASS exit0 | [final-combined-lint-v2](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-lint-v2/output.log) |
| typecheck | PASS exit0 | [final-combined-typecheck-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-typecheck-v1/output.log) |
| build | PASS exit0 | [final-combined-build-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-build-v1/output.log) |
| phaseA-chromium | PASS 23/23 | [final-combined-phase-a-chromium-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-phase-a-chromium-v1/output.log) |
| phaseA-webkit | PASS 23/23 | [final-combined-phase-a-webkit-v1](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-combined-phase-a-webkit-v1/output.log) |

Totals above are suite counts, not unique acceptance-scenario counts. Final bare unit/build/typecheck/lint/exchange and native Phase A use the final522-file runtime freeze. Foundation/generation/notification/config runs differ only in the default-unit self-service mock; all of their suite and runtime inputs are identical. Both generated Next config files were archived/restored, with post-restore typecheck/lint. Two added handoff documents do not alter tested runtime/test inputs.

Exact source/gate attribution: [final-verification.json](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-verification.json). Independent final review: [final-authority-independent-review.md](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-authority-independent-review.md). Complete visual report: [post-wave-ui-verification-report.md](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/post-wave-ui-verification-report.md). Raw pixel attribution: [pixel-attribution-post-wave.md](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/pixel-attribution-post-wave.md). All seven widths and both engines passed480 screen captures and184 supplemental checks; no runtime/runner errors remained. Independent authority replays passed4 generation observations and8 settings observations.

Ownership-verified teardown is complete: all successful disposable factories closed their databases/runtimes; the one known failed-run database was checked against this audit cluster, invocation epoch, owner and exact guard-generated marker with zero clients, then dropped. Only the owned74492/60821 PostgreSQL cluster was stopped; port closure verified. Data directory, source snapshots and evidence remain preserved. No local preview is left running.

## Screenshots

- [Native revoked-session Remove returns to usable Sign In](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/final-authority-settings-green-v3/ui/delete-revoked-result.png)
- [WebKit Positions keyboard focus390px](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/post-wave-ui-supplement-v5-evidence/screenshots/webkit-positions-status-focused-crop-390.png)
- [Chromium long-name More320px — explicit device-status fixture](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/post-wave-ui-supplement-v5-evidence/screenshots/chromium-more-long-name-320.png)
- [WebKit stale scheduling form390px](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/post-wave-ui-supplement-v5-evidence/screenshots/webkit-scheduling-stale-retained-390.png)
- [Chromium Owner dashboard1440px](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/post-wave-browser-matrix/ui/final/screenshots/chromium-owner-home-1440x900.png)
- [WebKit Lead schedule1440px](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/post-wave-ui-supplement-v5-evidence/screenshots/webkit-lead-schedule-1440.png)
- [WebKit Clocker110 portrait](/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-independent-hardening/post-wave-ui-supplement-v5-evidence/screenshots/webkit-clocker-110-768x1024.png)

Full screen manifests preserve every matrix and supplemental frame. Full-page fixed elements can appear at a scrolled document position; viewport measurements and separate focused/clearance checks govern actual viewport behavior. No physical-device claim is made.

## Complete changed-file manifest

86 files; 16 added, 70 modified. No deletions.

- added: `docs/execution/phase-b-independent-audit.md`
- added: `docs/execution/phase-b-independent-changed-files.json`
- modified: `scripts/phase-a-app-qa.mjs`
- modified: `src/app/app/employees/[employeeId]/page.tsx`
- modified: `src/app/app/employees/actions.test.ts`
- modified: `src/app/app/employees/actions.ts`
- modified: `src/app/app/employees/page.test.tsx`
- modified: `src/app/app/employees/page.tsx`
- modified: `src/app/app/requests/actions.test.ts`
- modified: `src/app/app/requests/actions.ts`
- modified: `src/app/app/schedule/actions.test.ts`
- modified: `src/app/app/schedule/actions.ts`
- modified: `src/app/app/schedule/assignment-actions.test.ts`
- modified: `src/app/app/schedule/edit/page.tsx`
- modified: `src/app/app/schedule/generation-actions.test.ts`
- modified: `src/app/app/schedule/generation-actions.ts`
- added: `src/app/app/schedule/manual-conflict-actions.test.ts`
- modified: `src/app/app/schedule/new/page.tsx`
- modified: `src/app/app/schedule/settings/actions.test.ts`
- modified: `src/app/app/schedule/settings/actions.ts`
- modified: `src/app/app/schedule/settings/page.test.tsx`
- modified: `src/app/app/schedule/templates/actions.ts`
- modified: `src/app/app/self-service-guards.test.ts`
- modified: `src/app/app/settings/actions.test.ts`
- modified: `src/app/app/settings/actions.ts`
- modified: `src/app/app/settings/positions/page.tsx`
- modified: `src/app/globals.css`
- modified: `src/app/login/actions.test.ts`
- modified: `src/app/login/actions.ts`
- added: `src/components/action-menu-geometry.test.ts`
- added: `src/components/action-menu-geometry.ts`
- modified: `src/components/action-menu.tsx`
- added: `src/components/configuration-form.test.tsx`
- modified: `src/components/configuration-form.tsx`
- modified: `src/components/employee-core-profile-form.test.tsx`
- modified: `src/components/employee-core-profile-form.tsx`
- modified: `src/components/employee-scheduling-fields.tsx`
- added: `src/components/portal-device-setup-focus.test.tsx`
- modified: `src/components/portal-device-setup.tsx`
- modified: `src/lib/auth/session.ts`
- modified: `src/lib/data/employees.ts`
- modified: `src/lib/data/exchanges-notifications.test.ts`
- modified: `src/lib/data/generation-exclusions.test.ts`
- modified: `src/lib/data/generation-exclusions.ts`
- modified: `src/lib/data/locations.test.ts`
- modified: `src/lib/data/locations.ts`
- added: `src/lib/data/management-session.ts`
- added: `src/lib/data/manual-assignment-validation.ts`
- modified: `src/lib/data/notification-transactions.ts`
- modified: `src/lib/data/operational-profile.test.ts`
- modified: `src/lib/data/positions.test.ts`
- modified: `src/lib/data/positions.ts`
- modified: `src/lib/data/publication-revisions.test.ts`
- modified: `src/lib/data/publication-revisions.ts`
- modified: `src/lib/data/request-notifications.ts`
- modified: `src/lib/data/requests-notifications.test.ts`
- modified: `src/lib/data/requests.ts`
- modified: `src/lib/data/schedule-generation.test.ts`
- modified: `src/lib/data/schedule-generation.ts`
- modified: `src/lib/data/schedule-health.ts`
- modified: `src/lib/data/schedules-notifications.test.ts`
- modified: `src/lib/data/schedules.ts`
- modified: `src/lib/data/scheduling-inputs.test.ts`
- modified: `src/lib/data/week-settings.ts`
- modified: `src/lib/data/workspaces.ts`
- modified: `src/lib/scheduling/capabilities.ts`
- modified: `src/lib/scheduling/validate-shift.ts`
- added: `src/test/fixtures/management.ts`
- modified: `src/test/integration/deadline-handoff.integration.ts`
- modified: `src/test/integration/foundation.integration.ts`
- modified: `src/test/integration/generation-cross-layer.integration.ts`
- modified: `src/test/integration/generation-provenance.integration.ts`
- added: `src/test/integration/generation-session.integration.ts`
- added: `src/test/integration/management-api.ts`
- modified: `src/test/integration/notifications.integration.ts`
- modified: `src/test/integration/owned-app-fixture.ts`
- added: `src/test/integration/phase-b-integrity.integration.ts`
- added: `src/test/integration/phase-b-management-session.integration.ts`
- modified: `src/test/integration/schedule-generation.integration.ts`
- added: `src/test/integration/schedule-settings-session.integration.ts`
- modified: `src/test/integration/shift-change-pending-callout.integration.ts`
- modified: `src/test/integration/shift-change-races.integration.ts`
- modified: `src/test/integration/shift-changes.integration.ts`
- added: `vitest.config.mts`
- modified: `vitest.foundation-integration.config.mts`
- modified: `vitest.generation-integration.config.mts`
