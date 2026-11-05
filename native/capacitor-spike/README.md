# NEVORA native feasibility prototype

This is an isolated, debug-only Capacitor 8 project. It reuses NEVORA's native-app
direction without changing the Next.js app, its dependencies, authentication,
database, release candidate, or deployment. It is not a customer-ready app.

Base: `development` at `1e6f35ab9731234fc765aa18ee817cb196459e2e` (fetched November 2,
2026). This base includes development-only features; it is not authorization to
deploy development. The original release checkout is untouched.

## Two distinct test modes

1. **Packaged fixture (default):** a clearly fictional sample bundled in the app.
   It exercises native packaging, sheets, keyboard, local marker persistence,
   accessibility layout and passive API availability. It contains no sign-in,
   attendance mutations or payroll data. The marker is not an authentication test.
2. **Local NEVORA runtime:** loads the existing app or its fictional Home preview
   from a local development server. Authentication and database workflows require
   the app's separate owned-data fixture. This prototype does not create users,
   connect a database or bypass sign-in. Hosted or production origins are rejected.

`server.url` is a Capacitor development/live-reload mechanism. Its suitability for
a production app loading the live Next.js service remains a release architecture
question; a working debug wrapper does not settle it or guarantee store approval.

## Requirements

- Node 22.12 or later; dependencies pinned in package-lock.json.
- Android: a full Java 21 JDK (including javac), Android SDK platform 36, build
  tools 35.0.0 (the Gradle plugin default) and 36.0.0. Set `ANDROID_HOME`
  to your SDK. Gradle 8.14.3 is pinned by the generated wrapper.
- iOS: a macOS machine with a Capacitor-8-compatible Xcode installation. Swift
  Package Manager is used. The simulator command does not require device signing.

## Build the packaged fixture

```sh
cd native
npm ci
npm run typecheck
npm test
node --test android/tests/back-policy.test.mjs
npm run android:debug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. It installs as
`com.nevora.spike` / **NEVORA Preview**, separate from any future production app.
This APK opens the fictional device prototype, not the full signed-in product.

For an already running, owned emulator with this APK installed, the opt-in
`tests/android-device.mjs` runner checks the real WebView, native Back and a
fictional marker across process restart. Set `NEVORA_ANDROID_SERIAL` to that
emulator and `NEVORA_PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs`.
It is separate from the browser suite and does not test real authentication.

On a Mac:

```sh
npm run ios:simulator
```

This produces an unsigned simulator build under `artifacts/ios-derived` if the
toolchain succeeds. It is not an iPhone-installable IPA. Native iOS source has not
been compiled in the Linux cloud workspace; see `ios-notes.md`.

## Connect the local app (debug only)

Run NEVORA's local fictional runtime following its own fixture instructions. Do
not copy production credentials or assume a preview database is isolated. For
Home UI only, the existing `/ui-preview/home` needs no database/session.

Android emulator/device:

```sh
adb reverse tcp:3000 tcp:3000
NEVORA_NATIVE_URL=http://localhost:3000/ui-preview/home npm run android:debug
```

For owned end-to-end sign-in, use `http://localhost:3000/app` instead. Keep
`localhost` with `adb reverse`: the existing development passkey configuration
rejects `10.0.2.2`. Native WebAuthn still needs platform support and verified
association files; a working password flow does not prove passkeys.

On a Mac, use the same URL environment variable with `npm run ios:simulator`.
The iOS source scopes local HTTP permissions to its Debug configuration.

Reset to packaged mode by **unsetting** `NEVORA_NATIVE_URL`, then build/sync again.
Never distribute an APK connected to a developer runtime.

## Evidence and limits

- Fixture layout checks in a desktop browser are separate from native tests.
- Packaged offline content does not prove the real app's service worker works.
- Browser push is not APNs/FCM delivery. No push registration or notifications
  occur in this prototype.
- No production signing, Apple/Google accounts, hosted test domain, store upload,
  deployment, migration, or real email was used.
- Android release variants and non-Debug iOS compilation are intentionally blocked.
- Native passkeys, real session restart, real-app offline recovery, actual-device
  accessibility, and beta distribution remain acceptance items.

See `../../docs/product/specs/capacitor-spike/build-report.md` for exact results and
`acceptance-matrix.md` beside it for the seven feasibility questions.
