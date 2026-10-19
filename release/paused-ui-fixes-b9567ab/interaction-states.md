# Interaction and states

Exact immutable source `b9567abc26b977a517b77622a1661b16172f5b16`. This is a bounded candidate regression sample, not a complete exit matrix. All tested business mutations were held/answered in the browser or blocked; no tested business write reached the application. External origins and sign-out were blocked. Fictional owned fixture setup and login are separate authorized setup steps.

152/152 cases completed; 152 passed; 0 setup/execution-incomplete.

| Case | Completed | Passed | Total |
|---|---|---|---|
| compose-recovery | 4 | 4 | 4 |
| actionform-failure-reveal | 24 | 24 | 24 |
| delete-pending | 10 | 10 | 10 |
| swap | 12 | 12 | 12 |
| availability | 4 | 4 | 4 |
| timeoff | 4 | 4 | 4 |
| calendar-retry-auth | 2 | 2 | 2 |
| correction-auth | 2 | 2 | 2 |
| withdrawal | 2 | 2 | 2 |
| timecards-pause-auth | 2 | 2 | 2 |
| updates-ack-auth | 4 | 4 | 4 |
| updates-read-retry | 4 | 4 | 4 |
| management-profile-reveal | 8 | 8 | 8 |
| field-contrast | 4 | 4 | 4 |
| payroll-type-floor | 8 | 8 | 8 |
| desktop-type-floor | 8 | 8 | 8 |
| phone-more-shell | 20 | 20 | 20 |
| correction-unknown-retry | 2 | 2 | 2 |
| profile-initial-read | 4 | 4 | 4 |
| updates-read-auth | 8 | 8 | 8 |
| payroll-settings-focus | 4 | 4 | 4 |
| statement-payday-floor | 8 | 8 | 8 |
| availability-time-label-floor | 4 | 4 | 4 |

No failed assertions or incomplete cases in this executed sample.

[Raw case states and assertions](targeted-states.json), [progress log](targeted-run.log), and corresponding viewport crops under `crops/`. Setup-incomplete rows substantiate neither a product pass nor a product finding.

Corrected coverage includes two identical failed submissions, controlled draft/reset, withdrawal confirmation/operation identity, pending focus/double activation, Calendar exact-operation retry through failed/new-generation reads and401, Timecards hidden/offline/read401, Updates receipt/read recovery, guarded Profile denial reveal, and correction unknown-result same-command retry. Only completed recorded cases establish these results.
