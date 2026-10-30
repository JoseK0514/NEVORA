# Independent QA supplemental SQL observation — 2026-10-30, record 01

This is an immutable intermediate observation, not closure. The original INDEPENDENT-REVIEW-f2a0aac4-20261030.md remains unchanged. No new application defect severity is assigned from this evidence alone. UI-M1 remains OPEN.

Examined candidate f2a0aac4 generation-sql-final-01/run.log and result.json:107 passing,20 failed,49 skipped assertions across4 failed files, plus1 unhandled rejection. This extra management generation gate did not pass and cannot be represented as complete regression acceptance.

Failure decomposition from actual assertion messages:

- schedule-generation.integration.ts: readiness-insert / writer-first failed because100 attempts did not observe an actual pg_blocking_pids barrier. The other92 assertions passed.
- generation-provenance.integration.ts: profile / writer-first first timed out after15seconds; the next test failed in beforeEach while disposing the previous fixture (backend closure timeout). The remaining17 failed assertions encounter repeated pool.end during beforeEach, rather than demonstrate17 independent business failures. The first15 assertions passed.
- generation-session and generation-cross-layer: all49 assertions skipped because the prior owned database remained and the next fixture correctly refused to reuse it. Their absence is still missing evidence.
- The unhandled rejection is the typed GenerationConflictError from withGenerationRetry. Its origin needs diagnosis; it is not silently discarded.

Source comparison confirms the two test files, employee/profile writer, generation-exclusions implementation, local-postgres fixture and owned-test-resources helper are unchanged between base and candidate. That fact alone does not prove the failure is pre-existing: dependencies and timing changed, so matched comparison is necessary.

Source-supported cleanup hypothesis: generation-provenance.integration.ts:195 dynamically registers defer(()=>writing) from the awaited snapshot query, after line200 registered defer(()=>writer.release()). The helper drains in reverse order at owned-test-resources.ts:13. If the100 rapid blocking polls finish before the operation reaches its lock, cleanup can encounter the still-held writing promise before releasing its barrier. The timed-out test may leave clients alive; local-postgres.ts:96 ends the pool, then line101 can throw before setting disposed=true at line108, so subsequent dispose calls repeat pool.end. This explains a plausible cascade but is not claimed as the demonstrated initiating cause. No timeout or assertion was changed, and no source was edited.

Examined parent baseline-da1dab3e/generation-focused-01/result.json and run.log: both first-cause tests PASS (2pass174skipped), in4.65seconds overall, with cluster stopped. Baseline viability is established; a baseline pass does not establish candidate innocence or pre-existing failure. Required next evidence: matched focused candidate observation, then complete isolated candidate generation suite after competing full-unit load ends. Preserve the original failed run regardless of later outcome. If candidate-only failure persists, investigate the changed planner/snapshot path before accepting the gate; if serial candidate passes, classify the failure as intermittent with the demonstrated limits, not as universally proved CPU contention.

At this observation the full required unit suite is still running. QA LOCAL recommendation remains GO WITH CONDITIONS, with the broad-regression condition unresolved. This memo neither closes a finding nor grants production readiness. No heavy suite was rerun by the independent reviewer.
