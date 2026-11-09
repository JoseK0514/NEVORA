# Native provider contract and primary references

November2,2026; StageB Task3. Server-only transport work under the approved native design. No account configuration, outbound provider tests or release activation.

APNs uses separate fixed sandbox and production HTTP2/TLS endpoints and the exact app topic. Device tokens are variable-length hex. ES256 provider JWTs use the configured key/team, with a cached50-minute issuance lifetime. The device registration signature remains DER; provider JWT signatures use JOSE64-byte P1363 encoding. Success means provider acceptance. Invalid-token responses are distinct from account/auth configuration failures. APNs5xx retries wait at least15minutes; record an Unregistered timestamp when present so newer token registration is not invalidated by older provider history. Sources: [sending requests](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns), [response handling](https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns), [token connection](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns).

FCM uses the fixed HTTPv1 projects/messages:send endpoint and short-lived OAuth2 access tokens scoped only to firebase.messaging. UNREGISTERED is an invalid registration; INVALID_ARGUMENT alone is a request failure and does not erase device ownership. Respect Retry-After and the minimum60-second quota retry delay. The payload is generic text plus opaque notification/generation metadata, with package and TTL constraints. Sources: [HTTPv1 sending](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [error codes](https://firebase.google.com/docs/cloud-messaging/error-codes), [service-account OAuth](https://developers.google.com/identity/protocols/oauth2/service-account).

FCM AndroidConfigV2 is currently a preview/EAP, with a locally distributed SDK and changed device callbacks. This approved release uses the supported HTTPv1 AndroidConfig contract; adopting the preview would change the device integration and testing scope. Source: [V2 migration/status](https://firebase.google.com/docs/cloud-messaging/send/v2-api).

Transport limits: fixed provider endpoints only, POST only, normal TLS validation, no redirects,8-second total deadline,16KiB outbound/header budget and8KiB inbound body budget. Abort settles without waiting on an untrusted response stream. Provider bodies/headers and credential errors never appear in stable outcomes. Tests inject Node IO and ephemeral fake keys; default network APIs must not be reached by tests. No private keys are persisted in fixtures.

The worker must recheck current business authority and generation before handing token material to a provider. An adapter does not authorize a send. Accepted is not delivered/displayed, and cancellation cannot retract an already handed-off provider request.


Node runtime options were checked against the installed24.19.0 official JSON
references: [HTTP2](https://nodejs.org/download/release/v24.19.0/docs/api/http2.json),
[HTTPS](https://nodejs.org/download/release/v24.19.0/docs/api/https.json),
[HTTP response limits](https://nodejs.org/download/release/v24.19.0/docs/api/http.json),
and [TLS options](https://nodejs.org/download/release/v24.19.0/docs/api/tls.json).
The browser tool could not open the main Node24 HTML entry; direct HTTPS read the
exact runtime documentation. Receipt records are in task-3-node-docs.json.

Provider runtime configuration is separate from registration. Both require
explicit settings; delivery additionally requires `NATIVE_PUSH_DELIVERY_ENABLED`.
Test delivery requires `NATIVE_PUSH_TEST_DELIVERY_ENABLED` and a fully valid,
bounded `NATIVE_PUSH_TEST_ACCOUNT_IDS` allowlist. No wildcard or invalid-item
filtering may turn a partly invalid list into wider authorization. APNs reads
`NATIVE_APNS_TEAM_ID`, `NATIVE_APNS_KEY_ID`, `NATIVE_APNS_PRIVATE_KEY`; FCM reads
`NATIVE_FCM_PROJECT_ID`, `NATIVE_FCM_CLIENT_EMAIL`, `NATIVE_FCM_KEY_ID`,
`NATIVE_FCM_PRIVATE_KEY`. Private values belong only in approved server stores;
this work sets none of them. FCM's server credential minting has its own bounded
OAuth exchange, validates the response and caches access tokens only in memory.

Task4 integration obligation: FCM can await OAuth after send is called. A worker
check before calling the sender is therefore insufficient by itself: current
source/account/generation/expiry/quiet-hour authority must be checked after
credential preparation and immediately before actual provider handoff. Implement
an explicit attempt-bound handoff gate and regression test for revocation during
credential waits; this server-only adapter checkpoint does not claim that the
worker or that final authorization is implemented.
