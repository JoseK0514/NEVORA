# WebView and AndroidX review — November 4, 2026

Jose selected review of the current stack, then authorized installing test software when no physical Android device was available. This continues phases 1–2; it does not authorize a different renderer, a compatibility floor, an accessibility waiver, production, or signing/provider-account changes.

The application and canonical native tests remain byte-identical to local detached checkpoint `a36260270b07d59e12568242f60a424fec4a5223`. Native/fixture source hash for the restored tests is `8086bb8e5de2de18c1470b26198d343b4a70a890bb25973b23ddc48621d53301`. Experimental service/reference/reader sources are retained here as evidence and removed from the actual Android source tree.

## Established comparisons

| Comparison | Observation | Limit |
| --- | --- | --- |
| UiDeviceExt versus standard By on the same failed page | Both missed Sign out while DOM remained visible, focused and enabled | A second client cannot undo a state created earlier |
| Separate registered service | Valid content retrieval; later also saw the empty subtree at the same failure | Registration is not a fix; this was a temporary diagnostic service |
| Minimal ordinary WebView with page-finish focus | Failed at recreation 6; DOM focused/visible; independent service and AndroidX both omitted Home/Sign out | Does not identify the exact internal engine defect |
| Service-only reader after focused complete document | Ten recreations passed with the original 20-second budget | Does not qualify all assistive technology or exclude early-read races |
| Standard By from startup, normal wait cadence | Ten recreations passed; same-source UiDeviceExt reversal failed | Apparent selector-only improvement did not survive matched polling |
| Standard By at original 100 ms cadence | Sign out failed at recreation 1 | No slower polling or helper replacement retained |
| Restored original Google WebView 120 | Original ten-recreation regression failed | Remains a failed compatibility case |
| Official Chromium development WebView 159 | Original stress passed; full ten-case matrix plus independent cold restart passed | Development snapshot, not stable Google/provider release qualification |
| Google SDK149 on Android37.2 and Android32 | Ten original cases plus cold restart passed on each | SDK artifact, not retail Google Play or physical-device certification |
| Root-ID post-fix135 full matrix | Eight of ten cases passed; cold restart passed; overall FAILED | Focused stress success did not qualify the full foundation |
| Restore original Google WebView 120 | Original regression failed again on identical source | Strengthens provider-version dependence; does not isolate one upstream patch |

Every Android run used an explicit owned emulator and fictional fixture data. No renderer command-line override or provider observer was installed. Diagnostic result JSON may name its mechanical runner mode `transport`; development-provider comparisons are explicitly diagnostic regardless of that field. Test-only secure settings were restored to absent enabled-services and accessibility-enabled 0. The development provider was separately installed, selected only on the owned emulator, then removed; the original Google system APK was never overwritten.

## Upstream source evidence

The exact AndroidX 2.4.0 source came from the official Google Maven sources archive; its checksum is in `stack-source-review.json`. Both APIs use `UiDevice.getWindowRoots`. Their traversal differs, but matching the polling interval disproved a simple selector substitution as a reliable correction.

Chromium commit [e8c18ab1c8c801012872518d4077e20ccd94a2d2](https://chromium.googlesource.com/chromium/src/+/e8c18ab1c8c801012872518d4077e20ccd94a2d2), reviewed as [6302633](https://chromium-review.googlesource.com/c/chromium/src/+/6302633), refreshes the Java accessibility root ID on each node request because missed navigation can leave a stale tree. This is a relevant lead; it is not yet proven to explain every NEVORA failure. Historical snapshots immediately before/after were compared. They differ by nineteen commits, including a PGO and AndroidX roll; passing one arm would not isolate a single patch on its own.

The recent pinned engine source also has further cache invalidation changes. Its source revision is in `chromium-1735796-REVISIONS.json`. No private API or engine patch was applied to NEVORA.

## Setup/readiness failures retained

The first probe lived in the instrumentation target and was force-stopped by Android before comparison; it was moved to the separate test package. Its first ordered broadcast was denied until that package requested its own signature permission. A first-read-only service assertion fired before Chromium's lazy accessibility initialization; the corrected diagnostic uses the original 20-second readiness budget. One minimal-reference invocation selected a method that had not been inserted because its preparation assertion failed. A provider custody wrapper initially rejected Android's normal `~~` APK path before running its test. These are setup/readiness failures, not product passes or proof of a persistent accessibility fault.

## Current continuation

The official SDK image `system-images;android-37.2;google_apis_ps16k;arm64-v8a`, revision 7, is installed separately from existing 32/36 images. Its isolated AVD is `NevoraPhase12_API37_2`; it has not yet qualified the app. Its factory Google SDK149.0.7827.5 passed all10cases+cold1, and the same signed SDK provider passed all10cases+cold1 after a normal same-signer update on older Android32. The135post-fix full matrix failed8/10 despite its focused stress pass, so135was not accepted as sufficient. Jose then explicitly approved Android10+/WebView149+ and a native update/browser fallback; implementation follows the linked compatibility proposal. SDK37is stopped; SDK32remains owned and active for implementation tests. No implementation is claimed by this review checkpoint.

Raw logs and artifacts containing CRLF are stored losslessly as `.gz`; `raw-artifact-compression.json` records original names, byte counts and SHA256. Decompress to read; no evidence bytes were normalized.
