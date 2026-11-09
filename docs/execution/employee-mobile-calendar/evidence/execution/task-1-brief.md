## Task 1: Bound the existing Calendar lifecycle

Interfaces: CalendarSubscriptionStatus adds server-observed finite lease/current canIssue metadata; canonical GET produces it; one mounted client consumes it and exact CalendarCommand/result. Backend lifecycle remains unchanged.

1. Add actual-panel hook-host regressions for unbounded read/write, unrelated storage and signout fencing. Run before implementation. Expected: meaningful current failures, preserve output.
2. Replace the existing component's state/effects with one tested controller: strict current status and operation-bound receipt decoding; bounded headers/body; lease minus round-trip; explicit original retry after unknown outcomes; pause/expiry/signout clear private data; stale completion fences; fresh GET verifies a created URL before reveal; no secret reconstruction. Add finite metadata within existing guarded server read, without borrowing another feature's policy.
3. Unit and canonical SQL cases prove lease, real eligibility and permission boundaries, issue/rotate/revoke/replay/current refusal. Expected: all relevant tests green.
4. Commit code/tests and ledger result.

Whole-task command: npx vitest run src/lib/calendar src/components/calendar-subscription-panel.test.tsx src/components/calendar-subscription-panel-lifetime.test.tsx

