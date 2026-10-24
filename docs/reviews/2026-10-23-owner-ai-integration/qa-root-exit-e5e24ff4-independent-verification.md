# Independent QA — e5e24ff4 local correction verification

**QA recommendation: GO WITH CONDITIONS for the verified local correction/publication path. Overall release remains NO-GO pending fresh exact-source mandatory validation.**

The independently reviewed early-root-exit status-propagation defect is **VERIFIED CORRECTED locally on `e5e24ff434c0f8c0a6f707dd1f7b85352db9f59c`**. Historical cloud40031137572's exact trigger remains unproven; its failed validation result is not changed.

## Actual execution

After inspecting the completed parent full-default log (9503 passed/801 existing skips), ran the four persisted focused files in the frozen root-exit checkout using repository `safeEnvironment()` and existing dependencies, one worker. Exact invocation:

```text
/usr/local/bin/node node_modules/vitest/vitest.mjs run src/test/phase-e-root-exit.test.ts src/test/phase-e-runner.test.ts src/test/phase-e-root-group-process.test.ts src/test/phase-e-process.test.ts --maxWorkers=1 --reporter=verbose --reporter=json --outputFile.json=/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/root-exit-e5e24ff4-independent/focused-results.json
```

**119 passed,0 failed,0 skipped,4 files; exit0;42.836s wall time.** This is my independent execution, distinct from the earlier parent119 log and14b verification. Per-case JSON and full verbose transcript retained.

Six early-exit controls passed: actual exit23, actual exit0, failed observer, missing actual marker, observer diagnostic stderr and real zombie output with diagnostic stderr. Positive exit23 retains actual nonzero outcome under clean native disappearance evidence; zero/invalid observations remain1, error metadata stays present, no resource leases or fallback process.kill authority are introduced, and fixture PID absence is asserted. The original runner expected23 and owned fixture cleanup assertions passed unchanged apart from diagnostic stderr context. All90 runner,13 process and10 root-group controls also passed, retaining timeout124, owned cleanup, registration refusal and hostile identity/marker cases.

## Source and closure custody

- Exact HEAD unchanged and final Git status empty. All5252 tracked-file SHA256 values identical before/after. No source, tests, index or HEAD edits.
- Execution environment excludes database/provider credentials through the existing allowlist. The runner's SQL/browser dispatch tests use fictional executable boundaries; no actual PostgreSQL, Next, browser, hosted/provider or customer runtime launched.
- Child creation handle closed at22:36:06.699UTC; recorded PID83174 returned native ps status1/empty. Subsequent fixture-path command scan found0. Resource-stopped/final-PID-absence assertions passed within fixtures. Path scanning cannot independently enumerate descendants after argv erasure; it supplements those assertions and handle/PID observations.
- Parent notified CLOSED and build/release-engineering serialization released. No active QA runtime or source custody hold remains.

## Scope and remaining gates

Actual hostDarwin/Node24.19.0. Early-exit positive uses native child exit and native absence/zombie observation with controlled scheduling. Observer failure/stderr modes intentionally inject selected results; other process suites retain explicitly declared Linux-marker/negative-field simulations. This establishes the local correction and rejected observation classes; it does not prove native Linux timing parity or recover missing historical cloud stderr.

The ab89/211d actual Linux Home pass remains attributed to the previous supervisor version. It cannot substitute for fresh e5 mandatory CI. Complete source-bound build and code/security transfer, then a fresh immutable all12 workflow with full artifacts/source/ownership custody is required. Retained COM01/OWN01/AT01 risk dispositions and AT02 scoped acceptance are unchanged. No error exclusion, test weakening, blind retry, hosted/prod acceptance or policy exception is approved.

Evidence: `qa/root-exit-e5e24ff4-independent/` contains run.mjs,focused.log,focused-results.json,receipt.json,source-before.json,source-after.json,closure-scan.json and manualQa matrix. Earlier RED logs/reports preserved. See the separate `reviews/qa-root-exit-e5e24ff4-review.md` for code/fixture reasoning.
