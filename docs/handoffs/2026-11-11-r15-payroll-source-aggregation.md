# R15 bounded payroll source aggregation fix

Baseline: `2c727725d4a786bd6563f8efb38e7c02979603b9` in the clean detached delegated
checkout `/Users/josek0514/.codex/worktrees/nevora-r12-r13-r16-local-20261111`.
R12/R13/R16 remain three separate predecessor commits. This R15 change is separate.

## Changed scope

One application file: `src/lib/payroll/service.ts`. The shared `sourceSql` formerly
embedded the now-paged `timecardReadSql` as a scalar subquery. At301 or601 retained
people PostgreSQL threw `more than one row returned by a subquery used as an
expression` before payroll could evaluate its existing source controls.

The payroll expression now materializes the pages inside the same SQL statement,
verifies contiguous unique indexes, one observation/total, the expected page count
and exact bounded array sizes, and flattens **all** cards in page/item order. Missing,
repeated, empty or mixed pages fail unavailable; no partial source can be compared
as a complete review fence. Large internal sources retain a validated completeness
manifest. Small sources return the exact original `to_jsonb(page)-observedAt`
shape, preserving current population hashes and immutable snapshot comparisons.
The volatile observation remains excluded from canonical source identity.

The exported expression is shared by fresh payroll capture, `sourceGuard` and the
existing payroll worker's source/fence reads. No caller is redirected around its
current authority or population review. No lock, manifest, privacy guard, monetary
calculation, payment/correction policy, schema or global transport changed.

## Actual qualification

Evidence: `/Users/josek0514/.codex/release-completion-20261111/r15-payroll-aggregation/`.

- `r15-payroll-source-red`: three expected actual PostgreSQL failures above one
  page; the existing300-person population/approval/replay and authority cases passed.
- `r15-payroll-source-final`: **9 actual SQL checks passed**, no skips. Both301 and
  601 retained rosters (including inactive people) return every internal card and
  a stable source across fresh observations. Tests prove missing/repeated/empty
  producer pages fail; a late-page employee or current population revision change
  invalidates the captured source; pre-read revocation and logout injected after
  capture but before final authority checking suppress the result. The300-person
  population hash matches the independent period-close consumer, imports/approves
  actual zero-period payroll, and replays the exact approval without a new revision.
- `r15-configurable-payroll-regressions`: **39 actual SQL checks passed**, covering
  existing provider-import source/approval/replay, privacy, current authority,
  correction refusal, publication and worker fencing.
- `r15-native-payroll-regressions`: **44 actual SQL checks passed**, covering the
  existing recorded-time payroll consumers, human review, current profiles/scopes,
  source changes, worker fences, exact money/ledger and retained document integrity.
  These are web-backend payroll tests, not native mobile application work.
- `r15-source-focused`: **152 tests passed** in10 files. Full TypeScript, scoped ESLint and diff
  checks passed. The receipts and final local commit are recorded beside
  these logs. No full default suite, build, hosted or provider run was performed.
- Two fictional PDF/JSON outputs produced by the existing recorded-time regression
  were preserved outside the source checkout; hashes and destination are in
  `native-output-preservation.json`. No generated files were committed or discarded.

Single latest owned loopback PG17.10 observations on empty-period fixtures:

| Internal retained source | Pages | Guarded read | Canonical source JSON |
| --- | --- | --- | --- |
|301people |2 |27ms |119,101bytes |
|601people |3 |40ms |237,455bytes |

These are synthetic internal query observations, not hosted load, concurrent-user
latency, end-to-end payroll support or an SLA.

## Preserved bounds and remaining root R15 scope

The existing `source()` facade still refuses a roster over300 as `SOURCE_LIMIT`;
the301/601 tests explicitly verify this after the internal query is assembled.
This change does not silently accept or invent a customer admission policy.
The separate period-close implementation also embeds `timecardReadSql` as a scalar
and has300-person source/member bounds. Provider imports and native profile/opening
collections have their own300-related controls. They are **not** changed under the
explicit JUST-payroll-source delegation. Before claiming larger payroll operating
capacity, the root R15 owner must reconcile those paths and the launch envelope.
There is no claim that601-person population review, payroll approval or publication
is now supported. The full population/approval journey exercised here is300people.

Root retains the other R15 index/lock/queue/scale evidence, R14 transports and R33
repository controls. This handoff cannot close those packages. It requires selected
source integration, independent review and the coordinator's final combined gates.
No additional Jose decision is required for this bounded correction; changes to
admitted operating capacity would need their own explicit disposition.

CTO/CISO: correct complete source assembly, deterministic hash compatibility and
current authority controls. Product/governance: local-condition only, no fabricated
capacity or payment claim, and no independent finding self-closed. No Actions,
push, hosted data, real delivery/payment, native-app or production change occurred.
