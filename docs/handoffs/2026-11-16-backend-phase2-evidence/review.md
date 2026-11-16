# Final Phase 2 finance code review

Reviewed the exact detached source commit `69da1c5dcee0a5e4af7dac4dc32cf2ba45424137` against `edce7661c211aba588f29bd6d56327fabdc11b47`. The worktree was clean. All 13 changed files are within the recorded Phase 2 scope. This review covers local backend code and interface contracts.

- Code quality status is CLEAR.
- Recommendation is APPROVE.
- Blockers are empty.

## Open findings

- CRITICAL — none.
- HIGH — none.
- MEDIUM — none.
- LOW — none.

## Closed findings and checks

- The guarded receipt recovery in `src/lib/payroll-export/service.ts` now repeats after pre-write projection/refusal. It returns the stored verified payload for the same actor, company, operation and normalized command even if a concurrent caller committed and reopened the card. The write, result verification and final current-company check remain outside the pre-write catch. The independent owned SQL run below passed the interleaving regression.
- The planner now orders serialized cards independently of platform locale and preserves the existing command parser for historical command hashes. Repeated the original reproduction by piping a plan from an en-US process into a sv-SE process with fictional IDs ä and z. The unchanged plan returned INCOMPLETE, periodComplete false, and both people pending.
- The planner enforces the 1,000-treatment limit while grouping by employee. The per-person 1,001 treatment regression and oversized UTF-8 body regression pass.
- Rechecked the Claude handoff and executable fixtures. For a different-operation duplicate, the handoff now explicitly preserves the blocked plan and describes authoritative separate manifest selection using original receipt references. No change to financial import or commerce production paths.
- Consulted the installed `remove-ai-slops` and `programming` skills. Their behavior coverage and locale-sensitive reconstruction concerns are resolved. No outstanding violation found. The new tests exercise bounded wire handling, actual parsers/projection/hashes, persisted receipt identity, or concrete consumer fixture contracts.

## Independently executed at the reviewed SHA

- `git diff --check edce7661c211aba588f29bd6d56327fabdc11b47..HEAD` passed.
- `npm test -- src/lib/payroll/phase2-contract-fixtures.test.ts src/lib/payroll-export src/app/api/payroll-export`: 177 passed across nine files.
- `node scripts/payroll-postgres.mjs vitest.payroll-export-integration.config.mts -t 'concurrently committed identical|30-person'`: two selected tests passed, 19 deselected. Test runtime was a newly initialized loopback cluster, stopped afterward. The 30-person, 600-break test verified lost-response replay, partial vs complete receipt coverage, stale-source behavior and all-roster manifest custody.
- Compared the baseline parser to its extraction, inspected the model, error mapping, route behavior, period-close authority and read the final diff and handoff. Prior red SQL and locale/limit counterexamples were inspected. The wider import/commerce suites, production-format build and hosted/UI/provider acceptance were outside the independent run.

The initial independent PostgreSQL attempt used an incomplete historical runtime and failed at initdb. It produced no test result. The successful independent run used the specified complete PostgreSQL distribution.

---

## Historical initial review (superseded)

Initial snapshot. Detached worktree based on edce7661c211aba588f29bd6d56327fabdc11b47. Review covers the uncommitted finance diff, planner, command extraction and targeted tests. The handoff and fixture pack were still being edited. No ULW plan exists.

- Code quality status is BLOCK.
- Recommendation is REQUEST_CHANGES.
- Blocker is loss of immutable-operation recovery on concurrent reopen.

## CRITICAL

None found.

## HIGH

At src/lib/payroll-export/service.ts:61 the guarded receipt lookup completes before a separate timecard read. An identical in-flight request can commit its receipt and the card can be reopened in that interval. The second call then raises FINALIZED_TIMECARDS_REQUIRED at :64 despite the exact receipt already existing. The new public 400 can be interpreted as a definite refusal. Reconcile an identical receipt before reporting that determination. Add a regression with the write and reopen interleaved immediately following the empty receipt read.

## MEDIUM

- At src/lib/payroll-export/batches.ts:64 the wire command takes the runtime locale's employee ordering from command.ts:13. The replan comparison at batches.ts:88 requires it to match byte for byte. Reproduced with an en-US saved plan for fictional employees ä and z and a sv-SE process reading the stored plan. Progress with zero replies threw INVALID_BATCH_PLAN. Retain stable locale-independent wire order while preserving historical server parsing.
- At src/lib/payroll-export/batches.ts:56 an aggregate treatment-length guard mislabels an oversized single employee as POPULATION_COVERAGE_REQUIRED. The existing test at batches.test.ts:42 exercises only the card cap. Exercise 1,001 treatments for one covered employee and return the documented employee-size reason.

## LOW

None recorded.

## Review methods and limits

Read the repository and handoff, existing server authority, exact command extraction diff, paid-time projection, HTTP handling and manifest checks. Independently ran npm test for payroll-export/batches.test.ts, payroll-export/service.test.ts and api/payroll-export/route.test.ts. Three files and 55 tests passed. No hosted or independent QA certification. Consulted the installed programming and remove-ai-slops skills. The missing treatment-cap coverage and duplicated locale-sensitive reconstruction affect their behavior-coverage and validation criteria. The route UTF-8 boundary tests exercise the actual transport logic. No deletion-only tests were found.
