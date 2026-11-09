# Task 3 R1 scoped re-review

Date: 2026-10-29. Reviewed fix commit: `f9850d8cd3023f2d99e4568b1ba2b2c0e4220b5c`, limited to `scripts/phase-e-owned.mjs` and `src/test/phase-e-startup-gate.test.ts`.

**R1: ADDRESSED.**

**Scoped spec verdict: PASS. Scoped code quality/security verdict: PASS.** No material new breakage found within this fix. The prior task-review blocker is closed; this does not certify parent-owned browser/application changes or overall Employee closure.

## Why R1 is addressed

`scripts/phase-e-owned.mjs:154-168` uses Node's builtin `isMainThread` to restrict both the captured-environment restoration and IPC wait to the process main thread. Default and nested Workers can still inherit the parsed preload, but its worker-thread evaluation no longer calls process IPC or overwrites the worker's current `NODE_OPTIONS`. This directly fixes the reviewed mechanism with a small, localized change.

The supervised main thread retains the existing owner-token check, ready/pinned handshake, disconnect rejection and required `process.send` path. There is no broad bypass for missing IPC. The fix does not alter identity proofs, retirement branches, lease creation, cleanup, signal authority, deadlines, or grace periods. A worker thread shares its process PID and receives no new process authority from skipping this repeated preload wait.

## Regression evidence inspected

- `worker-startup-red.log` records the actual default Worker regression failing on the prior gate with `TypeError: process.send is not a function`, supervisor status 1; the existing fork case passes. This confirms the original source-derived concern with executed evidence.
- `src/test/phase-e-startup-gate.test.ts:36-56` creates a real default file Worker and a nested default file Worker with no `execArgv` workaround. It awaits actual messages and exits, checks both workers share the root PID and have `isMainThread: false`, and verifies both retain the runtime `--trace-warnings` value instead of the captured `--no-warnings` value.
- `:59-71` removes IPC from a real spawned main thread and checks status 1, no timeout, no leases, and no user-entry marker. It guards against an overly broad no-IPC skip.
- The original import-order/argv/execArgv/fork/IPC assertions remain unchanged. No assertions are suppressed, no retry loop is added, and existing timeouts are not increased.
- `worker-startup-final.log` records **3/3 passed**. `worker-focused-green.log` records **144/144 passed** across seven files before the final missing-IPC test was added; that additional test is covered by the final startup run.
- `worker-check-status.json` records the exact final startup, nonincremental TypeScript and two-file ESLint commands, each exit 0.
- The follow-up report and `worker-default-suite-status.json` record the full suite exit 0. The report explicitly notes that the missing-IPC case was added during that run and relies on its separate final startup execution. This is not an exact combined-candidate full-suite claim.

The Worker regression uses actual completion conditions rather than timing delays to establish success. Its short explicit local fixture creates no orders, customer data or external services.

## Custody and limits

Read-only comparisons verified the saved fix diff equals `git show --format= --unified=10 f9850d8c`, and both owned files match the committed bytes and hashes in `worker-source-hashes.json`. HEAD was `f9850d8c` and tracked status was clean during inspection.

I did not run tests, create processes for reproduction, modify source, alter Git state, or touch the live browser-validation environment. Only this requested review report was written. Test outcomes above are preserved implementer evidence inspected alongside the code, not independently rerun results.

The earlier documented limits remain: the gate protects entry/import execution, not earlier CommonJS/native preload execution; native Linux behavior and Windows support are not certified by the Darwin evidence. These unchanged limits are outside this R1-only re-review. Parent-owned browser/application work and other later changes are also outside scope.

Engineering/technical-assurance recommendation: accept this R1 repair and proceed with the parent's remaining gates. Security position: no authority expansion found in this fix, and main-thread missing-IPC failure remains enforced. No additional user decision or policy exception is required for this scoped result.
