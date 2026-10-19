# Finding commit coverage

Exact immutable source `b9567abc26b977a517b77622a1661b16172f5b16`. This is a bounded candidate regression sample, not a complete exit matrix. All tested business mutations were held/answered in the browser or blocked; no tested business write reached the application. External origins and sign-out were blocked. Fictional owned fixture setup and login are separate authorized setup steps.

| Finding | Commit | Measured candidate case family | Passed |
|---|---|---|---|
| IS-P3-03 | 6229ad4 | availability | 4/4 |
| IS-82 | 2dfc390 | withdrawal | 2/2 |
| ST-P3-24 | 74b527d | availability | 4/4 |
| IS-P3-02 | db48fb3 | availability, timeoff | 8/8 |
| IS-PROFILE-17 | 69338fd | management-profile-reveal | 8/8 |
| IS-74 | 4b041f7 | availability, timeoff, swap, correction-auth, calendar-retry-auth, updates-ack-auth | 28/28 |
| IS-77 | ac265b9 | timecards-pause-auth | 2/2 |
| IS-78 | 6990234 | timecards-pause-auth, calendar-retry-auth, correction-auth, withdrawal | 8/8 |
| IS-79 | f16da25 | updates-ack-auth | 4/4 |
| IS-80 | ab7d866 | calendar-retry-auth | 2/2 |
| IS-B12 | 21e603b | updates-read-retry, payroll-settings-focus | 8/8 |
| TC-B-32 | ed62b42 | payroll-type-floor | 8/8 |
| TC-P4-23 | 3918350 | statement-payday-floor | 8/8 |
| TC-P4-22 | 7386c45 | availability-time-label-floor | 4/4 |
| RC-CB-TC-01 | b176ff5 | desktop-type-floor | 8/8 |
| TC-WA-16 | fe77095 | swap | 12/12 |
| TC-B-16 | 2e40573 | updates-read-auth | 8/8 |
| TCD-16 | 31f87cd | desktop-type-floor | 8/8 |
| WR-WC-25 | 22ea160 | Unmerged Wave C controls; separate owning-source proof, no candidate runtime claim | — |
| ST-13 | 6dacbe0 | Unmerged Wave C controls; separate owning-source proof, no candidate runtime claim | — |
| ST-WA-7 | 0e29e38 | swap | 12/12 |
| ST-WA-8 | 6e67193 | delete-pending | 10/10 |
| IS-RC-DELETE-01 | 22f0ba7 | delete-pending | 10/10 |
| ST-RC-CALENDAR-01 | 58e100a | calendar-retry-auth | 2/2 |
| ST-RC-ACK-01 | e05d661 | updates-ack-auth | 4/4 |
| ST-RC-CORRECTION-01 | e2d21fb | correction-auth, correction-unknown-retry | 4/4 |
| TC-RC-ASSISTED-01 | 35c2c0a | field-contrast | 4/4 |
| IS-WA-2 | 536dfe6 | actionform-failure-reveal | 24/24 |
| IS-WB-34 | 0443030 | compose-recovery | 4/4 |
| ST-WB-15 | 980e823 | compose-recovery | 4/4 |
| IS-RC-COMPOSE-01 | b9567ab | compose-recovery | 4/4 |

The31-entry ledger is retained verbatim. Case-family counts overlap where a single controlled interaction tests several findings. They are not31 independent exit rounds. Exact role/width/text/state scope and assertions remain in the raw152-case transcript. WR-WC-25 and ST-13 affect the unmerged Wave C UI; the coordinator maintains its owning-source injection/exit proof separately. No dormant selector is called a candidate runtime pass.
