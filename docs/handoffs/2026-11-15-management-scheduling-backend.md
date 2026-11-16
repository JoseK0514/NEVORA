# Management scheduling backend / Claude integration contract

Jose authorized this backend after the restrictions/preferences/scheduler discussion. Development is the primary acceptance line; main/production, hosted migration, real notifications and UI publication remain separate. Claude owns UI. This candidate is isolated from active Rondo company-knowledge work.

## Source and state

- Base development: `b5085edb33d1bccc440588f950e728566c8a79ac`.
- Initial implementation: `846b76d37` (local detached candidate; final verification/review supplement follows).
- New migration: `0065_scheduling_restrictions.sql`, prepared for owned disposable PostgreSQL only. `0064_owner_company_knowledge.sql` belongs to the other active chat and must be combined by the single development integrator with both migration registry/fixture changes preserved.
- No remote branch, hosted database, live email, provider, main or production changes.
- Shared-development integration lease has not transferred to this chat. Earlier local finisher confirms no reservation on isolated implementation; its last integration handoff names Cloud Chat1. Do not infer integration permission from this source-local candidate.

## Product contract

Management-approved unavailable intervals are firm. Employee normal/weekly/dated availability is a soft preference only after a management version becomes effective. Approved leave, eligibility, qualifications, overlaps, maximums and operational review rules remain authoritative.

An empty approved `unavailable` list explicitly confirms no recurring restriction. Missing storage/versions is **unconfirmed legacy**, retaining prior behavior. Show that state honestly; do not call employee-entered data a contract or silently confirm everyone. A confirmed future version does not take effect early.

The initial cutover rule is deliberately conservative: an approved version starts in an open current/future Monday week after every published/archived or deadline-locked week it could affect, and after the last approved version. An intervening open week does not permit invalidating a later published one. The API reports the required later week on an ordinary lock; a race can require readback to refresh it. Versions, decisions and existing assignments are retained.

Manager authorization covers the employee's complete primary/eligible/current-assignment location footprint. A location Manager with only part of that footprint cannot change a global employee agreement. Owner controls Owner records. Own employee/Lead requests never approve themselves or change eligibility.

## Endpoints

Both are protected JSON POST, no query parameters:

- `/api/manager/scheduling-restrictions`: Owner/Manager, target within current Company Access.
- `/api/employee/scheduling-restrictions`: Employee/Lead, own target only.

Required headers: JSON Content-Type, same Origin, `x-nevora-scheduling-restrictions: 1`, `x-nevora-actor: <current employee ID>`, and `x-nevora-employee-view: <employeeViewAuthority(serverProof, 'planning')>`. The lifetime value comes from the server, never a substitute for the HttpOnly session. Reuse existing server proof helpers in the relevant page boundary; never serialize a session hash/token. Responses are private/no-store.

Read payload:

```json
{"action":"read","employeeId":"target-employee-id"}
```

Ready result includes `data` (versioned document), `legacyUnconfirmed`, and `earliestWeek`. The document contains schemaVersion1, revision, approved versions, and change requests/decisions. It contains only that target's agreement/request history; planner and Rondo projections strip private reasons and receipt metadata.

Command payload:

```json
{"action":"command","employeeId":"target-employee-id","command":{"kind":"SET","operationId":"11111111-1111-4111-8111-111111111111","expectedRevision":0,"effectiveWeek":"2030-10-07","unavailable":[{"dayOfWeek":0,"startTime":"00:00","endTime":"24:00"}],"reason":"Management recorded the agreed restriction"}}
```

- `SET`: management records a dated version. Day numbers Sunday0–Saturday6. Times HH:MM, same-day positive periods; use two days for a restriction spanning midnight. Adjacent/overlapping intervals normalize. Empty intervals mean no recurring restriction, not a day off.
- `REQUEST`: same schedule fields, own Employee/Lead only. Creates PENDING; approved versions remain unchanged.
- `DECIDE`: management supplies operationId, expectedRevision, requestId, decision APPROVE or DENY, and reason. APPROVE requires its effectiveWeek; DENY must omit it. Management may approve from a later safe week. Decision and version are atomic.

Operation IDs are scoped to the target document and actor. Keep target, operation ID and logical contents unchanged for recovery. Expected revision is optimistic concurrency, not authority. Exact replay returns the original receipt and `changed:false` after fresh authority checks. Changed ID reuse or stale distinct operations conflict. A saved response includes the canonical document and receipt; no assignment is added/removed and no real notice is sent by these endpoints.

States: ready/saved (200), invalid (400), denied (403), conflict/locked/capacity (409), unavailable/outcome_unknown (503), unauthenticated (401). For outcome_unknown retain the same operation ID and retry/read back; never infer a rollback or invent a new ID. Capacity stops new admission while reserving worst-case canonical JSONB bytes for decisions on accepted pending requests; it does not erase history. Do not display SQL/provider diagnostics.

## Scheduler and fairness

Canonical manual, copy, exchange, generated and reviewed Rondo draft paths receive the same approved versions. `AGREED_RESTRICTION` is a blocker; `PREFERENCE_NOT_MET` is advisory. Employee AVAILABLE exceptions cannot reopen firm restrictions. Overnight assignments check each business date's effective version.

Coverage continues to use configured minimum staffing/position/Lead demand and joint cross-location eligibility. A legal partial, missing setup or bounded-search exhaustion is not complete coverage or proof that no solution exists. Preserve management draft review/publication.

Weekend default: Saturday/Sunday, eight completed scheduling weeks relative to the explicitly requested generation week, latest whole-week publication snapshot over staged live changes. Attributable retained archived assignments remain positive evidence when omitted by a later publication for another location; ambiguous archived absence remains unknown. This is scheduled history, not actual attendance/payroll. Inferring a weekend off requires an effective agreement for that historical weekend and publication evidence for the employee's complete current eligible-location footprint. Missing evidence, approved leave, agreed weekend restrictions and released callouts do not become preference-based weekends off. Positive unreleased Sunday work is retained even if Saturday was released/leave/restricted. Equal historic burden can keep the same already-eligible employee on the weekend to preserve a full weekend off for someone else. Existing hour and legality controls still win. Preference fit breaks otherwise equal workload choices before the stable rotating tie.

First publication checks retained Draft assignments against effective restrictions from the coherent publication snapshot. The existing fresh source guard and workspace lock also catch an agreement approved between publication read and transaction. Retained draft rows are not grandfathered around a newly effective firm restriction.

Generation returns INVALID with AGREED_RESTRICTION when a retained, unreleased Draft assignment in the attempted scope violates a newly effective agreement. It preserves all rows and performs no generation/removal until management repairs that draft. Published history, unrelated dates/locations, approved callouts and replaceable generated rows do not trigger this repair gate. Coverage arithmetic alone never overrides the INVALID result.

Cutover custody includes actual occupied dates of closed Sunday overnight shifts, including retained publication captures after live rows are staged or removed. A Sunday shift ending Monday06:00 closes the Monday week; ending exactly midnight does not occupy Monday. Historical captured occupancy is conservatively retained, even if superseded. This may delay an effective version by another week; it cannot silently rewrite published overnight terms.

## Claude work / activation gate

Provide the per-employee management restrictions section and own read-only agreement/change-request view. Label employee controls as preferred hours/days, with no guarantee of shifts or leave. Add request/decision, effective-date, pending/error/conflict/retry states. Surface legacy-unconfirmed and future-effective modes. Do not enable per-employee conversion through the old availability wording. Validate the combined Owner, authorized/scoped Manager, Employee and Lead journeys on development before calling the feature accepted.

## Rollback

Before any hosted cutover, close new restriction commands/confirmation and preserve the complete JSON history. Use code compatible with the new column and already-confirmed semantics; silently reverting confirmed employees to employee-controlled hard availability is not a safe rollback. Do not drop policy/history, rewrite published schedules or reset operation receipts. Prepare exact migration/role/source/runtime receipts with the development integrator before deployment.

## Verification status

Focused domain/API/planner/projection and real SQL checks passed during implementation; full unit, broad SQL, production build and independent review are still being collected. This paragraph is intentionally not a release-ready claim. See the final evidence supplement for exact commands, counts, source hashes, remaining failures and review disposition.

Independent review of846b76d37 identified seven important findings. The bounded correction pass reproduced13 failing pure-path cases plus the real first-publication failure, then passed115 focused cases and14 actual PostgreSQL cases. PostgreSQL additionally proved the UTF-8/JSONB capacity edge (old result1,109,708bytes exceeded1,048,576); the corrected admission bound reserves canonical storage and future decisions. No second independent approval is asserted from the author's regressions.

Deferred minor: the initial read's earliestWeek is the workspace open-week lower bound; an employee's already-approved future version may require a still-later week. The command returns the actual required week on a lock. Claude can derive the later lower bound from the returned version history until the read DTO is aligned.
