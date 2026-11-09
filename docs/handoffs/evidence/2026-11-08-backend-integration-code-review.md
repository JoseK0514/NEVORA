# Development integration code review

Reviewed e2872f30ea8548b1310ea4a9b25813352decf82a through d7bfc4c231ce1d977e1e4ce737ea297dfb502a6e against the November 8 backend integration spec, plan and progress ledger. Detached HEAD matched the proposed commit. No ULW plan exists for this session. This artifact records the read-only application review.

**Ready to integrate into development? With fixes.** Code quality BLOCK. Recommendation REQUEST_CHANGES.

## CRITICAL

None.

## HIGH · Important

1. **The final company check can outlive the previous-week timecard budget.** At src/lib/action-center/service.ts:41 the core deducts elapsed time, but at line 51 the public reader still has a database round trip ahead. src/lib/company-access/operational-scope.server.ts:243 awaits the data and then runs the final guard. src/lib/company-access/company-result.server.ts:15 ages only company authority across this delay. I ran that actual wrapper, transpiled from the candidate in memory, with its operational-company dependency returning a 15,000 ms company budget and advancing a controlled monotonic clock 1,500 ms after the data callback returned a 1,000 ms source budget. It returned ready with 1,000 ms left. A slow final guard can therefore serve an expired action snapshot. src/lib/action-center/service.test.ts:12 bypasses the wrapper. Record the source deadline when the inner read finishes and consume it through return. Add a public-boundary regression for a shortened and an expired source budget during the final guard.

2. **A decision racing the Requests read can still count the same swap twice, or hide it entirely.** src/lib/data/employee-requests.server.ts:35 reads activity and incoming in separate concurrent guarded transactions. The new predicate at line 50 filters using only the activity observation. If incoming sees EMPLOYEE_PENDING and activity sees a later CANCELLED, the response carries both. Reverse the read order and it carries neither. The later presentation check compares only module revision. Use one consistent guarded observation for the two swap projections, including a common effective-status observation time. Exercise cancellation or expiry between reads using a deterministic test. Preserve the current partial-source response contract where applicable.

## MEDIUM · Important

3. **Pending incoming swaps consume all the history slots before filtering.** src/lib/data/exchanges.ts:485 limits the candidate set to 20 before the Requests filter at src/lib/data/employee-requests.server.ts:50. Twenty newer pending offers to the employee can hide their latest sent request and all decided-recipient history, leaving Recent empty even when eligible records exist. Select the most recent eligible rows after classifying them under the canonical effective status. Keep existing readers’ limits and avoid dropping persisted-pending records whose effective status is already expired. Add a crowded-history case in the owned fixture. This is part of the explicit sender/recipient-history criterion.

## LOW · Minor

4. src/lib/assistance/manager-actions.ts:97 reimplements a UTC-noon calendar increment already provided by addDays in src/lib/date-utils.ts:20. The module already imports from date-utils. Reuse the existing helper in gapEnd.

## Scope, evidence and limits

- Read the production diff and added cases, including the approval/finalization sequence and failed SQL-source case. The core combines separately bounded canonical reads. Item identities and links consume each card's dates. Finalized records and records without entries or history are excluded. The optional clock treats equality as ended and correctly retains previous-day overnight gaps. The current badge, Home and both Inbox callers all use the prior no-clock contract.
- Inspected external evidence at /Users/josek0514/.codex/native-runtime/nevora-backend-integration-20261108-0w4zx1gf including full-unit-report.json, task1-sql-final.log, task2-sql-green.log and unit, lint, typecheck and build receipts. The SQL logs report 39 and 7 passes with both clusters stopped. The earlier full-suite JSON reports 10,993 passed, 801 pending, zero failed. The range from e4a3c160 to reviewed HEAD changes only documentation. I ran the controlled wrapper experiment and inspected existing results. I did not rerun the full suite or start PostgreSQL during review.
- Consulted remove-ai-slops and programming skills and the Superpowers code reviewer template. Tests assert behavior and contain no removal-only or tautological assertions. The wrapper mock creates false confidence about end-to-end expiry (finding 1). The calendar increment duplicates a domain helper (finding 4). No separate implementation-mirroring or speculative parsing finding.
- Reviewed backend integration scope, including held badge activation. Declined to judge hosted CI, deployments, production performance, native/UI rendering and independent certification because those require surfaces or authorization outside this code review. The candidate adds a second guarded timecard read per request and preserves the existing 1,000-item fail-closed bound.
- Blockers before approval are findings 1, 2 and 3. Correct and verify those scenarios before pushing development.
