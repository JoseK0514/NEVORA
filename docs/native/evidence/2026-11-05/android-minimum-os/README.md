# Android minimum-OS follow-up — November 5, 2026

**Superseded November 6:** the matching provider download succeeded after Mac unlock, and API29–31 ARM64 local qualification is complete on candidate 3e22d98b. The temporarily retained API29 image was reused, verified and retired after qualification. This packet preserves the earlier blocked snapshot; [current results and remaining gates](../../2026-11-06/android-supported-os/README.md) are authoritative for the follow-up.

Status: **API29 fallback diagnostics passed; supported-runtime qualification is
unfinished**. Owner: Codex/root. Source: detached
`c8211cd2a71655bedba067eed2437b5ee7c2c3a4`. Android application, test and build
configuration remain unchanged. Source hash:
`fc8fdacece992d93db683f909827da3ae61bc03ed9d8e96ea6a220fe25331001`.

## Actual results

The official Google APIs Android 10/API29 ARM64 revision13 image was downloaded
from Google's SDK repository. Its archive size/SHA1 matched Google's metadata;
ZIP CRC and extracted-file SHA256 values were retained. SDK license text was
byte-identical to the text Jose explicitly accepted during the preceding
comparison, so that authorization was reused without requesting acceptance
again. No new paid service or account was created.

A fresh private AVD booted and reported API29, emulator identity and the factory
Google WebView **91.0.4472.114**. The unchanged canonical runner then passed:

- `i_outdatedWebViewRequiresNativeUpdateBeforeConnecting`: native explanation
  before the unavailable-backend probe/private browser; recreation; accessible
  update action; deliberate separate-browser intent with no cookies, tokens,
  headers or other extras.
- `k_largeTextRuntimeFallbackSupportsLandscapeAndKeyboard`: actual fontScale2,
  landscape rotation, reachable 48dp browser action and keyboard focus. The
  original unset font setting was restored.

Each selected case completed exactly one instrumentation test. Default platform
accessibility, no renderer flag and no provider observer were used. These are
**two fallback diagnostics**, not the full supported-runtime matrix or backend
qualification. See `old-provider/`, `large-text/` and
`api29-fallback-results.json`.

The retained Google Play **156.0.8078.50** APK was independently rechecked with
`apksigner` and the previously verified Google certificate. Its actual manifest
requires API32. A normal install on API29 returned
`INSTALL_FAILED_OLDER_SDK`; the factory provider remained unchanged. This proves
that **this particular APK** cannot qualify Android10. It does not establish
that every 156 build has the same OS requirement. Exact metadata and the
expected install rejection are retained.

## Failed setup and artifact access

The first emulator process disappeared during APK installation, before any
instrumentation ran. The canonical runner retained a failed result and cleanup
errors because the device was gone; the local fixture was closed. The host log
contains graphics errors but no confirmed exit cause. No app failure is inferred
from this attempt. The same image/configuration/arguments were relaunched in a
separate process session with an exit-status-retaining launcher. Both unchanged
fallback cases then passed. The first result/logs are in `initial-process-exit/`;
the original and relaunched emulator logs remain losslessly compressed. No
assertion, selector, timing, security setting or app implementation changed.

Chromium's pinned 156.0.8078.50 [Android build configuration](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.50/build/config/android/config.gni)
defaults to API29, and its [expected WebView manifest](https://chromium.googlesource.com/chromium/src/+/refs/tags/156.0.8078.50/android_webview/expectations/system_webview_64_32_bundle.AndroidManifest.expected)
declares API29. This is source evidence, not a tested Google retail artifact.
A separate API29 package is listed on a public mirror, but no downloaded file
was obtained or verified. Command-line download requests returned403. The
in-app browser opened the actual package page; both its documented download
methods timed out without returning a file path. No mirror APK was installed.
Native browser access reported the Mac locked; Jose was asked to unlock it.
The package page remains marked for handoff in the in-app browser.

## Next gate and controls

Obtain the matching API29-compatible provider through the normal browser/Play
workflow, then verify signatures against the existing Google certificate,
package/version, ABI and actual manifest before installing it. Do not patch or
re-sign a provider or change the approved minimum to manufacture a pass. Run
the original full matrix and independent cold restart on API29, followed by
API30/31 qualification with the correct provider. Physical phones remain a
separate requirement. The verified API29 image is retained privately so the
next attempt need not repeat its download.

The task-owned emulator has been stopped and its disposable AVD removed after
process-identity and serial-lock checks. Its launcher observed exit0; the serial
is absent. Both owned fixture listeners are closed. The original user AVD,
existing SDK images and shared adb service are preserved. See `owner-29.json`,
`emulator-29-exit.json` and `verification.json`.

Engineering retains the existing architecture and precise runtime guard.
Security retains all private-content, browser-intent and credential controls.
Technical assurance limits claims to the actual OS/provider pair and the two
selected diagnostics. Governance keeps release **NO-GO** while mandatory
supported-runtime, physical, source, hosted, signing and distribution gates
remain open. Delivery records this as progress, not Phase3 completion or an
independent audit closure. No baseline exception is requested.

Fresh source inventory still reports collaboration-head drift and four remote
branches against the permitted three; both are preserved. No shared integration,
push, deployment, provider activation, real notification, signing-key access or
distribution occurred. Paid hosting stays **ON HOLD**. Independent upload-key
recovery and the approved isolated HTTPS backend remain later beta dependencies.

Private runtime and scripts:
`/Users/josek0514/.codex/native-runtime/nevora-android-compat-20261105-cd9302a6`.
Raw artifacts are gzip-compressed without byte normalization; hashes and original
lengths are in `raw-artifact-compression.json`. Account screens, APKs, SDK images,
credentials and private keys are excluded from this packet.
