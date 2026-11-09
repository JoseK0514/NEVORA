# Task 3 — deterministic process-supervisor exit boundaries

Status: implementation and required local verification complete. Independent review remains the parent's next gate. No production, remote, database, customer-data, package-install, or branch changes were performed.

## Scope and custody

- Base: `5ebf7f21c953fdc0cd207e6c332f410912f39b2d`, detached worktree `work/employee-mobile-closure-20261029`.
- Environment: Darwin arm64, Node v24.19.0, existing symlinked dependencies, Vitest 5.0.5.
- Owned changes: `scripts/phase-e-owned.mjs`, `src/test/phase-e-root-exit.test.ts`, new `src/test/phase-e-supervisor-boundary.test.ts`, `src/test/phase-e-startup-gate.test.ts`, and `src/test/fixtures/phase-e-supervisor-boundary.mjs`.
- Parent's application/integration/diagnostic changes were neither modified nor staged by this task.
- Evidence: `.superpowers/sdd/PLAN/task-3-supervisor/`. `source-hashes.json` identifies final owned bytes. `baseline/scripts/phase-e-owned.mjs` and its sole top-level helper are exact `git show BASE:path` copies, allowing the final native boundary fixture to execute against the original source without modifying the checkout.
- Commit: `0b422bc56d5556905146ae9efbff46aefbea898c` (only the five owned files; detached HEAD, no publishing). `owned-commit.diff` preserves the final committed patch.

## Causal proof and fix

1. **Changed member / retired leader:** the fixture first proves an owned detached group and unchanged member, then retitles the member. It reads the real changed member identity and environment, kills only that fixture group before the leader re-proof, and confirms actual absence/zombie state. BASE returns `LEADER_UNPROVEN`, status 1. Fixed code discards the stale sample only after positively observing both leader and sampled member retired; status 0, no signals and no lease promotion. The test checks the retained member command hash is the original one. A surviving member or ambiguous retirement still fails closed.
2. **Root exit before exit event:** after an observed root-group member exists, the fixture stops the root immediately before the next real 250ms poll callback. It synchronously proves the root is retired and the member reparented while `child.exitCode` is still null and the Node exit callback has not run. BASE returns `MEMBER_CONTINUITY_CHANGED`. Fixed code skips further snapshot discovery only on positive root retirement; existing exit cleanup then returns `Owned child left runtime resources running`, status 1, and stops the anchored group, including SIGKILL for its SIGTERM-ignoring member. No lease/signaling authority is added.
3. **Immediate entry before initial pin:** a fixture-only native preloader records the first IPC message subscription. Before allowing the first identity read, the driver synchronously waits for either real user-entry completion (BASE) or the startup IPC wait (fixed). There is no arbitrary delay in the final fixture. BASE's exited root is positively observed before its initial proof and returns `LEADER_UNPROVEN` / `initialRootExit=zombie`, status 1. Fixed Node startup waits for a root-pinned handshake before imports/entry execute, and returns status 0 after the immediate clean child exit.

The initial six-case regression run is preserved in `boundary-red.log`: exactly the three intended positives failed, with three negative controls passing. `baseline-*.json` and `fixed-*.json` preserve causal receipts from the final fixture against exact BASE and fixed source. The earlier log used a controlled 200ms startup delay; the final fixture and receipts replace that timing assumption with the native startup condition described above.

## Fail-closed controls

- Fresh PID/birth/group/parent/ancestry/command checks remain in place. A live changed leader, member birth/ancestry changes, marker loss, unproven registration and live unproven members remain failures.
- Retired samples return before `leases.set`, retain old command hashes, and never supply independent PID or registration authority.
- Retirement checks with errors, stderr diagnostics or uncertain state do not authorize retirement. Existing environment-error, EACCES, EIO, malformed-retirement and root-with-live-member regressions remain intact.
- New single-boundary identity-error and identity-stderr controls exposed that the prior identity reader treated an errored empty result as absence. `observer-red.log` preserves the two failures after the first retirement fix. `processIdentity` now rejects errors/diagnostics before accepting clean absence. Final controls return `IDENTITY_UNAVAILABLE` and status 1.
- The existing six early-root-exit tests retain all prior status, failure-reason, exit, resource and signal assertions. Their spawn interception now explicitly removes the startup gate to continue exercising an unobservable root, including exit 0 that may have left unobserved descendants. The supervisor still does not turn such an exit 0 into success.
- Test fallback cleanup requires independently recorded fixture lifetime/group continuity. All boundary receipts have `backupUsed=false`; production cleanup, not backup test cleanup, completed.

## Startup architecture and compatibility

The gate applies only when `command === process.execPath`, matching the production callers. A data-URL `--import` is prepended through `NODE_OPTIONS`; no extra executable, temporary production script, argument rewriting, global signal permissions or resource lease is introduced. The gate restores the exact original `NODE_OPTIONS` (or deletes it if originally absent), registers its wait, sends `owned-root-ready`, and proceeds only on the existing parent's IPC channel after the identity pin. Listeners are removed on release; IPC stays available for process registration. Startup remains bounded by the existing supervisor deadline and grace, unchanged.

`phase-e-startup-gate.test.ts` executes real environment and command-line imports, a real entry module, and a real forked child. It verifies import order, exact entry arguments and `execArgv`, original Node options, IPC availability/message delivery, and that the fork exits without inheriting a stuck gate. Existing production runner tests also pass.

Official Node documentation confirms `NODE_OPTIONS` imports precede command-line imports and that `--require` preloads precede `--import`: https://nodejs.org/docs/latest-v24.x/api/cli.html#--importmodule . Consequently, this is an entry/import startup barrier, not a security sandbox for arbitrary native startup or CommonJS preloads. Current production arguments use Node entry modules and `--import`, not application `--require` preloads. Arbitrary executable aliases, non-Node executables, native initialization, or a deliberately early exiting `--require` remain on the existing fail-closed initial-observation path. They are not silently accepted. Windows behavior is not certified; existing POSIX process-group requirements remain.

## Actual validation

- Initial focused run: 142/142 tests passed across the six supervisor/process/retirement/root-exit/root-group/runner files (`focused.log`).
- Final focused run: 143/143 tests passed across seven files, including startup compatibility and all eight boundary controls (`focused-final.log`, 22.53s).
- Final boundary/compatibility assertions: 9/9 passed (`boundary-green-final.log`, final condition-controlled fixture and explicit `NODE_ENV` included, 4.73s).
- Default `npm test`: 649 files passed, 27 skipped; 10,177 tests passed, 801 skipped, zero failures; 91.79s (`default-suite.log`). Final rerun after fixture-only tightening: 650 files passed, 27 skipped; 10,179 tests passed, 801 skipped, zero failures; 104.75s (`default-suite-final.log`). The extra file/two tests came from concurrent parent work. Default-suite runs are on the shared worktree, not a claim that the parent's final integration source was frozen.
- Nonincremental `node node_modules/typescript/bin/tsc --noEmit --incremental false`: exit 0, no output (`typecheck.log`). The parent caught a missing `NODE_ENV` field in the new test's typed environment; it was corrected before this check and commit.
- Targeted ESLint on all five owned script/test files: exit 0, no output (`lint.log`). `git diff --check`: exit 0.
- Optional `node --test scripts/phase-e-owned-startup.check.mjs`: failed its first runtime-selection precondition, `Select the existing approved local PostgreSQL runtime`, because `NEVORA_TEST_PG_BIN` was absent (`runner-startup.log`). No runtime was started or selected afterward: this delegated task is restricted to fake local fixtures. This optional real-PG test is not claimed passed and is not part of the required default suite or focused runner tests.

Darwin tests exercise native process creation, identity, exit, reparenting, IPC, signal delivery and cleanup. For Linux-specific retained environment-marker cases, `/proc` marker reads are modeled only for the actual fixture-created live PIDs, as in the existing repository fixtures. Native Linux execution remains a CI/reviewer verification item; no native Linux result is claimed.

## Director positions, controls and handoff

- CTO: targeted boundary handling and a startup barrier address the demonstrated races; existing deadlines and cleanup authority remain unchanged. Owner: task-3 supervisor worker; parent owns integration and final handoff.
- CISO: fail-closed live-identity and uncertain-observation controls are retained and expanded. No new signaling authority or customer environment access. No requested policy exception.
- Technical assurance: causal native process receipts establish each interleaving independently of CPU load. Compatibility is exercised with actual imports/fork/IPC, not source-string checks. The barrier's `--require`/platform scope is explicit.
- Governance: GO WITH CONDITIONS for independent review; release impact CONDITION. Local tests are not hosted or production acceptance. No Jose approval is needed for this bounded local patch; independent review and the parent's overall Employee closure gates remain open.
- Next: parent dispatches task reviewer, reviews final owned diff/receipts and whole-suite output, then includes this result in the Claude handoff. No publish, deployment or main merge occurred.

## R1 follow-up — default Worker compatibility (2026-10-29)

Review input: `.superpowers/sdd/PLAN/task-3-supervisor-review.md`, Important/P2 R1. The review correctly identified that restoring the `NODE_OPTIONS` environment does not remove Node's already parsed startup imports inherited by default file Workers.

Reproduction: added an actual default `new Worker(filename)` and a nested default Worker, without `execArgv` overrides. On the prior supervisor, `worker-startup-red.log` records one failing Worker regression and the existing fork regression passing. The worker errors before entry with `TypeError: process.send is not a function`; the supervised root exits 1. This is now executed evidence on Node v24.19.0, not merely the review's source-derived hypothesis.

Fix: commit `f9850d8cd3023f2d99e4568b1ba2b2c0e4220b5c` changes only `scripts/phase-e-owned.mjs` and `src/test/phase-e-startup-gate.test.ts`. The generated gate imports Node's builtin `isMainThread` and places both its environment restoration and IPC wait inside that condition. Worker threads share the process PID; they do not receive another lease or process authority. For the supervised main thread, the existing pin, ownership token, readiness handshake, disconnect failure, deadline and cleanup paths are unchanged. There is no general `!process.send` bypass.

Compatibility/negative controls:

- Default file Worker and its default nested Worker both complete their entry modules, send real `parentPort` messages and exit 0 in the root's PID.
- The root changes `NODE_OPTIONS` from the captured `--no-warnings` to `--trace-warnings` before Worker construction. Both workers retain `--trace-warnings`, proving the inherited gate does not reset their environment to the root's original captured options.
- The existing fresh-process fork/import-order/argument/IPC test remains passing.
- A new real-process negative test removes supervisor IPC from the spawned main thread. It exits 1 before user entry, without timing out or creating resource leases. This guards against replacing the thread-specific condition with a broad no-IPC escape.
- Immediate-entry, retirement, live-member, observer diagnostic and root-exit controls remain intact.

Validation:

- Seven-file focused process/startup/boundary/retirement/root/runner suite: **144/144 passed** in 26.17s (`worker-focused-green.log`).
- After adding the additional missing-IPC control, startup file: **3/3 passed** (`worker-startup-final.log`). Other focused tests were unchanged.
- Nonincremental TypeScript: **exit 0** (`worker-typecheck-final.log`). An earlier run caught transient parent-owned duplicate `homeRoots` / implicit-any errors in `employee-mobile-phase1.integration.ts`; these were reported to the parent, were not edited by this task, and were absent in the final check (`worker-typecheck.log` preserves that intermediate failure).
- Owned-file ESLint: **exit 0** (`worker-lint-final.log`). `git diff --check`: exit 0.
- `worker-check-status.json` records exact commands and exit codes for the final startup, TypeScript and lint runs; `worker-source-hashes.json` and `worker-commit.diff` preserve the R1 candidate.
- The full default run had already begun before the parent advised freezing source: **650 files passed, 27 skipped; 10,180 tests passed, 801 skipped; exit 0**, 106.43s (`worker-default-suite.log`, `worker-default-suite-status.json`). It ran the Worker fix and default/nested Worker regression; the missing-IPC control was added during that run and is separately covered by the final three-test startup run. This does not replace the parent's exact combined-candidate check.

R1 implementation is ready for scoped re-review. No new signaling authority, deadline changes, policy exceptions, production operations or parent-file edits. The previously documented entry/import versus CommonJS-preload guarantee and native Linux certification limits remain unchanged. Parent owns re-review and final combined Employee verification.
