# Independent Employee/Lead mobile passkeys UI review

Status: INTERIM — awaiting corrected completed browser run. No acceptance claim.
Candidate examined: b93a155b64f0273782a47e0efedbc00b2fe59bb1; base592d4212.
Reviewer owns all findings and closure; no product/test/config changes or runtime starts.

Authority: AGENTS.md, independent UI oversight skill, DESIGN.MD as scoped by docs/product/specs/employee-mobile-teal/README.md, incumbent Profile/Calendar, passkeys-plan.md.

## Findings at run04

- UI-1 VERIFIED (captured Chromium visual samples): light/dark320/390/430 show coherent teal palette, regular Phosphor key/caret, readable own metadata and deliberate hierarchy. Directly inspected run-04/chromium-{light,dark}-{320,390,430}.png and chromium-empty.png. Intro contrast measurements captured in failure.json are5.42085 light and7.71297 dark. These measurements concern intro text, not a full contrast audit.
- UI-2 BLOCKER (evidence, medium): run04 stops at ambiguous getByRole('group') focus assertion; native details is also a group. failure.json records exact strict-mode error. This is a harness ambiguity, not an observed product failure. Keep focus, unsupported/uncertain/denied and remaining engines are not completed by run04.
- UI-2 BLOCKER (evidence, medium): text200 captures show wrapping headings/metadata and enlarged two-column navigation. At320px the relevant action controls fall below the screenshot. Need explicit enlarged-text focused action/confirmation reachability above measured navigation, and mobile loading/error/paused/pending states. Source semantics are not actual UI verification.
- UI-3 VERIFIED (visible review copy): chromium-FAILURE-layout-focus.png shows named removal target, explicit sign-in/device/signout effects, last-key/password consequence and Keep before Remove. It visibly shows group focus. The failed assertion does not establish exact focus programmatically or Keep return.
- UI-1 RISK (scope): shared desktop extraction matches incumbent markup by direct diff and chromium-desktop-pending.png shows incumbent pending presentation. Ready/removal desktop visual equivalence is not established by that screenshot.

No material product visual issue observed in the inspected captures. Final GO/conditions/NO-GO is pending complete evidence. Physical OS prompts/credential stores, real devices, assistive technology, hosted/production release remain unexecuted. Calendar QA-CAL-1 remains unrelated OPEN RISK.

Evidence custody: .omo/evidence/passkeys-independent-ui/run04-inspection-manifest.json in the reviewed repository. Preserves paths, nonempty sizes and SHA256 for captured artifacts.

## Run05 interim update

Candidate c98c982d is tests-only relative to b93a155b (verified diff). Run05 remains failed, at lost-removal; do not call it passing. failure.json records eight completed Chromium checks before that stage; WebKit/Firefox not reached.

- UI-2 enlarged-text evidence gap CLOSED for Chromium Add/Remove/help controls at320/390/430 in light/dark: critical() source checks44px dimensions, viewport bounds, bottom above nav top and no internal overflow. Directly viewed chromium-light-320-text200-add.png, chromium-dark-320-text200-remove.png and chromium-light-320-text200-help.png. Screenshot text/actions are legible and above nav. This does not prove physical-device zoom or enlarged removal-confirmation flow.
- UI-2 previous ambiguous-group evidence gap CLOSED for Chromium by named removal group assertion and completed Keep-return check in failure.json; screenshot chromium-remove-review.png captures the consequence review. Other engines remain pending.
- UI-2 mobile loading/options/device/paused/read-error evidence VERIFIED in directly viewed matching screenshots; metadata absent on paused/error and recovery explicit. Controlled native prompt is a fixture, not native OS UI.
- UI-2 remaining BLOCKER: lost-removal stage failure prevents complete unknown/removed/denied and remaining-engine evidence. No UI product failure inferred from incomplete run.
- UI-1/2 capture ISSUE, low: chromium-verifying.png places the verifying state below fixed nav, and chromium-unsupported-saved.png shows top of Profile without passkeys. DOM assertions support state existence, not visible presentation. Retarget screenshots to relevant status/control.

New artifact custody: .omo/evidence/passkeys-independent-ui/run05-inspection-manifest.json. All earlier failed artifacts retained.

## Run06 interim update

UI capture issue CLOSED: directly opened run-06/chromium-verifying.png and chromium-unsupported-saved.png show their exact passkey status/control above navigation. Verification has calm progress without false completion; unsupported creation retains metadata and Remove with explicit explanatory copy. chromium-remove-review.png shows the focused last-key group and both actions above nav. Remaining evidence blocker unchanged: failure.json records lost-removal failure before unknown/removed/denied or other engines complete. Route-fixture cause is not established by this UI review.

## Run07 — independent material finding

Candidate e3b2bea09e79f63de2cb8b3f692e70ad51a561f3, tests-only changes since b93 application; result.json reports36 completed checks across Chromium/WebKit/Firefox. Direct inspection confirms unknown-removal, removing, removed and denied states are honest and readable. Earlier runtime evidence blockers are resolved by this completed run; physical-device/AT/release limits remain.

**UI-PK-1 / UI-2 ISSUE, medium, OPEN: Firefox removal review keyboard focus destination has no visible outline.** Exact scenario: on saved key, focus Remove and press Space; controller focuses the inline confirmation group. The source asserts activeElement is the group, but styling only uses :focus-visible. In run-07/firefox-remove-review.png no ring is visible, while run-07/webkit-remove-review.png and chromium-remove-review.png show the blue ring. This loses the visible cue at the keyboard focus destination. Root notified; reviewer does not implement. Closure requires Firefox reproduction with computed outline assertion and fresh visible screenshot, plus cross-engine relevant scenario rerun. Recommendation at this interim point: NO-GO for complete UI acceptance until UI-PK-1 is closed.

UI-1 and UI-3 have no material open observed defects. Supporting text contrast in result.json remains a partial audit (intro only); no all-colors contrast certification. Unknown state explicitly requests refresh and shows no invented completion. Success requires fresh own list. No amber-warning baggage or management controls observed.

### Run07 gate correction

Root supplied invocation.json; reviewer directly read it and stdout's suite counters. Although result.json says passed and36 journey checks completed, stdout records `Errors 1 error` (unhandled rejection). **Run07 is a FAILED gate.** Its screenshot observations stand as observations; they do not establish a clean browser gate or complete readiness. Exact argv/environment reconstruction limits are in run-07/invocation.json. A clean relevant full rerun remains required in addition to UI-PK-1 closure.
