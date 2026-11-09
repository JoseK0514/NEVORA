# QA-A11Y-1 — settled feature-off status remains aria-busy

Independent author: alerts_qa_acceptance. Candidate application ebec721a3d6cfd842a5037fc4598b77e2454d9e8. Severity: minor accessibility semantics; introduced by the new EmployeeDeviceAlertsView. Status: ISSUE / OPEN. Task2 criterion: distinguish off/configuration/loading states; preserve accessible status.

Actual reproduction: render EmployeeDeviceAlertsView with enabled=false, snapshot=null, paused=false. It renders “Workplace alerts are unavailable” but its section has aria-busy="true". EmployeeDeviceProvider's disabled branch never constructs a snapshot, so the initial null is the normal settled state, not pending data. Expected: unavailable card is not busy; real active loading remains busy. This is an incorrect accessibility-state contract. No physical screen-reader effect or production incidence was tested or claimed.

Surface: Node React renderToStaticMarkup, actual application component. Exact invocation (repo root): /usr/local/bin/node node_modules/vitest/vitest.mjs run --config ../../outputs/employee-mobile-device-alerts/reviews/qa/disabled-busy.config.mts

Artifacts: disabled-busy.test.ts, disabled-busy.config.mts, disabled-busy.log, disabled-busy.exit.txt, feature-off-busy.html. Actual exit0,1 reproduction test passed by asserting the current bad state. This is manual QA FAIL, not a safety PASS. No app/tests/config edits made. Owner can remediate; this independent author must verify closure.

## Independent author closure — source72b1c192

Re-executed actual EmployeeDeviceAlertsView through React static rendering in disabled, paused and actual-loading states. Invocation: `NEVORA_QA_PROBE_LABEL=final-candidate /usr/local/bin/node node_modules/vitest/vitest.mjs run --config ../../outputs/employee-mobile-device-alerts/reviews/qa/final-probes.config.mts`. Actual exit0,4 tests pass across2 files (3 ownership probes plus accessibility closure). `final-disabled-busy.html` and `final-paused-busy.html` contain aria-busy=false; `final-loading-busy.html` contains aria-busy=true. Same component code, no mock replacement. QA-A11Y-1 CLOSED by original QA author. This is semantic component evidence, not screen-reader/physical-device certification.
