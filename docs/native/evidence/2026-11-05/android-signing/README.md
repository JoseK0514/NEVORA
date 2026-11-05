# Android development upload-key custody — November 5, 2026

Owner: Codex/root. Jose explicitly delegated creation with “you create everything” after the prepared Android Studio key form. This completes local upload-key preparation for `com.velani.nevora.development`; Phase 3 remains in progress.

## Created and verified

- Encrypted PKCS12 upload keystore, RSA 3072, SHA256withRSA; alias `nevora-development-upload`.
- Subject: `CN=NEVORA Development Upload, OU=Native Development, O=VELANI LLC, C=US`.
- Certificate expires March 23, 2054. SHA-256: `40:6F:57:3B:16:4E:BF:0B:4E:4D:2E:5A:92:5D:2C:59:22:48:B3:39:09:19:E6:63:88:36:4A:1D:97:4B:47:E2`.
- Random 64-character password generated locally and saved/read back through macOS Security APIs in the current user's actual login Keychain. Service `com.velani.nevora.development.upload-key.20261105`, account `nevora-development-upload`. Password did not enter command arguments, captured tool output, chat or Git. No Keychain access controls were broadened.
- Keystore and associated files are owned by the current user, mode `0600`, in an owned `0700` directory. The private material remains outside the checkout at `/Users/josek0514/.codex/native-signing/nevora-development/upload-20261105/nevora-development-upload.p12`. The same directory contains public certificates, the local setup helper and its receipt.

An independent recovery backup has **not** been established. Preserve both the encrypted keystore and its Keychain password. A second location on this Mac alone is not independent recovery. Do not delete/regenerate the existing pair if a later build fails. If partial setup ever leaves a password/key without a receipt, reconcile that existing state before any retry. Access or export credentials only through the owner's private credential workflow; never paste them into chat or repository configuration.

The GUI draft may remain open with empty password fields and an unused `.jks` path. The actual completed key is the `.p12` above. Android Studio synchronized with JDK 21; no AGP upgrade was applied. IDE metadata and PKCS12 extensions are excluded by `native/android/.gitignore`.

## Evidence and review

[verification.json](verification.json) contains public metadata and the disposable preflight result. Checks actually run:

- Disposable Keychain write/read; duplicate item rejected without changing its value; temporary material removed.
- Same-named non-login vault and redirected login-path fixtures rejected. The first regression failed before the path fix and passed afterward. Current-user home comes from the OS account record.
- PKCS12 private-key entry and RSA size verified; wrong password rejected.
- A dummy JAR signed and strictly verified with the actual key; modified content rejected. This JAR is **not** an Android app.
- Actual file ownership/modes and receipt hashes verified; public certificate independently inspected with OpenSSL.
- Existing-output and dangling-symlink overwrite attempts rejected using disposable fixtures.

One fresh read-only code review found the Keychain-location defect and a minor partial-creation recovery note. The executor corrected the Important issue with RED→GREEN evidence and reran the full disposable preflight before real creation. The recovery note is recorded above. No second reviewer approval is claimed. The original review is locally retained at `.omo/evidence/android-development-upload-key-code-review.md`; reviewed helper hash and corrected hash differ, as recorded by the receipts.

This is an **upload** key. Google Play's distribution signing key has not been selected or verified. Do not substitute this fingerprint for a Play-distributed app's certificate in `assetlinks.json`; use the actual installed app's signing identity. [Android signing documentation](https://developer.android.com/studio/publish/app-signing).

## Staging and source preflight

Vercel metadata access now succeeds for the existing project when addressed without the earlier failing explicit team scope. The cause of the earlier 403/404 responses was not established. Project `nevora-clocker-staging` (`prj_ZDa9qtpAxFhex2Jld8VFGV6nCTsy`) has SSO protection enabled for all deployments. The latest listed custom staging deployment is `dpl_8dVeorn7WS4cQAqTd6qFeDH78qUe`, READY, source `469aa56e419fef3d5757584ea032831981453857`. A single unauthenticated **HEAD** request to `https://nevora-clocker-staging-qa.vercel.app/.well-known/assetlinks.json` returned **302**; redirects were not followed. This does not qualify hosted association GET behavior or a native backend. No protection/bypass setting was changed.

Neon metadata reads also succeed for the existing Clocker-only project `billowing-smoke-15461949`, branch `br-divine-sky-b850lcfn` (`clocker-synthetic-only`), AWS us-east-1, PostgreSQL 17. Observed endpoint limits are 0.25–0.25 CU, idle suspension 300 seconds, history retention 0; subscription type is `launch_v3`. No database password/connection string or row data was retrieved. These are existing Clocker resources, not an approved native environment. The Vercel billing plan was not freshly verified. No new resource, billing change, environment secret, worker or deployment was created or altered.

After fetching origin, [the source check](development-source-check.json) exited 1: this checkout lacks current development/assembly changes, three remote heads are unclassified, and six active branches exceed the permitted three. Development was `e9c3a66d`; the collaboration head advanced during this work and was fetched at `1456688a`. Shared application files remain at the native baseline; no overlay, integration or branch retirement was attempted. Preserve concurrent work. Source reconciliation is required before another assembly/hosted release candidate.

## Next gate and release state

Engineering retains the approved native shell/shared application architecture. Security retains private key custody, default-off delivery and isolated fictional data. Governance retains the source inventory, environment, physical-device and separate upload/distribution gates. No exception or production authority is inferred.

Next: reconcile the current shared sources; prepare a separate native-development HTTPS/database environment without repurposing Clocker QA, with explicit resource/cost custody before provisioning; establish recovery backup; then build and qualify the signed candidate against that origin. Apple organization signing still awaits enrollment approval. Actual provider enrollment/sends and internal upload/distribution remain separately authorized steps.

No signed Android APK/AAB, Play upload, internal release, real notification, hosted deployment or physical-device acceptance occurred. Existing release configuration remains unsigned with blank backend origin and push disabled by default. No main/development merge or push occurred.
