### Spec Compliance

- ❌ Issues found. T05 does not yet satisfy independent workflow operation, displayed-term consent binding, or reliable operation-result recovery. Important findings I1–I3 below block this candidate.
- ⚠️ Cannot verify from this task diff: actual authenticated Next/SQL ServerAction envelopes, browser loss after a real committed transaction, cross-session refresh of both employees’ schedules/hours/coverage/acknowledgements, every compatibility alias and notification entry, final build/wholebranch suites, and the full 98-case audit. Those remain T06/controller obligations; passing fixture/isolated SQL checks is not a claim of those results. Actual device, screen reader, PWA lifecycle and provider delivery also remain unverified.

### Strengths

- `src/components/shift-change-form-state.ts:11` and `:16` preserve one immutable payload/operation through uncertainty, suppress duplicate dispatch, reconcile before retry, and retain uncertainty when reconciliation fails. The focused state tests exercise both committed and null reconciliation outcomes (`src/components/shift-change-form-state.test.ts:4`, `:11`, `:21`). Private notes are not cached persistently.
- `src/lib/data/shift-changes.ts:185` reuses the actual canonical command planner and returns only a finite availability projection. `src/components/manager-shift-requests.tsx:51` checks current viewer-authorized approval availability; unknown mandatory rules do not expose generic Approve. The owned SQL regression verifies the refusal, absence of preview event writes, and unchanged owner (`src/test/integration/shift-change-views.integration.ts:19`).
- `src/components/shift-change-policy-fields.tsx:5`, `src/lib/shift-changes/policy-form.ts:7`, and `src/app/app/schedule/settings/actions.ts:188` retain independent scope revisions, blank unknown values, explicit zero, and Owner-only writes. `src/components/operational-rule-fields.tsx:11` retains explicit applicability, time basis and routing with no customer numeric defaults. Existing Manager staffing/profile authorization is preserved in the surrounding handlers.
- `src/lib/data/exchanges.ts:240` adds bounded callout participation visibility without changing ordinary-reader defaults; `src/app/app/exchange/callout/page.tsx:42` uses the shift end instant so a previous-date ongoing overnight remains reportable. Separate SQL and page regressions cover those cases.
- `src/lib/data/shift-change-views.ts:14` maps history into six explicit presentation fields rather than spreading private events. The SQL test at `src/test/integration/shift-change-views.integration.ts:27` verifies original date/time after live deletion and rejects a foreign peer. `src/components/shift-change-history.tsx:2` distinguishes unavailable history from an empty result.
- `src/app/globals.css:12848` uses component-scoped raw CSS and existing tokens. The reviewed 390px requests and Owner policy images preserve the existing NEVORA surfaces and readable wrapped context; the added controls are disclosures within existing screens.

### Issues

#### Critical (Must Fix)

- None identified in this task-scoped review.

#### Important (Should Fix)

**I1 — A coverage policy refusal hides an independently valid trade workflow.**

- **Location:** `src/app/app/exchange/page.tsx:169`, `:214`.
- `offerViews` is calculated exclusively with an `OFFER_COVERAGE` command, but its `allowed` result also controls whether the Trade Shift link exists. For example, configure valid swap policy while coverage is unknown, or let coverage’s submission cutoff pass while swap’s later cutoff remains open. The canonical coverage preview refuses, and the user loses the normal trade entry even though the swap workflow is independently valid.
- **Why it matters:** This violates the explicit requirement that changing only one workflow’s mode/deadline leave the other workflow unchanged. It also makes the new feature inoperable through the existing surface for a valid configuration.
- **Fix:** Give trade navigation its own source/workflow eligibility decision, or allow navigation to a freshly reviewed swap builder independently of the offer result. Do not duplicate the business evaluator.
- **Focused regression:** Render swap-ready/coverage-unknown and swap-open/coverage-expired policies; verify Trade Shift remains reachable while Offer Shift is refused, then verify inverse cases do not claim swap eligibility.
- **Named focused check:** Examined the unchanged `planCommand` scope selection at `src/lib/data/shift-changes.ts:40` and creation checks at `:102`. It chooses coverage for OFFER_COVERAGE and swap for PROPOSE_SWAP, confirming that the UI combines decisions the core intentionally separates.

**I2 — New request consent can bind to newer terms than the user sees.**

- **Location:** `src/app/app/exchange/page.tsx:169`, `:209`, `:213`; `src/app/app/exchange/swap/page.tsx:45`, `:46`.
- The offer form obtains its fingerprint/episode from a later `readShiftChangeTerms` call, while its displayed ShiftSlot comes from the independently loaded `assigned` reader. If an assignment changes from 08:00–16:00 to 10:00–18:00 between those reads, the page can display the old time but submit the new fingerprint; the canonical writer correctly accepts that fingerprint, so it cannot detect that the user saw different terms.
- The swap builder partially overlays current date/time/position ID/Lead onto earlier reader records, but retains older location ID/name, employee context and position name. A changed target position can therefore display its old position label while the submitted target fingerprint covers the new position. Its source summary also formats `source.startTime/endTime` instead of the reviewed source.
- **Why it matters:** Freshness validation protects the submitted fingerprint, not the relationship between that fingerprint and displayed consent. This breaks the explicit initial reviewed-terms requirement even though final database guards work as intended.
- **Fix:** Construct all displayed material fields and submitted fingerprints from the same reviewed source; resolve labels only against those reviewed identities or use safe identity fallbacks. Alternatively reject any discrepancy between the earlier presentation record and reviewed terms and require reload. Apply this to both source and target, including location, position and owner context.
- **Focused regression:** Inject an inter-read source time change for Offer Shift and an inter-read target location/position/owner change for swap. Assert that the page either shows the exact fingerprint-bound terms or refuses creation; a successful submission must never refer to undisplayed replacements.
- **Named focused check:** Examined `src/lib/data/shift-change-snapshot.ts:28`–`:35`. `readShiftChangeTerms` returns fresh material terms and a fingerprint from one snapshot; it does not reconcile previously fetched display records. The defect is in T05’s presentation assembly, not that reader’s freshness guarantee.

**I3 — Operation-result navigation invalidates cache during Server Component render.**

- **Location:** `src/app/app/exchange/page.tsx:163`; `src/app/app/exchange/actions.ts:9`, `:26`.
- Opening `/app/exchange?operationId=<authorized persisted operation>` invokes `reconcileShiftChangeAction` while rendering the page. That action now calls `refreshShiftChangeResult`, which calls `revalidatePath` for completed/pending/closed results. The installed Next runtime explicitly throws when revalidation occurs during the render phase. A known persisted result can therefore fail the page exactly when the user is trying to recover it.
- **Why it matters:** This breaks the truthful recovery path and is not covered by the existing action mock’s cache-call assertion. A `use server` declaration does not turn a direct Server Component function call into a separate action request.
- **Fix:** Use the authorized read-only operation lookup for rendering URL results. Keep cache invalidation in the actual client-invoked reconciliation action (or another permitted action boundary).
- **Focused regression:** Exercise a real Next render with an authorized pending/completed operation ID and assert the feedback page renders; separately retain the action-path refresh assertion.
- **Named focused check:** Inspected installed Next 16.3.6 implementation, `node_modules/next/dist/server/web/spec-extension/revalidate.js:118`–`:119`, which rejects `workUnitStore.phase === 'render'`. No network documentation or broad app rerun was necessary to establish this installed-runtime restriction.

#### Minor (Nice to Have)

- **M1 — New workflow components are unnecessarily compressed.** `src/components/operational-rule-fields.tsx:9`, `src/components/reviewed-swap-form.tsx:7`, and `src/lib/shift-changes/policy-form.ts:18` pack multiple state decisions and large JSX/data constructions onto single lines. Expand them into conventional formatting and small named render/projection helpers when correcting the blocking issues. This is a readability concern, not a request for an unrelated architecture refactor.

### Evidence and review checks

- Read the brief including its verbatim Global constraints, implementer report, handoff, and Superpowers task-reviewer template. Reviewed the supplied 1,924-line/37-file external diff in bounded passes. Re-read only tool-truncated output portions. No git rederivation, product edit, index/HEAD mutation, browser rerun, SQL rerun or package-wide suite was performed. The only checkout write is the requested mirrored review report.
- The candidate is the external `task5-candidate` snapshot against `task4-fix1`; HEAD remains the reported reserved-final-commit base `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`. This review did not independently rerun git status/HEAD commands, consistent with the supplied review protocol.
- Independently hashed all 37 T05-owned current files against `task5/source-freeze.json`: zero mismatches. Independently hashed all 24 recorded QA resources: zero mismatches. The frozen evidence corresponds to the reviewed candidate.
- Read the final scoped logs: `focused-final.log` records 81/81 tests across 13 files; `sql-final.log` records 4/4 owned SQL tests; `lint-final3.log` and `typecheck-final2.log` contain clean successful output. No warnings were present in those inspected final logs. The earlier 1,323-test run predates final corrections and is not final wholebranch certification.
- Independently summarized `browser-results.json`: 196 changed scene/width/engine rows, zero recorded viewport text-bound/overflow/minimum-control violations, 18 interaction rows, 182 protected comparisons, and zero recorded browser errors. Inspected `browser-qa.mjs`: it actually traverses focus with Tab/Option+Tab, measures pending rectangles, checks live feedback, and asserts final-action clearance after end-scroll. These are fictional source-component/intercepted-action checks; the harness substitutes framework/actions and cannot establish Next render/cache semantics, actual auth or SQL browser persistence. Text-range assertions cover visible non-native-select text against the viewport, not every possible clipping ancestor or real assistive technology.
- Protected screenshots were not automatically accepted. Independently decoded the original three Chromium manager-schedule before/after pairs with the installed image library: each differs by **12 pixels** at x190–195/y162–201. Independently decoded the unchanged-current focused repeats: 768/1024 differ by **30 pixels** at x27–195/y36–201; 1440 repeats are identical. The focused report records identical selected element geometry/styles; its second current frame matches its separately captured focused baseline, not necessarily the original matrix baseline. This supports bounded raster variability, not blanket pixel identity or real authenticated Phase 4 acceptance. Original images remain unmodified.
- Visually inspected `screenshots/chromium-390-requests.png` and `screenshots/webkit-390-policy-owner.png`. Full-page fixed-nav stitching is not itself clearance evidence; the script’s actual end-scroll check is the relevant fixture assertion.
- New home/schedule reader refresh relies on existing shared routes rather than gratuitous changes to `src/app/app/page.tsx`; that conditional T05 modification is not a missing-file finding. Complete simultaneous multi-user refresh remains T06 proof.

### Assessment

**Task quality: Needs fixes.**

**Reasoning:** The finite command UI, explicit policy controls and scoped evidence are useful and largely well separated. Three concrete integration defects remain at the independent-workflow, displayed-consent and Next render/action boundaries; the candidate should return to the original UI owner for bounded fixes and targeted regressions before T05 approval.
