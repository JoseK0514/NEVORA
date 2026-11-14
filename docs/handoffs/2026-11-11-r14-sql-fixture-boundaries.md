# R14 SQL fixture boundary follow-up

Initial delegated source: `b0e41b6397accaac6c7810720fb88f9840b24388`.
Prerequisite imported by fast-forward before final qualification:
`12b4fbf0b8bbcc93ff3cda84bc2370c56ca118a7`, owned by the main integration chat.
That separate commit gives each owned fixture database canonical UTC, ISO/YMD
and READ COMMITTED defaults after verifying its created identity and marker.
No proof timestamp conversion or session contract substitution is used here.

This follow-up changes only `phase-b-integrity.integration.ts`,
`schedule-settings-session.integration.ts` and this handoff. It contains no
application, shared fixture, migration, driver or runtime changes.

## Cause and correction

R14 makes an ordinary application session read an ordered HTTP transaction.
Fault injection based on the first transaction therefore revoked/rewrote the
session before the action derived its proof. Some denial tests passed at entry;
foreign-session tests legitimately derived the other employee's proof and wrote;
several lock probes never reached the intended business lock.

- The three employee Server Action cases now revoke only when the real guarded
  employee mutation batch is prepared. Each requires exactly one mutation
  attempt and the actual PostgreSQL authorization sentinel, in addition to the
  existing result and no-write assertions.
- Settings invalidation and HTML Remove cases target the guarded configuration
  admission batch after session proof capture. They preserve the original
  `ACCESS_DENIED` redirect. Each requires the actual guard boundary and SQL
  denial. Demotion has its own real contract: the authority reader admits all
  current employee roles to report scope; its actual row must show the actor
  became `EMPLOYEE`, after which Company admission is refused. No authorization
  failure is fabricated for that permitted read.
- Settings session/input lock probes start their expiry and blocker only at the
  actual write batch. Earlier session/authority reads execute normally. Every
  case observes the actual blocker through `pg_blocking_pids`, verifies the
  blocked query is the intended session SHARE or input UPDATE lock, observes
  expiry, and requires the real SQL authorization denial and unchanged state.

The lazy Neon statement double and real application session wrapper remain.
No existing denial, history/source, no-write, redirect or lock-wait assertion
was removed or relaxed. No timeout, production guard or business rule changed.
Dynamic SQL inspection only selects where the fixture injects its fault; the
batch and all guards then execute against actual owned PostgreSQL.

## Retained evidence

Directory:
`/Users/josek0514/.codex/release-completion-20261111/r14-sql-fixtures/`.

- `owned-hooks-baseline-red.json/log`: 5 failed, 1 passed, 134 deselected on b0.
  Reproduces the login-version mismatch, foreign-session write, missing actual
  lock wait and early HTML form redirect.
- `owned-hooks-business-boundary-red.json/log`: all 13 selected cases failed
  after importing 12b and adding real boundary/denial assertions, before hook
  correction. This exposes early-refusal false positives independently of the
  shared timestamp-default fix. The other 127 cases were deselected.
- The intermediate `owned-hooks-targeted-green` and
  `owned-hooks-targeted-guard-green` receipts retain 6 and 5 failures respectively.
  The first selected DML too late for configuration-admission redirect semantics;
  the second incorrectly expected a SQL rejection for the all-role authority
  reader's demoted Employee row. The final fixtures distinguish these real
  boundaries while retaining the original expected outcomes.
- `owned-hooks-full-green.json/log` and `owned-hooks-full-results.json`:
  **142 passed, zero failed or skipped**, three files, 52.17 seconds. All 55
  Phase B integrity cases, all 85 settings/session cases and the two new
  root-owned canonical database/reset checks passed. The owned cluster stopped.
- `owned-hooks-final-typecheck.json/log`: full TypeScript passed.
- `owned-hooks-final-lint.json/log`: scoped ESLint passed for both changed files.
  `git diff --check` passed before commit. Only explanatory comments and this
  handoff were added after the final SQL/static checks.

SQL command: `node scripts/payroll-postgres.mjs
vitest.foundation-integration.config.mts
src/test/integration/phase-b-integrity.integration.ts
src/test/integration/schedule-settings-session.integration.ts
src/test/integration/local-postgres-settings.integration.ts` with default/JSON
reporters and the JSON output path above. The runner creates and tears down a
new loopback cluster; inherited application credentials are excluded by the
external environment allowlist. No existing or hosted database is selected.

## Release handoff

CTO/CISO position: preserve the real session proof, lazy batch and authorization
behavior; fault injection must reach its named boundary. Governance/assurance:
retain RED receipts and require real lock/guard observations so early rejection
cannot masquerade as a business-boundary pass. No exception or Jose decision is
required for this fixture-only correction.

Main integration owns the remaining fixtures/runtime evidence, frozen combined
qualification, independent review and final CI allocation. The full default
suite and full release SQL runner were not duplicated here; their combined gates
remain with that owner. Import only this follow-up after 12b. No further heavy
runs are planned here. No Actions, remote push, hosted, native application,
customer delivery or production action was performed.
