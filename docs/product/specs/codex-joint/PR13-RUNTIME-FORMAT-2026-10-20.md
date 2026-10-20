# PR13 bounded runtime error format recovery

Status: implemented and locally validated at executable/test commit `6cff3a90573b9a43339b2a1694a69998774f9c65`, branch `codex/verify-preview-33`. Fresh scoped review, candidate build/push and hosted70 remain controller gates. The historical Linux WebKit application failure cause remains unknown. No production action or authorization is implied.

## Scope and observed evidence

The previous observer read canonical text only from `error.message`. A fictional local static probe at base `74041e8a50f9c045578d979064ad22c28fdeb0a2` captured36 actual Chromium/WebKit events across Error/string throw, `reportError`, and Promise rejection. It confirmed two supported transport formats that lost diagnostic detail:

- Both engines split bare React error strings at the first colon, placing `Minified React error #418; visit https` in `name`. Chromium also does this for string rejection. The message holds the remaining URL suffix. Installed Playwright1.62.1 `coreBundle.js:9758` implements that split; Chromium's `exceptionToError` and WebKit's javascript console handler call it.
- WebKit Error rejection uses the exact name `Unhandled Promise Rejection` and a message beginning with one `Error: `, followed by the original message.

This was controlled format reproduction, not reproduction of the hosted application's failure. The current archived push Communications reports each retain two primary/page0/scenario events with Unknown/null diagnostics, `/app`, full-review, WebKit375. Those fields do not identify their original message, native name or producer.

Only the runtime observer, its existing focused tests, and this document changed. No application, workflow/matrix, migration, scenario actions, timeout, retry, authorization, error-count or acceptance assertion changed. No new dependencies or metadata fields were added.

## Bounded behavior and privacy

The observer recovers a React code only from an exact split name `Minified React error #N; visit https` (N1–999, no leading zeros). A whole-string equality check additionally rejects the trailing newline that JavaScript's regex end anchor can otherwise accept. It unwraps exactly one `Error: ` only for the exact observed WebKit rejection name. The same anchored React prefix and exact ResizeObserver messages then apply.

The only added literal is exactly `Connection closed.` including its period, explicitly authorized in task3. Installed Next16.3.8 confirms it in `node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js:4800`: `reportGlobalError(weakResponse, Error("Connection closed."))`. SHA256: `14b283240e81eaa7150d68debc801d3c069e53a57178ec6972a45ce1c59db793`. This is a known literal observation, not evidence that the hosted failure came from Next RSC.

Split/wrapped names remain `nativeName:Unknown`. Names can be spoofed; canonical diagnostics never authenticate origin or classify harmlessness. Arbitrary suffixes, URLs, arguments, stacks and private text are not serialized or hashed. Unsupported names, nested/non-Error wrappers, malformed codes, suffixed exact literals and throwing/hostile properties remain bounded unknowns. Every pageerror remains fatal, including recognized messages, both primary/manager contexts and teardown. Success-path behavior is unchanged because these computations run only inside the existing pageerror handler.

## Evidence packet and exact verification

`E` = `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr13-runtime-format`.
`SHA` = `6cff3a90573b9a43339b2a1694a69998774f9c65`.
Commands ran from `/Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler`.

The final passing aggregate is **`E/final/local-summary.json`**. It links the actual passing type/lint receipts and standalone default full-unit receipt, with checkpoint/sourceClean/sourceUnchanged and parsed counts. Its `priorAttempts` retains the original failed unit run; **`E/final/gates/local-summary.json` is the initial mixed-result run**, not the terminal passing aggregate.

| Scenario | Invocation | Binary result and artifact |
| --- | --- | --- |
| Pre-change real formats | `node E/format-probe.mjs` | Exit0;36 events, all fatal; `E/format-probe-report.json`, `E/probe.log` |
| Regression RED | `node E/run-regression.mjs red` invoking `npm test -- src/test/phase-e-browser-runtime.test.ts` | Exit1;10 expected missing-diagnostic failures,80 passes; `E/red.log` and hashed receipt |
| Regression GREEN | `node E/run-regression.mjs green` using same npm command | Exit0;90 passes; `E/green.log` and receipt |
| Final focused | `node E/../pr13-runtime-diagnostics/run-check.mjs SHA E/final focused npm test -- src/test/phase-e-browser-runtime.test.ts` | Exit0;90 passes; `E/final/focused.log` and source/hash receipt |
| Real final browser events | `node E/final/observer-probe.mjs SHA` | Exit0;120 fatal events,60 read-back safe reports; `E/final/observer-probe-report.json`, `probe.log`, per-engine/mode/fixture JSON reports |
| Initial full gates | `node E/../final-gates/run-local-gates.mjs '<worktree>' SHA E/final/gates` | Types0,lint0,unit1; original logs/receipts retained |
| Timeout investigation | `node E/../pr13-runtime-diagnostics/run-check.mjs SHA E/final timeout-investigation npm test -- src/lib/tenancy/migrations/backfill.test.ts src/lib/tenancy/migrations/typed-guarded-backfill.server.test.ts` | Exit0;134 passes; `E/final/timeout-investigation.log` and receipt |
| Default full units alone | `node E/../pr13-runtime-diagnostics/run-check.mjs SHA E/final unit-rerun npm test` | Exit0;7541 passes,801 skips;452 files pass,27 skip; `E/final/unit-rerun.log` and receipt |
| Release contracts | `node E/../pr13-runtime-diagnostics/run-check.mjs SHA E/final release npm run test:release-engineering` | Exit0;62 passes,0 failures/skips; `E/final/release.log` and receipt |
| Terminal gate aggregation | `node E/final/assemble-final-gates.mjs` | Source clean/unchanged, receipt hashes verified; `E/final/local-summary.json`, `unit-final-receipt.json` |
| Source/resource/artifact custody | `node E/final/audit-evidence.mjs` after documentation commit | Verifies frozen tracked hashes, only documentation delta, every report/log receipt, Next source hash and cleanup; `E/final/final-custody.json`, `artifact-manifest.json` |

Final browser coverage is both engines × six delivery modes × React418/two ResizeObserver literals/exact Next literal/suffixed Next literal × primary/manager. The manager event deliberately uses phase `context-close` before actual context closure; it proves controlled teardown-phase behavior, not that browser close naturally emitted an error. Both contexts close and the observer still rejects afterward. The existing asynchronous teardown test remains.

The probe uses only fictional static loopback HTML, existing pinned browser packages and `safeEnvironment`; network routing permits only its owned origin. Final receipt confirms187 observed child PIDs absent, port57607 closed, all contexts/browsers/server closed. No application/database/mirror was started. Frozen tracked-file custody is retained in `E/final/source-before.json`; browser executable hashes are in the final probe report. Baseline original fictional name/message evidence remains restricted to0700 directory/0600 files, separate from safe published results. No original CI raw values were copied.

## Initial full-suite failure and limits

The initial full run overlapped other local verification, and recorded three5000ms timeouts: `backfill.test.ts:188` (“rejects changed catalog expression, predicate, source evidence and collation checksum”), `typed-guarded-backfill.server.test.ts:309` (“exact applied retry reads durable state and issues no source/control/journal DML”), and its line310 null-journal case (“rejects applied metadata with journal%s, never retrospectively repairing”). It had7538 passes,3 failures,801 skips;450 passing files,2 failed,27 skipped.

Those unchanged two files passed134 tests alone. One unchanged default full suite then passed7541 tests alone. Contention is suspected from the differing overlap, but its causal role was not proved. All failed evidence remains available. No assertions/timeouts/source/configuration were modified to obtain a pass. The801 skipped tests remain skipped, not completed coverage.

No normal70 local rerun was performed for this error-path-only change; earlier70 evidence remains prior-source. Local controlled format tests do not establish hosted acceptance or fix the unknown historical application error. Root owns fresh review/build/push/hosted70 and inspection of any new error before considering application changes or exemptions.

## Handoff and controls

Implementation owner: task3 worker; next owner: root controller. Engineering supports the minimal harness diagnostic change; security preserves data minimization and fatal behavior; governance is GO WITH CONDITIONS for the next review/CI gate, with production release still BLOCKER. No material exception, risk acceptance, production permission or Jose decision was requested or inferred. Existing independent UI/performance/migration/release gates remain open; this document does not self-close them. No push or deployment was performed by the worker.

Frozen executable SHA256: observer `81ab91dc9dcf7a345e4b0692da9639911fbaa996bd129dfefb0643f4edd6963c`; runtime tests `76feaf0a9887126a757dab2eb1e6ed8ec0e311a8ceb66f3a2bfa4aeb2590452d`. The final custody receipt records the documentation commit HEAD and proves the executable source remains identical to the tested frozen commit.
