# Android 10–12 local qualification — November 5–6, 2026

Status: **local ARM64 emulator qualification complete; native release gates remain open**.
Owner: Codex/root. Tested candidate: `3e22d98b61dab82f33b64b6f1b553d2b16b097fb`.
Native source hash: `c84fa2555cf40c4d31fce69d469e19f4ff58e4abee3cbaea7ecc4ccbebcb1b69`.

The approved Android 10/API29 and WebView 156.0.8078.50 minimums are unchanged.
The matching Google-signed API29 package is now obtained and tested. This
supersedes the earlier package-acquisition blocker in the
[November 5 minimum-OS packet](../../2026-11-05/android-minimum-os/README.md).

## Results

| Owned emulator | Provider | Original transport cases | Independent cold restart |
| --- | --- | --- | --- |
| Android 10 / API29, ARM64 | Google 156.0.8078.50 | 10 passed | 1 passed |
| Android 11 / API30, ARM64 | Google 156.0.8078.50 | 10 passed | 1 passed |
| Android 12 / API31, ARM64 | Google 156.0.8078.50 | 10 passed | 1 passed |

All three final matrices used the same current source hash, default platform
accessibility and no renderer flag or provider observer. The original repeated
recreation case, accessible targets, polling cadence and time budgets remain.
Actual source, provider, serial, instrumentation and cleanup receipts are in
`api29/`, `api30/`, `api31/` and `verification.json`.

The isolated Next/PostgreSQL run on **API29** passed all 18 named checks, including
3 actual native Employee/activation/Owner journeys and an independent cold
restart. `assertNativeResults` independently validated names/counts, ownership,
checkpoint and default provider context; source verification and service closure
passed. The PostgreSQL pid file was absent. See `backend-green/` and
`backend29-verification.json`. Backend journeys were not rerun on API30/31;
those targets received the complete transport matrices shown above.

Android JVM tests: **28 passed, 0 failures/errors/skips**. The instrumentation APK
compiled successfully. Existing SDK/deprecation warnings remain in
`selector-build.log.gz`; no warning or assertion was suppressed. Results and
original JUnit XML are in `selector-build-verification.json` and `jvm/`.

## Reproduced test-selector defect and correction

The first API29 real-backend run on `6b27f408` passed 17 backend checks,
Employee/activation journeys and cold restart, but failed the Owner Settings
navigation expectation. Its full failed result remains in `backend-red/`.

The captured UiObject2 log identifies the actual target: at 23:34:26.957 it
clicked `(161,31)`, then warned that the selected node belonged to
`com.android.systemui` and was **Settings notification: Unsupported Virtual SD
card**. The global `descStartsWith("Settings")` selector had selected an OS
notification icon. This is evidence of a test-locator collision, not a newly
established WebView or application navigation failure. See
`settings-selector-red.json` and `api29-owner-process-logcat.txt.gz`.

The sole code change scopes `BackendInstrumentedTest.tap` to the actual target
application package and asserts the selected object's package before clicking.
All original route, text, save/database, role, lifecycle and restart assertions
remain. Production Android source, build configuration, runtime admission and
`ShellInstrumentedTest` are unchanged from `6b27f408`. The final candidate's
complete API29 transport matrix was rerun after this test change.

The corrected backend run passed with the same Settings notification still
present; its cold-start XML and independent verification preserve that condition.
No notification was removed to manufacture a pass. The fresh bounded code review
returned CLEAR/APPROVE with no blockers. Its report is retained verbatim in
`selector-scope-review.md`; runtime acceptance was pending at review time and was
subsequently obtained by the executor. This is not independent release audit
closure. Official API contracts: [package criterion](https://developer.android.com/reference/androidx/test/uiautomator/BySelector#pkg(java.lang.String))
and [selected-object package](https://developer.android.com/reference/androidx/test/uiautomator/UiObject2#getApplicationPackage()).

## Provider and device custody

The API29-capable APK was downloaded normally through Chrome from the identified
APKMirror package page after Jose unlocked the Mac. Its 262,075,753 bytes have
SHA256 `67d8707f1f16ffaab0f6d89db2c67afc7f723d6f35d43f3c864de4c7fd04c951`.
`apksigner` verified its v3 signature and source stamp. Its Google certificate
SHA256 `6faf3c4140407473400934d117815a21af1cfefc5c0bee61c858bc3d72ba6fe5`
matches both the previously obtained Google Play provider and each factory SDK
provider. Actual manifest, package, version and ABI were inspected before use.
All three devices accepted it as a normal signed update and reported it as the
current 156.0.8078.50 provider before testing. On API29 the initial post-install
snapshot still reported the old current/new preferred provider; tests waited
until the service reported the new current provider. No provider was forced.

This is a **Google-signed mirror artifact**, not proof of Google Play delivery on
these OS versions. It is a different binary from the earlier Play-delivered
minSdk32 artifact. `provider-custody.json` and compressed signature/manifest logs
retain the distinction. APKs are outside Git. Exact upstream-patch attribution
remains unestablished.

Official SDK images were checksum-verified against Google's repository metadata,
with ZIP CRC and extracted-file SHA256 values retained. The API29 image was
reverified before reuse. The required license text was byte-identical to Jose's
previous explicit acceptance. Each AVD used a unique private name, explicit
serial, actual API verification and process-identity receipt. The installed
SDK32 AVD template supplied hardware configuration; each verified system image
and actual guest API were selected explicitly.

API30/31 first-use Recents tutorials were observed on the public Android Settings
screen and dismissed before qualification. Before/after images and preparation
receipts are retained. Privacy assertions were unchanged. API29 shutdown initially
raced adb's serial retirement; its launcher exit 0/PID disappearance and eventual
serial absence were confirmed. Config inspection found emulator formatting and
userdata expansion from the requested 2G to 6GiB, with all other normalized fields
unchanged. Only the identified owned AVD was deleted.

All three task-owned emulators/AVDs and their fixture listeners are now closed;
backend services are closed too. Task-private downloaded images were retired
only after ownership/closure checks and file-hash verification. Original user
AVDs, pre-existing SDK images, shared adb, other worktrees and local work were
preserved. Custody, normalized config and retirement receipts remain. The APKs,
private configuration, raw scripts and private receipts are under
`/Users/josek0514/.codex/native-runtime/nevora-android-supported-20261105-15d325e9`
or the private paths recorded by their receipts.

## Firebase configuration preparation

The previously timing-out `google-services.json` download succeeded through the
existing company Firebase console session. Its project, app ID and package match
NEVORA Native Development / `com.velani.nevora.development`. The 709-byte file's
SHA256 is `2b2a5732f3d6bd4b06c73f8671787acd314a68a2d9e885adbd7b052b9a06fcbf`.
A working copy is outside Git in a 0700 directory with mode 0600; its contents and
client API key are not in this packet. The console still shows Spark/no-cost.
See `firebase-configuration-preparation.json` and Google's
[configuration description](https://firebase.google.com/docs/projects/learn-more#config-files-objects).

This is download/identity preparation only. No runtime binding, server credential
creation, real enrollment/push delivery, analytics change or billing upgrade was
performed. Existing default-off native delivery and backend authority remain.

## Release impact and next gate

Engineering retains the approved architecture and runtime guard; the correction
is confined to a stricter test interaction boundary. Security retains provider
signature validation, private configuration custody, session/privacy controls and
default-off delivery. Technical assurance limits these results to the recorded
ARM64 SDK images and exact provider. Delivery records this local gate complete,
with Phase 3 and native release still incomplete. Governance: GO for this bounded
local correction/qualification; **NO-GO for release** while mandatory gates remain.
No policy exception or independent finding closure is claimed.

Physical/minimum-version phones, manufacturer/other-ABI behavior and actual Play
installed identity/delivery remain unqualified. A usable signed beta also needs
independent upload-key recovery, an approved isolated HTTPS environment and
hosted/association/signing/distribution acceptance. Paid hosting remains **ON
HOLD**. No production, merge, push, deployment, upload or distribution occurred.

A final fetch still reports development `e9c3a66d` included in this candidate.
The shared-source check remains failed for collaboration-head drift and four
remote branches against the unchanged limit of three; all heads were preserved.
See `source-context.json` and `final-source-inventory.log.gz`. That blocker is
separate from local SDK qualification.

Subsequent handoff changes are documentation/evidence only. The tested candidate
and native source hash above remain the source of truth. Raw whitespace-sensitive
artifacts are losslessly gzip-compressed; original lengths and SHA256 values are
in `raw-artifact-compression.json`.
