# Employee Profile — final author-owned UI closure

**Recommendation: APPROVE. UI disposition: GO for the bounded Profile batch on frozen `4bf7257950f898b97b93293470f0677bdb70b6bf`.** This is a UI gate only; independent combined QA, physical-device/AT, hosted and release gates remain separate.

Reviewer: `/root/profile_local_ui_review`, original author of UI-PROFILE-001/002/003. Original NO-GO and the f52f314e conditional addendum remain immutable. This report supersedes only the remaining canvas disposition, based on new evidence.

## Findings by severity

- **CRITICAL:** none identified in this bounded review.
- **HIGH:** none identified in this bounded review.
- **MEDIUM:** none open. UI-PROFILE-001 (enlarged label line spacing) and UI-PROFILE-002 (visual versus DOM order) remain author-closed by the preceding addendum. Their source implementation did not change in the current diff.
- **LOW:** UI-PROFILE-003 is now **VERIFIED CLOSED**. The previously accepted status-notice inset remains. All three current Chromium/WebKit/Firefox held-native-signout PNGs personally inspected here show the semantic dark canvas continuously from the content to bottom navigation. The former large pure-black region is absent, including the former WebKit strip above the navigation. Notice and disabled submit button retain the same horizontal inset.

## Why closure is supported

`src/components/employee-mobile/profile.css:3–6` removes duplicated outer-frame bottom padding, retains semantic bottom spacing on the inner page, and supplies the inner Profile/document page a viewport-minus-navigation minimum height. The styles remain inside the approved Employee mobile media and selector boundary and use existing tokens. This is not a new visual system or a raster replacement.

The new assertion at `src/test/integration/employee-mobile-profile.integration.ts:128` compares the actual held-signout Profile bottom with the navigation top, allowing only a 1px tolerance. Its position in the test is after the real native submit is held and before logout is released. Existing recorded three-engine completion therefore includes the assertion. Pixels, source and this meaningful geometry regression corroborate each other. I did not independently run the test or use its pass status as a substitute for viewing the screenshots. Parent-reported earlier RED runs are not independently certified here.

## Current evidence personally inspected

Ten current PNGs are listed with absolute paths and SHA256 hashes in `PERSONALLY_INSPECTED_PIXELS_CANVAS_CLOSURE.json`:

- Three engine-specific held-native-signout screens, all showing uninterrupted canvas and aligned notice/button.
- WebKit 320px/200% Profile viewport and Chromium enlarged full Profile: account label spacing remains legible, sign-out clears the enlarged navigation, and work/settings/Calendar order remains coherent.
- Firefox light390 full Profile: existing hierarchy, native inset selectors, account actions and token treatment retained.
- WebKit normal light Support plus enlarged light Support viewport; Chromium enlarged Privacy viewport and Firefox enlarged Terms viewport: contextual headers and long titles reflow without new horizontal clipping in these samples.

Tall full-page images may be downscaled by the image renderer and place fixed navigation at capture scroll position. Their layout was reviewed, not every legal word at native scale. This is not an exhaustive all-device legal-content audit.

## Provenance and gate boundaries

Current HEAD resolved to the full candidate above; git status was clean. `local-canvas-green-2/owned-next-iZ2o3q/source-manifest.json` names that candidate. I independently matched current SHA256 values for profile.tsx, profile.css and the Profile integration test to the manifest. The owned runtime record reports closed=true, sourceVerified=true and mirrorVerified=true. No source, test, HEAD or index changes and no test/browser runtime were made by this reviewer.

The inspected `local-canvas-green-2/results.json` contains 42 checkpoints, 108 listed captures and 54 sampled contrast measurements (minimum 5.028921154815613). Its ten diagnostic entries contain no unexpected non-warning entry; this is not a warning-free-console claim. These are existing controlled-loopback execution records, not reviewer-run tests.

**No blockers remain among this reviewer's three Profile findings.** The independent combined runtime QA is not certified by this report. Reverse keyboard traversal, physical-device and assistive-technology execution, native-provider enrollment, hosted behavior and release remain outside this pass. The prior prehydration skeleton evidence does not establish a usable no-JavaScript Profile. Earlier Communications findings and later Calendar/passkeys/alerts/deletion/Pay batch gates are not closed by this approval.
