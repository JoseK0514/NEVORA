# Phase D D3–D8 execution ledger

Controlling authorization: Jose's **NEVORA PHASE D — D3–D8 MASTER EXECUTION AUTHORIZATION**, received October 7, 2026 (America/Puerto_Rico). It supersedes the earlier per-section executive/independent gates in `phase-d-d2-d7-controlled-execution.md` and `phase-d-gates.json`. Embedded QA and D8 internal integrated validation govern this execution. No independent reviewer is dispatched.

## Custody and controls

- Repository: `JoseK0514/Fuel-Scheduler-`.
- Execution branch: `codex/phase-d-d3-d8-execution-20261007`.
- Immutable starting SHA: `7485463dedb6b93e8b6ec4ebf3a86172fb9be5b5`.
- Starting tree: `99c8a5fb923c88bf8a520592e425be66f7902bfd`.
- Git verifies parent `9caafedf1b37d794f359ca47309bffa31ecddd21`. The pasted parent contains a transcription discrepancy; the controlling SHA and tree match exactly. No source substitution.
- Frozen D2 branches, shared development and existing worktrees remain preserved.
- Production NO-GO and FR-AUTH-001 OPEN remain in force. No production migrations, data changes, messages, purchases or release authorization.
- Owner/Manager management authority and Employee/Lead self-service authority retain existing current-session checks and lock order. No self-review.
- Database/browser tests use newly owned loopback PostgreSQL and fictional accounts only. Build/start scripts contain no migration operation.

## Requirements and bounded implementation

Requirements source: original Lettered Executive Program pasted document, Phase D D3–D8, and inherited remaining-section guardrails. Relevant executive skills loaded; assessments are perspectives of this single implementation session, not independent people.

1. **D3 Timecards:** employee period/details/breaks/corrections/totals; manager exception-first review, approve, finalize, audited reopen and retained historical revisions. Consume D2 canonical effective views. Exact elapsed time, inclusive first/exclusive following local day, no pay deductions/rounding. Approval binds source fingerprint; finalization requires a completed past period with no pending corrections/open/inconsistent time. An additive finalization interlock prevents D2 changes until explicit reopen. Idempotent commands and source/revision conflicts are visible.
2. **D4 Reports:** period summaries, approval, hours by employee/location/historically captured position, Schedule vs Actual and attendance plus existing request/scheduling records. Authoritative numerator/denominator and provenance; missing policy/evidence produces unavailable metrics. Bounded complete reads fail closed instead of truncating.
3. **D5 Exports:** authorized report dataset in safe CSV and useful accessible printable/PDF output. Formula-injection protection, UTF-8 escaping, scoped downloads, no destructive file/source retention.
4. **D6 Payroll-ready export:** eligible finalized immutable revisions; normalized exact recorded time and separate breaks; explicit employee/provider identifier mappings for ADP/QuickBooks/future providers. No earnings/tax/payroll processing or unsupported vendor certification.
5. **D7 Action Center:** real deduplicated scheduling/request/timekeeping actions, counts and contextual links; no notifications or invented urgency.
6. **D8 Internal validation:** current full suite, owned PostgreSQL/migration/race tests, employee/manager/role/browser Chromium/WebKit/responsive/keyboard/privacy/error/retry checks, typecheck/lint/build/dependency audit and exact identity/custody. Hosted/CI requirements evaluated against isolated environment availability; evidence gaps remain explicit.

## Execution status

| Workstream | Implementation | Verification | Checkpoint |
| --- | --- | --- | --- |
| D3 | COMPLETE | PASS | Embedded checkpoint below |
| D4 | COMPLETE | PASS | Embedded checkpoint below |
| D5 | IN PROGRESS | NOT RUN | D4 dependency satisfied |
| D6 | WAITING | NOT RUN | D5 dependency |
| D7 | WAITING | NOT RUN | D6 dependency |
| D8 | WAITING | NOT RUN | Final integrated candidate |

## Rulings and limitations

- Jose's latest instruction controls independent-review timing; no skill or stale register creates a new D3–D8 approval gate.
- Operational recorded elapsed time includes breaks. Break elapsed time is separate. Payroll eligibility does not invent compensation policy.
- Source custody is established by exact commit/tree and Git ancestry; the pasted parent typo does not change the starting candidate.
- Physical-device/screen-reader, hosted authorization/rollback/recovery and inherited release controls retain their documented status. Local automation does not close them.

## Evidence and defects

Evidence commands, counts, finding severity, remediation and checkpoint commits are appended as execution proceeds. No completion or independent closure is claimed from this preparation record.

### D3 embedded checkpoint

Implemented additive migration `0018_timecards.sql`, canonical effective-source timecards, immutable approval/finalization/reopen revisions, idempotent receipts, stale-source/revision checks, finalized-period correction and raw-history interlocks, private scoped read/write APIs, employee/Lead period view, exception-first Owner/Manager review and mobile navigation.

- `npm test`: **188 files / 1,987 tests PASS** after the approved timecards destination was added to the existing exact mobile-navigation expectation.
- Owned Clocker/current-runtime PostgreSQL: **26 files / 457 tests PASS**. This includes **11 D3 protocol tests**, not 11 additional unique tests.
- Focused projection/API/navigation run: **3 files / 41 tests PASS**, overlapping the application suite.
- Owned Chromium/WebKit browser harness: **40 checks PASS**, widths 320/375/390/430/768/1024/1440, actual Manager approve/finalize/reopen, Employee/Lead scope, keyboard and offline/error private-state clearing. Implementation-stage source manifest retained; final exact-SHA D8 rerun remains required.
- Typecheck, ESLint and production build: **PASS**. Next generated its normal type references and development-type include; no migration is executed by build/start.
- P1 `D3-EXEC-001`: stale management proof could survive a current role downgrade in the read guard. Reproduced in owned PostgreSQL; restricted current read roles; **CLOSED by embedded regression**.
- P2 `D3-EXEC-002`: historical raw writes could affect finalized sources. Reproduced; additive finalization interlocks protect raw entry/break and correction writes; **CLOSED by embedded regression**.
- One earlier broad database run was invalidated while the new migration was renamed to preserve numeric order after existing `0017_missing_time_supersession.sql`; that failed run is not passing evidence. The stable ordered-chain 26/457 rerun above replaces it.
- Management perspectives in this session: Product scope satisfied; Engineering transaction/provenance controls verified; Security role-loss finding corrected; Delivery checkpoint reconciled; UX browser geometry/flows verified; Governance permits continued isolated development. These are embedded assessments, not independent audit closure.
- Remaining D3 limitations: exact-SHA whole-phase/browser/CI custody is D8 work; physical devices, screen readers and inherited production holds remain open.

### D6 mapping direction — Jose

Jose selected provider-neutral/configurable mappings on October 7. Preserve one canonical NEVORA normalized time/export model; provider profiles/adapters layer above it. Do not hard-code one ADP/QuickBooks edition or invent an import format. SMB presets require verified vendor fields/formats before availability. No vendor activation or payroll processing.

### Mandatory Phase D scope amendment — Jose

Execution continues on the current D3–D8 lineage without restarting D2 or adding approval gates. Four user-designated **P1 requirements** are mandatory implementation and D8 acceptance items:

- **UX-01 OPEN:** complete customer Forgot access/password recovery; secure expiring/single-use proof, enumeration resistance, expired/reused proof handling, assisted recovery when the registered channel is inaccessible, tested session invalidation, unrelated account/operational data preserved. Reuse existing credentials/session architecture and approved services; fictional delivery only during tests.
- **UX-03 OPEN:** distinguish unpublished, published no-assignment/off and unavailable/error employee schedule states; never disclose drafts or present an unpublished schedule as confirmed time off.
- **UX-04 OPEN:** correction queue must distinguish loading, verified-empty, pending, offline/unavailable, reconnecting and authority loss. Unknown data cannot say no correction requests; privacy clearing/current authority remain required.
- **UX-05 OPEN:** shared Clocker permits the next employee to record their own work while preserving a prior unresolved intent/receipt; never cross-identity replay/discard uncertainty; manager-assisted resolution where needed. Verify network loss/retry/refresh/duplicates/identity switches/concurrency with immutable history, idempotency and device/location binding.
- **UX-02 OPEN / DEFERRED:** stronger first-activation identity proof is explicitly **not authorized** by this amendment.

These P1 requirements are added to the D8 matrix. None is claimed implemented or closed at receipt. The final Phase D disposition must remain incomplete until all four have implementation and embedded regression evidence. Product/Engineering/Security/Governance scope is reconciled against current code before each change; routine safe remediation remains authorized.

### D4 embedded checkpoint

Implemented the bounded period reporting projection, one-statement canonical source adapter, current management/session guards before/after the protected batch and a final authority/lifetime observation, private report API and responsive manager report view. Reports cover the required categories, with explicit unavailability for unapproved overtime/scoring policies. Missing publication coverage produces unavailable Schedule vs Actual totals rather than an invented zero-hour plan.

- Affected projection/attendance/API/navigation suite: **4 files / 79 tests PASS**.
- Owned database report suite: **1 file / 6 tests PASS**, including finalized label/snapshot retention, current role loss, revocation and logout after projection. A fixture initially assumed direct raw inserts could supply schedule context; the existing capture trigger correctly rejected that assumption. The corrected fixture verifies the preserved missing-context limitation without weakening the capture control.
- Owned Chromium/WebKit: **64 checks PASS**, including the 40 D3 checks and 24 D4 checks; this is an overlapping execution count, not 64 independent unit tests. Responsive widths 320/375/390/430/768/1024/1440, keyboard, offline and authorization-loss clearing, Lead denial.
- Typecheck, ESLint and production build: **PASS**. Report button styling was corrected to the existing primary/secondary classes after screenshot inspection; subsequent browser checkpoints will exercise it.
- P2 `D4-EXEC-001`: unpublished planning could be interpreted as zero scheduled time. Explicit publication coverage added and pure projection regression passes. **CLOSED by embedded regression**.
- No executive stop condition triggered. D5 starts automatically. Final exact-candidate D8 runs remain required.
