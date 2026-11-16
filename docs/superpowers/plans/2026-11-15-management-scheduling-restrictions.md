# Management Scheduling Restrictions Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation and a fresh whole-change reviewer. Preserve other agents' work and the single development integrator.

**Goal:** Separate approved restrictions from preferences and enforce joint coverage with meaningful weekend rotation.

**Architecture:** Versioned JSON policy on existing scheduling settings, shared eligibility/preference resolver, protected commands and deterministic planner ranking. Preserve legacy behavior until explicit management confirmation.

**Tech Stack:** Existing TypeScript, Next, PostgreSQL, Vitest; no dependencies added.

**Spec:** `docs/superpowers/specs/2026-11-15-management-scheduling-restrictions-design.md`

## Global Constraints

- Baseline development b5085edb33d1bccc440588f950e728566c8a79ac; detached isolated implementation.
- No UI, payroll changes, marketplace, real mail, remote database migration, production or shared-ref mutation.
- Preserve current authorization, publication, fixed assignments, existing caps and search budgets.
- Migration0064 belongs to active Rondo knowledge work; use0065 and document integration conflict.

## Review Focus

- Missing or malformed policy must not silently grant unrestricted eligibility.
- Every business-day portion of overnight shifts must satisfy the correct effective restriction version.
- Stale/replayed commands and role/scope/session changes after lock waits must not commit unauthorized data.
- Later published or deadline-locked weeks must remain protected from earlier cutover dates.
- Approved leave, restricted weekends, missing history and archived/overnight schedules must not create unfair invented history.

### Task 1: Policy domain and persistence

**Files:** Create `src/lib/scheduling/restrictions.ts`, its tests, `src/lib/data/scheduling-restrictions.server.ts`, `db/migrations/0065_scheduling_restrictions.sql`; update migration registry/fixture.

**Interfaces:** `RestrictionDocument`, `RestrictionVersion`, `RestrictionCommand`; strict parse/transition functions; guarded `readSchedulingRestrictions` and `mutateSchedulingRestrictions` services using explicit `SqlExecutor`.

- [x] Write and observe failing domain tests for normalization, approval/request isolation, effective dates and operation replay/conflicts.
- [x] Implement minimal pure document transitions and append-only versions.
- [x] Add nullable storage migration and guarded own/management reads/writes with transaction-time authority, optimistic revision and closed-week protection.
- [x] Verify real disposable PostgreSQL persistence, replay, scopes, stale writes and published/deadline cases.

### Task 2: Shared scheduling semantics

**Files:** `src/lib/scheduling/validate-shift.ts`, `src/lib/scheduling/generation/periods.ts`, `src/lib/scheduling/generation/types.ts`, `src/lib/data/availability-inputs.ts`, `src/lib/data/scheduling-source-facts.ts`, `src/lib/data/schedules.ts`, shared exchange projection consumers and corresponding tests.

**Interfaces:** Shared day resolution consumes approved versions and current preferences; validation exposes firm restriction failures and advisory preference mismatch.

- [x] Observe failures proving preferences do not block while restrictions, approved leave, overlaps and caps still do.
- [x] Wire coherent source mapping, advisory preview, canonical mutations, exchanges and generation through the same rule inputs.
- [x] Test overnight/effective-version boundaries and feasible cross-location/role coverage despite conflicting preferences.
- [x] Run the scheduling unit and generation/exchange SQL cohorts.

### Task 3: Weekend fairness and protected API contract

**Files:** Create weekend history/ranking module and tests; update generation mapping/planner; create manager/employee scheduling-restriction route handlers and tests.

**Interfaces:** Published scheduling history yields explainable weekend burden metrics; planner ranks eligible candidates without changing legality or coverage scores. APIs consume the Task1 command/service contract.

- [x] Observe failing recent-weekend, leave/restriction, missing-history, duplicate and overnight tests.
- [x] Implement bounded scheduled-history projection and preference-aware ranking after coverage/qualification constraints.
- [x] Add protected JSON reads/commands with own/manager scope, actor/session/view binding, origin/body limits and private errors.
- [x] Run domain/API/planner tests, full unit suite, relevant real SQL suites, typecheck, lint, build and independent review.
- [x] Commit a source-bound repository handoff and Claude contract with exact evidence and integration/hosted holds.

## Completion receipt

All three implementation tasks completed and locally qualified at8366493c1345d7d896e16dff51f79754426bc258. Full unit13,111passed/944existing skipped;791 real owned PostgreSQL checks passed;build/static/manual checks passed. Independent review findings were reproduced and corrected; no second independent approval is asserted. See `docs/handoffs/2026-11-15-management-scheduling-backend.md` for source/evidence, deferred minor, rulings and integration/hosted holds. Shared development integration remains an explicit separate ownership handoff, not a completed plan task.

Jose then expressly approved this chat to take over only this feature's development integration and required CI. This supersedes the initial shared-ref hold for the qualified feature alone. Reconcile held Claude40ccc4e4e without importing it, preserve active Rondo0064, run immutable candidate CI, then fast-forward development only after all mandatory exact-source gates pass. No main/hosted/provider/UI activation is included. Record actual integration/CI custody in the handoff's referenced `qualification-final.json.integration`.

The combined runtime with newer developmentdbe8697ed passed all24CI/Mobile jobs atf94f98ce4. GitHub correctly rejected its merge ancestry because development requires linear history. Repack the same tested tree into a single-parent commit on the freshly checked development base, preserve tagged original history, rebuild source-qualified manuals from the linear ancestor, assert no new merge commits, and run the new exact-SHA candidate/development checks. Do not relax protection or force-push. This corrects release packaging;it adds no product behavior or approval requirement.
