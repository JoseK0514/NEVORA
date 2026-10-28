# Employee mobile Alerts — independent manualQa

Author: alerts_qa_acceptance. Final bounded QA verdict: **GO WITH RETAINED CONDITIONS for local continuation; NOT a release approval.** Final tested source: `7ddf37715ff89ba4b397cf22ec8b67ae5d53de2e`, branch `codex/employee-mobile-local-resume-20261027`. Application bytes remain those of `72b1c192e8f2f05bcdd51b41cbf895ebce0d3dc5`; only five integration test/fixture files changed afterward. No repository files were edited by this QA executor. No ulw-loop plan exists (ULW_LOOP_PLAN_MISSING); caller-designated external evidence directory used.

All paths below are relative to `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-device-alerts/reviews/qa`. Commands run from repository `work/employee-mobile-local-resume`. T1/T2/T3 refer to Tasks1–3 of `docs/execution/employee-mobile-device-alerts/plan.md`. T3 includes bounded verification and explicit release limits.

## Exact invocations

| id | invocation |
|---|---|
| I1 | `NEVORA_QA_PROBE_LABEL=candidate /usr/local/bin/node node_modules/vitest/vitest.mjs run --config ../../outputs/employee-mobile-device-alerts/reviews/qa/candidate-probe.config.mts` |
| I2 | Same command with label `baseline` and `baseline-probe.config.mts`; actual extracted baseline059f4ac2 controller and actual worker source |
| I3 | `NEVORA_QA_PROBE_LABEL=final-candidate /usr/local/bin/node node_modules/vitest/vitest.mjs run --config ../../outputs/employee-mobile-device-alerts/reviews/qa/final-probes.config.mts` |
| I4 | `/usr/local/bin/node node_modules/vitest/vitest.mjs run src/lib/notifications/device-client.test.ts src/lib/notifications/device-protocol.test.ts src/lib/notifications/device-state.test.ts src/lib/notifications/service-worker.test.ts src/app/app/api/push/push-routes.test.ts src/components/employee-mobile/device-alerts.test.tsx src/components/portal-device-setup.test.tsx src/components/portal-device-setup-focus.test.tsx --fileParallelism=false --maxWorkers=1` |
| I5 | `/bin/zsh ../../outputs/employee-mobile-device-alerts/reviews/qa/run-owned-combined.zsh` — original32-file gate on72 |
| I6 | `python3 ../../outputs/employee-mobile-device-alerts/reviews/qa/run-affected-recovery.py 69ae8e8c8199529f2ce3cbb4c9cac630de94e493` |
| I7 | `python3 ../../outputs/employee-mobile-device-alerts/reviews/qa/run-affected-recovery-02.py 7ddf37715ff89ba4b397cf22ec8b67ae5d53de2e` — exact six selectors, sanitized environment,13 evidence directories in invocation.json |
| I8 | `/usr/local/bin/node ../../outputs/employee-mobile-device-alerts/reviews/qa/characterize-native-keyboard.mjs` |
| I9 | `/usr/local/bin/node ../../outputs/employee-mobile-device-alerts/reviews/qa/characterize-touch-transition.mjs` |
| I10 | `/usr/bin/env -i HOME=/Users/josek0514 PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /bin/zsh ../../outputs/employee-mobile-device-alerts/reviews/qa/run-actual-app-characterization-07.zsh` |
| I11 | `/usr/local/bin/node node_modules/vitest/vitest.mjs run src/app/app/requests/hub/page.test.tsx src/app/app/requests/page.test.tsx src/app/app/requests/page.withdrawal-carry-forward.test.tsx src/lib/data/scheduling-inputs.test.ts --fileParallelism=false --maxWorkers=1` |

## manualQa.surfaceEvidence

| scenarioId | criterionRef | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| QA-OWN-1 | T1 suppression | Actual controller/browser runtime and service-worker code in Node VM; fictional native/IDB boundaries | I1,I2,I3 | PASS: durable suppression survives document/controller/worker replacement | A1,A2 |
| QA-OWN-2 | T1 opaque operation | Actual browser runtime, retained localStorage operation key | I1,I2,I3 | PASS: unknown operation marker retained; no SET_OWNER | A1,A2 |
| QA-UNIT | T1/T2 current authority/protocol/components | Unit and React component execution | I4 | PASS172/172,8files on72; unchanged inputs at final7ddf | A3,A4 |
| QA-A11Y-1 | T2 settled loading semantics | Actual React static render disabled, paused, loading | I3 | CLOSED/PASS by original author: disabled/paused aria-busy=false; actual loading=true | A2,A5 |
| QA-FULL32 | T3 full regression inventory | Owned PostgreSQL, actual Next/browser and canonical SQL | I5 | FAIL originalrun:364passed/7failed;26filespassed/6failed; no final green claim for that invocation | A6 |
| QA-RECOVERY01 | T3 setup and custody | Owned Next startup and SQL | I6 | FAIL12, PASS11, SKIP4; rejected as acceptance | A7 |
| QA-RECOVERY02 | T3 affected gate | Owned PostgreSQL, actual Next, Chromium/WebKit/Firefox | I7 | PASS27/27,6files,0fail/0skip,exit0 | A8,A9 |
| QA-DEVICE-JOURNEYS | T1/T2 enrollment/cleanup | Actual portal, SQL/session/route boundary; fictional native permission/worker | I7 device primary | PASS45 checks,3engines; explicit opt-in, authority rejection, unknown cleanup, original-generation retry, lease/session retirement and sign-out | A10 |
| QA-DEVICE-GATES | T2 authorization/capability | Actual Employee/Lead feature-off and Manager/Owner redirects; install/unsupported | I7 device supplement | PASS6 cases; no permission prompts/registration in gates; install acceptance never claims alerts enabled | A11 |
| QA-KEYBOARD | T2 focus/navigation | Actual pointer Back and native keyboard;320px/200%, both themes | I7; independent I8,I10 | PASS exact focus traversal, >=3px ring, >=44px targets, nav clearance, Keep exact focus return; macOS WebKit Option-Tab | A10,A12 |
| QA-LANDSCAPE | T2 mobile layout/contrast | Actual viewport844x390 with asserted coarse media,3engines,both themes | I7 | PASS6 landscape cases;24total contrast samples minimum5.42085; palette and control/nav bounds verified | A10,A13 |
| QA-COMMS | T3 notifications/authorization | Actual3engine mobile portal + canonical publication/query boundary | I7 | PASS69 main +21 review journey checks; no unexpected errors;14 preload warnings retained | A14 |
| QA-SQL-PASSKEY | T3 prior feature regressions | Actual local SQL authorization/schema; actual local passkey HTTP sign-in | I7 | PASS schema11, own-notifications SQL8, passkey-network1 | A8,A15 |
| QA-CUSTODY | T3 ownership | Process identities, socket checks, source/mirror SHA256, temporary roots | I5,I6,I7 plus independent audits | PASS final6mirrors2040inputs each; no residual recorded owned processes/PIDs/listeners/tempcluster | A9,A16 |
| QA-BASE-13 | T3 preserve prior failures | Actual existing unit assertions | I11 | FAIL13/PASS17, exact retained identities | A17 |

## manualQa.adversarialCases

| scenarioId | criterionRef | adversarialClass | expectedBehavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| QA-OWN-1 | T1 | persisted suppression + native unsubscribe rejection + server503 + replacement | No passive original-generation ownership restoration | PASS at actual code/fictitious native boundary | A1,A2 |
| QA-OWN-2 | T1 | unknown native operation survives document | Opaque exclusion remains authoritative | PASS | A1,A2 |
| QA-OWN-3 | T1/T3 | failed durable suppression + failed native unsubscribe +503 + storage recovery and replacement | Prior opt-out should remain effective | FAIL/OPEN, retained baseline engine risk; same generation re-enabled on baseline and final candidate without new opt-in | A1,A18 |
| QA-GENERATION-LEASE | T1 | changed confirmation generation, expired current-read lease, late worker ACK/storage boundary | No stale confirmation, ownership or success projection | PASS at172unit boundary plus actual browser/session lease cases | A3,A10 |
| QA-AUTH-PROTOCOL | T1 | wrong authority/session/role, malformed/wrong-generation receipts, expired/excessive budgets | Reject state/commands before unauthorized mutation | PASS bounded units/actual local routes+SQL | A3,A10,A11,A15 |
| QA-UNKNOWN-CLEANUP | T1/T2 | unsubscribe503 or lost committed response; passive refresh | Remain suppressed/unknown; retry exact original generation; do not invent original success | PASS actual3engine journeys | A10 |
| QA-DENIED-PENDING | T1/T2 | denied permission, pending native work, disposed callback, gated install | No automatic reprompt, stale ownership, or fictional enablement | PASS controller units and browser gates | A3,A10,A11 |
| QA-QUIET-HOURS | T3 deterministic fixture | live22:33AST schedules normal publication next07:00 | UI fixture must explicitly own due notices without changing canonical policy | OriginalFAIL; recoveredPASS. Exact9review/27perengine rescheduled, untargeted rows/fingerprints unchanged | A19,A14 |
| QA-CAPTURE | T3 evidence validity | full-page capture changes emulated pointer capability | Landscape proof must retain actual coarse capability | Harness defect REPRODUCED outside app; finalviewport-onlyPASS. Earlier landscape coverage condition remains open | A12,A13,A20 |
| QA-SETUP | T3 cleanup custody | beforeAll deadline expires before app assignment | No orphan owned runtime or cross-fixture database reuse | Recovery01FAIL, exact-identity manual cleanup recorded; bounded120s setup cancellation/180sgrace now in fixture; successfulreplayPASS. Abort fault injection itself not claimed | A7,A9,A4 |
| QA-PHYSICAL-RELEASE | T3 release boundary | real OS/install/background worker/provider/assistive tech | Requires approved physical and hosted release prerequisites | NOT EXECUTED/blocked for release; no fabricated pass or N/A | A10,A11,A21 |

## manualQa.artifactRefs

| id | kind | description | path |
|---|---|---|---|
| A1 | probe source/log/state | Baseline/candidate actual worker/controller probes; unsafecase is deliberately reproduced | ownership-replacement.test.ts; candidate-ownership-probe.log; baseline-ownership-probe.log; candidate-QA-OWN-1.json; baseline-QA-OWN-1.json; candidate-QA-OWN-2.json; baseline-QA-OWN-2.json |
| A2 | final probe log/state |4tests,exit0; actual final application ownership/semantic probes | final-probes.log; final-probes.exit.txt; final-candidate-QA-OWN-1.json; final-candidate-QA-OWN-2.json |
| A3 | unit log/exit |172tests8files,exit0 | final-focused-units.log; final-focused-units.exit.txt |
| A4 | source delta | Only five integration fixture/test files changed72..7ddf | final-source-delta.json |
| A5 | HTML/authored closure | Actual settled/loading markup and original-author closure | final-disabled-busy.html; final-paused-busy.html; final-loading-busy.html; qa-a11y-1-feature-off-busy.md |
| A6 | original gate log/summary |32files371tests, original7failures retained | full-run-01/combined-gate.log; full-run-01/summary.json; full-run-01/exit-code.txt |
| A7 | failed recovery and custody | Hooktimeout,skips,DBrefusal cascade, exactPID cleanup | affected-recovery-01/run.log; affected-recovery-01/summary.json; affected-recovery-01/qa-recovered-custody.json |
| A8 | successful affected gate | Explicit sanitized13vars,6selectors,27pass,exit0 | affected-recovery-02/invocation.json; affected-recovery-02/run.log; affected-recovery-02/summary.json; affected-recovery-02/exit-code.txt |
| A9 | independent custody |6mirrors exact7ddf,2040inputs each, source/mirror verification, no owned residuals | affected-recovery-02/independent-custody-audit.json; affected-recovery-02/owned-process-history.json; affected-recovery-02/tmpdir-after.json |
| A10 | browser JSON/images |45primarychecks,63captures,24contrasts,66pushtransportevents,0unexpectederrors | affected-recovery-02/device/result.json; affected-recovery-02/device/webkit-light-text200-Turn-off-alerts.png; affected-recovery-02/device/firefox-dark-coarse-landscape-1.png |
| A11 | gates JSON/images |6supplementalcases, role/feature/install/unsupported | affected-recovery-02/device/gates-result.json; affected-recovery-02/device/feature-off/EMPLOYEE.png; affected-recovery-02/device/capability-gates/install.png |
| A12 | native keyboard/capture diagnosis | Actual static native keyboard and isolated full-page touch mutation | static-keyboard/results.json; static-touch-transition.json; actual-app-characterization-07/result.json; capture-keyboard-characterization.md |
| A13 | viewport images/data | Final light/dark truecoarse palettes and unobscured controls | affected-recovery-02/device/result.json; affected-recovery-02/device/chromium-light-coarse-landscape-2.png; affected-recovery-02/device/webkit-dark-coarse-landscape-1.png |
| A14 | notification browser evidence |69main/21reviewchecks; explicit expected faults and retained warnings | affected-recovery-02/communications/results.json; affected-recovery-02/communications-review/results.json; affected-recovery-02/journey-observation-audit.json |
| A15 | SQL/HTTP evidence | Schema SQL, own-notification authorization8tests, real local passkeyHTTP | affected-recovery-02/run.log; affected-recovery-02/passkey-network/http-verification.json; affected-recovery-02/canonical-communications/ |
| A16 | original/diagnostic custody | Normalclosures and no residual identities; originalmirrors verified | full-run-01/cleanup-audit.json; full-run-01/closure-process-ports.json; diagnostic-first-four-custody.json; diagnostic-final-three-custody.json |
| A17 | retained unit failure evidence | Own13failures and independent read of root16failurecorpus | retained-four-unit-files.log; retained-four-unit-files.exit.txt; independently-read-root-default-results.json |
| A18 | retained unsafe finding | Same unsafe compound replacement outcome on baseline/final | ownership-retained-risk.md; baseline-QA-OWN-3.json; final-candidate-QA-OWN-3.json |
| A19 | read-only SQL/fixture audit | Definitive quiet-hour proof; exactscope rescheduling audit | quiet-hours-observation-text.log; quiet-hours-observation-text.exit.txt; affected-recovery-02/independent-due-fixture-audit.json |
| A20 | coverage reconciliation | All7 original failed test names pass;344 unaffected+27 recovered=371inventory, not one finalfullrun | coverage-reconciliation.json |
| A21 | final authored report | Release limits, retained conditions, exact result scope | final-qa-report.md |

## Conditions that remain open

QA-OWN-3 is retained unsafe behavior and is not risk acceptance. The global default corpus remains16failed/9803passed/801skipped:13 deterministic retained identities plus three process-observation failures with different identities from the prior baseline; cause unresolved. CalendarQA-CAL1, CommunicationsCR4/UI002/UI003 and process-observation instability remain open. Earlier full-page landscape evidence without capability checks needs audit/replay for later combined/Phase3 acceptance. Physical mobile, actual OS permission/HomeScreen/background worker, screen reader, provider delivery, hosted release and production are unverified. No release or global-suite pass is granted.

Coverage was reconciled honestly: originalfull32 failed; final affected six pass27 without skips; other26 unchanged files account344passed cases. All seven original failing test names appear as passed in final recovery. This is not a claim of one clean final-SHA full32 invocation. Every incomplete/failed diagnostic remains preserved.
