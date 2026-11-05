# NEVORA Android native app

The app renders the existing Next.js Employee and Owner interface. Browser-owned HttpOnly cookies remain authoritative; native code does not export cookies or create a second bearer session. A credential-free compatibility probe and fresh protected navigation precede private content.

Jose approved the v1 baseline on November4: **Android10/API29+ and AndroidSystemWebView149+**. Compile/target SDK36 and Java17 source/bytecode remain unchanged. Unknown, malformed and older providers show a native update explanation and deliberate browser fallback before any probe or private WebView. The fallback opens the configured protected `/app` in a separately resolved browser with no cookies, headers or tokens attached. Version admission is compatibility, never account/role authorization.

The development identity `com.velani.nevora.development` matches the NEVORA Development Play app record created November5; that record does not establish signing or distribution. AGP8.13.0/Gradle8.14.3 and wrapper checksums remain pinned. The current local JDK is21. Physical minimum-version, retail GooglePlay WebView, publisher/signing, hosted HTTPS and store qualification remain Phase3/4 gates.

## Build configuration

Set `ANDROID_HOME` and `JAVA_HOME` to installed tools. Select an approved HTTPS DNS origin for an unsigned release candidate:

```sh
cd native/android
./gradlew --no-daemon -PnevoraBackendOrigin=https://approved-staging.example :app:assembleRelease
```

That hostname is a placeholder. Unconfigured/invalid release origins fail closed. Debug additionally accepts an explicit owned loopback origin via `nevora.debug.origin`; no production fallback or blanket TLS exception exists. Do not use production credentials or data for verification.

Native platform capability code is implemented: constrained main-frame/origin/lifecycle messaging, installation-key proof, enrollment/reconciliation, contextual permissions, receipt/token maintenance, generic taps and protected incoming links. Native delivery stays default-off and requires explicit valid environment/provider configuration. Android permissions are INTERNET and POST_NOTIFICATIONS; no analytics/replay, geolocation, camera or microphone collection is enabled. Browser WebPush remains separate. See [platform capabilities](../../docs/native/platform-capabilities.md) and [enrollment protocol](../../docs/native/native-enrollment-protocol.md) for exact boundaries and remaining provider/device gates.

## Local checks

```sh
./gradlew --no-daemon :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:assembleRelease :app:lint
python3 test_ui_runner.py
```

From the repository, select an invocation-owned emulator with a supported provider:

```sh
python3 native/android/test-ui.py --serial emulator-5558
```

The canonical runner rejects physical/implicit devices, verifies emulator identity, holds a serial lock, strips database/provider settings, allocates private build/evidence directories and fresh loopback ports, and removes only its reverse mappings/fixture. Its caller owns emulator creation and shutdown. Before/after source and provider context must match; no renderer override or provider observer can qualify the backend. Partial `--only-testing` diagnostics are not complete acceptance.

The original ten-case supported-runtime matrix retains100ms observations and ten recreations. It covers Employee/Owner, unsupported-role web continuity, Back/history, recreation, POST logout, revocation, outage/retry, origins, marker and renderer containment. An independent instrumentation process verifies Owner cookies after force-stop. Actual Next/PostgreSQL journeys are separately required.

Targeted outdated-provider diagnostics live in `ShellInstrumentedTest`: native update admission, intercepted browser intent with no credential/header extras, and large text/landscape/keyboard reachability. Missing-provider UI is a separate explicit diagnostic: the canonical qualification runner correctly refuses an absent provider and is not bypassed to manufacture a full pass.

## Runtime and release boundaries

- Private documents are removed when window focus/background retires them. Fresh protected navigation is required on return; stale callbacks and capabilities are fenced. API33+ recents screenshots are disabled; earlier supported Android uses a secure window.
- Exact-origin internal navigation, server role/session authority, native Back, zoom, OS text scaling and safe insets remain. External browser actions require current user-visible native controls or validated web navigation and carry no app cookies/headers.
- Unknown schemes, foreign POST/subframes, mixed content, file/content access and TLS errors fail closed. Document export uses deliberate browser reauthentication/reselection; native private file preview/share is not implemented.
- Cloud backup/device transfer are excluded. Release WebView debugging is disabled. Associations and provider identity files remain templates until configured and verified.
- Older120/133 and historical135accessibility failures are retained. The supported baseline is an explicit product decision, not a slow-polling workaround, renderer flag or accessibility waiver. See [the approved proposal](../../docs/native/android-runtime-compatibility-proposal.md) and [evidence](../../docs/native/evidence/2026-11-04/webview-stack-review/README.md).

Compilation/local SDK verification does not establish real APNs/FCM delivery, hardware key assurance, physical minimum-version acceptance, retail provider behavior, hosted deployment or store readiness.

Release preparation, unchanged official launcher artwork, signing/recovery and store drafts are tracked in [native/release](../release/README.md).
