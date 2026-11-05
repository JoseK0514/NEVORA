# Android foundation decision packet

Phase1 implementation continues under Jose's approved Android10+/WebView149+ baseline (November4). The runtime gate and update/browser fallback still require implementation and final verification. No architecture change, renderer override or accessibility waiver has been accepted.

## Established evidence

- API32/WebView120: the current default-mode ten-recreation regression failed on cycle2. DOM Sign out exists, is enabled and visible in a focused document, while the accessibility target is absent. A single public content-change event did not restore it.
- A fully delegating, temporary AccessibilityNodeProvider observer reproduced the failure on cycle0 and returned the same node objects unchanged. The form node had zero children before framework serialization. No null provider nodes appeared in that matched subtree. This locates the observed gap in provider output; it does not prove the provider's internal cache mechanism. The observer was removed and is not qualification evidence.
- API36/WebView133 also failed default-mode checks: missing Fictional Home after renderer-containment navigation and missing Sign out after recreation cycle4. Its separate Owner cold-process restart passed. This is not solely an old Android12 image issue.
- Delayed accessibility publication, initial INVISIBLE layout, and laid-out visual-commit barrier experiments all failed. Exact sources and failed results remain in the evidence directory; none is retained in application code.
- Actual API36 Next/PostgreSQL Employee/Owner journeys and cold restart passed on commit59bcdf9f, with default renderer settings and no observer. The enclosing all-platform run later failed its process monitor during iOS, so it is not an overall all-platform pass. Independent final runs at0231524b subsequently passed all18namedbackendchecks on each platform, with ownership closure and source verification.
- iOS27's final seven-case fixture matrix passed; this does not establish minimum-version/physical-device acceptance.

## Constraints any design must preserve

Actual document QA also exposed an absent WebView subtree on API36 while native confirmation buttons remained fully exposed. Visual pointer actions completed that functional test only; accessibility acceptance remains red.

The existing window-focus retirement protects against a reproduced Recents privacy leak: an Activity may remain resumed after losing window focus. Do not retain/reveal the old private document merely to preserve accessibility state. Keep browser-owned HttpOnly cookies, fresh protected server navigation on resume, closed page/lifecycle capability gates, no cookie/token export, exact-origin routing, protected snapshots, native Back/draft behavior and server role authority. Full default-mode Android acceptance remains required.

## Decision and next gate

Jose selected review of the current WebView/AndroidX stack, authorized necessary test-software installation when no physical device was available, then approved “Adopt the modern runtime baseline (Recommended)”: Android10+ and SystemWebView149+, with a native update/browser fallback for older providers. Android8/9 native support is excluded from v1; existing web/kiosk behavior remains unchanged.

The [review evidence](evidence/2026-11-04/webview-stack-review/README.md) records unchanged-source provider comparisons. Google SDK149 passed the original ten cases plus cold restart on both Android32 and37.2. Original120 failed before and after a newer development-engine comparison. Standard selectors did not fix the failure when polling was matched. The historical135root-ID fix was insufficient in the full matrix. No slow-polling/helper/startup workaround is retained.

The [approved compatibility proposal](android-runtime-compatibility-proposal.md) and [execution plan](../superpowers/plans/2026-11-04-android-runtime-baseline-plan.md) define the bounded correction: minSdk29, strict WebView149+ admission, native update/browser fallback before private content, and the original supported-runtime matrix plus real old-provider coverage. SDK evidence is not retail GooglePlay, physical-device, hosted or store certification. No independent release finding is self-closed.

The Systematic Debugging human discussion has occurred; the earlier unanswered-direction question is resolved. No further product decision is currently pending for this bounded scope. Complete implementation, source/provider custody and final checks before marking Phase1 complete.

## Primary references

- [Chromium120 accessibility provider and Java node cache](https://chromium.googlesource.com/chromium/src/+/refs/tags/120.0.6099.193/content/public/android/java/src/org/chromium/content/browser/accessibility/WebContentsAccessibilityImpl.java). Cache presence supports investigation only, not root-cause attribution.
- [Android WebView visual-state callback contract](https://developer.android.com/reference/android/webkit/WebView#postVisualStateCallback(long,%20android.webkit.WebView.VisualStateCallback)). GONE needs fixed layout dimensions; INVISIBLE must be attached and made visible from the callback. Meeting this contract did not remove the accessibility failure in the recorded experiment.
