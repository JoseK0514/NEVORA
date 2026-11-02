# NEVORA Android foundation

The container renders the existing Next.js Employee and Owner interface. It
retains browser-owned HttpOnly cookie sessions; native code never reads or copies
the cookies. The versioned credential-free probe proves backend compatibility
only. A fresh protected document establishes the real browser session.

The development identity is `com.velani.nevora.development`. This is not a
verified Play Console identity. Compile/target SDK36, minimum26, Java17 source
and bytecode; locally built with the installed JDK21. AGP8.13.0 and Gradle8.14.3
are pinned. Wrapper/distribution checksums and source provenance are recorded in
`docs/native/evidence/2026-11-01/android-wrapper-adoption.json`.

## Build configuration

Set `ANDROID_HOME` to your installed SDK. There is no implicit backend URL.
Select exactly one approved HTTPS DNS origin when preparing a release candidate:

```sh
cd native/android
./gradlew --no-daemon -PnevoraBackendOrigin=https://approved-staging.example :app:assembleRelease
```

The example hostname is a placeholder. Release rejects unconfigured origins,
cleartext, IP/loopback aliases, credentials, paths, queries and fragments. The
Release APK is intentionally unsigned. Actual package identity, signing,
associations, hosted verification and upload remain account/release steps.

Debug additionally accepts an explicit loopback/emulator origin via the
`nevora.debug.origin` launch extra. That override is excluded by the Release
build condition. Cleartext exceptions exist only in Debug and name exact hosts;
no subdomains or blanket TLS bypass are allowed. Do not use production data or
credentials in a debug build or fixture.

## Local checks

```sh
./gradlew --no-daemon :app:testDebugUnitTest :app:assembleDebug :app:assembleRelease :app:lint
python3 test_ui_runner.py
```

Select an invocation-owned emulator explicitly, then run from the repository:

```sh
python3 native/android/test-ui.py --serial emulator-5558
```

The runner rejects physical/implicit devices, verifies the selected target is an
emulator, holds a process lock, strips database/provider settings from child
environments, allocates private evidence/build directories and fresh loopback
fixture ports, and uses only serial-scoped adb commands. It removes only its own
reverse-port mappings and stops its fixture. It does not create, stop, wipe or
delete the emulator; its caller owns that resource. APK installation affects only
the named development package on that explicitly selected test emulator.

Before/after source digests include app sources/resources, both Gradle levels,
wrapper/tool configuration, runner/tests and the shared fixture. A source change
invalidates acceptance. `--only-testing` selects an explicit known test identifier
for diagnosis; partial runs do not establish complete acceptance. Failed visible
assertions retain screenshots/hierarchies. Every test establishes its own fictional
session state. Navigation/buttons use actual touch events, preserving browser
user-activation behavior. Text observations refresh the automation cache on
supported Android versions rather than accepting stale accessibility snapshots.

The complete fixture matrix includes both roles, unsupported native role/web
continuity, real Back/history, recreation, POST logout, revocation, outage/retry,
unconfigured origins and native marker. It additionally verifies Owner cookies
survive an actual app-process restart without exporting them. Fixtures contain
no production database/provider or business implementation; their administrative
control routes exist only in the test server. Actual Next/PostgreSQL journeys
are a separate required acceptance layer.

## Runtime boundaries

- Cover/remove private content on background; invalidate callbacks and revalidate
  with a fresh protected Home document on foreground. Unsent forms are not
  persisted or claimed saved. Recents screenshots are disabled on API33+.
- Native marker `NEVORA-Native/Android/1` is presentation context only. The actual
  session/role remains server-authoritative; Manager/Lead web access is retained.
- Exact-origin internal navigation. Deliberate external HTTPS GET opens the
  system browser without app cookies. Reject foreign POST/subframe callbacks,
  file/content access, mixed content, TLS errors and unknown schemes. Redirected
  subresources need the additional server-policy/adversarial verification tracked
  in the foundation plan before full containment or bridge readiness is claimed.
- AndroidX Back dispatcher, platform insets/keyboard, OS text scaling and zoom
  remain available. Native controls have at least48dp targets. Hardware/TalkBack,
  supported-OS coverage and full web workflow acceptance remain unverified.
- INTERNET is the only platform permission; AndroidX also declares a local
  signature permission for non-exported receivers. No analytics/replay, location, camera, mic or native
  push service is enabled. Cloud backup/device transfer are excluded. WebView
  debugging is disabled in Release; third-party cookies and native cookie export
  are disabled. No JavaScript/native bridge exists in this foundation.

Native notifications, links/associations, protected documents, passkeys and store
preparation continue in the approved capability/release plans. Compilation and
transport fixtures do not establish those features or a deployable store build.
