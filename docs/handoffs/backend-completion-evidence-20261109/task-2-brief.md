### Task 2: Integrate Owner partner backend
**Files:** backend/test/docs subset of2ebda395;db/migrations/0046_owner_advisor_memory.sql,order.ts;Owner advisor API/services; no src/components changes.
**Interfaces:** consumes Task1 workspace/authority; produces Owner-scoped intent/memory/decision/legal/observations using existing permissions and no metered calls.
- [ ] Inventory/three-way integrate the backend subset and preserve all held UI/controller/browser fixtures in the adoption manifest. Expected: native/UI byte equality to development.
- [ ] Reconcile canonical migration order, test DB fixtures and current auth wrappers. Run original focused advisor tests and real owned PostgreSQL partner/offline suites. Expected: correct current Owner,company isolation,expiry,forgetting,qualified legal gating and original reviewed DRAFT-only action behavior. Reproduce/fix any new conflict by TDD.
- [ ] Commit qualified source and Claude contract/gate handoff.

