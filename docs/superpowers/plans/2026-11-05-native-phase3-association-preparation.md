# Native Phase3 association preparation

> REQUIRED SUB-SKILL: superpowers:executing-plans, inline as already selected for this native program.

**Goal:** Prepare bounded, reviewable Apple/Android link-association files from actual public signing identity inputs; never confuse preparation with deployment/device verification.
**Architecture:** Standalone Node tool beside existing association templates; no application runtime, account, DNS or production configuration changes. It consumes the same portal/auth route scope as the existing template and emits new files in a new external directory only.
**Spec:** docs/superpowers/specs/2026-11-01-native-employee-owner-design.md (approved StageC), extended by Jose's November5 instruction to proceed to Phase3.
**Tech Stack:** Node24 standard library and node:test; existing native/web runtime unchanged.

## Global Constraints

Employee/Owner; Android10+/WebView149+; iOS16 configured minimum. Keep cookie/session/lifecycle/security controls and default-off delivery unchanged. Actual signed app identifiers/certificate fingerprints and an approved isolated HTTPS origin are inputs, never guessed. No secret fields, production bindings, provider enrollment/sends, purchases, account creation, signing/upload, DNS changes, merge/push or branch deletion. Continuation preparation uses qualified native candidate8630e5af; fetched development08d713d4 differs only in its separate native spike, while src/db/package/lock are unchanged from the native base. No development assembly or hosted candidate is certified: inventory6>3 remains red.

## Review Focus

- Unknown/secret fields and malformed identity data must fail before output is created.
- Loopback/IP/credential/path/query/fragment/trailing-dot/noncanonical origins must not become associated domains.
- Certificate rotation must preserve each distinct authorized fingerprint without accidentally accepting a wildcard or duplicate.
- Output collisions/symlinks must not overwrite another task's files.
- Generated files cannot claim signing, hosted/device verification, or independent readiness; external evidence remains required.

### Task 1: Public identity validation and association bundle

Files: native/association/prepare.mjs; native/association/prepare.check.mjs; native/association/README.md. Existing example templates remain references.
Interfaces: associationDocuments(config) -> {origin, apple, android}; config is exactly {origin, iosApplicationIdentifier, androidPackageName, androidCertificateSha256Fingerprints}. iOS identifier is actual App ID prefix plus bundle identifier, not an assumed TeamID. prepareAssociations(config, absoluteNewOutputDirectory) -> preparation manifest. CLI accepts exactly --config FILE --output DIRECTORY, limits JSON input to8KiB, never sends network requests.

1. Write behavior tests first: accepted canonical public identities generate exact portal/auth associations and credentials relations; malformed/unknown/secret inputs, local/noncanonical origins, duplicate/unbounded fingerprints fail; fresh external output contains actual parsed JSON and hashes, and existing/symlink destinations are preserved. Run `node --test native/association/prepare.check.mjs` before implementation.
   Expected: RED assertions because preparation behavior is missing (a temporary throwing scaffold may establish assertion failures).
2. Implement strict small validation and pure documents matching the existing template paths. Emit .well-known/apple-app-site-association, .well-known/assetlinks.json and preparation.json in a new external0700 directory, using exclusive writes and a final manifest. Status must say prepared; signed/hostedVerified/deviceVerified false. No private keys/config values in diagnostics.
   Expected: focused tests GREEN; invalid inputs create no directory; collisions preserve original bytes.
3. Document CLI, exact public inputs from signed binaries/Play app signing, normal HTTPS/no-redirect/application-json hosting obligations, and the separate hosted/account/device gates. Run full relevant Node native-tool suite, syntax check and git diff --check.
   Expected: all pass, actual generated fixtures parse; no application code/deployment changes.
4. Commit and complete Task1. Obtain one fresh whole-preparation review, at most one executor correction pass with RED→GREEN; archive actual evidence/rulings/minors. Keep the native worktree.
   Expected: preparation verified, Phase3 still in progress pending actual membership/project/origin/signing/device inputs.

## Other Phase3 work (external gate, not completed by Task1)

Observe account identity privately after Jose signs in; collect actual app/team/project metadata without secrets. Reconcile development source inventory before integration. Prove nonproduction backend/database identity before any hosted mutating journey. Generate from actual verified signing/public inputs, then obtain any required concrete deployment/signing capability approval as the last step. Physical minimum OS/retail WebView, hardware keys, passkeys, document browser isolation, real APNs/FCM controlled tests and internal signed artifacts remain separately required. No partial or simulated result closes them.

## Local preparation completed

Task1 implemented5fc0aa81, reviewed once (request changes), corrected8ad11fdb in one executor pass with4RED→GREEN regressions. Final17association/31native-tool tests pass, zero skips. No second reviewer approval is implied.2minor documentation/formatting findings remain deferred. Ledger, raw test-log hashes, source continuity and read-only external preflight are archived under docs/native/evidence/2026-11-05/phase-3-preparation. The temporary plan workspace is archived after completion; this does not close the open Phase3 account/hosted/device/signing/integration gates.
