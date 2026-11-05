# Android runtime compatibility proposal

Status: approved by Jose on November 4, 2026: ‘Adopt the modern runtime baseline (Recommended)’. Implementation and verification are in progress; no floor is claimed implemented until its checks pass.

## Recommended v1 baseline

Keep the approved shared-interface Android WebView architecture. Require Android 10 / API29 or later and Chromium-based Android System WebView major149 or later. This is the tested baseline, not a claim that149 was the first fixed engine. Older WebViews receive a native update explanation and a deliberate browser fallback before any private document is loaded. Android8/9 are excluded from the native v1 target; existing web/kiosk behavior remains unchanged.

The current Android build minimum is26. Changing it to29 and admitting only supported engines is a material compatibility decision. CPO's rule is explicit: “Do not silently convert a technical workaround into product policy.” No exception or approval is inferred from passing tests.

## Evidence supporting this proposal

All comparisons used the unchanged original native/fixture source, hash `8086bb8e5de2de18c1470b26198d343b4a70a890bb25973b23ddc48621d53301`, with the original100ms lookup, original assertions, and ten-recreation regression.

- Original Google WebView120 failed; development159 passed the full ten-case matrix and separate cold restart; restoring120 failed again.
- Historical135 before a root-ID fix failed, the next build passed the focused stress, and reversal failed. Its full matrix still failed other accessibility cases. Therefore135 is not proposed as sufficient.
- Google WebView149.0.7827.5 supplied by the official Android37.2 SDK image passed all ten cases and independent cold restart on both the new Android37.2 emulator and the older Android32 emulator. The older emulator received a normal same-signer package update; no trust check or provider-selection policy was bypassed. No renderer flags or observer were used.
- The upstream Chromium149 Android configuration defaults to API29. The SDK image's particular APK variant has min32; it does not certify minimum-version retail behavior. Physical Android10 and current Google Play WebView qualification remain Phase3 gates.

The SDK provider is a first-party SDK artifact with verified signature integrity and matching SDK signer across images. This is local SDK verification, not evidence of retail Google Play signing, physical-device behavior, hosted deployment or store readiness.

## Bounded implementation if approved

1. Set Android minSdk29 and add a small, strict engine-version policy. Unknown/malformed/older providers cannot enter the private web surface.
2. Show a native update explanation and browser fallback. Retain exact-origin routing, browser-owned cookies, account/role authority, window-focus retirement, protected snapshots and fresh protected foreground navigation.
3. Keep the original supported-runtime matrix and ten-recreation assertions intact. Add pure policy regressions and an actual old-provider test that verifies the update UI and absence of a WebView/private document.
4. Verify builds, lint, JVM tests, supported-runtime matrices and current Android real-backend acceptance at a committed candidate. Preserve the old failures and source/provider custody. No production, signing/provider account, deployment, merge or branch policy exception is included.

## Alternative if Android8/9 native support is required

Keep the release gate open and plan a different maintained rendering foundation, including accessibility, session/lifecycle, privacy and constrained capability acceptance. A different wrapper around Android WebView would still use its installed engine. Do not retain private documents or accept a renderer flag/accessibility waiver to rescue older providers.

Owner: Codex/root. Next gate: implement the approved scope and complete executor verification. Phase2 implementation and prior local evidence remain unchanged.
