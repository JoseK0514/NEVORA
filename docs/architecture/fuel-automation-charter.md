# NEVORA automation delivery charter

**Scope recorded 2026-10-02.** Principle: **Automate normal work. Surface exceptions.** This is a future delivery contract, not an implementation claim. Phase 0 changes presentation and documentation only. It does not enable automation, apply migrations, change permissions, provision devices or connect services. Jose reviews Phase 0 before any next phase begins.

## Existing foundation and limits

Inventory at `5e983a6bf6d7b22d3b2f47f96f98d2236060d33e`:

| Area | Existing source evidence | Limit / next required work |
| --- | --- | --- |
| Scheduling | `src/lib/scheduling/validate-shift.ts`, `exchange-validation.ts`, `src/lib/data/schedule-templates.ts`, schedule actions and health checks | Validation, templates and copy-week foundations exist. This does not demonstrate an automatic draft generator, protected-assignment policy or configurable cross-location maximum-hour enforcement |
| Swaps / coverage | `src/lib/data/exchanges.ts`, exchange actions and marketplace tests | Accepted swaps and coverage claims currently enter `MANAGER_PENDING`. Future permitted automatic completion requires a distinct transactional/revalidation change; Phase 0 preserves current behavior |
| Replacement | Callout and open-coverage workflows | Voluntary request/claim foundation exists; expiry, configurable automatic confirmation and escalation require a later phase |
| Timekeeping | `src/lib/time-clock.ts`, `src/lib/data/time-clock.ts`, [time-clock architecture](time-clock.md), `src/components/clocker-kiosk.tsx` | Types and manager-only read foundation exist. Migration preparation is not deployment. Clocker remains a local-state demo accepting four digits, not private server PIN validation or persisted punches; My Time remains disconnected. Do not present demo success as a recorded punch |
| Communication | `src/lib/assistance/notification-events.ts`, `src/lib/data/notifications.ts`, publication/request actions | Targeted event builders and notification persistence exist. This does not verify live delivery, automatic outstanding reminders or shift handovers |

The Employee Home's current demo clock/shift values and the fixture preview are not evidence of integrated timekeeping. Inspect these integration gaps in the relevant later phase; do not replace unavailable data with invented values.

## Bounded future roadmap

The sequence below expresses dependencies. Each row needs its own verified inventory, bounded plan and review; it is not authorization to execute every row now.

| Phase boundary | Required behavior / acceptance contract |
| --- | --- |
| Shared eligibility and scheduling drafts | Reuse one server-side eligibility policy across manual scheduling, swaps and coverage. Include active employee, location eligibility, approved time off, availability, overlaps, coverage and required Lead checks. Include **all configured locations** in conflicts and hour totals (including Fuel’s existing two locations). Distinguish target hours from maximum hours and specify exception/blocking policy before implementation. Reuse templates/copy previous week; generate automatic weekly **drafts**; respect protected/fixed assignments; offer **Fill Gaps Only** without replacing existing assignments. Manager reviews exceptions and explicitly publishes. Never silently alter a published week |
| Permitted Employee swaps | Obtain both employees' consent; revalidate current rules and both assignments at acceptance, not just request creation. Automatically complete when all rules pass, with no routine manager approval. Update both assignments atomically, notify affected employees, and surface exceptions requiring review. Preserve current manager approval until this later behavior is separately implemented and verified |
| Replacement staffing | Offer only to eligible candidates. Require voluntary offers/acceptance; never allocate extra hours without acceptance. Make automatic claim confirmation configurable. Revalidate on claim, protect against duplicate/simultaneous claims, expire stale offers, and escalate unfilled or blocked requests without repeatedly notifying people who already responded |
| Registered-device timekeeping | Implement real server-persisted punches from registered authenticated devices with server-resolved locations and private employee PIN validation. Use accurate timestamps, command retry identity and atomic lifecycle transitions. Employee portal reads punches but cannot create/edit them. Automatically alert management to discrepancies; normal entries need no routine review. Never automatically alter recorded hours to conceal a discrepancy |
| Targeted communication | Send schedule/request notifications only to affected employees; reminders only while the relevant action remains outstanding. Support short shift instructions and handovers. No general chat and no instruction acknowledgements |

## Reliability and exclusions

Validate input and authorization on the server; preserve UI, contracts and data-access boundaries. Check current state at the final write, use atomic updates and race protection, and make retries idempotent with transaction/event identity. Return explicit failures and reconcile from persisted results after interruption. Stop expired/duplicate/redundant actions. Preserve original correction records with their corrections; these are reliability requirements, not a general audit dashboard.

Timekeeping's registered-device, command ledger, expected-entry and lifecycle requirements continue to follow [the existing time-clock contract](time-clock.md). A URL location, demo PIN, screenshot or successful build is not authentication. Any migration/device rollout needs separately authorized environment selection, isolated tests, least privilege and rollback; retain punch history.

Explicitly excluded:

- Payroll processing, approvals, exports and integrations.
- POS or labor analytics.
- General audit/activity dashboard.
- Instruction acknowledgements and “Question About This Shift.”
- Attendance scores or disciplinary automation.
- General chat.

Existing unrelated screens/behaviors are preserved during Phase 0; exclusion from this automation roadmap is not permission to remove them.

## Workflow for every later phase

1. Verify its approved base, branch, worktree, dirty files and preview source; preserve existing work.
2. Inventory what exists and distinguish implemented, configured, authenticated, tested and deployed states.
3. Present a bounded implementation plan, dependencies and acceptance checks for that phase.
4. Reuse [the Fuel UI contract](../ui/fuel-ui-contract.md). New action-color pairings require representative control review before adoption.
5. Add focused behavioral tests for the phase, including relevant authorization, concurrency, retries and failure paths.
6. Implement only that phase, with isolated data and no live customer mutations/messages as tests without explicit authorization.
7. Verify actual functionality and rendered appearance. Run the repository's applicable checks and the UI contract's viewport/state comparisons. Report failures honestly; do not weaken tests.
8. Produce a reviewable diff, before/after screenshots and a precise preview URL; label fixtures separately from authenticated/database verification. Record branch/commit/deployment state and remaining work in a repository handoff.
9. **Stop for review.** Do not begin another phase, push, merge, deploy or migrate without the applicable authorization. Jose provides final visual approval.

See [the Phase 0 plan and verification record](../superpowers/plans/2026-10-02-fuel-ui-phase-0.md).


## Pre-Phase-4 workspace foundation (2026-10-03)

The historical inventory above remains a phase record. The [current workspace foundation](nevora-workspace-foundation.md) now supplies configured workspace/timezone, arbitrary active locations, derived readiness, separate operational positions and employee qualification, per-window quotas and shared maximum-hour evaluation. Phase 4 must use the existing engine with active READY locations, eligibility, positions/quotas and configured workspace zone. It must not add static Fuel IDs or a second rule implementation.

This foundation does not implement Build Week, Fill Gaps Only, automatic assignment/selection/publishing, scheduler provisioning or production onboarding. Skills, certifications, expirations, documents, training and qualification reminders remain deferred. Production baseline/distribution/provisioning tooling belongs to separately reviewed Productization. Prepared 0008 and local fixtures are not live activation; Phase 3 provider/device/plan restrictions remain in force. Stop for foundation approval before Phase 4.
