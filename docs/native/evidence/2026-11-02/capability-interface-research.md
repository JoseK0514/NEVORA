# Capability planning research

Planning notes only. No StageB capability implementation, provider setup,
dependency adoption or additional design approval is claimed here.

## Existing interfaces to retain

- `src/lib/auth/session.ts`: `readSessionMutationProof()` returns the actual
  server-derived session hash and employee or null. Its proof must never be
  serialized. The existing browser HttpOnly session remains business authority.
- `src/app/api/mobile/v1/session/route.ts`: state-only version1 reachability;
  protected page loading establishes actual browser authority. Do not expand
  this endpoint into a profile, credential or native session service.
- `src/lib/notifications/types.ts`: durable `NotificationIntent`,
  `NotificationStateRepository.check`, `SqlExecutor`, provider outcomes,
  generation/lease-bound delivery interfaces and existing policy limits.
- `src/lib/notifications/worker.ts`: checks current intent/source/recipient,
  due/expiry/quiet hours, installation generation and session presence, then
  repeats source/time checks immediately before provider handoff. Native
  delivery must reuse these rules rather than silently fork business policy.
- `src/lib/notifications/open.ts`: resolves opaque notification IDs through
  current session, recipient and business-source authorization; preserves only
  validated same-origin return paths. A push tap is not an access grant.
- `src/lib/notifications/installation.ts`: existing authenticated encryption is
  purpose/context separated. Native token material requires a distinct purpose
  and binding; it is not a browser Web Push subscription.
- `src/components/employee-mobile/device-alerts.tsx` and `device-owner.tsx`:
  current alert lifecycle, access-change handling and contextual enable/disable
  UI. Native support must preserve web/PWA behavior and honest pending states.
- `src/app/api/payroll/documents/[id]/route.ts`: existing authorized document
  bytes, MIME, disposition and SHA256. Inspect export routes independently;
  filenames or a native presentation marker never establish authorization.
- `db/migrations/order.ts`: authoritative BASE and FINAL chains. Append native
  schema deliberately; do not sort filenames or run held tenant migrations.
  Keep `src/test/integration/local-postgres.ts` and migration-order tests aligned.

## Official API research checked November2

Android's [origin-scoped message listener](https://developer.android.com/reference/androidx/webkit/WebViewCompat.WebMessageListener)
supplies source origin and main-frame metadata. Any bridge must additionally
validate schema, current browser/document/lifecycle and explicit native user
confirmation for sensitive actions. Do not use a generic JavaScript interface.

[Android WebView passkeys](https://developer.android.com/identity/sign-in/credential-manager-webview)
require feature checks and application/website association. Compile success is
not proof of registration/sign-in on a physical device.

[AndroidX WebKit1.17.1](https://developer.android.com/jetpack/androidx/releases/webkit)
is a stable release; required AAR compile-SDK/min-SDK metadata and transitive
dependencies still need verification before choosing/adopting it. The current
foundation uses compile/target36 and min26.

[Firebase Android release notes](https://firebase.google.com/support/release-notes/android)
list Messaging26.0.0. Adoption must remain Messaging-only, with initialization
and token enrollment disabled until contextual consent and verified app config;
no Analytics/replay or provider requests are authorized by a local build.

[APNs requests](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)
use the provider boundary separately from [FCM HTTPv1](https://firebase.google.com/docs/cloud-messaging/send/v1-api).
Fake transports must exercise request/authentication/error/retry behavior without
real credentials, device enrollment or sends.

[WKDownloadDelegate](https://developer.apple.com/documentation/webkit/wkdownloaddelegate)
offers browser-owned download, redirect and destination callbacks. Android's
download design must preserve browser authentication without exporting cookies.
Both need bounded authorized types/sizes, explicit sharing and private temporary
file cleanup. The accepted spec, not these research notes, governs the final
capability design and its executable implementation plan.
