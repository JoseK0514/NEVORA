# NEVORA iOS foundation

This native foundation reuses NEVORA's current Next.js UI and server business
logic. Claude's accepted web/backend changes carry forward without copying screens
or database code into the phone. No third-party native dependency is required.

Open `NEVORA.xcodeproj` in Xcode. The project uses Swift 5 language mode, UIKit and
WebKit, with an iOS 16 deployment target. Current verification uses Xcode 27 and
the iOS 27 simulator; support for other versions and hardware is not certified.
The `com.velani.nevora.development` identity is development-only.

## Backend integration

The backend must include this branch's `/api/mobile/v1/session` route. The app
checks the v1 protocol without credentials, then opens `/app` in WebKit. Existing
web login, HttpOnly cookies, protected reads, commands and logout remain the sole
authentication/authorization path. The app never reads or copies session cookies.
The WebView appends `NEVORA-Native/iOS/1` through the platform user-agent API.
This is presentation context only: the authenticated layout qualifies Employee
and Owner accounts, and explains web-browser access for other roles. The probe
is role-neutral, since it cannot establish the browser's authenticated role.

Set `NEVORA_BACKEND_ORIGIN` to the exact approved HTTPS origin in Xcode build
settings. There is deliberately no implicit production URL. Release requires a
DNS deployment hostname and rejects cleartext, loopback/IP aliases, userinfo,
and origins containing a path/query/fragment.
Signing, provisioning, store identity, app icons, privacy disclosures, associated
domains/passkeys and store distribution remain future work.

Debug may use an invocation-owned loopback origin via launch arguments:
`-nevora-debug-origin http://127.0.0.1:PORT`. That override is compiled out of
Release. Do not use customer data or production credentials for local tests.

## Local verification

From the repository root:

```sh
swift test --package-path native/ios
python3 native/ios/test_fixture.py
python3 native/ios/test_ui_runner.py
```

Select an invocation-owned disposable simulator UUID from `xcrun simctl list`:

```sh
python3 native/ios/test-ui.py --simulator SIMULATOR_UUID
```

The runner owns fresh loopback fixture ports, a separate unavailable endpoint,
derived data and XCTest configuration/results; it always stops its fixture. It
prints the evidence directory and final result. Never share one simulator between
simultaneous jobs. The native XCTest
suite exercises the container against a transport fixture; it does not certify
Next.js login, database behavior, the full web app, hosted HTTPS, or physical
devices. Backend tests are under `src/app/api/mobile/v1/session/route.test.ts`.
The fresh server has its own session authority; a stale cookie from an earlier
fixture cannot grant access. The suite verifies persistence across app relaunch.
The runner acquires a per-simulator process lock before creating a fixture or
building, and rejects another invocation using that UUID. A failed test may take
Xcode additional time to finish reporting; wait for the runner to exit before
reusing the simulator. A `--only-testing Target/Class/test` option supports a
focused regression run. Build and XCTest subprocesses have explicit deadlines.

The fixtures qualify two fictional roles, POST-only logout, revocation, the
native marker, outages and invocation isolation. Their administrative revoke
endpoint exists only in the loopback fixture. It is never part of the app API.
Foreground resumes deliberately load a fresh protected Home document; unsent
forms are not persisted or claimed saved by this foundation.

Unsigned Release simulator build (no distribution/signing operation):

```sh
xcodebuild -project native/ios/NEVORA.xcodeproj -scheme NEVORA \
  -configuration Release -sdk iphonesimulator \
  -derivedDataPath /tmp/nevora-native-release CODE_SIGNING_ALLOWED=NO build
```

The checked-in project/plists can be regenerated with Python's standard library:
`python3 native/ios/generate-project.py`. Change the generator alongside generated
project configuration. No package download, global tool install or paid service
is required.

## Next integration gates

1. Integrate the reviewed endpoint/container with current development after the
   existing branch inventory drift is reconciled. Preserve Claude's newer work.
2. Run real web login/Home/Schedule/logout, revoked sessions and all shipping roles
   inside the app against an invocation-owned full Next.js/PostgreSQL runtime.
3. Validate the selected non-production HTTPS origin and physical-device lifecycle,
   accessibility, downloads, passkeys, supported OS versions and all advertised
   workflows. New native features need their own adapters and evidence.
4. Continue the approved Android/capabilities/release plans. Native APNs/FCM,
   associations, secure documents and device/store acceptance remain tracked
   deliverables, not capabilities established by the fixture suite.

Source custody and current results live in `docs/native/evidence/2026-11-01`.
Platform APIs: [WebKit user-agent application name](https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/applicationnameforuseragent).
