# Android prototype implementation

This project is a fictional-data, debug-only feasibility prototype. Its provisional
package identifier is `com.nevora.spike`; no store identity or signing account is
configured. Root `native/README.md` and the spike report own overall run instructions.

## Controls implemented

- Packaged content is the default. A local-runtime `server.url` build uses the
  root configuration policy and native runtime validation; only local HTTP targets
  are supported in that mode. It is not a production remote-content configuration.
- Main network security policy denies cleartext. The debug resource overrides it
  for exact `localhost`, `127.0.0.1`, and emulator `10.0.2.2` hosts only. Use
  `adb reverse` and `localhost` for unchanged NEVORA development passkey origin rules.
  The app manifest explicitly retains `usesCleartextTraffic=false` over Capacitor's
  generated Cordova library manifest using the manifest merger's `tools:replace`.
  On the supported Android API 24+ range, the explicit Network Security Config
  controls per-domain exceptions; the debug base policy still denies all other hosts.
- Android backup and device-transfer rules exclude app storage. No credentials,
  signing keys, Firebase configuration, or production URLs are included.
- Gradle disables release variants. Removing this guard needs a separately reviewed
  release configuration; a debug APK is not a store bundle.
- Android Back for local-runtime builds first dismisses a popover or requests dialog
  closure. The focused modal (including shadow-root focus) takes priority over DOM
  order; background popovers do not steal Back from it. A canceled dialog event is consumed so NEVORA's existing sheet animation
  and router retain control. With no overlay, Home minimizes; other pages use native
  web history or minimize when no history exists.
- The packaged fixture uses its own Capacitor App listener. It does not install the
  local-runtime callback, preventing two handlers from running for one Back action.
- Launcher artwork is an unchanged byte copy of the existing current PWA
  `public/icons/fuel-maskable-512.png` from base git commit `1e6f35a`.
  Generated Capacitor template artwork was removed. The splash uses that same asset
  over the established `#F7F6F3` surface.

## Verification boundary

`node --test tests/back-policy.test.mjs` exercises the exact JS dismissal policy
asset used by MainActivity. It covers canceled dialog closure, nested popovers,
reverse-order modal opening, shadow-root focus, background menu ownership,
modern and older dialog APIs, and Home/child routing decisions. Generated Capacitor
example tests were removed; they provided no NEVORA behavior evidence. It does not prove
Android dispatcher ordering, IME behavior, predictive Back, native accessibility,
session persistence, or actual NEVORA route transitions. Those need an emulator
or physical device against the owned fictional runtime.

System font size is left to current WebView behavior; no text-scaling success is
claimed without native runtime inspection. WebAuthn, Digital Asset Links, native
push, PDF sharing and actual session sign-in are not implemented by this Android
host change. Compilation and runtime results belong in the parent spike report.
