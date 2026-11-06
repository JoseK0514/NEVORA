# Android accessibility runtime correction — proposed November 5

Status: **approved by Jose on November5; final verification in progress**. Jose selected “Adopt156.0.8078.50+ (Recommended).” Android10/API29 remains unchanged. The prepared patch is now applied locally; no release is authorized.

## Proposed correction

Require **Android System WebView156.0.8078.50 or newer**, retaining Android10/API29 as the app minimum. Compare all four numeric version components; a major-only156 check would admit earlier unqualified156 builds. Unknown, malformed, missing and older providers use the existing native Update WebView / Continue in browser screen before connecting to private content. No session, cookie, authorization, privacy, notification, routing or renderer setting changes.

The [policy patch](evidence/2026-11-05/android-recreation-investigation/runtime156-proposal.patch.gz) is applied locally. It changes the admission comparator, independently derived numeric boundary tests, and the two outdated-runtime UI profile preconditions. The original ten-recreation assertion, exact accessible targets,20second budget and100ms polling remain unchanged.

## Evidence supporting the proposal

On the **same owned Google Play API37.1 emulator**, unchanged app/test source hash `59432cadc11f5e2b704f6fafb13202f1baa82f7c33adb032b1a225fd60859198` failed at recreation9 on149.0.7827.5. The raw accessibility document had zero children while its complete, focused, visible fictional DOM contained Home and Sign out. Clearing Android's client cache did not recover them.

Updating only WebView through authenticated Google Play installed156.0.8078.50. Its signature matched the factory Google provider (`6faf3c4140407473400934d117815a21af1cfefc5c0bee61c858bc3d72ba6fe5`); APK SHA256 is `e22c91cdd90bdc7c505fc9924a15ccaca7c1a3a1164a3f7e5b0f80a9f13576de`. The original regression passed20additional runs of10recreations each (200recreations), plus a separate complete ten-case matrix and independent cold restart. Default platform accessibility was used, with no runtime flag or observer. No failed run was converted to a pass by diagnostics.

The private guard candidate has two observed RED tests: the original149 gate admitted the reproduced broken provider, and an initial major-only156 draft admitted earlier156 versions. The precise four-part comparator then passed all28JVMtests and Debug/app-test compilation. An initial full-suite attempt lacked the copied registration-vector fixture; the original contract was copied unchanged and all assertions retained. Real old-provider fallback and final committed-candidate backend checks remain next gates.

The relevant [Chromium per-WebContents initialization fix](https://chromium-review.googlesource.com/c/chromium/src/+/8464344) is present in157.0.8103.38, **not** in the Play-delivered156.0.8078.50 source. Therefore the observed recovery is attributed to the tested provider update, not to that particular patch. The exact internal correction is not isolated. Full evidence and limitations are in the [investigation packet](evidence/2026-11-05/android-recreation-investigation/README.md).

## Scope, controls and remaining gates

CTO recommends the smallest supported-runtime correction over another unproven lifecycle workaround. CPO flags the customer compatibility change from149 to156.0.8078.50: older providers must update or use the browser. CISO retains closed private entry and all lifecycle/session fences. Technical assurance requires continued failures to remain visible and limits this evidence to owned emulators. Jose has approved the new minimum; the original accessibility test remains required. Delivery keeps final candidate verification unfinished.

The approved patch is applied. Actual149 update/browser-intent and fontScale2/landscape/keyboard cases passed. Missing-provider setup on API37.1 still exposed a provider and failed its precondition; that is not a product pass. The fresh API32 missing-provider control and final current-guard10-case matrix/cold restart passed. The owned18-check Next/PostgreSQL gate with3native journeys remains the next gate. Minimum-OS/physical accessibility, hosted environment, signing/provider and store release checks remain separate. Paid hosting is on hold; no production, branch integration, push or distribution is authorized.
