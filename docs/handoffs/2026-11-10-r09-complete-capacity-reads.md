# R09 complete timecard and pending-correction reads

Baseline: `0317598ae6886bc964bbd6bb5c1bbbd3add46069`. Detached local worktree:
`/Users/josek0514/.codex/worktrees/nevora-r08-r09-local-20261110`.
R08 implementation and its actual own-statement SQL test are separate predecessor
commits; the integration owner owns the outer schedule-observation privacy fix.

## Result and contracts

Management timecards formerly rejected more than 300 retained people. The pending
correction SQL returned null above 100 requests, disabling aggregate Action Center
even though these are not approved customer admission limits. Both reads now
assemble complete bounded pages from **one SQL statement** with one materialized roster/count and observation header:

- Timecards: deterministic employee-ID order, 300 rows per page, all retained
  employees including inactive people; Employee/Lead own-person scope unchanged.
- Corrections: deterministic created-at/ID order, 100 requests per page, all
  pending requests including people subsequently deactivated. No `LIMIT 100` or
  null snapshot at the former threshold.
- Each SQL result row carries a contiguous page index, the same materialized
  observation and total count. An empty source has an explicit page zero with an
  empty array. Missing, repeated, reordered, truncated or mixed headers/arrays
  throw; a missing result is never treated as an empty source.
- `assembleCompleteReadPages` requires exact page counts and per-page row counts.
  Private capture uses the same validation separately. Incomplete private evidence
  makes the protected read unavailable and returns no capture.
- The existing flat `cards` and `requests` client contracts remain. For bodies over
  the old bound, optional `paging` contains `{version:'COMPLETE_READ_V1',pageSize,
  totalRows,pageCounts}`. Parsers verify it against the actual body, normalize it,
  and reject duplicate identities globally, including across pages. Oversized
  legacy bodies without complete metadata remain invalid. Small service payloads
  retain their previous public shape.

No command, mutation, authority guard, finalization rule or schema changed. Current
session checks run after the reads. Existing 45-second/session validity, per-card
100-revision history, aggregate 10,000-entry/correction controls, Action Center's
1,000-item bound and 100-command write batch remain distinct controls. No new
employee/customer admission policy or unlimited-capacity promise is introduced.

The existing `nevora_timecard_source` remains VOLATILE. Its nested reads rely on the existing workspace/employee locking and freshness protocol; materializing outer pages does not establish a transaction-wide MVCC snapshot for every nested statement. Concurrent newly inserted people and deep source history are outside the measured capacity fixtures. Hosted workload admission and concurrency qualification remain release gates; this patch makes no stronger isolation claim than the verified protocol.

## Local qualification

Artifacts and command receipts:
`/Users/josek0514/.codex/r08-r10-local-20261110/r08-r09/`.

- RED public-parser regressions: the original implementation refused complete
  301/101 bodies; duplicate correction identities were not rejected.
- RED actual SQL: both new capacity journeys failed at 301 cards and 101 pending
  corrections, after their 300/100 assertions passed. The R08 statement SQL test
  passed in that same run (`red-r09-owned-sql.log`).
- GREEN actual SQL: **61 passed in five files**, no skips, through
  `vitest.capacity-completeness-integration.config.mts` and the existing
  `scripts/payroll-postgres.mjs` owned runner. Includes existing timecard lifecycle,
  correction protocol and Action Center suites plus the new capacity and statement
  checks. Receipt: `green-r09-legacy-sql-corrected-revocation-hook.json`.
- The first legacy cohort exposed a stale test hook matching `WITH scope AS`.
  It no longer injected logout after the SQL refactor. The test now matches the
  exported read statement, preserves its denial assertion and additionally proves
  revocation was injected. It passed in the final 61-test run.
- Three-page fixtures cover **601 retained people** (including inactive people)
  and **201 actual submitted corrections** (the target is deactivated before the
  final read). Exact current/public/private captures and complete Action Center
  correction IDs pass. Missing/repeated page transport and truncated private
  capture fail closed. Real session deletion after the source query denies the
  whole result; stale proof and Employee own-person scope remain covered.
- Focused parser/client/canonical-source/component/route suite: **418 passed in
  29 files** (`green-r09-final-related.json`). Includes cross-page duplicate IDs.
- Full TypeScript check and scoped ESLint passed; `git diff --check` passed.
  The coordinator owns combined-source full lint/default/build; no second full
  default suite was run here for R09.

Last 61-test-run observations, on a fresh owned loopback PostgreSQL 17.10 cluster:

| Synthetic source, including private capture | Rows / pages | Read time | Public DTO bytes |
| --- | --- | --- | --- |
| Retained timecards, empty periods | 601 / 3 | 65 ms | 413,202 |
| Submitted pending corrections | 201 / 3 | 33 ms | 135,552 |

These are single local observations, **not** hosted latency, concurrent load,
maximum supported capacity or an SLA. Timecard fixtures do not represent deep
revision/punch history. Total public data and UI rendering still grow with the
complete source. Existing explicit resource/expiry failures remain unavailable
rather than partial success. Further load or hosted qualification requires its
own scope and approved environment; no live load test was performed.

## Ownership, review and next gate

CTO: one-statement ordered aggregation and explicit complete-read contracts.
CISO: current authority and private capture coherence preserved; partial evidence
cannot produce ready counts. Product: no invented admission cap. Governance:
local qualification only; no independent finding self-closed.

The integration owner must review/cherry-pick this package, combine with R10 and
the R08 outer-wrapper correction, then run final local qualification. Claude's
combined UI acceptance, staging migration/testing, any later authorized CI and
production gates remain separate. No push, Actions, production/native/customer
data, messaging, dependency/provider/model call or purchase occurred. No Jose
policy decision is required for this bounded implementation. Dashboard status
must wait for reviewed integration evidence.
