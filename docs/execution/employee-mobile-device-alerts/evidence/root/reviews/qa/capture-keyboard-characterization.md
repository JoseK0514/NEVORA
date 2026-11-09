# Owned QA: keyboard and capture characterization

Author: alerts_qa_acceptance. Application source frozen at 72b1c192e8f2f05bcdd51b41cbf895ebce0d3dc5. No application, test, config, or documentation changes in the repository.

## Native keyboard

Invocation: `/usr/local/bin/node ../../outputs/employee-mobile-device-alerts/reviews/qa/characterize-native-keyboard.mjs` from the repository.

Actual static native DOM, same headless Playwright engines: WebKit Tab skips native buttons and link, focusing summary; Alt+Tab reaches Keep, Turn off, then link. Chromium Tab reaches Keep, Turn off, then link. The only scripted initial focus is the same tabindex=-1 group that application entry focuses. Control traversal uses actual keyboard events; no positive tabindex or OS preference changes. Evidence: `static-keyboard/results.json`, `static-keyboard.log`, screenshots. App keyboard closure remains separate from static evidence.

## Chromium full-page capture changes capability

Invocation: `/usr/local/bin/node ../../outputs/employee-mobile-device-alerts/reviews/qa/characterize-touch-transition.mjs`.

Each action uses a fresh native DOM context with hasTouch=true. Chromium starts coarse, maxTouchPoints=1. Ordinary pointer click, native Tab, and viewport screenshot preserve those facts. Full-page screenshot alone changes coarse to false/fine to true and maxTouchPoints to 0. WebKit retains coarse for all four actions; its maxTouchPoints is 0 even initially. Evidence: `static-touch-transition.json`, `.log`, script and captures. This is not a Nevora application CSS defect; it invalidates this runtime's earlier coarse-landscape claims if capability was not reasserted after full-page capture.

Actual application diagnostic05 repeats the mutation: Chromium dark landscape before full-page capture is 844x390/coarse, --em-teal #a9e2da, status-text contrast 7.713:1, controls >=44px and above nav. After deliberate full-page capture, viewport remains 844x390 but coarse=false, touchPoints=0, and mobile token is empty. Light viewport controls and contrast also passed. Viewport images were visually inspected. Full-page and after images are diagnostic failures, not approved UI references.

Evidence: `actual-app-characterization-05/failure.json` diagnostics and `chromium-{light,dark}-landscape-viewport-{1,2}.png`. Run05 overall failed later at WebKit profile navigation; do not label the run passed. Earlier diagnostics02–04 preserve the initial failures and increasing observational detail. Diagnostic01 failed before browser because its external namespace mapping incorrectly called the one-way helper; its owned cluster closed.

## Retained coverage condition

Earlier mobile landscape evidence produced with full-page capture and without a coarse-pointer precondition needs later audit/replay in the combined/Phase3 acceptance. This observation does not self-close or rewrite other authors' prior findings or certify physical mobile behavior. Future mobile capture should use viewport-only images and assert actual media capability for the scenario.

## Actual WebKit completion

Diagnostic07 completed exit0 on unchanged72. Exact external config, test source and runner are copied into actual-app-characterization-07/. The added diagnostic Back readiness guard now matches URL.pathname because the correct destination includes #profile-device-alerts; diagnostic06 failure was the overly strict guard, preserved. Actual pointer Back, Appearance select and Alerts link remain exercised. WebKit ordinaryTab skips controls; actual Alt+Tab traverses both confirmation buttons in both themes at320px/200%, with computed focus ring>=3px, target>=44px and unobscured above navigation. Keep returns exact trigger focus. Both true-coarse844x390 themes pass status contrast5.42085light/7.71297dark and control/nav geometry. No unexpected browser errors. Evidence result.json plus viewport and keyboard screenshots.

Diagnostic05 overall failure occurred at WebKit navigation before keyboard;07 explicitly waits for Profile pathname/heading before proceeding and passes. This is a resolved diagnostic sequencing issue for this probe, not a claim that a product navigation defect was proved/fixed.

All diagnostic clusters and temporary roots closed; mirror/source hashes verified with no mismatches. Evidence diagnostic-first-four-custody.json and diagnostic-final-three-custody.json. Root released for scoped test-only fixture remediation after07 closure.
