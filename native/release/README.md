# Native release preparation

Local preparation for the development identity `com.velani.nevora.development`, version0.1.0/build1. No signed/uploaded/hosted/store acceptance is implied. Paid hosting is on hold.

- [Android signing and recovery](android-signing.md): exact upload-key identity, owner backup and future signing steps.
- [Store package](store/README.md): draft listings, review walkthrough, data/permission worksheet, URL gates and screenshot provenance.
- [Asset provenance](assets.json): unchanged official NEVORA artwork, native outputs and hashes.
- [Evidence](../../docs/native/evidence/2026-11-05/release-preparation/): actual checks and remaining gates.

The app resources now include Android adaptive launcher icons and an iOS AppIcon catalog, preserving the existing white/teal NEVORA artwork. The iOS generator owns resource wiring; regenerate with `python3 native/ios/generate-project.py`. Native UI and business logic are unchanged.

`native/ios/Configuration/PrivacyInfo.xcprivacy` declares tracking false and UserDefaults reason CA92.1 for app-private installation generation metadata (`NativeCapabilitiesHandler.swift`). No other required-reason API was found in the active iOS Swift source scan. This is a source inventory, not a binary/SDK certification. The manifest deliberately omits `NSPrivacyCollectedDataTypes`; it does **not** declare that the app collects no data. The hosted workforce portal handles account, schedule, attendance, pay and communications data. Full App Privacy/Data safety drafts are in the store worksheet; final declarations and an archive privacy report must match the selected hosted environment and enabled providers before upload. No provider is enabled by adding this resource.

Unsigned APK/AAB and simulator builds with the default empty backend origin are packaging evidence only: they remain unconfigured and cannot serve as a usable beta. A beta needs an approved isolated HTTPS origin, actual app signing identities and physical/hosted qualification. Do not bind existing production/Clocker secrets or add a fallback URL.

Official references checked November5: [Apple required-reason API](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype), [manifest collection details](https://developer.apple.com/documentation/technotes/tn3184-adding-data-collection-details-to-your-privacy-manifest), [app icon catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon), [Android command-line packaging/signing](https://developer.android.com/build/building-cmdline).
