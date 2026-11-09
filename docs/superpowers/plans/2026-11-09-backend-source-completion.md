# Backend source completion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline, one fresh whole-phase review at the end.

**Goal:** Deliver one verified development-based backend candidate containing completed onboarding/commerce and Owner AI partner logic, with UI/native changes held explicitly.
**Architecture:** Reuse the existing canonical services, fixed signed native hosting adapters and isolated workspace authority. Adopt reviewed source through scoped three-way integration; retain current development source-lifetime/authorization fixes and original tests.
**Tech Stack:** Node24,TypeScript,Next16,PostgreSQL,Vitest,Stripe23,Neon.
**Spec:** docs/superpowers/specs/2026-11-09-non-ui-backend-completion.md

## Global Constraints
Only development/main/claude-codex-collab-nevora;detached isolation. UI/native-app bytes unchanged. No production,customer-data or paid-model/hosting activity. Two existing fictional staging companies;creation allowance0. Preserve original independent findings and source-specific receipts.

## Review Focus
- Distinct0046 migrations and existing0055 company bootstrap manifest must not silently omit Owner memory or weaken role grants.
- New AI/commerce work must retain current source/Owner/session/incarnation and late-expiry checks after integration.
- Holding frontend adapters must preserve existing clients' old response contracts while exposing new server capabilities only through authorized operations.
- Outbound email/model/provider work remains off in local verification; shared integration never creates live operational authority.
- Source inventory must honestly classify active collaboration, frozen release and held UI/native inputs without claiming wholesale ancestry/adoption.

### Task 1: Integrate onboarding/commerce backend
**Files:** adoption manifest underdocs/handoffs/2026-11-09-backend-source-completion.json; scoped paths from005c099b8; source inventory.
**Interfaces:** consumes developmente9c3b60f5 and005c099b8; produces canonical onboarding,company routing,commerce and hosted adapter modules with protected UI/native exclusions.
- [ ] Record the exact changed path inventory and held UI/native paths; run the existing source checker and preserve its current drift. Expected: main/collaboration drift reported before reconciliation.
- [ ] Three-way integrate005c099b8 into the owned detached worktree; preserve development-only changes; restore excluded UI/native paths to the base. Resolve any migration/fixture conflict from actual code/tests. Expected: all intended backend paths adopted; zero excluded-path diff.
- [ ] Install from the resulting exact lockfile withnpm ci --ignore-scripts --no-fund. Run focused onboarding/commerce/workspace-routing/mail tests plus types. Expected: green; any integration defect must first have a reproducing regression. Commit the source/adoption checkpoint.

### Task 2: Integrate Owner partner backend
**Files:** backend/test/docs subset of2ebda395;db/migrations/0046_owner_advisor_memory.sql,order.ts;Owner advisor API/services; no src/components changes.
**Interfaces:** consumes Task1 workspace/authority; produces Owner-scoped intent/memory/decision/legal/observations using existing permissions and no metered calls.
- [ ] Inventory/three-way integrate the backend subset and preserve all held UI/controller/browser fixtures in the adoption manifest. Expected: native/UI byte equality to development.
- [ ] Reconcile canonical migration order, test DB fixtures and current auth wrappers. Run original focused advisor tests and real owned PostgreSQL partner/offline suites. Expected: correct current Owner,company isolation,expiry,forgetting,qualified legal gating and original reviewed DRAFT-only action behavior. Reproduce/fix any new conflict by TDD.
- [ ] Commit qualified source and Claude contract/gate handoff.

### Task 3: Qualify combined source and adoption
**Files:** relevant regression tests,source inventory,source-specific handoff/evidence underdocs/handoffs; no new UI/native behavior.
**Interfaces:** consumes Tasks1/2; produces one committed exact-source backend candidate and explicit next operational plan.
- [ ] Run relevant original real owned PostgreSQL onboarding/commerce/partner suites, root Vitest,typecheck,lint and clean source-bound production build. Expected: all required selected checks pass with skips/failures separately retained.
- [ ] Reconcile source inventory with exact current main/collaboration refs, historical recovery refs and held dispositions. Expected: existing check:development-sources passes without false inclusion.
- [ ] Preserve full evidence and remaining operations/model-budget/UI/legal/production gates; update Jira. Commit and obtain ONE fresh read-only whole-phase review. Fix Important/Critical findings in ONE executor RED/GREEN pass with full green suite; preserve Minor and every declined judgment as required. No re-review.
- [ ] Prepare normal development fast-forward integration and exact CI observation when review and source gates pass; preserve current remote drift/concurrent ownership and no-main/no-production boundary. External shared push follows existing explicit authorization and governance requirements; if a new approval is actually required, prepare a concrete candidate first.
