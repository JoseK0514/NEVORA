# NEVORA native applications

The approved Employee/Owner implementation uses the existing Next.js interface in direct iOS WKWebView and Android WebView shells. Start with [iOS](ios/README.md), [Android](android/README.md), the [approved design](../docs/superpowers/specs/2026-11-01-native-employee-owner-design.md), and [Phase 3 status](../docs/native/phase-3-status.md).

The independent debug-only Capacitor feasibility project imported from development `e9c3a66d` is preserved under [capacitor-spike/](capacitor-spike/README.md), with its own package, SDK projects and CI workflow. Run its commands from that directory. Historical prototype evidence describes its former `native/` location. Its fictional fixture and test results do not qualify the Employee/Owner application, and its development-only server URL/cleartext settings are not part of the active shells.

The active development app uses `com.velani.nevora.development`; the prototype uses `com.nevora.spike`. Both retain separate build roots and dependencies. No production origin, provider credential, signing private key or environment binding is supplied by this directory.
