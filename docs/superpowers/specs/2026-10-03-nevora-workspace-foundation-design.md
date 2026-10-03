# NEVORA Workforce — Workspace, Locations & Positions Foundation

**Date:** 2026-10-03, America/Puerto_Rico. **Status:** architecture and implementation approved by Jose for Subagent-driven execution, with full production fresh-provisioning/schema-distribution deferred. Migration 0008, generic database verification and complete scheduling foundation remain required.

**Exact implementation parent:** `0a12f1f4ac7212a8cbbe195f013407a8bc74c4d5`.

**Branch:** `codex/nevora-pre-phase4-foundation`.

**Worktree:** `/Users/josek0514/.codex/worktrees/nevora-pre-phase4-foundation/Fuel-Scheduler-`.

## 1. Intent and boundaries

Make NEVORA Workforce usable by a small business with its own name, timezone, locations, staffing requirements and job positions. Fuel Coffee Drive remains the existing customer. Preserve its identities, configured rules, eligibility, schedules and history. Establish inputs and reusable validation needed by Phase 4; do not implement automatic employee selection, assignment, Build Week, Fill Gaps Only or automatic publishing.

The product hierarchy is VELANI LLC → NEVORA → Workforce → configured customer/workspace. Preserve the current transparent official wordmark, cyan A detail, reusable `BrandLockup`, subtle legal wording and the approved UI contract. Workspace identity comes from persisted data. No customer-specific product imagery or new theme.

This deployment has one configured workspace. No billing, subscriptions, organization switching, invitations, public signup, tenant administration, notification inbox or customer themes. Access roles remain OWNER, MANAGER, LEAD and EMPLOYEE. Skills, certifications, expirations, documents, training and qualification reminders are deferred to the post-core backlog; no empty skills tables or speculative qualification UI.

No push, merge, deployment, existing-database migration, paid upgrade, scheduler activation or real push delivery. Local PostgreSQL tests may create only new ownership-marked loopback databases with fictional data and must destroy them afterward. Physical-device delivery remains a separate authorized activation step.

## 2. Inspected source of truth and reuse

| Existing boundary | Reuse / extension |
| --- | --- |
| `src/lib/domain.ts`, `data/employees.ts`, existing `locations` and `employees` | Preserve IDs, authorization roles and active states; extend location identity and employee position qualification. |
| `employee_location_eligibility` | Keep the existing eligibility join; no second location-access model. |
| `location_staffing_settings`, `location_coverage_windows` | Keep overall staffing, designated Lead requirement and recurring coverage windows; attach optional position quotas to windows. Missing configuration becomes structured setup state instead of a thrown missing-staffing page. |
| `employee_scheduling_settings` | Preserve target and maximum hours, current maximum default 40 and exact-limit validity. |
| `scheduling/validate-shift.ts`, `schedule-health.ts`, `periods.ts` | Extend the same domain engine; preserve availability precedence, cross-location overlap, one-shift-per-day automatic policy and scheduled-hour calculations. |
| `availability_windows`, weekly windows/submissions and dated exceptions | Preserve normal availability plus day overrides, legacy full-week semantics, unavailable-all-week and deadlines. |
| Time Off / exchanges / call-outs | Preserve decisions and transitions; no automatic swap or coverage workflow. |
| Schedules, templates, publication revisions and acknowledgements | Add nullable position identity without stripping it in copies, templates, exchanges or immutable publication snapshots. |
| Phase 3 notifications, subscriptions, outbox, worker and ownership reconciliation | Keep durable transaction and delivery architecture; supply configured timezone and current active-location access through existing boundaries. |
| `BrandLockup`, AppShell, approved raw CSS and forms | Reuse geometry, spacing, typography and states for the small management additions. |
| `/clocker/[location]`, ClockerKiosk and its local-state demo | Replace configured location resolution and timezone input only; no persisted punches, device provisioning or notification prompts. |
| `src/test/integration/local-postgres.ts` | Retain refusal of existing/non-loopback databases, unique ownership marker, exact migration execution and verified teardown. Extend it for foundation tests. |

The inspection found runtime Fuel workspace constants, hardcoded bootstrap locations, two static Clocker routes, fixed UTC−04 notification conversions and Barista labels derived from access roles. Existing scheduling queries largely already use arbitrary IDs. README provisioning instructions describe the old seed path inaccurately and must be replaced.

## 3. Persistence model

Prepare `db/migrations/0008_workspace_positions.sql`. Do not edit migrations 0001–0007. Use their existing BEGIN/COMMIT convention. Application startup/build must not run migrations.

Add `workspaces`: stable text ID, name, `time_zone`, active, created/updated timestamptz, and a checked unique singleton marker enforcing the one-workspace deployment. No runtime Fuel name or timezone default. Backfill the existing installation to one explicitly identified Fuel Coffee Drive workspace with `America/Puerto_Rico` as customer data in migration 0008.

Extend `locations` with non-null `workspace_id` and `clocker_key`. Backfill every existing location into the configured workspace, preserve IDs/names/active values and existing settings. Backfill loc-1 → key `2`, loc-2 → key `110`; other existing locations receive deterministic ID-based safe keys. Abort a collision rather than remapping silently. Do not leave a Fuel workspace ID as a column default in the generated schema.

Keys are unique within the workspace, lowercase URL-safe ASCII, 1–64 characters, matching `[a-z0-9]+(?:-[a-z0-9]+)*`. New creation accepts an explicit key or generates an ID-based key once. Display-name edits never derive or alter the key. Ordinary edit actions do not expose key mutation; retain keys during deactivation/reactivation and preserve existing `/clocker/2` and `/clocker/110` links. Location names are trimmed Unicode text, up to 160 characters; short names up to 48. IDs are independent of names.

Add `positions`: stable ID, workspace FK, name up to 80 characters, active, created/updated timestamps and workspace-scoped case-insensitive name uniqueness, including inactive records. Reuse an inactive position by reactivating its record; do not create ambiguous duplicate identities. No position colors, icons or pay fields.

Add `employee_positions(employee_id, position_id)` with a composite primary key and foreign keys. Employees may hold multiple positions. Do not backfill Barista or any position from an access role. Old employees begin with no position qualifications and remain valid for positionless assignments.

Add `coverage_window_position_requirements(coverage_window_id, position_id, quantity)` with unique window/position membership and positive integer quantities 1–100. Add nullable `position_id` to shifts and template shifts; add nullable position ID and captured position name to publication revision shifts. Referential behavior must preserve referenced position history; catalog management deactivates instead of deleting. Publication display uses the captured label, while change identity compares the position ID.

No duplicate employee, availability, schedule, notification or staffing tables. Existing operational records derive their workspace through existing location relationships; this is not a claim of full multi-tenant isolation.

## 4. Repositories, authorization and concurrency

Introduce focused workspace, location and position repositories, using the existing SQL executor/transaction conventions. Workspace name/timezone reads are server-owned. A client cannot choose a workspace ID to override current configuration. Public authentication pages expose only the configured workspace name, never employee or operational data. If configuration is unavailable, render a generic NEVORA authentication identity and an honest unavailable state; never substitute Fuel or fabricated customer data. Authenticated operational reads fail honestly rather than returning invented empty records.

Owner controls workspace profile, location structure and position catalog. Manager/Owner retain existing employee-management and operational scheduling permissions. Assigning positions does not grant access roles. Position/eligibility changes on existing employees use the same management permission boundary as employee creation. Employee/Lead cannot mutate structural configuration or their own qualifications. Server actions reauthorize, validate active referenced records, reject forged IDs and use transactions for membership replacement.

Operational selectors use active records. Historical readers can resolve inactive records and show their retained names/statuses. Deactivation does not delete memberships, schedules, templates, revisions, time records or request history. New assignments to inactive locations/positions are rejected. A retained requirement referring to an inactive position produces an actionable configuration problem, not a silently removed quota.

Serialize workspace profile changes with a workspace row lock. Business writers that create dated scheduling, availability or leave records take a compatible shared workspace lock; timezone changes take an exclusive lock and recheck the absence of operational records inside the same transaction. Existing time entries also block a timezone edit, but this pass creates no time-entry writer. A future writer must use the same guard. Use a consistent order: workspace, sorted affected workweeks, sorted affected employees, then sorted location/position facts and membership guards. Catalog writes take the applicable ordered subset. Locations, qualifications and quotas use these locks/snapshot guards so removal or deactivation racing an assignment cannot produce an assignment validated against stale inputs. Extend existing week/snapshot guards rather than bypassing Phase 3 transaction behavior. Test both racing outcomes; no unbounded retry loop.

## 5. Workspace timezone and workweek

One workspace IANA timezone is required; no per-location zones or browser-local fallback. Fuel retains `America/Puerto_Rico`. Preserve the approved Monday 00:00–next Monday 00:00 workweek, interpreted in the configured workspace timezone. Calendar date arithmetic operates on business date strings; the dates displayed on a page do not redefine the workweek.

UTC timestamp persistence is unchanged. Store availability deadlines and notification instants as UTC timestamptz; display and parse them in the workspace zone. Preserve the existing scheduled wall-minute hour policy, including overnight/workweek splitting. A DST-crossing planned four-hour wall-time period remains four scheduled hours under this existing policy; this is not a measurement or alteration of actual worked hours.

Use one pure `business-time.ts` boundary for business date/time formatting and local-time-to-instant conversion. Plan one exact open-source dependency, `@js-temporal/polyfill` 0.5.1, imported explicitly without installing a global polyfill. No dependency is installed in the documentation checkpoint. Its [release notes](https://github.com/js-temporal/temporal-polyfill/blob/main/CHANGELOG.md) document this version; Temporal's [timezone handling](https://tc39.es/proposal-temporal/docs/timezone.html) defines explicit ambiguity behavior.

Reject malformed, nonexistent or ambiguous local deadline inputs with a useful validation error rather than guessing an offset. Newly edited assignment boundaries must also be representable unambiguously when converted for time-sensitive events. Legacy boundaries that cannot be resolved suppress the corresponding time-dependent push/reminder with an internal invalid-time outcome; do not crash the worker or invent an instant. Keep nominal scheduling-hour semantics separate from this instant conversion. Routine quiet-hour boundaries use zoned calendar arithmetic and never add a fixed UTC offset.

Before operational records exist, Owner may change timezone. Once schedules, publication history, dated/weekly availability, availability deadlines, Time Off or time entries exist, block normal timezone changes. Normal availability and location/employee catalog entries alone do not lock the zone. Check on the server even if the UI disables the field. Exact explanation: “Changing the business timezone requires a separately reviewed conversion because operational records already exist.” Do not build that conversion workflow.

## 6. Derived scheduling readiness

Readiness is computed, not another stored boolean. Return `READY`, `NEEDS_SETUP` or `INACTIVE`, plus stable issues with location IDs and useful messages. Check configured active workspace/location, a valid explicitly configured staffing/Lead rule, at least one valid expected coverage window, active referenced position quotas and at least one active employee eligible for the location. Report missing staffing, missing coverage periods, invalid/inactive position requirements or no eligible employees explicitly.

Do not demand invented weekday coverage, standard opening hours, minimum 2/6 staff, any job position or a Lead qualification merely to create a location. Required Lead coverage is an operational staffing constraint; absence of a qualified scheduled Lead is a coverage gap. Existing manual scheduling/approval behavior stays intact. Manual health may still describe legacy shift intervals; missing setup is never reported as full configured coverage. Future Phase 4 must consume readiness and explicitly exclude/block non-ready locations. This foundation does not invoke that future generator.

## 7. Position qualification and coverage semantics

Employee positions describe what someone is qualified to work. One shift has at most one assigned operational position. No inference from an employee's access role or sole qualification. A positionless shift is valid when no assigned-position requirement applies.

Extend `validateShift` with configured location/workspace and active position facts. In addition to existing hard rules, reject an inactive location, an inactive/unknown assigned position or an employee who lacks that assigned position. Keep cross-location overlap, approved leave, availability precedence, maximum hours and automatic one-shift-per-day behavior. Target deviation remains a warning. Add structured `LOCATION_INACTIVE`, `POSITION_INELIGIBLE`, `POSITION_INACTIVE` and `POSITION_COVERAGE_GAP` outcomes; do not expose codes as raw user copy.

For each existing location/time segment, count distinct active eligible employees once toward overall staffing. A qualified employee with assigned Barista position counts once toward Barista, zero toward Cashier, even if qualified for both. Positionless employees count toward overall staff and eligible designated Lead, but no named position quota. A designated Lead is orthogonal: a Barista who is a qualified designated Lead can satisfy overall staffing, Barista and designated Lead simultaneously. A job position actually named Lead is still an ordinary position and confers no access capability.

Prevent duplicate credit from overlapping records for the same employee. If conflicting simultaneous assigned positions exist in invalid legacy input, give that employee no named-position credit and report the conflict; do not arbitrarily choose a position. Do not allocate employees to positions automatically. Quotas are additional constraints; their sum may exceed the overall minimum and then require more actual staff. For overlapping configured windows, preserve the existing maximum overall minimum and take the maximum requirement for each same position, not a sum of duplicate same-position windows. Positions remain isolated by location and segment.

Without position requirements, retain overall staffing/Lead behavior. With requirements, health reports assigned/required/missing counts per position and combines overall staffing, position coverage and Lead coverage in its existing covered result. Reuse shared capability helpers; do not introduce a second eligibility engine.

## 8. Position persistence and Phase 3 preservation

Carry position IDs through manual create/edit, schedule/template reads, copy/template application, swaps/coverage reassignment and guarded publication snapshots. Reassigning an employee retains the shift's position and validates the incoming employee against it. Never infer or discard position during an exchange. Snapshot names retain historical display; catalog renaming alone does not become an assignment-change event.

Position changes on a published assignment enter existing publication change detection, affect only the relevant employees, and invalidate the relevant acknowledgement through existing revision logic. An unchanged republish creates no duplicate useful notification. Business mutation, revision and durable notification intent commit atomically. Provider delivery and retries remain outside that transaction and outside user-action latency. A failed business batch generates no successful-change intent.

Separate environment/security configuration from the timezone-bound delivery policy. Subscription enrollment, logout/session termination and account-switch cleanup must not start depending on a workspace lookup or timezone-service availability. Preserve current encrypted subscription ownership, generation fencing, pending reconciliation, endpoint validation and authentication priority.

Load current workspace policy through the existing worker/repository boundary. Routine quiet hours remain 21:00–07:00, availability lead 24 hours, acknowledgement delay 24 hours, at most one routine reminder/item/business-local day, and existing bounded retry/lease budgets. Replace UTC−04 and Puerto Rico SQL literals with zoned helpers/parameterized workspace zone. Revalidate source, active employee, active applicable location, access and workspace before delivery/retries. Historical request outcomes retain existing participant permissions; deactivating a location does not erase a participant's request history.

Keep trigger-agnostic workers, safe same-origin links, supersession/cancellation, no provider IO during actions and default-disabled delivery. No scheduler provisioning, new event system, private service-worker caching or device-delivery claims. Service-worker scope remains `/app/`; Clocker remains outside it.

## 9. Small UI additions and Clocker

Owner Settings gains working links to Workspace, Locations and Positions. Workspace has name and timezone with the approved lock explanation. Locations use a simple list with Active/Inactive and derived setup status, Add/Edit forms, stable Clocker link and a link to existing Scheduling Rules. Positions use a compact catalog with name/active editing. No giant administration table or dashboard redesign.

Existing employee create/profile surfaces gain separate Access role, Positions and Eligible locations inputs under existing management permissions. Existing manual shift forms gain an optional Position choice filtered to active qualified positions for the selected employee; server validation remains authoritative. Empty choice means positionless. Scheduling Rules supports an explicit staffing/Lead choice for unconfigured locations and optional position quantities for each existing coverage window. Save/add/remove peer controls retain 44px geometry and centered labels.

Replace Barista-from-access-role labels with Owner/Manager/Lead/Employee; render actual configured positions separately when useful. Replace product copy implying two Fuel locations or a Fuel-only kiosk with configured workspace context or neutral copy. Keep legitimate Fuel location names/customer fixtures and technical compatibility names where they are not runtime business assumptions.

`/clocker/[location]` queries the configured active workspace/location by immutable key. Unknown or inactive location returns the existing safe not-found outcome. Database/configuration failures produce unavailable behavior, never invented Fuel resolution. Remove two-entry static generation. Pass location label and configured timezone to ClockerKiosk; preserve PIN/keypad/break/local success behavior and tablet layout. No personal notification setup on Clocker.

## 10. Existing upgrade and deferred fresh provisioning architecture

**Existing Fuel:** exact migration sequence 0001–0008, after separately authorized migration activation. 0008 backfills workspace/key identity and adds nullable position fields/joins; it does not rename locations, reseed staffing or create coverage/positions/employee qualifications. Existing 2/6 staffing remains customer configuration. Historical files and records remain intact.

**Approved execution scope adjustment:** Migration 0008 and owned local Fuel upgrade/generic-customer database verification remain required now. Full fresh-customer provisioning/schema-distribution implementation is deferred to NEVORA Productization / SaaS-readiness. The architecture below is retained, not deleted. No generated distributable baseline/manifest, pg_dump provisioning workflow, production onboarding CLI/bootstrap or CI schema-distribution drift gate is built in this foundation. Generic fixtures may be inserted directly by owned disposable test setup. This does not prove production onboarding readiness.

**Fresh customer:** a generated schema-only baseline at version 0008, then explicit provisioning inputs: workspace name, workspace timezone and initial location name. Optional short name/key can be supplied; the first location starts Needs setup. There are zero customer rows in the baseline and no Fuel-specific defaults. Provisioning rejects a nonempty customer configuration and cannot overwrite an existing installation. Owner bootstrap explicitly selects a configured active primary location and eligibility; it never assigns loc-1/loc-2 automatically. No public signup.

Migrations remain the schema authority. Generate the baseline from a newly created disposable database upgraded with the exact canonical migrations, using a pinned PostgreSQL 17 toolchain and schema-only `pg_dump` with ownership/ACL/comments excluded. Normalize only dump metadata, never business DDL; document every normalization and reject unexpected dump framing. PostgreSQL documents these dump controls in its [pg_dump reference](https://www.postgresql.org/docs/17/app-pgdump.html).

Generate a migration-hash/version manifest alongside the SQL. Restore into a second new owned disposable database and compare schema fingerprints: tables, columns/types/nullability/defaults, constraints/FKs, indexes/predicates, sequences and functions. Verify no customer rows or Fuel defaults exist. CI regeneration/check must fail on byte/manifest drift and schema mismatch, including a changed FK or check constraint. Do not auto-update the baseline to hide a failure. Future migrations update this generated artifact through the documented process; never edit it as a second handwritten schema.

All local generation/restore commands reject an existing or non-loopback target and reject the application's `DATABASE_URL`. Production provisioning and migration authorization remain separate. Generated artifacts and production runbooks will be implemented in Productization; no real customer is provisioned here.

## 11. Acceptance and evidence

Retain the explicit Fuel fixture and add fictional Northside Services: three arbitrarily named locations (including a long name, inactive location and newly unconfigured location), multiple job positions and a non-Puerto-Rico workspace timezone. Also parameterize one, five and twenty location cases. These fixtures are not production defaults.

Focused behavior tests must prove: Fuel records survive migration; one/3+/20 locations; name/key rename stability and uniqueness; inactivity; missing setup; required fresh inputs; qualification versus assignment; positionless legacy records; one employee/one position quota; designated Lead plus position; inactive position requirements; overlapping-window quota counts; cross-location overlap; exactly/over maximum; target warning; existing availability/time-off distinctions; template/copy/exchange preservation; position publication/acknowledgement changes; rollback/no intent; workspace timezone boundaries/DST validation; timezone edit races; current notification location access; logout during workspace failure; quiet-hour/reminder cancellation; generic Clocker resolution and invalid/inactive failures; additive upgrade/history preservation, generic SQL-backed behavior, unchanged historical migration hashes and teardown. Full baseline generation/equivalence/distribution drift testing is deferred with that toolchain.

Run lint, typecheck, full unit tests, relevant scheduling/Phase 3 notification suites, notification QA validator, disposable PostgreSQL integration, production build and `git diff --check`. Inspect package scripts before execution. TDD means behavior assertions fail before the corresponding product implementation; do not substitute import errors, weaken assertions or update protected screenshots automatically.

Capture before edits from the exact parent and after implementation: Owner Settings/Workspace/Locations/Add/Edit/Positions/employee assignment/Scheduling Rules; Manager Schedule/Rules/selectors; affected Employee/Lead presentation; Login/Activate and Phase 3 setup regression; Fuel and generic Clocker. Widths 320, 375, 390, 430, 768, 1024, 1440; Clocker 1024×768 and 768×1024. Include Chromium and WebKit, long names, no-data/error/disabled/success, focus/hover/pressed, contrast, peer sizing, safe-area clearance and overflow. Protected layouts stay unchanged apart from necessary data labels/approved inputs. Report fixture, PostgreSQL, authenticated browser, service-worker and physical-device evidence separately.

## 12. Documentation, commits and final stop

Update README, architecture, UI and scheduling contracts to state: NEVORA is generic software; Fuel is one customer; locations/positions/timezone are configured data; access role is not a position; Phase 4 must consume readiness and this same engine. Record Skills as deferred and retain Phase 3 activation restrictions.

The specification and plan are approved for Subagent-driven execution with the narrowed Task 11. Preserve planning commits separately. During execution, preserve task progress and review evidence locally; create one focused implementation commit only after required verification passes: `feat: generalize Nevora workspace and scheduling foundation`. Do not amend the approved parent or planning commits. User's one-implementation-commit instruction overrides per-task commit defaults.

Final implementation handoff includes exact parent, branch/worktree, final SHA and changed-file manifest, migration model and deferred Productization provisioning requirements, Fuel/generic results, deferred scope, test commands/results and honest unperformed tests, fresh screenshots/local fixture URL, compatibility risks, activation prerequisites and clean worktree status. Stop for foundation approval. Do not start Phase 4.
