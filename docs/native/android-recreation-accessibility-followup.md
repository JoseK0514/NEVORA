# Android recreation accessibility — reopened gate, November 5

Status: **correction in final verification**. Owner: Codex/root. Jose approved Android10/API29+ and WebView156.0.8078.50+ on November5 after the matched provider comparison. This supersedes149; no accessibility assertion or security control is waived.

November5 focused execution has reproduced the failure on API36 as well as37.2, ruled out a simple client-cache reset, and captured a zero-child document directly in provider output in a separate diagnostic replay. The [investigation packet](evidence/2026-11-05/android-recreation-investigation/README.md) records raw-edge discrimination, the distinct minimal-control failure shape, and a relevant Chromium per-WebContents accessibility-mode fix. The same Play emulator failed on149, then passed200recreations and the complete10-case matrix/cold restart on156.0.8078.50. The [approved correction](android-accessibility-runtime-correction-proposal.md) adds a precise version admission guard; final fallback/backend checks are in progress.

## What was reproduced

The fresh original10-case transport matrix on the owned API37.2 Google SDK149.0.7827.5 image passed9cases and failed `ShellInstrumentedTest.h_repeatedEmployeeRecreationKeepsAccessibleSignOut` at line325, inside the original ten-recreation loop. The page rendered Fictional Home/Sign out, but its captured accessibility hierarchy contained only two nested WebViews; the inner focused document had zero children. The exact Home assertion failed; no pixels, DOM introspection or successful retry substituted for it. Independent cold restart passed.

An immutable control used the actual APK/test APK from the previous successful69887718 full-backend run. Both hashes matched its original build receipt before installation. On the same owned149image/default accessibility, it failed the same assertion in34.7seconds with the same hierarchy shape. Thus the new icon/privacy resources are not necessary to reproduce the problem. This does not distinguish app lifecycle, WebView provider or AndroidX/UIAutomation behavior, and does not establish physical TalkBack impact.

The current package passed a separate application-UID installed-browser/scoped-intent resolution test. That is not an authenticated Android browser download/cookie qualification. All fixture servers/reverse mappings closed, and only the new disposable AVD was stopped/removed. The initial disk allocation failure was corrected by selecting6G of test userdata on that AVD; runtime/accessibility behavior and assertions were untouched.

Evidence: [release-preparation packet](evidence/2026-11-05/release-preparation/README.md), `android-transport-result.json`, both failure PNG/XML pairs, `android-pre-resource-control.json` and current browser/owner receipts. The earlier passing149matrices and actual backend journeys remain historical observations; they no longer establish current repeated-recreation acceptance.

## Focused next investigation

1. Allocate a new explicitly owned supported-provider AVD, record exact image/provider/APK/test/AndroidX versions, disk and ownership context, and verify no WebView command-line override. Retain original source/assertions/100ms observation and ten recreations.
2. Reproduce through the canonical runner: `python3 native/android/test-ui.py --serial OWNED_SERIAL --only-testing com.velani.nevora.development.ShellInstrumentedTest#h_repeatedEmployeeRecreationKeepsAccessibleSignOut`. Partial runs are diagnostics, not complete qualification.
3. Capture, for the same failed activity generation, lifecycle/window/renderer events, rendered screenshot, provider accessibility nodes, DOM/viewport state and network/compatibility completion. Keep extra observation failure-only so it cannot create the pass being measured. Do not log real sessions, keys, cookies or customer content.
4. Compare a minimal independent WebView consumer and an independent accessibility observation with the same HTML/runtime to separate provider behavior from NEVORA lifecycle and UiAutomator reconnection. Compare documented current AndroidX/retail WebView behavior using official artifacts; no trust bypass, random APK, renderer flag or unapproved minimum-version increase.
5. Change product code only after a causal defect is isolated. Add the failing regression first, preserve privacy/session/generation fences and browser-owned cookies, then rerun the unchanged complete10-case matrix, separate cold restart, owned18-check real-backend/3native journeys, and relevant core suites. Require repeated recreation runs before calling an intermittent defect corrected.
6. Qualify retail/physical accessibility and minimum supported devices before release. If the maintained foundation or runtime policy needs to change, prepare a concrete reviewed alternative for Jose instead of silently changing product compatibility.

No app fix, provider cause, hidden test bypass, hardware verification or Phase1/release re-acceptance is claimed by this follow-up. Signing, hosted/provider integration and distribution remain separately gated.
