# NEVORA workspace and scheduling foundation

NEVORA is the product, Workforce its current module, and VELANI LLC its owner. Fuel Coffee Drive is configured customer data. This foundation prepares one configured workspace; it adds no tenant administration, billing, organization switcher, invitations or public signup. Implementation parent: `0a12f1f4ac7212a8cbbe195f013407a8bc74c4d5`. [Approved design](../superpowers/specs/2026-10-03-nevora-workspace-foundation-design.md), [execution plan](../superpowers/plans/2026-10-03-nevora-workspace-foundation.md), and [final QA record](../ui/2026-10-03-nevora-foundation-review.md) define scope and evidence.

## Configuration and persistence

`db/migrations/0008_workspace_positions.sql` is additive and prepared, not applied to an existing customer/development/Neon database. It follows exact migrations 0001–0007; those historical files remain unchanged. It introduces the singleton workspace, workspace-owned stable location keys, positions, employee qualifications, coverage-window position quantities, nullable shift/template/snapshot position references and captured publication position names. Foreign keys preserve references; inactivity is used for retirement.

The Fuel upgrade creates `workspace-fuel` / Fuel Coffee Drive / `America/Puerto_Rico`, assigns existing locations to it, and preserves `/clocker/2` and `/clocker/110`. Existing names (including ASCII punctuation), staffing 2/6, coverage, employees, eligibility, shifts, templates, publication and notification history are retained. It invents no positions, qualifications or quotas. Nullable assignment positions preserve positionless legacy work. Legacy location-name checks are `NOT VALID`: existing legal historical bytes are retained; new writes are checked. Auditing and validating those constraints is a separate activation decision.

`src/lib/data/workspaces.ts`, `locations.ts`, `positions.ts` and employee repositories own reads/writes and transactional guards. Owner actions validate names, zone and immutable keys on the server. Locations start with no staffing, Lead decision, coverage or eligibility defaults. `scheduling/location-readiness.ts` derives `READY` versus `NEEDS_SETUP`; inactivity and missing configuration cannot silently enter future generation. Editing a name never changes its route key. Reference records and captured history survive deactivation/rename.

Employee create/profile actions atomically persist employee data, eligibility, position membership and credentials as applicable. Owner/Manager management restrictions remain enforced. A repository guard pins current workspace, active catalog/membership and location facts through the transaction; actual PostgreSQL tests cover both race orders and rollback, including a late credential failure. Browser fixture success alone is not persistence evidence.

## Roles, positions and the shared engine

OWNER, MANAGER, LEAD and EMPLOYEE remain authorization roles. Positions are operational qualifications stored separately; neither a role nor a sole qualification assigns a position. Manual shift choice defaults to no position and is filtered to the selected employee's active qualifications. One shift has at most one assigned position. Each distinct employee counts once toward one assigned-position quota. Designated Lead is orthogonal and the same qualified person may also satisfy a position quantity.

The existing `validateShift` and `calculateScheduleHealth` engine, capability helpers and readiness rules are reused by manual scheduling, template/copy, exchange/coverage and publication validation. It checks active configured workspace/location, location eligibility, position qualification, overlapping shifts across locations, availability, approved time off, maximum weekly hours, staffing, Lead and per-window position quantities. Target hours remain guidance, not the maximum. For overlapping windows, the engine combines the maximum overall staffing requirement and maximum quantity for each position, never sums those requirements. An employee with conflicting simultaneous position assignments across locations receives no named-position credit. No employee counts multiple times within a position quota.

Publication snapshots capture the position name at publication. Subsequent catalog edits do not rewrite before/after history. Position-only changes are meaningful publication changes and acknowledgement/notification decisions use that same effective revision. Schedule writes, immutable history, cancellation and notification intent commit together; failed mutations produce no successful-change intent. Provider calls remain outside business transactions.

## Timezone and scheduled hours

The persisted workspace `time_zone` is the source of truth, loaded by repositories and explicitly passed into business-time and notification policy helpers. There is no machine-timezone or static customer fallback. Fuel remains `America/Puerto_Rico`. Workweeks are Monday 00:00 through next Monday 00:00 in the configured zone; the user-facing week runs Monday–Sunday.

`src/lib/business-time.ts` uses Temporal with strict validation for nonexistent/ambiguous civil times. UTC instants remain the storage format for timestamp columns. Scheduled hours retain nominal wall-minute semantics, including overnight day/workweek splitting; they are not worked/punch elapsed hours. Civil-date coordinates in the rules engine are not UTC timestamps. Changing the workspace timezone is locked once operational data exists and concurrent writers serialize with that guard. Name-only editing remains available while locked; a timezone conversion needs separate review.

Civil availability deadlines carry the server-owned conversion workspace snapshot into the same transaction guard as the deadline, seeding and cancellation writes. A configuration conflict rejects the entire save and preserves the submitted civil input for review; it never adopts an old-zone instant under a newly loaded zone. Direct repository UTC inputs remain absolute instants.

Workers load the current configured workspace and bind its timezone to quiet hours, local-day reminder budgets and source boundaries. Routine quiet hours remain 21:00–07:00, existing 24-hour policies and bounded delivery/retry/lease budgets remain. Malformed, ambiguous or nonexistent legacy boundaries are suppressed rather than guessed, shifted, or converted with a Puerto Rico default. Enrollment/logout use environment/security configuration independently; workspace lookup failure cannot prevent authentication termination.

## UI and Clocker

Reuse `BrandLockup`, AppShell, page headers, existing management forms and raw CSS. New `ConfigurationForm`, employee scheduling fields, location fields, position quantities and shift assignment fields extend those surfaces. Owner Settings links to Workspace, Locations and Positions. The compact location list includes active/inactive state, derived setup status, stable Clocker link and Scheduling Rules link. New controls preserve NEVORA tokens, centered 44px peers, keyboard feedback and narrow/mobile layouts.

Configured workspace names reach authenticated shell/dashboard and public Login/Activate. Unavailable configuration remains explicitly unavailable. Generic role labels replace role-derived “Barista”; actual position names remain catalog data. `/clocker/[location]` resolves the active workspace/location by stable key and uses its stored display name and configured timezone. Unknown/inactive/unavailable resolution cannot invent a Fuel kiosk. Existing keypad, break and success transitions remain local demo behavior; there are no server punches, private PIN validation or real device enrollment.

Phase 3 keeps exact registration/manifest scope `/app`, including root and descendants; operational worker handlers independently require exact `/app` or `/app/*`. Clocker is outside that boundary. Only seven public offline/brand assets are cached. There is no private response cache, automatic permission request, real provider activation or scheduler provision. See the [activation runbook](fuel-phase-3-activation.md).

## Upgrade, generic proof and deferred Productization

Owned disposable PostgreSQL tests apply the canonical sequence and compare original-column Fuel rows/history before/after 0008. A separate test-only generic fixture removes isolated seeded customer rows and inserts Cedar Atelier – Fictional (`cooperative-cedar`) data; actual repositories/engine are tested with one, three, five and twenty locations. Northside Services is the separate browser/pure-domain fixture. PostgreSQL catalog equivalence covers the Fuel and Cedar SQL fixture paths. This proves additive upgrade and generic behavior in test-owned databases, **not production onboarding**.

The approved Productization architecture remains deferred:

- Migrations remain schema authority. Generate a schema-only version-0008 baseline from a newly created database upgraded with canonical migrations and a pinned PostgreSQL 17 `pg_dump` toolchain. Exclude ownership, ACLs, comments and customer rows; normalize documented dump metadata only, never business DDL; reject unexpected framing.
- Generate a version/migration-hash manifest. Restore into a second new owned database and compare tables, types/defaults/nullability, constraints/FKs, indexes/predicates, sequences and functions. Require no customer rows or Fuel defaults.
- Add CI regeneration/drift gates for bytes, manifest and schema changes, including a changed FK/check. Never auto-update artifacts to conceal failure, and never maintain a second handwritten schema.
- A future production CLI/bootstrap must require workspace name, valid timezone and initial location name, with optional short name/key. The first location starts Needs setup; reject nonempty customer configuration. Owner bootstrap must explicitly select active primary location/eligibility, never implicitly loc-1/loc-2. No public signup.
- Generation/restore tools must reject existing/non-loopback targets and application `DATABASE_URL`. Live migration/provisioning needs independent target, backup/restore, compatibility and authorization review.

No distributable baseline, manifest maintenance, pg_dump workflow, production onboarding CLI/bootstrap or CI schema-distribution tool was implemented. Existing bootstrap instructions are historical Fuel-only utilities, not generic onboarding instructions.

## Final boundary

Phase 4 must consume configured workspace, active READY locations, employee eligibility, operational positions/quotas and this same rules engine. Build Week, Fill Gaps Only, automatic assignment/selection/publishing remain unimplemented and unauthorized in this foundation. Skills, certifications, expirations, documents, training and qualification reminders remain deferred without speculative schema/UI. Provider/device acceptance, Neon HTTP transport, live migrations, deployment, scheduler/cost changes and real-customer onboarding remain unperformed. Stop for foundation review before Phase 4.
