# Native association preparation

This local tool prepares the existing Universal Links/App Links and credential
association scope. It does not configure accounts, enable capabilities, sign an
app, publish files, make network requests, or verify a device. Native and server
session/origin rules still apply after a link opens.

Use actual **public** identity values obtained from the selected signed test app:

```json
{
  "origin": "https://approved-native-staging.example.com",
  "iosApplicationIdentifier": "AB12CD34EF.com.example.nevora",
  "androidPackageName": "com.example.nevora",
  "androidCertificateSha256Fingerprints": [
    "00:01:02:03:04:05:06:07:08:09:0A:0B:0C:0D:0E:0F:10:11:12:13:14:15:16:17:18:19:1A:1B:1C:1D:1E:1F"
  ]
}
```

These are fictional examples, not NEVORA account identifiers. The iOS value must
match the signed `application-identifier` entitlement: App ID prefix plus bundle
identifier. Do not assume that an older App ID prefix equals the Team ID. The
Android package must match the built application ID. Its certificate must match
the installed artifact. With Play App Signing, use the **app signing** certificate
from Play Console, which can differ from the local/upload-key certificate. One to
four distinct fingerprints support a bounded signing-key transition.

No key, token, password, database URL, service-account JSON or other secret belongs
in this input. Unknown fields are rejected. HTTPS DNS origin syntax is checked;
domain ownership, DNS resolution, environment/database isolation and actual
signing identity are not established by this tool. Select the isolated staging
environment separately before publishing or running authenticated tests.

From the repository root, using a new absolute directory outside source:

```sh
node native/association/prepare.mjs \
  --config /absolute/private-runtime/public-association-inputs.json \
  --output /absolute/private-runtime/new-association-bundle
```

The tool exclusively creates the directory and files, so an existing directory
or symlink is refused. It writes:

- `.well-known/apple-app-site-association`
- `.well-known/assetlinks.json`
- `preparation.json`, with file hashes and `status: prepared`; signing, hosted
  and device verification remain false.

The receipt is written last; an interrupted write may leave an incomplete new
directory without a success receipt. Inspect/retain it rather than overwriting
another attempt. The tool never removes output. Only the two association files
belong in the website's public `.well-known` directory after the environment and
capability changes are authorized; the preparation receipt is local evidence.

Publish each file at its exact HTTPS path, with normal certificate validation,
no redirect, and `Content-Type: application/json`. Confirm the actual response
bytes against the receipt and the installed signed app. iOS associated-domain
entitlements must name the exact host for both `applinks` and `webcredentials`;
Android's verified intent filter must name that host. CDN/device association,
passkey registration/sign-in/recovery/revocation and application lifecycle tests
remain separate Phase3 acceptance. No result here authorizes deployment or a real
notification send.

Checks: `node --test native/association/prepare.check.mjs`.

Primary references: [Apple associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains),
[Apple App ID prefix guidance](https://developer.apple.com/library/archive/qa/qa1879/_index.html),
[Android website associations and signing certificates](https://developer.android.com/training/app-links/configure-assetlinks).
