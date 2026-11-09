# Native prototype implementation review

Reviewed 2026-11-02 against the in-progress `native/` worktree based on development `1e6f35ab9731234fc765aa18ee817cb196459e2e`.

This was a separate source/security/claims review. The reviewer changed only this report and the earlier acceptance matrix, not implementation code. Initial review preceded the successful Android builds reported by the implementation owner. A later source/wording recheck is included below; this reviewer did not independently run Gradle or certify an Android build/native runtime. iOS has not been compiled in this Linux workspace.

## Findings and rechecks

### R1 — P2: keep the bridge origin separate from the start route — corrected

The initial `config/policy.mjs` put `/app` or `/ui-preview/home` directly into `server.url`. Capacitor Android 8.6 adds that value to `WebViewCompat.addWebMessageListener` origin rules. The [Android API contract](https://developer.android.com/reference/androidx/webkit/WebViewCompat#addWebMessageListener(android.webkit.WebView,java.lang.String,java.util.Set,androidx.webkit.WebViewCompat.WebMessageListener)) accepts scheme/host/port rules, not paths, and throws for invalid rules. Capacitor's `MessageHandler` catches that exception and falls back to `addJavascriptInterface`, losing the modern origin/main-frame filter.

The implementation owner changed this to `server.url = url.origin` and `server.appStartPath = url.pathname`. The public key **appStartPath** was checked against installed CLI declarations, Android `CapConfig.java` and iOS `CAPInstanceDescriptor.swift`; `startPath` alone is not the public configuration key. Regression tests now check both values for `/app` and `/ui-preview/home`. Source recheck and configuration tests pass. Native verification that the modern listener is active remains part of the platform run.

### R2 — P2: Back could dismiss the background dialog — corrected and browser-reproduced

The initial `android/app/src/main/assets/native-back.js` picked the last open dialog in DOM order. Dialog stack order can differ: the application's global CommandFinder shortcut can open search above another sheet even when search occurs earlier in the DOM.

Reproduction with the exact policy script in Chromium:

1. Add sibling dialogs `first` and `second`, in that DOM order.
2. Call `second.showModal()`, then `first.showModal()`; focus is inside foreground `first`.
3. Evaluate the native Back policy.

Before the change, background `second` closed and foreground `first` remained. After the Android owner changed selection to prefer the focused modal, the same reproduction closed `first`, kept `second` open and restored focus to `second`. The policy also walks shadow-root focus and prevents a background popover from stealing Back from the focused modal. Nine policy tests pass, including reversed DOM order, background menu, nested popover and cancellation cases. This closes the reproduced JavaScript defect; Android dispatcher/IME/predictive-Back behavior still needs native execution.

### R3 — P3: generated Android instrumentation asserted the wrong application ID — removed

The generated `ExampleInstrumentedTest` expected `com.getcapacitor.app` while the prototype uses `com.nevora.spike`. It would fail if connected instrumentation were enabled. The Android owner removed this irrelevant template test and the trivial generated unit example. Removal was independently confirmed. This does not imply that equivalent native instrumentation exists.

### Minor reproducibility/wording corrections — rechecked

- The initial package engine `>=22` and README's “Node 22 or later” were broader than installed Vite 8.3.5/Rolldown's `>=22.12.0` requirement. The implementation owner corrected the minimum to Node 22.12.0; the current CI uses Node 24.
- The initial CI template name “unsigned fixtures” was imprecise for the Android artifact: an Android debug APK is debug-signed. The owner changed it to “debug fixtures”; the iOS simulator command explicitly disables signing.

Both changes were confirmed in the final source recheck for this report.

### Implementation-owner follow-up: local-runtime manifest merge — source rechecked

The implementation owner reported that the generated Cordova manifest supplied `usesCleartextTraffic=true`, conflicting with the main manifest's explicit `false` in a local-runtime build. The Android owner added the tools namespace and `tools:replace="android:usesCleartextTraffic"` while retaining the main value `false`. This reviewer inspected that correction and the unchanged Network Security Config: its base denies cleartext, and only the Debug resource adds exact `localhost`, `127.0.0.1` and `10.0.2.2` exceptions without subdomains.

The implementation owner reported a successful local-runtime rebuild and an `aapt` inspection confirming `allowBackup=false`, `usesCleartextTraffic=false` and the expected network policy. These are **owner-reported build/artifact results**, not independently rerun by this reviewer. The final default-package rebuild was still underway when this follow-up was requested; the final build report must identify its resulting artifact separately.

Platform scripts now prepare/sync only the requested platform. The iOS script checks for macOS before running Vite or Capacitor preparation. This reviewer invoked the script on Linux and observed the expected exit status 1 with “iOS compilation requires a macOS runner with Xcode. No build was attempted.”

## Controls and claims inspected

- `nativeConfig` defaults to bundled fictional content and rejects remote hosts, credentials, query strings, fragments, unsupported start paths and non-HTTP local-runtime URLs. The accepted hosts remain exact localhost/loopback/emulator addresses, without a navigation wildcard.
- Android uses a cleartext-denying base network policy, exact local-host Debug exceptions, disabled backups/device-transfer rules and disabled release variants. The native local-runtime callback is separate from the bundled fixture's App listener.
- Modal cancellation preserves `requestClose`/cancel handlers, including prevented cancellation and delayed route-owned closure. The fixture separately maintains its explicit overlay stack.
- No native auth bypass, production origin, push sender/subscription, signing secret, account mutation or remote deployment was introduced in the reviewed files. Existing server authorization remains outside this shell.
- iOS Debug/Release plist selection, `DEBUG` compiler conditions, Capacitor override signatures, SceneDelegate source membership and SPM dependency paths match the inspected generated project and installed Capacitor source. Non-Debug source compilation is intentionally rejected. No obvious signature/configuration defect was found; this is not a substitute for Xcode compilation.
- iOS notes explicitly identify incomplete icon sizes, unverified transport/service-worker behavior, disabled history swipe and the unwired Live Activity experiment. They do not claim those checks passed.
- The README distinguishes bundled marker persistence from authentication, browser checks from native checks, a debug APK from a signed-in product, and an unsigned simulator build from an installable iPhone IPA. Those distinctions are accurate.
- `ci/native-spike.yml` is a template outside `.github/workflows`; it does not trigger hosted jobs. Its presence does not establish hosted build success.
- The later `build-report.md` was reviewed for wording. It accurately distinguishes owner-reported Android compilation from native-runtime validation, says iOS is uncompiled, leaves the seven feasibility questions open where evidence is missing, and explicitly declines a completed-transition/store-ready claim. Its referenced final run addendum was still being prepared; final artifact identity and emulator outcome belong there.

## Evidence run by this reviewer

```sh
node --test native/tests/config.test.mjs native/android/tests/back-policy.test.mjs
```

Result: **13 passed, 0 failed** (four configuration tests and nine Android JavaScript policy tests).

A separate headless Chromium reproduction executed the exact `native-back.js` against real modal dialogs before and after R2's fix. The after-state was `open: ["second"]`, `focused: "second"`, with the policy returning `dismissed: true`. No backend, credentials, notifications or application records were involved.

## Remaining evidence

The substantive defects found in this bounded review have source/regression remediation. The implementation owner has subsequently reported successful Android compilation. Final artifact identity, install/launch evidence, real app navigation and session checks, macOS/iOS compilation, passkey association, native accessibility and store acceptance remain owned by their corresponding acceptance gates. Consult the final build report for their status; this review does not turn pending work into a pass.
