# Role fixture classifier publication review

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES
blockers: M1 live-replacement selection and M2 failure/fallback temporal matching below.

## Findings
CRITICAL/HIGH: None assigned.
MEDIUM M1 — completed source entry is selected instead of the live replacement. scripts/role-redirect-diagnostic.mjs:50 selects the first same-address source/report document request before the console events. Actual attempt9 trace begins with a same-address source-entry request that commits/finishes well before the later Reports replacement. Line53 therefore rejects that completed entry, without considering the actual live replacement. The positive test fixture lacks this normal initial navigation history. Select the uniquely live eligible replacement at fallback observation time, rejecting ambiguity; add a positive case with completed source-entry history before the real replacement.

MEDIUM M2 — a future unrelated RSC failure can justify an earlier fallback. scripts/role-redirect-diagnostic.mjs:40-47 validates count/identity and request-before-failure but never requires failed attempts to precede the matched console fallbacks. A direct control moved the fixture's sole RSC failed event until after the final home document finished (elapsed51); assessor still returned errorIndices[1]. That later failure cannot establish the asserted earlier fallback association, yet finalization would remove its fatal error. Add temporal pairing constraints and negative coverage for failures after fallback/destination; keep unmatched cases fatal. Do not infer abort semantics while fixing this.

LOW: caught entries match document/control/count/sequence and a broad row time interval, not a transport request ID. Target attribution and sequence reduce ambiguity, but any future claim of exact per-request linkage must acknowledge this limit. Current report decisions appropriately retain transportReason unknown.

## Direct evidence
Ran only two small in-memory checks using the exported assessor and existing test fixture (no browser/network/suite or file edits). Adding completed source-entry request/response/commit/finished records before an otherwise valid fixture returned []. Moving its RSC failed event after destination finished returned [1]. This independently confirms M1 false rejection and M2 false acceptance. Existing test fixture was read, not changed. No application/CSS diff found.

## Controls retained and source review
Reviewed new role-redirect-diagnostic.mjs/.check.mjs, observer attribution, report navigation changes, fixture lifecycle flags, finalization placement and package registration. Attribution projects same-origin allowlisted targets without retaining URL/query values, uses binding source frame rather than supplied main-frame claims, and retains bounded captured records. Console arguments/receiver/return remain forwarded. Role mutation/storage trigger, employee destination/private-source checks and awaited restoration remain. scenarioComplete is set only after scenario loop; runtimeClosed only after browser/app/SMTP closure. Existing cleanup exceptions stay fatal. Finalization copies rawErrors and leaves caught data intact, removes only indexed matching role strings, and adds fatal errors for every unclassified caught event. Native/window errors block assessment; no new native exemption. Old artifacts lacking metadata fail closed.

The positive/negative calibration checks are substantial and require same-run control outcomes, not only an observer flag. Unrelated report errors remain fatal even when a role string is indexed. Existing scenario deadlines remain. Tests cover many semantic negatives, but omitted the two event-history cases above. The synthetic positive contains only the minimal core and therefore does not yet establish compatibility with the complete real trace.

## Perspectives and limits
remove-ai-slops/programming perspectives applied from previously consulted skills: this is a narrowly scoped test diagnostic contract, not production parsing. However event-order validation must model the real lifecycle rather than just mirror the favorable fixture. The requested regressions exercise correctness, not removed behavior or incidental constants. Parent's145 passes/local attribution controls were not independently rerun. No cloud/runtime acceptance or classification of actual historical errors. Prior reports preserved; no-ULW-plan fallback used.


## M1/M2 closure addendum

Updated codeQualityStatus: WATCH
Updated recommendation: APPROVE publication of this bounded fixture rule
Remaining blockers in reviewed patch: None. Actual cloud acceptance and separate phone geometry failure remain outstanding.

Re-inspected corrected assessor and three added regression cases. M1 is closed: the matcher now considers same-address main-frame replacement requests with consistent identity/type/resource, exactly one terminal event, and no commit or terminal before the final fallback; exactly one candidate must remain. Completed source-entry history is excluded, while two apparently live candidates fail closed. M2 is closed: each failed role-home RSC event must precede the corresponding fallback in ordered event history, so a later destination-era failure cannot justify the earlier log.

Independently ran only the small pure classifier suite: node --test scripts/role-redirect-diagnostic.check.mjs, 12/12 PASS, duration35ms. This includes the completed-entry positive, late-failure negative and ambiguity negative, relative timing/request-ID variation, raw/unmatched preservation and scope/processing/window/native/truncation/cleanup/calibration negatives. No browser, heavy suite, external mutation or app/style edit.

The LOW association limit remains: correlation is based on same-document target/sequence and ordered request evidence, not an exact browser fetch-to-console transport ID. The rule describes a fixture acceptance contract, not proof of abort/root cause. Raw errors and caught records remain retained, unknown reason stays unknown, unmatched evidence remains fatal, and historical native errors are not accepted retroactively. No release certification. Initial findings and all prior reports preserved.
