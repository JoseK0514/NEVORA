# Employee mobile — Phase 2 status and Phase 3 gate

Jose confirmed sequencing on 2026-10-27: finish everything assigned to Phase 2 before moving to Phase 3. Phase 2 remains active; Phase 3 has not started. This instruction does not authorize a production merge or deployment.

The approved scope remains the three-phase plan at `outputs/employee-mobile/remaining-work-three-phases.md` in the design workspace. Keep its small implementation batches and independent acceptance gates; do not move unfinished Phase 2 implementation into Phase 3.

## Verified foundation and completed batches

- Phase 1: shared Employee/Lead mobile teal system, Home, Schedule/revision review and bounded Calendar heading fix. See `../employee-mobile-phase1/HANDOFF.md`.
- First Phase 2 batch: Requests hub and eligible open coverage/pickup, accepted locally at application candidate `7abcd315ae0f978b74d4a06c2cc1525cc67f362b`. See `../employee-mobile-requests/HANDOFF.md` and its independent UI/QA reports. Existing links to deeper request pages are not evidence that those mobile ports are complete.
- Second Phase 2 batch: incoming swap responses and own-request details/history, including permitted cancellation/withdrawal and retained exact links, application candidate `333c476250b6727f72b8746404b25ab53a3b88ed`. Root and independent full44 tests pass; code/UI findings were independently verified. See `../employee-mobile-responses/HANDOFF.md` and authored reports for acceptance limits. This does not complete creation/submission ports.
- Third Phase2 batch: swap/cover creation and own Unable-to-work submission, candidate `351e33a1a7ecb04dfb6de01a9674953ea7eff903`. Independent214unit/48integration tests and code/UI/QA acceptance cover current permissions, original reviewed fields, mounted draft/unknown-operation recovery, native task focus and desktop preservation. See `../employee-mobile-creation/HANDOFF.md` and authored reports. The remaining groups below are still Phase2 work.

- Fourth Phase2 batch: own full/partial time off, history/detail and pending withdrawal plus usual/weekly availability, deadlines, split hours, stale/mounted draft and original-operation recovery; candidate `9034533e0e8a55e5e168affcccbb90b850ddeee8`. Independent250unit/58combined tests passed; code approved and UI findings independently closed. See `../employee-mobile-planning/HANDOFF.md` and authored reports. This is bounded local acceptance; the groups below remain Phase2.

- Fifth Phase2 batch: own Hours/raw punches and breaks, canonical period timecards, entry/break/missing-time and approved-missing replacements, own decisions/history, exact retained links and original-operation recovery; accepted application/test candidate `e17a8e7479988a1b7159b714f8a2af9c146f2cd3`. Independent422unit/71SQL-browser tests pass; code finding and UI/QA material findings closed. See `../employee-mobile-hours/HANDOFF.md` and authored reports. This is bounded local acceptance; Phase2 remains active.

- Sixth Phase2 batch, Notifications/Updates: accepted locally with conditions at application/test candidate `8435c3d81734b1fc4bb8ac574368b331a9e99b9d`. The deliberate pending-module regression was reproduced RED and fixed, then fresh review's material recovery/action/accessibility issues were corrected and author-closed. Independent final20-file SQL/browser gate176/176 and77-file unit gate609/609 passed; full nonincremental TypeScript,43-file lint and8mirror source/runtime custody passed. Code/UI/QA authors retain three nonblocking conditions: partial-empty wording, enlarged acknowledgement word breaks and a short dark-page canvas seam. Original NO-GO reports, all failed runs and the inconclusive first compiler attempt remain preserved; the exact compiler recovery passed separately. See `../employee-mobile-communications/HANDOFF.md`, its authored reports, evidence history and gallery. Phase3 remains closed; the groups below are still Phase2 implementation.

## Remaining Phase 2 implementation

1. Own profile, language/appearance preferences, support/legal, contextual return and actual sign-out/device cleanup.
2. Capability-dependent calendar, passkeys, current-device alerts and own deletion-request lifecycles.
3. Own published Pay statements, current payroll/module gates and protected PDF view/download.

Each batch must preserve current role/workspace/session/module authority, source/revision binding, immutable operation recovery, unrelated available capabilities, consistent mobile components and desktop/management separation. Maintain explicit loading/empty/partial/error/refusal/pending/success recovery states.

## Phase 2 exit — required before Phase 3 starts

- Every mapped authorized Phase 2 workflow has a functioning integrated path and maintained tests; formerly source-only groups have direct end-to-end evidence.
- Persisted results match canonical current records and permissions. Simulated receipts, reachable legacy destinations and source inspection alone do not count as completed integrations.
- Required unit/contract/SQL/browser checks pass with exact candidate/environment evidence. Independent UI/QA own acceptance and finding closure for each batch.
- No unresolved material Phase 2 defect, permission regression or desktop/management regression advances.
- The implementation handoff records completed workflows, evidence, remaining nonblocking limits and source/development reconciliation requirements.

Phase 3 then performs combined-system acceptance, actual device/background/assistive-technology checks, performance and release readiness. Those Phase 3 checks remain separate from Phase 2 implementation evidence. Source-inventory reconciliation and production authorization are not waived by either phase.

Current implementation owner: root. Evidence/finding owners: the executing batch and its independent reviewers. No new product code was changed by this sequencing record.

Cloud continuation from phone: Jose approved a feature-branch upload with full source/context. Start at `docs/handoffs/employee-mobile-cloud-2026-10-27/README.md` on `codex/employee-mobile-cloud-handoff-20261027`. This delivery does not complete the current batch or beginPhase3.
