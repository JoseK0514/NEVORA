# Device alerts independent code review — 72b1c192

Candidate: `72b1c192e8f2f05bcdd51b41cbf895ebce0d3dc5`. Overall base: `059f4ac2fbd4cc50bb526bb0f1001465de2e2ce2`. New delta reviewed against prior independently reviewed `ebec721a3d6cfd842a5037fc4598b77e2454d9e8`. Checkout clean at beginning/end. Original NO-GO, cookie-race reproduction and subsequent separate reports remain preserved.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE** for bounded local continuation only.
- Disposition: **GO WITH CONDITIONS**, not general acceptance or release certification.
- blockers: No new independently established CRITICAL/HIGH defect in this six-file delta. Source-bound combined QA/browser results remain required; inherited QA-OWN-3 is not closed or accepted by this disposition.

## CRITICAL
None newly established.

## HIGH
None newly established in the delta. **Retained risk:** QA-OWN-3 concerns combined worker suppression/native unsubscribe/server failure. This reviewer has not reproduced or closed that independently authored condition, and this report supplies no exception or acceptance of it. Do not interpret local continuation approval as shipping approval while inherited material conditions remain.

## MEDIUM
No new actionable medium defect established. Earlier CR-2 browser execution condition remains until exact-source results are inspected. The source-level synchronization fix remains present.

## LOW
None added.

## Code findings and whole-batch implications
`src/lib/notifications/device-client.ts`: read reconciliation now checks the finite lease after asynchronous worker acknowledgement and after the ownership-storage boundary. Expiry triggers generation-specific suppression before the path fails. Enrollment similarly rechecks after ownership storage and routes failure through its existing generation suppression. The stable publish guard refuses to display a successful/enabled strict snapshot once its lease is expired, disabling local-owned/test flags while leaving loading/pending/error transitions intact. Legacy unbound runtimes without finite leases retain behavior. This does not prove native suppression always succeeds; QA-OWN-3 remains relevant.

`src/components/employee-mobile/device-owner.tsx`: deadline handling now retires already-expired stable snapshots rather than skipping them; expired resume chooses visible refresh, preventing immediate redisplay of settled stale state. Pending native operations remain protected by controller guards; these changes do not introduce a second owner or automatic native consent. Error snapshots do not continuously trigger immediate deadline refresh, avoiding the obvious retry-loop form.

`src/components/employee-mobile/device-alerts.tsx`: aria-busy now depends on the allowed active state, so feature-off and paused surfaces no longer announce indefinite loading. Access-changed state likewise is not busy. This is a correct semantic repair, not a feature-access change. Independent accessibility-author closure remains its author's responsibility.

Harness delta: actual Tab navigation and computed focus-ring checks replace programmatic focus for enlarged confirmation controls. Back navigation checks hit-testing before real pointer click. The development-only Next indicator preference affects the owned harness rather than production application/configuration; error observers remain in place. These strengthen relevant behavior checks and do not bypass application overlays or weaken origin/session assertions. Their actual browser outcomes were not executed by this reviewer.

## Independently executed evidence
- Eight focused files covering controller, protocol, server routes, page/view, shared AppShell, incumbent desktop popover/focus and owned fixture: **152/152 PASS**. Exact command/output in `focused-unit-72b1c192.log`.
- Includes both lease-expiry regressions (after worker ACK and during ownership storage), stable feature-off/paused aria-busy regression, earlier generation-target and authentication retirement regressions.
- `git diff --check 059f4ac2..72b1c192`: PASS.
- Read the complete six-file delta and considered impact on prior whole-batch canonical lifecycle checks. No app/tests/config edited by reviewer.

## Skill-perspective review
Previously loaded remove-ai-slops and programming criteria applied again. New tests drive actual controller state/worker suppression and rendered ARIA contract, not implementation constants or deletion-only requested changes. Freshness checks follow genuine asynchronous/storage boundaries; they are justified lifecycle guards, not unnecessary repeated parsing. No new speculative abstraction, untyped escape hatch or LLM prompt-text test introduced. The native keyboard and pointer assertions exercise meaningful user behavior. No new violation requiring changes established.

## Conditions and remaining gates
This report does not independently substantiate parent-reported553 focused tests, broad default suite, typecheck, lint or planned32-test combined gate; those must retain their actual logs/results. No competing browser/SQL run launched. Await the exact candidate's combined QA evidence; retain source SHA, failures and independently owned finding closure. CR-1 repair remains verified for bound Employee/Lead status; legacy unbound rewrite remains a documented boundary. Prior baseline13 failures, process-observation instability, CalendarQA-CAL1, Communications conditions, physical-device/OS, assistive-technology, provider, hosted and release gates remain visible. No merge, deployment, production verification or blanket feature completion is approved here.
