# Remaining backend batch — review record

Fresh-context read-only engineering review covered `2d082042e..7bfc4e7c3`, with the approved plan, source contracts and known test limitations. This is a recorded summary of that immutable review, followed by separate author dispositions; it is not an independent release certificate. Claude's mutable UI was not integrated or approved. No reviewer changes to files or refs were made.

## Original review result: changes required

| ID | Priority | Finding at reviewed source |
| --- | --- | --- |
| R1 | P1 | EMAIL/ASSISTED recovery could retain the operator password while clearing required replacement. Check the current flag for every proof method and bind the compared credential under locks. |
| R2 | P1 | Enrollment inserted a mail job even though the intended enrollment principal lacks queue INSERT, causing permission failure/quarantine. Preserve least privilege. |
| R3 | P1 | Commerce enrollment precedes actual Owner activation. Its ready email could precede a working credential or survive a failed activation. |
| R4 | P2 | The shared installer treated a legacy self-service customer's own chosen password as an operator password, forcing another change. Identify origin explicitly. |
| R5 | P2 | A correction parent outside the latest-300 presentation window produced no delta. Read the exact authorized parent and include it in the final scope fence. |
| R6 | P1 | Provider runs lacked factual coverage under installed finance scope. Actually granted Managers could not prepare/review/approve imported statements. Preserve scope while retaining factual source/document coverage. |

Additional billing feedback: mark the first durably recorded refusal as well as its replay. The UI must inspect the current pending state after awaiting the response. This does not authorize retiring an uncertain provider outcome.

Reviewer evidence: diff checks, 80-project inventory and matching 22-file direct/named Employee Profile discovery. The reviewer did not rerun owned SQL/browser suites or verify hosted behavior. These limits remain part of the review.

## Author dispositions after review

All six findings were accepted as required fixes. These dispositions are the implementing author's evidence, not a second independent certification.

| ID | Change and regression evidence |
| --- | --- |
| R1 | Every method checks pending replacement; final reset binds exact hash and flag under locks. Alternate-proof reuse and flag-only race regressions failed before the fix; recovery suite passed 18 tests. |
| R2 | Enrollment writes an incarnation-bound request in its existing profile. The privileged worker owns queue scheduling. Actual separate enrollment login enrolls successfully without jobs INSERT; onboarding commerce suite passed 20 tests. |
| R3 | Durable readiness check queries actual Owner activation/current credentials through the company APP principal. Pending activation and post-queue replacement state retry without ready mail; activation then produces one captured message and replay stays idle. No real SMTP used. |
| R4 | Explicit OPERATOR/default versus SELF_SERVICE installer option. Fresh real company installs prove true versus false replacement flags; commerce suite passed 247 tests including refusal follow-up. |
| R5 | Exact authorized parent lookup plus final fence. An actual parent beyond 300 newer runs reproduced null before the fix; configurable payroll suite passed 41 tests. |
| R6 | Protected roster/current/history coverage on preparation/import/correction and new document metadata; existing source and authority fences retained. Actual granted Manager import/approve/PDF journey reproduced refusal before the fix; native/external/scope/overlap suites passed 64 tests, including denial after scope reduction. |

Billing first-refusal regression failed before its fix; the 247-test commerce suite passed afterward. Persistence failure, unresolved issued stages, pending outcomes and immutable operation keys retain their existing protections. Claude owns the pending-state UI adjustment at the reviewed-source integration gate.

Raw RED/GREEN logs are retained in `.superpowers/sdd/2026-11-15-external-payroll-statements/`. Final whole-source qualification and exact source identities belong in the validation handoff; this review record does not imply hosted development acceptance or production authorization.
