# Android development release signing and independent recovery

**November 6 active identity:** Jose approved replacing the old unused upload key after its password appeared in a native file-picker preview. The new key is active, its encrypted iCloud backup was restored with matching bytes, and the password imported into Bitwarden opened the restored private-key alias in Android Studio. The replacement password was not printed. Full independent recovery remains **pending**: owner access without this Mac is unconfirmed, and a signature using the vault-recovered credential was not rehearsed. The creation-time strict dummy-JAR proof passed separately. [Current evidence, incident and limitations](../../docs/native/evidence/2026-11-06/android-beta-completion/README.md).

Status: replacement upload identity active; Android release signing, approved hosted origin and full independent recovery remain gated. No Android release APK/AAB has been signed or uploaded.

## Existing identity and custody

- Package: `com.velani.nevora.development`; Play record: NEVORA Development, app4975670290730158697.
- Authoritative active manifest: `/Users/josek0514/.codex/native-signing/nevora-development/active-development-upload-key.json`. Resolve its exact keystore path, scoped Keychain service and checksums before signing. Its creation directory retains the name `upload-candidate-20261106-f5d389c9` for traceability; the manifest establishes activation.
- Alias: `nevora-development-upload`; RSA3072; active certificate SHA256 `FCE29B057557198C9FD73B458C28A59DBA713F8C26619DBB9B5B262CF08C749E`.
- Password custody: scoped macOS login Keychain plus the owner-approved Bitwarden item “NEVORA Development — Android upload key.” Never print it with `security -w`, pass it in command arguments, paste it into chat, save it in Gradle properties or commit it. New-key file SHA256: `5095fe44a71b91cfe2b1852a793f2c56b1abe84753dcb161767a6f69df5f2208`; working/backup file modes0600 inside0700 directories.
- Encrypted cloud backup: existing iCloud Drive / NEVORA Private Recovery / Android Development Upload Key 2026-11-06. No plaintext password is stored beside the keystore. Old `upload-20261105` identity/fingerprint `406F573B…974B47E2` is retired and must not sign future artifacts; its files are preserved privately with retirement markers.
- This is an upload certificate, not the future Google Play distribution certificate. Android app-link metadata for a Play-installed app must use its actual Play signing certificate.

## Recovery checklist and remaining acceptance

1. The owner selected existing iCloud Drive for the encrypted key and Bitwarden for its password. Upload, cloud eviction/download and recovered-vault-password keystore opening are verified. Confirm owner login/recovery/2-step methods for both services from another owner-controlled device before marking independent access complete. A second path on this Mac alone is not independent.
2. Save the existing encrypted PKCS12, its alias, public certificate/fingerprint and recovery instructions. Keep the password recoverable in the owner's selected private credential custody; an encrypted keystore whose only password is on a lost Mac cannot be recovered. Avoid a plaintext password file beside the keystore.
3. Compare source/backup SHA256 bytes locally without opening or printing private key material. Verify intended owner/access restrictions. Do not overwrite a different backup.
4. From the backup location, open the keystore in the owner's private UI using the saved password and confirm the private-key entry/alias and certificate fingerprint. Prefer a disposable dummy-JAR signing/verification rehearsal; this proves the recovered private key, rather than only a copied file.
5. Record only destination class, encrypted-file checksum, public fingerprint and successful recovery date in a receipt outside private credential values. Keep backup verification false until the independent restore test actually passes.

## Build and sign only after runtime/source gates are ready

Use the installed JDK21/AndroidSDK and the committed source. `./gradlew --no-daemon -PnevoraBackendOrigin=ACTUAL_APPROVED_HTTPS_ORIGIN :app:bundleRelease :app:assembleRelease` runs from `native/android`. Replace the symbolic origin with the verified non-production origin; never ship an example, empty origin or production fallback. Supply a new external `-PnevoraBuildDirectory=...` for disposable output. Release remains unsigned by default (`signingConfig null`); no credential belongs in the project.

In Android Studio, Generate Signed Bundle/APK can select the existing PKCS12 and alias. Enter passwords directly in its private fields and keep Remember passwords off unless the approved credential workflow explicitly covers the IDE. Do not let the wizard generate another key or edit shared release settings silently.

For an AAB, the standard alternative is `jarsigner -keystore PRIVATE_KEYSTORE_PATH -storetype PKCS12 -signedjar NEW_SIGNED_AAB_PATH UNSIGNED_AAB_PATH nevora-development-upload`; enter passwords only in the private terminal prompt. Verify its signature with `jarsigner -verify -verbose -certs SIGNED_AAB_PATH` and independently compare `keytool -printcert -jarfile SIGNED_AAB_PATH` to the approved upload fingerprint. Self-signed upload-certificate trust warnings are distinct from an invalid signature. Retain tool exit codes and public certificate details.

For a directly installed APK, run the installed SDK `zipalign` before `apksigner sign`, using private password prompts and new output paths, then `apksigner verify --verbose --print-certs`. Never run zipalign after signing. Do not use jarsigner for an APK. APK transport to a phone and Play upload remain separate controlled actions.

Keep unsigned/signed hashes, exact source, package/version, origin, upload certificate and resource checks together. Google Play currently reports a managed distribution-signing certificate `9F43414105A39F83E07B5598E148E8C4E901FE644927FB9B47AC6270ACF4E262` in use, no bundles/releases and 0% install base. No key change was performed. Actual Play installation/certificate qualification remains pending; use neither upload fingerprint nor console observation alone as installed-app acceptance. No internal distribution or upload has occurred. Published release identity and production origin require their own decision.

Sources: [Android signing](https://developer.android.com/studio/publish/app-signing), [command-line AAB/APK signing](https://developer.android.com/build/building-cmdline), [apksigner](https://developer.android.com/tools/apksigner).
