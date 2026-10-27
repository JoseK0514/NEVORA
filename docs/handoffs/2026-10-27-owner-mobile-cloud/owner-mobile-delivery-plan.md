# Owner mobile delivery plan

Proposed October 26, 2026 (America/Puerto_Rico). This organizes the remaining work; it does not authorize actual application changes or deployment. Current local mockup SHA-256: 65f2a5d5cbb596f90a2d08adb2fca30c869e1142e8325e9d25f23326e70d1c64. Updated October27 as bounded mockup batches complete; actual application changes and deployment remain outside this plan.

Section 1 is now complete in the local mobile Owner mockup. See [timecard decisions review](timecard-decisions/review.md). Real application integration remains separate.

Section 2.1 is now complete in the local mobile Owner mockup. See [attendance review](owner-attendance/review.md). Section 2.2 Availability/weekly Team is also complete in the local mockup; [review](owner-weekly-team/review.md). Section 2.3 Time-off decisions/history is also complete in the local mockup; [review](owner-timeoff/review.md). Section 2.4 Shift swaps/coverage pickups is also complete in the local mockup; [review](owner-exchanges/review.md). Section2.5 Callouts/closing coverage is also complete in the local mockup; [review](owner-callouts/review.md). Section2.6 and the connected local Daily Operations gate are complete; [review](owner-triage/review.md). Section3.1 Company details/settings navigation is complete; [review](owner-company/review.md). Batch3.2 Locations is complete; [review](owner-locations/review.md). Batch3.3 Positions/break types is complete after executor repairs; [review](owner-catalogs/review.md). Batch3.4 Branding/logo is complete; [review](owner-branding/review.md). Batch3.5 Features and words is complete; [review](owner-features/review.md). Next3.6 Company/location operational policies and history/conflicts. OverallSection3 remains in progress.

## Standing phase progression rule

User instruction updated October27,2026: finish and verify the current phase, then continue through the mobile Owner roadmap in order without requesting routine phase-by-phase permission again. Keep one implementation batch active. Advance only after all batches and the connected phase walkthrough pass, known material findings are resolved, affected regressions pass, and final-source evidence is saved. A failed required check keeps the phase open.

Use the [phase completion standard](owner-mobile-quality-gates.md) at every transition. Preserve the accepted design system. Prototype verification, real integration, physical-device/screen-reader validation and deployment are separate statuses; this instruction authorizes continued mobile Owner mockup work only.

Current gate: Section2 local mockup checks pass. Section3.1 local mockup gate passes; 3.2 Locations and3.3 Positions/break types also pass; 3.4 Branding/logo also passes; 3.5 Features and words also passes; next3.6 Company/location policies/history; overallSection3 remains in progress. Production integration and physical-device/screen-reader validation remain separate.

## Working model

Use ten sections for tracking, with one complete user workflow as the implementation batch. A section is not a single giant build. Keep one implementation batch active; review/checking may be separated from the builder when authorized. Batch size follows one user job or decision, not an arbitrary screen count. Split a batch if it contains independent decisions, incompatible source modes or unrelated save boundaries. Loading/error/result states belong to the workflow that owns them.

Continue the Owner mobile mockup first. Each accepted section becomes a candidate for staged real-app integration under separate authorization. Prototype-complete, integrated, tested-on-device and deployed are separate ledger fields. Do not treat the plan as permission to operate on real employee/pay/customer data, credentials or delivery services.

The original 69 remaining/partial workflow rows map to these sections exactly once. This count is not 69 screens, an effort estimate or a completion percentage. The 27 working mockup groups remain foundations; they are not discarded or certified production-complete.

## Sections and batches

### 1. Timecard decisions

Inventory: P-02, P-03, P-04, P-05.

Dependencies: Existing foundation; no new section prerequisite. These order data/UI readiness, not production rollout permission.

- [x] 1.1 — Individual timecard approval
- [x] 1.2 — Finalization of an approved timecard
- [x] 1.3 — Reopening with a reason and retained history
- [x] 1.4 — Explicit batch approval/finalization with per-person outcomes

Exit: One employee or an explicit eligible batch can complete review and receive a truthful result without losing period/person context.

### 2. Daily operations

Inventory: A-01, H-01, H-02, H-04, I-01, I-02, I-03, R-01, R-02, R-03, R-04, R-05, R-06.

Dependencies: 1. These order data/UI readiness, not production rollout permission.

- [x] 2.1 — Attendance exception review and exact employee/timecard handoffs
- [x] 2.2 — Availability review and weekly Team overview
- [x] 2.3 — Time-off decisions and decided-request history
- [x] 2.4 — Shift swaps and coverage pickups
- [x] 2.5 — Callouts and closing coverage requests
- [x] 2.6 — Complete Home/Inbox triage, current counts and exact origin return

Exit: Every remaining daily item has a complete review/decision or explicit unavailable state, plus a reliable route from and back to Home/Inbox.

### 3. Company setup, settings and Clocker

Inventory: H-03, A-04, C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11, C-12, C-13.

Dependencies: Existing foundation; no new section prerequisite. These order data/UI readiness, not production rollout permission.

- [x] 3.1 — Company details and settings navigation — [review](owner-company/review.md)
- [x] 3.2 — Location directory/add/edit/deactivate — [review](owner-locations/review.md)
- [x] 3.3 — Positions and break-type lifecycles — [review](owner-catalogs/review.md)
- [x] 3.4 — Branding and logo — [review](owner-branding/review.md)
- [x] 3.5 — Terminology and enabled modules — [review](owner-features/review.md)
- [ ] 3.6 — Company/location operational policies and history/conflicts
- [ ] 3.7 — First-run setup checklist tied to the real configuration fields
- [ ] 3.8 — Clocker device setup and protected setup code
- [ ] 3.9 — Clocker device management and saved clock-action receipt lookup

Exit: Every configuration/device action has a source-correct editor, reviewed consequence, result and recovery; affected Team/Schedule surfaces remain coherent.

### 4. Time exports and handoff

Inventory: P-06, P-07, P-08, P-09, P-10.

Dependencies: 1. These order data/UI readiness, not production rollout permission.

- [ ] 4.1 — Mapping profile creation and selection
- [ ] 4.2 — Finalized-time export selection/generation
- [ ] 4.3 — Period population, employment facts and exclusions
- [ ] 4.4 — Batch/manifest reconciliation
- [ ] 4.5 — File downloads and explicit downstream handoff status

Exit: The reviewed finalized population maps to the exact generated artifacts and handoff record, without implying payroll payment or provider acceptance.

### 5. Payroll setup

Inventory: P-19, P-20, P-21, P-22.

Dependencies: 3. These order data/UI readiness, not production rollout permission.

- [ ] 5.1 — Company payroll settings and effective pay schedule
- [ ] 5.2 — Employee native payroll facts
- [ ] 5.3 — Employee exceptions and financial grants
- [ ] 5.4 — Opening balances and native Manager payroll scope

Exit: Required configuration/facts and mode-specific permissions are explicit; missing facts remain distinguishable from attested zero values.

### 6. Payroll processing

Inventory: P-11, P-12, P-13, P-14, P-15, P-16, P-17, P-18.

Dependencies: 1, 4, 5. These order data/UI readiness, not production rollout permission.

- [ ] 6.1 — Run history, period preparation and backlog
- [ ] 6.2 — Native payroll calculation
- [ ] 6.3 — Historical-provider amount import
- [ ] 6.4 — Amount/source evidence review
- [ ] 6.5 — Exact-revision payroll approval
- [ ] 6.6 — Linked payroll corrections
- [ ] 6.7 — Private statement generation/publication/viewing
- [ ] 6.8 — Supported payment-instruction handoff and failed-job review/retry

Exit: The supported mode can complete its review chain with accurate amounts, source/revision identity, separate approvals/statements and truthful outcomes.

### 7. Workforce insights and reporting

Inventory: P-23, P-24.

Dependencies: 1, 2. These order data/UI readiness, not production rollout permission.

- [ ] 7.1 — Period-based insights and reliability/definitions
- [ ] 7.2 — Employee detail and exact timecard links
- [ ] 7.3 — CSV and print/save-PDF handoff

Exit: Report numbers and definitions agree with the reviewed source/period, and downloads remain usable on phones.

### 8. Company updates and notifications

Inventory: U-01, U-02, U-03, U-04.

Dependencies: 2. These order data/UI readiness, not production rollout permission.

- [ ] 8.1 — Update lists, details and acknowledgement requirements
- [ ] 8.2 — Compose, audience review and publication
- [ ] 8.3 — Edit/withdraw and recipient read/acknowledgement state
- [ ] 8.4 — Notification history, mark read and exact destinations

Exit: Audience and publication are deliberate, read/acknowledgement states are accurate, and opening a notification reaches the right current target.

### 9. Owner account, navigation and discovery

Inventory: F-01, F-02, F-03, F-04, F-05, F-06, F-07, N-01, N-02.

Dependencies: Existing foundation; no new section prerequisite. These order data/UI readiness, not production rollout permission.

- [ ] 9.1 — Owner account/profile page
- [ ] 9.2 — Notification topics and device alerts
- [ ] 9.3 — Passkey enrollment/removal
- [ ] 9.4 — Owner personal statements when available
- [ ] 9.5 — Support/privacy/terms
- [ ] 9.6 — Personal account-deletion request
- [ ] 9.7 — Sign-out and ended-session/recovery handoffs
- [ ] 9.8 — People/place/tool finder
- [ ] 9.9 — Final capability-aware navigation and deep-link reconciliation

Exit: The Owner can find authorized tasks and manage their own account with protected identity, clear consequences and reliable return paths.

### 10. Conditional AI Manager

Inventory: AI-01, AI-02, AI-03, AI-04, AI-05.

Dependencies: 1, 2, 3, 4, 5, 6, 7, 8, 9. These order data/UI readiness, not production rollout permission.

- [ ] 10.1 — Priority briefing and evidence/source links
- [ ] 10.2 — Track/defer/dismiss/restore issues
- [ ] 10.3 — Questions, cancellation and connection states
- [ ] 10.4 — Saved owner priorities and conflict review
- [ ] 10.5 — Assisted coverage and attendance/payroll review

Exit: Suggestions stay grounded in current assessed evidence and lead to reviewed existing workflows; availability/permissions are explicit.

## Standing work across every section

Keep permission/module visibility, source-contract accuracy, navigation and data minimization active from the first batch. Section 9 contains the remaining standalone account/finder surfaces and final route reconciliation; it is not permission to postpone authorization checks until later. The physical device/accessibility and actual server integration requirements apply to already-built slices too.

Retain the approved teal/neutral palette, system typography, Phosphor icons, shared spacing/radii and 44/48px control roles. Reuse accepted list, field, disclosure, task-header, review and result components. New global component/token decisions require a clear reusable need and documented review; never replace the visual world during a feature batch. Keep the source-backed feature inventory alongside design so low-frequency desktop tools do not disappear on mobile.

## Definition of a finished batch

1. **Grounded scope:** read the current actual source/contract and incumbent UI; record user job, exact fields/actions, gates, save boundary, required states and exclusions. Identify any live dependencies before promising a result.
2. **Complete journey:** implement the useful entry → context/details → relevant action/review → confirmed/unknown/blocked outcome → meaningful return. Use only the steps the task needs; do not add unnecessary confirmation pages.
3. **Visual review:** inspect alignment, type/weight hierarchy, color meaning, icon scale, button geometry, content lengths and section rhythm against accepted references. Verify 320/390/430px phones and the review canvas, 100/200% text, long/missing content and native mobile input. A clean static scan is not visual approval.
4. **Interaction/accessibility review:** keyboard/focus, modal boundaries, labels/errors, Back/deep links, retained drafts, selected date/location/person/filter and source-appropriate pending/error/stale/conflict/unknown states. Do not claim screen-reader or physical-device certification from DOM tests.
5. **Regression/evidence:** run meaningful focused cases and affected neighboring flows. Check shared component changes against representative existing screens. Save actual screenshots, exact source hashes, commands/results, scope and findings. Never weaken assertions, silence failures or relabel historical reports as current.
6. **Acceptance/handoff:** close known required findings, record what is complete and what remains, update the current coverage ledger and preserve the source/diff. A failed required check keeps the batch open; do not stack unfinished work behind it. Human taste feedback is requested against a concrete working result, not an abstract permission question.

Verification is bounded: build the whole batch, inspect sizes/states together, make one combined repair batch and confirm once. Do not start an open-ended micro-polish loop. If the required result still fails, leave it clearly incomplete, preserve the evidence and resolve/escalate the specific failure before starting another batch. Passing unrelated tests again is not a substitute for resolving a known defect.

## Section completion

After its batches pass, walk the connected section as an Owner on a phone. Check initial arrival, representative daily task, unusual/empty/error path and return to the root. Then inspect shared dependencies: Schedule/Team after catalog changes; Timecards after correction/approval changes; exports/payroll after revision/source changes. Reopen a previously accepted batch only for new evidence or an approved requirement change.

Real integration should follow these same sections in an isolated development environment, with actual source contracts/server authorization/concurrency and rollback evidence. Connect a reviewed section and verify it before expanding integration. Physical iPhone/Android, screen-reader, file/device/permission and real network-state checks are required before claiming release readiness. No production rollout is authorized by this plan.

## Original first batch (now completed): 1.1

Individual timecard approval. Reuse the existing employee timecard detail and correction-review vocabulary. Review the exact employee/ended period/current revision, recorded time, breaks and blockers; preserve the no-self-review/source gates. Add deliberate approval with pending, confirmed, blocked, changed-source and unknown-result recovery supported by the source. Update the list/status and return to the same context. Finalization, batch operations, exports and money movement are outside this first batch.

The implementation brief must re-read the actual approval writer/DTO/state contract before coding; this roadmap does not invent an API, receipt lookup or retry protocol. The next batch is finalization only after 1.1 passes its definition of done.
