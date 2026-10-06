# NEVORA Phase B — Integration + UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one coherent Apple-mode NEVORA interaction system, complete safe customer self-management for core workforce data, and remove current cross-surface UI inconsistency without changing Phase 4/5 business behavior or entering Phase C timekeeping.

**Architecture:** Preserve the accepted server/domain rules and make UI consistency a shared presentation contract rather than page-specific CSS. Add one safe employee-management mutation boundary with stale-write, role, location and last-owner protection; keep historical records through deactivate/reactivate instead of destructive deletion. Capture the current product in an authenticated Chromium/WebKit audit harness, fix only demonstrated defects, then reconcile onto the final accepted Phase A hardening SHA before the Phase B candidate freeze.

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL/Neon transaction abstractions, Vitest, Playwright Chromium/WebKit, HTML Popover/details/native form controls, existing NEVORA CSS/token system.

**Spec:** `docs/superpowers/specs/2026-10-04-nevora-phase-b-ui-foundation-design.md`

## Global Constraints

- Phase B starts from frozen candidate `1074557cf86eb045eb3da1f4f0b646ad7b8c005e`; before final verification it must be reconciled onto the final accepted Phase A hardening SHA.
- Do not modify preserved Phase A/Phase 5 worktrees, `development`, `main`, production, customer databases, providers or DNS.
- No Phase C real punches, PIN/device authentication, Phase D timecards/reports, payroll, Manager Action Center expansion, onboarding/CSV, tasks, qualifications or NEVORA Assistant.
- Customers must be able to manage ordinary operational data within safe history and permission boundaries.
- Employee IDs remain stable after creation in Phase B.
- Historical truth is preserved; deactivation/archive replaces destructive delete when records are operationally referenced.
- Ordinary interactive targets use a canonical 44px minimum unless deliberately larger.
- Apple-mode UI is mandatory: highly readable, calm, obvious, restrained, responsive and pleasant; complexity remains behind progressive disclosure.
- Device-native choice controls remain allowed when they are more usable/accessibly correct; do not replace every native picker for aesthetic uniformity.
- No new paid dependency/service. Prefer existing browser/platform primitives and current project dependencies.
- Business authorization/validation remains server-side; UI state never becomes mutation authority.
- Form names/action contracts remain stable unless a corresponding server contract and regression test are intentionally updated.
- Common workflows must be self-evident without external instructions.
- No obvious interaction jank, layout jump, avoidable rerender loop or false optimistic success on server-authoritative writes.
- Responsive verification targets: 320, 375, 390, 430, 768, 1024 and 1440; Clocker reference: 1024×768 and 768×1024.
- One implementation owner during Phase B; Codex independently reviews/hardens only after the Phase B candidate is frozen.

## Review Focus

1. **Concurrent employee lifecycle changes:** two Owners/Managers editing/deactivating role/state concurrently must serialize, reject stale versions and never leave the workspace with zero active Owners. Task 3 pins this with real PostgreSQL races.
2. **Reactivation after deactivation:** old portal sessions must not silently become valid again when an employee is reactivated; deactivation invalidates existing sessions and reactivation requires a fresh login. Task 3 tests session-row deletion.
3. **Historical inactive references:** inactive locations/positions already held by an employee remain visible/retainable while new selection of unrelated inactive records remains blocked. Tasks 3–4 test data and UI behavior.
4. **Long labels / many choices / small screens:** canonical menus and forms must remain viewport-safe, readable and keyboard/touch operable at the required widths. Tasks 1–2 and 6 test long-name/many-location fixtures.
5. **Parallel Phase A hardening overlap:** any Codex Phase A change touching a Phase B file must be reconciled by behavior, not overwritten by branch order. Task 7 rebases/reconciles and reruns affected protected tests before final freeze.

---

### Task 1: Build the Phase B authenticated UI baseline and defect ledger

**Files:**
- Create: `scripts/phase-b-ui-qa.mjs`
- Create: `docs/execution/phase-b-ui-baseline.md`
- Create: `docs/execution/phase-b-ui-baseline.json`
- Modify: `package.json`
- Reuse: `src/test/integration/owned-next-app.ts`
- Reuse: `src/test/integration/owned-app-fixture.ts`
- Reuse: `src/test/integration/owned-pg-transport.ts`

**Interfaces:**
- Consumes: existing owned disposable PostgreSQL + scratch Next runtime from Phase A.
- Produces: `npm run test:phase-b:ui` and a machine-readable defect ledger with `route`, `role`, `width`, `engine`, `selector`, `category`, `evidence`, `severity`.

- [ ] **Step 1: Add a failing harness smoke check for the required surface matrix.**

The script must enumerate authenticated Owner/Manager/Employee surfaces plus Login/Activate/Clocker shell and assert both Chromium and WebKit at 320, 375, 390, 430, 768, 1024 and 1440 where the surface applies.

Run: `node --import tsx scripts/phase-b-ui-qa.mjs --list`  
Expected before implementation: FAIL because the script/command does not exist.

- [ ] **Step 2: Implement the read-only baseline runner and package script.**

Add `"test:phase-b:ui": "node --import tsx scripts/phase-b-ui-qa.mjs"`.

The runner must:
- start only owned disposable resources;
- use canonical fictional fixtures;
- record screenshots/measurements outside Git under the Phase B evidence root;
- never mutate production/customer environments;
- check horizontal overflow, visible text clipping, focus visibility, ordinary action target height, bottom-nav clearance and open menu/popover bounds;
- include long employee/location names and a many-location fixture;
- separate observed defects from test-driver failures.

- [ ] **Step 3: Run the baseline in both engines and write the defect ledger.**

Run: `npm run test:phase-b:ui -- --baseline`  
Expected: command exits successfully even when product defects are discovered; product defects are recorded as ledger findings, while runner/framework errors fail the command.

- [ ] **Step 4: Verify the ledger has no ambiguous entries.**

Every finding must identify the exact route, role, width, engine, selector/category and screenshot or measurement. No “looks off” entry is allowed without a reproducible condition.

- [ ] **Step 5: Commit the baseline harness and ledger.**

`git add package.json scripts/phase-b-ui-qa.mjs docs/execution/phase-b-ui-baseline.* && git commit -m "test: add phase B UI baseline audit"`

---

### Task 2: Establish canonical NEVORA interaction primitives and control geometry

**Files:**
- Create: `src/components/action-menu.tsx`
- Create: `src/components/action-menu.test.tsx`
- Create: `src/components/select-field.tsx`
- Create: `src/components/select-field.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/app/schedule/page.tsx`
- Test: `src/app/app/schedule/page.test.tsx`

**Interfaces:**
- Produces: client component `ActionMenu({ id, label, ariaLabel?, children, align? })` with `align: "start" | "end"`; it preserves the current Schedule “More” anchored-dropdown geometry, uses a real trigger + bounded menu surface, closes on Escape and outside pointer interaction, and repositions/clamps on resize so Chromium/WebKit never place it outside the viewport.
- Produces: client component `SelectField({ name, label, options, defaultValue?, value?, required?, disabled?, hint?, onChange? })` where `options: readonly { value: string; label: string; disabled?: boolean }[]`; the real Native Select remains the named form control.
- Consumes: current NEVORA tokens, Native Select semantics, current schedule More menu content.
- Does not create a custom ARIA listbox for bounded form choices; Native Select remains the authoritative data-entry control unless a later audited use case demonstrably requires a searchable combobox.

- [ ] **Step 1: Write failing component tests for action-menu and select-field contracts.**

Tests assert:
- 44px trigger/control contract through canonical classes;
- ActionMenu has one labelled trigger and a bounded menu surface;
- long menu copy is not forced to one line;
- SelectField preserves disabled selected historical options;
- label/hint/error semantics remain associated with the native select;
- no duplicate `name` inputs are rendered.

Run: `npm test -- src/components/action-menu.test.tsx src/components/select-field.test.tsx`  
Expected: FAIL because the components do not exist.

- [ ] **Step 2: Implement the two primitives without new dependencies.**

Use browser-native menu/popover/details behavior appropriate to the existing app; preserve keyboard focus and escape/outside-close behavior. Keep `<select>` as the authoritative named form control for `SelectField`.

- [ ] **Step 3: Normalize the global action geometry.**

Change base `.button` from 42px to the 44px contract and consolidate repeated focus/disabled geometry into shared rules. Do not mass-delete legacy selectors; remove only overrides proven redundant by the changed surfaces.

- [ ] **Step 4: Refactor Schedule “More” to the canonical ActionMenu without changing actions or form names.**

Keep Copy previous week, Scheduling rules and Availability deadline behavior exactly as before.

- [ ] **Step 5: Run focused component and schedule tests.**

Run: `npm test -- src/components/action-menu.test.tsx src/components/select-field.test.tsx src/app/app/schedule/page.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Run Phase B browser checks on the changed schedule/menu surfaces at all required widths in both engines.**

Run: `npm run test:phase-b:ui -- --surface schedule`  
Expected: no menu clipping, no target below 44px, keyboard focus visible, no horizontal overflow.

- [ ] **Step 7: Commit the canonical controls.**

`git add src/components/action-menu* src/components/select-field* src/app/globals.css src/app/app/schedule/page.tsx src/app/app/schedule/page.test.tsx && git commit -m "feat: standardize Nevora interaction controls"`

---

### Task 3: Add safe employee core-profile lifecycle mutations

**Files:**
- Modify: `src/lib/data/employees.ts`
- Modify: `src/app/app/employees/actions.ts`
- Modify: `src/app/app/employees/actions.test.ts`
- Modify: `src/test/integration/foundation.integration.ts`

**Interfaces:**
- Produces:
  `EmployeeManagementProfile = Employee & { updatedAt: string }`
- Produces:
  `getEmployeeManagementProfile(employeeId: string, executor?: SqlExecutor): Promise<EmployeeManagementProfile | null>`
- Produces:
  `updateEmployeeProfile(input: { employeeId: string; expectedUpdatedAt: string; firstName: string; lastName: string; phone: string; email?: string; role: UserRole; primaryLocationId: string; active: boolean; actorEmployeeId: string }, executor?: SqlExecutor): Promise<void>`
- Produces:
  `saveEmployeeCoreProfileAction(data: FormData): Promise<ConfigurationResult>`

**Required mutation rules:**
- lock actor + target employee IDs in sorted order;
- when current/requested role or active state can change Owner topology, lock all current active Owner rows in sorted ID order before evaluating the last-owner invariant;
- reauthorize active Manager/Owner after lock acquisition;
- Manager cannot edit an Owner or assign Owner;
- only Owner can modify Owner-role targets or assign Owner;
- reject deactivation/demotion that would leave zero active Owners;
- requested primary location must belong to current workspace and be active unless unchanged on an inactive target being kept inactive;
- reactivating an employee requires an active primary location;
- ensure the current primary location remains in eligibility;
- employee ID is immutable;
- stale `expectedUpdatedAt` rejects with a reload/review conflict;
- deactivation deletes all existing `employee_sessions` for the target in the same transaction so reactivation cannot resurrect an old session;
- historical schedules/requests are not deleted.

- [ ] **Step 1: Write action-level failing tests.**

Add cases for:
- trusted actor ID overrides forged form actor;
- Manager cannot edit Owner/assign Owner;
- Owner may edit ordinary/Owner target subject to last-owner invariant;
- invalid input returns local feedback without write;
- stale conflict returns reload/review language.

Run: `npm test -- src/app/app/employees/actions.test.ts`  
Expected: FAIL because `saveEmployeeCoreProfileAction` does not exist.

- [ ] **Step 2: Write PostgreSQL failing tests for lifecycle invariants.**

Add tests for:
- edit name/phone/email/role/primary location;
- inactive historical target remains queryable;
- deactivate then reactivate preserves schedules/requests;
- deactivation removes target session rows;
- sole active Owner cannot be deactivated/demoted;
- two Owners attempting concurrent demotion/deactivation serialize and preserve at least one active Owner;
- stale expected version loses to the first committed edit;
- Manager-vs-Owner permission races reauthorize after locks;
- inactive new primary location is rejected; existing inactive primary can be retained while target remains inactive.

Name the new integration block `describe("employee profile lifecycle", ...)`.

Run: `npm run test:foundation:integration -- -t "employee profile lifecycle"`  
Expected: new lifecycle tests FAIL before implementation.

- [ ] **Step 3: Implement `getEmployeeManagementProfile` and `updateEmployeeProfile` with one guarded transaction.**

Use the existing `workspaceReadGuard` and `SqlExecutor` transaction conventions. Do not add a migration.

- [ ] **Step 4: Implement `saveEmployeeCoreProfileAction`.**

Parse/normalize phone and email, derive actor from `requireRoles(MANAGER_ROLES)`, map only known safe validation/permission/conflict errors to `ConfigurationResult`, and revalidate employee list/profile paths on success.

- [ ] **Step 5: Run action + foundation tests.**

Expected: new lifecycle tests PASS with no weakening of existing foundation assertions.

- [ ] **Step 6: Commit employee lifecycle backend.**

`git add src/lib/data/employees.ts src/app/app/employees/actions.ts src/app/app/employees/actions.test.ts src/test/integration/foundation.integration.ts && git commit -m "feat: add safe employee profile lifecycle"`

---

### Task 4: Build the employee edit/deactivate/reactivate experience

**Files:**
- Create: `src/components/employee-core-profile-form.tsx`
- Create: `src/components/employee-core-profile-form.test.tsx`
- Create: `src/app/app/employees/[employeeId]/page.test.tsx`
- Modify: `src/app/app/employees/[employeeId]/page.tsx`
- Modify: `src/app/app/employees/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `EmployeeManagementProfile`, `saveEmployeeCoreProfileAction`, active/inactive locations, current actor role.
- Produces: an in-place “Employee details” management form separate from existing “Scheduling profile” and operational rules.

- [ ] **Step 1: Write failing component/page tests for the full management workflow.**

Assert:
- core fields are editable without exposing Employee ID as mutable;
- active status can be deactivated/reactivated with plain-language history explanation;
- Manager viewing Owner sees core management controls withheld;
- Owner sees Owner controls;
- role options never offer Owner to a Manager;
- inactive current primary location remains visible but cannot be selected as a new location for reactivation;
- save errors preserve entered values;
- directory shows Active/Inactive clearly and still links inactive employees to their profile.

- [ ] **Step 2: Implement `EmployeeCoreProfileForm`.**

Use canonical SelectField for role/primary location, existing PhoneInput, ConfigurationForm and one clear Save action. Keep scheduling qualifications/eligibility in the existing scheduling-profile section; do not duplicate them.

- [ ] **Step 3: Integrate the form into Employee Profile.**

Fetch `getEmployeeManagementProfile`; keep the existing summary card, scheduling profile and operational rules. Add concise explanation:
- deactivation blocks portal access and preserves history;
- reactivation requires fresh login;
- Employee ID is stable.

- [ ] **Step 4: Refine Employee Directory state presentation.**

Use canonical status/action styling; inactive employees remain discoverable and clearly marked.

- [ ] **Step 5: Run focused tests and authenticated browser journeys.**

Run component/page tests, then `npm run test:phase-b:ui -- --surface employees` across required widths/engines.

Expected:
- edit/deactivate/reactivate is understandable without instructions;
- no control clipping;
- peer actions are 44px;
- long names/locations wrap correctly.

- [ ] **Step 6: Commit employee lifecycle UI.**

`git add src/components/employee-core-profile-form* src/app/app/employees src/app/globals.css && git commit -m "feat: complete employee self-management UI"`

---

### Task 5: Harmonize customer configuration surfaces and lifecycle cues

**Files:**
- Modify: `src/app/app/settings/locations/page.tsx`
- Modify: `src/app/app/settings/locations/[locationId]/page.tsx`
- Modify: `src/app/app/settings/positions/page.tsx`
- Modify: `src/app/app/settings/foundation-pages.test.tsx`
- Modify: `src/app/app/employees/new/page.tsx`
- Modify: `src/components/shift-assignment-fields.tsx`
- Modify: `src/components/employee-shift-picker.tsx`
- Modify: `src/components/operational-rule-fields.tsx`
- Modify: `src/components/shift-change-policy-fields.tsx`
- Modify: `src/app/app/exchange/callout/page.tsx`
- Modify: `src/app/app/schedule/settings/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: canonical 44px actions, ActionMenu and SelectField/native-select styling contract.
- Produces: consistent data-entry choice geometry and plain-language lifecycle messaging without changing server action names or business rules.

- [ ] **Step 1: Add failing page/component assertions for lifecycle copy and canonical controls.**

Cover:
- Locations expose Edit + related management actions through one coherent action hierarchy;
- Position rows clearly show Active/Inactive and explain that deactivation preserves history;
- add/edit forms use canonical choice-control classes/components;
- an inactive historical selected option remains visible;
- no page promises destructive deletion when only deactivate/archive is safe.

- [ ] **Step 2: Apply canonical ActionMenu to repeated multi-action location/schedule contexts where it reduces clutter.**

Do not hide the page’s primary action inside a menu.

- [ ] **Step 3: Normalize bounded data-entry selects.**

Use SelectField where the component fits directly; otherwise apply the same canonical select class/geometry to stateful selects. Keep native picker behavior on touch/mobile. Do not introduce a custom listbox implementation.

- [ ] **Step 4: Normalize lifecycle/status copy.**

Use “Active”, “Inactive”, “Deactivate”, “Reactivate”, “Archive” consistently according to the lifecycle matrix. Explain preserved history where it affects user expectations.

- [ ] **Step 5: Run focused unit/page tests plus configuration browser matrix.**

Run:
- `npm test -- src/app/app/settings/foundation-pages.test.tsx src/app/app/employees/actions.test.ts`
- relevant existing schedule/exchange component tests
- `npm run test:phase-b:ui -- --surface settings`

Expected: no business-rule regression and no new responsive defects.

- [ ] **Step 6: Commit configuration harmonization.**

`git add src/app/app/settings src/app/app/employees/new/page.tsx src/components/shift-assignment-fields.tsx src/components/employee-shift-picker.tsx src/components/operational-rule-fields.tsx src/components/shift-change-policy-fields.tsx src/app/app/exchange/callout/page.tsx src/app/app/schedule/settings/page.tsx src/app/globals.css && git commit -m "style: unify Nevora configuration interactions"`

---

### Task 6: Remediate the full current UI baseline without redesigning product behavior

**Files:**
- Modify only files named by reproducible findings in `docs/execution/phase-b-ui-baseline.json`.
- Update: `docs/execution/phase-b-ui-baseline.md`
- Update: `docs/execution/phase-b-ui-baseline.json`
- Likely touched surfaces may include: `src/components/app-shell.tsx`, `src/components/page-header.tsx`, `src/components/manager-dashboard.tsx`, Employee/Manager pages and `src/app/globals.css`.

**Interfaces:**
- Consumes: Task 1 defect ledger and Tasks 2–5 canonical controls.
- Produces: closed defect ledger entries with before/after evidence and no unrelated redesign.

- [ ] **Step 1: Re-run the audit after Tasks 2–5 and classify remaining findings.**

Categories:
- geometry/alignment;
- typography/hierarchy;
- overflow/responsive;
- accessibility/focus;
- loading/empty/error/success;
- interaction/jank;
- lifecycle clarity;
- observation/no-change.

- [ ] **Step 2: For each confirmed product defect, add the smallest regression that proves it.**

Use component/page tests for deterministic markup; browser assertions for geometry/focus/overflow. Do not create screenshot baselines for issues better expressed as DOM/geometry assertions.

- [ ] **Step 3: Fix confirmed defects in one bounded batch.**

No new features, no Phase C logic, no broad visual-world replacement. Preserve approved screens that already meet the contract.

- [ ] **Step 4: Run the complete Chromium + WebKit required-width audit once.**

Run: `npm run test:phase-b:ui -- --final`

Expected:
- no BLOCKER/MAJOR UI findings;
- no horizontal overflow on audited surfaces;
- ordinary actions meet 44px target;
- open menus/popovers stay inside viewport;
- focus is visible;
- long-name/many-location fixtures remain usable;
- no obvious interaction jank recorded.

- [ ] **Step 5: Perform one confirmation pass after fixes, then stop polishing.**

The second pass is confirmation, not an open-ended aesthetic loop.

- [ ] **Step 6: Commit UI baseline remediation.**

`git add -u src/app src/components && git add docs/execution/phase-b-ui-baseline.* && git commit -m "fix: complete Nevora UI baseline hardening"`

---

### Task 7: Reconcile final Phase A hardening, run release-grade Phase B verification, and freeze candidate

**Files:**
- Modify only conflict/behavior reconciliation files if the accepted Phase A hardening SHA differs on overlapping source.
- Create: `docs/execution/phase-b-report.md`
- Create: `docs/execution/phase-b-verification.json`

**Interfaces:**
- Consumes: final accepted Phase A hardening SHA from Codex + ChatGPT/CEO review, all Phase B commits, protected Phase 4/5 tests.
- Produces: one clean Phase B candidate SHA ready for independent Codex Phase B review.

- [ ] **Step 1: Obtain the final accepted Phase A hardening SHA and compare overlapping files.**

Run a three-way diff from common parent `1074557...`. Record every overlapping product file and the behavior each side changed.

- [ ] **Step 2: Rebase/reconcile Phase B onto the accepted Phase A SHA.**

Before any rebase, record the CEO-accepted Phase A hardening SHA in `docs/execution/phase-b-report.md` as `PHASE_A_ACCEPTED_SHA=<40-hex SHA>`, verify that commit exists locally and is a descendant of `1074557cf86eb045eb3da1f4f0b646ad7b8c005e`, then export the exact value:

`PHASE_A_SHA="$(sed -n 's/^PHASE_A_ACCEPTED_SHA=//p' docs/execution/phase-b-report.md)"`

Verify: `test "$(git rev-parse "$PHASE_A_SHA")" = "$PHASE_A_SHA" && git merge-base --is-ancestor 1074557cf86eb045eb3da1f4f0b646ad7b8c005e "$PHASE_A_SHA"`

Then run:

`git rebase --onto "$PHASE_A_SHA" 1074557cf86eb045eb3da1f4f0b646ad7b8c005e codex/nevora-phase-b-ui-foundation`

Resolve conflicts by preserving accepted Phase A business/security fixes first, then reapplying Phase B presentation/lifecycle intent. Never resolve conflicts by choosing an entire side wholesale without reading the behavior.

- [ ] **Step 3: Run focused tests for every reconciled file.**

Every overlap requires an affected regression run before the full gate.

- [ ] **Step 4: Run final Phase B verification.**

Required:
- `npm test`
- `npm run test:foundation:integration`
- `npm run test:exchanges:integration`
- `npm run test:generation:integration`
- relevant notification integration/QA suites when exercised files overlap them
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:phase-b:ui -- --final`

Preserve exact counts/exits and distinguish fresh runs from hash-proven reuse.

- [ ] **Step 5: Run final source review and lifecycle audit.**

Verify:
- no unsafe hard-delete capability was introduced;
- no customer-data management flow depends on developer-only actions;
- no Manager can grant/edit Owner authority;
- at least one active Owner is preserved;
- no old session survives deactivation;
- no Phase C/timekeeping implementation entered scope;
- no Fuel-specific behavior was added;
- common workflows remain understandable without instructions.

- [ ] **Step 6: Write the Phase B report and verification manifest.**

Report:
- parent/final SHA;
- files changed;
- UI findings closed/open;
- customer lifecycle coverage;
- test counts;
- browser matrix;
- known limitations;
- explicit BLOCKER/MAJOR status;
- recommendation for independent Codex review.

- [ ] **Step 7: Create one clean Phase B candidate commit if reconciliation/reporting leaves uncommitted work, verify clean worktree, then STOP.**

Do not push, merge, deploy or start Phase C.

The next action after this task is the agreed Codex independent Phase B audit/hardening pass, followed by ChatGPT review and CEO acceptance.
