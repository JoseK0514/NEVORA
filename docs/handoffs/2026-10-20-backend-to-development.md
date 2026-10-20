# Backend integration into development

Status: integration and verification in progress. Owner: Codex COO.

Jose authorized moving all completed backend work into `development`, using the current Claude UI, and pushing. A newer Claude UI remains a later integration. Production deployment is outside this instruction.

## Frozen inputs

- Remote development baseline: `b58496b84b21690f7be22474f7570da2d81af6c3`.
- Current shared UI/backend: `2eb2a03ab354e1488d24176b62d9ad8f5a7fbb0c` (`codex/verify-preview-33`). It includes the premium backend server/API/migration inputs observed at `2d425b4b19ad86e9b19e23498e92269e871f2a1f`.
- Local completed backend assembly: `c0bd7c556ffec10f5158aa36e54f2640a664908c`, tree `deb75efb5fa66198a45ee4cc4ff0c06f7923db91`. Includes native payroll, the fresh-company setup correction, and accepted Company & Access recovery. Imported without modifying its source checkout.
- Backend merge base: `b6e7c440f398a95644f8fb714fb9f6ae9065eec3`.

## Integration plan and ledger

1. Preserve both source histories and existing work. Complete: managed isolated worktree `codex/backend-to-development-20261020`; original checkout and source assembly preserved.
2. Reconcile shell/navigation/server controls (root), payroll (payroll integration worker), employee/invitation access (employee access worker), and operational pages (operations worker). In progress. Workers edit disjoint files; root owns Git staging and commits.
3. Run combined typecheck, lint, unit/configuration checks, production build and development-marker exclusion; inspect owned database/browser coverage where available. Pending.
4. Review the combined change, commit, push development with ordinary fast-forward history, verify remote identity and record CI. Pending.

The initial shared snapshot passed local typecheck and lint. Its local full test run was stopped before completion when the missing backend assembly was discovered; it is not passing combined evidence. The existing exact-shared-source hosted CI passed validate and SQL jobs, but failed Phase D/E browser jobs and their mandatory aggregate. These failures are preserved and are not release acceptance.

Merge-specific regression: Finder and Today initially returned HTTP 200 when the accepted Company scope wrapper denied access. Four new tests reproduced the missing boundary. Both routes now use the existing before/after Company authority wrapper; the focused run passed 79 tests across five files. Full combined verification remains pending.

## Controls and release state

Engineering preserves backend contracts, data ownership and recovery semantics while adopting compatible Claude UI. Security preserves explicit operational scopes, independent payroll permissions, invitation possession, session revocation and private responses. Delivery requires one recorded combined candidate. Governance recommendation remains conditional on combined verification; no independent audit finding is self-closed.

The global `vercel.json` deployment hold remains enabled. No production database credentials or real notification deliveries are used. SaaS/Phase F and previously held photo/operations modules remain paused; source custody does not activate them. Native payroll provisional/statutory, actual-record facts, privacy/consent and external-payment holds remain in force.

Rollback: development can receive a normal revert of this integration; preserve both input commits and avoid history rewriting. New Claude UI should merge against the final recorded development commit and retain the backend contracts and authority gates.

Final candidate, checks, remaining failures, remote state and next gate will be appended after execution.
