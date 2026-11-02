# Native notification registration protocol v1

Implementation contract under the approved Employee/Owner native design. A valid
signature proves possession of an installation key, never an authenticated user,
current session, consumed challenge, workspace grant or delivery authorization.
Those remain transaction-time server checks. This contract creates no session
bearer and does not alter the state-only `/api/mobile/v1/session` endpoint.

## Identity and challenge

Native generates a P-256 signing key in its OS-protected key store. JavaScript may
receive its canonical public SPKI and public fingerprint; it never receives the
private key, provider token or browser session cookie. Initial enrollment/rebind
requires an actual browser-authenticated, same-origin POST and explicit native
user confirmation. The resulting challenge contains only nonsecret metadata.
Native signs it and uploads token/proof to the fixed configured-origin endpoint
using a cookie-free native client. Rotation/detach cannot rebind account authority.

`NativeChallenge` is a closed object, with every field required:

| Field | v1 value |
| --- | --- |
| version | number1 |
| operation | `enroll`, `rotate` or `detach` |
| challengeId | canonical lowercase UUIDv4 |
| nonce | canonical unpadded base64url, exactly32 decoded bytes |
| origin | canonical URL origin only; HTTPS, or HTTP for the exact explicit development loopback aliases already supported by the shell |
| environment | `test` or `production` |
| platform | `ios` or `android` |
| appId | 2-10 dot-separated ASCII identifiers, each starts with a letter, then letters/digits/underscore/hyphen; total max200 bytes |
| provider | iOS:`apns-sandbox`/`apns-production`; Android:`fcm` |
| keyFingerprint | lowercase64-hex SHA256 of canonical uncompressed P-256 DER SPKI |
| expectedGeneration | canonical lowercase UUIDv4, or null for initial enrollment; rotation/detach require a generation |
| issuedAt / expiresAt | canonical UTC ISO8601 with millisecond precision; expiresAt is exactly120 seconds after issuedAt |

The codec validates syntax, not whether an origin/app/environment is configured.
HTTP loopback aliases are `localhost`, `127.0.0.1`, `10.0.2.2` and `[::1]`.
Only explicit owned development runtime configuration may issue those challenges;
release configuration still requires the shell's non-local HTTPS DNS origin.
No path, credentials, query, fragment, trailing slash or noncanonical alias is
accepted in signed origin metadata. The server supplies its canonical origin.

Canonical public keys are unpadded base64url of DER SubjectPublicKeyInfo, EC P-256
only, uncompressed point. Re-export via the P-256 JWK coordinates to canonical
SPKI and require byte equality. Reject alternate encodings, trailing bytes,
wrong curves/key types and oversized input. Fingerprints are public identifiers.

## Signed bytes

UTF8 of `NEVORA_NATIVE_REGISTRATION_V1\n`, immediately followed by compact JSON
of this fixed tuple (no whitespace/newline after it):

```text
[1,operation,challengeId,nonce,origin,environment,platform,appId,provider,keyFingerprint,expectedGeneration,issuedAt,expiresAt,tokenDigest]
```

`tokenDigest` is lowercase SHA256 of the exact canonical provider-token UTF8
bytes for enroll/rotate; it is null for detach, which rejects a token argument.
APNs token text is lowercase, even-length hex, 2-2048 characters (no fixed token
size assumed). FCM is an opaque case-sensitive string of 1-4096 printable ASCII
characters excluding space/control characters; never trim or normalize it.
All bodies/protocol strings have bounded lengths before crypto/JSON work.

Signature is SHA256/ECDSA in ASN.1 DER format, unpadded canonical base64url, at
most72 decoded bytes. Verification requires the challenge's matching public
fingerprint and `issuedAt <= now < expiresAt`. Server uses its stored challenge,
never a caller-supplied replacement. Consumed/replayed challenges and current
generation/session checks are enforced in the durable completion transaction.

## Protected material

`NativeMaterialBinding` contains exactly origin, environment, platform, appId,
provider, keyFingerprint and generation, with the same validation rules.
Native token envelope uses a server-configured32-byte key, HKDF-SHA256 purpose
`nevora:native-push:token:v1` (empty salt), AES256GCM with a random12-byte IV and
16-byte tag. AAD is the UTF8 prefix `NEVORA_NATIVE_TOKEN_V1\n` plus compact JSON
`[origin,environment,platform,appId,provider,keyFingerprint,generation]`.
Envelope is `v1.` followed by canonical unpadded base64url of IV/tag/ciphertext.
Plaintext is only canonical token UTF8. Every field substitution, wrong key,
tampering, oversized/noncanonical envelope or Web Push ciphertext fails closed.
Errors use a fixed generic message; never echo input or raw provider diagnostics.

## Durable completion requirements

Challenge/installation/session/account/token uniqueness/generation and receipt
updates occur atomically. A retry can return its existing result only if signed
input is identical and its resulting generation is still current. Rebind retires
old material/deliveries; old callbacks cannot finish/invalidate replacements.
Current active Employee/Owner authority is mandatory for enrollment/rotation;
detach may remove a revoked registration but cannot grant new access. Cleanup
and delivery must fail closed on database uncertainty. None of the pure crypto
helpers alone establish these durable properties.

APNs/FCM credentials, real enrollment and delivery remain disabled until the
separate account/device/controlled-test steps. Protocol tests use ephemeral
in-memory keys and fictional tokens; golden files contain only public tuples.
