# Local verification notes

Code/resources are at `fafa56de`; store package and full unit run at `5d4f3fb5`. No `src/` or `public/` product source changed in this task. Required-reason/icon packaging is compiled and inspected. SDK outputs remain unsigned/origin-unconfigured, not usable beta artifacts.

- Inventory behavior:14passed, production checker unchanged. Actual shared gate still4>3.
- Native Node/association/owned-tool checks:45passed, including owned PostgreSQL lifecycle cases.
- Python:2+9+11=22passed. Swift29passed; Android JVM26passed. Android lint0errors/15warnings retained. Typecheck/root lint passed.
- First default-worker root run:10971passed,7five-second timeouts,801existing skips. The47-case evidence parser passed unchanged with one worker. Full two-worker rerun:10978passed,801existing skips,0failures. No assertion, source test or timeout was modified. Lower concurrency clearing the failures supports resource contention as the likely cause; this is not proof of default-concurrency/remote-CI reliability.
- Alert-settings fixture:14passed at390/1280px, real component/controller with fake native/server IO, no real permission/provider authority. The first private QA script incorrectly expected revoked immediately after a dropped reply; actual code correctly reports an error until Check again reads current state. A second private script asserted restored focus before the documented animation frame. The final script checks both the error/fresh-read states and waits for actual focus; both viewport matrices pass. Product code was unchanged. Earlier failed QA receipts are retained privately.
- iOS document fixture:1actual XCTest passed, fixture-only transport, not hosted document acceptance. The fresh owned simulator was stopped/removed; existing simulators preserved.
- Offline crypto scan:63source files,3raw synthetic-token candidates in OAuth tests; semantic review confirms fake strings, ephemeral test key and real-network denial. No findings confirmed against this bounded control set; no history/vault/deployment certification.

Android final result:9/10 transport cases passed; repeated Employee recreation failed while the screen visibly rendered Home/Sign out and the provider accessibility tree omitted all descendants. Cold restart passed. The immutable pre-resource69887718 APK/test APK failed the same assertion on the same149 image, with verified original artifact hashes. This proves the new resources are not required to reproduce it; root cause and physical impact remain unknown. Current APK browser-resolution instrumentation passed separately. The invocation-owned AVD was stopped/removed. Its first10G userdata allocation could not fit disk; only this disposable AVD was set to6G, without renderer/provider/accessibility overrides. This is an open release blocker; no assertion, timer, observer or runtime flag was changed.

Release-specific `:app:lintRelease` also passed with0errors; 15warnings are retained separately in `lint-release-warnings.json`.

Final source refresh observed an external collaboration advance to1808fcf7 (Owner desktop styles). It remains held, outside the tested development/native candidate. See `source-refresh.json`; no app code was imported, and the live four-head ceiling remains failed.
