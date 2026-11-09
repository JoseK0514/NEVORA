# NEVORA Phase B — Integration + UI Foundation Design

**Status:** Design specification for CEO review before implementation planning.

**Base candidate:** `1074557cf86eb045eb3da1f4f0b646ad7b8c005e`

**Branch:** `codex/nevora-phase-b-ui-foundation`

## Purpose

Phase B establishes the visual, interaction and customer-configuration foundation that every later NEVORA Workforce phase must inherit. It does not add Phase C timekeeping or Phase D reporting. It integrates the accepted Phase A product state into a coherent NEVORA experience, removes avoidable UI inconsistency, formalizes customer data autonomy, and creates reusable primitives so future phases do not drift visually or behaviorally.

The governing product principle is:

> Complexity in the system; simplicity in the interface.

NEVORA should feel calm, obvious and pleasant while still behaving like serious enterprise software.

## Parallel-execution boundary

Codex may independently review/harden Phase A while Phase B proceeds in this isolated worktree.

Phase B is based on the frozen Phase A candidate `1074557...`. Until Codex returns its final Phase A hardening SHA:

- do not merge Phase B into Phase A, development or production;
- do not modify the preserved Phase A or Phase 5 worktrees;
- record any Phase B file that also changes in Codex hardening as a reconciliation item;
- before Phase B final verification, rebase/reconcile onto the accepted Phase A SHA and rerun affected verification;
- product behavior from accepted Phase A wins over Phase B cosmetic assumptions.

## Non-negotiable product standards

1. Customers must be able to manage their ordinary operational data themselves within safe historical and permission boundaries.
2. The UI must be Apple-like: extremely readable, clean, calm, obvious, restrained and pleasant.
3. Every meaningful workflow must account for normal, empty, loading, error, stale, permission, concurrency, recovery, long-content and responsive states where applicable.
4. No business rule may live only in presentation code.
5. No destructive “delete” may erase historical truth where a record is already referenced by operational history.
6. All interactive controls must meet the NEVORA touch-target and focus standard.
7. Repeated interaction patterns must use canonical components rather than page-specific reinvention.
8. Phase B may fix existing UI/interaction defects but may not invent unrelated features.
9. Phase B must preserve Phase 4/5 scheduling, request, notification, authentication and authorization behavior.
10. Fuel is a customer/workspace, not the product. UI and configuration behavior must remain industry-neutral.

## Current-source findings that Phase B must address

### Control geometry drift

The base `.button` currently has a 42px minimum height while newer configuration, employee and scheduling controls use 44px. Peer actions can therefore render with different geometry depending on page-specific CSS.

Phase B will establish a canonical minimum interactive height of 44px for ordinary buttons/links/controls unless a larger control is intentionally specified.

### Select/dropdown inconsistency

Multiple workflows still use raw native `<select>` controls independently:

- employee creation role and location
- shift assignment employee/position
- shift-change policy
- operational-rule configuration
- callout reason
- scheduling rules

Meanwhile the application already uses higher-quality popover interactions for employee mobile navigation and device settings.

Phase B will define one NEVORA choice-control language with the appropriate primitive per use case:

- **Native Select** — when the operating system's picker is more usable or accessible, especially on touch/mobile;
- **NEVORA Select Popover** — bounded desktop single choice where the custom interaction materially improves clarity;
- **Combobox** — large/searchable single choice;
- **MultiSelect** — multiple values only where needed;
- **ActionMenu** — actions/commands, not data entry.

The goal is not to replace every native `<select>`. The goal is one coherent NEVORA interaction language while preserving the best device-native behavior when that produces the better Apple-like experience.

Shared controls must use consistent trigger geometry, typography, spacing, radius, shadow, focus, selected state, scrolling, long-label handling and viewport-safe positioning. The implementation must not force a dropdown where radios, checkboxes, segmented controls or the native platform picker are more usable.

### CSS/component duplication

The stylesheet contains legacy base rules plus later surface-specific overrides for newer premium UI. Phase B will consolidate common interactive primitives without performing an unrelated full CSS rewrite.

The current global stylesheet is large enough that continued page-specific overrides are a maintainability risk. Phase B will extract only repeated, proven primitives into focused component/style boundaries as they are touched. It will not perform a big-bang stylesheet rewrite. Legacy rules may remain when removing them would add risk without improving the audited surfaces.

### Customer self-management gaps

Current source supports:
- workspace name/timezone updates;
- location create/update/activate/deactivate;
- position create/update/activate/deactivate;
- employee creation;
- employee scheduling profile updates;
- schedule shift create/update/delete;
- coverage-window create/delete;
- template create/archive.

Current employee profile UI exposes scheduling-profile edits but does not provide a complete safe edit/deactivate/reactivate flow for employee core profile fields.

Phase B will add the missing ordinary employee-maintenance capability while preserving historical references and access controls. Employee IDs remain stable identifiers and are not casually rewritten.

Phase B will also define, in UI copy and behavior, when an entity is deleted versus deactivated:
- unused/nonhistorical entities may be deleted only where the existing data model safely supports it;
- historically referenced entities are deactivated/archived instead of destroyed;
- restoring/reactivating is available where the model supports safe reuse;
- historical schedules, requests, time records and audit-relevant records remain intact.

Phase B does not invent destructive hard-delete APIs solely to satisfy a generic “delete” button.

## Interaction performance standard

Phase B treats perceived performance as part of UI quality.

Common interactions must feel immediate on supported hardware:
- no visible multi-frame delay for local menu/popover opening;
- no avoidable layout jump when controls open, save, or report success;
- no unnecessary client-side rerender loops;
- no scroll-position loss after ordinary inline saves;
- no blocking spinner when a local state transition can be immediate while the server action is pending;
- no optimistic success for server-authoritative mutations;
- no animation that delays task completion.

Browser QA will record obvious long-task, layout-shift or interaction-jank defects on changed surfaces. Phase B does not establish synthetic production-SLA numbers from local hardware; it establishes a no-obvious-jank release floor and records material performance defects for correction.

## Customer data lifecycle matrix

Phase B will maintain an explicit lifecycle contract for every ordinary customer-managed entity. Each entity is classified across:
- Create
- Edit
- Deactivate/Archive
- Reactivate/Restore
- Delete-if-safe
- Historical retention behavior
- Required role/capability
- Concurrency/stale-write protection
- User-facing recovery behavior

Initial lifecycle:

| Entity | Create | Edit | Deactivate/Archive | Reactivate/Restore | Delete-if-safe | Historical behavior | Authority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Workspace profile | Existing singleton | Yes | No ordinary delete | N/A | No | Preserve operational identity/history | Owner |
| Location | Yes | Yes | Yes | Yes | Only if a separately proven unused/no-history path exists; Phase B does not invent hard delete | Historical schedules/configuration retain location identity | Owner |
| Position | Yes | Yes | Yes | Yes | Only if separately proven unused/no-history; no new hard-delete API in Phase B | Existing memberships/shifts remain attributable | Owner |
| Employee | Yes | Yes | Yes | Yes | No ordinary destructive delete in Phase B | Historical schedules/requests remain attributable; employee ID stable | Manager/Owner subject to role rules; Owner required for Owner-authority changes |
| Shift | Yes | Yes | Draft delete through existing rules | N/A | Draft-only where existing rules allow | Published changes remain revision/history aware | Existing scheduling authority |
| Coverage window | Yes | Yes through replacement/update workflow where supported | Remove | Recreate | Existing guarded delete | Historical published schedule truth is not rewritten | Existing settings authority |
| Schedule template | Yes | Edit only where current model supports it | Archive | Recreate/restore only if explicitly supported later | No destructive historical purge | Archived template history remains attributable | Existing template authority |
| Operational/coverage policies | Existing guarded write | Yes | Mark unknown/not-applicable where model supports it | Yes | No destructive history purge | Existing requests retain the policy terms/revision that governed them | Owner where currently required |

Any new delete/reactivate capability not already represented safely in the data model requires explicit design review before schema or destructive behavior changes.

## UX architecture

### Information hierarchy

Every operational screen should present, in order:
1. where the user is;
2. current status/context;
3. what needs attention;
4. primary action;
5. supporting detail.

Advanced configuration is progressively disclosed.

### Surfaces

Prefer flat page structure and quiet grouped surfaces. Use cards only when grouping has semantic value. Remove unnecessary nested borders/cards.

### Typography

Use the existing Apple-system font stack and normalize:
- page title;
- section heading;
- primary row content;
- secondary metadata;
- helper/error copy.

Avoid excessive tiny gray copy and excessive uppercase labels.

### Color

NEVORA blue/cyan is functional, not decorative. Status colors communicate success/warning/danger. Neutral surfaces remain visually quiet.

### Buttons and actions

Canonical action hierarchy:
- Primary: one obvious commit/forward action where possible;
- Secondary: peer/supporting action;
- Quiet/ghost: low-emphasis navigation or utility;
- Destructive: visually distinct and always deliberate.

Peer actions use consistent geometry.

### Forms

- labels remain visible;
- field errors appear adjacent to the affected input;
- failed saves preserve entered values;
- pending state prevents accidental duplicate submissions;
- mobile inputs remain readable and do not trigger unwanted zoom;
- long values wrap/scroll predictably;
- stale/concurrency conflict messages explain the next action.

### Menus/dropdowns

The canonical NEVORA menu/select interaction must:
- open in a visually calm popover/sheet;
- preserve keyboard navigation and visible focus;
- support escape/outside dismissal;
- keep selected state obvious;
- constrain height and scroll long lists;
- handle long labels;
- avoid clipping at viewport edges;
- use mobile-friendly positioning;
- never hide a selected historical value merely because it became inactive.

### Empty/loading/error/success states

Every important surface gets a deliberate state rather than blank content or ambiguous zero values.

Errors explain recovery in human language, not backend terminology.

## Customer data autonomy

### Workspace
Owner can edit business name and supported workspace settings. Timezone keeps the existing guarded behavior when operational history exists.

### Locations
Owner can:
- create;
- rename;
- change short name;
- activate/deactivate;
- open related scheduling setup.

Historical location references are preserved.

### Positions
Owner can:
- create;
- rename;
- activate/deactivate.

Historical memberships/shift references remain visible. New assignment to inactive positions remains blocked.

### Employees
Authorized management can:
- create employee;
- edit ordinary profile data subject to role permissions;
- change phone/email;
- change primary location safely;
- change eligible locations;
- change qualified positions;
- activate/deactivate/reactivate;
- preserve historical schedule/request references;
- prevent a Manager from granting Owner authority without Owner authorization;
- prevent deactivation/role edits from bypassing current-session and operational invariants.

Employee ID remains stable after creation unless a separately reviewed migration capability is designed later.

### Scheduling/configuration
Existing schedule, coverage, template and policy editing remains available through the current guarded domain logic. Phase B improves clarity/consistency but does not duplicate scheduling rules in UI code.

## Canonical UI primitives

Phase B should extract/refine only primitives that have repeated real usage:

- `PageHeader`
- `Button` / action-link styling contract
- `StatusPill`
- `Select`
- `Combobox` where a large dataset warrants it
- `ActionMenu`
- `FormField` / field feedback conventions
- `EmptyState`
- `ActionRow`
- `SectionHeader`
- `ConfirmationSheet/Dialog` for destructive or high-consequence actions
- `BottomActionBar` only where mobile task completion benefits from it

Do not create a large generic component library for hypothetical future usage.

## Scope surfaces for baseline audit

Manager/Owner:
- Manager Home
- Schedule
- Availability
- Requests
- Shift Changes/Coverage
- Employees
- Employee Profile
- Settings
- Workspace
- Locations
- Positions
- Scheduling Rules
- Templates

Employee/Lead:
- Home
- My Schedule
- My Time placeholder/current state
- Availability
- Requests
- Shift Requests
- mobile More menu

Shared/public:
- Login
- Activate
- Clocker shell/current demo
- notification/device popovers

Phase B may fix visual/interaction defects on these surfaces. It must not implement Phase C real timekeeping.

## Responsive and accessibility contract

Required widths:
- 320
- 375
- 390
- 430
- 768
- 1024
- 1440

Clocker reference widths remain:
- 1024×768
- 768×1024

Verify:
- no horizontal overflow;
- no clipped labels;
- 44px minimum ordinary action target;
- focus visibility;
- keyboard reachability;
- semantic labels;
- long names;
- many locations;
- empty/loading/error/success states;
- safe-area clearance;
- mobile bottom-navigation clearance;
- no modal/popover off-screen traps;
- reduced-motion respect where animation exists.

## Engineering constraints

- Follow existing Next.js/App Router architecture.
- Reuse server/domain authorization and validation; never authorize from client-provided facts.
- UI refactors must preserve form names/action contracts unless the corresponding server contract is deliberately updated with regression tests.
- No new paid dependencies or services.
- Prefer platform/browser primitives when they provide robust behavior.
- Keep production data migrations out of Phase B unless an approved customer-data edit capability genuinely requires an additive schema change.
- If a schema change becomes necessary, stop for review before implementation.
- Do not touch Phase C time-clock persistence beyond visual shell consistency.

## Verification strategy

During implementation:
- focused unit/component tests;
- focused authenticated page tests;
- responsive browser checks for changed surfaces;
- accessibility/focus checks;
- no full-suite rerun after every cosmetic edit.

Before Phase B candidate freeze:
- full unit suite;
- affected PostgreSQL suites;
- lint;
- typecheck;
- build;
- Chromium + WebKit responsive matrix;
- baseline visual comparison;
- customer-data CRUD/deactivation journeys;
- permission-negative tests;
- long-name/many-location fixtures;
- whole-branch diff review.

After self-review:
- freeze candidate SHA;
- Codex independent Phase B audit/hardening;
- reconcile any concurrent Phase A hardening changes first;
- review Codex fixes;
- rerun affected + final gates;
- CEO acceptance.

## Common-workflow usability acceptance

A common workflow is not considered finished if a normal authorized user needs external instructions to complete it.

At minimum, the following must be self-evident from the interface:
- add/edit/deactivate/reactivate an employee;
- add/edit/deactivate/reactivate a location;
- add/edit/deactivate/reactivate a position;
- navigate to scheduling rules;
- create/edit a shift;
- understand a validation error and recover;
- understand when history prevents destructive deletion;
- use the primary choice/menu interactions with keyboard and touch.

The interface must communicate the next action through hierarchy, labels and feedback rather than relying on training documentation.

## Acceptance criteria

Phase B is ready for independent review only when:

1. no known peer-control geometry inconsistency remains on audited surfaces;
2. repeated choice controls use a consistent NEVORA interaction language;
3. obvious alignment, spacing, typography and hierarchy defects are fixed;
4. customer self-management supports the agreed safe employee/location/position lifecycle;
5. destructive/historical behavior is explicit and safe;
6. responsive checks pass at all required widths;
7. important empty/loading/error/success states are deliberate;
8. no Phase 4/5 protected behavior is knowingly weakened;
9. no Fuel-specific product assumption is introduced;
10. the application looks and behaves like one coherent NEVORA product rather than a sequence of independently built phases;
11. audited common interactions show no obvious lag, layout jump or avoidable rerender/jank defects;
12. customer-managed entities have an explicit lifecycle/permission contract and the implemented UI does not over-promise unsafe deletion;
13. normal authorized users can complete common management workflows without external instructions.

## Explicit exclusions

Phase B does not implement:
- real clock punches;
- PIN/device authentication;
- timecards;
- reports;
- payroll;
- Manager Action Center expansion;
- Publish Readiness;
- qualifications/certifications;
- tasks/checklists;
- chat;
- NEVORA Assistant;
- advanced labor budgeting;
- broad onboarding/CSV import.

Those remain in later approved phases.
