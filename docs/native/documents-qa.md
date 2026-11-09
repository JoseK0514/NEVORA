# Native document handoff QA

The approved fallback asks before opening a known portal page in the external browser. The person signs in again and repeats the document operation there. No app cookie, bearer URL, private file or POST body is exported. Native preview/share is not implemented.

Run only on an invocation-owned simulator/AVD with default native push disabled. Never use production accounts or documents.

## iOS

```sh
python3 native/ios/test-ui.py --simulator OWNED_SIMULATOR_UUID --fixture documents --only-testing NevoraUITests/NevoraDocumentUITests
```

The runner starts `native/ios/Fixtures/documents.mjs --owned-local` on an ephemeral loopback port, builds the unchanged app with an isolated XCTest bundle, and checks CSV review/cancel, blob review, deliberate Safari handoff, the expected browser page, zero direct document API requests and absence of a synthetic HttpOnly app cookie in the browser request. Document mode is separately labelled and cannot qualify the real backend or ordinary foundation matrix. The fixture has no real session/role authority, database or provider.

## Android

`NativeDocumentInstrumentedTest` checks browser resolution using the application UID. The owned test image must first independently show an installed default browser. Run its single class through the explicitly selected emulator's `am instrument`, after installing the Debug app and instrumentation APK. Native push must remain disabled.

The November4 manual delegate fixture checked CSV review/cancel, blob review and Continue in browser on the actual app. It exposed a package-visibility defect: the system could see Chrome while the app query returned null. The new browser-intent `<queries>` declaration produced RED→GREEN on-device and then opened Chrome. Chrome's first-run setup was left untouched, so Android browser-page loading/cookie isolation was not claimed. The app's WebView accessibility subtree was absent during that manual run; visual pointer actions establish functionality only and do not waive Phase1's failing accessibility gate.

The six-line browser visibility declaration does not request QUERY_ALL_PACKAGES or change native permissions. The code change follows [Android package visibility guidance](https://developer.android.com/training/package-visibility/declaring). iOS opens its own associated website in the browser using the behavior described by [Apple's universal-link documentation](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content).

Evidence and limits: `evidence/2026-11-04/phases-1-2/`. Hosted associations, physical devices, actual authenticated downloads, native sharing and real provider enrollment remain separate acceptance work.
