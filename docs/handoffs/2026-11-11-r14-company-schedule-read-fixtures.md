# R14 Company schedule read fixture follow-up

Baseline: `7e71ef4be48c9a008774342facc591afb236067a`, selected from the main
integration checkout with prior child commits preserved in recovery refs.
Scope: only `company-access-schedule-actions.integration.ts` and this handoff.
No application, runtime, shared fixture, schema, CI or deployment changes.

## Cause and bounded correction

The selected application SQL transport now executes even a single read inside
its real ordered session transaction. The old query-only post-read hooks missed
16 private validation reads, four canonical management reads and five publication
readiness reads. Missing scope changes then left business feedback visible to
the test, or caused its hook-observation assertion to fail.

A local fixture observer now forwards the entire original transaction unchanged,
then observes each statement's actual result before returning the batch to its
caller. UTC/ISO setup, the final session contract guard, transaction atomicity and
result indexes remain intact. Direct query support is retained; existing domain
executor hooks were not rerouted or replaced. Canonical-read privacy checks also
observe submission of any later private validation read.

Each repaired hook requires the actual final `{sql_session_contract:1}` result
and its intended rows: approved leave, the specified overlapping assignment,
the requested canonical employee/shift, or the publication warning assignment.
Scope transitions are checked against real before/after authority views: original
Company admission, intended resulting scope, exact revision advance (two for
revoke/regrant) and a changed authority digest even when Company is regranted.

Hook success is recorded only after these checks and the scope change finish.
An observer exception cannot count as a successfully injected authority loss.
All original generic denials, no-private-validation/no-write assertions, stable
Company feedback, publication warnings, scoped CRUD and other positive controls
remain. There are still exactly 68 test cases; none was skipped or weakened.

## Actual evidence

Directory:
`/Users/josek0514/.codex/release-completion-20261111/r14-company-schedule-fixtures/`.
Existing external PostgreSQL was verified as **17.10**; no runtime was installed.

- `company-schedule-baseline-red.json/log` and `baseline-results.json`:
  exact original owned file, **25 failed / 43 passed**, no skips.
- `company-schedule-full-green.json/log` and `final-results.json`:
  initial observer correction, 68 passed, no skips.
- `hook-proof-negative-control.json/log`: intentionally expected a false final
  contract proof in one canonical-read case. The actual PostgreSQL proof was 1;
  the test failed as required rather than passing as an intended denial. The
  external harness restored the owned file byte-for-byte in `finally`; original
  and mutated source hashes are retained. The other 67 cases were deselected.
- `company-schedule-qualified-green.json/log` and `qualified-results.json`:
  final observer-success checks, **68 passed, zero failed or skipped**,
  21.51 seconds. The owned loopback cluster confirmed shutdown.
- `company-schedule-typecheck.json/log`: full TypeScript passed.
- `company-schedule-lint.json/log`: scoped ESLint passed for the owned file.
  `git diff --check` passed before commit.

SQL command:
`node scripts/payroll-postgres.mjs vitest.company-access-integration.config.mts
src/test/integration/company-access-schedule-actions.integration.ts`, with
default/JSON reporters and separate baseline/final output paths above.
The existing runner creates a new owned loopback database; the external command
environment excludes application credentials. No existing/hosted database,
customer data, notification delivery or provider access was used.

## Next gate

CTO/CISO position: observe the selected real batch and verify actual authority
changes; preserve session and privacy controls. Governance/assurance: keep the
25-case RED and deliberate negative control alongside bounded GREEN evidence.
No Jose exception or decision is required for this fixture repair.

The main integration owner imports this separate commit after 7e71ef4be, then
owns combined frozen qualification and independent disposition. The full Company
access suite, full default suite, build and browsers were not rerun here. No more
heavy work is planned in this child checkout. No Actions, remote push, hosted,
native application or production action occurred.
