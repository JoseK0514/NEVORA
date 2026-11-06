# Internal reviewer walkthrough — draft

This packet prepares an internal beta; no upload, reviewer account or hosted environment has been created. Development identity is `com.velani.nevora.development`. Apple organization enrollment remains pending. Replace only the fields below with the privately supplied, verified candidate values; do not publish fixture passwords or production credentials.

## Private review-account packet, after environment approval

Record the exact source/artifact hashes, signed package/bundle/version, canonical isolated HTTPS origin, platform certificate/team and current feature flags. Create fresh fictional Employee and Owner accounts in that environment through controlled setup. Keep account passwords/invitations in private owner custody. Published local fixture passwords must never become public-host credentials. Confirm review accounts can complete ordinary sign-in without a reviewer receiving admin tools or bypass headers. No production tenant/data may be used.

## Employee

1. Activate the provided fictional account if required; sign in using Employee ID/password and ordinary server authentication.
2. Review Home and Schedule, shift details, availability, requests/exchanges/time off and workplace updates. Exercise applicable time/history/pay read views only when the environment enables them. Role permissions must match the web app.
3. Save a bounded fictional availability/request change and verify its persisted server state; cover validation and no-data states. This is not permission to issue real operational messages/orders or punches.
4. Open a protected document. The app asks before opening the known page in the external browser; sign in again and repeat the authorized operation. No app cookies/files/tokens are handed over. Native private-file preview/share is not advertised.
5. Background/resume, interrupt connectivity and retry, restart and sign out. Revoke the fictional session through the controlled test authority and prove private content stays hidden until fresh authorization.

## Owner

1. Sign in as the fictional Owner and review Home, Schedule, Team and authorized workplace settings.
2. Make a reversible fictional company-profile/scheduling change and verify normal authorization and persistence. Do not run real payroll, alter production records, enable AI/mail/Clocker workers or add phone punches.
3. Verify protected time/pay/export access only where configured. A Manager/Lead account must receive the native unsupported-role explanation while its existing web access remains available.
4. Test account switching, restart/background privacy and POST logout. Earlier-account private content/enrollment may not carry into another account.

## Conditional device acceptance

- Android baseline: API29+/Android10+, SystemWebView156.0.8078.50+. Older/unknown WebView gets update/browser guidance before private content. Qualify the actual retail runtime and minimum OS on hardware; installed emulator evidence alone is insufficient.
- iOS minimum deployment target16; current automated simulator evidence is iOS27. Qualify the minimum supported OS/hardware, keyboard, safe areas, Back/navigation, text scaling, VoiceOver/TalkBack and interruptions.
- Native push stays off for this preparation. Only after provider/signing/device authorization, test deliberate permission/enrollment, denial/revocation, rotation, stale delivery, account switching/logout and generic notification taps. No actual provider send is approved by this walkthrough.
- Associated domains/passkeys require exact installed-app signing identity and approved HTTPS association files. Verify registration/sign-in/recovery/revocation on actual devices; no placeholder AASA/assetlinks or upload-certificate substitution.
- Verify public privacy/support/deletion URLs and in-app deletion entry. Use only a disposable fictional account for the deletion rehearsal; prove fulfillment separately from request receipt.

## Distribution gate

Record the named matrix, failures, recovery/rollback and private review-account custody. Do not check legal/privacy/export declarations automatically. Obtain Jose's explicit internal-upload/testing authority on the concrete signed candidate. TestFlight/Play internal release, public submission and production deployment are separate actions. Roll back by stopping distribution/native feature flags while preserving the existing web service.
