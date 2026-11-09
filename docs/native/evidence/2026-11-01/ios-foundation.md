# Reconciled iOS foundation — local verification

Task base: 9640e112bcf405cee621248dccae48073e7b0e50. Source adoption: ios-adoption.json; all24 preserved hashes matched, only18 native/ios files copied. The original working tree was not modified.

| Check | Actual result |
| --- | --- |
| Inherited Swift suite | 7 passed |
| Added adversarial Swift suite | RED: three assertions reproduced debug HTTP hostname-prefix confusion; GREEN: 13 tests passed after restricting cleartext to explicit loopback names |
| Native UA test | RED: actual missing-marker XCTest assertion; GREEN: actual WebView emits the exact v1 marker |
| Concurrent fixture / roles / POST logout / revoke | RED cases observed, then 4 Python tests passed |
| Simulator ownership | RED: both cases spawned before ownership; GREEN: 2 tests passed, lock and UUID guard precede child processes |
| Deterministic generator | Project, scheme and both plists unchanged after regeneration |
| Debug build-for-testing | Passed on Xcode27 / iOS27 simulator |
| Latest unsigned Release simulator build | Passed, both arm64/x86_64; no signing/upload |
| Release artifact inspection | No ATS exception, implicit backend origin or compiled debug-origin launch override |
| Original UI suite | 3 passed; previous keyboard-focus failure did not reproduce |
| Expanded final UI suite | 6 passed / 0 failed; 120.431s test duration, 167.262s Xcode operation |

Owned simulator: 89DDABDD-127C-426C-8436-73CB913690AC, created for this task. Final clean evidence: `/var/folders/4b/9tfty_tx1vdg9pg02qrgnr2r0000gn/T/nevora-native-ui-tr7aqzfc/tests.xcresult` plus build.log/tests.log in that directory. Final runner returned passed:true. Tests cover native marker, Employee sign-in/Home/Schedule/relaunch/POST logout, distinct Owner session/relaunch, background revocation/restart, unavailable backend and unconfigured app. Screenshots are retained in XCTest attachments.

Original3-test evidence: `nevora-native-ui-d1dhq8je` under the same temporary root. Marker RED: `nevora-native-ui-7ozgykfu`, one failed assertion. Xcode hung while reporting that deliberate failure and its process was stopped after the assertion/suite results were retained. A subsequent invocation was aborted while the prior report was still active; it is not acceptance evidence. Added a simulator ownership lock with regression tests, then ran the complete final suite independently. Build/XCTest processes now have explicit deadlines. No test assertion was weakened.

The controller retains browser-owned cookies and fresh protected navigation on foreground, with privacy cover and generation checks. No cookie getter/export or duplicate bearer model was introduced. The UA is presentation only. No product CSS or keyboard behavior was changed to claim a fix for an unreproduced historical failure.

This establishes local transport-fixture behavior and unsigned compilation. Actual Next/PostgreSQL journeys, native device capabilities, physical hardware, hosted HTTPS, signing and store acceptance remain separate required gates. The broader unit suite is still running and has an unchanged tenancy-test timeout to investigate; this report does not mark it green.
