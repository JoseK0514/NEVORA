# Android foundation — local verification

Task base: 5aea7bfdc54ae473caaadac59024d0ace7f27247. Detached source, no deployment or production credentials/data. Wrapper provenance and official SHA256 pins: android-wrapper-adoption.json.

| Check | Actual result |
| --- | --- |
| JVM policy/protocol/lifecycle | RED6/6 expected assertions, then GREEN6/6 |
| Runner ownership/source receipt | RED cases observed, then GREEN3 tests (including5 invalid-device subcases) |
| Shared fixture isolation/roles/logout/revoke/outage | RED additions observed, then GREEN6 Python tests |
| Instrumentation before container implementation | Unconfigured-screen assertion failed against minimal stub, as intended |
| Final instrumentation | 8/8 passed in34.792s |
| Real process restart | Passed: valid Owner cookie survived force-stop/start without native extraction |
| Latest JVM/Debug/unsigned Release/lint | Passed,92 Gradle tasks in11s; no lint baseline/suppression |
| Release artifact | No debug origin extra in DEX, no debug cleartext resource, DEBUG=false, explicit empty backend |
| APK signature | apksigner confirms no distribution signature; expected unsigned artifact |

Final clean runtime evidence: `/var/folders/4b/9tfty_tx1vdg9pg02qrgnr2r0000gn/T/nevora-native-android-vkp1__wv/` contains build.log, instrumentation.log, result.json, cold-start.xml and owner-cold-start.png. Complete source/build-configuration digest before/after: `e94f63f3979fff439c71e54652c333521ec41d3abf651312de08f84d2bb6dab8`. The runner returned passed:true, instrumentationTests:8, coldProcessRestart:true. Configuration, native marker, Employee real-touch navigation/Back/recreation/POST logout, distinct Owner, background revocation, outage/retry and unsupported native role were exercised.

Owned runtime: fresh NEVORA_Native_def9d80ddc, emulator-5558, API36 arm64, WebView133.0.6943.137 from the installed SDK image. This does not establish current-device/WebView or supported-OS security acceptance. The old user AVD was not modified. Initial boot failed disk preflight; the emulator enforced a6G minimum instead of the requested2G. Deleted only our completed iOS simulator89DDABDD after retaining its screenshots/xcresult; async reclamation allowed the new AVD to boot. Do not infer that the deleted simulator still exists.

Failures and corrections retained in local logs:

- First Java compile had an extra closing brace. Corrected; no test result inferred from the failed build.
- Lint found Back API migration, API27 styling at minimum26, and missing explicit subdomain flags. Used AndroidX Activity/dispatcher, version-qualified style and exact-host declarations. Added explicit cloud/device-transfer exclusions. Remaining nonfatal lint/deprecation notices are not hidden; JavaScript is required for the selected shared Next interface, constrained by the origin/lifecycle policy.
- Scripted Espresso navigation produced three history entries with canGoBack=false; real touch input passed both stronger native-history/callback assertions and the original Back→Home assertion, with app Back code unchanged.
- Retained screenshots showed correct logout rendering while classic accessibility queries returned stale empty descendants. UIAutomator2.4 plus fresh public API34 cache observations fixed this in the complete final run; all visible assertions and20s deadlines remain. This is automation evidence, not TalkBack/hardware certification.
- Retry label was transformed to uppercase by the platform theme. Preserve its literal sentence-case label with setAllCaps(false), then exercise real retry/recovery.
- Digest initially omitted app/build.gradle. A failing regression test reproduced this; final digest includes module configuration. Earlier focused runs lack this complete custody and are not the final acceptance artifact.

Latest unsigned APK: `native/android/app/build/outputs/apk/release/app-release-unsigned.apk`,1,677,956 bytes, SHA256 `73436e961a459f62fb5d34d98ddee3fb8e8433dc5cd769801bd3010241aacf02`. Build used an allowlisted environment and explicit empty backend override. Platform permission is INTERNET; AndroidX contributes its local signature-only receiver permission. No notification/location/camera/mic permission, production binding or native push service was added.

Still required: actual Next/PostgreSQL journeys, adversarial redirected-resource containment/server policy, complete workflow matrix, native capabilities, physical accessibility/keyboard/OS tests, configured HTTPS, final identity/signing and store acceptance. The broader unit suite's four timeouts remain named until a complete controlled rerun passes; both affected full files independently passed115 tests. This report does not mark the whole native task complete.
