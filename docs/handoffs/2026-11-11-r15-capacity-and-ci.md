# R15 capacity, contention and test-allocation reconciliation

This is a bounded local engineering envelope, not a hosted performance guarantee.
Current commercial entitlement/admission remains authoritative; no employee limit,
customer plan, source lock, privacy guard, financial rule or timeout is expanded.
The historical October21 inspector counts and throughput estimates are not current
measurements. Its original report remains retained as historical evidence.

## Source and financial boundaries

R09 supplies complete300-row timecard and100-row correction pages in one outer
statement. Actual601-person and201-correction fixtures cover all pages, private
capture and revoked authority. The existing per-card100-revision history,
aggregate10,000-entry/correction parser controls, Action Center1,000-item limit,
100-command write batch and100-person export batch remain separate limits.
R11's target chooser is a bounded recent catalogue, not an all-history claim.

The delegated payroll fix materializes and validates all pages before flattening
the canonical source. Root found the same scalar-subquery defect in period close:
two real301/601 tests failed with a database scalar error. Both now use shared
`timecards/canonical-source-sql.ts`; the exact <=300 JSON/hash shape is preserved.
The public payroll source and period-close population still refuse >300 retained
people (`SOURCE_LIMIT` / `POPULATION_SOURCE_LIMIT`). Population/import/receipt
collections retain their existing bounds. Internal601-card aggregation does not
authorize601-person payroll approval. Historical inactive people count toward
retained-source limits; do not delete history or split financial populations to
evade them. Larger financial capacity needs a separately reviewed implementation.

## Current locks and indexes

Scheduling still captures the complete26-table source and uses sorted week locks,
parent-before-child table locks, exact source comparison,1,500ms lock timeout and
5,000ms statement timeout. Foreign weeks, absent memberships and cascading source
changes remain protected. Payroll locks its workspace, employee census and reviewed
source tables. Same-company operations can serialize. Isolated company databases
bound that scope; a lock-free, unbounded or constant-cost claim would be false.

Actual owned PostgreSQL proves `schedule_revision_shifts_source_idx` and
`time_entries_clock_out_idx` valid/ready with their exact definitions. A selective
recent-entry query uses the latter index. That one plan does not prove every
report or correlated predicate is indexed. Source growth still needs monitoring.

## Owned measurements and limits

Evidence under `/Users/josek0514/.codex/release-completion-20261111/`:

| Fixture and operation | Actual observation |
| --- | --- |
| Internal301/601 retained empty-period cards |25/38ms and119,101/237,455 source bytes in first combined measurement; full arrays validated |
|300 retained people,20,000 old plus300 current recorded entries |162ms guarded payroll source read; two real workspace-lock waiters observed; release then both serialized in337ms |
|30 non-Owner staff,2locations,52weeks/7,800 historical live shifts |3,716,894-byte complete26-table source;51ms capture,48ms locked exact-source guard |
|201 queued deliveries,2concurrent SQL claimers |201 distinct claims,22requests, maximum10 per batch; claim p50/p95=3/5ms; claim/cancel103ms; oldest due age201s |

These are single loopback observations on fictional data, not p95 customer latency,
planner feasibility, concurrent browser capacity, a full scheduling/payroll command,
provider throughput, device receipt, sustained load or hosted SLA. The scheduling
fixture measures raw source/fence work, not a year of publication-revision history.
The queue fixture cancels its claims and never calls a provider.

The notification runtime still has10-row batches, concurrency2,20s invocation
budget,8s attempt deadline,120s leases and five bounded attempts. Claims order by
next-attempt time/ID. High urgency bypasses routine quiet hours but has no separate
priority lane: the later high-urgency item was position201 behind older normal
items. Therefore the historical “8–10 deliveries per20s” is not accepted as measured
throughput, and urgent delivery time is not guaranteed. Queue age, exhausted leases,
timeouts and failures must remain visible to the operator. Do not increase workers
or promise an SLA from these query-only timings.

## Mandatory test allocation

The old “49 integration files unwired” inventory is superseded by current explicit
paths, not by a claim that every historical/native test runs:

- `release-postgres`: existing foundation/authority/generation/exchange/notification
  suites plus Owner advisor, Rondo fixture, configurable and recorded-time payroll;
  now also the dedicated complete-source/contention suite with raw JSON artifacts.
- `onboarding-backend` -> `onboarding-acceptance.mjs`: owned onboarding including
  real SDK isolation, Company Access foundation/exchange, worker enrollment and
  managed workforce. Company-access wildcard includes timestamp invitation proofs
  and period/export authority/dedupe regressions.
- Clocker's checked four-shard allocation includes all current Clocker SQL files,
  management close and delegated corrections; missing/duplicate groups fail.
- New mandatory `management-review-ui`: real R10 and R11 browser suites plus a
  verifier requiring exact source SHA/hashes, complete/error-free scenarios and
  verified closed owned runtimes. It retains results, screenshots and manifests.
  It is included in strict Phase E dependency verification and branch protection.
- Existing Phase E/D and separate mobile-access pipelines remain; native/lease-gated
  tests stay distinct. Default-suite skips are reported, not called executed SQL.

Local evidence: period-close2RED/7PASS then9PASS; capacity/contention10PASS and
separate scheduling1PASS (other selected tests skipped deliberately); queue1PASS
with78 unselected cases. Full notification/default/schema/browser/build reruns and
independent combined review remain required on the frozen candidate. Initial
scheduling fixture date-type failure and a startup invocation missing PG runtime
selection remain recorded; corrected fixtures and explicit-runtime startup pass.
CI contract/evidence-verifier21checks pass. No assertion/lock/timeout was weakened.

CTO/CISO: complete source and current guards retained. Product/governance: MITIGATE
with explicit existing limits and measured claims; no new risk acceptance or hosted
admission decision. No live load, provider/network sends, paid analysis, Actions,
push, native or production action is represented by these local receipts.
