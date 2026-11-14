# Home diagnostic and witness fixture follow-up

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: []

Review scope: seven-file working diff over8cb8c240d753673de488f0ddffe0fc7455d00865. No application code, privacy projection, H09 assertions or deadlines changed. No source edits made.

## CRITICAL
None.

## HIGH
None remaining. The previously reproduced never-connected rollback hang is resolved: H09 starts blockerConnected=false, sets it only after connect resolves, and passes it to finishHomeFailure; rollback is skipped when false while end, marker close, observer close and evidence capture still run. Inspected installed pg end implementation: never-connected end resolves without network access.

## MEDIUM
None.

## LOW
The new SQL requirement detects an empty receipt, not completeness or per-request pairing. A nonempty saturated/partial capture still requires interpretation. This is a diagnostic limitation, not evidence of false H09 application acceptance.

## Verification
Read isolated red log work/notification-read-witness-8cb-red.log: all16 witness tests fail at destructuring missing path before their assertions execute. Inspected the actual addInitScript callback: it receives {path,binding}. The fixture correction captures and passes that actual argument into the existing VM sandbox. All original assertions remain unchanged; this is a genuine stale fake correction, not weakened coverage.

Independently ran Node diagnostic checks:5 passed. Vitest notification witness and owned-home-diagnostics:18 passed across2 files. No DB/browser run launched. Coordinator's173 related tests,14-cell browser run and actual transport regression are not independently certified by this review.

Opt-in is checked inside a diagnostic-only catch and disabled runs do not consume diagnostic event capacity. Marker uses an owned app directory, mode0600, wx and deletes only after successful creation. Existing SQL output sanitization remains intact. The real-PG test retains original SQLSTATE22012 and subsequent-read assertions while adding disabled-then-enabled coverage; inspected but not executed. The pre-connect cleanup flaw is corrected.

Both programming and remove-ai-slops perspectives were loaded earlier in this session and applied here. No deletion-only, tautological, prompt or constant-pinning tests introduced; no unnecessary production normalization. The behavior-oriented marker-empty-capture and real SQL sink tests are relevant. No remaining blocking skill-perspective violation identified.

Operator8cb preparation and hosting remain untouched. This report is code review only and grants no candidate or release certification.

## Final correction verification
Independently reran Node checks after the correction:6/6 passed. Prior independent Vitest witness/diagnostic18/18 still applies; no relevant source changed in those tests afterward. git diff --check passed during correction review. The new regression originally threw inside its fake query, which the cleanup intentionally swallowed; review caught that false-positive assertion. It now records query in the step trace and excludes it from expected cleanup steps. Inspected coordinator's work/unconnected-blocker-red.log: with rollback unguarded the test fails because query appears; independently confirmed corrected source and green run. No test weakening or masking remains. Coordinator's broader173 tests and DB/browser runs remain separate evidence, not independently rerun here. Approval is for this bounded patch; WATCH retains only the LOW diagnostic completeness limitation.
