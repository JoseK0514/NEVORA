# Widths, roles and consistency

Exact immutable source `b9567abc26b977a517b77622a1661b16172f5b16`. This is a bounded candidate regression sample, not a complete exit matrix. All tested business mutations were held/answered in the browser or blocked; no tested business write reached the application. External origins and sign-out were blocked. Fictional owned fixture setup and login are separate authorized setup steps.

One serial browser worker uses Playwright1.62.1, Chromium151.0.7922.34 and WebKit26.5 (cloud Linux; see `runtime-smoke.json`). The bounded supplied-checker sample covers management Profile, Employee Availability, both pay fixtures on My pay, Owner Payroll at320/1440px and100/200% text; Home uses all ten brief role fixtures at320/100; Inbox uses Owner/Manager. Roles that do not have Inbox access are not counted as Inbox passes.

| Unchanged checker batch | Cells | Passed | Failed | Exit |
|---|---|---|---|---|
| profile | 16 | 16 | 0 | 0 |
| availability | 8 | 8 | 0 | 0 |
| my-pay | 16 | 16 | 0 | 0 |
| payroll | 8 | 4 | 4 | 1 |
| all-role-home | 20 | 12 | 8 | 1 |
| management-inbox | 4 | 4 | 0 | 0 |

OpenedMore and keyboard Escape are tested independently for all ten brief role fixtures at320/100 in both engines.

| Engine | Role fixture | Completed | Pass |
|---|---|---|---|
| chromium | QAOWNER | True | True |
| chromium | AUDIT-M | True | True |
| chromium | AUDIT-LEAD | True | True |
| chromium | payroll-qa-b | True | True |
| chromium | AUDIT-E | True | True |
| chromium | payroll-qa-a | True | True |
| chromium | AUDIT-LONG | True | True |
| chromium | AUDIT-ON | True | True |
| chromium | AUDIT-BREAK | True | True |
| chromium | AUDIT-SWAP | True | True |
| webkit | QAOWNER | True | True |
| webkit | AUDIT-M | True | True |
| webkit | AUDIT-LEAD | True | True |
| webkit | payroll-qa-b | True | True |
| webkit | AUDIT-E | True | True |
| webkit | payroll-qa-a | True | True |
| webkit | AUDIT-LONG | True | True |
| webkit | AUDIT-ON | True | True |
| webkit | AUDIT-BREAK | True | True |
| webkit | AUDIT-SWAP | True | True |

Real phone access, native hardware keyboard/rotation, screen-reader certification and the unexecuted full matrix remain open. The coordinator/Claude owns the phone-access yes/no.

[Raw case states and assertions](targeted-states.json), [progress log](targeted-run.log), and corresponding viewport crops under `crops/`. Setup-incomplete rows substantiate neither a product pass nor a product finding.
