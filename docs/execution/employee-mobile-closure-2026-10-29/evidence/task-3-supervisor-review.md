# Task 3 supervisor review

Review date: 2026-10-29. Exact range: `5ebf7f21c953fdc0cd207e6c332f410912f39b2d..0b422bc56d5556905146ae9efbff46aefbea898c`.

**Spec verdict: NEEDS FIX — the three requested race repairs are supported, but startup compatibility is incomplete.**

**Code quality/security verdict: NEEDS FIX — one Important/P2 compatibility finding; no new signaling-authority escalation found in the reviewed diff.**

**Ready for acceptance: no, pending R1.** This is a bounded local review, not deployment or production certification.

## R1 — Important / P2: inherited worker-thread preloads rerun the root-only IPC gate

Location: `scripts/phase-e-owned.mjs:150-165`, especially the unconditional wait and `process.send` at lines 153-162. Missing coverage: `src/test/phase-e-startup-gate.test.ts:18-31` exercises `fork`, but no `worker_threads.Worker` with default options.

The gate restores the environment string, but that does not remove the gate from Node's already parsed startup options. In the exact reported Node v24.19.0, a plain `new Worker(filename)` passes default environment and undefined `execArgv` into WorkerImpl. The native default path clones the parent's parsed isolate options, including the injected `--import`. The worker then executes the gate again before its entry point. A worker thread cannot use the process IPC channel assumed by `process.send`, so it errors before executing its requested module. Restoring `process.env.NODE_OPTIONS` is sufficient for the tested fresh fork, not this inherited in-process option state.

This is a source-derived finding, not an executed reproduction in this review. The reasoning is supported by the version-matched official implementation:

- [Worker constructor passes null default environment and the supplied execArgv](https://github.com/nodejs/node/blob/v24.19.0/lib/internal/worker.js#L242-L270).
- [Native default Worker options clone the parent's isolate options](https://github.com/nodejs/node/blob/v24.19.0/src/node_worker.cc#L635-L639).
- [Worker process IPC is unavailable](https://github.com/nodejs/node/blob/v24.19.0/lib/internal/main/worker_thread.js#L64-L83), and [file workers invoke the normal entry loader](https://github.com/nodejs/node/blob/v24.19.0/lib/internal/main/worker_thread.js#L199-L206).
- [The entry loader awaits all configured imports before entry](https://github.com/nodejs/node/blob/v24.19.0/lib/internal/modules/run_main.js#L82-L94).

Impact: a supported supervised Node entry that creates a normal file worker now fails despite working before this patch. The existing fake runner tests and fork compatibility test cannot establish this case. I am not claiming the current real PostgreSQL/browser suites use this exact Worker constructor path; their production-shaped execution was not established by this task's fake fixtures.

Required follow-up: scope the handshake to the supervised process's main thread while preserving fail-closed behavior for its missing IPC/root proof. Do not simply skip the gate for every process without IPC. Add a real file-worker regression with default options, checking worker entry completion, normal exit, and original options; retain the existing fork, immediate-entry, and fail-closed tests. Also preserve caller environment in inherited workers rather than overwriting later legitimate worker environment changes with the root's captured options. No broad refactor or application change is needed.

## Spec and authority assessment

- Scope is limited to the five authorized script/test/fixture files. No Owner/Manager or canonical business logic changes appear in this range.
- The changed-member retirement branch (`scripts/phase-e-owned.mjs:226-237`) requires both leader and sampled member to be positively retired before returning. It returns before `leases.set`, does not promote the sampled changed command hash, and retains live-leader identity comparison. Live surviving members and ambiguous retirement remain failures in recorded controls.
- The root retirement check (`:242-245`) skips discovery only after positive absence/zombie evidence. It delegates cleanup to already recorded leases; it grants no new authority. Existing cleanup identity/group anchoring (`:313-375`) is unchanged.
- Identity observer errors/stderr now reject before absence is accepted (`:75-83`). Error and diagnostic controls record `IDENTITY_UNAVAILABLE`, status 1. Existing birth/ancestry/marker/retirement negative cases remain present; no assertions were weakened in this range.
- The handshake installs the child listener before readiness is sent, and the parent's spawn handler pins the root before IPC delivery is handled (`:271-293`). The parent deadline and existing stop/escalation machinery remain unchanged. No ordinary main-thread handshake deadlock is apparent from inspection; R1 concerns inherited worker execution.
- Ungated early exit remains fail closed. The six early-root-exit tests preserve their original assertions and deliberately strip the gate to exercise that path.
- This is an entry/import barrier, not a barrier before CommonJS `--require` preloads or custom loader initialization. The fixture's own observer preload runs before proof. The implementer documents this limitation, and the production caller shown at `:575-577` uses entry/`--import` arguments. Any broader claim that **all** user JavaScript is held until proof would be inaccurate.

## Regression evidence and cleanup

Inspected the brief, implementer report, exact saved diff, commit listing, original race analysis, full affected supervisor section, all five changed files, relevant existing negative tests, source custody, RED/GREEN logs, and baseline/fixed JSON receipts. Applied repository engineering/security/technical-assurance guidance and the Superpowers code review rubric. No subagents were used.

Read-only custody checks established:

- Saved review diff equals `git diff --unified=10 5ebf7f21..0b422bc5` byte for byte.
- All five current owned file hashes match `task-3-supervisor/source-hashes.json` and reviewed commit bytes.
- Preserved baseline runner bytes equal `git show 5ebf7f21:scripts/phase-e-owned.mjs`.
- Checkout was clean and detached at `e4b77b70752eec92bed97a2c5126facd6d4a086c` during inspection; later parent work is outside this review. No checkout/index/branch/source mutation was performed.

The final fixtures control actual boundaries rather than sleep long enough to hope for them: leader/member death is completed between identity reads; root death/reparenting is established synchronously before the real poll callback; first identity read waits for either baseline entry completion or the gated IPC subscription. The final immediate-entry receipts supersede the earlier delay-based RED fixture. Baseline receipts fail all three intended positive cases; fixed receipts produce the expected success or resource-leak failure classification. Negative controls remain failures.

All 16 baseline/fixed receipts inspected report `backupUsed=false` and all recorded resources stopped. The retired-member positive case records no signals; root cleanup records signals to its established group. Native fixture cleanup requires recorded lifetime/group continuity. This supports the exercised cases, not universal absence of unrelated signals under every OS schedule.

Preserved logs show final focused **143/143**, final boundary/compatibility **9/9**, and default suite **10,179 passed, 801 skipped; 650 files passed, 27 skipped**. These are inspected execution artifacts, not independently rerun results. Empty lint/typecheck logs alone do not independently prove exit codes; the implementer report claims exit 0. Optional startup checking failed its missing approved PostgreSQL-runtime precondition and is not a pass.

## Limits and behaviors set aside

- No tests, browser runs, services, process cleanup commands, deployments, pushes, merges, or new branches were executed by this reviewer. Only this requested review report was written.
- Native Linux marker behavior and Windows support are not certified; Darwin receipts model Linux marker retention while using real native process lifetimes/signals.
- Native preloads, CommonJS `--require`, executable aliases, and non-Node programs remain outside the stated entry/import guarantee. Their existing unobservable-root path must stay fail closed. This limitation is documented, not silently treated as full startup protection.
- Parent-owned browser/application changes and overall Employee closure were not evaluated; the task explicitly excludes them.
- Existing supervisor behavior outside this diff is context, not a broad security certification.

CTO/technical assurance recommendation: fix R1 and obtain its deterministic evidence before accepting task 3. CISO position: reviewed retirement handling does not expand signal authority; preserve that property during the narrow startup fix. No policy exception or Jose decision is requested. Parent owns the next gate and final Employee handoff.
