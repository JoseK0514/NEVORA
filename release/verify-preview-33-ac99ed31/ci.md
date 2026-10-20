# CI follow-ups — run 39350175628

CI head is `ac99ed31`; the browser jobs checked out PR merge `9f9cd1db`. Both uploaded browser manifests pin 1,472 application/script/asset/config inputs, and all hashes match the candidate. The two implicated scripts are unchanged from pre-merge `0a2ea1b3`. These failures do not establish a regression introduced by the requested merge.

| Job | Observation | Owner / next action |
| --- | --- | --- |
| phase-e-ui | `phase-e-home-browser-scenarios.mjs:38` waits for exact `Clocked In`. The failed-run screenshot shows current `Clocked in` in the actual Clock status badge. Execution stops in Home's first Chromium 320 cell. | Codex CI, with Phase 3 confirming the current sentence-case copy. Align the intended exact-label assertions with the approved wording while retaining all workflow/privacy checks. |
| phase-d-attendance-ui | Nine checks pass. At `phase-d-attendance-ui-qa.mjs:346`, global exact `Main Office` count is 1 after `Renamed Main Office` appears; expected 0. No failed-state screenshot was captured by this job. | Codex CI / Phase 3: reproduce the exact runner fixture and inspect the remaining DOM match before assigning a product cause. A same-source bounded local read probe observed old count 0 and new attendance count 1; it does not close the CI failure. |

[CI job snapshot](ci.json), [Attendance report](ci-artifacts/attendance-report.json), [Home failure](ci-artifacts/phase-e-failure.json), [Home screenshot](ci-artifacts/phase-e-home-failure.png), [local Attendance probe](evidence/ci-attendance-probe.json). The source manifests are in `ci-artifacts/`.

At the last observation, validate and phase-e-postgres passed; clocker-postgres and release-postgres were still running. The CI aggregate is not green. No failed assertion or timeout was changed in this task.
