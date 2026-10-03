# Fuel Phase 3 activation evidence

This runbook is incrementally populated by approved implementation tasks. No delivery environment, provider enrollment, live migration or physical-device verification has been activated.

## Task 3 endpoint allowlist evidence (2026-10-02)

`src/lib/notifications/subscription-service.ts::validatePushEndpoint` is the shared enrollment/dispatch validator. It makes no network requests. Require HTTPS with only default/explicit 443, no credentials, fragment, query, backslash, encoded path tricks, IP/local host or lookalike suffix. Preserve complete validated URLs internally; never log or expose endpoints. Unknown providers/paths remain unsupported until explicitly reviewed.

| Provider | Reviewed production host/path | Primary evidence |
| --- | --- | --- |
| Chromium / Google | exact `fcm.googleapis.com`, `/fcm/send/<opaque-token>` and `/wp/<opaque-token>` | [Chromium official push constants](https://chromium.googlesource.com/chromium/src/+/refs/tags/141.0.7390.94/components/push_messaging/push_messaging_constants.cc) declares both production prefixes. Its staging/preprod prefixes are excluded. |
| Mozilla | exact `updates.push.services.mozilla.com`, `/wpush/v1/<opaque-token>` and `/wpush/v2/<opaque-token>` | [Mozilla HTTP endpoint documentation](https://mozilla-services.github.io/autopush-rs/http.html) documents the production host and `/wpush/v1/` family; [Mozilla primary security report](https://bugzilla.mozilla.org/show_bug.cgi?id=1865488) records the `/wpush/v2/` subscription form. The validator permits the reviewed v1/v2 versions only. |
| Apple | DNS label boundary subdomains of `push.apple.com`, nonempty provider path | [WebKit Meet Web Push](https://webkit.org/blog/12945/meet-web-push/) explicitly instructs endpoint allowlists to accept any subdomain of `push.apple.com`. Root domain and lookalikes are excluded. |

Task 8 must validate again immediately before dispatch and explicitly disable HTTP redirect following; an allowed endpoint redirecting elsewhere is never trusted. Task 3 tests reject redirect URLs/parameters and perform no provider request; they do not prove a future transport's redirect policy. Task 8/11 must prove that separately with a local transport double.

## Installation and protection handoff

The signed/encrypted HttpOnly installation cookie is renewed for 365 days by authenticated status/enrollment; this deliberately outlasts the ordinary 14-day portal session. Its random token hash and generation are server-issued. Session expiry alone neither detaches an installation nor changes device consent. Active same-owner enrollment supplies the current client `ownershipGeneration`, preserves the server generation and consent, and renews only encrypted material/session association. Endpoint replacement rotates generation; detach/invalid tombstones require explicit fresh opt-in and a new server-issued installation proof. Foreign installation/endpoint ownership is refused.

Pending-cleanup receipts contain only opaque installation/session hashes, environment/generation and issued/expiry dates. Standard AES-256-GCM protects receipt contents; an HKDF purpose-separated HMAC-SHA256 signing key authenticates the envelope. Lifetime is bounded to at most 14 days and verified before reconciliation; installation cookies and subscription material use separate HKDF/AAD purposes. At-rest material is bound to environment, installation hash and ownership generation. Worker decryption must supply those current record fields. Key rotation needs controlled retention/re-enrollment authorization before activation; do not silently accept an old protected record under a new key.

Task 4 owns session-cookie clearing/revocation and login/account-switch orchestration. It must reconcile a valid receipt before switching/enrolling, issue a fresh proof only after verified cleanup when the prior installation belongs to another account, and require a fresh browser subscription/explicit opt-in. An invalid, expired, unavailable-key or unreconciled receipt fails closed for enrollment; authentication termination must remain independent. No Task 3 change is made to `destroySession`.

Task 10 may use `DeviceStatus.dismissalScope` solely as a local preference key for Not Now. It is an opaque server-derived HMAC bound to authenticated account+installation, created by status before opt-in; it is never an identity, installation proof or authorization credential. Browser capability checks remain client-side; server `supported` reports server feature/configuration availability.

Task 11 must execute the emitted SQL against disposable loopback PostgreSQL with fictional records: concurrent same-owner/foreign endpoint ownership, multiple installations, independent environments, stale generation/tombstone refusal, atomic self-test throttle + outbox rollback, exact current-subscription SELF_TEST targeting, and session-expiry/renewal consent preservation. No existing remote database was read or migrated for this task.
