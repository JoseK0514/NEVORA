# Independent QA — 14b bounded verification

**QA recommendation: GO WITH CONDITIONS for diagnostic publication. Release readiness remains NO-GO pending fresh required cloud validation and independent dispositions.**

Executed independently on clean `14b46c7e2f39621b5cba2af3534eb2d155ec289e` in the supervision worktree, using existing approved local dependencies and repository `safeEnvironment()` allowlist. Parent default suite was confirmed closed from its retained log before execution (9497 passed/801 existing skips); parent build was serialized away from these timing controls.

## VERIFIED

- `/usr/local/bin/node --test scripts/browser-response-deadline.check.mjs`: **23 passed, 0 failed, 0 skipped**, exit0. Includes all five new preview contracts and retained deadline, body-completion, failure/privacy and cleanup controls.
- `/usr/local/bin/node node_modules/vitest/vitest.mjs run src/test/phase-e-root-group-process.test.ts src/test/phase-e-process.test.ts --maxWorkers=1 --reporter=verbose --reporter=json --outputFile.json=<evidence>/process-results.json`: **23 passed, 0 failed, 0 skipped, 2 files**, exit0, 24.148s wall time. Exact absolute invocation retained in receipt.json.
- Actual local FIFO-controlled shell→Node exec retains PID/birth/group/parent continuity and permits clean generic descendant exit. Registered-resource exec and registration promotion stay rejected. Root exit/forced timeout, changed root, lost markers, recycled identity and reparenting controls passed. Existing unrelated-process rejection, graceful/forced/title-changing worker cleanup and retained-member controls passed. Every individual outcome is in process-results.json/manualQa.json.
- All **5242 tracked file hashes** match before/after; HEAD unchanged and final Git status empty. No source, test, index or HEAD edits. No browser, Next application, PostgreSQL, provider or hosted runtime launched.
- Both runner creation handles closed, recorded PIDs56652/56654 returned ps status1/empty. Subsequent fixture-path command scan found0 matching processes. Resource stopped assertions passed inside the real process fixtures. CLOSED at `2026-10-23T22:00:33.157Z`; parent notified that build may proceed.

## Limits / disposition

Actual host was Darwin, Node24.19.0. Tests simulate Linux `/proc/environ` marker retention for live fixture-owned PIDs; negative marker/birth/ancestry cases deliberately alter the selected observation. Actual local process execution, ps, groups and cleanup occur, but these results do not certify native Linux `/proc` behavior or the actual Home application process topology. The post-run path scan cannot identify a process after argv erasure; it supplements the passing stopped assertions and runner handle/PID observations, not an exhaustive independent descendant census.

The earlier publication review's local bounded verification recommendation is now satisfied on exact14b. This does not close QA-COM01/QA-OWN01 historical failures or classify away native/TypeError/window events. Original failed probes/reports remain unchanged. QA-AT01 risk and QA-AT02 scoped acceptance remain unchanged. Diagnostic2s body deadlines and sequential failure screenshots retain their previously documented limits.

Next gate is immutable candidate validation: source-bound build/security disposition and all12 fresh mandatory cloud jobs, with actual Linux Home, full Owner and full Comms assertions, source/artifact/ownership closure audit. No further local broad rerun is warranted solely because these checks passed. No hosted/production/policy-exception approval follows.

Evidence directory: `qa/development-14b46c7e-independent-checks/` contains runner, full logs, per-case JSON, before/after hashes, receipt, closure scan and manualQa matrix. All PASS entries reference non-empty artifacts.
