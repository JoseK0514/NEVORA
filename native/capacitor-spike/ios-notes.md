# iOS prototype: source prepared, native execution still owed

Date: 2026-11-02. Base: development `1e6f35ab9731234fc765aa18ee817cb196459e2e`.

The SPM Capacitor 8.6 project is generated. No Xcode, macOS runner, iOS simulator,
Apple account, signing identity, or physical device was used in this workspace.
Do not report these source changes as an iOS build or a passing native check.

## Implemented source

- `SceneDelegate.swift` boots a `NevoraBridgeViewController`. A compile-time
  `#error` rejects non-Debug builds of the prototype.
- `Info-Debug.plist` permits insecure HTTP only for exact `localhost`, with no
  subdomains. Release `Info.plist` has no ATS exception. The local-runtime URL
  for iOS is `http://localhost:3000/app`; Android's emulator address is not an
  iOS transport exception.
- `WKAppBoundDomains` declares only localhost in Debug. The controller enables
  app-bound navigation only for the localhost HTTP experiment; packaged content
  keeps Capacitor's custom-scheme behavior. Service-worker support is **unverified**.
- Packaged-fixture pages receive a main-frame-only Dynamic Type script. It maps
  UIFont's current body size to a 16px default `rem`, updates after category changes
  and foregrounding, and retains Capacitor's other user scripts. It never changes
  hosted NEVORA pages or their typography. Large-text screenshots remain owed.
- History swipe is explicitly off because plain WebKit history can bypass the
  existing route-owned sheet cancellation. Native edge-swipe behavior is a follow-up,
  not a passed Q6 check. Existing visible web Back/Close controls remain.
- Launch screen uses the existing wordmark on NEVORA's cream background. The
  supplied official 180px PWA Apple icon is copied unchanged into the iPhone 3x slot.
  Missing 2x/iPad/store 1024px icons are recorded packaging gaps. The legacy blue-flame
  image and generated Capacitor splash are not used.
- `Experiments/LiveActivity/` holds isolated Q3 source and wiring instructions.
  It is **not included in either Xcode target**, compiled, or operational.

## macOS next run

From `native/`, with dependencies installed:

```sh
npm run ios:simulator
```

For the unchanged NEVORA local fictional runtime, run its verified local fixture
first, then use `NEVORA_NATIVE_URL=http://localhost:3000/app npm run ios:simulator`.
Run `npm run sync` without that variable afterwards to restore packaged content.
Never point this spike at production. App-Bound Domains/passkeys still need the
approved HTTPS test-domain and associated-domain work before a conclusive result.

## Evidence from Linux

Parsed the Info plists and storyboards; inspected source/configuration; checked
asset copy identity. These are structural checks only. The first macOS run must
validate Swift compilation, SPM resolution, asset catalog warnings, launch layout,
WebView loading, safe areas, keyboard, font changes, lifecycle, and real sign-in.
Q3, passkey credential creation/sign-in, Q2 offline recovery, physical accessibility,
archive/signing, TestFlight, and App Store review remain open.
