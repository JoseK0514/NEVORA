# Android development release signing and independent recovery

Status: upload key created/verified November5; release packaging prepared; independent recovery backup still **pending**. Jose is unsure of a destination. No encrypted key/password has been copied or exported for this preparation. Actual signing waits for independent recovery and an approved HTTPS environment. No new key is generated.

## Existing identity and custody

- Package: `com.velani.nevora.development`; Play record: NEVORA Development, app4975670290730158697.
- Existing PKCS12: `/Users/josek0514/.codex/native-signing/nevora-development/upload-20261105/nevora-development-upload.p12`.
- Alias: `nevora-development-upload`; RSA3072; certificate SHA256 `406F573B164EBF0B4E4D2E5A925D2C592248B3390919E66388364A1D974B47E2`.
- Password is in the actual macOS login Keychain, service `com.velani.nevora.development.upload-key.20261105`, account `nevora-development-upload`. Use the owner's private credential UI; never print it with `security -w`, pass it in command arguments, paste it into chat, save it in Gradle properties or commit it.
- This is an upload certificate, not the future Google Play distribution certificate. Android app-link metadata for a Play-installed app must use its actual Play signing certificate.

## Recovery checklist, once a destination is chosen

1. Select an owner-controlled independent location: an encrypted external drive or an existing vault with encrypted file attachments and a recovery method independent of this Mac. No new subscription/cloud upload is authorized here. A second path on this Mac alone is not independent.
2. Save the existing encrypted PKCS12, its alias, public certificate/fingerprint and recovery instructions. Keep the password recoverable in the owner's selected private credential custody; an encrypted keystore whose only password is on a lost Mac cannot be recovered. Avoid a plaintext password file beside the keystore.
3. Compare source/backup SHA256 bytes locally without opening or printing private key material. Verify intended owner/access restrictions. Do not overwrite a different backup.
4. From the backup location, open the keystore in the owner's private UI using the saved password and confirm the private-key entry/alias and certificate fingerprint. Prefer a disposable dummy-JAR signing/verification rehearsal; this proves the recovered private key, rather than only a copied file.
5. Record only destination class, encrypted-file checksum, public fingerprint and successful recovery date in a receipt outside private credential values. Keep backup verification false until the independent restore test actually passes.

## Build and sign only after runtime/source gates are ready

Use the installed JDK21/AndroidSDK and the committed source. `./gradlew --no-daemon -PnevoraBackendOrigin=ACTUAL_APPROVED_HTTPS_ORIGIN :app:bundleRelease :app:assembleRelease` runs from `native/android`. Replace the symbolic origin with the verified non-production origin; never ship an example, empty origin or production fallback. Supply a new external `-PnevoraBuildDirectory=...` for disposable output. Release remains unsigned by default (`signingConfig null`); no credential belongs in the project.

In Android Studio, Generate Signed Bundle/APK can select the existing PKCS12 and alias. Enter passwords directly in its private fields and keep Remember passwords off unless the approved credential workflow explicitly covers the IDE. Do not let the wizard generate another key or edit shared release settings silently.

For an AAB, the standard alternative is `jarsigner -keystore PRIVATE_KEYSTORE_PATH -storetype PKCS12 -signedjar NEW_SIGNED_AAB_PATH UNSIGNED_AAB_PATH nevora-development-upload`; enter passwords only in the private terminal prompt. Verify its signature with `jarsigner -verify -verbose -certs SIGNED_AAB_PATH` and independently compare `keytool -printcert -jarfile SIGNED_AAB_PATH` to the approved upload fingerprint. Self-signed upload-certificate trust warnings are distinct from an invalid signature. Retain tool exit codes and public certificate details.

For a directly installed APK, run the installed SDK `zipalign` before `apksigner sign`, using private password prompts and new output paths, then `apksigner verify --verbose --print-certs`. Never run zipalign after signing. Do not use jarsigner for an APK. APK transport to a phone and Play upload remain separate controlled actions.

Keep unsigned/signed hashes, exact source, package/version, origin, upload certificate and resource checks together. No internal distribution, Play signing-key selection or upload has occurred. Published release identity and production origin require their own decision.

Sources: [Android signing](https://developer.android.com/studio/publish/app-signing), [command-line AAB/APK signing](https://developer.android.com/build/building-cmdline), [apksigner](https://developer.android.com/tools/apksigner).
