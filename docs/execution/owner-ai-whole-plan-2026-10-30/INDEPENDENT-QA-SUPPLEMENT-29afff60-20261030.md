# Independent final QA supplement — 29afff60 — 2026-10-30

This immutable supplement reconciles later gates and independently closes the supplemental management-SQL acceptance condition. It does not replace or rewrite `INDEPENDENT-REVIEW-f2a0aac4-20261030.md`, `SQL-OBSERVATION-01.md`, their evidence, or the original failures. **UI-M1 remains OPEN and nonblocking for bounded local use.** There is no new UI certification or product-source rereview in this supplement.

Final test candidate: `29afff60ed3b0673d0ca3236ebf31bbd108ffa78`, tree `5f9e08596db0273bbbc1c344c9a36965df06154e`. Business/Owner/UI checkpoint remains `f2a0aac46ad41cbc1a5aab3dfd48f7f805dd94ef`, tree `093f990ef9a2340dd6577c37f871f22a5e92b2ad`. Base remains `da1dab3e8e2f9de8f2b86c1d7b897dd692de465a`.

## Independent decision

**QA recommendation: GO for the bounded LOCAL increment at the final test candidate.** The broad-gate condition in the original review is now CLOSED by this independent reviewer. The correction addresses a reproduced test-harness timing/cleanup defect; the complete corrected regression gate and an independently executed stronger startup-latency probe pass. This does not convert original failed runs into passes or establish hosted/production readiness.

**Code recommendation: GO for the reviewed bounded implementation, unchanged.** The two-file test correction is also acceptable by independent diff review; no Critical/Important finding was identified in that correction.

**UI recommendation: GO WITH CONDITIONS, unchanged.** UI-M1 (observation formatted in the browser zone beside the workspace-zone label) is still OPEN. No remediation was made or independently certified. Preserve the precise issue in delivery and do not claim observation-zone clarity.

## Exact source scope and evidence reuse

I independently ran the source comparison: `git diff --exit-code f2a0aac4 29afff60 -- . ':!src/test/integration/generation-provenance.integration.ts' ':!src/test/integration/schedule-generation.integration.ts'` returned0. The only changes are those two integration-test files,30 insertions/11 deletions. Their existing test/SQL deadlines, real lock assertions and business-result assertions remain. No business writer, Owner service, planner, parser, UI, package or configuration changed.

Those two `.integration.ts` files are absent from the successful default unit result inventory; they are run by the dedicated generation integration configuration. Therefore I accept the completed f2 application/default-unit/Owner/browser/pilot evidence for the byte-identical code at29, without requiring another expensive identical default suite. This is an evidence-applicability judgment based on the inspected diff and result inventory, not an invented test pass at a different SHA. Whole TypeScript/ESLint were rerun at29 after the test changes. Later documentation-only delivery commits must retain these exact application/test bytes.

## Failed gate and causal evidence

The original extra management generation gate at f2 failed:107 passed,20 failed,49 skipped,4 failed files and1 unhandled rejection. The retained first independent SQL memo decomposes these correctly: a provenance profile/writer-first15-second timeout, a subsequent fixture backend-closure failure and17 repeated pool-end failures; a separate readiness-insert/writer-first missing-lock-barrier failure;49 unexecuted cases because their fixture refused to reuse the leftover owned database.

Both original first-cause cases passed on the clean base and on a matched focused candidate run (2passed/174filtered skips each). These focused passes alone were insufficient to close the condition. They showed the failure was not deterministically candidate-only under that comparison; they did not prove its initiating CPU cause.

The controlled sequence supplies stronger evidence:

1. `f2a0aac4/controlled-writer-red`: the original harness with only200ms ordinary writer-start delay and absolute imports reproduces the15-second timeout, backend-close failure and unhandled conflict. Original assertions, case and SQL deadlines remain.
2. `harness-investigation/cleanup-only`: pre-registering the writer drain before asynchronous launch removes the cleanup hang/cascade; the test now fails promptly at the actual missing-lock-barrier assertion (case701ms; run1.87s). This intermediate failed evidence is preserved.
3. `harness-investigation/permanent-red`: the permanent200ms regression, with cleanup corrected but the old100 rapid SELECT polls, still fails at the actual barrier assertion (run2.33s).
4. `harness-investigation/permanent-green`: a bounded yielding wait for the actual `pg_blocking_pids` condition passes the permanent200ms case (run2.18s). The15-second case and5-second SQL deadlines are unchanged. Polling now uses an explicit2-second bound and5ms yields instead of treating100 rapid polls as elapsed-time allowance.

Independent source review confirms the failure mechanism: dynamically appending a writer-drain cleanup from an awaited query callback could place it before its barrier release during reverse cleanup. Pre-registering the drain removes that asynchronous registration hazard. A matching trap in the other generation test fixture is corrected too. One permanent delayed-start case is added; all176 original cases remain, bringing the suite to177. No lock assertion is replaced with a sleep or bypassed. This sequence supports a test-harness diagnosis; it does not prove CPU contention was the sole initiating cause of the original full run or certify every future failure path.

## Independent reproduction and closure evidence

I executed a separate owned350ms writer-start probe against frozen29, after the parent's complete generation runtime closed. The external probe pins the exact final test source hash and changes only absolute imports and the permanent200ms case to350ms. It retains the actual `pg_blocking_pids` and exclusion/business-result assertions,15-second test deadline and5-second statement deadline. This exercises a longer startup delay than the permanent regression.

Result: **PASS**,887ms case /1.97s run;1 executed case passed,34 deliberately name-filtered cases skipped; no failed assertion, unhandled rejection or cleanup failure. The owned loopback PostgreSQL cluster stopped. Independent probe files, exact command, source/tree provenance, original/probe SHA-256 hashes, runner and results are in `independent-f2a0aac4/harness-29afff60-350ms/`. No application source, index, HEAD or refs were modified by the reviewer. This independent result plus the full corrected177-case gate is sufficient to close this local SQL condition.

## Final gate reconciliation

All paths below are relative to `/workspace/nevora-evidence/owner-ai-whole-plan-20261030`. Counts were checked in result JSON and/or actual logs; implementation-executed gates are distinguished from independent executions.

| Gate | Inspected outcome and exact source | Evidence |
| --- | --- | --- |
| Required full default suite | f2:10331 passed,801 skipped,55 pending assertion records,0 failed;670 passed files/27 skipped;398.92s. JSON success=true. Pending55 is distinct from the skipped801 and is not misreported as zero. | `f2a0aac4/all-unit-final-01/{result.json,run.log}` |
| Owner SQL | f2:51/51 passed,8 files,48.78s; owned cluster stopped. | `f2a0aac4/sql-final-01/{result.json,run.log}` |
| All three real Owner browser cases | f2:legacy, notebook and joint day-plan cases passed;245.40s total; original individual240-second deadlines. Source/closure evidence retained. | `f2a0aac4/browser-final-01/` |
| Existing activation/pilot guards | f2:18 passed,0 failed/skipped; loopback/sentinel evidence, no paid provider. | `f2a0aac4/pilot-final-01/run.log` |
| Complete management generation SQL |29:177/177 passed,4files,0 skipped/failed/unhandled;108.21s; owned cluster stopped. | `harness-fixed/generation-sql-final-02/{candidate.json,result.json,run.log}` |
| Whole TypeScript and ESLint |29:both completed exit0, as confirmed by execution owner; inspected logs contain no diagnostics. These follow the test correction. | `29afff60/{types-final-01,lint-final-01}/run.log` |
| Whitespace and source equivalence |29:exit0; business/default-unit inputs identical to f2 outside exactly the two dedicated integration tests. Equivalence independently rerun. | `29afff60/source-custody/` |
| Independent original application checks | f2:2 boundary cases passed; actual browser/SQL flow passed14 checks and six320/390/1440 audits; source/mirror closure verified. Original report retains console and environment limitations. | `independent-f2a0aac4/{boundary-results.json,browser-results-01.json,browser-01/}` |
| Independent corrected-harness check |29:350ms delayed writer passes actual locking/business assertions and cleanup;1 executed/34 intentionally filtered. | `independent-f2a0aac4/harness-29afff60-350ms/` |

## Retained limits and unresolved items

The original report's declined judgments remain in force: live-model reasoning/injection robustness, provider retention/cost, hosted/Neon transport and production load/parity, strict universal latency or optimality, exhaustive scheduling combinations, real assistive technology/devices, all timezones/locales/DST, business execution/publication/notifications/financial outcomes and exhaustive inherited-system recertification were not established. The skipped801 and pending55 default assertions remain explicitly unverified; this review does not waive them for broader release scope.

UI-M1 remains unremediated and reviewer-owned. The independent browser environment still uses the declared local development DB transport/type-reference substitutions and command-local host-library validation workaround; real Chromium/WebKit did run, but this is not hosted/device proof. The original full SQL failure, baseline comparison, focused rerun, controlled original RED, cleanup-only RED, permanent RED/GREEN, successful full gate and independent probe must all remain recoverable.

No production/hosted GO, deployment, push/merge, paid inference, real notification, policy exception or risk acceptance is granted or inferred. The only newly closed condition is the supplemental LOCAL management-SQL acceptance condition at the exact corrected test candidate.
