# IS-B33 Runs completion — static proposal

Candidate base56570fd; ready port368e98a. Primary source `inspection/interaction-states.md:209` measures Prepare draft held/aborted feedback above viewport, literal idle label and body focus. The source report explicitly identifies all Runs actions sharing OperationFeedback; line244 says Import/Approve/Publish were not pressed, so their closure still needs positive fixtures and measurements.

Apply IS-B31-PAYROLL first for the shared UI-only pending-fields hook. Runs reuses it on Prepare and Import/Correction. Form/command handlers guard operation.locked before reading inputs. Existing inFlight remains the synchronous duplicate guard. Initiating inputs stay readonly and focused; submits and command buttons use aria-disabled while retaining non-busy eligibility disables. Both labels remain in existing PendingLabel. Original idle labels and all financial guidance are unchanged.

usePayrollOperation adds only transient activeAction/activeTarget UI metadata around existing dispatch/check/finally statements; request payload, command reference, reconstruction, receipt validation, reload/authority and retry identity are unchanged. Metadata ensures only the actual operation's action shows a progress label, including one matching job ID for Retry job. Prepare/Import/Correct/Approve/Publish/Payment instructions/Retry job are covered by the same behavior.

Candidate adds a Runs-only feedback wrapper and the source's existing phone/desktop float geometry to payroll-workflow.css, leaving portal-premium.css untouched. Ready already has wb-payroll-feedback and source float, so its port deliberately retains those rather than duplicating CSS. Recovery words and receipt/check controls remain unchanged.

No tests, browser, preview or app edits were performed. Mandatory subsequent proofs: both engines390/100 and320/200 Prepare button+Enter, held label geometry, field focus, duplicate guard and visible interrupted feedback;1440/100; positively fixture-bound additional run actions and unchanged original retry command/operation. This proposal alone is not exit closure.

## Backlog completion after independent Wave A review

Wave A identified `backlog-review.tsx:29` as another actual PREPARE action. Revised patch includes its focusable guarded PendingLabel while preserving native disabled for an unacknowledged ambiguous schedule transition. Existing checkbox, Review period and Show all lock behavior is retained.

`operation.submit(input, uiOrigin)` receives a separate UI-only argument, never merged into the command or request. A ref retains that origin across exact original-command retries and finish clears it. New draft uses `new-draft`; each backlog row uses `backlog:<start>:<end>:<payday>:<settingsRevision>`. Dispatch activeTarget uses this separate origin for PREPARE; therefore identical periods displayed on different surfaces remain distinguishable and only the initiating surface says Preparing. Receipt checks clear active UI state without altering the retained origin/command. No browser/tests run. Added proof prerequisite: open New draft beside a positively bound backlog period, hold Prepare this period and verify only that backlog control changes its label; then reverse the initiating surface. All commands intercepted.
