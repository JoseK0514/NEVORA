# Employee Hours coverage against the desktop source baseline

This is the bounded Hours batch; other Phase2 groups remain open. The historical34-group baseline is preserved in `../employee-mobile-phase1/workflow-baseline.json`.

| Baseline group | Integrated mobile path | Authority and evidence |
|---|---|---|
| recorded-time — Own clock status, punches and breaks | Hours → current status / original entry detail | Own recorded time. Protected own reads/actions, unit/SQL contracts and actual three-engine journeys; scope/limits in HANDOFF.md and independent reports. |
| timecards — Own period timecard/details/history | Timecards → selected period / effective versus original / history | Own card; no Employee approval/finalization/export. Protected own reads/actions, unit/SQL contracts and actual three-engine journeys; scope/limits in HANDOFF.md and independent reports. |
| entry-correction — Propose completed-entry correction | Closed entry → Request a correction | Own completed/effective source entry. Protected own reads/actions, unit/SQL contracts and actual three-engine journeys; scope/limits in HANDOFF.md and independent reports. |
| missing-time — Missing entries and completed-break corrections | Corrections → missing time; closed entry → recorded break; approved missing time → replacement | Own time and permitted source/location. Protected own reads/actions, unit/SQL contracts and actual three-engine journeys; scope/limits in HANDOFF.md and independent reports. |
| correction-history — Correction decisions/effective-time history | Corrections → Waiting / Decided / exact own request | Own proposals and source baseline. Protected own reads/actions, unit/SQL contracts and actual three-engine journeys; scope/limits in HANDOFF.md and independent reports. |

No Employee/Lead approval, finalization, reopening, manager export or Clocker punch-recording authority was added. The existing canonical owners retain refusal and review rules. History/source windows are disclosed; exact retained own requests and old own targets have direct SQL regression evidence. Full frozen acceptance remains recorded separately from individual source bindings.
