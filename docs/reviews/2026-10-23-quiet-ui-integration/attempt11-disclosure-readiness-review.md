# Disclosure readiness CI patch review

codeQualityStatus: WATCH
recommendation: APPROVE publication for matching cloud verification
blockers: None found in the three-file patch. Actual-role navigation errors remain unresolved and fatal; no current failed cloud artifact accepted.

Reviewed immutable local commit8df2b63692b5c8a54b649dd0536518a7830da785: browser-render-readiness.mjs/.check.mjs and phase-d-report-keyboard-qa.mjs only. No app/style change. Actual attempt11/phase-d/nevora-phase-d-remediation-evidence/report.json has21 checks and seven errors: Chromium320/375/390/430 and WebKit320/375/390 each fail at the person value innerText assertion with empty string versus8 h. WebKit430 proceeds. The preceding summary-value assertion and native-open/focus assertions occur before that failing line. This fits measuring content before the existing native disclosure transition has exposed it; raw evidence alone does not prove that timing is the sole cause.

CRITICAL/HIGH/MEDIUM/LOW: No actionable finding in this bounded patch.

The helper requires the same connected details element to be open, ::details-content not hidden, and all finite subtree animations finished/not pending before measurements. It uses one15-second readiness budget including element lookup and checks the deadline again after settlement; element and returned JSHandle are disposed. Infinite animations are ignored so decorative perpetual motion cannot block readiness. It does not finish/cancel app animations, force open state, replace text, or catch and discard assertion failures. Closed content times out. Existing actual value, visibility, full name/value geometry, focus/keyboard traversal, canonical link, accessibility, overflow and wide-table assertions remain. The wide branch's unbounded animation-finished wait with swallowed rejections is replaced by the same bounded helper.

The added controlled-browser case loads actual portal-motion.css, whose details::details-content transition at lines80-85 is200ms. It opens via keyboard, pauses finite animations at their start only inside the isolated control, confirms readiness has not settled when animations exist, finishes them and verifies rendered8 h. A closed disclosure negative must time out. Existing Chromium/WebKit and motion/reduced-motion matrix is preserved. This tests render synchronization rather than merely mirroring a CSS duration constant. Whether browsers expose finite animations is recorded; when they do not, the control does not pretend it exercised the paused-animation branch.

Publication does not certify the authenticated portal. Parent's native check/lint were in progress and not independently run/reviewed here. No tests/browser/heavy work/network/external mutation by reviewer. The original15-second action timeouts remain; the explicit readiness step adds a bounded render wait before synchronous assertions, not a retry of a failed action or a weakened geometry requirement. If authenticated values still fail after readiness, preserve that evidence for Claude; do not change app/UI here. Native classification is unchanged and remains separate.

remove-ai-slops/programming perspectives applied from previously consulted skills: small shared test helper, real CSS behavioral control and negative closed-state test, no removal-only tests or production complexity. Prior reports preserved; no-ULW-plan fallback used.


## Exact-source finite-animation control addendum

Inspected commit4231b5d6b064fbfa97cf9e5c2045e7c2dd28390f against8df2b63692b5c8a54b649dd0536518a7830da785. Exactly four lines are added to browser-render-readiness.check.mjs; helper, driver and application files are unchanged. Recommendation remains APPROVE / WATCH; no new blocker.

The addition creates a real finite Web Animation on the disclosure's child, pauses it, requires readiness to remain pending across a render turn, then explicitly finishes it and requires readiness to settle. This independently exercises the finite-descendant-animation branch even when browsers expose zero animations for native ::details-content transitions. The existing actual portal-CSS case and closed-disclosure negative remain. The500ms value is a controlled fixture parameter, not a hardcoded application wait or substituted application motion. The test deliberately pauses fixture motion only.

Evidence precision: parent reports the original four-cell run exposed opening.animations=0 throughout, with both no-preference engines showing open:true/renderedText empty before later8 h. Therefore that original run exercised content visibility readiness, not the finite-animation branch. Parent reports the final four-cell run now additionally records pendingObserved:true/ready:true for the explicit child control in all cells, closed negatives, source custody and browser closure, plus158 release checks/lint passing. These execution artifacts were not independently rerun or re-read in this addendum; only the immutable delta was inspected. Neither controlled case certifies the authenticated application. Published d6ce cloud failures remain failures and are not retroactively accepted. No app/UI changes or new runtime classification approved.
