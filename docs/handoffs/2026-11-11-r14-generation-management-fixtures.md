# R14 generation and management fixture boundaries

Baseline: `fc99e08bdcecfb837413a107ba75977e7d25bf07`, imported from the main
integration checkout after preserving the prior child commit in a recovery ref.
This follow-up owns only `generation-session.integration.ts`,
`phase-b-management-session.integration.ts` and this handoff. No application,
runtime, shared fixture, schema, manifest or CI configuration changed.

## Diagnosis and correction

An initial session read now uses an HTTP transaction. Fault injection on every
transaction, or the first transaction, can revoke authority before proof capture
or insert a conflict before planning. Those outcomes do not exercise the claimed
final business guard.

Generation action tests now identify the actual generation batch by its source
guard, after proof admission and planning. They retain the original one-business-
transaction condition, error result, unchanged complete source, active Owner
condition and private-hash exclusion. Additional observations require the real
planning source, the identical source bound into the final SQL guard and an
actual PostgreSQL `22P02` authorization sentinel. Counting a different boundary
alone cannot satisfy the test.

The existing five no-op candidate/admission tests remain, with their original
denial and unchanged-source assertions. Five new tests cover revocation after
planning at the actual no-op SQL guard: Build, Fill, invalid Build, invalid Fill
and already-cleared exclusion. Each first proves the current authorized call is
a genuine no-op/invalid/already-cleared result, then observes late SQL refusal.
These complement the six original current Owner/Manager success cases.

The six session/input lock probes retain their real blockers and wall-clock
expiry checks. They additionally require planning, the generation batch and the
specific blocked session SHARE or generation input table lock. Logout-first
linearization now starts session deletion after admission/planning, just before
the final generation batch; an early admission wait cannot satisfy it. Both
orderings still check actual PostgreSQL blocking and retain all original outcome
conditions, including Clear success and generation's committed-source behavior
when later original-access verification refuses the result.

The six management action revocations now wait for the actual write batch and
require its SQL authorization sentinel. Original no-write, no-success and deleted
session assertions remain.

The two manual-assignment conflict tests had a second fixture defect: missing
Company access setup plus swallowed action errors let an admission failure pass.
They now use the existing fixture Company installer and require the action's
recognized conflict result. Conflict injection occurs only at the first actual
assignment write, after a clean real planning snapshot. The tests require one
write attempt, the real source-conflict SQL sentinel, a second snapshot containing
the separately committed conflict, the correct overlap/approved-time-off issue,
no intended assignment, and preserved publication/notification history. No
production error conversion, mock source result or authority bypass was added.

## Retained local evidence

Directory:
`/Users/josek0514/.codex/release-completion-20261111/r14-generation-management-fixtures/`.

- `generation-boundary-red.json/log`: 12 selected failures, 25 deselected.
  Nine action cases and all three logout-first cases fail the stronger boundary
  or real SQL denial observations with the original hook timing.
- `management-boundary-red.json/log`: all eight cases fail. Six never reach the
  write boundary; two expose the missing fixture adoption previously hidden by
  the broad error swallow.
- `manual-adopted-boundary-red.json/log`: after supplying correct Company setup,
  both manual cases still fail because early injection produces no write attempt;
  six unrelated cases were deselected. This isolates the hook defect from setup.
- `generation-session-full-green.json/log` and `generation-session-results.json`:
  all **37** generation/session tests passed, zero skipped, including five new
  late no-op cases and all existing positive, lock and linearization cases.
- `management-session-full-green.json/log` and `management-session-results.json`:
  all **8** management/session tests passed, zero skipped.
- `final-typecheck.json/log`: full TypeScript passed.
- `final-lint.json/log`: scoped ESLint passed for both owned files.
  `git diff --check` passed before commit.

Both SQL runs created new owned loopback clusters and confirmed shutdown.
The external generation runner copies `scripts/payroll-postgres.mjs` with the
sole namespace selection changed to `nevora_generation_test_`; provenance and
original source hash are in `runner-provenance.txt`. Existing loopback, ownership,
teardown and credential guards remain. Management uses the repository runner and
foundation configuration directly. The environment allowlist excludes application
credentials; no hosted database, provider or customer delivery was used.

## Handoff and release limits

CTO/CISO position: keep real proofs, planning, SQL guards, retries and locks;
repair fault placement rather than production behavior or expected outcomes.
Governance/assurance: the retained RED runs demonstrate earlier false positives;
45 actual SQL passes provide bounded local evidence. No existing assertion,
timeout or release control was relaxed. No Jose exception or decision is needed.

The main integration owner imports this separate commit after fc99, then owns
frozen combined suites, independent review and release qualification. The full
generation cohort, foundation cohort and default suite were not duplicated here.
No further heavy work is planned in this child checkout. No Actions, remote push,
hosted migration, native application, paid service or production action occurred.
