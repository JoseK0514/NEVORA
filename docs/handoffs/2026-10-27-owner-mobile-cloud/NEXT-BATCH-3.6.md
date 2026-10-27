> GitHub reading copy. Internal file paths refer to the extracted package. Start with [README.md](README.md) for the one-command extraction. The full original is preserved in the payload.

# Next bounded implementation: company/location policies and history/conflicts

Status: **NOT STARTED**. Section3.5 is complete; read START-HERE.md first. Scope: C-08/C-09 in outputs/owner-mobile-current-coverage.json, isolated mobile Owner mockup. Finish this journey before3.7. This is a starting brief, not a substitute for reading the exact source contract and writing the implementation plan.

## Owner job

Understand which operational alerts apply to the whole company or a location, deliberately configure/disable/inherit each supported rule, review the consequence/current revision, save safely and inspect history or recover a conflicting/unavailable revision without losing a draft or private labor values. Use the accepted focused settings screens, native controls and calm review/status language. Avoid displaying all advanced fields at once.

## Read-only source to inspect first

All paths below are under reference/application, pinned to46e202786863279302026ee03a0e225c359fa55c:

- src/app/app/settings/company-policies/page.tsx and company-policies.css, loading.tsx and page.test.tsx.
- src/components/company-policy-editor.tsx and company-policy-editor.test.tsx: exact field modes, full snapshot builder, current/historical review, inactive scope, retained command, conflict and replacement behavior.
- src/lib/business-improvements/company-policies/model.ts, service.ts, history.ts and their tests: settings/command validation, current revision, authorization/replay/conflict behavior. **This is a different command protocol from workspace presentation; do not copy the features-save schema.**
- src/app/api/company-policies/route.ts and route.test.ts: actual accepted responses/errors/guards.
- src/lib/business-time.ts and related date/time tests: effective dates in the company timezone, ambiguity/skipped DST handling. Use rg for referenced dependencies/migrations after reading these files.
- Current mockup work/owner-mobile/company.js/company-store.js for settings entry/departure guards; locations-store.js for stable IDs/active/inactive labels; attendance/workforce/schedule/timecard code for source dependencies that policies can affect. Preserve current branding/feature gates.

## Requirements already established by the inventory/source scan

Six operational rule families: lateness, early departure, missing clock-in, missing clock-out, actual-time overtime risk, unusually long entry. Company/location scope. Unset/inherit differs from explicitly disabled(null), and configured rules have thresholds/comparison/effective instant plus family-specific basis/window/aggregation/association/cutoff fields. Re-read exact allowed values/ranges before implementing. Do not replace source unset with a fabricated0.

Private labor values (compensation reference, employee rates, budgets, calculation-method reference) are preserved exactly by the full reviewed snapshot. This UI is not their authoring tool. A replacement draft must include/review them in full. Do not discard private sections while editing attendance rules or expose them in public output.

Inactive or removed locations retain historical policy review and are read-only. Unavailable current revision must not silently activate an older valid one. If an earlier valid revision can seed a replacement, review the whole replacement and append a new revision; retain original history and identify its source/current revisions. Source/permission failures pause editing and clear protected content appropriately. Conflict comparison and deliberate discard do not silently merge/overwrite. Unknown saves preserve the original command and permit only source-supported recovery, including matching operationId in refreshed history; no invented universal receipt endpoint.

## Suggested execution order

1. Inspect existing preview and complete source; record exact fields, actions, command/response shapes, gates, save boundary, readers, failure and recovery states in a new work/owner-policies/{brief,source-contract,plan,ledger}. Capture current source/ artifact SHA and before snapshot. Reuse existing accepted list/header/control primitives.
2. Model scope/revision/history/command transitions independently from rendering. Add meaningful cases before mutation/UI wiring; preserve private fields, source authority and operation identity. Do not treat in-memory simulation as backend authorization.
3. Implement the useful path: Settings→policies→scope/current rules→focused edit→review if needed→save/result→meaningful return; plus history, conflict, unavailable replacement, dirty departure and retained unknown command. Split into coherent pages where necessary; keep C-08/C-09 as the single owned policy workflow rather than expanding to payroll setup.
4. Verify company default/location override/inherit/off, no locations, inactive/historical scopes, known/unknown failure, current-read failure, concurrent revision, paused/offline/ended authority, dates/DST, long labels,200% text, keyboard/focus, exact Settings/location return and affected attendance/Schedule/Team/timecard neighbors. Native date/time/select semantics remain.
5. Run source/build/model/browser checks, inspect actual320/390/430px100/200% captures and current styled contrast. Save hash-bound evidence and one final whole-slice review if supported/required. Repair material findings and recheck final source. Update only C-08/C-09 after verified completion, then next3.7. OverallSection3 closes only after3.9 and its connected walkthrough.

The complete definition of finished is outputs/owner-mobile-quality-gates.md and the delivery plan. Field-level source discovery remains the first task; this handoff does not invent undocumented endpoints, eligibility or receipt semantics.
