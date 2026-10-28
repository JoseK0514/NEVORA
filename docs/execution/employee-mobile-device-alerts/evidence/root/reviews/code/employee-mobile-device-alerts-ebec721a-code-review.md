# Device alerts independent delta review — ebec721a

Candidate: `ebec721a3d6cfd842a5037fc4598b77e2454d9e8`. Delta reviewed: `b368200d33e6c3498d468f2ea386b99c21a68b3a..ebec721a`; overall base remains `059f4ac2fbd4cc50bb526bb0f1001465de2e2ce2`. Same local continuation branch. Prior original NO-GO and b368200d conditional disposition remain preserved.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE** for bounded local continuation.
- Independent disposition: **GO WITH CONDITIONS**.
- blockers: No newly established CRITICAL/HIGH code defect in this six-file delta. Full acceptance remains dependent on actual source-bound owned-browser/SQL results.

## CRITICAL
None identified.

## HIGH
None identified in this delta.

The reviewed-generation fence is coherent: `DeviceController.turnOff(expectedGeneration)` compares the explicitly reviewed value with the live cleanup/current/local generation before native/server side effects. The mobile page passes the captured reviewed generation or retained original cleanup generation through the shared provider; null explicitly means no reviewed generation, whereas undefined preserves the incumbent legacy call contract. A stale closure cannot silently target a replacement generation. Existing pending original cleanup still takes precedence over subsequently observed replacement state.

The self-test catch now invalidates current controls on401 and authentication-related403 while retaining the separate test_not_allowed response. The original before/after unit scenarios ran independently and passed. This fixes local display/command retirement without relaxing server authorization.

## MEDIUM
No new actionable medium issue identified. Existing DEV-CR-2 browser execution remains pending; its completed-refresh barrier is still present. No actual run03 pass is asserted by this code review.

## LOW
None added.

## Evidence inspected and independently executed
- Read all six changed files: device controller and tests, page/view and tests, shared owner, owned browser integration.
- Independently ran the same eight focused files used in the earlier review: **149/149 tests PASS**, `focused-unit-ebec721a.log`. Includes the stale confirmation target regression, authentication refusal retirement, original-generation replacement recovery, canonical route/protocol and original popover regression checks.
- `git diff --check b368200d..ebec721a`: PASS.
- New fictional endpoint per browser engine reflects independent installations; it does not bypass or weaken real endpoint ownership validation.
- Added browser supplement covers feature-off roles and fictional install/unsupported boundaries; three-engine main journey adds both-theme enlarged controls and coarse landscape. These are source-inspected intentions until actual results are available.
- Cancellation label now correctly preserves current setup without implying enabled state; unknown cleanup copy avoids asserting success. No new UI authority granted.

## Skill perspectives
Previously read programming and remove-ai-slops criteria reapplied. New controller tests assert forbidden side effects and state retirement, not implementation constants or requested removal. UI wording assertions are limited to actual user-visible states/actions, not LLM prompt tests. No new parsing, normalization, dependencies or needless architectural layer added. Optional reviewed generation extends the existing canonical seam rather than creating a second cleanup engine. No new violation requiring changes established.

## Conditions and retained limits
Run03 is exclusively executing under the parent; this reviewer did not launch competing browser/SQL work. Independent UI finding closure belongs to its author; code review does not self-close DEV-UI1/2. CR-1 bound-cookie repair remains at the previously independently verified scope; legacy unbound cookie rewriting remains a retained boundary. CR-2 actual browser evidence must be inspected before feature acceptance. Current review supplies no physical device/native OS, assistive technology, provider, hosted or production certification. Keep historical13 baseline unit failures, process-observation instability, CalendarQA-CAL1 and Communications conditions visible. Any later source changes require delta review.

Original report and reproduction preserved. No application, repository tests or configuration modified by this reviewer.
