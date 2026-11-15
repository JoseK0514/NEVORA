# Authentication review and integration contract

Codex inspected the uncommitted Claude files read-only at the collaboration baseline `ce4de4bc`. Jose subsequently confirmed that baseline excludes Round 1 / Phase 1 / Phase 2. This review does not approve or integrate that mutable source. Wait for the exact reviewed and pushed SHA, recheck these hashes/diff, then reconcile against the independent backend checkpoint. Main and production remain unchanged.

| UI source snapshot | SHA-256 |
| --- | --- |
| src/app/login/actions.ts | `203dabd2b3b5f9db99ea8410d3d1245025a88129323f2e954b459b9453aa5c53` |
| src/app/login/kept-id.ts | `4204c82920fabcae45eec1bc55e2f2bc3c90b40fe43cb6138977ef67c87d9858` |
| src/lib/auth/session.ts | `1db454e048c8c7ccff04286e43bc3d78466252588f20f23d88ed033eac28b668` |
| src/lib/auth/permissions.ts | `f7def0902f11fed08e52edb5e579c91e3f32b611f31318d2c07129d3af4956c2` |
| src/lib/auth-lang.server.ts | `dedab8103e5e986ffae1536c41e3c12f48f4a4e14325657e596dfb39ce3a8d74` |
| src/app/app/schedule/settings/actions.ts | `5494e7e10c92016b50386f7d61a1d4cb63607d05907fc25252aed2d72f475001` |

- The kept-ID cookie is bounded to 128 non-control characters, HttpOnly, SameSite=Lax, Path=/login and five minutes, Secure in production, without a Domain attribute. Every expected rejection stores the same typed input independently of whether the account exists. It is presentation data, never authentication. Passwords are not stored. Preserve and clear it when the new operator-password flow transfers to replacement as well as after ordinary successful sign-in.
- Session-ended routing does not change session authority. `safeReturnTo` limits output to accepted local app paths, so the Referer cannot create an external redirect or authorize a request. The current host-only comparison also accepts `x-forwarded-host` and ignores scheme: strengthen it against the current canonical workspace origin during integration, and test hostile forwarded headers, schemes, malformed URLs and encoded traversal. This is navigation hardening, not evidence of an authentication bypass.
- Wrong-role routing still runs requireSession and the original role allowlist. The restricted page must stay informational. Reconcile the four schedule-settings action redirects consistently after the reviewed restricted page is present; do not change permission predicates.
- Accept-Language is only a fallback when no valid explicit language cookie exists. It grants no authority and does not authorize a new persistent person preference or notification-language rollout.
- The new backend requires replacement of operator-set passwords before session issuance. Login verifies the password and current deletion state, then creates only a workspace-bound, short-lived hashed replacement proof. Transaction locks recheck exact employee/credential versions. Replacement is single-use, rejects reusing the temporary password and clears the flag with session/push revocation. Existing session reads, management mutation guards and signed passkey paths reject pending replacement.

Evidence includes the actual owned Next login/reset browser journey, 15 owned recovery SQL tests, signed WebAuthn/JSON passkey tests and current Company Access denial/race tests. The final validation ledger records exact counts and source identities. No real email, external account, production credential or live customer data was used.
